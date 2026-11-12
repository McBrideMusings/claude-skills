---
run: gated
when:
  - paths: ["**/*.css", "**/*.scss", "**/*.sass", "**/*.less", "**/*.tsx", "**/*.jsx",
            "**/*.vue", "**/*.svelte", "**/*.astro", "**/*.html", "**/DESIGN.md",
            "**/*tokens*", "**/*tokens*/**", "**/*.swift", "**/Assets.xcassets/**"]
  - files: [DESIGN.md]
---

# Design lens

Flag UI code in the diff that breaks the repo's own written design contract. The contract is `DESIGN.md`: its **Do's and Don'ts** prose, its **Named Rules**, its token, Layout and Components sections, and what the repo's `project-design/tools/lint.sh` reports. This lens judges conformance to a standard the owner already wrote down, so every finding cites a rule. A finding without a cited rule is a taste call and does not belong here; `improve gui` owns taste.

When this lens runs is its frontmatter, which [`../tool/lens-gate`](../tool/lens-gate) evaluates.

## What to check

1. **Do's and Don'ts.** Read the whole `## Do's and Don'ts` section of `DESIGN.md`. For each changed UI hunk, ask whether it does a listed *Don't* or omits a listed *Do*. The finding quotes the rule's own words and names the line that breaks it.
2. **Named Rules.** The `### Named Rules` blocks under Colors, Typography, Elevation and similar sections are rules too; a hunk that breaks one cites it by name.
3. **Tokens, components and layout.** A hard-coded colour, font, radius, shadow or spacing value where `DESIGN.md` defines a role-named token, a hand-built control where `## Components` defines one, or a new element placed where `## Layout` does not put that kind of element. Resolve the token from `DESIGN.md`'s front matter (follow `{group.name}` references) so the finding states the real value the diff should have used.
4. **`project-design/tools/lint.sh`.** When the repo has one, run it. Each failure the diff introduced is a finding, cited as `lint: <rule>`. Keep a failure only when it names a file the diff touches, or when the diff touches `DESIGN.md` or the token file it names. A failure about an untouched file is not this diff's and stays out.

## Bounds

- **Never report a rule that the diff's own commit amends.** A diff that edits `DESIGN.md` changes the contract; check the rest of the diff against the edited file.
- **Skip what the repo's own lint already reports on this diff** — a project rule `DESIGN.md` names as enforced, failing where the author will see it.
- **Overlap with the `gui` label lens.** Motion defects and visual slop stay with the `gui` label lens, when a knowledge base supplies one. This lens takes only what a written `DESIGN.md` rule decides.
- **Rate by what the broken rule guards.** A rule that guards behaviour (a focus ring, a contrast floor, a hit-area minimum) is `P1` or worse; a palette or spacing rule is `P3`.

Axis tag: `design` (flat — name the rule in the headline prose, e.g. "the button hard-codes `#1a73e8` where `DESIGN.md` defines the `primary` token").
