---
name: prototype
description: "Build a throwaway prototype to flesh out a design before committing — several working UI variations behind a picker, a runnable terminal app for state/logic questions, or competing technical approaches measured against one fixture. Use for spikes, mockup variants, and 'which approach should we use'."
---

# Prototype

A prototype is **throwaway code that answers a question**. The question decides the shape.

## Pick a shape

Identify which question is being answered — from the prompt, the surrounding code, or by asking if the
user is around:

- **"What should this look like?"** → [UI.md](UI.md). Several genuinely different working versions of
  one piece of UI, in a single standalone HTML file, flipped through with the picker. Built with
  `~/.claude/tools/artifact --kind prototype`.
- **"Does this logic / state model hold up?"** → [LOGIC.md](LOGIC.md). Tiny interactive terminal app
  that pushes the state machine through cases hard to reason about on paper. Runs in a visible window
  via the `terminal` skill's session mode.
- **"Which technical approach should we use?"** → [COMPARE.md](COMPARE.md). Two or three real
  implementations behind one interface, run against the same fixture. **Splits on what the answer
  is:** a number goes to `terminal` one-shot and gets measured; a look goes to the UI shape's picker
  with one variant per approach.

The three shapes produce very different artifacts — getting this wrong wastes the whole prototype. If
the question is genuinely ambiguous and the user isn't reachable, default by what the question is
about (a page or component → UI; a state model or data shape → logic; a library, storage, or
architecture choice → compare) and state the assumption at the top of the prototype.

## Layer the domain on top

The shape is the *mechanism*. The domain is the *mode of software* — it says what "realistic" and
"answered" mean here. Resolve it per [`_domains/_detect.md`](../_domains/_detect.md) (explicit
argument → `.claude/domain` marker → classify once), then load the cell **in addition to** the shape
file:

- `ui` → [`_domains/gui/prototype.md`](../_domains/gui/prototype.md) — the craft bar every variant clears,
  what realistic content means, the axes variants diverge on.
- `game` → [`_domains/game/prototype.md`](../_domains/game/prototype.md) — feel questions, the surfaces a
  game prototype runs on (Roblox scratch Place, canvas/three.js HTML file, native scratch target),
  playtest-by-hand instead of flip-and-compare.
- No marker → shape file only. A feature or technical spike is the generic path and needs no cell.

## Naming and versions — every shape, every round

A prototype topic gets **one kebab-case slug naming what the prototype is for**, chosen on the first
round and never changed: `wheelhouse-nav`, `settings-screen`, `queue-backend`. Everything for that
topic lives in `<repo-root>/tmp/claude/prototypes/<slug>/`.

Each round is a **version directory or file numbered `v1`, `v2`, `v3`** inside it:

```
tmp/claude/prototypes/wheelhouse-nav/v1.html      # UI: one file per round
tmp/claude/prototypes/wheelhouse-nav/v2.html
tmp/claude/prototypes/queue-backend/v1/run.ts     # logic & compare: one directory per round
tmp/claude/prototypes/queue-backend/v2/run.ts
```

Rules:

1. **The version number is the only thing that changes between rounds.** Never a word suffix — no
   `-riff`, `-revised`, `-v2-final`, `-new`, `-alt`, and no new adjective in the title. "Wheelhouse Nav
   Riff" is the bug this rule exists to stop.
2. **Pick the version by scanning the directory**: highest existing `vN` + 1. Round one is `v1`, even
   when nobody expects a second round.
3. **Never overwrite or delete an older version.** Old rounds stay so directions can be compared and
   walked back. Deletion happens once, at promotion, for the whole topic directory.
4. **The artifact title is `<Topic> v<N>`** — `--title "Wheelhouse Nav v2"`. Same topic words every
   round, only the number moves.
5. **Say what changed.** When handing over `v2`, open with one line naming what it does differently
   from `v1` and the path to both.

Variant names *inside* a round stay descriptive — "Quiet", "Editorial", "Dense". Those name directions
being compared at once; the version numbers the rounds.

## Rules for all three shapes

1. **The artifact never lives in production files.** Everything is written under
   `<repo-root>/tmp/claude/prototypes/<slug>/` (gitignored). No new route, no edit to an existing page,
   no entry added to `package.json` or the task runner. Nothing in the repo imports it. This is what
   makes a prototype free: there is nothing to accidentally ship and nothing to clean out of a real
   file.
   Domain exception: a surface that can't be a file (a Roblox Place) uses the scratch surface named in
   its domain cell, under the same "throwaway, never production" rule.
2. **One command, or one double-click.** UI opens directly in a browser — the `artifact` build step is
   agent-side, and what the user gets is still a single self-contained file. Logic and compare run with
   the project's existing runtime straight off the path — `bun tmp/claude/prototypes/queue/run.ts` —
   never by registering a script somewhere real.
3. **No persistence by default.** State is in memory. Persistence is what the prototype is *checking*,
   not something it depends on. If the question is about a DB, use a scratch file inside the prototype
   directory.
4. **Skip the polish.** No tests, no error handling beyond what makes it runnable, no abstractions, no
   "what if we later want".
5. **Surface the state.** After every action (logic), variant switch (UI), or run (compare), show the
   full relevant state so the user can see what changed.
6. **Realistic content, always.** Product-shaped copy, plausible names and numbers, real-sized data. No
   lorem ipsum, no `foo`/`bar`, no dead buttons, no "imagine this part here".
7. **Promotion is a rewrite.** Variant and spike code was written under these constraints — when a
   direction wins, implement it properly in the project's stack and conventions, then delete the
   prototype. Never move the file into the codebase.

## Arguments

| Invocation | Behavior |
| --- | --- |
| `<description>` | Full run of whichever shape the question implies |
| `<description>` + a count ("give me five") | Same, capped at 5 variants (UI) or 3 implementations (compare) |
| `riff <name>` | Next version: keep the harness and the slug, generate a fresh set diverging *around* the named variant's direction, written to the next `vN` |

`riff` is a verb for what to build, never a word that reaches a filename or title.

Any follow-up on a prototype already on disk — "riff", "try it denser", "what about tabs" — is a new
version of the same topic under the same slug, not a new prototype. Reuse the slug whenever the topic
matches; a new slug means a genuinely different thing is being prototyped.

Picking a winner needs no verb — say it in chat ("go with Dense") and the promote step runs.

## When done

The **answer** is the only thing worth keeping. Capture it somewhere durable (commit message, ADR in
`docs/adr/`, a tracked issue) along with the question it was answering and which version won — if the
user is around, that's a quick conversation; if not, leave `NOTES.md` in
`<repo-root>/tmp/claude/prototypes/<slug>/` with the verdict blank. Then delete the whole topic
directory, every version with it.

## Not this skill

- Judging or improving an interface that already exists → `ui-design` critique mode.
- Deciding whether a *layout* is right, when there's one design and the question is arrangement →
  `ui-design` sketch mode (cheaper: ASCII in chat). Come here when the question is *which direction*,
  and the axes in play are density, motion, personality, or interaction model — the things ASCII can't
  show.
- Picking a library for a web task → `_domains/gui/libraries.md` via `ui-design`. Don't burn a prototype
  on a question a curated list already answers.
