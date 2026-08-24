# gui — injected context

> Design all states: empty, loading, error, partial. Colour never carries meaning alone.

Graphical interfaces — desktop, web, and mobile. The design principles are shared across
all three; the platform label says where it ships. Terminal interfaces are [../tui/](../tui/),
a sibling, and most of this does not apply there.

- **Every state gets designed, not just the happy one** — empty, loading, error, partial,
  too-much-content, and the one-item case.
- **Never let colour alone carry meaning.** Pair it with text, shape, or position.
- **Interactive targets need a visible affordance and a focus ring**; keyboard reachability
  is not optional.

Depth: [design.md](design.md), [states.md](states.md), [slop.md](slop.md),
[direction.md](direction.md), [alt-text.md](alt-text.md), [vocabulary.md](vocabulary.md).
