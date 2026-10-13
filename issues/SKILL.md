---
name: issues
description: "Read, create, close or label a tracked item, and the six backlog verbs: `file` a follow-up, `spec` a conversation into tickets, `next` to pick what to work on, `shape` a heap of issues into typed, labelled epics with edges, `iron-out` the items waiting on a person (human beads, decisions, HITL) until each is answered and closed or rewritten AFK-ready, `reconcile` to close beads a merged pull request already shipped. Every repo tracks work in beads — `bd`, never `gh issue` — and git can never tell you whether beads are synced, so git-side signals about `.beads/` are normal. Read before creating, reading, closing or labelling a tracked item."
---

# Issues

**Beads is the assumption, not a finding.** A repo tracks work in `bd` unless
[`_detect.md`](_detect.md) says otherwise. You do not need a label, a marker, or an injected
line to know this — it is true of every repo.

Touching a tracked item at all (create, read, close, label, pick a tracker) starts at
[`REFERENCE.md`](REFERENCE.md): the file map for the tracker cell, the breakdown rule and the
which-tracker rule.

**Every label comes from the repo's `.beads/labels.toml`.** Run `~/.claude/tools/bead-labels list`
before `bd create`, `bd q` or any label write, and pick from what it prints; [`labels.md`](labels.md)
owns the rules. A repo with no file gets its labeling session before its first new bead.

## Verbs

Six verbs route to a sibling file loaded on demand — read that file, not this one, before acting.

| Verb | Does | Loads |
| --- | --- | --- |
| `issues file` | Capture a follow-up item — quick captures and session-end generation (also invoked by `/wrap-up`). Creates only; browsing or picking an item is `issues next`. | [`file.md`](file.md) |
| `issues spec` | Synthesize a spec from conversation, get it approved, slice it into vertical-slice tickets, publish to the tracker. | [`spec.md`](spec.md) |
| `issues next` | Pick the next work item from the tracker and recommend one concrete starting point. | [`next.md`](next.md) |
| `issues shape` | Structure a backlog: type and label every issue from `.beads/labels.toml`, group into epics, infer edges, print the roadmap. Also charts a foggy effort from scratch. | [`shape.md`](shape.md) |
| `issues iron-out` | Resolve every item waiting on a person, one at a time: answer and close questions, rewrite work items until an agent can run them, flag unlabelled ones `human`. | [`iron-out.md`](iron-out.md) |
| `issues reconcile` | Close beads a merged PR already shipped: closes every PR-linked bead whose PR merged, then matches unlinked open beads against merged PRs and closes the matches you accept. Run when an open bead looks done. | [`reconcile.md`](reconcile.md) |

A request to read, create, close or label an item with no verb is [`REFERENCE.md`](REFERENCE.md)
work. A request that names none of these and maps to neither → ask which, in plain chat.

## Shared reference

- [`TICKET-TEMPLATE.md`](TICKET-TEMPLATE.md) — the ticket body shape `spec.md` publishes.
- [`SPEC-TEMPLATE.md`](SPEC-TEMPLATE.md) — the spec shape `spec.md` synthesizes.
- [`OUT-OF-SCOPE.md`](OUT-OF-SCOPE.md) — the rejected-idea format `next.md` and `shape.md` check candidates against.

Every verb resolves the issue backend through [`_detect.md`](_detect.md) before touching a tracker.
