---
name: ref-architecture
description: Code design — module boundaries, coupling, the conditions a bug needs to exist, interface safety, security. Load before designing, refactoring or reviewing structure.
---

# Architecture knowledge

| Open | When |
| --- | --- |
| [`../improve/ARCHITECTURE.md`](../improve/ARCHITECTURE.md) | Judging or designing structure: boundaries, coupling, and the rule that every bug is evidence the architecture permits it. Read before choosing between a fix that removes a condition and one that guards it. |
| [`../improve/INTERFACE-SAFETY.md`](../improve/INTERFACE-SAFETY.md) | An interface where the caller can hold it wrong — unsafe defaults, silent failure, an API that permits an invalid state. |
| [`../improve/SECURITY.md`](../improve/SECURITY.md) | Secrets, authentication, input trust boundaries, or anything reachable by an untrusted caller. |

Judging a codebase against these and filing what it finds is [`improve`](../improve/SKILL.md); judging one diff is [`review`](../review/SKILL.md). This skill is the knowledge those two read.
