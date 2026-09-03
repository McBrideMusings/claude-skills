---
name: audit-session
disable-model-invocation: true
description: Audit conversation transcripts — this session, this project's history, or all of it — through lenses that ask what was spent, what was steered and ignored, which skills should have fired and didn't, whether the co-loaded steering sources contradict each other, and where the conversation itself wasted the user's time. Replaces the old `skill-audit` and absorbs its direct-fix mode.
---

# audit-session

Reviews **conversations**, not code. `review` judges a diff; this judges the transcript that produced it — the spend, the steering that was ignored, the skills that should have fired, and the places the chat itself made the user work harder than necessary.

**Never triggers itself.** User-invoked only.

## The one rule — lenses judge extracted facts, never raw JSONL

Transcripts are enormous. Reading them directly burns the context this skill exists to protect, and eyeballing produces vibes instead of findings. **Always run [analyze.py](analyze.py) first** and hand its output to the lenses. A lens that needs raw text asks `analyze.py --dump-user-messages`, never `cat`.

**Three extractors, different questions.** [pointer_rate.py](pointer_rate.py) answers *was this pointer ever followed* — the cold-versus-warm read rates behind [`../improve/POINTERS.md`](../improve/POINTERS.md), and the instrument `navigation` re-runs after a pointer is rewritten. Its `--fires` mode answers the opposite question for `skill-misfire`: *how often does each model-invoked skill fire, and does that match what its description claims?* Pair it with `--since <the day the trigger changed>` — a skill whose flag was just removed has an untested trigger, and firing on work it does not apply to is invisible to every read-rate number, because the skill did load. [analyze.py](analyze.py) answers *where did the effort go* — spend, skills fired, friction, and under `--steering`, what steering was injected and from where. [adherence.py](adherence.py) answers *was this rule obeyed* — the ratio `negative-space` exists to produce. Never hand-roll the second one: it carries four exclusions that each produced a published wrong number, and every hand-rolled count so far has missed at least one.

**The steering is not in the user or assistant records.** It arrives as `attachment` records — hook stdout, the skill listing, the agent and deferred-tool listings, MCP instructions, the auto-mode flags. Scan only user+assistant and the whole set reads as absent. `analyze.py --steering` extracts it; `--dump` prints each source's text, which a contradiction finding has to quote. The `CLAUDE.md` set and `MEMORY.md` are the exception: injected at request build time, never persisted, so read them from disk. The inventory prints that caveat so a thin result is never mistaken for a quiet session.

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
| [navigation](axes/navigation.md) | What did it cost to *find* things, and which pointer removes the hunt? |
| [steering-conflict](axes/steering-conflict.md) | Do the co-loaded steering sources contradict, collide, or duplicate each other? |

**`negative-space` is the point of this skill.** The others find waste that shows up in a token count. Negative-space finds the rule you wrote, deployed, and never saw obeyed — which no cost metric will ever surface, because not doing the work is *cheaper*.

**`steering-conflict` is the only lens that judges the steering set instead of the transcript.** Every other lens holds the conversation up against the documentation; this one asks whether the documentation can be obeyed at all. A skill audited alone always passes — `improve`'s `skills` aspect owns that read. The failure here needs two sources in one session, so only a transcript can show it.

## RULE — every finding is tested against the fix shapes

A lens finds what went wrong. The **fix shapes** are the structural answers worth reaching for before the lazy one — *"write the instruction more forcefully"*. No finding is complete until it has been tested against each one that applies. All five, in one table the axis files point at: [FIX-SHAPES.md](FIX-SHAPES.md).

**[HOOKS.md](HOOKS.md) — could this have been enforced, and by what?** An instruction is re-decided every turn by a stochastic process; a machine running code fires every time or never. Three rungs, picked by what the failure *is*: a **harness hook** watches the agent's action, a **project check** (lint, type, test) watches its output, a **filesystem validator** watches the result on disk. Name the rung and its predicate if yes, the reason if no.

> Simulate before proposing. A hook without a fires-count and a precision sample is a guess, and a hook that fires often at low precision is worse than none — it trains the user to ignore it.

**[SKILL-SHAPE.md](SKILL-SHAPE.md) — is the skill the right shape, or the right thing at all?** Never treat the existing skill set as gospel. Walk the ladder in order and stop at the first rung that fits: delete → hide or relocate → reword the description → combine or embed → split or disclose → add a load trigger.

> The rung most often skipped is the last. A skill can be well-written and still never fire because nothing points at it at the moment it applies.

**[PERMISSIONS.md](PERMISSIONS.md) — should this have prompted at all?** The classifier is conservative; a prompt on a command that was always going to be approved is a stall on a full context window. Three shapes in order: allowlist rule → deny+allow pair → a narrow wrapper tool when the safe/unsafe split lives inside an argument the matcher can't parse.

> Denials leave a trace; **approved prompts leave none**. Rank by repeated command prefixes, not denial counts, and say it's inference. Any widening names what stays denied in the same breath.

**[CONTEXT-PRESSURE.md](CONTEXT-PRESSURE.md) — whose window pays for this rule?** The implementing stage re-decides every always-loaded rule on every turn; the reviewing stage receives a diff and has room. A code-quality standard in `CLAUDE.md` is charged to every session; in `review/axes/` it is charged once. The only shape that *removes* always-on tokens instead of adding enforcement — reach for it before `HOOKS.md`.

> Three tests, all required: checkable against a diff, acceptable to catch after the fact, and not steering the work itself. **`review` fires in ~1.5% of sessions** — state that rate in the proposal, or the rule has been downgraded rather than rehoused.

**[INFORMATION-ACCESS.md](INFORMATION-ACCESS.md) — could it have known?** The only shape that adds capability rather than constraining behaviour, which is why it gets skipped: when a session failed because a fact was unreachable, the answer is a surface, not a better instruction.

> The bar is both halves: the specific fact that was missing, and the specific command or file that would have answered it. "More visibility" is a wishlist, not a finding.

These bind every lens, not just `negative-space`. When more than one offers an answer, the cheaper and more reversible one wins — and say which you rejected, and why.

## Phases

1. **Resolve the corpus** — [CORPUS.md](CORPUS.md). State it in one line.
2. **Extract** — `python3 ~/.claude/skills/audit-session/analyze.py <corpus> [--since …]`. Read the output. This is the shared fact base for every lens.
3. **Load the steering set** — global `~/.claude/CLAUDE.md`, the project `CLAUDE.md` and `CLAUDE.local.md`, and the `SKILL.md` of every skill `analyze.py` reports as fired. `negative-space` and `skill-miss` are meaningless without it. Then `analyze.py <corpus> --steering` for the half that only the transcript carries — hook stdout, the skill listing, the tool and agent listings, MCP instructions. `steering-conflict` needs both halves and `--dump` on top.
4. **Run the lenses.** One sub-agent per lens for a multi-session corpus; inline for a single session. Each returns findings only — no edits.
5. **Score.** A finding survives only if it names a **specific transcript moment** (timestamp or quoted line) *and* a **specific rule or cheaper alternative**. Kill anything that is a general observation about how sessions could go better.
6. **Report** in chat, in the shape [REPORT-FORMAT.md](REPORT-FORMAT.md) specifies. Ranked, most-recurrent first. Every finding carries a count — "3 of 12 sessions" beats "sometimes".
7. **Offer dispositions** in one batched plain-text reply: fix now / file / skip per item. Never `AskUserQuestion`. Filing goes to `backlog file` for skill-quality items, to `papercut` for frictions, to `backlog spec` only if a finding is really project work.

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
