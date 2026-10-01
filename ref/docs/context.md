# docs — injected context

> Terms, ADRs and subsystem docs are slate rows first, never written unseen.

Every repo keeps `docs/CONTEXT.md`, `docs/adr/` and subsystem docs; propose entries the turn they arise.

- **Term:** a slate row; the write waits for `go`. A changed definition is a `From:`/`To:` body.
- **ADR:** hard to reverse, surprising without context, a real trade-off. Never amended.
- **Subsystem:** crosses a process boundary and carries an invariant; propose `docs/<name>.md`.

## Files

| Open | When |
| --- | --- |
| [`STANDING-RULES.md`](STANDING-RULES.md) | The full vocabulary, ADR and subsystem rules, and the `## Docs` exemption in `CLAUDE.local.md`. |
| [`CONTEXT-FORMAT.md`](CONTEXT-FORMAT.md) | Writing or changing a `docs/CONTEXT.md` term. |
| [`ADR-FORMAT.md`](ADR-FORMAT.md) | Writing an ADR, or judging whether a decision earns one. |
| [`SUBSYSTEM-FORMAT.md`](SUBSYSTEM-FORMAT.md) | Writing `docs/<name>.md` for a subsystem. |
| [`bootstrap/docs-site/DOCS-SITE.md`](../../bootstrap/docs-site/DOCS-SITE.md) | Bootstrapping, auditing or migrating a VitePress docs site. |
