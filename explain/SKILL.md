---
name: explain
description: "Explain something so the user gets it — a subsystem in this codebase, or a world-knowledge concept. Default is a plain-language explanation in chat; escalates to a self-contained visual HTML explainer (inline diagrams, infographics, annotated code) when the topic is structurally visual or dense, or when the user asks. Explaining OWN code is grounded with file:line tags, never invented. Triggers: 'explain this', 'explain how X works', 'walk me through X', 'eli5 X', 'make me an explainer', 'visual explainer', '/explain'."
---

# explain

Explain something so the user *gets it* — a subsystem in this repo, or a world-knowledge concept. Two tiers: a plain chat explanation by default, a designed hermetic HTML artifact when the topic earns it.

## Tier 1 — explain in chat (default)

Most of the time, just explain it well in the conversation. No file. Hold every explanation to:

- **Ground it, don't guess.** Pull from what you've actually read (B-mode: real files) or from high-trust sources (A-mode), not parametric vibes. Cite as you go — `file:line` for code, a named source for world knowledge. If a specific fact is shaky, say so rather than invent it.
- **Check the shared knowledge stores.** If the topic maps to a platform (`_platforms/<p>/`) or a mode of development (`_domains/<d>/`) this account already carries curated knowledge for — an Apple/web/three.js stack, game or UI design — read the relevant cell (e.g. `_domains/ui/design.md`, `_platforms/apple/review.md`) and use it as grounding context before explaining. Prefer it over parametric memory; it's the account's vetted take.
- **One thing, low load.** Explain the single thing asked, scoped tight. Difficulty is the enemy of understanding — it eats the working memory the user needs to follow you. Strip everything not required to get *this* across.
- **Calibrate to the listener.** Infer what they already know from the conversation and meet them just past it. An `eli5` gets an analogy anchor; a senior asking about a race condition gets the mechanism. Don't over- or under-shoot.
- **Point to one primary source** to go deeper — the single most high-trust file, doc, paper, or talk on the topic. One good pointer beats five.
- **Invite follow-ups.** You're their explainer; the conversation continues. End open.

For B-mode (this repo), the grounding rule is the same hard rule as Tier 2: every concrete code claim is backed by a file you actually opened — cite `file:line`. Never describe a mechanism you haven't read.

After the chat explanation, if a diagram or visual structure would genuinely add something, offer the escalation in one line: *"Want this as a visual HTML explainer?"* — don't assume it.

## When to escalate to the HTML artifact (Tier 2)

Escalate when **any** of these holds:

- **The user asks** — "make me an explainer", "as HTML", "visual", "diagram this".
- **The topic is structurally visual** — a multi-step flow, an architecture with several interacting modules, a comparison matrix, a timeline, layered "go deeper" concept reveals. A diagram carries what prose can't.
- **It's dense enough to keep open** — the user will want to return to it while they work, not scroll back through chat.

Stay in chat for a definition, a single mechanism, a "why does X happen" — anything a few sentences resolve. When unsure, default to chat and *offer* the upgrade.

> `explain` (chat tier) overlaps `zoom-out`, but they answer different questions: `zoom-out` maps *where you are* in unfamiliar code (relevant modules + callers); `explain` makes you *understand how X works*. Reach for `zoom-out` when lost, `explain` when curious.

---

The rest of this skill is the **Tier 2** artifact: produce **one hermetic `.html` file** that explains something using designed visuals (inline SVG diagrams, semantic color, infographics, annotated code) so the user can open it in a browser and *get it*.

## Two sources, one spine

- **B-mode — code explainer (primary).** A target in *this* repo: a file, a subsystem, a flow ("how the statusline auth works"). The spine is the same as A-mode, plus the **grounding layer** (below). This is what the skill is for.
- **A-mode — world-knowledge explainer.** A topic with no codebase ("explain Raft", "explain VAT"). No `file:line` tags; grounding degrades to "don't invent specifics — if a claim needs a current fact you don't hold, say so or look it up."

Sometimes a programming concept is better explained from world knowledge than from the specific code — that's fine, that's A-mode applied to a code topic. Pick the source per request.

## The hard rules (never break)

1. **Hermetic.** The output is a single `.html` file: zero network requests, **no external libraries** (no Mermaid/D3/Tailwind/Prism CDN), no web fonts. CSS in `<style>`, all diagrams as inline `<svg>` or CSS, system-font stack. It must render identically offline, on a plane, in five years. See `DESIGN-SYSTEM.md`.
2. **No hallucinated code (B-mode).** Never describe a mechanism you haven't actually read. Every concrete code claim carries a `file:line` tag rendered next to the diagram node / step / statement. The doc is a **map back into the code**, not a plausible story. If you didn't open it, you can't draw it.
3. **Semantic color.** Color *encodes meaning* (data / control-flow / happy-path / danger / caution), defined once in the design system — never decorative. See `DESIGN-SYSTEM.md`.
4. **Static-first.** Lightweight inline vanilla JS is allowed only where a dense section earns it (collapse/expand, tabbed concept↔code). No JS for anything that plain HTML can do.

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

Explore as far as needed to actually understand — read the real files, follow the callers, use `docs/CONTEXT.md` vocabulary if it exists. Quality of the explainer is capped by how well you understood the code. Do not start rendering until the mechanism is clear and every claim you plan to make is backed by a file you've read. A-mode: synthesize from knowledge; if a specific fact is shaky, flag it rather than invent it. If the topic maps to a `_platforms/<p>/` or `_domains/<d>/` cell (see the store-consult bullet in Tier 1), read it too.

### 3. Infer the knobs

From the prompt, infer **archetype · depth · audience** (e.g. `explain eli5 how the statusline auth works` → Concept, shallow, beginner). Don't interview — generate with the inferred defaults. The refine loop (step 6) is the escape hatch.

### 4. Render

Clone `assets/scaffold.html` and fill it. The scaffold already wires the hermetic structure, the semantic-color tokens, `prefers-color-scheme` light/dark, and the component classes. Assemble from the component kit (`DESIGN-SYSTEM.md`) and the archetype skeleton (`ARCHETYPES.md`). Hand-author every diagram as inline SVG/CSS. Tag every B-mode code claim with `file:line`.

Write to **`<repo>/tmp/claude/explainers/<slug>.html`**, where `<repo>` is the ABSOLUTE repo root. **Never write to a cwd-relative `tmp/…`.** Resolve `<repo>` in its own Bash call — `git rev-parse --show-toplevel` (if it errors/empty, use the absolute output of `pwd`) — and pass the absolute `<repo>/tmp/claude/explainers/…` to `mkdir`/`Write`/`open`. The Bash working directory is NOT guaranteed to be the repo root (an earlier `cd` may have left it in a subdirectory); a bare `tmp/claude/explainers/…` would land the file under whatever subdir the shell is in, so the `open <path>` you print won't match where it landed. If the path doesn't start with `/`, it's the bug. `<slug>` is a kebab-case topic slug.

### 5. Open it

Launch it for the user: `open <path>` on macOS. Emit the path on its own line, no trailing punctuation, so it stays ⌘-clickable.

### 6. Refine in place

After it opens, offer cheap adjustments and **regenerate the same file in place**: "deeper on X · simpler · shift focus to Y · shorter". No new files per refinement — overwrite the slug.

### 7. Keep (on request)

Ephemeral by default — `tmp/claude/explainers/` is age-pruned with the rest of `tmp/claude/`. If the user says keep it:

- **Inside a repo** → move to `<repo>/docs/explainers/<slug>.html` (committed on purpose, shareable with the team).
- **Not in a repo** → move to `~/explainers/<slug>.html`.

Don't auto-keep; wait for the user to ask.

## Pruning

`tmp/claude/explainers/` follows the account-wide tmp-file age policy — prune files older than the standard window when the skill runs, same as other `tmp/claude/...` writers.

## When NOT to use

- The user wants a quick map of *where they are* in unfamiliar code → use `zoom-out`.
- The user wants the code *changed*, reviewed, or debugged → that's `review` / `diagnose`, not an explainer.
- A one-line answer suffices → just answer in chat.

## Reference files

- `DESIGN-SYSTEM.md` — hermetic constraints, semantic-color tokens, component vocabulary.
- `ARCHETYPES.md` — the five shapes: skeleton + signature diagram for each.
- `assets/scaffold.html` — the hermetic starter template to clone and fill.
