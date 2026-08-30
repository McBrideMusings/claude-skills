# Steering-conflict lens — do the co-loaded sources fight each other?

Every other lens holds the transcript up against the steering set. This one turns
around and judges **the set against itself**.

The failure it catches is invisible to a single-skill read. Skill A is well written.
Skill B is well written. They were loaded into the same session and cannot both be
obeyed. Nothing that reads one file at a time will ever see it.

Distinct from `negative-space`, which asks what an obligation required and did not
get. Here the obligation may have been perfectly obeyed — the finding is that a
*second* obligation said the opposite, so obeying either one broke the other.

Distinct from `improve`'s `skills` aspect, which runs the same questions against one
skill directory statically. That aspect owns within-skill contradiction. This lens
owns contradiction **across the sources that actually landed in one session**, which
is knowable only from a transcript.

## Method

1. **Get the fact base.** The steering is not in the user/assistant records — it
   arrives as `attachment` records.

   ```bash
   python3 ~/.claude/skills/audit-session/analyze.py <corpus> --steering
   python3 ~/.claude/skills/audit-session/analyze.py <corpus> --steering --dump
   ```

   The inventory gives you sources and word counts. `--dump` gives the text, which
   a contradiction finding has to quote. Never `cat` the JSONL — the skill's one
   rule holds here like everywhere else.

2. **Add what the transcript does not carry.** The `CLAUDE.md` set and `MEMORY.md`
   are injected at request build time and never persisted. Read them from disk, per
   SKILL.md Phase 3. `--steering` prints this caveat so a thin inventory is never
   mistaken for a quiet session.

3. **Run the three checks below.** Each needs two quoted sources; a finding with one
   is not a finding.

### Check 1 — Contradiction

Two co-loaded sources that cannot both be obeyed. Rank by whether a route exists at
all:

| Severity | Shape |
|---|---|
| **No legal route** | Every option one source recommends is forbidden by another. The agent must violate something. |
| **Silent arbitration** | Both are obeyable, one wins, and nothing records which — so the loser looks like disobedience in every later audit. |
| **Narrow overlap** | They collide only in a case that rarely arises. Still a finding, ranked low. |

The tell in a transcript is a **blocked or retried call whose instruction came from
another injected source.** Cross-reference `analyze.py`'s blocked-call list against
the steering dump: a hook denying what a reminder recommended is the cleanest
possible evidence.

### Check 2 — Trigger collision

Two descriptions in the skill listing that claim the same user phrasing. The router
picks one, arbitrarily, and the other never fires — which reads as `skill-miss` when
the real cause is a naming overlap.

Evidence: quote both `description` fields and the phrase they share. Then check
`analyze.py`'s SKILLS FIRED list — a collision is confirmed when one of the pair
fires and the other never has.

### Check 3 — Duplicated rule

The same instruction written out in three places, in prompts that can drift apart.
Not a contradiction *yet* — it is the condition that produces one. Every copy is a
place an edit can land without the others following.

Report the count and the canonical home: "stated in N sources, should live in one."

## Worked example — the one that motivated this lens

Filed as `cc-d4w`. Four sources arrived before the user's first message. Three gave
incompatible instructions for reading a file:

> the auto-mode reminder: "read files with cat, head, or sed -n"
> `hooks/slice-read-guard.sh`: denies `sed -n 'N,Mp' <file>` outright
> context-mode: "Bash is ONLY for git/mkdir/rm/mv/navigation"

No legal route. The same set collided a second time on subagents: the harness
injects "Do not call the AgentTool unless the user requested it" while `wrap-up`
mandates `build-runner` and `audit-session` Phase 4 spawns one sub-agent per lens.

Nothing detected either. A human read the sources, worked out the precedence by
hand, and wrote `hooks/steering-precedence.sh` — 71 lines that now print at
SessionStart in every repo, landed in `32a2de0` and corrected twice after
(`35ec2aa`, `861a6a1`).

**Read that hook as the shape of the fix, and as the warning.** Arbitration is the
*fallback*: it leaves the conflict in place and pays for it every session forever.
Prefer removing the condition — delete the losing clause, narrow one source's scope
so the overlap cannot arise. Reach for a precedence note only when a source is
vendored and cannot be edited, which is exactly why that hook exists.

## What is not a finding here

- Two sources that merely *overlap*. Saying the same thing twice is Check 3, ranked
  low; saying opposite things is Check 1. Do not inflate one into the other.
- A conflict the user resolved in the conversation. Steering is theirs to override.
- A contradiction between two sources that were never co-loaded. The whole point of
  this lens is the transcript: prove they landed together.
- A general worry that two skills "might" conflict. Quote both, or drop it.
- Within-skill contradiction. That belongs to `improve`'s `skills` aspect.

## Finding format

> **`<the two clauses, quoted, each ≤15 words>`**
> Source A: `hooks/slice-read-guard.sh` · Source B: auto-mode reminder
> Co-loaded in **7 of 7** sessions since 2026-08-21. **No legal route.**
> Evidence: `<session>:<timestamp>` — call blocked, retried under the other rule.
> **Fix (design call):** narrow A's scope to the pure-slice case so B's recommendation
> stays legal. Rejected: a precedence note, which leaves the conflict and bills every
> session for the arbitration.

Axis tag: `steering-conflict`. Every finding carries the co-load count — "3 of 12
sessions" beats "sometimes", same as every other lens.

**Before writing the `Fix:` line, test it against all five fix shapes** — [../FIX-SHAPES.md](../FIX-SHAPES.md). Two are lens-specific here: a conflict between two *files* can often be caught at author time rather than arbitrated at run time, so the **filesystem validator** rung is live; and a trigger collision is usually `SKILL-SHAPE`'s rung 3 (reword the description) or rung 4 (combine or embed), which already warns against merging two skills whose bodies carry contradictory rules until the contradiction is resolved.
