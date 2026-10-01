"""Pins the prose<->script contract for the dashboard skill.

SKILL.md and kinds/*.md tell the model which verbs and flags to run and what state
each kind takes; `dashboard` and kinds/*.js implement them. This fails when either
side drifts.

Run: python3 ~/.claude/skills/dashboard/test_contract.py
"""

import importlib.machinery
import importlib.util
import json
import os
import re
import subprocess
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).parent
SCRIPT = HERE / "dashboard"


def load_script():
    loader = importlib.machinery.SourceFileLoader("dashboard_cli", str(SCRIPT))
    spec = importlib.util.spec_from_loader("dashboard_cli", loader)
    mod = importlib.util.module_from_spec(spec)
    loader.exec_module(mod)
    return mod


D = load_script()
DOCS = [HERE / "SKILL.md", *sorted((HERE / "kinds").glob("*.md"))]


def doc_text() -> str:
    return "\n".join(p.read_text() for p in DOCS)


class TestDocsMatchScript(unittest.TestCase):
    def test_every_documented_verb_exists(self):
        documented = set(re.findall(r'"\$D" ([a-z]+)', doc_text()))
        script = SCRIPT.read_text()
        for verb in documented:
            self.assertRegex(script, rf'"{verb}"', f"docs run `dashboard {verb}`, the script has no such verb")

    def test_every_documented_flag_exists(self):
        flags = {f for line in doc_text().splitlines() if '"$D"' in line for f in re.findall(r"(--[a-z][a-z-]+)", line)}
        script = SCRIPT.read_text()
        for flag in flags:
            self.assertIn(f'"{flag}"', script, f"docs name {flag}; the script does not accept it")

    def test_every_kind_has_doc_renderer_and_row(self):
        skill = (HERE / "SKILL.md").read_text()
        for kind in D.KINDS:
            self.assertTrue((HERE / "kinds" / f"{kind}.md").exists(), f"kinds/{kind}.md missing")
            js = (HERE / "kinds" / f"{kind}.js").read_text()
            self.assertIn(f"KINDS.{kind} =", js, f"kinds/{kind}.js does not register KINDS.{kind}")
            self.assertIn(f"kinds/{kind}.md", skill, f"SKILL.md has no row for {kind}")

    def test_each_kind_doc_names_its_kind_in_state(self):
        for kind in D.KINDS:
            text = (HERE / "kinds" / f"{kind}.md").read_text()
            self.assertIn(f'kind: "{kind}"', text, f"kinds/{kind}.md never shows kind: \"{kind}\" in its state")


class TestScriptBehaviour(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)
        D.scratch_dir = lambda: self.dir

    def tearDown(self):
        self.tmp.cleanup()

    def write(self, slot, state):
        D.slot_file(slot).write_text(json.dumps(state))

    def test_monitor_failing_probe_records_its_error_and_others_still_read(self):
        self.write("monitor:t", {"kind": "monitor", "title": "t", "probes": [
            {"label": "ok", "cmd": "echo 42"},
            {"label": "bad", "cmd": "echo boom >&2; exit 3"},
            {"label": "hot", "cmd": "echo 97", "warnAt": 85, "dangerAt": 95}]})
        r = {x["label"]: x for x in D.build_data("monitor:t")["live"]["readings"]}
        self.assertEqual(r["ok"]["value"], 42.0)
        self.assertEqual(r["bad"]["error"], "boom")
        self.assertEqual(r["hot"]["tone"], "danger")
        D.build_data("monitor:t")
        hist = json.loads(D.slot_file("monitor:t", "+history.json").read_text())
        self.assertEqual(len(hist["ok"]), 2)

    def test_page_and_widget_embed_state_and_kind_renderer(self):
        self.write("chart:x", {"kind": "chart", "title": "x</script>", "series": [{"name": "a", "points": [[1, 2]]}]})
        page = D.shell(D.build_data("chart:x"), "page")
        self.assertIn("KINDS.chart =", page)
        self.assertNotIn("x</script>", page.split("<script>", 1)[1])
        self.assertIn('class="widget"', D.shell(D.build_data("chart:x"), "widget"))

    def test_mermaid_loads_only_for_diagram_kinds(self):
        self.write("diagram:d", {"kind": "diagram", "title": "d", "mermaid": "flowchart LR\n a-->b"})
        self.write("chart:c", {"kind": "chart", "title": "c", "series": []})
        self.assertIn(D.MERMAID_SRC, D.shell(D.build_data("diagram:d"), "page"))
        self.assertNotIn(D.MERMAID_SRC, D.shell(D.build_data("chart:c"), "page"))
        self.assertNotIn(D.MERMAID_SRC, D.shell(D.build_data("diagram:d"), "widget"))

    def test_links_and_shots_are_static_html_in_the_page(self):
        self.write("monitor:disk", {"kind": "monitor", "title": "disk", "probes": [],
                                    "links": [{"label": "Caches", "path": "/tmp", "bytes": 2048}]})
        self.assertIn('<a href="/tmp">', D.shell(D.build_data("monitor:disk"), "page"))

    def test_implement_probe_reads_branch_and_diff(self):
        repo = self.dir / "repo"
        repo.mkdir()
        git = lambda *a: subprocess.run(["git", "-C", str(repo), *a], check=True, capture_output=True)
        git("init", "-q", "-b", "main")
        (repo / "f").write_text("a\n")
        git("add", "f")
        git("-c", "user.email=t@t", "-c", "user.name=t", "commit", "-qm", "base")
        git("checkout", "-qb", "work")
        (repo / "f").write_text("a\nb\nc\n")
        cwd = os.getcwd()
        os.chdir(repo)
        try:
            live = D.probe_implement({"base": "main"})
        finally:
            os.chdir(cwd)
        self.assertEqual(live["branch"], "work")
        self.assertEqual(live["diff"], "+2 −0")
        self.assertEqual(live["filesChanged"], 1)

    def test_bad_kind_fails_with_one_line(self):
        self.write("x", {"kind": "nope"})
        with self.assertRaises(SystemExit):
            D.load_state("x")

    def run_verb(self, fn, **kw):
        """Run a verb in-process; return (exit code, stderr)."""
        import contextlib, io, types
        err = io.StringIO()
        code = 0
        with contextlib.redirect_stderr(err), contextlib.redirect_stdout(io.StringIO()):
            try:
                fn(types.SimpleNamespace(**kw))
            except SystemExit as e:
                code = e.code
        return code, err.getvalue()

    def test_missing_canvas_is_one_line_with_the_page_path(self):
        self.write("chart:c", {"kind": "chart", "title": "c", "series": []})
        old = os.environ["PATH"]
        os.environ["PATH"] = str(self.dir)   # no canvas on PATH
        try:
            code, err = self.run_verb(D.cmd_post, slot="chart:c", scope="session", every=None, no_pin=False)
        finally:
            os.environ["PATH"] = old
        self.assertEqual(code, 1)
        self.assertEqual(len(err.strip().splitlines()), 1, err)
        self.assertIn("canvas is not installed", err)
        for verb in (D.cmd_push, D.cmd_end):
            os.environ["PATH"] = str(self.dir)
            try:
                code, err = self.run_verb(verb, slot="chart:c")
            finally:
                os.environ["PATH"] = old
            self.assertEqual((code, len(err.strip().splitlines())), (1, 1), err)

    def test_refresh_command_cds_into_this_checkout_and_quotes_the_slot(self):
        cmd = D.refresh_command("implement:canvas-12")
        self.assertTrue(cmd.startswith(f"cd {os.getcwd()}") or cmd.startswith(f"cd '{os.getcwd()}'"), cmd)
        self.assertTrue(cmd.endswith(" data implement:canvas-12"), cmd)

    def test_probe_timeout_kills_the_probes_children(self):
        old = D.PROBE_TIMEOUT
        D.PROBE_TIMEOUT = 1
        self.write("monitor:slow", {"kind": "monitor", "title": "s", "probes": [{"label": "slow", "cmd": "sleep 30 & sleep 30; echo 1"}]})
        import time
        t = time.monotonic()
        try:
            r = D.build_data("monitor:slow")["live"]["readings"][0]
        finally:
            D.PROBE_TIMEOUT = old
        self.assertLess(time.monotonic() - t, 5)
        self.assertIn("timed out", r["error"])

    def test_corrupt_history_and_probe_without_cmd_do_not_crash(self):
        self.write("monitor:h", {"kind": "monitor", "title": "h", "probes": [{"label": "nocmd"}]})
        D.slot_file("monitor:h", "+history.json").write_text("{not json")
        r = D.build_data("monitor:h")["live"]["readings"][0]
        self.assertEqual(r["error"], "probe has no cmd")

    def test_embedded_state_has_no_angle_bracket(self):
        self.write("chart:e", {"kind": "chart", "title": "<!--<script>", "series": []})
        script = D.shell(D.build_data("chart:e"), "page").split("draw(", 2)[2]
        self.assertNotIn("<!--", script.split("addEventListener")[0])

    def test_slots_that_differ_only_by_colon_get_different_files(self):
        self.assertNotEqual(D.slot_file("a:b"), D.slot_file("a__b"))

    def test_no_slot_state_file_is_another_slots_history(self):
        self.assertNotEqual(D.slot_file("monitor:disk.history"), D.slot_file("monitor:disk", "+history.json"))

    def test_below_thresholds_turn_falling_readings_amber_and_red(self):
        self.write("monitor:free", {"kind": "monitor", "title": "f", "probes": [
            {"label": "low", "cmd": "echo 15", "warnBelow": 50, "dangerBelow": 20},
            {"label": "mid", "cmd": "echo 40", "warnBelow": 50, "dangerBelow": 20},
            {"label": "ok", "cmd": "echo 90", "warnBelow": 50, "dangerBelow": 20}]})
        r = {x["label"]: x.get("tone") for x in D.build_data("monitor:free")["live"]["readings"]}
        self.assertEqual(r, {"low": "danger", "mid": "warn", "ok": None})

    def test_only_recording_calls_add_history(self):
        self.write("monitor:r", {"kind": "monitor", "title": "r", "probes": [{"label": "n", "cmd": "echo 1"}]})
        D.build_data("monitor:r", record=False)
        self.assertFalse(D.slot_file("monitor:r", "+history.json").exists())
        D.build_data("monitor:r")
        D.build_data("monitor:r", record=False)
        hist = json.loads(D.slot_file("monitor:r", "+history.json").read_text())
        self.assertEqual(len(hist["n"]), 1)

    def test_relative_link_and_shot_paths_are_dropped(self):
        html = D.static_html({"links": [{"path": "javascript:alert(1)"}, {"label": "no path"}, {"path": "/ok", "bytes": "12"}],
                              "variants": [{"name": "v", "shot": "rel.png"}]})
        self.assertIn('href="/ok"', html)
        self.assertNotIn("javascript:", html)
        self.assertNotIn("rel.png", html)


if __name__ == "__main__":
    unittest.main()
