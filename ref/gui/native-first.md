# Native components first

Applies to every GUI surface and every UI library — SwiftUI, React Native, React on the
web, Flutter, Qt, GTK, Roblox, a design system in a monorepo. `libraries.md` answers
"which package for X" on web/React; this is the prior question, and it is universal:
**use the component the environment already ships before writing one.**

> Build UI out of the components the library and platform already ship. A custom
> component is what you write when the built-in one cannot do the job.

## Why this is a rule and not a preference

A built-in component is not merely "already written". It carries behavior that is
invisible until it is missing, and that nobody budgets time to rebuild:

- **Gestures and physics** — drag-to-dismiss, rubber-banding, momentum, snap detents,
  edge-swipe back.
- **Accessibility** — the platform's own focus order, screen-reader roles, escape/dismiss
  semantics, Dynamic Type and reduced-motion honoring.
- **Platform conventions that change under you** — a new OS release restyles its own
  controls; a hand-rolled copy is frozen at the day it was written and starts looking
  wrong without anyone touching it.
- **Correctness at the edges** — keyboard avoidance, safe areas, RTL, split-screen,
  external keyboards, dark mode.

A hand-built version usually reproduces the *look* in an afternoon and none of the above,
which is why it reads as finished and is not.

## The check, before writing any component

1. **Name what the thing is in platform vocabulary** — a sheet, a popover, a picker, a
   segmented control, an action sheet, a nav bar, a tab bar, a disclosure row, a stepper.
   The generic name is what the built-in is filed under.
2. **Go read what is installed, not what you remember.** Types and source in the project's
   own dependency tree — a library's own type definitions are the authority on what it
   supports, and they routinely expose far more of the platform than the package name
   suggests. Version matters: a control added two minors ago will not be in your memory.
3. **Count the transitive dependencies too.** The thing you need is often already in the
   tree because something else pulled it in, which makes using it free.
4. Only if nothing fits: write the custom one, and say in the code why the built-in did
   not work.

**"I already started building it" is not a reason to continue.** Discovering the built-in
halfway through is the check working, not a sunk cost.

## When the design is what forces the custom path

Sometimes the built-in does the job except for one detail of the design — a header laid
out differently, a corner radius, a control in a place the platform does not put it.

**Judge whether that detail is load-bearing.** Load-bearing means the design fails at its
purpose without it: it carries meaning, it is the product's identity, or the interaction
does not work otherwise. Not load-bearing means it is incidental — a placement, a shape,
a spacing that no one would miss and nothing depends on.

- **Load-bearing → build the custom component**, and record which part of the design
  required it.
- **Not load-bearing → propose the redesign and wait.** Say which built-in you would use,
  exactly what changes visually, and what is gained. Do not silently hand-roll to preserve
  an incidental detail, and do not silently drop the detail either — it is the designer's
  call, not yours.

State the tradeoff in one line when you propose it: *"Using the platform sheet moves the
Done/Title/+ bar into the system nav bar — same three controls, system spacing — and gets
drag-to-dismiss and detents for free."*

## Mismatches to catch

Objective, not taste — `review` and `gui critique` flag these:

- A modal, sheet, drawer, or dialog assembled from a generic container plus a hand-drawn
  scrim, grabber, corner radius and slide animation, when the framework exposes the
  platform's presentation controller.
- A nav bar, toolbar, or tab bar drawn as a row of views inside the screen, when the
  navigator owns one.
- A hand-rolled picker, date picker, segmented control, switch, stepper, or refresh
  control.
- A scrolling list built on a plain scroll container when the platform has a recycling
  list, once the row count can grow.
- Re-implementing a gesture the platform already binds — swipe-to-dismiss, swipe-to-delete,
  pull-to-refresh, edge-swipe back.
- A component whose file is mostly styles reproducing a system control's appearance.
