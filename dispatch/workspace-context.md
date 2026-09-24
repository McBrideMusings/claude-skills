# dispatch:workspace — injected context

> Implementation here runs as a watched herdr workspace session, never an in-session agent.

- **`implement <issue>` and "dispatch to implement" take the `workspace` target** — one live
  Sonnet `claude` session in the feature worktree, started by `dispatch exec` from inside it.
  Mechanics: `implement/SKILL.md` §The target.
- **The parent bead is the unit.** No slice breakdown is created for the session to work.
- **The worktree is plain git plus the link hook**, never `herdr worktree create`; `dispatch
  exec` opens the workspace.
- **This session plans, then verifies and lands.** It never polls the worker.
