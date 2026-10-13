"""Pins pointer_rate.py --ref's join on a fixture transcript and log.

Run: python3 ~/.claude/skills/retro/test_pointer_rate.py
"""

import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path

import pointer_rate as pr

SID = "aaaaaaaa-0000-0000-0000-000000000001"
GUI_CELL = """# gui

## Files

| Open | When |
| --- | --- |
| [`states.md`](states.md) | Every state a screen can be in. |
| [`critique.md`](critique.md) | Judging a screen. |
"""
GO_CELL = """# go

## Files

| Open | When |
| --- | --- |
| [`review.md`](review.md) | Reviewing Go. |
"""


def rec(kind, ts, uuid, **kw):
    return {"type": kind, "uuid": uuid, "sessionId": SID, "timestamp": ts, **kw}


def prompt(ts, uuid, text):
    return rec("user", ts, uuid, message={"role": "user", "content": text})


def inject(ts, uuid, event, text):
    return rec("attachment", ts, uuid, attachment={
        "type": "hook_additional_context", "hookEvent": event, "content": [text]})


def tool(ts, uuid, name, inp):
    return rec("assistant", ts, uuid, message={"role": "assistant", "content": [
        {"type": "tool_use", "id": "t-" + uuid, "name": name, "input": inp}]})


def say(ts, uuid, text):
    return rec("assistant", ts, uuid, message={"role": "assistant", "content": [
        {"type": "text", "text": text}]})


class RefJoin(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        base = Path(self.tmp.name)
        self.skills = base / "skills"
        for label, cell in (("gui", GUI_CELL), ("go", GO_CELL)):
            (self.skills / "ref" / label).mkdir(parents=True)
            (self.skills / "ref" / label / "context.md").write_text(cell)
        self.root = base / "projects"
        proj = self.root / "-Users-x-app"
        saved = proj / SID / "tool-results" / "hook-1-additionalContext.txt"
        saved.parent.mkdir(parents=True)
        saved.write_text("ref/gui/states.md — injected because this prompt needs it "
                         "(Jev p=0.97, confidence=0.94):\n\n# States\n")
        page_home = "/Users/x/.claude/skills/ref/"
        records = [
            prompt("2026-10-11T10:00:00Z", "u1", "make the settings screen less cluttered"),
            inject("2026-10-11T10:00:01Z", "a1", "UserPromptSubmit",
                   "ref/gui/context.md — injected because this prompt is about gui:\n\n# gui\n\n"
                   "ref/local/gui/context.md — injected because this prompt is about gui:\n\n# private\n\n"
                   "ref/gui/critique.md — injected because this prompt needs it "
                   "(Jev p=0.99, confidence=0.98):\n\n# Critique\n"),
            # The edit hook's stdout also lands as hook_success; it must not count again.
            rec("attachment", "2026-10-11T10:00:01Z", "a1s", attachment={
                "type": "hook_success", "hookEvent": "PreToolUse",
                "stdout": "ref/gui/context.md — injected because this prompt is about gui:"}),
            # A Grep naming a page is not a Read of it.
            tool("2026-10-11T10:00:04Z", "t0", "Grep", {"pattern": "x", "path": page_home + "gui/critique.md"}),
            tool("2026-10-11T10:00:05Z", "t1", "Read", {"file_path": page_home + "gui/states.md"}),
            say("2026-10-11T10:00:09Z", "s1", "Per gui/critique.md, the grouping fails."),
            prompt("2026-10-11T10:05:00Z", "u2", "<command-name>/implement</command-name>\n"
                   "<command-args>app-12</command-args>"),
            inject("2026-10-11T10:05:03Z", "a2", "PreToolUse",
                   "ref/go/context.md — injected because this session is editing main.go:\n\n# go\n"),
            # Read then edit of the go page is maintenance of the ref, not use.
            tool("2026-10-11T10:05:04Z", "t2", "Read", {"file_path": page_home + "go/review.md"}),
            tool("2026-10-11T10:05:05Z", "t3", "Edit", {"file_path": page_home + "go/review.md"}),
            prompt("2026-10-11T10:09:00Z", "u3", "now polish the empty state"),
            inject("2026-10-11T10:09:01Z", "a3", "UserPromptSubmit",
                   f"<persisted-output>\nOutput too large (19.7KB). Full output saved to: {saved}\n\n"
                   "Preview (first 2KB):\nref/gui/states.md — inj\n...\n</persisted-output>"),
        ]
        (proj / f"{SID}.jsonl").write_text("\n".join(json.dumps(r) for r in records) + "\n")
        # A fork copies its parent's records under a new session id, uuids unchanged. Its name
        # sorts first, but it was created after the parent.
        fork = [dict(r, sessionId="00000000-0000-0000-0000-000000000002") for r in records[:2]]
        (proj / "00000000-0000-0000-0000-000000000002.jsonl").write_text(
            "\n".join(json.dumps(r) for r in fork) + "\n")
        # The edit event fires inside a subagent under the parent's session id. Its whole hook
        # output fits in the preview, so the model saw it and it is not cut.
        sub = proj / SID / "subagents" / "agent-1.jsonl"
        sub_saved = proj / SID / "tool-results" / "hook-2-additionalContext.txt"
        sub_text = "ref/rust/context.md — injected because this edit of lib.rs is about rust:\n\n# rust\n"
        sub_saved.write_text(sub_text)
        sub.parent.mkdir(parents=True)
        sub.write_text("\n".join(json.dumps(r) for r in [
            prompt("2026-10-11T10:20:00Z", "v1", "Brief: fix the parser"),
            inject("2026-10-11T10:20:05Z", "b1", "PreToolUse",
                   f"<persisted-output>\nOutput too large (9KB). Full output saved to: {sub_saved}\n\n"
                   f"Preview (first 2KB):\n{sub_text}</persisted-output>"),
        ]) + "\n")
        self.log = base / "ref-picker.log"
        # The hook rotated the oldest line out to <log>.1.
        Path(f"{self.log}.1").write_text(
            f"2026-10-11T10:00:01Z session={SID} backend=jev label=gui show-shape=0.4/0.2:below\n")
        self.log.write_text(
            # A line from before cc-sfy5: no event, no outcome, no prompt text.
            f"2026-10-11T10:09:02Z session={SID} backend=jev label=none diagnose=0.1/0.8:below\n"
            f"2026-10-11T10:12:00Z session={SID} backend=jev event=edit file=\"/a b/x.swift\" "
            f"label=apple:injected pages=1 page:ref/apple/simulator.md=0.95/0.9:injected "
            f"prompt=\"now polish the empty state\"\n"
            f"2026-10-11T10:13:00Z session={SID} backend=jev event=edit file=\"/a/y.go\" "
            f"label=go:claimed pages=failed prompt=\"now polish the empty state\"\n")

    def tearDown(self):
        self.tmp.cleanup()

    def corpus(self):
        return pr.ref_corpus(log_path=self.log, root=self.root)

    def test_each_injection_joins_to_the_prompt_it_fired_on(self):
        inj, _, _ = self.corpus()
        got = sorted((i["kind"], i["name"], i["event"], i["backend"], i["prompt"])
                     for i in inj if i["source"] == "transcript")
        self.assertEqual(got, sorted([
            ("label", "gui", "prompt", "jev", "make the settings screen less cluttered"),
            ("label", "go", "edit-ext", "rule", "/implement app-12"),
            ("label", "rust", "edit", "unlogged", "Brief: fix the parser"),
            ("page", "ref/gui/critique.md", "prompt", "unlogged",
             "make the settings screen less cluttered"),
            ("page", "ref/gui/states.md", "prompt", "unlogged", "now polish the empty state"),
        ]))

    def test_a_logged_injection_with_no_transcript_record_is_kept(self):
        inj, _, _ = self.corpus()
        self.assertEqual(sorted((i["kind"], i["name"], i["file"]) for i in inj if i["source"] == "log"),
                         [("label", "apple", "/a b/x.swift"), ("page", "ref/apple/simulator.md", "/a b/x.swift")])

    def test_a_none_pick_joins_its_prompt_by_timestamp(self):
        _, log, _ = self.corpus()
        none = [e for e in log if not e["labels"]]
        self.assertEqual([e["prompt"] for e in none], ["now polish the empty state"])

    def test_a_cut_injection_reads_its_headers_from_the_saved_file(self):
        inj, _, _ = self.corpus()
        states = [i for i in inj if i["name"] == "ref/gui/states.md"]
        self.assertEqual(len(states), 1)
        self.assertTrue(states[0]["cut"].endswith("hook-1-additionalContext.txt"))

    def test_an_injection_that_fits_the_preview_is_not_cut(self):
        inj, _, _ = self.corpus()
        rust = next(i for i in inj if i["name"] == "rust")
        self.assertIsNone(rust["cut"])
        self.assertTrue(rust["subagent"])
        self.assertIn("subagents", rust["stream"])

    def test_a_failed_page_call_is_parsed(self):
        _, log, _ = self.corpus()
        self.assertEqual([[(lab["name"], lab["outcome"]) for lab in e["labels"]] for e in log if e["pages_failed"]],
                         [[("go", "claimed")]])

    def test_a_line_choosing_several_labels_keeps_each(self):
        log = Path(self.tmp.name) / "multi.log"
        log.write_text(
            f"2026-10-13T10:00:00Z session={SID} backend=jev event=edit file=\"/a/b.test.ts\" "
            f"label:web=1.0/1.0:injected label:testing=0.98/0.96:deferred pages=15 "
            f"page:ref/web/review.md=0.92/0.84:injected prompt=\"fix the form\"\n")
        (e,) = pr.parse_log(log)
        self.assertEqual(e["labels"], [{"name": "web", "p": 1.0, "conf": 1.0, "outcome": "injected"},
                                       {"name": "testing", "p": 0.98, "conf": 0.96, "outcome": "deferred"}])
        self.assertEqual([pg["name"] for pg in e["pages"]], ["ref/web/review.md"])

    def test_since_drops_older_transcripts_and_log_lines(self):
        inj, log, _ = pr.ref_corpus(since="2099-01-01", log_path=self.log, root=self.root)
        self.assertEqual((inj, log), ([], []))

    def test_follow_through_counts_a_read_and_skips_maintenance(self):
        inj, _, actions = self.corpus()
        by = {i["name"]: i for i in inj}
        gui, go = by["gui"], by["go"]
        self.assertEqual(pr.files_table("gui", self.skills), ["ref/gui/states.md", "ref/gui/critique.md"])
        self.assertEqual(pr.follow_through(gui, actions[gui["stream"]], pr.files_table("gui", self.skills)),
                         {"ref/gui/states.md"})
        self.assertEqual(pr.follow_through(go, actions[go["stream"]], pr.files_table("go", self.skills)), set())

    def test_an_injected_page_named_afterwards_counts_as_cited(self):
        inj, _, actions = self.corpus()
        crit = next(i for i in inj if i["name"] == "ref/gui/critique.md")
        self.assertEqual(pr.page_used(crit, actions[crit["stream"]]), (True, False))

    def test_one_command_prints_every_section(self):
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            rc = pr.report_ref(None, 5, 1, log_path=self.log, skills=self.skills, root=self.root)
        self.assertEqual(rc, 0)
        for heading in ("LABEL INJECTIONS", "PROMPT -> LABEL", "PROMPT -> PAGE",
                        "FOLLOW-THROUGH", "INJECTED PAGES"):
            self.assertIn(heading, out.getvalue())
        self.assertIn("cut to a 2KB preview: 1 injections (0 labels, 1 pages) in 1 hook outputs;",
                      out.getvalue())


if __name__ == "__main__":
    unittest.main()
