"""Pins the prose<->script contract for this skill.

SKILL.md and CORPUS.md tell the model which extractor answers which question and
which flags to run. The scripts implement them. This test fails when either side
drifts: a flag the docs name that no script accepts, or a load-bearing claim
edited out of the docs while the script still emits the number it explained.

Run: python3 ~/.claude/skills/audit-session/test_contract.py
"""

import re
import unittest
from pathlib import Path

HERE = Path(__file__).parent
SCRIPTS = ["analyze.py", "adherence.py", "pointer_rate.py"]
DOCS = ["SKILL.md", "CORPUS.md"]


def script_flags(name: str) -> set[str]:
    src = (HERE / name).read_text()
    return set(re.findall(r"add_argument\(\s*\"(--[a-z][a-z-]*)\"", src))


def doc_text() -> str:
    return "\n".join((HERE / d).read_text() for d in DOCS)


class TestDocsMatchScripts(unittest.TestCase):
    def test_every_doc_named_flag_exists_in_a_script(self):
        # A flag counts as documented only on a line that also names an
        # extractor script — docs legitimately mention other programs' flags
        # (`claude -p --output-format json`) and dashed path fragments.
        implemented = set().union(*(script_flags(s) for s in SCRIPTS))
        documented = {
            flag
            for line in doc_text().splitlines()
            if any(script in line for script in SCRIPTS)
            for flag in re.findall(r"(?<![\w-])(--[a-z][a-z-]+)\b", line)
        }
        missing = documented - implemented
        self.assertFalse(
            missing,
            f"docs name flags no extractor accepts: {sorted(missing)}",
        )

    def test_skill_md_names_each_extractor_with_its_question(self):
        skill = (HERE / "SKILL.md").read_text()
        for script in SCRIPTS:
            self.assertIn(script, skill, f"SKILL.md no longer names {script}")

    def test_load_bearing_flags_still_implemented(self):
        # The flags SKILL.md builds whole lenses on top of.
        for script, flag in [
            ("analyze.py", "--steering"),
            ("analyze.py", "--dump-user-messages"),
            ("analyze.py", "--dump"),
            ("pointer_rate.py", "--fires"),
            ("adherence.py", "--rule"),
        ]:
            self.assertIn(
                flag,
                script_flags(script),
                f"{script} dropped {flag}, which SKILL.md still instructs",
            )

    def test_load_bearing_claims_still_in_docs(self):
        # Claims a lens relies on to interpret extractor output correctly.
        text = doc_text()
        for claim in [
            "--steering",              # attachment/steering extraction exists
            "--fires",                 # skill-misfire's fire-rate instrument
            "--dump-user-messages",    # the raw-text lens input
            "dedupes",                 # fork dedup promise (measurement trap)
            "subagents",               # sidechain collection promise
        ]:
            self.assertIn(
                claim, text,
                f"docs lost the claim {claim!r} that a lens depends on",
            )


if __name__ == "__main__":
    unittest.main()
