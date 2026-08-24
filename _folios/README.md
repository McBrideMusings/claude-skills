# `_folios/` — shared visual-folio store

Not a skill. The **implementation and delivery substrate** every skill uses when its output is a
self-contained HTML file. The leading `_` and the absence of any `SKILL.md` keep this directory from
registering as a skill (same mechanism as `_domains/` and `_tracker/`).

The principle: **the verb is the skill; this is what the verbs share.** `explain` decides what an
explanation should say, `spike` decides which directions diverge, `gui` decides where things
sit on a layout. None of them should be re-authoring a reset, a theme block, or a picker to say it.

## What's here

```
README.md         <- this file
DIRECTION.md      <- creative direction: register, palette, type, the originality bar
CONTRACT.md       <- the three kinds, their class vocabulary, and the body-fragment rules
CRITIQUE.md       <- the one batched pass between building a folio and handing it over
kinds/
  _base.css       <- reset, theme plumbing, layout + overflow primitives, focus, print
  explainer.css   <- house look: semantic colour, type scale, callouts, steps, diagrams, cites
  prototype.css   <- stage only, no palette; variants carry the project's own tokens
  wireframe.css   <- greybox; withholds colour on purpose
harness/
  chrome.css      <- the one palette every piece of harness furniture consumes, plus the
                     insets that describe how much of the window the folio actually gets
  dock.js         <- the floating buttons: one style, draggable, snapping to an edge
  rail.css        <- the prototype control rail, fixed spec, never restyled
  rail.js         <- rounds, variants, state axes; driven by <template data-variant>
                     and <nav data-axis>; other widgets add groups via window.__atRail
  theme.js        <- light/dark toggle
  annotate.css    <- the comment layer
  annotate.js     <- comment on elements, export the comments as markdown
  contrast.css    <- the WCAG check's badges
  contrast.js     <- flag text that fails AA against its backdrop
  checks.css      <- the standing verdict rows in the rail
  checks.js       <- eight checks that run themselves and report in the rail
  viewport.css    <- device bezel + the chrome that sits outside the viewport
  viewport.js     <- real iframe per device; --devices names which frames exist
```

## Widgets

Generic chrome any folio can carry, declared in one table (`WIDGETS`) in the tool.
Adding one is a row there plus its files here — not three new branches in the build path.
`spike kinds` prints the current set; `--with NAME` adds one to a kind that does not
get it by default, `--without NAME` drops one.

| Widget | Default on | What it does |
|---|---|---|
| `theme` | every kind but `prototype` | light/dark toggle button |
| `annotate` | every kind | press `a`: comment on elements, export the comments as markdown |
| `contrast` | every kind | press `c`: flag text failing WCAG AA against its backdrop |
| `viewport` | never — opt in with `--with viewport` | device-size switcher (Fit / Phone / Tablet / Desktop), in a real viewport |
| `checks` | `prototype` | eight standing checks in the rail: contrast, overflow, tap targets, text size, dead links, image alt, duplicate ids, hermetic |

`chrome.css` and `dock.js` are not widgets: they load whenever any widget does, because a palette
and a button behaviour that only half the chrome shares is how two surfaces drift apart.

`annotate` and `contrast` are on everywhere because they are **dormant**: they render
nothing at all until their key is pressed, so a folio you hand to someone else looks
exactly as it would without them. `viewport` is visible chrome and no kind implies it —
a prototype can just as easily be a desktop-only menubar panel as a responsive page — so
the model asks for it per prototype.

The picker is not a widget — it restructures the body rather than adding chrome to it,
so it keeps its own path in the tool.

**Two tools assemble all of it**, split by whether the output has variants:

- `~/.claude/tools/spike` — `prototype` and `wireframe`. Owns the picker, rounds, state
  axes and device frames.
- `~/.claude/tools/explainer` — `explainer`. One look, no variants, none of that
  machinery; it takes no `--kind`.

They share this directory, which is the whole point: one set of tokens, one class
vocabulary, one comment layer, two front doors.

## Who reads what

| Skill | Tool | Kind | Store |
|---|---|---|---|
| `explain` | `explainer` | `explainer` | `tmp/claude/explainers/`, kept in `docs/explainers/` |
| `improve` (architecture review, survey report) | `explainer` | `explainer` | same as `explain` — it routes through that skill |
| `spike` (UI shape, and COMPARE's visual branch) | `spike` | `prototype` | `tmp/claude/spikes/`, kept in `docs/spikes/` |
| `gui` (sketch mode, escalated) | `spike` | `wireframe` | same as `spike` — it routes through that skill |

All four read `CONTRACT.md` for the class vocabulary, and `CRITIQUE.md` at the same point:
after the build, before `open`.

`DIRECTION.md` is currently read by **nothing**. It covers the identity-first case — palette
and typefaces as open decisions — which belonged to the retired `page` and `deck` kinds.
`explainer` has a house look already, `prototype` copies the project's tokens, and
`wireframe` is deliberately colourless, so none of the three surviving kinds has a direction
to choose. It is kept because the guidance is not kind-specific and is the reference if an
identity-first kind ever comes back; delete it rather than wiring it to a kind that already
has its palette decided.

## Why a tool and not a scaffold

A scaffold gets read into context and then retyped into the output — the same CSS paid twice, every
run. The tool inlines the stylesheet at assembly time, so it enters context in neither direction. The
model writes a body fragment of real content and nothing else.

## Hermetic, always

Every kind produces **one file**: no network requests, no CDN, no web fonts, no external libraries.
Inline `<style>`, inline `<script>`, diagrams as inline `<svg>`, images as `data:` URIs. It must render
identically offline and in five years.

Measured against real Chrome on `file://`: inline classic scripts, inline `type="module"` scripts, and
blob-URL workers all run. Only `fetch()` is blocked (`origin 'null'`), and a hermetic folio has
nothing to fetch — data goes in as a JS literal. **This is why no web server is part of the design.**
Both tools carry a `serve` subcommand as a contingency, shelling out to the already-installed
`python3`.

## Delivery

Write to disk, then `open <absolute-path>`. **Screenshot it and look at it before handing it over** —
a path is delivery, not verification; rendering failures live in pixels, not in source. Never publish
a folio to a hosted page (see `~/.claude/CLAUDE.md` §Permission gates); the file itself is the
portable thing.
