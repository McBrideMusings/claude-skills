# Aspect brief: `docs` (delegated → `docs`)

Axis tag: `docs`. Applicability: always. Docs are the standing assumption (`docs/SKILL.md`) —
content organisation is this aspect's job whether or not a VitePress site exists; the site's
own presence is `layout`'s finding.

**Read:** `../../docs/SKILL.md`, its **Findings-only invocation** contract. Run
`PHASE-01-STATE-DETECTION.md`. When `docs/` + `.vitepress/` both exist, also evaluate
`PHASE-03-AUDIT.md`'s mechanical and substantive checklists as a **report instead of applying
them**. Skip Phases 05–06 entirely.

## Aspect-specific rules

- Each checklist hit becomes one finding with the artifact named: "`config.ts` needs the
  `.mts` rename", "`checkout.md` has no `applies-to` and governs nothing." A checklist item
  that passes is not a finding.
- **Separate mechanical from substantive.** A mechanical hit (wrong extension, dead link,
  missing sidebar entry) is cheap and certain; a substantive one (a page that documents a flow
  the code no longer has) needs the code cited alongside the page. Don't let a pile of
  mechanical hits bury the one substantive finding.
- Do not create, migrate, or rename anything. The docs skill's act-don't-ask behavior is
  suspended for you.
- **The VitePress checklist above is the site-exists-only half.** The organisation checklist
  below runs regardless of whether a VitePress site exists — a repo with no site can still
  carry a forbidden PRD file, an undocumented subsystem, or a term with a dangling
  `applies-to`.

## Organisation checklist (always runs)

Each finding quotes the file.

- **Files the standard forbids.** A `PRD.md`, `docs/PRD.md`, `ROADMAP.md`, `docs/roadmap.md`,
  or similar planning/prediction doc anywhere in `docs/` or the repo root. These are forbidden
  outright — forward-looking work belongs on the issue tracker (`iron-out` prints a roadmap
  from the dependency graph on demand).
- **Misnamed files.** A file that should be `docs/CONTEXT.md` or `docs/adr/NNNN-slug.md` under
  a different name or path (`GLOSSARY.md`, `docs/decisions/`, `001-foo.md` missing the
  four-digit pad).
- **Docs with no `applies-to` and therefore nothing they govern.** An ADR or subsystem doc that
  reads as path-scoped in its prose (names specific files or directories) but carries no
  `applies-to` frontmatter, so `docs-refs` can never surface it for the code it's actually
  about.
- **Docs whose governed paths no longer exist.** Run `python3 ~/.claude/tools/docs-refs.py
  --validate` and report each glob it flags as pointing at a deleted/moved path.
- **Subsystems that pass the three-conditions test with no doc.** Walk the repo's major
  subsystems (crosses a process/host/service boundary, or is the project's main job;
  behaviour not reconstructable from one file; has an invariant or ordering a reader would get
  wrong) and flag ones with nothing at `docs/<name>.md` or `docs/architecture/<name>.md`.
- **Two docs describing one subsystem.** Overlapping `docs/*.md` / `docs/architecture/*.md`
  files that cover the same subsystem — a fork nobody merged, or a rename that left the old
  file behind.

Keep the mechanical-vs-substantive split for this checklist too: a missing `applies-to` or a
forbidden file is mechanical (cheap, certain); an undocumented subsystem or a duplicate doc is
substantive (needs judgment about scope and overlap). The **"create nothing"** suspension
applies here exactly as above — report only, propose nothing that writes a file.
