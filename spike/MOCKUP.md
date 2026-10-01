# HTML mockup — rung 3 of the fidelity ladder

A mockup is static HTML in the project's real CSS: several **variants**, each in several
**states**, with no harness chrome in the output. `spike shot` screenshots every variant and
state headless and writes PNGs. It answers "what does this look like, exactly" for a project
that already has tokens and components. It cannot show behaviour; when the question is a
transition, a state reached by clicking or a real component's response, climb to
[UI.md](UI.md).

## Steps

1. **Scope, recon, directions** — [UI.md](UI.md) Phases 01–03 apply unchanged: one piece of UI,
   the project's tokens, a named axis per variant, no two variants at the same axis position.
2. **Load the project's real CSS.** Paste the `dsys export` declarations into the fragment's
   `<style>` with `@theme` renamed `:root`, and pass the project's own stylesheet with
   `--extra-css <abs.css>` when it exists. A mockup inlines no palette, type or reset of its own.
3. **Write the fragment** to `/private/tmp/claude/<repo-slug>/spikes/<slug>/<slug>.body.html`:
   one `<template data-variant="Name" data-state="State">` per cell. A variant is a direction
   being compared; a state is a condition each direction has to survive (full, empty, error,
   loading, long text). Every variant appears in every state the question needs, because a
   variant that skips a state hides its weakest screen. Omit `data-state` for a single-state variant.
4. **Build:**

   ```bash
   "$HOME/.claude/skills/spike/tool/spike" build --kind mockup \
     --title "Sessions" \
     --fragment /private/tmp/claude/<repo-slug>/spikes/<slug>/<slug>.body.html \
     --out /private/tmp/claude/<repo-slug>/spikes/<slug>/<slug>.html
   ```

   The output holds one `mk-cell` per template, id `variant-state` in kebab case (`quiet-full`,
   `dense-empty`), and shows one at a time: `<slug>.html#dense-empty`.
5. **Shoot:**

   ```bash
   "$HOME/.claude/skills/spike/tool/spike" shot <slug> --size 390x844 --theme both
   ```

   Reads `<slug>.html` in the spike directory and prints one absolute PNG path per line,
   `<variant>-<state>.png` (`-dark` appended for the dark scheme), in that same directory. `--size WxH` is the
   window width and the minimum height (default `1280x900`); a taller design is captured at its
   full height. `--theme light|dark|both` sets `prefers-color-scheme`. `--cell id,id` reshoots
   some cells. `--scale 2` doubles the pixel density. `--dir <abs-dir>` names the spike
   directory when the scratch root differs.
6. **Open every PNG and look at it** ([CRITIQUE.md](CRITIQUE.md)), then show the result per
   [CONTRACT.md](CONTRACT.md) rule 10 and stop: the choice is the user's.

## What the width means

Screen size is the shot's `--size`, never a variant. A phone design and a desktop design are
two spikes with two slugs, shot at their own widths (`390x844`, `1440x900`).

## Rebuilding

Edit the fragment, build to the same `--out`, shoot again; the PNGs are overwritten. A cell
removed from the fragment leaves its old PNG behind, so delete the PNGs of dropped cells.
