# Phase 07 — Glossary Audit

Run on `/docs glossary`. Standalone: it does not need Phase 01, and it never touches the
VitePress build. Read-only until the closing slate.

Answers one question: **is every term in `docs/CONTEXT.md` still a real, distinct, used
piece of this project's vocabulary?**

## Gather

```bash
ls docs/CONTEXT.md docs/CONTEXT-MAP.md 2>/dev/null
python3 ~/.claude/tools/docs-refs.py --validate    # dead applies-to globs
```

For a multi-context repo, `docs/CONTEXT-MAP.md` names each context's own file; audit every
one, and report per file.

## The six checks

Run each against every term. A term can fail more than one.

1. **Unused.** Grep the term across the tree — code, docs, issue titles. Zero hits outside
   `CONTEXT.md` itself means it is vocabulary nobody speaks. Search the identifier form too
   (`snake_case`, `camelCase`, the bare noun), not only the display spelling.
2. **Undefined-but-used.** The reverse sweep, and the one that finds real gaps: names that
   recur across the codebase — a type, a table, a recurring noun in module names — with no
   entry. Cap the proposal at the terms that pass `CONTEXT-FORMAT.md`'s "specific to this
   project" bar; a general programming word is not a finding.
3. **Drifted.** The definition no longer matches what the code does. Read the definition,
   then read the thing it names. A term whose meaning moved is worse than a missing one.
4. **Duplicated.** Two entries for one concept, or a term whose `_Avoid_` alias is itself a
   separate entry.
5. **Bloated.** A definition over one sentence, or one that says what the thing *does*
   rather than what it *is*.
6. **Dead scope.** An `_applies-to_` glob matching no tracked file — `docs-refs.py
   --validate` exits non-zero and names these.

## Report

One numbered slate, most-severe first, each row naming the term, the check it failed, the
evidence (hit count, the file the definition disagrees with, the dead glob), and the
proposed fix as the text that would be written.

Dispositions per row: `fix` (rewrite the definition), `add` (write the missing term),
`drop` (delete the entry), `skip`.

Close with: *"Type `go` to apply my picks as described, or answer per item
(`1 fix, 5 drop, rest skip`)."*

Nothing is written before that answer — the same gate every other vocabulary write goes
through (`CONTEXT-FORMAT.md`). An `add` or `fix` row already carries its full proposed text,
so accepting the row is accepting the wording.
