# `_artifacts/` — shared visual-artifact store

Not a skill. The **implementation and delivery substrate** every skill uses when its output is a
self-contained HTML file. The leading `_` and the absence of any `SKILL.md` keep this directory from
registering as a skill (same mechanism as `_domains/` and `_domains/`).

The principle: **the verb is the skill; this is what the verbs share.** `explain` decides what an
explanation should say, `prototype` decides which directions diverge, `ui-design` decides where things
sit on a layout. None of them should be re-authoring a reset, a theme block, or a picker to say it.

## What's here

```
README.md         <- this file
DIRECTION.md      <- creative direction: register, palette, type, the originality bar
CONTRACT.md       <- the five kinds, their class vocabulary, and the body-fragment rules
CRITIQUE.md       <- the one batched pass between building an artifact and handing it over
kinds/
  _base.css       <- reset, theme plumbing, layout + overflow primitives, focus, print
  explainer.css   <- house look: semantic colour, type scale, callouts, steps, diagrams, cites
  prototype.css   <- stage only, no palette; variants carry the project's own tokens
  wireframe.css   <- greybox; withholds colour on purpose
  deck.css        <- slide sections
  page.css        <- generic fallback; palette and type left empty for the model to choose
harness/
  rail.css        <- the prototype control rail, fixed spec, never restyled
  rail.js         <- rounds, variants, state axes; driven by <template data-variant>
                     and <nav data-axis>; other widgets add groups via window.__atRail
  deck.js         <- slide keyboard navigation
  theme.js        <- light/dark toggle
  annotate.css    <- the comment layer
  annotate.js     <- comment on elements, export the comments as markdown
  contrast.css    <- the WCAG check's badges
  contrast.js     <- flag text that fails AA against its backdrop
  viewport.css    <- device bezel + the chrome that sits outside the viewport
  viewport.js     <- real iframe per device; --devices names which frames exist
```

## Widgets

Generic chrome any artifact can carry, declared in one table (`WIDGETS`) in the tool.
Adding one is a row there plus its files here — not three new branches in the build path.
`artifact kinds` prints the current set; `--with NAME` adds one to a kind that does not
get it by default, `--without NAME` drops one.

| Widget | Default on | What it does |
|---|---|---|
| `theme` | every kind but `prototype` | light/dark toggle button |
| `annotate` | every kind | press `a`: comment on elements, export the comments as markdown |
| `contrast` | every kind | press `c`: flag text failing WCAG AA against its backdrop |
| `viewport` | never — opt in with `--with viewport` | device-size switcher (Fit / Phone / Tablet / Desktop), in a real viewport |

`annotate` and `contrast` are on everywhere because they are **dormant**: they render
nothing at all until their key is pressed, so an artifact you hand to someone else looks
exactly as it would without them. `viewport` is visible chrome and no kind implies it —
a prototype can just as easily be a desktop-only menubar panel as a responsive page — so
the model asks for it per artifact.

The picker and the deck navigator are not widgets — they restructure the body rather
than adding chrome to it, so they keep their own path in the tool.

The tool that assembles all of it: `~/.claude/tools/artifact`.

## Who reads what

| Skill | Kind | Cells it reads |
|---|---|---|
| `explain` (Tier 2) | `explainer` | `CONTRACT.md` |
| `prototype` (UI shape, and COMPARE's visual branch) | `prototype` | `CONTRACT.md` |
| `ui-design` (sketch mode, escalated) | `wireframe` | `CONTRACT.md` |
| `artifact` | `page`, `deck` | `CONTRACT.md` + `DIRECTION.md` |

`CRITIQUE.md` is read by all four, at the same point: after the build, before `open`.

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
