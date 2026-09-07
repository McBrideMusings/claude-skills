---
name: backlog
description: "Front door for backlog work: file a follow-up, synthesize a spec and cut tickets, pick what's next, or shape a vague backlog into AFK-ready issues. Verbs: `file`, `spec`, `next`, `shape`. Routes to a sibling file loaded on demand — this entry carries no procedure of its own."
---

# Backlog

Four verbs, one front door. Each routes to a sibling file loaded on demand — read that file, not this one, before acting.

| Verb | Does | Loads |
| --- | --- | --- |
| `backlog file` | Capture a follow-up item — quick captures and session-end generation (also invoked by `/wrap-up`). Creates only; browsing or picking an item is `backlog next`. | [`file.md`](file.md) |
| `backlog spec` | Synthesize a spec from conversation, get it approved, slice it into vertical-slice tickets, publish to the tracker. | [`spec.md`](spec.md) |
| `backlog next` | Pick the next work item from the tracker and recommend one concrete starting point. | [`next.md`](next.md) |
| `backlog shape` | Iron out a backlog's structure and ambiguity: type and label every issue, group into epics, infer edges, drive every issue to AFK-ready. Also charts a foggy effort from scratch. | [`shape.md`](shape.md) |

No verb named, or the request doesn't map cleanly to one of the four → ask which, in plain chat.

## Shared reference

- [`TICKET-TEMPLATE.md`](TICKET-TEMPLATE.md) — the ticket body shape `spec.md` publishes.
- [`SPEC-TEMPLATE.md`](SPEC-TEMPLATE.md) — the spec shape `spec.md` synthesizes.
- [`OUT-OF-SCOPE.md`](OUT-OF-SCOPE.md) — the rejected-idea format `next.md` and `shape.md` check candidates against.

Every verb resolves the issue backend by invoking [`../issues`](../issues/SKILL.md) before touching a tracker.
