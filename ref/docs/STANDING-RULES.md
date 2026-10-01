# Docs standing rules

**Every repo keeps `docs/CONTEXT.md`, `docs/adr/`, and subsystem docs.** This is not a
finding to make about a repo — it is true of every repo, the same way
[`../../issues/REFERENCE.md`](../../issues/REFERENCE.md) says beads is the assumption for issue
tracking. Every session proposes entries as slate rows the turn they arise, never writes them
silently, and never waits for an audit to notice they're missing. A repo that genuinely cannot
carry part of this says so in its `CLAUDE.local.md` under a `## Docs` section — no label, no
injected line, nothing else grants the exemption.

These three apply everywhere, in any skill, not only while the docs-site flow is running — load
the linked format file when you need the detail, but the rule itself must be reachable in one hop
the turn it's needed.

- **Vocabulary.** A term is a slate row before it reaches `docs/CONTEXT.md` — the write happens
  on `go`, never inline mid-conversation. A changed definition is a proposed body, `From:`/`To:`
  in full. Shape: [`../../CHAT-FORMAT.md`](../../CHAT-FORMAT.md) §Slate row and §Proposed body.
  Audit with `bootstrap glossary`. Format: [CONTEXT-FORMAT.md](CONTEXT-FORMAT.md).
- **ADR.** The three-conditions test (hard to reverse, surprising without context, a real
  trade-off) applies in any session, not only an interview. A passing decision is a proposed
  body the turn it's made, per [`../../CHAT-FORMAT.md`](../../CHAT-FORMAT.md) §Proposed body — and
  for a change, the current body beside it. **ADRs are never amended:** git holds the history,
  the file holds only what is true now, and any ADR carrying an amendment, a date-stamped
  revision, a ticket id or more than 15 lines gets rewritten the turn you open it. Format:
  [ADR-FORMAT.md](ADR-FORMAT.md).
- **Subsystem.** A subsystem that crosses a process/host/service boundary (or is the project's
  main job), can't be reconstructed from one file, and carries an invariant or ordering a
  reader would get wrong, is a slate row proposing `docs/<name>.md` — offered the turn it's
  created or first meets the test, never a batch audit. Format:
  [SUBSYSTEM-FORMAT.md](SUBSYSTEM-FORMAT.md).
