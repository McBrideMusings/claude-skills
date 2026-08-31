---
name: ref-api
description: API contracts — versioning, idempotency, pagination, error shapes, breaking changes. Load before designing, changing or reviewing an HTTP or RPC interface.
---

# API knowledge

| Open | When |
| --- | --- |
| [`../_domains/api/context.md`](../_domains/api/context.md) | The core rules: never break userspace, idempotency key on every action, cursor pagination over offset. |
| [`../_domains/api/design.md`](../_domains/api/design.md) | Designing a new endpoint or reshaping an existing contract. |
| [`../_domains/api/review.md`](../_domains/api/review.md) | Reviewing an API change for compatibility and contract breakage. |

The server side of the same work is [`ref-backend`](../ref-backend/SKILL.md).
