# HTML mockup — rung 3 of the fidelity ladder

A mockup is static HTML in the project's real CSS: several **variants**, each in several
**states**, with no harness chrome in the output. `spike shot` screenshots every variant and
state headless and writes PNGs. It answers "what does this look like, exactly" for a project
that already has tokens and components. `spike video` does the same for motion: it plays a
cell's CSS animations and transitions and writes an animated WebP and a filmstrip PNG. A
mockup cannot show behaviour that needs input: a state reached by clicking, or a real
component's response. That climbs to [UI.md](UI.md).

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

## Recording motion

When a cell's question is an animation, write it as CSS `animation` or `transition` that runs
on load, in the cell's own markup, then record it:

```bash
"$HOME/.claude/skills/spike/tool/spike" video <slug> --size 390x844 --theme both
```

For each cell and theme it prints two absolute paths: `<variant>-<state>.webp`, a looping
animated WebP, and `<variant>-<state>-strip.png`, six frames side by side. `-dark` is appended
for the dark scheme, `-reduced` for a `--reduced` run, before the extension.

The tool pauses every animation under the cell and sets its `currentTime` to each timestamp,
so every frame is exact; a screen recording would not be. The length is the longest end time
among the cell's animations, delay included; an animation with infinite iterations counts for
one. Flags:

| Flag | Meaning |
| --- | --- |
| `--size`, `--theme`, `--cell`, `--scale`, `--dir`, `--query` | As for `spike shot` |
| `--reduced` | Render under `prefers-reduced-motion: reduce`. A project that disables its animations there has nothing to seek, so every frame is the resting state and the tool says so; that is the right output |
| `--fps N` | Frames per second, 1–60 (default 30) |
| `--duration MS` | Record this long instead of the animation's own length |
| `--hold MS` | How long the last frame stays before the loop restarts (default 600) |
| `--strip N` | Frames in the filmstrip PNG, evenly spaced from first to last (default 6) |
| `--quality Q` | Lossy WebP quality 0–100 (default 80) |

`spike video` needs `img2webp` and `ffmpeg` (`brew install webp ffmpeg`) and names the missing
one. Open the WebP wherever it animates and the strip wherever only stills show; look at both
([CRITIQUE.md](CRITIQUE.md)). Only animations running at load are recorded: a transition that
needs a click or a hover to start is a prototype question.

## What the width means

Screen size is the shot's `--size`, never a variant. A phone design and a desktop design are
two spikes with two slugs, shot at their own widths (`390x844`, `1440x900`).

## Rebuilding

Edit the fragment, build to the same `--out`, shoot again; the PNGs are overwritten. A cell
removed from the fragment leaves its old PNG behind, so delete the PNGs of dropped cells.
