# architecture — injected context

> Prefer the fix that removes a bug's condition over guarding it.

The knowledge lives in `improve/`; this cell is the route to it.

## Files

| Open | When |
| --- | --- |
| [`improve/ARCHITECTURE.md`](../../improve/ARCHITECTURE.md) | Judging or designing structure, or choosing between a fix that removes a condition and one that guards it. |
| [`improve/INTERFACE-SAFETY.md`](../../improve/INTERFACE-SAFETY.md) | An interface where the caller can hold it wrong — unsafe defaults, silent failure, an API that permits an invalid state. |
| [`improve/SECURITY.md`](../../improve/SECURITY.md) | Secrets, authentication, input trust boundaries, or anything reachable by an untrusted caller. |

Judging a codebase against these and filing what it finds is [`improve`](../../improve/SKILL.md); judging one diff is [`review`](../../review/SKILL.md). This cell is the knowledge those two read.
