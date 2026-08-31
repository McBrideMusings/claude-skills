---
name: explain
description: "Explain something so the user gets it — a codebase subsystem (grounded with file:line tags) or a world-knowledge concept. Builds a visual HTML explainer by default; chat only when it's a few sentences and nothing structural."
---

# explain

Explain something so the user *gets it* — a subsystem in this repo, or a world-knowledge
concept.

**The default output is a hermetic HTML explainer file, opened locally.** Numbered
panels, hand-drawn diagrams from a shared symbol cast, grounded code snippets — a thing
the user can keep open beside their work. Build it unless the request is small enough
that a couple of sentences in chat genuinely finish the job.

## The reader

**An intelligent adult who knows nothing about *this topic* and everything else about
the world.** Never define a word from ordinary adult life — money, a file, a manager, a
customer. "Knows nothing" is scoped to the topic only.

State the calibration assumption in **one line**, then keep going — "Assuming you know
what a git repo is but have never opened `tool/explain` — tell me if I'm off." Never wait
for a reply, never interview. The refine loop at the end is the escape hatch if you
guessed wrong.

## Chat first

Before the file exists, the verbal walkthrough lands instantly in chat:

- Orient in one line — what this is and why it's shaped the way it is.
- The core in one plain sentence.
- Numbered steps, matching what will become the panels.
- The key term taught in place and **bolded** at the moment it's introduced, not defined
  up front in a glossary.
- One closing truth.

Then one soft lead-in line and the file. **The old version of this skill led with the
file; that's inverted now** — the gist belongs in chat so the user isn't forced into a
browser to learn the answer, and the file is where the depth lives.

## When chat alone is enough (the exception)

Answer in chat, no file, only when **all** of these hold:

- The answer fits in a few sentences — a definition, one flag's meaning, a single "why
  does X happen".
- Nothing about it is structural: no multi-step flow, no interacting modules, no
  comparison, no layered concept.
- The user won't want to return to it while they work.

If you answer in chat, hold to the same grounding bar as the artifact (below). End open —
the conversation continues. Offer the upgrade in one line: *"Want this as a visual HTML
explainer?"*

**Anything larger builds the file.** Multiple findings, a flow, an architecture, X vs Y,
a concept with layers, or an explicit "make me an explainer / as HTML / visual / diagram
this" — go straight to the artifact. When unsure, build it.

## `map` mode — where am I?

Folded in from the `zoom-out` skill on 2026-08-20. Two different questions live here:
**map** answers *where you are* in unfamiliar code; the rest of this skill answers *how X
works*. Map when lost, explain when curious.

Triggers: "zoom out", "give me the bigger picture", "map this area", "go up a level",
"I don't know this area", "show me how this fits".

Procedure — answer in chat, no artifact unless the user asks:

> Go up a layer of abstraction. Give a map of all the relevant modules and callers, using
> the vocabulary in `docs/CONTEXT.md`.
>
> If `docs/adr/` exists and any ADRs cover this area, surface them.

A map that grows past a screenful of prose is the signal to build the artifact instead —
using **The Map** archetype (below), not a Walk.

---

The rest of this skill is the artifact: **one hermetic `.html` file** built from a symbol
cast, plain HTML/CSS, and inline SVG, so the user can open it in a browser and *get it*.

## Two sources, one spine

- **B-mode — code explainer (primary).** A target in *this* repo: a file, a subsystem, a
  flow ("how the statusline auth works"). The spine is the same as A-mode, plus the
  **grounding layer** (below). This is what the skill is for.
- **A-mode — world-knowledge explainer.** A topic with no codebase ("explain Raft",
  "explain VAT"). No `file:line` tags; grounding degrades to "don't invent specifics — if
  a claim needs a current fact you don't hold, say so or look it up."

Sometimes a programming concept is better explained from world knowledge than from the
specific code — that's fine, that's A-mode applied to a code topic. Pick the source per
request.

**Evidence tiers.** Every factual claim is one of three things, and the reader can tell
which: **measured** (read from a file, a command's output, a rendered page — reproducible),
**derived** (computed from measured values), or **inferred** (a judgement about intent or a
gap you didn't read — stated as such, never as fact). Inventing a plausible value and
presenting it as measured is the one failure that makes the whole explainer worthless;
"roughly 50px, unmeasured" is useful, a made-up exact value is not. In B-mode the `.cite`
pill is what marks a claim measured. (Adapted from `jakubkrehel/skills`
`explain-interface`, MIT.)

## The hard rules (never break)

1. **Hermetic.** The output is a single `.html` file: zero network requests, no external
   libraries, no web fonts, no CDN. `tool/explain` enforces this and supplies the CSS and
   symbol cast — you write content only. See `CONTRACT.md`.
2. **No hallucinated code (B-mode).** Never describe a mechanism you haven't actually
   read. Every concrete code claim carries a `file:line` `.cite` pill rendered next to
   the panel it belongs to. The doc is a **map back into the code**, not a plausible
   story. If you didn't open it, you can't draw it.
3. **Two colours, not five.** Ink (`#111111`) for everything normal; brick red
   (`#C42A1C`) for the one thing the current panel is about. A failure or a gotcha is a
   dashed border/arrow plus a label — **never** a second hue. See `CONTRACT.md`.
4. **The panel titles ARE the explanation.** Plain subject-verb-object sentences.
   Reading only the `<h2>`s top to bottom must tell the whole story — this is a test the
   output has to pass before you hand it over.
5. **One action per panel.** Two actions in one panel means two panels. Richness comes
   from the sequence, never from density inside a single panel.
6. **Light only.** No theme toggle, no dark mode. The bright textbook look is the point.
7. **Local file only, default browser.** Written to disk, opened with bare
   `open <absolute-path>` — never `-a <app>`, never browser automation. Never published
   anywhere.

**Banned, always:** preamble ("great question", "let's get you up to speed"), "simply
put", "think of it like you're five", stacked analogies, walls of text, meta commentary
about the skill or the tool itself. Analogies are rationed — only when no plain word
exists, one sentence, adult analogies only; prefer the specific literal term.

## Workflow

### 1. Classify the archetype

Two shapes — see `ARCHETYPES.md`:

- **The Walk (default)** — a sequence: how something runs over time, or one idea laid
  out step by step. Numbered panels.
- **The Map** — structure in space: who talks to whom. The one thing panels can't show.

Comparison and Decision are not archetypes to classify into — they're a `.compare-table`
you drop into whichever spine fits. `ARCHETYPES.md` says this explicitly; don't
reintroduce a third shape.

### 2. Gather (B-mode)

Explore as far as needed to actually understand — read the real files, follow the
callers, use `docs/CONTEXT.md` vocabulary if it exists. Quality of the explainer is
capped by how well you understood the code. Do not start rendering until the mechanism
is clear and every claim you plan to make is backed by a file you've read. A-mode:
synthesize from knowledge; if a specific fact is shaky, flag it rather than invent it.

**Check the shared knowledge store.** If the topic maps to a label (`_domains/<label>/`)
this account already carries curated knowledge for, read the relevant cell and use it as
grounding context. Prefer it over parametric memory; it's the account's vetted take.

### 3. Infer the knobs

From the prompt, infer **archetype · depth · audience** (e.g. `explain eli5 how the
statusline auth works` → Walk, shallow, beginner). Don't interview — generate with the
inferred defaults. The refine loop (step 6) is the escape hatch.

### 4. Render

Read `CONTRACT.md` for the class vocabulary and the symbol cast, then **write a body
fragment — content only.** No doctype, no `<head>`, no reset, no type scale: the tool
supplies all of it. Assemble from the archetype skeleton (`ARCHETYPES.md`). Hand-author
every diagram as inline SVG using the symbol cast — **except quantitative data, which
is rendered by `tool/charts`, never hand-drawn** (genre table and the chart discipline
in `CONTRACT.md` §Charts; ≤20 numbers gets a `.compare-table` instead). Tag every
B-mode code claim with `file:line`.

Write the fragment to `/private/tmp/claude/<repo-slug>/explainers/<slug>.body.html`, then
build:

```bash
"$HOME/.claude/skills/explain/tool/explain" build \
  --title "<the title>" \
  --fragment /private/tmp/claude/<repo-slug>/explainers/<slug>.body.html \
  --out /private/tmp/claude/<repo-slug>/explainers/<slug>.html
```

`<repo>` is the ABSOLUTE repo root and `<slug>` a kebab-case topic slug. **Never a
cwd-relative `tmp/…`.** Resolve `<repo>` in its own Bash call —
`git rev-parse --show-toplevel` (if it errors/empty, use the absolute output of `pwd`).
The Bash working directory is NOT guaranteed to be the repo root; a bare
`/private/tmp/claude/<repo-slug>/explainers/…` lands the file under whatever subdir the
shell is in, so the `open <path>` you print won't match where it landed. If the path
doesn't start with `/`, it's the bug — the tool rejects a relative one rather than
guessing.

### 5. Verify, then open it

Serve and screenshot per `CRITIQUE.md` §Screenshot first, then look, then run its
checklist before handing over.

Then hand it over with **bare `open <absolute-path>`** and nothing else. No `-a`, no
`open -a Safari`, no `open -a "Google Chrome"`, no AppleScript, no browser-automation
tool — those override the user's default browser. Bare `open` hands the file to whichever
browser the user has actually set as their handler.

Emit the path on its own line, no trailing punctuation, so it stays ⌘-clickable.

Give the headline in chat too, per the "Chat first" section above — so the user isn't
forced into the browser to learn the answer. The file carries the depth; chat carries the
gist.

### 6. Refine in place

After it opens, offer cheap adjustments and **regenerate the same file in place**:
"deeper on X · simpler · shift focus to Y · shorter". Edit the fragment and re-run the
build to the same `--out`. No new files per refinement — overwrite the slug.

### 7. Keep (on request)

Ephemeral by default — `/private/tmp/claude/<repo-slug>/explainers/` is age-pruned with
the rest of `/private/tmp/claude/<repo-slug>/`. If the user says keep it:

- **Inside a repo** → move to `<repo>/docs/explainers/<slug>.html`.
- **Not in a repo** → move to `~/explainers/<slug>.html`.

Don't auto-keep; wait for the user to ask.

## Pruning

`/private/tmp/claude/<repo-slug>/explainers/` follows the account-wide tmp-file age
policy — prune files older than the standard window when the skill runs, same as other
`/private/tmp/claude/<repo-slug>/...` writers.

## When NOT to use

- The user wants a quick map of *where they are* in unfamiliar code → this skill's `map`
  mode (above), chat only.
- The user wants the code *changed*, reviewed, or debugged → that's `review` /
  `diagnose`, not an explainer.
- A one-line answer suffices → just answer in chat.

## Reference files

- `ARCHETYPES.md` — the two shapes: skeleton for each, and why Comparison/Decision
  aren't shapes anymore.
- `CONTRACT.md` — the class vocabulary, the two-colour rule, the type rules, the full
  symbol-cast table, and the fragment rules.
- `CRITIQUE.md` — the one-pass check between building and handing over.
- `specimens/spec-explainer.body.html` — a worked fragment in the current style; build it
  with the command in step 4 to see the tool run end to end.
- `tool/explain` — the builder. `tool/assets/base.css` and `tool/assets/symbols.html` are
  the two files that never enter the model's context.
