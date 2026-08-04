# Skills mode

Overrides to the code-mode workflow in `SKILL.md` — load alongside it.

When the reference is a skills repo, the harvest unit is a whole **skill**, not a technique. Same spine — acquire, sub-agent-per-reference, report, grill-me — with four phase overrides.

**Detect it:** the reference's payload is `SKILL.md`-structured skills (Anthropic's skill layout — a `skills/` tree of folders each holding a `SKILL.md` with `name`/`description` frontmatter), little or no application code. Auto-switch to skills mode, or take the user's explicit "harvest their skills".

**Phase 01 scope — whole-catalog is fine here.** Code mode refuses whole-repo comparisons because diffing two codebases file-by-file is noise. Skills are the opposite: each is a coarse, self-describing unit with a `name` and `description`, so cataloguing all of theirs is cheap and high-signal. Scan the whole skills catalog. Narrow to a domain only when the repo is large (dozens of skills) and the user named an area. Still restate the locked scope in one sentence.

**Phase 03 mapping — their skill → mine-or-gap.** For each of their skills, find your analog by capability, not name (their `to-prd` ↔ your `to-spec`). Each lands as **overlap** (you have one doing the same job — a comparison target) or **gap** (you have nothing — a copy/fold candidate). Read their `SKILL.md` descriptions first; open bodies only for skills that overlap or look worth taking.

**Phase 05 buckets — incorporation *proposals*, not bug/feature.** Each of their skills goes in exactly one bucket, and every bucket is a recommendation awaiting an answer. The default outcome for every skill is **take nothing** — a bucket is what you'd argue for, not what happens.

Each entry opens with **what their skill actually does**, two to four sentences in plain language: what it runs, what it touches, when it fires, what the user would see. Name the concrete commands and files (`df -h`, `whisper`, `.srt` next to the source) rather than the category ("disk hygiene", "media pipeline"). The user cannot judge "copy whole" on a skill whose behaviour they can't picture, and a name plus a bucket is not a description. Only after that does the entry say which bucket and why.

Buckets:

- **Copy whole** — a gap, self-contained, fits your workflow. Take the skill as-is, adapting frontmatter and paths to your conventions.
- **Merge into mine** — overlaps one of yours and does *one named part* better. Port that part into your existing skill; do not add a second skill (that would be an alias by another name). **Never propose replacing or rewriting one of your skills to match theirs.** The unit of a merge is a specific rule, section, or check you can quote from their file and point at the exact place in yours it would go — "add their unshipped-code rule to the compatibility-cruft entry in `review/axes/slop.md`", never "their version is better, adopt it". If you can't name the part and its destination file, it isn't a merge; it's a rewrite, and rewrites are out of scope for a harvest.
- **Fold as axis** — their skill is one context of a process an engine of yours already runs (a platform, a domain, an asset type). Drop it into the matching `_axis/` directory as a new file, not a new skill. This is the **axis split**; mechanics live in `writing-skills`. (`_generate/` was folded in from `majidmanzarpour/threejs-game-skills` this way.)
- **I have better** — you already do it as well or better. Note it, take nothing.
- **Reject** — doesn't fit your workflow, or is scope/tooling-specific to their setup. One line each.

Apply the portability filter as in code mode: "if I took this, would it fight what my skills are trying to be?" If yes, reject.

**Phase 08 terminal — incorporate, don't file issues.** The grill-me session walks the report skill by skill; on a yes it writes into the skills repo — copy-whole creates the new skill folder, merge edits the existing skill, fold-as-axis adds the `_axis/` file and updates that engine's `README.md`. Confirm the full slate before writing anything, then make the edits. (Where code mode ends by filing GitHub issues, skills mode ends by changing the skills repo.)

Three rules bind this session, and they override Phase 08's "grill only the contested routings" — in skills mode **every** item is contested:

1. **Nothing is taken by default. Every single skill gets its own explicit yes.** No item is ever skipped as "obvious": not a clean gap, not a tiny skill, not one the user already sounded warm on. Silence, "sounds good", and a yes to a different item are all *no*. Take the whole catalog as a slate of independent decisions and expect most of them to come back no — harvesting five skills and incorporating one is a normal, good outcome.
2. **Explain, then ask.** Each question opens by restating what that skill does in plain language — the same description the report carries, not a shorter one — before offering options. If the user has to ask "what does that one actually do?", the question was malformed. Rewrite and re-ask.
3. **Ask about the skill before asking about the mechanics.** The first question on any item is whether the user wants this capability at all. Only after a yes does it become worth asking how it should be shaped (health-gate vs install, which file a merge lands in, what gets adapted). Never open with a mechanics question — that quietly presupposes the yes.

**Report** — same file target and structure as Phase 06, with the buckets above swapped in for the code-mode buckets.
