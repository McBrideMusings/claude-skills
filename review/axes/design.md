---
run: gated
when:
  - paths: ["**/*.css", "**/*.scss", "**/*.sass", "**/*.less", "**/*.tsx", "**/*.jsx",
            "**/*.vue", "**/*.svelte", "**/*.astro", "**/*.html", "**/DESIGN.md",
            "**/DESIGN.local.yaml", "**/*tokens*"]
  - dsys: {mode: owned, designMd: true}
---

# Design lens

Flag UI code in the diff that breaks the repo's own written design contract. The contract is `DESIGN.md`: its **Do's and Don'ts** prose, its **Named Rules**, its token and component sections, and what `dsys check --json` reports. This lens judges conformance to a standard the owner already wrote down, so every finding cites a rule. A finding without a cited rule is a taste call and does not belong here; `improve gui` owns taste ([`../../ref/gui/critique.md`](../../ref/gui/critique.md)).

When this lens runs is its frontmatter, which [`../tool/lens-gate`](../tool/lens-gate) evaluates.

## What to check

1. **Do's and Don'ts.** Read the whole `## Do's and Don'ts` section of `DESIGN.md`. For each changed UI hunk, ask whether it does a listed *Don't* or omits a listed *Do*. The finding quotes the rule's own words and names the line that breaks it.
2. **Named Rules.** The `### Named Rules` blocks under Colors, Typography, Elevation and similar sections are rules too; a hunk that breaks one cites it by name.
3. **Tokens and components.** A hard-coded colour, font, radius, shadow or spacing value where `DESIGN.md` defines a role-named token, or a hand-built control where `## Components` defines one. Resolve the token with `dsys show --json <name>` so the finding states the real value the diff should have used.
4. **`dsys check --json`.** Run it. Each entry in the returned array (`kind`, `severity`, `file`, `message`) that the diff introduced is a finding, cited as `dsys check: <kind>`. Keep an entry only when its `file` is a file the diff touches, or when the diff touches `DESIGN.md` or a token or export file the entry names. An entry about an untouched file is not this diff's and stays out.

## Bounds

- **Never report a rule that the diff's own commit amends.** A diff that edits `DESIGN.md` changes the contract; check the rest of the diff against the edited file.
- **Skip what the repo's lint already reports on this diff** — the dsys ESLint fragment, wired and failing where the author will see it. `dsys status --json` says `lintWired`.
- **Overlap with `ref/gui` lenses.** Motion defects and visual slop stay with the `gui` label lens ([`../../ref/gui/review.md`](../../ref/gui/review.md)). This lens takes only what a written `DESIGN.md` rule decides.
- **Rate by what the broken rule guards.** A rule that guards behaviour (a focus ring, a contrast floor, a hit-area minimum) is `P1` or worse; a palette or spacing rule is `P3`.

Axis tag: `design` (flat — name the rule in the headline prose, e.g. "the button hard-codes `#1a73e8` where `DESIGN.md` defines the `primary` token").
