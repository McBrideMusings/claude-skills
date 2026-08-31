# Web UI library picks

A **reference cell, web/React only** — nothing here applies to SwiftUI, Roblox, terminal UI, or any
other surface. Read by `gui` and `implement` when the domain is `gui` and the stack is web, to
answer "what should I use for X" without hand-rolling a component a good library already owns.

Harvested from emilkowalski/skills `pick-ui-library` (MIT, © 2026 Emil Kowalski) — a taste-driven,
deliberately short list, not a survey.

**Staleness warning, applies to every row.** These are picks as of the harvest, and a list like this
rots quietly: a package can go unmaintained while its row here still reads as a recommendation. Before
installing anything from this table, check its last release and open-issue state. If a row is dead,
fix the row.

## How to use this

1. **Identify the task, not the library the user named.** "I need a dropdown" is a UI-primitives task
   (base-ui), even if they asked about something else.
2. **Check what's already installed** — `package.json` first. If the project already uses a listed
   library, use it. If it uses a competitor (react-window instead of Virtuoso), note the difference but
   don't churn the dependency unasked.
3. **Recommend one**, say what it's for in a sentence, and wire it up if that's the request. Don't
   present a menu when the list has an answer.
4. **Say so explicitly when you leave the list.** If the task isn't covered, recommend from general
   knowledge and state that you're off the curated list.

## The list

### UI components & primitives

| Task | Library |
| --- | --- |
| Unstyled, accessible primitives (dialogs, popovers, menus, selects) | [base-ui](https://base-ui.com) |
| Command menus (⌘K palettes) | [cmdk](https://cmdk.paco.me) |
| Toasts / notifications | [Sonner](https://sonner.emilkowal.ski) |
| One-time password / verification code inputs | [input-otp](https://input-otp.rodz.dev) |
| Debug GUIs / control panels | [Leva](https://github.com/pmndrs/leva) (alternative: [dialkit](https://joshpuckett.me/dialkit)) |

### Motion & visuals

| Task | Library |
| --- | --- |
| General animation (springs, layout animations, enter/exit, gestures) | [motion](https://motion.dev) |
| Animating numbers (counters, prices, stats) | [NumberFlow](https://number-flow.barvian.me) |
| Animated text | [torph](https://torph.lochie.me/) |
| 3D globes | [Cobe](https://cobe.vercel.app) |
| Dynamic OG images (HTML/CSS → SVG/PNG) | [Satori](https://github.com/vercel/satori) |
| Syntax highlighting | [shiki](https://shiki.style) |

Reach for `motion` when you need springs, layout animations, exit animations, or gesture-driven
values. A hover or a fade doesn't need it — plain CSS transitions are the right tool, and they're
interruptible by construction.

### Charts

| Task | Library |
| --- | --- |
| Real-time / streaming charts | [Liveline](https://github.com/benjitaylor/liveline) |
| General charts (static or interactive dashboards) | [recharts](https://recharts.org) |

The split: data points arriving live with the chart scrolling in time → Liveline. Everything else →
recharts.

### Interaction & performance

| Task | Library |
| --- | --- |
| Drag and drop | [dnd kit](https://dndkit.com) |
| Virtualization (long lists, large tables) | [Virtuoso](https://virtuoso.dev) |

### State & styling

| Task | Library |
| --- | --- |
| State management | [zustand](https://zustand.docs.pmnd.rs) |
| Conditional `className` strings | [clsx](https://github.com/lukeed/clsx) |
| Type-safe variant styling for Tailwind | [cva](https://cva.style) |
| Theme switching / dark mode with no flash on load | [next-themes](https://github.com/pacocoursey/next-themes) |

The styling split: `clsx` for ad-hoc conditional classes; `cva` when a component has real variants
(size, intent, state) deserving a typed API. They compose — cva takes clsx-style inputs.

## Mismatches to catch

These are objective — a hand-rolled version of a solved problem, not a taste call. `review` and
`gui` critique both flag them:

- **A toast built by hand, or out of a modal library** → Sonner exists for exactly this.
- **A `<div>` dropdown or dialog with manual focus handling** → base-ui: focus trapping, dismissal,
  ARIA, all of it.
- **A number animated by re-rendering text** → NumberFlow handles digit transitions properly.
- **1,000+ rows rendered directly** → Virtuoso, before reaching for pagination as a workaround.
- **A `useState`-per-component web of prop drilling for shared state** → zustand.
- **Template-literal className ternaries three conditions deep** → clsx, or cva if it's variant-shaped.
