# react — injected context

> Derive during render, never sync with an effect. Keys from stable ids.

- **Derive during render instead of syncing with an effect.** An effect that only mirrors
  props into state is the single most common bug source here — it renders once wrong, then
  corrects, and the wrong frame is visible.
- **An effect needs a cleanup and an honest dependency array.** A fetch with no abort and
  a subscription with no teardown both leak.
- **Keys come from stable ids, never array index**, or state follows the wrong row when
  the list reorders.

Depth: [review.md](review.md). Design questions are [../gui/](../gui/); platform concerns
are [../web/](../web/).
