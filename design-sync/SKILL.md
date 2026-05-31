---
name: design-sync
description: "Two-way sync between a Claude Code project and a Claude Design prototype (claude.ai/design). IMPORT (a reference is given — a .zip / standalone-HTML export, a claude.ai/design share link, or the output of Claude Design's native 'Handoff to Claude Code'): make the app match the prototype exactly — layout, typography, spacing, color, alignment, functionality — behind a hard ingestion-proof gate so it never builds from imagination when the prototype fails to load. EXPORT (no reference): generate a screenshots + brief + scoped-subdir package to seed a NEW Claude Design project from the existing app. ALWAYS invoke this skill (IMPORT mode) when the message is — or contains — the command Claude Design auto-generates for its 'Send to local coding agent' / 'Handoff to Claude Code' export. That paste looks like: 'Fetch this design file, read its readme, and implement the relevant aspects of the design. https://api.anthropic.com/v1/design/h/<id>?open_file=<file>' followed by a line 'Implement: <file>'. Treat ANY of these as a deterministic trigger: a URL on host api.anthropic.com with path /v1/design/, the phrase 'Fetch this design file' near 'implement the relevant aspects of the design', or a standalone 'Implement: <file>' handoff line. Other triggers: 'design sync', 'sync with Claude Design', 'import the prototype', 'match the Claude Design', 'Claude Design handoff', 'migrate to Claude Design', 'the design and code drifted apart'."
---

# Design Sync

Keep a Claude Code project and a **Claude Design** prototype in agreement. Claude Design (`claude.ai/design`, Anthropic Labs) is a conversational tool that produces **interactive prototypes** on a canvas. It exports as `.zip`, standalone HTML, PDF/PPTX, a shareable link, or a native **Handoff to Claude Code** (send to local agent / Claude Code Web). There is **no API** — this skill consumes what Claude Design exports and prepares what Claude Design can import; the user does the upload/link/paste step in the browser. Say that plainly; never imply you can push into Claude Design directly.

## Pick a branch

- **A reference to a Claude Design prototype is provided** (the auto-generated handoff command below, an `api.anthropic.com/v1/design/...` handoff URL, a `.zip`, a standalone-HTML file, a `claude.ai/design/...` share link, or code dropped by native Handoff) → [IMPORT.md](IMPORT.md). The prototype is **canonical**; make the app match it.
- **No reference** → [EXPORT.md](EXPORT.md). The app is canonical; generate a package to **seed a new Claude Design project** from it.

## The auto-generated handoff command (primary IMPORT input)

When the user picks **Send to local coding agent** in Claude Design's Export menu, it puts a command on the clipboard. Pasted, it looks like:

```
Fetch this design file, read its readme, and implement the relevant aspects of the design. https://api.anthropic.com/v1/design/h/J-qGy1PIzZn5j_-5oPcaEQ?open_file=index.html
Implement: index.html
```

The dynamic parts are the handoff id (`h/<id>`) and the target file (`open_file=<file>` / `Implement: <file>`). **Any message of this shape means: run IMPORT mode on that handoff URL** — don't treat it as a literal one-off instruction to blindly fetch-and-build. Parse it:

- **Handoff URL** — `https://api.anthropic.com/v1/design/h/<id>?open_file=<file>`. This is the *agent-facing* endpoint (the `h/<id>` is a handoff token granting access), so unlike a `claude.ai/design/...` web share link it is meant to be fetched directly. It still goes through the ingestion-proof gate.
- **Target file** — the `open_file=` query param and the `Implement: <file>` line name the primary entry file to focus on (e.g. `index.html`). Implement that file's screen first; read the bundle's README for the rest.

Two URL forms, treated differently:
- `api.anthropic.com/v1/design/...` → fetchable handoff endpoint. Happy path.
- `claude.ai/design/...` → authenticated human web link, usually won't fetch. If that's all you have, ask for the handoff command, a `.zip`, or a standalone-HTML export.

If the user used native **Handoff to Claude Code** and the prototype code is already on disk, point IMPORT at that directory instead of fetching.

## Non-negotiables for both branches

1. **Ingestion-proof gate — the whole reason this skill exists.** Before extracting or building anything, you must *actually render* the ground truth (the prototype in IMPORT, the running app in EXPORT) and write proof of it: `tmp/claude/design/INGESTION.md`, a table of every screen found, each row with a real screenshot path and a content hash (or DOM node count). **If you cannot produce that table with at least one real screenshot, STOP.** Tell the user the input didn't load and ask for a `.zip` or standalone-HTML export. Do not write a single line of UI code from the user's text description while pretending to hold the prototype — that is the exact failure this skill prevents. `claude.ai/design` share links are authenticated and usually won't fetch; treat a blank or login-wall render as "did not load."

2. **The Manifest is the interlingua.** Both directions read/write one file: `tmp/claude/design/manifest.md` — design tokens (exact color/type/spacing/radii/shadow/breakpoint values), an IA/route map, a per-screen layout spec, and a functionality list. It is the shared baseline that lets the two sides diff against each other over time. It lives under `tmp/claude/design/` (ephemeral, regenerated each run, never committed). Age out anything older than ~14 days.

3. **Never fake, never silently drop.** Claude Design invents things that won't work in a real app (fake-data tables implying a backend, animations that won't perform, layouts that break responsive, flows with no endpoint). Triage every element into implementable / questionable / can't-do and **surface the questionable + can't-do lists to the user before writing code** — don't quietly omit them and don't quietly fake them.

4. **Ground truth via Playwright, not WebFetch.** Use the Playwright MCP to render, enumerate screens, screenshot, and read computed styles. WebFetch strips JS/CSS and can't load auth-gated pages — never use it to "read" a prototype.

5. **Tokens are read, not guessed.** Pull exact px/hex/rem values from `getComputedStyle` (and from source — Tailwind config, CSS variables — when the export is code). "Looks about right" is what leaves 20% wrong.

## Artifacts (all under `tmp/claude/design/`)

- `INGESTION.md` — proof the ground truth actually loaded (gate)
- `manifest.md` — the shared design spec (tokens, IA, per-screen layout, functionality)
- `triage.md` — implementable / questionable / can't-do, with the open questions for the user
- `verification.md` — (IMPORT only) the final visual + numeric diff per screen
- `seed-brief.md` + `screenshots/` — (EXPORT only) the package to feed Claude Design
