# Subsystem Doc Format

A subsystem doc lives at `docs/<name>.md` (or `docs/architecture/<name>.md` when that opt-in
folder exists). It records a subsystem the project already has — never one that's planned.

## When to propose one

All three must be true:

1. **Crosses a boundary, or is the project's main job** — a process, host, or service
   boundary (a worker talking to a queue, a client and a server, a daemon and its store), or
   the one thing the project mainly does.
2. **Behaviour can't be reconstructed from one file** — a reader has to hold two or more
   files, or a file plus a running process, in their head at once to know what happens.
3. **Has an invariant or ordering a reader would get wrong** — something must stay true, or
   must happen before something else, and guessing gets it wrong in a way that isn't obvious
   from the code alone.

If any one is false, skip it — the code is its own documentation.

**Offer it as a slate row the turn the subsystem is created, or the turn it first meets this
test** — never as a batch audit sweeping the whole tree looking for undocumented subsystems.

## Frontmatter (`applies-to`)

Same glob syntax as [ADR-FORMAT.md](./ADR-FORMAT.md)'s `applies-to`, and read by the same
reverse-map script (`~/.claude/tools/docs-refs.py`) so `docs-refs <path>` surfaces the
subsystem doc alongside governing ADRs and terms:

```md
---
applies-to: ["src/queue/**", "workers/consumer/**"]
---
# Queue Consumer
```

Block-list form also works:

```md
---
applies-to:
  - src/queue/**
  - workers/consumer/**
---
```

A subsystem doc without a clean path mapping (it spans the whole repo, or "the subsystem" is
really the deployment topology) stays unscoped — leave the frontmatter off.

## Body: five questions, then stop

1. **What it is.** One or two sentences — the job this subsystem does and why it exists as a
   separate piece.
2. **What its parts are and who calls whom.** Structure per `show-shape` — the call chain or
   component tree, named nodes, arrows for direction. A diagram (see below) only when the
   subsystem is distributed across processes or hosts; inline pseudocode/prose structure
   otherwise.
3. **What must stay true.** The invariant or ordering from condition 3 above, stated plainly —
   this is the reason the doc exists.
4. **Where the code is.** File and directory paths, so a reader (or an agent) can jump straight
   to the implementation.
5. **How to drive and observe it.** The command that runs it, the log or endpoint that shows
   its state, the test that exercises it.

No length number anywhere — as short as the five answers allow, as long as they need. A
diagram is warranted only when the subsystem is distributed; a single-process subsystem
answers question 2 in prose or pseudocode and skips it.
