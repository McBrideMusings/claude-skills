# api — injected context

Good APIs are boring. An API the caller has to think about is one that stole
attention from the job they were doing.

- **Never break userspace.** Adding a field is fine; removing one, renaming one, or
  changing its type is not. If you truly must, version instead — both versions served
  at once, old one retired over months.
- **Every action-taking request needs an idempotency key.** A 500 or a timeout does not
  tell the caller whether the action happened. Without a key, the safe retry is impossible.
- **Cursor pagination, not offset**, for anything that can grow large.

Depth: [design.md](design.md) for the full rule set and the reasoning behind each.
