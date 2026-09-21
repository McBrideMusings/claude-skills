---
name: ref-backend
description: Backend services — secrets and logging discipline, data access, service boundaries. Load before writing or reviewing server-side code.
---

# Backend knowledge

| Open | When |
| --- | --- |
| [`context.md`](context.md) | The whole cell — open before writing or reviewing anything that touches secrets, logs, or data access. |
| [`formats.md`](formats.md) | Defining or changing a file or wire format, writing a parser, or writing anything to disk that must survive a crash. |

The wire contract is [`ref-api`](../ref-api/SKILL.md) — these pair.
