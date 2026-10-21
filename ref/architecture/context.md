# architecture — injected context

> Prefer the fix that removes a bug's condition over guarding it.

One page per topic and one page per whole-system pattern; `improve` and `review` cite these.

## Files

| Open | When |
| --- | --- |
| [`depth.md`](depth.md) | Judging or designing structure: the module/interface/seam vocabulary, the deletion test, removing a condition rather than guarding it. |
| [`end-state.md`](end-state.md) | Reworking an existing shape, deleting a compatibility path, or making a module testable. |
| [`patterns/microkernel.md`](patterns/microkernel.md) | A product that hosts things others or agents add — plugins, extensions, panes, pages, commands — and what belongs in its core. |
| [`improve/INTERFACE-SAFETY.md`](../../improve/INTERFACE-SAFETY.md) | An interface where the caller can hold it wrong — unsafe defaults, silent failure, an API that permits an invalid state. |
| [`host-dependencies.md`](host-dependencies.md) | Code that would rely on something outside its own build — a binary, app, service, OS permission, network layout or account on the user's machine. |
| [`improve/SECURITY.md`](../../improve/SECURITY.md) | Secrets, authentication, input trust boundaries, or anything reachable by an untrusted caller. |

Judging a codebase against these and filing what it finds is [`improve`](../../improve/SKILL.md); judging one diff is [`review`](../../review/SKILL.md). This cell is the knowledge those two read.
