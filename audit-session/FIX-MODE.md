# Fix mode — `audit-session fix <what>`

The user already knows the problem. No corpus, no lenses, no ticket — fix it this turn.
Absorbed from the retired `skill-audit` Mode B on 2026-08-20.

Targets: `SKILL.md` files and their reference docs, `~/.claude/CLAUDE.md`, a project
`CLAUDE.md`, hooks, and harness settings. Anything that steers a session.

## Procedure

1. **Locate the target.** `grep -rl` across `~/.claude/skills/*/SKILL.md`, their sub-files,
   and the `CLAUDE.md` set. If the symptom names a skill, start there; if it names a
   behaviour, grep for the clause that should have produced it.

2. **Before editing anything under `~/.claude/`, read `~/.claude/CONTRIBUTING.md`.**
   `skills/` is a **git submodule** with its own history. Never mix a submodule path and a
   parent-repo path in one `git add` — it aborts the whole add and stages nothing, silently.

3. **Read the full file before editing it.** A skill's rules interact; a clause removed in
   isolation routinely contradicts one three sections down.

4. **Check history before adding or changing a rule in `CLAUDE.md`.** That file is rebuilt
   periodically and rules get pruned deliberately. `git log --follow -p -- CLAUDE.md`, and
   `git show <sha>:CLAUDE.md` for a whole past version. If earlier wording covered the same
   behaviour, say so — quote it, name the commit that removed it, and propose either
   reinstating it or writing the new rule with that history in mind. A behaviour being
   corrected a second time is evidence the earlier removal was wrong, and that is worth
   naming rather than quietly re-deriving in worse words.

5. **Make the edit.** Descriptions are the expensive surface — every word of a model-invoked
   `description` sits in context on every turn of every session. Shorten by default. If the
   skill only ever fires by hand, `disable-model-invocation: true` strips the description
   entirely for zero context cost; see `../improve/WRITING-SKILLS.md`.

6. **Close** per the global convention: **Files changed / Unchanged / Follow-up needed**,
   plus manual verification steps — what to run, and what a pass looks like.

7. **Commit** per CONTRIBUTING.md: commit and push inside `skills/` first, then bump the
   submodule pointer in the parent repo. Plain one-sentence messages, no `type:` prefix, no
   AI attribution anywhere. The auto-commit rule applies — tracked files under `~/.claude/`
   commit and push without asking.

## Verifying a steering fix actually took

A rule is not fixed because the sentence changed. It is fixed when the behaviour appears.

- Structural claims are checkable now: does the file exist, does the link resolve, does the
  frontmatter parse, does the description still contain the trigger phrase.
- Behavioural claims need a later corpus. Note the fix date, then re-run
  `audit-session negative-space --since <that date>` after real work has happened. Say this
  out loud rather than declaring victory.

## Scope boundary

If the named problem turns out to be project code rather than steering, say so and point at
`review`. Do not fix it here.
