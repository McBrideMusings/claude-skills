# Spec compliance lens

Read the spec located in Phase 03, then read the diff. Report findings in three sub-categories, quoting the spec line for each, and tag each finding with its sub-category so Phase 07 can route them:

1. **Missing or partial** (`spec/missing-partial`) — requirements the spec asked for that aren't implemented or are only partly done. Also surface explicit `TODO` / `FIXME` / `XXX` markers left in the diff that point at unfinished spec work.
2. **Scope creep** (`spec/scope-creep`) — behaviour in the diff that wasn't asked for.
3. **Wrong implementation** (`spec/wrong-impl`) — requirements that look implemented but the implementation is wrong (wrong return type, missed edge case, opposite default, etc.).

**Draft PR handling.** If `IS_DRAFT=true` (forwarded by the dispatch), prefix the "Missing or partial" section header with `(draft PR — expected gaps)` and write those entries with **Gap** instead of **Why** / **Fix** — follow the "Writing style for entries on draft PRs" rules forwarded with this brief. `spec/scope-creep` and `spec/wrong-impl` are still issues even on a draft — wrong code is wrong regardless of completeness, and unrequested behaviour is worth flagging before the author marks the PR ready.

If no spec was found / user opted out, output: `No spec available — skipped.` and exit. Don't manufacture spec content.

Axis tag: `spec` (always with a sub-category: `spec/missing-partial`, `spec/scope-creep`, `spec/wrong-impl`).
