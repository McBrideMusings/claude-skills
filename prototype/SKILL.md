---
name: prototype
description: "Build a throwaway prototype to flesh out a design before committing. Routes between two branches — a runnable terminal app for state/logic questions (LOGIC.md), or several radically different UI variations on one route (UI.md). Triggers: 'prototype this', 'spike this out', 'let me play with it', 'try a few designs', 'sanity check the state machine', 'mock up some variants', 'throwaway prototype'."
---

# Prototype

A prototype is **throwaway code that answers a question**. The question decides the shape.

## Pick a branch

Identify which question is being answered — from the prompt, the surrounding code, or by asking if the user is around:

- **"Does this logic / state model feel right?"** → [LOGIC.md](LOGIC.md). Tiny interactive terminal app that pushes the state machine through cases hard to reason about on paper.
- **"What should this look like?"** → [UI.md](UI.md). Several radically different UI variations on a single route, switchable from a floating bottom bar.

The two branches produce very different artifacts — getting this wrong wastes the whole prototype. If the question is genuinely ambiguous and the user isn't reachable, default to whichever branch matches the surrounding code (backend module → logic; page or component → UI) and state the assumption at the top of the prototype.

## Rules for both branches

1. **Throwaway from day one, clearly marked.** Locate the code close to where it'll actually live (next to the module or page) so context is obvious. Name it so a casual reader can tell it's a prototype, not production.
2. **One command to run.** Whatever the project's existing task runner uses (`npm run X`, `pnpm X`, `bun X`, `python X`, `admin X`). The user starts it without thinking.
3. **No persistence by default.** State is in-memory. Persistence is what the prototype is *checking*, not something it depends on. If the question involves a DB, use a scratch file with "PROTOTYPE — wipe me" in the name.
4. **Skip the polish.** No tests, no error handling beyond what makes it runnable, no abstractions.
5. **Surface the state.** After every action (logic) or variant switch (UI), render the full relevant state so the user can see what changed.
6. **Delete or absorb when done.** Either delete it or fold the validated decision into real code.

## When done

The **answer** is the only thing worth keeping. Capture it somewhere durable (commit message, ADR in `docs/adr/`, GitHub issue, or `NOTES.md` next to the prototype) along with the question it was answering. If the user is around, that capture is a quick conversation. If not, leave the placeholder so the verdict can be filled in before deletion.
