# States, edges and interface copy

Read by `gui` (critique/audit) and by the engines when the domain is `gui`. The parts of a surface
that only exist when something goes wrong, hasn't happened yet, or is still loading — plus the words
that carry them. Harvested from Impeccable (`pbakaus/impeccable`, Apache-2.0).

**A design that only works with perfect data isn't finished.** Most AI-built interfaces ship the happy
path at full craft and leave the other seven states as browser defaults. That gap is the single most
reliable tell that nobody used the thing.

## The state set — every interactive component

Default · hover · focus · active · disabled · loading · error. Shipping half of these is shipping half
a component. On top of that, every *view* needs empty and permission-denied.

- **Skeletons, not spinners** in the middle of content.
- **Empty states teach the interface**, they don't say "nothing here".
- **Overlays escape their container.** An absolutely positioned dropdown inside an `overflow: hidden`
  or `overflow: auto` ancestor gets clipped — reach for `<dialog>`, the popover API, `position: fixed`,
  or a portal.
- **Prevent double-submission** — disable the control while the request is in flight.

## Five different empty states

Treating them as one is the common error; each wants different words and a different action.

| Kind | What it says |
| --- | --- |
| **First use** | What will appear here, why it matters, one CTA — plus a template or example |
| **User cleared** | Light touch; they meant to do this and know how to undo it |
| **No results** | Suggest a different query or offer to clear the filters |
| **No permission** | Why they can't see it, and how to get access |
| **Failure** | What happened, and retry |

## Errors

An actionable error answers three questions: **what failed**, **why** (when the system genuinely knows),
and **how to recover or what alternative remains**. Never expose an internal code as the primary
message. Never promise a cause the system can't know.

- Validation says what needs attention and how to fix it, without blaming the user, near the field, and
  announced accessibly. Preserve their input.
- Treat privacy, payment, deletion, access loss and blocked work seriously. Warmth is welcome; jokes
  are not.
- Never invent progress. Determinate bars only when progress is actually known.

## Interface copy

- **Labels describe what will happen**, not the gesture. Same noun and verb for the same concept
  everywhere in the product — don't vary words for literary effect in an interface.
- **Destructive actions name the object and the consequence.** Prefer undo over confirmation when
  recovery is safe. When confirmation is genuinely necessary, put the action's own verb on both the
  message and the button — never `Yes` / `No` / `OK` / `Submit`.
- **Placeholders are examples, not labels.** Labels persist. Format and eligibility requirements come
  *before* submission, not as a rejection after it.
- **Helper text answers an implicit question** instead of restating the control. Link text must make
  sense out of context; icon-only controls need accessible names.
- Voice stays constant; tone adapts to the moment.

## Onboarding — the job is first value, not teaching the product

Get the user to the moment that proves this was worth their time. Not a tour of the feature set.

- **Show, don't tell.** Real functionality with real data, not a disconnected tutorial mode.
- **Make it skippable and keep it findable again.** Track dismissals and never show the same hint twice.
- **Empty states are the best onboarding surface** — contextual, at the point of need, no ceremony.
- Teach the 20% that delivers the value; let the rest be discovered contextually.
- 3–7 steps maximum in a tour, interactive, with the product still explorable underneath.

## Internationalization

- **Budget 30–40% extra width for translations** (German runs ~30% longer than English). No fixed
  widths on text containers.
- **Logical properties for RTL**: `margin-inline-start`, `padding-inline`, `border-inline-end` — never
  `-left` / `-right`. Mirror directional glyphs.
- **Write complete translatable messages**, never concatenated fragments; keep variables structured so
  translators can reorder them. Real plural rules, not `count !== 1 ? 's' : ''`.
- `Intl.DateTimeFormat` / `Intl.NumberFormat` for dates, numbers and currency.
- Test with CJK and emoji, not just accented Latin.

## Overflow and boundary conditions

- **`min-width: 0` on flex and grid items** — without it a child refuses to shrink below its content
  size and blows out the row. The most common cause of a layout that breaks only on real data.
- Long text: `text-overflow: ellipsis` for one line, `-webkit-line-clamp` for several, `overflow-wrap:
  break-word` where it should wrap. Decide which, per element.
- **Body text floor is 16px on mobile** — iOS Safari force-zooms a focused input under 16px, which
  breaks the form layout around it. 14px only for genuinely secondary text.
- Test at 200% zoom, with a 100-character name, with 1000+ list items, and with no data at all.
- Large datasets get pagination or virtual scrolling, never a full 10,000-item render.

**Stress scenarios, gated by the component's actual props** (adapted from `jakubkrehel/skills`
`break`, MIT). Run an axis only when its cue matches — the component renders text it doesn't author,
repeats over items, has the state — and name the axes dropped:

- Text: empty string · one word · typical · several sentences · one unbreakable string
  (a long URL, `Donaudampfschiffahrtsgesellschaft`).
- Quantity: zero items · **one item** (grids designed around plural content) · realistic count ·
  ten times the realistic count.
- Container: 320px · **squeezed by a flex/grid sibling** (min-content blowout — the `min-width: 0`
  case above) · very wide (unbounded measure, content pinned to opposite edges).

## Accessibility resilience

Keyboard reaches everything, in a logical order, with focus managed in and out of modals. Dynamic
changes announced via live regions. Never rely on colour, punctuation or an icon alone to carry a
message. Screen-reader names match the visible labels.

## Where this stops

This cell is design-time judgement about *which* states exist and what they say. The code-level checks
— ARIA correctness, focus-trap implementation, network retry logic, memory leaks — belong to the
`review` engine reading `ref-web/` and `ref-apple/`.
