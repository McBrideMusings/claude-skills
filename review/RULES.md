# RULE 0 and RULE 1

The two rules that bind every pass which judges code and then asks what to do about it —
`review` and `unblock` alike, plus every file either one loads and every subagent either one
spawns.

**Load this file first, before any routing.** Both skills state that they bind; this is the
one place the wording lives.

## RULE 0 — `AskUserQuestion` is BANNED for the entire lifetime of the pass

**Every question either skill asks the user — without a single exception — is plain chat text
answered by a typed keyword. The `AskUserQuestion` tool (the arrow-key option selector) is
never called at any point.**

This is a hard, non-negotiable ban with the same standing as the no-AI-attribution rule. It
holds regardless of how the pass was entered — typed `/review` or `/unblock`, routed here from
`implement`, `wrap-up`, or any other skill. A caller's habits do not unlock the
tool; the pass is a no-selector zone from the moment this file loads until it ends, **including
every sub-file** ([REVIEW-CORE.md](REVIEW-CORE.md), [POSTING.md](POSTING.md),
[../unblock/FEEDBACK.md](../unblock/FEEDBACK.md), [../unblock/CONFLICTS.md](../unblock/CONFLICTS.md),
[../unblock/TESTS.md](../unblock/TESTS.md), [../unblock/SWEEP.md](../unblock/SWEEP.md)) and any
project-local skill either one loads.

It covers **every** decision point, not just the ones spelled out below. Non-exhaustive:
end-of-pass finding disposition, which PRs to review from the queue, which branches to sweep,
review flavor, review scope, verdict choice, whether to run grill-me, whether to fix on the
branch, whether to write the summary doc, which failing tests to fix, which feedback threads to
address, and any ambiguity that needs the user to settle it.

**Do this instead.** Print the options as plain chat text — numbered or keyworded, as many as
actually exist — and say what to type. Keywords are good (`fix`, `post`, `approve`, `skip`,
`all`, `1016 and 1018`); the point is that the answer is *typed*, not picked from a menu widget.
On more than one finding, list each with its own line so the user can answer per finding
(`1 fix, 2 post, 3 skip`).

**Every such list carries your own recommendation per item, and ends with the accept-all line —
always:**

> Type **`go`** to apply my picks exactly as described, or answer per finding (`1 fix, 2 post, 3 skip`).

A findings list with no recommendation is a non-answer (`CLAUDE.md`, Deciding & designing); one
with recommendations but no way to accept them wholesale makes the user re-type a decision they
already agree with. `go` means *the picks as stated*, skips included — never "fix everything".

**ONE slate per message, and `go` takes all of it.** Everything still waiting on the user at the
end of a pass goes in a single numbered list — findings, a push, a re-request, arming auto-merge,
whatever else a sub-file produced. A message that ends with two conforming lists, or with a list
plus a separate one-off question underneath it, still makes the user answer twice to accept two
things you already recommended, and it is the same failure as no accept-all at all. A sub-file
that produces an outward action contributes **a row**, never a prompt of its own; the top-level
phase that prints the report owns the only slate. One row is still a slate — print it numbered
and close it with `go`.

**`go` is a keyword, not a selector — it does not reopen RULE 0.** RULE 0 bans a *menu* that
hides the reasoning behind a click; `go` is typed chat text meaning "apply the disposition
already printed and reasoned about on every line above." **It is also the only accept word this
skill ever asks for** — a single-action offer closes with `go` too, never `yes` / `post` /
`approve` / `confirm` (`CLAUDE.md`, Deciding & designing). It is available whenever **every** line in the list carries a
`(recommended)` keyword — if any line has no clear recommendation (two keywords with neither
marked, or a genuine "your call" case), that item is excluded from what `go` covers and must
still be typed individually; say so in the same message as the list (`go covers 1–2; 3 has no
clear recommendation — type its disposition separately`).

**Self-check before every question.** If you are about to open a selector, stop — that is this
rule firing. Rewrite the question as chat text and send that instead.

### Named tripwires — check these two by name

These are points where the prose above already covers the case but the selector still feels
reasonable in the moment. Treat these as named tripwires:

1. **"The diff hasn't changed since I last reviewed this — what do you want from this pass?"** A
   re-review of an unchanged diff feels like a fresh routing decision, so it invites a selector.
   It is a review question, asked after `/review`, and it is banned. Say it in chat: *"Diff is
   unchanged since the last pass on #1188. Type `again` for a fresh pass, `axes <names>` to
   re-run specific lenses, or tell me what changed in your thinking."*
2. **"How much of this should I apply now vs hand back?"** Scope-of-fix at the end of a pass is
   *exactly* the end-of-pass disposition the rule enumerates. Per-finding typed answers, always:
   *"1 fix, 2 post, 3 skip."*

A selector looks reasonable precisely when the question feels like routing rather than judgment.
**From `/review` or `/unblock` until the pass ends, there is no such thing as a routing question
that escapes this rule.**

## RULE 1 — effort NEVER decides what gets fixed

**How much work a fix is — its size, its difficulty, how many files it touches, how long it
would "take" — is banned as a reason to skip it, defer it, downgrade it, or recommend against
it.** This binds everywhere: scoring a reviewer's comment
([../unblock/FEEDBACK.md](../unblock/FEEDBACK.md) Phase 05), choosing which failing test to fix,
the end-of-pass fix/post/skip disposition, the blocking verdict, and every subagent spawned
during the pass.

**Never state or reason from a time estimate.** Human-hour estimates ("a quick one-liner", "an
afternoon", "a big lift") import a cost model that does not apply — the agent writes the fix,
and what reads as hours of human work is minutes of tool calls. Naming a change's *shape* as
description ("one attribute", "six lines") is fine; using size as the *justification* is not.

**Banned justifications**, in chat, in the report, and in any drafted reply: "not worth it",
"low value", "marginal", "too big for this PR", "I'd rather not fold that in", and "follow-up" /
"out of scope" whenever the real reason is magnitude.

**Only three things justify not fixing now**, and each must be stated as itself:

1. **The code is correct as-is** — say why on the merits, citing the code.
2. **Divergent work** — a *different concern*, so it belongs in its own unit of work. Divergence
   is about subject matter, never size. It is also what parallelizes: route it ("own branch,
   runs alongside this"), don't shelve it.
3. **Blocked on the user's intent** — state the question rather than guessing.

Anything fitting none of the three gets fixed. **Self-check:** if most findings in a pass landed
on skip/reply, or several share a same-shaped excuse, re-judge every one of them against those
three reasons before presenting.

## RULE 2 — a gate does the job it names, it does not ask permission to do it

**`unblock` never stops to ask whether it should unblock.** A branch that conflicts gets its
conflicts resolved. A branch with red checks gets its failures diagnosed and fixed. A PR with
unanswered feedback gets answered. Those are the skill's job, not a proposal it puts to the
user, and printing *"the branch conflicts with origin/main — `resolve` · `review anyway` ·
`stop`"* and then waiting is the exact failure this rule exists to stop.

**What still asks, and it is the only thing:** the single push confirm at the end of an
`unblock` pass, batched over everything the pass did. See `unblock/SKILL.md` Phase U5.

The two escapes, both narrow:

- **Unpushed local work that a repair would destroy** — the freshness gate stops rather than
  resetting over commits that exist nowhere else. That is data loss, not a preference.
- **The fix is genuinely ambiguous** — two readings of a conflict hunk that mean different
  things, a failing test whose correct expectation depends on the user's intent. State the
  question, in chat, per RULE 0, and keep going on everything else first.

Nothing else is a reason to halt. Not "this is a collaborative repo", not "this touches many
files", not "the user might want to look first". They can look at the diff before the push
confirm.
