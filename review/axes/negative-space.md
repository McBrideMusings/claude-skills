# Negative-space lens

What obligations does this change create that it leaves *unmet*? Bound this **strictly to obligations the diff itself creates** — not hypothetical features, not a generic "more tests would be nice." Walk:

- **Call sites** — a changed signature/contract: are all consumers updated?
- **Failure paths** — the happy path is implemented; what about the timeout, null/empty, partial, or concurrent cases the change introduces?
- **Tests** — a new branch or edge case the diff adds with no coverage.
- **Security/validation** — new input the diff accepts but doesn't validate, or a new code path missing an authz check.
- **Observability** — a new critical path with no logging/metrics.
- **Compat/migration** — a breaking change or schema/data migration the diff makes but doesn't flag.
- **Docs** — public surface the diff changes without a docs update.

Frame each as "X is unhandled" or "Y has no test" — **never as a feature suggestion**. A negative-space finding is a design call, never a minor nit, and never an auto-fix (adding a test or handling a path is a decision). Use the **Fix (design call):** framing in the report entry.

**Disambiguation vs the Spec lens.** Spec measures the diff against an external spec/PRD doc; negative-space is self-referential to the diff and needs no spec (it runs even when no spec exists). If a gap is already covered by a quoted spec line, it belongs to the **Spec** lens, not here — do not double-report it.

Axis tag: `negative-space` (flat — name the sub-kind in the headline prose, e.g. "failure path left unhandled", "new branch has no test").
