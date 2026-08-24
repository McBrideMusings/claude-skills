---
name: explain
description: "Explain something so the user gets it — a codebase subsystem (grounded with file:line tags, never invented) or a world-knowledge concept. Builds a self-contained visual HTML explainer by default; drops to a plain chat answer only when a couple of sentences fully resolve it."
---

# explain

Explain something so the user *gets it* — a subsystem in this repo, or a world-knowledge concept.

**The default output is a hermetic HTML explainer file, opened locally.** Diagrams, semantic color, annotated code — a thing the user can keep open beside their work. Build it unless the request is small enough that a couple of sentences in chat genuinely finish the job.

## When chat alone is enough (the exception)

Answer in chat, no file, only when **all** of these hold:

- The answer fits in a few sentences — a definition, one flag's meaning, a single "why does X happen".
- Nothing about it is structural: no multi-step flow, no interacting modules, no comparison, no timeline, no layered concept.
- The user won't want to return to it while they work.

If you answer in chat, hold to the same bar as the artifact: ground every code claim in a file you actually opened and cite `file:line`; for world knowledge, cite a named source and flag any shaky fact instead of inventing it. Point to one primary source to go deeper. End open — the conversation continues.

Then offer the upgrade in one line: *"Want this as a visual HTML explainer?"*

**Anything larger builds the file.** Multiple findings, a flow, an architecture, X vs Y, a concept with layers, or an explicit "make me an explainer / as HTML / visual / diagram this" — go straight to the artifact. When unsure, build it.

## `map` mode — where am I?

Folded in from the `zoom-out` skill on 2026-08-20. Two different questions live here:
**map** answers *where you are* in unfamiliar code; the rest of this skill answers
*how X works*. Map when lost, explain when curious.

Triggers: "zoom out", "give me the bigger picture", "map this area", "go up a level",
"I don't know this area", "show me how this fits".

Procedure — answer in chat, no artifact unless the user asks:

> Go up a layer of abstraction. Give a map of all the relevant modules and callers,
> using the vocabulary in `docs/CONTEXT.md`.
>
> If `docs/adr/` exists and any ADRs cover this area, surface them.

A map that grows past a screenful of prose is the signal to build the artifact instead.

---

The rest of this skill is the artifact: **one hermetic `.html` file** that explains something using designed visuals (inline SVG diagrams, semantic color, infographics, annotated code) so the user can open it in a browser and *get it*.

## Two sources, one spine

- **B-mode — code explainer (primary).** A target in *this* repo: a file, a subsystem, a flow ("how the statusline auth works"). The spine is the same as A-mode, plus the **grounding layer** (below). This is what the skill is for.
- **A-mode — world-knowledge explainer.** A topic with no codebase ("explain Raft", "explain VAT"). No `file:line` tags; grounding degrades to "don't invent specifics — if a claim needs a current fact you don't hold, say so or look it up."

Sometimes a programming concept is better explained from world knowledge than from the specific code — that's fine, that's A-mode applied to a code topic. Pick the source per request.

## The hard rules (never break)

1. **Hermetic.** The output is a single `.html` file: zero network requests, **no external libraries** (no Mermaid/D3/Tailwind/Prism CDN), no web fonts. The `folio` tool enforces this and supplies the CSS — you write content. See `../_folios/CONTRACT.md`.
2. **No hallucinated code (B-mode).** Never describe a mechanism you haven't actually read. Every concrete code claim carries a `file:line` tag rendered next to the diagram node / step / statement. The doc is a **map back into the code**, not a plausible story. If you didn't open it, you can't draw it.
3. **Semantic color.** Color *encodes meaning* (data / control-flow / happy-path / danger / caution), defined once in the `explainer` kind — never decorative. The house look is fixed: don't override the role tokens. See `../_folios/CONTRACT.md`.
4. **Static-first.** Lightweight inline vanilla JS is allowed only where a dense section earns it (collapse/expand, tabbed concept↔code). No JS for anything that plain HTML can do.
5. **Local file only, default browser.** The explainer is written to disk and opened with bare `open <absolute-path>` — never with `-a <app>`, never via a browser-automation tool. Never publish it anywhere.

## Workflow

### 1. Classify the archetype

Pick the shape that fits — this tells you the skeleton and the signature diagram. See `ARCHETYPES.md`.

- **Process / Mechanism** — how something runs over time → step timeline + sequence diagram
- **Architecture / System** — how parts fit → module map + data-flow
- **Comparison / Tradeoff** — X vs Y → side-by-side + decision table
- **Concept** — one idea deeply → analogy anchor + layered "go deeper" reveals
- **Decision** — why a choice was made → forces → options → consequences

When unsure, default to **Process** for "how does X work" and **Architecture** for "how does X fit together".

### 2. Gather (B-mode)

Explore as far as needed to actually understand — read the real files, follow the callers, use `docs/CONTEXT.md` vocabulary if it exists. Quality of the explainer is capped by how well you understood the code. Do not start rendering until the mechanism is clear and every claim you plan to make is backed by a file you've read. A-mode: synthesize from knowledge; if a specific fact is shaky, flag it rather than invent it.

**Check the shared knowledge store.** If the topic maps to a label (`_domains/<label>/`) this account already carries curated knowledge for — an Apple/web/three.js stack, game or GUI design — read the relevant cell (e.g. `_domains/gui/design.md`, `_domains/apple/review.md`) and use it as grounding context. Prefer it over parametric memory; it's the account's vetted take.

### 3. Infer the knobs

From the prompt, infer **archetype · depth · audience** (e.g. `explain eli5 how the statusline auth works` → Concept, shallow, beginner). Don't interview — generate with the inferred defaults. The refine loop (step 6) is the escape hatch.

### 4. Render

Read `../_folios/CONTRACT.md` for the `explainer` class vocabulary, then **write a body fragment — content only.** No doctype, no `<head>`, no reset, no theme block, no type scale: the tool supplies all of it, which is why none of it costs you context in either direction. Assemble from the archetype skeleton (`ARCHETYPES.md`). Hand-author every diagram as inline SVG/CSS. Tag every B-mode code claim with `file:line`.

Keep the explanation itself to the same standard the chat tier holds: one thing at a time, scoped tight, calibrated to what the listener already knows, with one primary source to go deeper.

Write the fragment to `<repo>/tmp/claude/explainers/<slug>.body.html`, then build:

```bash
"$HOME/.claude/tools/explainer" build \
  --title "<the title>" \
  --fragment <repo>/tmp/claude/explainers/<slug>.body.html \
  --out <repo>/tmp/claude/explainers/<slug>.html
```

`explainer` has one look and no variants, so it takes no `--kind`, no picker, no rounds
and no device frames. That machinery belongs to `spike`, which shares the same
`_folios/` substrate — the tokens, the type scale, the class vocabulary and the
annotate/contrast/theme widgets are common to both.

`<repo>` is the ABSOLUTE repo root and `<slug>` a kebab-case topic slug. **Never a cwd-relative `tmp/…`.** Resolve `<repo>` in its own Bash call — `git rev-parse --show-toplevel` (if it errors/empty, use the absolute output of `pwd`). The Bash working directory is NOT guaranteed to be the repo root; a bare `tmp/claude/explainers/…` lands the file under whatever subdir the shell is in, so the `open <path>` you print won't match where it landed. If the path doesn't start with `/`, it's the bug. (The tool rejects a relative path rather than guessing.)

### 5. Verify, then open it

**Screenshot it and look at it.** A font falling back, an overlapping diagram, a blank section — none of that is visible in the source, and the path alone pushes the discovery onto the user. Check both themes; the file ships with a toggle.

Then launch it with **bare `open <absolute-path>`** and nothing else. No `-a`, no `open -a Safari`, no `open -a "Google Chrome"`, no AppleScript, no browser-automation tool — those override the user's default browser and drop the explainer in the wrong app. Bare `open` hands the file to whichever browser the user has actually set as their handler; naming a browser is always a bug here, even if a specific one seems safer.

Emit the path on its own line, no trailing punctuation, so it stays ⌘-clickable.

Give the headline in chat too — two or three sentences of what the explainer says — so the user isn't forced into the browser to learn the answer. The file carries the depth; chat carries the gist.

### 6. Refine in place

After it opens, offer cheap adjustments and **regenerate the same file in place**: "deeper on X · simpler · shift focus to Y · shorter". Edit the fragment and re-run the build to the same `--out`. No new files per refinement — overwrite the slug.

### 7. Keep (on request)

Ephemeral by default — `tmp/claude/explainers/` is age-pruned with the rest of `tmp/claude/`. If the user says keep it:

- **Inside a repo** → move to `<repo>/docs/explainers/<slug>.html` (committed on purpose, shareable with the team).
- **Not in a repo** → move to `~/explainers/<slug>.html`.

Don't auto-keep; wait for the user to ask.

## Pruning

`tmp/claude/explainers/` follows the account-wide tmp-file age policy — prune files older than the standard window when the skill runs, same as other `tmp/claude/...` writers.

## When NOT to use

- The user wants a quick map of *where they are* in unfamiliar code → use this skill's `map` mode (above).
- The user wants the code *changed*, reviewed, or debugged → that's `review` / `diagnose`, not an explainer.
- A one-line answer suffices → just answer in chat.

## Reference files

- `ARCHETYPES.md` — the five shapes: skeleton + signature diagram for each.
- `../_folios/CONTRACT.md` — the `explainer` class vocabulary, semantic-colour roles, fragment rules.
- `../_folios/README.md` — what the shared store is and why the tool exists.

## Other callers

`improve` renders its architecture review and improvement survey through this skill's
tool rather than owning a build of its own — the report is an explanation of findings,
and it uses the same tokens, type scale and `.diagram` / `.compare` / `.callout` /
`.legend` / `.cite` vocabulary. Its card and diagram spec lives in
`../improve/HTML-REPORT.md`; the build command and the verify-then-open steps are the
ones above.
