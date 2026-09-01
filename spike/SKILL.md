---
name: spike
description: "Build a throwaway prototype to settle a design or technical question — UI variations behind a picker, a greybox wireframe, competing TUI designs in the real toolkit (never an HTML mock), or competing approaches measured against one fixture. 'Artifact' means a prototype built here, never a hosted page. Use to prototype, mock up, wireframe, experiment, spike, or 'let me see it working first'."
---

# spike — throwaway builds that settle a question

A prototype is **throwaway code that answers a question**. The question decides the shape.

## "Artifact" means a prototype

When the user says **artifact**, they are asking for a prototype: this skill, a local file.
They do not mean Anthropic's hosted `Artifact` tool and they do not mean a hosted page.
Build it and hand back the path — don't explain the distinction, don't offer hosting as an
alternative, and don't treat the word as a reason to re-read the global ban.

The word carries no other freight. "Add this to the artifact", "update the artifact", "make
me an artifact of X" are all the same request: build or rebuild at a stable path.

The one thing that is *not* this skill: if the ask is to **explain how something works**
rather than to decide what it should look like, that is `explain`. Both build a hermetic
single-file page — similar shape, an annotate/contrast comment layer — but the two share
no code and no assets, each with its own tool: an explainer has one look and no variants,
so its tool owns neither the picker nor the device frames. `~/.claude/skills/spike/tool/spike`
owns both.

## Load this whenever a prototype is being built — including mid-conversation

This skill owns every prototype, however the request arrives. Load it when the user says *prototype, mockup, wireframe, "show me a few options", "what should this look like", "spike it", "which approach"* — and equally when that request lands in the middle of something else, which is the case it gets missed in. `grill-me` in particular ends with "and then make an HTML prototype": that sentence is an instruction to invoke this skill, not to start writing HTML.

Hand-writing a prototype instead of loading this skill loses the slug scheme, the Tweaks panel and its generated controls, the device frames, and the one-device-per-prototype rule. None of that is visible as an error — the file just quietly can't be iterated on. **If you can see exactly what to write, that is when to load this, not when to skip it.**

## Pick a shape

Identify which question is being answered — from the prompt, the surrounding code, or by asking if the user is around:

- **"What should this look like?"** → [UI.md](UI.md). Several genuinely different working versions of one piece of UI, in a single standalone HTML file, flipped through with the picker. Built with `~/.claude/skills/spike/tool/spike --kind prototype`.
- **"Where do the regions sit?"** → `--kind wireframe`, a greybox with colour withheld on purpose. This is the fidelity *below* a prototype, and `gui` sketch mode routes here when an ASCII layout can't carry the question — see [`../gui/SKETCH.md`](../gui/SKETCH.md), which owns when to escalate. The build command is UI.md's with the kind swapped; there are no variants and no picker.
- **"What should this terminal screen look like?"** → [TUI.md](TUI.md). Several working versions of one TUI screen in the real toolkit, flipped with a key, scaffolded by `~/.claude/skills/spike/tool/spike tui`. A terminal design is judged in a terminal: 80 columns, 16 theme-assigned colours and a keyboard the design owns are the whole question, and none of them exist in an HTML mock. Never build a TUI with `--kind prototype`.
- **"Does this logic / state model hold up?"** → [LOGIC.md](LOGIC.md). Tiny interactive terminal app that pushes the state machine through cases hard to reason about on paper. Runs in a visible window via the `terminal` skill's session mode.
- **"Which technical approach should we use?"** → [COMPARE.md](COMPARE.md). Two or three real implementations behind one interface, run against the same fixture. **Splits on what the answer is:** a number goes to `terminal` one-shot and gets measured; a look goes to the UI shape's picker with one variant per approach.

The shapes produce very different artifacts — getting this wrong wastes the whole prototype. If the question is genuinely ambiguous and the user isn't reachable, default by what the question is about (a terminal screen → TUI; another page or component → UI; a state model or data shape → logic; a library, storage, or architecture choice → compare) and state the assumption at the top of the prototype.

## Layer the domain on top

The shape is the *mechanism*. The domain is the *mode of software* — it says what "realistic" and "answered" mean here. Resolve it per [`_detect.md`](../_detect.md) (explicit argument → `.claude/domain` marker → classify once), then load the cell **in addition to** the shape file:

- `ui` → [`ref-gui/prototype.md`](../ref-gui/prototype.md) — the craft bar every variant clears, what realistic content means, the axes variants diverge on.
- `game` → [`ref-game-dev/prototype.md`](../ref-game-dev/prototype.md) — feel questions, the surfaces a game prototype runs on (Roblox scratch Place, canvas/three.js HTML file, native scratch target), playtest-by-hand instead of flip-and-compare.
- No marker → shape file only. A feature or technical spike is the generic path and needs no cell.

## One prototype, one device type

**A prototype targets exactly one device type, and the file is named for it.** A phone design, a desktop design and a TV design are three files, three slugs, three `--device` values — never one file switching between them.

```
/private/tmp/claude/<repo-slug>/spikes/wheelhouse-phone/wheelhouse-phone.html    --device phone
/private/tmp/claude/<repo-slug>/spikes/wheelhouse-desktop/wheelhouse-desktop.html --device desktop
/private/tmp/claude/<repo-slug>/spikes/wheelhouse-tv/wheelhouse-tv.html           --device tv
```

Why: a platform is an interaction model, not a width. Touch, pointer and remote-focus are different designs that happen to share a product, and one file holding all three spends every variant slot on "which platform" instead of on the question the prototype exists to answer. It also makes each file three times the size, and two thirds of it is always irrelevant to what is being looked at.

**`--device` takes one value and is required.** There is no list and no switcher — the harness builds that one frame and the panel's device group carries only the size readout, rotate and 1:1. `fill` is a device like any other: the window itself, unframed, for a design that is a page rather than an app. Rotation is not a second device: the `phone` and `tablet` frames rotate, and landscape is that frame's own control. A design that ships on a phone and a tablet is two builds, judged separately.

## Naming — every shape

A prototype gets **one kebab-case slug naming what it is for**, and the slug is the whole filename: `wheelhouse-phone`, `settings-desktop`, `queue-backend`. Everything for it lives in `/private/tmp/claude/<repo-slug>/spikes/<slug>/`.

**There are no rounds and no versions.** A rebuild replaces the file. Earlier attempts live in git if the file is committed, and nowhere if it is not — which is correct, because a prototype is throwaway. `?v=` is the only axis in the URL, and it means variant.

Rules:

1. **The slug is the whole filename.** Never a word suffix — no `-riff`, `-revised`, `-v2-final`, `-new`, `-alt` — and never a version in the name. "Wheelhouse Nav Riff" is the bug this stops.
2. **Rebuild to the same `--out`.** Refining a prototype is editing the fragment and building again over the top, never a second file.
3. **The artifact title is the topic alone** — `--title "Wheelhouse Phone"`. No version, no adjective.
4. **Say what changed.** When handing back a rebuild, open with one line naming what is different from the last time they looked at it.

Variant names stay descriptive — "Quiet", "Editorial", "Dense". They name directions being compared side by side right now, which is the only thing the picker is for.

## Rules for every shape

1. **The artifact never lives in production files.** Everything is written under `/private/tmp/claude/<repo-slug>/spikes/<slug>/` (gitignored). No new route, no edit to an existing page, no entry added to `package.json`, no committed task-runner entry. Nothing in the repo imports it. This is what makes a prototype free: there is nothing to accidentally ship and nothing to clean out of a real file.
   Domain exception: a surface that can't be a file (a Roblox Place) uses the scratch surface named in its domain cell, under the same "throwaway, never production" rule.
   `admin.toml` is the one carve-out, and only because it is globally gitignored and committed nowhere — see rule 10. A `package.json` script is still forbidden; that file ships.
2. **One command, or one double-click.** UI opens directly in a browser — the `spike` build step is agent-side, and what the user gets is still a single self-contained file. Logic and compare run with the project's existing runtime straight off the path — `bun /private/tmp/claude/<repo-slug>/spikes/queue/run.ts` — never by registering a script somewhere real.
3. **No persistence by default.** State is in memory. Persistence is what the prototype is *checking*, not something it depends on. If the question is about a DB, use a scratch file inside the prototype directory.
4. **Skip the polish.** No tests, no error handling beyond what makes it runnable, no abstractions, no "what if we later want".
5. **Surface the state.** After every action (logic), variant switch (UI), or run (compare), show the full relevant state so the user can see what changed.
6. **Realistic content, always.** Product-shaped copy, plausible names and numbers, real-sized data. No lorem ipsum, no `foo`/`bar`, no "imagine this part here".
7. **Every control is live.** Every tab switches, every toggle toggles, every row opens something, every destructive button shows what it would do — the reject path as much as the approve path. A dead control reads as a bug and derails the conversation the prototype exists to have. A control with nowhere to go does not go in.
8. **Name the device deliberately** (UI shape). `--device` is a judgement about this design, made fresh each time: `phone` for a phone surface, `desktop` for a desktop one, `tv` for a ten-foot one. It is required, so there is no default to accept — and never draw device chrome by hand, since the harness owns the status bar, notch, window title bar and browser chrome.
9. **Promotion is a rewrite.** Variant and spike code was written under these constraints — when a direction wins, implement it properly in the project's stack and conventions, then delete the prototype. Never move the file into the codebase.
10. **Wire an `admin prototype` action in the same pass that builds it**, on any project with an
    `admin.toml`, without asking — the manifest is committed nowhere, so it is never a commit
    question. One `prototype` command, one sub-target per prototype, named for the slug; delete
    the sub-target when the prototype goes. A prototype nobody can open is a prototype nobody
    looks at. **The shape, the two silent traps, and how to verify it: [ADMIN.md](ADMIN.md).**
11. **Variants diverge on one named axis** — structure, density, emphasis, type, or voice. Secondary
    choices follow from the primary position (a dense variant may take a smaller type step — that's
    coherence, not a second axis). Three variants that differ in accent colour teach nothing, and
    varying every axis at once produces unattributable results: you learn which you liked, not what
    made it work. (Adapted from `jakubkrehel/skills` `variant`, MIT.)
12. **Before handing any build over, run the critique pass** — [`CRITIQUE.md`](CRITIQUE.md).
13. **Every `ui` variant clears the severity floor** in
    [`ref-gui/review.md`](../ref-gui/review.md) — accessible names, keyboard reach, visible
    focus, nothing clipped at 320px, no meaning on colour alone — before it enters the picker. A
    variant that wins on looks and fails the floor is not a candidate; it's a bug with a nice
    surface. The floor is identical across variants — never an axis, never traded against one.

## Arguments

| Invocation | Behavior |
| --- | --- |
| `<description>` | Full run of whichever shape the question implies |
| `<description>` + a count ("give me five") | Same, capped at 5 variants (UI) or 3 implementations (compare) |
| `riff <name>` | Keep the harness and the slug, generate a fresh set diverging *around* the named variant's direction, rebuilt over the same file |

`riff` is a verb for what to build, never a word that reaches a filename or title.

Any follow-up on a prototype already on disk — "riff", "try it denser", "what about tabs" — is a new version of the same topic under the same slug, not a new prototype. Reuse the slug whenever the topic matches; a new slug means a genuinely different thing is being prototyped.

Picking a winner needs no verb — say it in chat ("go with Dense") and the promote step runs.

## When done

**Load [`show-shape`](../show-shape/SKILL.md) via the Skill tool before writing up which version won and what to build from it.** The verdict is a plan — it says what the real implementation should look like — and it is worth more when it carries the winning version's actual signatures and call shape than when it says "version B felt better".

The **answer** is the only thing worth keeping. Capture it somewhere durable (commit message, ADR in `docs/adr/`, a tracked issue) along with the question it was answering and which variant won — if the user is around, that's a quick conversation; if not, leave `NOTES.md` in `/private/tmp/claude/<repo-slug>/spikes/<slug>/` with the verdict blank. Then delete the whole topic directory.

## Handing one over — `spike-export`

To look at a prototype on a real phone, or to give it to someone who does not have
this repo, run `~/.claude/skills/spike/tool/spike-export`. It writes one folder
(default `~/Desktop/<slug>/`) holding four files:

```
<slug>.html     the device-framed build — open it on this Mac
index.html      no device frame, no Tweaks panel — what the phone renders
serve.command   double-click: opens Terminal, serves the folder on the LAN,
                prints the http://<lan-ip>:8080/ URL to type into the phone
README.md       standard, generated: what the folder is, how to view it on a
                phone, how to read the panel, how to send comments back
```

```bash
~/.claude/skills/spike/tool/spike-export \
  --fragment /abs/path/fragment.html --slug wheelhouse-phone \
  --title "Wheelhouse Phone" --device phone --dest ~/Desktop
```

**The bare copy is the reason this exists.** A phone drawing a phone frame inside a
phone answers nothing about how the design feels in the hand, and the Tweaks panel
covers the thing being judged. `--without viewport,checks,annotate,contrast` drops
the frame; the panel is generated from the fragment's own `atTweaks` calls rather
than being a widget, so it is hidden with `--extra-css` instead.

`PORT=9000 ./serve.command` overrides the port. Both devices must be on the same
Wi-Fi.

## Keeping one

Ephemeral by default — `/private/tmp/claude/<repo-slug>/spikes/` is age-pruned. If the user asks to keep it,
move it to `<repo-root>/docs/spikes/` inside a repo, or `~/spikes/` outside one. Don't
auto-keep.

**Never invent a second word for the store.** Everything this skill writes goes in
`/private/tmp/claude/<repo-slug>/spikes/`, kept builds in `docs/spikes/`. Not `prototypes/`, not `mockups/`,
not `artifacts/`, not `folios/` — the tool is `spike`, so the directory is `spikes`,
everywhere, no exceptions. (`explain` owns the parallel pair, `/private/tmp/claude/<repo-slug>/explainers/`
and `docs/explainers/`.)

## A committed prototype is UPDATED, never duplicated

`docs/spikes/<slug>/` is not an archive of prototypes that have been built — it is the
**current** reference the surface it depicts is measured against. So when the question is
about a surface that already has a kept prototype, the default is to open that prototype and
change it. Building a second one beside it is the exception and needs a reason.

This is the standard path for an interactive UI prototype embedded in a repo, not one option
among several:

1. **Look before you build.** `ls docs/spikes/` first. A slug naming the surface you are about
   to prototype is the one to edit.
2. **Edit the build in place, then re-shoot every frame the directory owns** — not only the
   frames your change touched. A directory holding one fresh frame and five stale ones is
   worse than one holding six stale frames, because nothing on disk marks which is which.
3. **Keep the slug and the frame names.** Tickets, project `verify` skills and doc tables cite
   them by path. A new slug orphans every citation, and a renamed frame stops resolving
   without erroring.
4. **Add a frame rather than a directory** when the change introduces a state the surface did
   not have before.

Build a *new* directory only when the surface itself is new, or when the question is
explicitly "this direction versus that one" and both must stand side by side — and then the
losing direction's frames come out once the question is settled.

## Tickets from a prototype

A prototype that a ticket slate is cut from is **reference material with an expiry**, and
the expiry is tracked, not remembered. When `to-tickets` (or any other pass) turns one
into issues:

1. It gets committed to `docs/spikes/<slug>/` — a directory, not a bare file — so every
   ticket can cite a path that resolves from any checkout.
2. **Screenshot every state into that same directory**, one PNG per named state:
   `empty.png`, `loading.png`, `error-rate-limited.png`, `populated.png`. The build stays
   canonical — a screenshot can't be clicked and rots faster than the thing it depicts —
   but a ticket that names a frame gives the agent a fixed target to compare against, and
   gives you something to check the result against without launching anything. Capture
   them with the `screenshot-checker` agent or the folios harness; never hand-wave a state
   you didn't render.
3. **File one last issue: delete it.** That issue depends on every other issue in the
   slate, so it surfaces as ready only once the work it described is done. Closing it
   removes the whole `docs/spikes/<slug>/` directory — build and screenshots together —
   and closes the loop.

Without step 3 the reference outlives its subject and starts contradicting the shipped
code. The dependency is what makes the cleanup arrive on its own instead of needing to be
noticed. Screenshots make step 3 more urgent, not less: a stale picture is argued with
more readily than stale markup.

**The teardown issue's dependencies make it *ready*, never *done*.** Those are different
facts and reading the first as the second deletes a live specification. A prototype is
discharged when a comparison against its frames actually passes — the four-step procedure a
project's `verify` skill owns — not when the tickets it produced are closed. An agent that
finds the teardown issue at the top of `bd ready` must run that comparison first and, if the
shipped surface still differs, leave the issue open and say which frames still do not match.
A slate can close in full against a prototype the code has never matched.

**Getting comments back.** Every build carries the comment layer: the user presses the
speech-bubble button (or `a`), marks things up, and presses **Copy comments**. The
markdown starts with `<!-- folio-feedback: <slug> -->`, so you can either ask them to
paste it, or wait for it — [`CONTRACT.md`](CONTRACT.md) § Getting
comments back has the `pbpaste` watcher. Say which you are doing.

## Not this skill

- Explaining how something already works → `explain`. Same substrate, different tool.
- Judging or improving an interface that already exists → `gui` critique mode.
- Deciding whether a *layout* is right, when there's one design and the question is arrangement → `gui` sketch mode (cheaper: ASCII in chat). Come here when the question is *which direction*, and the axes in play are density, motion, personality, or interaction model — the things ASCII can't show.
- Picking a library for a web task → `ref-gui/libraries.md` via `gui`. Don't burn a prototype on a question a curated list already answers.
