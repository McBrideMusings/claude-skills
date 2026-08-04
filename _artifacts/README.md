# `_artifacts/` — shared visual-artifact store

Not a skill. The **implementation and delivery substrate** every skill uses when its output is a
self-contained HTML file. The leading `_` and the absence of any `SKILL.md` keep this directory from
registering as a skill (same mechanism as `_domains/` and `_platforms/`).

The principle: **the verb is the skill; this is what the verbs share.** `explain` decides what an
explanation should say, `prototype` decides which directions diverge, `ui-design` decides where things
sit on a layout. None of them should be re-authoring a reset, a theme block, or a picker to say it.

## What's here

```
README.md         <- this file
DIRECTION.md      <- creative direction: register, palette, type, the originality bar
CONTRACT.md       <- the five kinds, their class vocabulary, and the body-fragment rules
kinds/
  _base.css       <- reset, theme plumbing, layout + overflow primitives, focus, print
  explainer.css   <- house look: semantic colour, type scale, callouts, steps, diagrams, cites
  prototype.css   <- stage only, no palette; variants carry the project's own tokens
  wireframe.css   <- greybox; withholds colour on purpose
  deck.css        <- slide sections
  page.css        <- generic fallback; palette and type left empty for the model to choose
harness/
  picker.css      <- the variant picker, fixed spec, never restyled
  picker.js       <- picker wiring, driven by <template data-variant>
  deck.js         <- slide keyboard navigation
```

The tool that assembles all of it: `~/.claude/tools/artifact`.

## Who reads what

| Skill | Kind | Cells it reads |
|---|---|---|
| `explain` (Tier 2) | `explainer` | `CONTRACT.md` |
| `prototype` (UI shape, and COMPARE's visual branch) | `prototype` | `CONTRACT.md` |
| `ui-design` (sketch mode, escalated) | `wireframe` | `CONTRACT.md` |
| `artifact` | `page`, `deck` | `CONTRACT.md` + `DIRECTION.md` |

`DIRECTION.md` is read only for the **identity-first** kinds — `page` and `deck` — where palette and
typefaces are open decisions. `explainer` has a house look already, `prototype` copies the project's
tokens, and `wireframe` is deliberately colourless, so none of the three has a direction to choose.

## Why a tool and not a scaffold

A scaffold gets read into context and then retyped into the output — the same CSS paid twice, every
run. The tool inlines the stylesheet at assembly time, so it enters context in neither direction. The
model writes a body fragment of real content and nothing else.

## Hermetic, always

Every kind produces **one file**: no network requests, no CDN, no web fonts, no external libraries.
Inline `<style>`, inline `<script>`, diagrams as inline `<svg>`, images as `data:` URIs. It must render
identically offline and in five years.

Measured against real Chrome on `file://`: inline classic scripts, inline `type="module"` scripts, and
blob-URL workers all run. Only `fetch()` is blocked (`origin 'null'`), and a hermetic artifact has
nothing to fetch — data goes in as a JS literal. **This is why no web server is part of the design.**
`artifact serve` exists as a contingency and shells out to the already-installed `python3`.

## Delivery

Write to disk, then `open <absolute-path>`. **Screenshot it and look at it before handing it over** —
a path is delivery, not verification; rendering failures live in pixels, not in source. Never publish
an artifact to a hosted page (see `~/.claude/CLAUDE.md` §5); the file itself is the portable thing.
