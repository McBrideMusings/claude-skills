# The skill-shape question — is this skill the right shape, or the right thing at all?

Not a lens. The second **fix shape**, alongside [HOOKS.md](HOOKS.md).

The default failure of a skill audit is treating the existing skill set as gospel and only
ever proposing *better wording*. Most real fixes are structural: the skill shouldn't exist,
shouldn't be reachable, belongs inside another one, or should be two things.

When a lens produces a finding about a skill — it missed, it misfired, it was ignored, it
duplicated a tool — walk this ladder **in order** and stop at the first rung that fits. Each
rung is cheaper and more reversible than the one below it.

## The ladder

### 1. Is it worth keeping at all?

Kill it if:
- **Something already does the job.** A skill that reimplements an installed binary by hand
  is pure loss. Precedent: `meat` narrated doing by hand what `~/go/bin/meat` does
  mechanically — 171 tokens of catalog, invoked 0 times. Deleted.
- **It contradicts standing steering.** `strip-conventional-commits` existed to undo the
  Conventional Commits rule mandated in `CLAUDE.md`.
- **Zero invocations across the whole corpus, and no other skill reads it.** Check both —
  `analyze.py` counts `Skill` calls, but a skill read *by reference* from another skill
  shows zero and is still load-bearing. `dispatch`'s `TARGETS.md` is read this way.

Before deleting, extract what's worth keeping. `writing-skills` was deleted only after its
body moved to `improve/WRITING-SKILLS.md` and its glossary to `improve/SKILL-GLOSSARY.md`.

### 2. Keep it — but should the model be able to reach it?

**The cheapest structural fix in the whole ladder, and usually the right one.**
`disable-model-invocation: true` strips the description from context entirely: zero cost,
still invocable by name. It spends *cognitive* load instead — the user becomes the index.

Reach for it when the skill is real and useful but the model has never once needed to fire
it on its own. Nine skills took this route on 2026-08-20.

Also on this rung: **relocation**. A skill that only applies inside one repo belongs in that
repo's `.claude/skills/`, not the global catalog — `roblox` moved into its two projects and
now costs nothing anywhere else. Check the target is a git repo first, or the move quietly
un-versions it.

### 3. Keep it and keep it reachable — is the *description* the bug?

Only now consider rewording, and only the description. It is the part that costs tokens
every turn, and it is what routing actually reads.

- A `skill-miss` where the user's phrasing appears nowhere in the description → add the
  trigger, don't lengthen the prose.
- A `skill-misfire` from an over-broad description → narrow the clause that caught it.
- A description longer than a heavily-used skill's, on a skill invoked once, is the tell.
  Compare against the corpus before rewriting.

### 4. Should it be combined, or embedded?

**Combine** when two skills answer the same question at different depths and the seam
between them is a coin-flip for the router. `product-design` + `ui-design` → `gui`.

**Embed** when one is always used *inside* the other and never alone — it stops being a
skill and becomes a reference file the parent loads at the right moment. `terminal` became
`dispatch`'s transport doc; `zoom-out` became `explain`'s `map` mode.

The test for embedding: does it ever fire without the parent? If no, a separate catalog
entry buys nothing and costs every turn.

**Do not merge two skills whose bodies carry contradictory rules** until the contradiction
itself is resolved — merging re-creates the split inside one file and loses the boundary.
`product-design`/`ui-design` had exactly this and the merge was correctly stopped until the
underlying rule was deleted.

### 5. Should it be split, or should the body move?

Split when one skill serves genuinely different branches that share almost nothing — the
router can't pick, and every run loads material most runs don't need.

Far more often the answer is **progressive disclosure, not a split**: keep one skill, push
the branch-specific material into a linked file the parent loads only when that branch
fires. A thin `SKILL.md` that routes into `references/` costs the catalog one description
and loads the rest on demand. `~/.claude/skills/improve/WRITING-SKILLS.md` has the full
vocabulary for this.

### 6. Is the skill fine and the *trigger* missing?

The rung most often skipped. A skill can be well-written, correctly scoped, and still never
fire because nothing points at it at the moment it applies. The fix is a load trigger in the
skills that *do* fire — not a change to the skill itself.

Precedent: the plan-format rule was obeyed 0 times not because the doc was bad but because
the doc was never opened — 14 tool opens across 9,243 transcripts. The fix was making it a
skill and having `grill-me`, `backlog shape` and `spike` load it at the point they write a
plan.

## What this is not

- A licence to restructure a skill the user relies on because it looks untidy. Every rung
  needs evidence from the corpus.
- A reason to delete something with zero invocations without checking rung 1's second bullet.
- Applicable to the *user's* deliberate choices. If they hid it, moved it, or wrote it that
  way on purpose, that is settled.

## Writing the finding

> **Shape:** `<delete | hide | relocate | reword description | combine | embed | split |
> disclose | add load trigger>` — rung `<n>`.
> Evidence: `<invocations, catalog cost, who reads it by reference>`.
> What moves where: `<concrete paths>`.
> Extract first: `<what must survive the change, or "nothing">`.

Pair it with the hook question — a skill that keeps not firing and a hook that could force
the issue are the same finding seen from two sides, and the cheaper answer wins.
