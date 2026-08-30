# Writing skills well

> Reference for writing and editing skills — the vocabulary and principles that make a
> skill predictable. Folded in from the standalone `writing-skills` skill on 2026-08-20.
> Read it before authoring or restructuring any skill.

A skill exists to wrangle determinism out of a stochastic system. **Predictability** — the agent taking the same _process_ every run, not producing the same output — is the root virtue; every lever below serves it.

**Bold terms** are defined in [`SKILL-GLOSSARY.md`](SKILL-GLOSSARY.md); look them up there for the full meaning.

## Invocation

Two choices, trading different costs:

- A **model-invoked** skill keeps a **description**, so the agent can fire it autonomously _and_ other skills can reach it (you can still type its name too). It contributes to **context load** — the description sits in the window every turn. Mechanics: omit `disable-model-invocation`, and write a model-facing description with rich trigger phrasing ("Use when the user wants…, mentions…").
- A **user-invoked** skill strips the description from the agent's reach: only you, typing its name, can invoke it — and no other skill can. Zero context load, but it spends **cognitive load**: _you_ are the index that must remember it exists. Mechanics: set `disable-model-invocation: true`; the `description` becomes human-facing — a one-line summary, trigger lists stripped.

Pick model-invocation only when the agent must reach the skill on its own, or another skill must. If it only ever fires by hand, make it user-invoked and pay no context load.

When user-invoked skills multiply past what you can remember, that piled-up cognitive load is cured by a **router skill**: one user-invoked skill that names the others and when to reach for each.

## Writing the description

A model-invoked **description** is a **context pointer**, and so is every line in this
`SKILL.md` that names a sibling file. Both are governed by [POINTERS.md](POINTERS.md) — the
three wording rules, the sharpen-before-inline ordering, and the measured read rates that
say why thinness is the forcing function. Read it before writing either.

## Information hierarchy

A skill is built from two content types — **steps** and **reference** — that mix freely: a skill can be all steps, all reference, or both. The core decision is which to use and where each sits on the **information hierarchy**, a ladder ranked by how immediately the agent needs the material:

1. **In-skill step** — an ordered action in `SKILL.md`, the primary tier: what the agent does, in order. Each step ends on a **completion criterion**, the condition that tells the agent the work is done. Make it _checkable_ (can the agent tell done from not-done?) and, where it matters, _exhaustive_ ("every modified model accounted for", not "produce a change list") — a vague criterion invites **premature completion**.
2. **In-skill reference** — a definition, rule, or fact in `SKILL.md`, consulted on demand. Often a legitimately flat peer-set (every rule of a review on one rung) — a fine arrangement, not a smell. _This skill is all reference._
3. **External reference** — reference pushed out of `SKILL.md` into a separate file, reached by a **context pointer**, loaded only when the pointer fires. (Spans _disclosed_ reference — a sibling file like `SKILL-GLOSSARY.md`, still part of the skill — through fully **external reference** that lives outside the skill system and any skill can point at.)

A demanding completion criterion drives thorough **legwork** — the digging the agent does within the work — whether the skill has steps or not, since "every rule applied" binds flat reference just as "every step done" binds a sequence.

Push too little down and the top bloats; push too much and you hide material the agent actually needs. That tension is the whole decision.

**Progressive disclosure** is the move down the ladder — out of `SKILL.md` into a linked file — so the top stays legible. Mechanics: a linked `.md` file in the skill folder, named for what it holds (this skill discloses its full definitions to `SKILL-GLOSSARY.md`). Some skills are used in more than one way, and each distinct way is a **branch** — different runs taking different paths through the skill. Branching is the cleanest disclosure test: inline what every branch needs, and push behind a pointer what only some branches reach. A **context pointer**'s _wording_, not its target, decides when and how reliably the agent reaches the material.

Where the ladder decides _how far down_ a piece sits, **co-location** decides _what sits beside it_ once there: keep a concept's definition, rules, and caveats under one heading rather than scattered, so reading one part brings its neighbours with it.

## When to split

**Granularity** is how finely you divide skills, and the first two cuts each spend one of the two loads, so split only when the cut earns it. Three cuts:

- **By invocation** — split off a **model-invoked** skill when you have a distinct **leading word** that should trigger it on its own, or another skill must reach it. You pay **context load** for the new always-loaded **description**, so that independent reach has to be worth it.
- **By sequence** — split a run of **steps** when the steps still ahead (a step's **post-completion steps**) tempt the agent to rush the one in front of it (**premature completion**). Keeping them out of view encourages the agent to do more **legwork** on the current task.
- **By axis** — the **axis split**. Keep ONE skill and split its _knowledge_, not the skill, into per-context files an engine reads at run time. The root **SKILL.md** stays a verb (`generate`, and the engines reading the merged domain store): it holds the how-to once and, per run, loads exactly the one axis file the context selects. The files live in a sibling `_axis/` directory (`_generate/`, `_domains/`) whose leading `_` and absent `SKILL.md` keep it from registering as its own skill. Reach for it when a skill does the same _process_ across many contexts (asset types, target platforms, knowledge domains) and only the reference differs per context — one engine, N thin axis files, each a `README.md`-documented set the engine dispatches over. Spends neither load: no new **description** (still one skill) and nothing for the human to remember (still one name). The cost it pays is indirection — the how-to and the per-context knowledge sit in different files — so it earns its place only when the contexts are numerous or growing enough that inlining them all would **sprawl** the root. Adding a context is then dropping one file into `_axis/`, which is also how a mined skill gets **folded in** (see `repo-analysis`).

## Reuse the existing axes — never hardcode what one already resolves

An axis is only worth its indirection if every skill actually goes through it. The moment one
skill hardcodes what the axis resolves, the axis stops being the single source of truth and
becomes a thing that has to be kept in step by hand — the exact cost the split was paying to
avoid. So when a skill you are writing touches one of these, route it:

| If the skill … | it reads | never hardcode |
| --- | --- | --- |
| creates, reads, closes, comments on, or labels a tracked item | [`../_tracker/_detect.md`](../_tracker/_detect.md) then the resolved backend's verb table | `gh issue …`, `bd …` |
| needs stack-specific knowledge (test framework, profiler, idioms) | [`../_domains/_detect.md`](../_domains/_detect.md) | a hardcoded stack assumption |
| needs mode-specific knowledge (game loop, UI craft, product layers) | [`../_domains/_detect.md`](../_domains/_detect.md) | a hardcoded domain assumption |

`gh pr …` is exempt from the tracker rule — pull requests are GitHub-only on every backend.

**Self-check before you finish a skill:** grep your draft for `gh issue` and `bd `. Every hit
should sit inside a branch that named its backend first. A bare `gh issue list` in a skill that
never resolved the backend is the bug — it silently reports an empty backlog on a beads repo,
where the issues are in a database `gh` cannot see.

## Pruning

Keep each meaning in a **single source of truth**: one authoritative place, so changing the behaviour is a one-place edit.

The **environment** is a source of truth too — `admin.toml`, `package.json` scripts, config files, the directory layout, `--help` output — and a document that restates it is a **cache**: a copy of a lookup, earning its load only when the lookup is expensive. Cache what the agent cannot find by looking: the unwritten convention, the reason behind a choice, the gotcha no config confesses. Leave the one-file, one-command lookups to the environment, where they cannot go stale.

Check every line for **relevance**: does it still bear on what the skill does?

Then hunt **no-ops** sentence by sentence, not just line by line: run the no-op test on each sentence in isolation, and when one fails, delete the whole sentence rather than trim words from it. Be aggressive — most prose that fails should go, not be rewritten.

## Leading words

A **leading word** is a compact concept already living in the model's pretraining that the agent thinks with while running the skill (e.g. _lesson_, _fog of war_, _tracer bullets_). Repeated throughout the text (though not necessarily - a strong leading word might only be needed once), it accumulates a distributed definition and anchors a whole region of behaviour in the fewest tokens, by recruiting priors the model already holds.

It serves predictability twice. In the body it anchors _execution_: the agent reaches for the same behaviour every time the word appears. In the description it anchors _invocation_: when the same word lives in your prompts, docs, and code, the agent links that shared language to the skill and fires it more reliably.

Hunt for opportunities to refactor skills to use leading words. A triad spelled out at three sites (**duplication**), a description spending a sentence to gesture at one idea — each is a passage begging to **collapse** into a single token. Examples include:

- "fast, deterministic, low-overhead" -> _tight_ — one quality restated across a phase — into a single pretrained word (a _tight_ loop).
- "a loop you believe in" -> _red_ — converts a fuzzy gate into a binary observable state (the loop goes _red_ on the bug, or it doesn't).

You win twice over: fewer tokens, _and_ a sharper hook for the agent to hang its thinking on. Assume every skill is carrying restatements that leading words retire — go find them.

## Failure modes

Use these to diagnose issues the user may be having with the skill.

- **Premature completion** — ending a step before it's genuinely done, attention slipping to _being done_. Defence, in order: sharpen the completion criterion first (cheap, local); only if it is irreducibly fuzzy _and_ you observe the rush, hide the post-completion steps by splitting (the sequence cut). **Hiding only works across a real context boundary** — a hand-off, a relay, or a subagent dispatch. An inline `Skill()` call leaves the later steps sitting in the same window and clears nothing, so the split buys nothing there.
- **Duplication** — the same meaning in more than one place. Costs maintenance and tokens, and inflates a meaning's prominence on the ladder past its real rank.
- **Sediment** — stale layers that settle because adding feels safe and removing feels risky. The default fate of any skill without a pruning discipline.
- **Sprawl** — a skill simply too long, even when every line is live and unique. Hurts readability and maintainability and wastes tokens. The cure is the ladder: disclose **reference** behind pointers, and split by **branch** or sequence so each path carries only what it needs.
- **No-op** — a line the model already obeys by default, so you pay load to say nothing. The test: does it change behaviour versus the default? The commonest form is a **bare quality adjective** — _be thorough_, _very detailed_, _easy to read_, _be rigorous_ — exhorting toward a subjective target the agent already aims at, with no actionable bar. The baseline includes what the skill has _already_ established: _be rigorous_ is a no-op in a skill whose process is already rigorous, even if it would bite in a bare prompt. A weak leading word (_be thorough_ when the agent is already thorough-ish) is the same failure; the fix is a stronger word (_relentless_), not a different technique.
- **Negation** — steering by prohibition drags the forbidden behaviour into context and makes it _more_ available, not less. _Don't think of an elephant_, and the elephant is all there is: the negation is a weak modifier that the strongly-activated concept overruns, so the ban half-reads as an instruction to do the thing. **Prompt the positive** — state the target behaviour (_write one-line comments_) so the banned one is never spoken. A prohibition earns its place only as a hard guardrail you cannot phrase positively; even then, pair it with the positive target so attention lands on what to do.

## Precision before addition

Before adding a rule, section or file, pick one of five and say which: **replace** a rule that is vague or points at the wrong behaviour, **narrow** one that is mostly right but over-triggers, **move** content that belongs in another file, **delete** what repeats another rule or no longer changes behaviour, or **add** — only when no existing rule can cover it without becoming less precise.

Adding without considering the other four is how **sediment** and **duplication** arrive, and duplication is the condition that later produces a contradiction. Run this before the edit and again after.

---

## Audit mode

For `improve`'s `skills` aspect: no writes, no commits, no questions. Judge one skill directory at a time and return findings.

Everything above is the authoring contract — it says what to write and why. Audit mode reads the same principles backwards: each becomes a question asked of a skill that already exists. Run the ten axes in [aspects/skills.md](aspects/skills.md); this file supplies the vocabulary behind them.

**Scope boundary.** This judges a skill **in isolation**, as if it were the only one loaded. Two skills that contradict each other in the same session is a real failure and not this one's — route it to `audit-session`'s [steering-conflict](../audit-session/axes/steering-conflict.md) lens, which can see which sources actually landed together.

**Read the skill in full first, including its sibling files.** A finding that does not quote the skill's own line is not a finding. Same rule `claude-md` carries, same reason: a clause judged out of context routinely contradicts one three sections down.

Each finding: the **gap**, **evidence** (the quoted line), **fix** (the concrete rewrite — for a missing gate, the artifact that proves the step ran), **strength** (`Strong` / `Worth exploring` / `Speculative`). Card fields per [HTML-REPORT.md](HTML-REPORT.md).
