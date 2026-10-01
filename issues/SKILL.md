---
name: issues
description: "Read, create, close or label a tracked item, and the four backlog verbs: `file` a follow-up, `spec` a conversation into tickets, `next` to pick what to work on, `shape` a vague backlog into AFK-ready issues. Every repo tracks work in beads — `bd`, never `gh issue` — and git can never tell you whether beads are synced, so git-side signals about `.beads/` are normal. Read before creating, reading, closing or labelling a tracked item."
---

# Issues

**Beads is the assumption, not a finding.** A repo tracks work in `bd` unless
[`_detect.md`](_detect.md) says otherwise. You do not need a label, a marker, or an injected
line to know this — it is true of every repo.

Touching a tracked item at all (create, read, close, label, pick a tracker) starts at
[`REFERENCE.md`](REFERENCE.md): the file map for the tracker cell, the breakdown rule and the
which-tracker rule.

## Verbs

Four verbs route to a sibling file loaded on demand — read that file, not this one, before acting.

| Verb | Does | Loads |
| --- | --- | --- |
| `issues file` | Capture a follow-up item — quick captures and session-end generation (also invoked by `/wrap-up`). Creates only; browsing or picking an item is `issues next`. | [`file.md`](file.md) |
| `issues spec` | Synthesize a spec from conversation, get it approved, slice it into vertical-slice tickets, publish to the tracker. | [`spec.md`](spec.md) |
| `issues next` | Pick the next work item from the tracker and recommend one concrete starting point. | [`next.md`](next.md) |
| `issues shape` | Iron out a backlog's structure and ambiguity: type and label every issue, group into epics, infer edges, drive every issue to AFK-ready. Also charts a foggy effort from scratch. | [`shape.md`](shape.md) |

A request to read, create, close or label an item with no verb is [`REFERENCE.md`](REFERENCE.md)
work. A request that names none of these and maps to neither → ask which, in plain chat.

## Shared reference

- [`TICKET-TEMPLATE.md`](TICKET-TEMPLATE.md) — the ticket body shape `spec.md` publishes.
- [`SPEC-TEMPLATE.md`](SPEC-TEMPLATE.md) — the spec shape `spec.md` synthesizes.
- [`OUT-OF-SCOPE.md`](OUT-OF-SCOPE.md) — the rejected-idea format `next.md` and `shape.md` check candidates against.

Every verb resolves the issue backend through [`_detect.md`](_detect.md) before touching a tracker.
