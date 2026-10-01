# Contract — kinds, fragments, class vocabulary

What you write is a **body fragment**: real content, nothing else. No `<!DOCTYPE>`, no `<html>`, no
`<head>`, no reset, no theme block, no type scale, no picker. The tool supplies all of that.

## Invoke

```bash
"$HOME/.claude/skills/spike/tool/spike" build \
  --kind mockup \
  --title "Wheelhouse nav" \
  --fragment /private/tmp/claude/<repo-slug>/spikes/wheelhouse-nav/wheelhouse-nav.body.html \
  --out /private/tmp/claude/<repo-slug>/spikes/wheelhouse-nav/wheelhouse-nav.html

"$HOME/.claude/skills/spike/tool/spike" shot wheelhouse-nav --size 390x844
```

`spike kinds` lists the kinds. `spike` carries `serve <path>` as a contingency that shells to
`python3 -m http.server`; you almost never need it — `file://` runs inline modules and blob workers
fine, and a hermetic build never calls `fetch`.

**Every path absolute.** Resolve the repo root in its own Bash call (`git rev-parse --show-toplevel`,
falling back to absolute `pwd`) and build `/private/tmp/claude/<repo-slug>/…` from it. A path that doesn't start with
`/` is the bug.

## The three kinds

| Kind | For | Output | Palette |
|---|---|---|---|
| `mockup` | The project's real CSS, several variants each in several states | Static; no harness chrome. `spike shot` screenshots it and `spike video` records its CSS animation ([MOCKUP.md](MOCKUP.md)) | **None** — your fragment and `--extra-css` carry the project's CSS |
| `prototype` | Several genuinely different working versions of one UI | Interactive; the Tweaks panel | **None** — your fragment carries the host project's tokens |
| `wireframe` | Greybox layout: structure and hierarchy only | Static | **Withheld on purpose** — do not add colour |

Pick by what the thing you're building *is*. Explaining a mechanism, system or decision is a
different tool (`explainer`) and a different kind entirely — it has no variants and none of what follows applies to it.

## Fragment rules

- Plain HTML. It may include its own `<style>` and `<script>`; the tool hoists them into the single
  output file, so the result stays hermetic. A `mockup` has no script at all in its output beyond
  the fragment's own.
- **Never a network request.** No `<link>`, no `@import url()`, no CDN, no webfont, no remote image,
  no `fetch`/`XMLHttpRequest`/`import()` of an absolute or protocol-relative URL. A raster goes in
  as a `data:` URI. The build's own hermetic check (`tool/spike`) rejects all of these.
- **Real user data beats a baked fixture, and doesn't cost hermeticity.** `<input type="file">` plus
  `FileReader` reads the user's actual CSV, log, image, or JSON straight off their disk — no server,
  no network request, still one file. Reach for this whenever the prototype's whole point is how it
  handles real content, rather than writing a fixture that happens to look plausible.
- Non-void elements closed, attributes double-quoted.
- Real content from the first draft. No lorem ipsum, no `foo`/`bar`, no dead buttons.
- Broad content (tables, code, wide diagrams) goes in `<div class="scroll-x">` so horizontal scrolling
  never leaks to the page body.
- Hand-author diagrams as inline `<svg>`. No diagram library. **`var()` does not resolve in SVG
  presentation attributes** — style SVG through CSS rules or `style="…"`, never `fill="var(--x)"`.
- Reach for a drawing script over long hand-written SVG path data when graphics turn generative.

## `_base.css` — wireframe and prototype

Tokens on `:root`, reassigned for `prefers-color-scheme: dark`. Consume tokens; never hardcode a hex in markup.

```
--f-3xl --f-2xl --f-xl --f-lg --f-md --f-sm  type scale (root is 17px, so 1rem = 17px)
--s-1 … --s-7                                spacing scale (--s-7 is the section step)
--radius --maxw --maxw-wide
--font-sans --font-mono
--bg --surface --ink --ink-soft --line --c-muted --c-accent
```

`--f-3xl` is the display step: one per build, on the title, never on a section heading.

Utilities: `.scroll-x` (overflow container), `.stack` (vertical flex + gap), `.row` (horizontal flex +
gap), `.nums` (tabular numerals — the same class name on a `<td>` also right-aligns it), `.vh`
(visually hidden). Focus rings, `prefers-reduced-motion`, text selection, the caret, scrollbars and
link underline offset are already themed — don't re-declare them.

`prototype` and `wireframe` take the full viewport — neither uses the measure grid.

A `mockup` takes none of this: it inlines a zero body margin and the cell switch, so every colour,
size and font comes from the project's own CSS.

**Never a coloured `border-left` thicker than 1px** on a callout, card, list item or alert. It is the
most recognisable machine-made accent there is. Don't introduce one in a fragment.

## `mockup` — variants × states, no chrome

One `<template data-variant="Name" data-state="State">` per cell; [MOCKUP.md](MOCKUP.md) has the
steps. The cell id is `variant-state` in kebab case (a template with no `data-state` is the
`default` state), and two cells may not share one. The output shows one cell at a time through
the URL fragment (`<slug>.html#dense-empty`) and carries no panel, button, frame or script of its
own. `--extra-css <abs.css>` appends the project's real stylesheet.

## `prototype` — variants and tweaks behind one panel

The build is one page that mounts one variant at a time, full size, in the browser window. **Never a
grid of thumbnails**: small side-by-side comparison distorts spacing and scale, and judging UI at
postage-stamp size is the failure the picker exists to prevent.

The **Tweaks panel** is one floating card: a header (the title, and `--subtitle` naming the question
the prototype answers), the variant chooser, and every tweak the fragment registers. `×` closes it
to a **Tweaks** pill in the corner, and the pill opens it again (`?tweaks=0` remembers which). The
tool generates the card, the widgets and the URL persistence. **Write no panel code and no widget markup.**

```html
<style>
  /* the host project's tokens: the `dsys export` declarations, with @theme renamed :root */
  :root { --brand: #2f6df6; --radius-card: 10px; }
</style>

<template data-variant="Quiet">
  <div class="proto-frame">…the variant, in realistic surrounding context…</div>
</template>

<template data-variant="Editorial">
  <div class="proto-frame">…</div>
</template>

<script>
  // See "Tweaks" — this is the whole boilerplate for one control. Note what it is
  // NOT: which screen is showing is reachable by clicking, so it belongs in the
  // prototype, not up here. A server outage is not reachable by clicking at all.
  atTweaks.add('conn', [
    { value: 'up',   label: 'Connected' },
    { value: 'down', label: 'Server unreachable', hint: 'what the list does with no data' }
  ], {
    label: 'Connection',
    onChange: function (v) {
      document.querySelectorAll('[data-conn]').forEach(function (el) {
        el.hidden = el.dataset.conn !== v;
      });
    }
  });
</script>
```

- `data-variant` is the panel label — a direction ("Quiet", "Dense"), never "Variant A".
- Add `data-motion` to the fragment's first `<template>` if any variant has an entrance animation worth
  re-triggering — the tool then renders the replay button.
- The panel is chrome. It is never restyled with the project's tokens, and `prototype.css` supplies
  no palette of its own — every colour in the output comes from your fragment.
- Each variant renders in realistic surrounding context: a toast needs a page behind it, a card needs
  siblings, a button needs a form.
- The variant swap is instant. Flipping is a 100+/session action; it gets no animation.
- **Every control in the prototype is live.** Not the happy path only: each tab switches, each toggle
  toggles, each row opens something, each dangerous button shows what it would do. A dead control is
  worse than an absent one — it reads as a bug and stops the conversation the prototype exists to
  have. If a control genuinely goes nowhere, it does not go in.

### Tweaks — the design parameters you cannot reach by using the prototype

A **tweak** is a named value the panel renders a control for and your fragment reacts to. It is
orthogonal to variant on purpose — flipping variant must not reset what you are looking at,
because comparing one state across two directions is the entire job.

**The test is one question: can a user of the real app get to this by interacting with it?**

- **Yes → it is not a tweak. Build the control into the prototype and click it.** Which screen
  is showing, which record is open, whether a mode is on, whether a window is open, which
  settings group is selected, light versus dark when the app has its own switch. A prototype
  is interactive so that navigation and state are exercised the way they will really be
  exercised; moving them into the panel replaces the thing being judged with a remote control
  for it, and the click path — the part most likely to be wrong — never gets looked at.
- **No → it is a tweak.** A dimension or density (panel width, gutter, type step), a colour or
  token, a content volume (0 / 1 / 200 rows), and any state the UI provides no route to: a
  server outage, a rate-limited response, a permission the user has not granted, a date months
  away. These are the cases a prototype otherwise cannot show at all.

A panel crowded with navigation is the symptom. If the panel reads like a table of
contents for the prototype, the controls belong in the prototype.

**You declare the value, not the widget.** The control follows the value's type:

| The value you pass | The control you get |
| --- | --- |
| `true` / `false` | a switch |
| a number **with `max`** | a slider, with the live value beside its label |
| a number with no `max` | a stepper field |
| `'#2f6df6'` | a colour well |
| an array of three or fewer | a segmented picker, side by side |
| an array of four or more | a dropdown |
| any other string | a text field |

```html
<script>
  atTweaks.add('conn', [
    { value: 'up',   label: 'Connected' },
    { value: 'down', label: 'Server unreachable', hint: 'what the list does with no data' }
  ], { label: 'Connection', onChange: function (v) { … } });

  atTweaks.add('gap',   12,        { max: 40, unit: 'px', onChange: function (v) { … } });
  atTweaks.add('dark',  false,     { onChange: function (v) { … } });
  atTweaks.add('brand', '#2f6df6', { onChange: function (v) { … } });
</script>
```

- **Top-level `<script>` only** — never inside a `<template data-variant>`, which is not in the
  document until it is mounted, and whose scripts never execute. This is the one trap in the whole
  contract.
- `onChange(value, key)` runs once at declaration **and again after every mount**, so nothing in your
  fragment re-applies state after a variant switch. Don't write re-apply code.
- The first array entry is the default. `hint` is a second, dimmer line under the option's label.
- `opts`: `label` (defaults to the key), `min`, `max`, `step`, `unit`, `control` to name a widget
  outright, `onChange`.
- `atTweaks.add` returns `{ get(), set(v) }`. `atTweaks.get(key)` and `atTweaks.set(key, v)` reach any
  registered tweak by name — that is how one control drives another.
- `atTweaks.section('Motion')` starts a labelled group; everything registered after it lands there.
  `atTweaks.action('Reset', fn)` is a button, holds no value and never re-fires on mount.
  `atTweaks.toggle/slider/stepper/color/pick/select/text` name a widget when the inference is wrong.
- Tweak state persists in the URL as `?screen=chat&gap=18`, alongside `?v=`. A tweak still at its
  declared default is absent from the URL.

### One file, rebuilt in place

A prototype has **one output file**, and a build replaces it. There are no rounds and nothing is
carried forward: refining is editing the fragment and building again over the top; earlier attempts
are gone, which is what "throwaway" means.

The controls never share a letter:

| | URL | Control |
| --- | --- | --- |
| **Variant** — which direction is on screen | `?v=3` | panel: named buttons |
| **Tweak** — a value of the thing | `?screen=chat` | panel: one control per tweak |
| **The panel itself** — open or a pill | `?tweaks=0` | its `×`, and the pill |

**A prototype answers no harness keys at all.** Every control above is a button. This is not an
oversight to fix: a prototype is a working interface with keys of its own, so a prototype of anything
keyboard-driven could not be driven at all if the harness claimed the keyboard too.

Opening the file bare shows the first variant. An out-of-range `v` falls back rather than blanking.

## `wireframe` — greybox

Structure and hierarchy only. Greys, dashed placeholder frames, labelled regions. No brand colour, no
imagery, no type personality — anything that invites a reaction to the *style* is defeating the point,
which is a yes/no on the *arrangement*.

Classes: `.wf-region` (labelled box), `.wf-label` (caps region name), `.wf-ph` (dashed placeholder),
`.wf-text` (grey text bars, `data-lines="3"`), `.wf-control` (generic input/button block),
`.wf-note` (annotation outside the frame), `.wf-grid` (`data-cols="2|3"`).

## Before handing it over

1. Run the build; a non-zero exit means nothing was written.
2. **Look at it.** `spike shot <slug>`, then open every PNG: one per cell of a mockup, one for a
   wireframe, and for a prototype one per variant (`--query 'v=2'`) and per tweak state
   that matters. When the question is motion, `spike video <slug>` and open each WebP and
   filmstrip PNG too. A path is delivery, not verification — a font falling back, an
   overlap, or a blank variant is invisible in source.
3. **Run the critique pass** — [`CRITIQUE.md`](CRITIQUE.md). One batched round; fix what it finds
   in one batch and stop; it is a pass, not a loop.
4. For a prototype, `open <absolute-path>`, printed on its own line with no trailing punctuation,
   and say how to drive it: every control is a button in the Tweaks card, which closes to a pill.
   **State the concrete result of steps 2 and 3 in the hand-off message** — the printed sentence
   is the artifact, since nothing downstream reads the screenshot or the critique pass otherwise:
   e.g. "Critique: 2 found, 2 fixed."

## Refining

Edit the fragment and re-run the build to the same `--out`. One file per spike — never a new file
per refinement.

## Naming — every shape

A prototype gets **one kebab-case slug naming what it is for**, and the slug is the whole filename: `wheelhouse-phone`, `settings-desktop`, `queue-backend`. Everything for it lives in `/private/tmp/claude/<repo-slug>/spikes/<slug>/`.

**A spike targets exactly one platform, and the slug names it.** A phone design, a desktop design and a TV design are three slugs — never one file switching between them. A platform is an interaction model, not a width: touch, pointer and remote-focus are different designs that happen to share a product, and one file holding all three spends every variant slot on "which platform" instead of on the question the spike exists to answer. A mockup is shot at its platform's size (`spike shot --size`).

**There are no rounds and no versions.** A rebuild replaces the file. Earlier attempts are gone — which is correct, because a prototype is throwaway. `?v=` is the only axis in a prototype's URL, and it means variant.

Rules:

1. **The slug is the whole filename.** Never a word suffix — no `-riff`, `-revised`, `-v2-final`, `-new`, `-alt` — and never a version in the name. "Wheelhouse Nav Riff" is the bug this stops.
2. **Rebuild to the same `--out`.** Refining a prototype is editing the fragment and building again over the top, never a second file.
3. **The artifact title is the topic alone** — `--title "Wheelhouse Phone"`. No version, no adjective.
4. **Say what changed.** When handing back a rebuild, open with one line naming what is different from the last time they looked at it.

Variant names stay descriptive — "Quiet", "Editorial", "Dense". They name directions being compared side by side right now, which is the only thing the picker is for.

## Rules for every shape

1. **The artifact never lives in production files.** Everything is written under `/private/tmp/claude/<repo-slug>/spikes/<slug>/` (gitignored). No new route, no edit to an existing page, no entry added to `package.json`. Nothing in the repo imports it. This is what makes a prototype free: there is nothing to accidentally ship and nothing to clean out of a real file.
   One exception: the throwaway `/__spike/<slug>` route of [UI.md](UI.md) lives in a linked worktree made for the spike, which is never merged or pushed and is discarded when the question is settled.
   Domain exception: a surface that can't be a file (a Roblox Place) uses the scratch surface named in its domain cell, under the same "throwaway, never production" rule.
2. **One command, or one double-click.** UI opens directly in a browser (a worktree route runs on the project's own dev server) — the `spike` build step is agent-side, and what the user gets is still a single self-contained file. Logic and compare run with the project's existing runtime straight off the path — `bun /private/tmp/claude/<repo-slug>/spikes/queue/run.ts` — never by registering a script somewhere real.
3. **No persistence by default.** State is in memory. Persistence is what the prototype is *checking*, not something it depends on. If the question is about a DB, use a scratch file inside the prototype directory.
4. **Skip the polish.** No tests, no error handling beyond what makes it runnable, no abstractions, no "what if we later want".
5. **Surface the state.** After every action (logic), variant switch (UI), or run (compare), show the full relevant state so the user can see what changed.
6. **Realistic content, always.** Product-shaped copy, plausible names and numbers, real-sized data. No lorem ipsum, no `foo`/`bar`, no "imagine this part here".
7. **Every control is live.** Every tab switches, every toggle toggles, every row opens something, every destructive button shows what it would do — the reject path as much as the approve path. A dead control reads as a bug and derails the conversation the prototype exists to have. A control with nowhere to go does not go in.
8. **Name the platform deliberately** (UI shape). Phone, desktop and TV are different designs; decide which this one is before the first line, and never draw device chrome by hand — a status bar, notch or title bar in a fragment is a guess the screenshot then judges.
9. **Promotion is a rewrite.** Variant and spike code was written under these constraints — when a direction wins, implement it properly in the project's stack and conventions, then delete the prototype. Never move the file into the codebase.
10. **Show the result as files.** Give the screenshot files by absolute path, one image per variant and state, side by side where comparing, with the questions and decisions in chat. A prototype that needs interaction is a local file the user opens: name its absolute path. A worktree route has no HTML file, so give its screenshots and name the dev-server URL. `/private/tmp` is emptied after three untouched days and a spike is not kept: the answer is recorded ([LIFECYCLE.md](LIFECYCLE.md)).
11. **Variants diverge on one named axis** — structure, density, emphasis, type, or voice. Secondary
    choices follow from the primary position (a dense variant may take a smaller type step — that's
    coherence, not a second axis). Three variants that differ in accent colour teach nothing, and
    varying every axis at once produces unattributable results: you learn which you liked, not what
    made it work. (Adapted from `jakubkrehel/skills` `variant`, MIT.)
12. **Before handing any build over, run the critique pass** — [`CRITIQUE.md`](CRITIQUE.md).
13. **Every `ui` variant clears the severity floor** in
    [`ref/gui/review.md`](../ref/gui/review.md) — accessible names, keyboard reach, visible
    focus, nothing clipped at 320px, no meaning on colour alone — before it is shown. A
    variant that wins on looks and fails the floor is not a candidate; it's a bug with a nice
    surface. The floor is identical across variants — never an axis, never traded against one.
