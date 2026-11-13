---
run: gated
when:
  - paths: ["**/*.tsx", "**/*.jsx", "**/*.vue", "**/*.svelte", "**/*.astro", "**/*.html",
            "**/*.swift", "**/*.strings", "**/*.xcstrings", "**/locales/**", "**/i18n/**"]
---

# Copy lens

Flag user-facing strings the diff adds or changes that should not exist. The procedure is
[`../../clean-copy/SKILL.md`](../../clean-copy/SKILL.md): read it whole and walk every added or
changed label, caption, hint, empty state, toast, confirmation and button down its ladder.

When this lens runs is its frontmatter, which [`../tool/lens-gate`](../tool/lens-gate) evaluates.

## What to check

1. **Read each string beside what renders around it** — the label, value and button in the same
   component — since a redundant string only shows next to its neighbours.
2. **Stop at the first rung that fires.** The finding names the `file:line`, quotes the current
   string, gives the rewrite or `cut`, and names the rung in a few words.
3. **A string that survives** (a consequence at the moment of choosing, a scope fact the user can't
   see, a blank state's next step, a unit on a bare value) is not reported.

## Bounds

- Only strings the diff adds or changes; an untouched string is `improve gui`'s.
- Wording, tone and capitalization of a string that should exist belong to the gui label lens, not
  this one.
