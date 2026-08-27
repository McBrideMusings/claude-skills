---
name: audit-session
disable-model-invocation: true
description: Audit conversation transcripts — this session, this project's history, or all of it — through lenses that ask what was spent, what was steered and ignored, which skills should have fired and didn't, and where the conversation itself wasted the user's time. Replaces the old `skill-audit` (2026-08-20) and absorbs its direct-fix mode.
---

# audit-session

Reviews **conversations**, not code. `review` judges a diff; this judges the transcript that produced it — the spend, the steering that was ignored, the skills that should have fired, and the places the chat itself made the user work harder than necessary.

**Never triggers itself.** User-invoked only.

## The one rule — lenses judge extracted facts, never raw JSONL

Transcripts are enormous. Reading them directly burns the context this skill exists to protect, and eyeballing produces vibes instead of findings. **Always run [analyze.py](analyze.py) first** and hand its output to the lenses. A lens that needs raw text asks `analyze.py --dump-user-messages`, never `cat`.

**Two extractors, different questions.** [analyze.py](analyze.py) answers *where did the effort go* — spend, skills fired, friction. [adherence.py](adherence.py) answers *was this rule obeyed* — the ratio `negative-space` exists to produce. Never hand-roll the second one: it carries four exclusions that each produced a published wrong number, and every hand-rolled count so far has missed at least one.

Corollary, learned the hard way: **validate the instrument before trusting the number.** A measurement that disagrees with a second method is not a finding until one of them is explained. See [CORPUS.md](CORPUS.md) § Measurement traps.

## Modes

**`audit-session`** (bare) — audit the corpus the cwd implies. Scope rules in [CORPUS.md](CORPUS.md); the short version:

| where you run it | corpus |
|---|---|
| a project directory | that project's transcripts |
| `~/.claude` | every project — the whole history |
| a session that already has conversation in it | **just this session**, whatever the cwd |

The last rule wins over the first two. A session with real conversation in it is almost always the thing the user means. Say which corpus you picked in one line before starting, so a wrong guess costs one correction rather than a full pass.

**`audit-session <path>`** — audit an explicit `.jsonl` or project dir.
**`audit-session fix <what>`** — skip the audit, fix one named problem in the owning skill or `CLAUDE.md` now. Absorbed from the old `skill-audit` Mode B; procedure in [FIX-MODE.md](FIX-MODE.md).

Scope modifiers: `--since YYYY-MM-DD`, or name lenses (`audit-session negative-space spend`).

## Lenses

Run every applicable lens unless the invocation names a subset. Each is a file in [axes/](axes/); a lens gets its axis file plus the `analyze.py` output, nothing else.

| Axis | Asks |
|---|---|
| [negative-space](axes/negative-space.md) | What does the steering documentation require that **did not happen**? |
| [skill-miss](axes/skill-miss.md) | Where should a skill have fired and didn't? |
| [skill-misfire](axes/skill-misfire.md) | Where did a skill fire that shouldn't have, or fire and add nothing? |
| [spend](axes/spend.md) | Where did the tokens go, and which of it bought nothing? |
| [tool-choice](axes/tool-choice.md) | Where was work done by hand that an existing tool already did? |
| [friction](axes/friction.md) | Blocked calls, retries, repeated reads — the papercut surface. |
| [decision-quality](axes/decision-quality.md) | Were choices put to the user answerable inline, or did they need a round trip? |
| [restatement](axes/restatement.md) | Where did the user have to repeat, re-scope, or correct? |

**`negative-space` is the point of this skill.** The others find waste that shows up in a token count. Negative-space finds the rule you wrote, deployed, and never saw obeyed — which no cost metric will ever surface, because not doing the work is *cheaper*.

## RULE — every finding is tested against the fix shapes

A lens finds what went wrong. The **fix shapes** are the structural answers worth reaching for before the lazy one — *"write the instruction more forcefully"*. No finding is complete until it has been tested against each one that applies.

**[HOOKS.md](HOOKS.md) — could this have been enforced?** An instruction is re-decided every turn by a stochastic process. A hook is the harness running code: it fires every time or never. Name the event and predicate if yes, the reason if no.

> Simulate before proposing. A `Stop` hook for the `show-shape` rule fired 62 times over 13 months at **10% precision**. A hook without a fires-count and a precision sample is a guess, and a low-precision hook is worse than none — it trains the user to ignore it.

**[SKILL-SHAPE.md](SKILL-SHAPE.md) — is the skill the right shape, or the right thing at all?** Never treat the existing skill set as gospel. Walk the ladder in order and stop at the first rung that fits: delete → hide or relocate → reword the description → combine or embed → split or disclose → add a load trigger.

> The rung most often skipped is the last. A skill can be well-written and still never fire because nothing points at it at the moment it applies.

**[PERMISSIONS.md](PERMISSIONS.md) — should this have prompted at all?** The classifier is conservative; a prompt on a command that was always going to be approved is a stall on a full context window. Three shapes in order: allowlist rule → deny+allow pair → a narrow wrapper tool when the safe/unsafe split lives inside an argument the matcher can't parse.

> Denials leave a trace; **approved prompts leave none**. Rank by repeated command prefixes, not denial counts, and say it's inference. Any widening names what stays denied in the same breath.

These bind every lens, not just `negative-space`. When more than one offers an answer, the cheaper and more reversible one wins — and say which you rejected, and why.

## Phases

1. **Resolve the corpus** — [CORPUS.md](CORPUS.md). State it in one line.
2. **Extract** — `python3 ~/.claude/skills/audit-session/analyze.py <corpus> [--since …]`. Read the output. This is the shared fact base for every lens.
3. **Load the steering set** — global `~/.claude/CLAUDE.md`, the project `CLAUDE.md` and `CLAUDE.local.md`, and the `SKILL.md` of every skill `analyze.py` reports as fired. `negative-space` and `skill-miss` are meaningless without it.
4. **Run the lenses.** One sub-agent per lens for a multi-session corpus; inline for a single session. Each returns findings only — no edits.
5. **Score.** A finding survives only if it names a **specific transcript moment** (timestamp or quoted line) *and* a **specific rule or cheaper alternative**. Kill anything that is a general observation about how sessions could go better.
6. **Report** in chat, in the shape [REPORT-FORMAT.md](REPORT-FORMAT.md) specifies. Ranked, most-recurrent first. Every finding carries a count — "3 of 12 sessions" beats "sometimes".
7. **Offer dispositions** in one batched plain-text reply: fix now / file / skip per item. Never `AskUserQuestion`. Filing goes to `followups` for skill-quality items, to `papercut` for frictions, to `to-tickets` only if a finding is really project work.

## RULE — a disposition list ALWAYS states that `go` accepts it

**Every disposition block ends with the escape hatch, without exception.** Give your own pick for each item, then one line saying the whole set can be accepted as-is:

> Type **`go`** to apply my dispositions exactly as described, or answer per item (`1 fix, 5 file, rest skip`).

Two failure modes this closes, both real:

- **A list with picks but no accept-all** makes the user re-type a decision you already made. They read eight findings, agree with all eight, and then have to enumerate them back.
- **A list with no picks at all** is the `CLAUDE.md` violation one level up — *"a list with no pick is a non-answer"*. Dispositions are recommendations, so every item carries yours.

The word is **`go`**, matching `improve`'s existing *"Type `go`, name a subset"*. Do not invent a synonym (`apply`, `yes`, `all`) — one keyword across every skill is the point. `go` means *your stated picks*, including the ones you marked skip; it never means "fix everything".

There is exactly one sanctioned second word, and it is not a synonym: **`park`** applies the identical dispositions and then stops. It appears only on a slate that also proposes next work — `go` continues into that work, `park` ends the turn. An audit slate that proposes none names `go` alone.

## RULE — effort never kills a finding

Same as `review` and `improve`. How hard something is to fix is not a reason to drop it, downgrade it, or call it a follow-up. A steering rule being ignored across 40 sessions is a finding whether the fix is one line or a rewrite.

## Scope boundary

This skill edits **skill files, `CLAUDE.md`, and harness config** — the things that steer a session. A project-code defect it happens to notice leaves as a one-line pointer to `review`, never as a card.
