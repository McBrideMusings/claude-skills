# Logic Prototype

A tiny interactive terminal app that lets the user drive a state model by hand. For questions about **business logic, state transitions, or data shape** — the kind that looks reasonable on paper but only feels wrong once you push real cases through.

## When this is the right shape

- "I'm not sure if this state machine handles the case where X then Y."
- "Does this data model actually let me represent..."
- "I want to feel out what the API should look like before writing it."
- Anything where the user wants to **press buttons and watch state change.**

If the question is "what should this look like" — wrong branch. Use [UI.md](UI.md).

## Process

### Phase 01 — State the Question

Before writing code, write down the state model and the question. One paragraph, top of the prototype's README or comment. A logic prototype that answers the wrong question is pure waste.

### Phase 02 — Pick the Language

Use whatever the host project uses. Don't add a new runtime or package manager just for the prototype.

### Phase 03 — Isolate the Logic in a Portable Module

Put the bit that's answering the question behind a small, pure interface that could be lifted out and dropped into the real codebase later. The TUI is throwaway; the logic module shouldn't be.

Shape options:

- **Pure reducer** — `(state, action) => state`. Good when actions are discrete events.
- **State machine** — explicit states and transitions. Good when "which actions are even legal right now" is part of the question.
- **Set of pure functions** over a plain data type. Good when there's no implicit current state, just transformations.
- **Class/module with a clear method surface** when the logic genuinely owns ongoing internal state.

Pick the shape that fits the question, not whichever's easiest to wire to a TUI. Keep it pure: no I/O, no terminal code, no `console.log` for control flow. The TUI imports it; nothing flows back.

### Phase 04 — Build the Smallest TUI That Exposes the State

Lightweight TUI — on every tick, clear the screen (`console.clear()` / `print("\033[2J\033[H")` / equivalent) and re-render the whole frame. One stable view, not an ever-growing scrollback.

Each frame has two parts:

1. **Current state**, pretty-printed and diff-friendly (one field per line, or formatted JSON). Bold field names, dim less-important context (timestamps, IDs, derived values). Native ANSI escapes are fine (`\x1b[1m` bold, `\x1b[2m` dim, `\x1b[0m` reset).
2. **Keyboard shortcuts** at the bottom: `[a] add user  [d] delete user  [t] tick clock  [q] quit`.

Behaviour:

1. **Initialise state** — a single in-memory object/struct. Render the first frame on start.
2. **Read one keystroke (or line)** at a time, dispatch to a handler that mutates state.
3. **Re-render** the full frame after every action — don't append, replace.
4. **Loop until quit.**

The whole frame fits one screen.

### Phase 05 — Make It Runnable in One Command

Add a script to the project's task runner (`admin.toml`, `package.json` scripts, `Makefile`, `justfile`, `pyproject.toml`). User should run `./admin <prototype-name>` or equivalent — never need to remember a path.

### Phase 06 — Hand It Over

Give the user the run command. They'll drive it themselves. The interesting moments are "wait, that shouldn't be possible" or "huh, I assumed X would be different" — those are bugs in the *idea*, which is the whole point.

### Phase 07 — Capture the Answer

When the prototype has done its job, the answer is the only thing worth keeping. Ask the user, or leave a `NOTES.md` next to the prototype if running AFK.

## Anti-patterns

- **Don't add tests.** A prototype that needs tests is no longer a prototype.
- **Don't wire it to the real database.** In-memory store unless the question is specifically about persistence.
- **Don't generalise.** No "what if we wanted to support X later." The prototype answers one question.
- **Don't blur the logic and TUI together.** If the reducer / state machine references `console.log`, prompts, or escape codes, it's no longer portable.
- **Don't ship the TUI shell to production.** The shell is throwaway; the logic module behind it is what's worth keeping.
