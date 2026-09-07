# Contract — kinds, fragments, class vocabulary

What you write is a **body fragment**: real content, nothing else. No `<!DOCTYPE>`, no `<html>`, no
`<head>`, no reset, no theme block, no type scale, no picker. The tool supplies all of that.

## Invoke

```bash
"$HOME/.claude/skills/spike/tool/spike" build \
  --kind prototype \
  --title "Wheelhouse nav" \
  --fragment /private/tmp/claude/<repo-slug>/spikes/wheelhouse-nav.body.html \
  --out /private/tmp/claude/<repo-slug>/spikes/wheelhouse-nav.html
```

**Decide which device this prototype is for.** `--device` is required on `prototype`, takes
exactly one value, and has no default. It is the first thing to settle, because it decides
the slug as well as the frame: a design that ships on a phone and on a desktop is two
prototypes, not one file with a switcher.

`spike kinds` lists the kinds and their flags. `spike` carries `serve <path>` as a
contingency that shells to `python3 -m http.server`; you almost never need it — `file://` runs
inline modules and blob workers fine, and a hermetic folio never calls `fetch`.

**Every path absolute.** Resolve the repo root in its own Bash call (`git rev-parse --show-toplevel`,
falling back to absolute `pwd`) and build `/private/tmp/claude/<repo-slug>/…` from it. A path that doesn't start with
`/` is the bug.

## The two kinds

| Kind | For | Palette |
|---|---|---|
| `prototype` | Several genuinely different working versions of one UI | **None** — your fragment carries the host project's tokens |
| `wireframe` | Greybox layout: structure and hierarchy only | **Withheld on purpose** — do not add colour |

Pick by what the thing you're building *is*. Explaining a mechanism, system or decision is a
different tool (`explainer`) and a different kind entirely — it has no picker, no tweaks, no device
frames, and none of what follows applies to it.

## Fragment rules

- Plain HTML. It may include its own `<style>` and `<script>`; the tool hoists them into the single
  output file, so the result stays hermetic.
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
- Reach for Canvas over long hand-written SVG path data when graphics turn generative.

## `_base.css` — available in every kind

Tokens on `:root`, reassigned for `prefers-color-scheme: dark`, then again under
`:root[data-theme="dark"]` / `:root[data-theme="light"]` so an explicit toggle wins both ways. Consume
tokens; never hardcode a hex in markup.

```
--f-3xl --f-2xl --f-xl --f-lg --f-md --f-sm  type scale (root is 17px, so 1rem = 17px)
--s-1 … --s-7                                spacing scale (--s-7 is the section step)
--radius --maxw --maxw-wide
--font-sans --font-mono
--bg --surface --ink --ink-soft --line --c-muted --c-accent
```

`--f-3xl` is the display step: one per folio, on the title, never on a section heading.

Utilities: `.scroll-x` (overflow container), `.stack` (vertical flex + gap), `.row` (horizontal flex +
gap), `.nums` (tabular numerals — the same class name on a `<td>` also right-aligns it), `.vh`
(visually hidden). Focus rings, `prefers-reduced-motion`, text selection, the caret, scrollbars and
link underline offset are already themed — don't re-declare them.

`prototype` and `wireframe` take the full viewport — neither uses the measure grid, so nothing here
about breaking prose out to a wide track applies to them.

**Never a coloured `border-left` thicker than 1px** on a callout, card, list item or alert. It is the
most recognisable machine-made accent there is. Every kind's stylesheet has been cleared of them;
don't reintroduce one in a fragment.

## `prototype` — variants, tweaks and devices, behind one panel

Build with `--picker switch` (one at a time, full size — the default) or `--picker list` (each stacked
full size, one per screenful). **Never a grid of thumbnails**: small side-by-side comparison distorts
spacing and scale, and judging UI at postage-stamp size is the failure the picker exists to prevent.

Everything lives in **one floating card** with three tabs:

| Tab | What is in it |
| --- | --- |
| **Tweaks** | variant, every tweak the fragment registers, and the device readout — all the same question, *what am I looking at*, ordered coarse to fine |
| **Checks** | the eight standing verdicts, below |
| **Comments** | the review layer's list, and **Copy comments** |

Between the header and the tabs is a **meta strip**: which frame this is, how far it is scaled, and
when the file was built. Facts about the folio rather than things you change, so they stay on screen
whichever tab is up.

**The Comments tab is the review mode.** Opening it turns the comment layer on and leaving it turns
the layer off — there is no separate button, because two controls for one state is how the button
ended up saying "on" while its list was two tabs away.

Drag the card by its header; `×` closes it to a **Tweaks** pill in the corner, and the pill opens it
again (`?tweaks=0` remembers which). The tool generates the card, the tabs, the meta strip, the
widgets and the URL persistence. **Write no panel code and no widget markup.**

The tabs deliberately do not look like the segmented control a fragment declares — they run full
bleed on a recessed band, and the live one is marked by a rule rather than a pill. The row that never
changes and the row that changes per prototype must not read as two instances of one thing.

```html
<style>
  /* the host project's tokens, copied — not imported */
  :root { --brand: #2f6df6; --radius-card: 10px; }
</style>

<template data-variant="Quiet" data-caption="Minimal motion, borders over shadows">
  <div class="proto-frame">…the variant, in realistic surrounding context…</div>
</template>

<template data-variant="Editorial" data-caption="Large type, generous whitespace">
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
- `data-caption` is optional; `list` mode prints it under the heading. It is not a control and never
  reaches the panel.
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

A panel crowded with navigation is the symptom. If the Tweaks tab reads like a table of
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
- `atTweaks.note('<b>…</b> …')` pins arbitrary non-interactive prose under the controls. **Almost
  never the right answer.** It is for something a reader cannot work out from the screen and would
  otherwise get wrong — not a standing "Scope" section every prototype carries. If the sentence
  restates what the design already shows, cut it.
- Every change also dispatches `at:tweak` on `window` with `{key, value}`, for anything that would
  rather listen than pass a handler.
- Tweak state persists in the URL as `?screen=chat&gap=18`, alongside `?v=`.

### The device — one per prototype, required, chosen at build time

`--device phone|tablet|desktop|panel|web|tv|fill`. Exactly one, and the tool refuses a build without
it. A phone-only chat surface gets `phone`. A pane-tree editor gets `desktop`. A design that ships on
iOS *and* as a Mac menu bar extra is two prototypes, `--device phone` and `--device panel`, each named
for what it is.

There is no switcher. A row of frames invited the reader to judge a phone layout against a desktop
layout as if they were two directions for one design, which is the comparison the harness exists to
prevent. The panel's device group is the frame's name plus the size readout, rotate, and 1:1.

`fill` is the one device that frames nothing: the folio renders straight into the browser window at
whatever size it happens to be, and the device group is a live size readout. It is a real answer to
"which device is this for" — a page that is whatever the reader's window is — and it is **not** the
answer for a desktop app. A desktop app is a window; that is `desktop`.

Chrome sits on whichever side of the viewport it really sits on, and the harness draws all of it:

| Frame | Chrome | Where |
| --- | --- | --- |
| `phone`, `tablet` | status bar, notch, home indicator | **inside** the viewport — content scrolls under it |
| `desktop` | title bar + traffic lights by default; `--window` changes it | see below |
| `panel` | menu bar strip with the status item lit | **outside** — the panel hangs from it |
| `web` | tab strip + URL bar | **outside** |
| `tv` | none drawn; tvOS overscan published as `--at-safe-*` | inset only |
| `fill` | none — no frame and no bezel, the window itself | — |

`panel` is 380×520 — a menu bar extra, not a small window. It has no title bar, no traffic lights and
no resize, so `--window` is refused against it; the width is the whole design constraint, which is
exactly what a 1440-wide `desktop` frame would hide.

### `--window` — what kind of window the desktop frame is

A build-time decision, like `--device`, and for the same reason: whether the design owns its own
title area is a property of the thing being prototyped, not something to flip while looking at it.
**The default is the standard macOS window** — `bar,lights`. A desktop app *is* a window, and a frame
with no title bar at all was the shape of a full-screen viewport, which is what `fill` is for.

| `--window` | What you get | Where the chrome sits |
| --- | --- | --- |
| *(omitted)* | `bar,lights` — the standard macOS window | **outside** the viewport |
| `bar` | title bar, no lights | **outside** the viewport |
| `lights` | full-size content view: lights float over the app's own top area | **inside** the viewport |
| `none` | bare viewport, bezel only. On its own, never beside another part | — |

`--window lights` is the only one that reaches into the viewport, so it is the only one your layout
has to know about. It reserves nothing — drawing under the lights is the entire point of that window
style — and publishes `--at-lights-w` (78px) and `--at-lights-h` (28px) so a layout that wants to
keep its own controls clear of them can. `--window` is refused unless `--device` is `desktop`.

### `--backdrop` — a fake desktop behind a macOS frame

`--backdrop none|desktop|desktop-bare`, valid only on `--device desktop` and `--device
panel`. Default `none`: the host's own neutral ground, which is the right answer for an
opaque app, where a wallpaper is scenery competing with the design.

It stops being scenery the moment the design is **translucent**. Glass, a vibrancy
material, a floating utility panel — what they look like IS what shows through them, so
judging one over a flat colour is judging a different design. Reach for it exactly then.

| Value | What is drawn |
| --- | --- |
| `none` | nothing. The default |
| `desktop` | wallpaper, menu bar, and one inactive window behind the frame |
| `desktop-bare` | the same wallpaper and menu bar, no window behind |

Three things it changes:

- **The frame becomes the screen, not the window.** Your fragment draws its own app
  window positioned on it — which is what a floating panel is anyway. The harness owns
  the wallpaper, the menu bar and the drag behaviour; never hand-draw any of them.
- **The harness draws your window's chrome.** Mark your window element
  `data-at-win="Title"` and it gets the 28px macOS title bar, the traffic lights, the
  radius, the shadow and the drag — never hand-draw any of them. Add
  `data-at-win-controls="close"` for a `[.titled, .closable]` window, which draws
  minimize and zoom greyed rather than leaving them out. The bar is the window's first
  child and `flex: none`, so a column layout keeps its own scrolling middle. Content that
  is **absolutely positioned** inside the window does not flow below the bar on its own —
  it renders straight over it, which looks exactly like no bar was drawn. Reserve it with
  the published `--at-win-bar`: `top: var(--at-win-bar, 0px)`.
- **Every window is draggable.** `data-at-win` implies it; mark anything else
  `data-at-drag` and the harness wires it,
  including windows a variant only draws later. Controls inside it keep working: a drag
  never starts from a `button`, `a`, `input`, `select`, `textarea`, `[contenteditable]`
  or `[role="checkbox"]`. The cursor affordance comes with it, so style nothing.
- **Position windows with `left`/`top`, never a `transform`.** A drag begins by writing
  the window's measured `left`/`top` back onto it, so a `translate(-50%, -50%)` centring
  trick is still applied on top of the new coordinates and the window jumps by half its
  own size the moment it is grabbed. Give it pixel or percent `left`/`top` and a size.
- **A `panel` frame's menu bar moves to the screen.** It normally hangs from a strip
  glued to its own shell; with a screen behind it, it hangs off the screen's bar
  instead — which is where a real menu bar extra hangs.

The desk layer is injected **inside** the frame document, deliberately. A design cannot
`backdrop-filter` through an iframe boundary — the filter samples the frame's own
document and nothing past it — so a wallpaper drawn outside would blur to flat grey,
which is the one thing this flag exists to prevent.

The device readout gains a **&#9788;** button flipping the wallpaper between light and
dark, persisted as `?desk=light`. That is the wallpaper's tone, not the folio's theme: a
light app on a dark desktop is a real combination, and for a translucent design it is a
different design.

Never draw your own status bar or window chrome in the fragment. Reserve the space instead: the frame
publishes `--at-safe-top` and `--at-safe-bottom`, and pads `body` by them automatically. Set
`data-at-safe="none"` on your root element if your layout wants to paint under the status bar itself.

A frame larger than the window is scaled down to fit, and the panel says by how much — `1440 × 900 ·
67%`. Nobody can judge type or spacing at 67%, so `1:1` turns scaling off and lets the page scroll to
the rest of the frame instead. Flipping a variant or a tweak does **not** rebuild the frame: it is
told what changed and applies it in place, so scroll position, typed input and whatever state the
prototype holds all survive. Only changing orientation rebuilds it.

Each frame is a real `<iframe>`, so `@media (max-width: 640px)` fires inside it for real — which a
width-constrained `<div>` can never do, and is why device frames are the harness's job.

### One file, rebuilt in place

A prototype has **one output file**, and a build replaces it:

```bash
"$HOME/.claude/skills/spike/tool/spike" build --kind prototype --picker switch \
  --title "Branches Pane" \
  --fragment /private/tmp/claude/<repo-slug>/spikes/branches-pane/branches-pane.body.html \
  --out /private/tmp/claude/<repo-slug>/spikes/branches-pane/branches-pane.html
```

There are no rounds and nothing is carried forward. Refining is editing the fragment and building
again over the top; earlier attempts live in git if the file is committed, and nowhere if it is not,
which is what "throwaway" means. Keeping every attempt inside the artifact doubled its size and left
stale designs one click away from the current one.

The controls never share a letter:

| | URL | Control |
| --- | --- | --- |
| **Variant** — which direction is on screen | `?v=3` | panel: named buttons |
| **Tweak** — a value of the thing | `?screen=chat` | panel: one control per tweak |
| **Frame** — rotation and 1:1 | `?rotate=1&zoom=1` | panel: the device readout |
| **The panel itself** — open or a pill | `?tweaks=0` | its `×`, and the pill |

**A prototype answers no harness keys at all.** Every control above is a button. This is not an
oversight to fix: a prototype is a working interface with keys of its own, so a prototype of anything
keyboard-driven could not be driven at all if the harness claimed the keyboard too. `wireframe` is a
document and still answers `a` and `c`.

### Checks — eight verdicts the panel keeps up to date

The Checks tab carries a standing pass/fail row per check, recomputed whenever the folio
changes and read from the device frame's document when one is up. Click a row for what it found.
Nothing here is a judgement call — every one is arithmetic on the DOM:

| Check | What fails it |
|---|---|
| Contrast | text under 4.5:1, or 3:1 at large sizes (WCAG 2.1 SC 1.4.3) |
| Overflow | anything pushing the stage sideways |
| Tap targets | interactive elements under 24×24 (WCAG 2.2 SC 2.5.8); links inline in a sentence are exempt, as that rule allows |
| Text size | text under 12px — a **house floor**, not a standard: WCAG sets no minimum size |
| Dead links | `href="#"`, `href=""`, or no `href`. A button whose handler does nothing is not detectable from here |
| Image alt | an `<img>` with no `alt` attribute at all |
| Duplicate ids | one id used twice, which breaks `<label for>` and every aria reference |
| Hermetic | a remote `src` or `@import`. The builder already refuses these, so this is a backstop for anything injected at runtime |

Harness chrome is excluded from all of them — the panel is not the design under review.
`window.atContrast.check(true)` audits the chrome itself when that is what you need.

The Tweaks tab is ordered coarse to fine, so the thing you change once a session sits above the thing
you change a hundred times. The variant group is omitted entirely when there is only one variant.

Opening the file bare shows the first variant. An out-of-range `v` falls back rather than blanking,
and the URL is rewritten to what is actually on screen.

## `wireframe` — greybox

Structure and hierarchy only. Greys, dashed placeholder frames, labelled regions. No brand colour, no
imagery, no type personality — anything that invites a reaction to the *style* is defeating the point,
which is a yes/no on the *arrangement*.

Classes: `.wf-region` (labelled box), `.wf-label` (caps region name), `.wf-ph` (dashed placeholder),
`.wf-text` (grey text bars, `data-lines="3"`), `.wf-control` (generic input/button block),
`.wf-note` (annotation outside the frame).

## Before handing it over

1. Run the build; a non-zero exit means nothing was written.
2. **Screenshot it and look at it.** Every variant for a picker, both themes if
   it themes. A path is delivery, not verification — a font falling back, an overlap, or a blank
   variant is invisible in source.
3. **Run the critique pass** — [`CRITIQUE.md`](CRITIQUE.md). One batched round: the folio's own
   contrast check in both themes, then the screenshot read against a fixed list. Fix what it finds in
   one batch and stop; it is a pass, not a loop.
4. `open <absolute-path>`, printed on its own line with no trailing punctuation.
5. Say how to drive it. On a **prototype**: every control is a button — the floating card, dragged by
   its header and closed to a pill with `×`, with Tweaks, Checks and Comments behind its three tabs,
   and the Comments tab is what turns the review layer on. No keys, so the prototype's own keyboard is
   entirely its own. On `wireframe`: `a` to comment on anything, `c` to check contrast.
   **State the concrete result of steps 2 and 3 in the hand-off message** — the printed sentence is
   the artifact, since nothing downstream reads the screenshot or the critique pass otherwise: e.g.
   "Contrast: pass, both themes. Critique: 2 found, 2 fixed."

## Getting comments back

Every folio carries the annotate widget — the Comments tab on a prototype, `a` and a docked
speech-bubble button on a `wireframe`, which has no panel. Turning it on makes the page a review
surface: click
any element, type what is wrong with it, and the comment is pinned to that element with a number.
Comments survive reload, and survive a rebuild — a pin reattaches by the fragment line it was made
against, falls back to matching the element's text (flagged `MOVED`), and is kept and flagged `STALE`
rather than dropped when the element is gone.

One way out of the browser: **Copy comments** puts the whole set on the clipboard as markdown.

**The clipboard is a channel back to you, with no server and no file.** The markdown opens with
`<!-- folio-feedback: <slug> -->`, so you can wait on the clipboard instead of asking whether
they're done. After `open`, start a bounded watcher in the background; the harness re-invokes you
when it exits:

```bash
for i in $(seq 1 900); do
  pbpaste 2>/dev/null | head -1 | grep -q 'folio-feedback: <slug>' && break
  sleep 2
done
pbpaste
```

Say you are doing this, because polling `pbpaste` reads whatever else they copy in the meantime.
When that is not wanted, just ask them to paste it — the button is right there and the folio
needs nothing from you.

Each comment names a line of the **fragment**, not of the built folio. Edit the fragment and
rebuild to the same `--out`; do not hand-edit the HTML.

## Refining

Edit the fragment and re-run the build to the same `--out`. One file per folio — never a new file
per refinement.

## One prototype, one device type

**A prototype targets exactly one device type, and the file is named for it.** A phone design, a desktop design and a TV design are three files, three slugs, three `--device` values — never one file switching between them.

```
/private/tmp/claude/<repo-slug>/spikes/wheelhouse-phone/wheelhouse-phone.html    --device phone
/private/tmp/claude/<repo-slug>/spikes/wheelhouse-desktop/wheelhouse-desktop.html --device desktop
/private/tmp/claude/<repo-slug>/spikes/wheelhouse-tv/wheelhouse-tv.html           --device tv
```

Why: a platform is an interaction model, not a width. Touch, pointer and remote-focus are different designs that happen to share a product, and one file holding all three spends every variant slot on "which platform" instead of on the question the prototype exists to answer. It also makes each file three times the size, and two thirds of it is always irrelevant to what is being looked at.

**`--device` takes one value and is required.** There is no list and no switcher — the harness builds that one frame and the panel's device group carries only the size readout, rotate and 1:1. `fill` is a device like any other: the window itself, unframed, for a design that is a page rather than an app. Rotation is not a second device: the `phone` and `tablet` frames rotate, and landscape is that frame's own control. A design that ships on a phone and a tablet is two builds, judged separately.

## Naming — every shape

A prototype gets **one kebab-case slug naming what it is for**, and the slug is the whole filename: `wheelhouse-phone`, `settings-desktop`, `queue-backend`. Everything for it lives in `/private/tmp/claude/<repo-slug>/spikes/<slug>/`.

**There are no rounds and no versions.** A rebuild replaces the file. Earlier attempts live in git if the file is committed, and nowhere if it is not — which is correct, because a prototype is throwaway. `?v=` is the only axis in the URL, and it means variant.

Rules:

1. **The slug is the whole filename.** Never a word suffix — no `-riff`, `-revised`, `-v2-final`, `-new`, `-alt` — and never a version in the name. "Wheelhouse Nav Riff" is the bug this stops.
2. **Rebuild to the same `--out`.** Refining a prototype is editing the fragment and building again over the top, never a second file.
3. **The artifact title is the topic alone** — `--title "Wheelhouse Phone"`. No version, no adjective.
4. **Say what changed.** When handing back a rebuild, open with one line naming what is different from the last time they looked at it.

Variant names stay descriptive — "Quiet", "Editorial", "Dense". They name directions being compared side by side right now, which is the only thing the picker is for.

## Rules for every shape

1. **The artifact never lives in production files.** Everything is written under `/private/tmp/claude/<repo-slug>/spikes/<slug>/` (gitignored). No new route, no edit to an existing page, no entry added to `package.json`, no committed task-runner entry. Nothing in the repo imports it. This is what makes a prototype free: there is nothing to accidentally ship and nothing to clean out of a real file.
   Domain exception: a surface that can't be a file (a Roblox Place) uses the scratch surface named in its domain cell, under the same "throwaway, never production" rule.
   `admin.toml` is the one carve-out, and only because it is globally gitignored and committed nowhere — see rule 10. A `package.json` script is still forbidden; that file ships.
2. **One command, or one double-click.** UI opens directly in a browser — the `spike` build step is agent-side, and what the user gets is still a single self-contained file. Logic and compare run with the project's existing runtime straight off the path — `bun /private/tmp/claude/<repo-slug>/spikes/queue/run.ts` — never by registering a script somewhere real.
3. **No persistence by default.** State is in memory. Persistence is what the prototype is *checking*, not something it depends on. If the question is about a DB, use a scratch file inside the prototype directory.
4. **Skip the polish.** No tests, no error handling beyond what makes it runnable, no abstractions, no "what if we later want".
5. **Surface the state.** After every action (logic), variant switch (UI), or run (compare), show the full relevant state so the user can see what changed.
6. **Realistic content, always.** Product-shaped copy, plausible names and numbers, real-sized data. No lorem ipsum, no `foo`/`bar`, no "imagine this part here".
7. **Every control is live.** Every tab switches, every toggle toggles, every row opens something, every destructive button shows what it would do — the reject path as much as the approve path. A dead control reads as a bug and derails the conversation the prototype exists to have. A control with nowhere to go does not go in.
8. **Name the device deliberately** (UI shape). `--device` is a judgement about this design, made fresh each time: `phone` for a phone surface, `desktop` for a desktop one, `tv` for a ten-foot one. It is required, so there is no default to accept — and never draw device chrome by hand, since the harness owns the status bar, notch, window title bar and browser chrome.
9. **Promotion is a rewrite.** Variant and spike code was written under these constraints — when a direction wins, implement it properly in the project's stack and conventions, then delete the prototype. Never move the file into the codebase.
10. **Wire an `admin prototype` action in the same pass that builds it**, on any project with an
    `admin.toml`, without asking — the manifest is committed nowhere, so it is never a commit
    question. One `prototype` command, one sub-target per prototype, named for the slug; delete
    the sub-target when the prototype goes. A prototype nobody can open is a prototype nobody
    looks at. **The shape, the two silent traps, and how to verify it: [ADMIN.md](ADMIN.md).**
11. **Variants diverge on one named axis** — structure, density, emphasis, type, or voice. Secondary
    choices follow from the primary position (a dense variant may take a smaller type step — that's
    coherence, not a second axis). Three variants that differ in accent colour teach nothing, and
    varying every axis at once produces unattributable results: you learn which you liked, not what
    made it work. (Adapted from `jakubkrehel/skills` `variant`, MIT.)
12. **Before handing any build over, run the critique pass** — [`CRITIQUE.md`](CRITIQUE.md).
13. **Every `ui` variant clears the severity floor** in
    [`ref-gui/review.md`](../ref-gui/review.md) — accessible names, keyboard reach, visible
    focus, nothing clipped at 320px, no meaning on colour alone — before it enters the picker. A
    variant that wins on looks and fails the floor is not a candidate; it's a bug with a nice
    surface. The floor is identical across variants — never an axis, never traded against one.

