# `sketch` mode

The default medium for UI design discussions in this account. Use ASCII art in chat to communicate
layout decisions; emit a sibling empty Monodraw stub on disk so the user can draw an alternative
visually if the ASCII proposal isn't quite right.

## When to reach for sketch

- The user describes a UI change, layout, modal, panel, dialog, form, or component.
- A plan file is being written and design decisions came up in conversation.
- The user says "sketch this", "design this", "lay this out", or invokes `/gui`.
- A code change is touching layout-relevant code (CSS grid, flexbox, modal markup, dialog components).

## What to produce

Every sketch produces **both**:

### Output 01 — ASCII Sketch in Chat

Render the proposed layout using box-drawing characters and a consistent vocabulary:

- **Boxes**: `┌─┐ │ └─┘` for borders, `┏━┓ ┃ ┗━┛` for emphasis, `╭─╮ │ ╰─╯` for rounded
- **Dividers**: `├─┤` for horizontal, `┬─┴` for T-junctions
- **Form controls**: `◯` empty radio, `⦿` selected radio, `☐` empty checkbox, `☑` checked
- **Buttons**: `[ Label ]` for buttons, `[[ Primary ]]` for primary action
- **Region labels**: caps inside the box (e.g. `SOURCE`, `TARGET`, `ACTION`)
- **Annotations**: lowercase descriptions outside the box, with arrows `←` `→` `↑` `↓` if pointing at something

When `mcp-monodraw` is configured, use its `mcp__monodraw__create_ascii_art` tool for typed shapes (box, flowchart, sequence, architecture, table, tree). For freeform layouts, hand-author the ASCII — it's usually faster and more precise.

Render the *part being decided*, not the whole app. A modal redesign shows the modal, not the surrounding page. A sidebar tweak shows the sidebar with brief context, not the entire layout.

### Stay on layout — don't drift into implementation

Sketch mode is for layout decisions. It is NOT for implementation planning. After the sketch:

- Do NOT explain how the change would be wired up (data flow, state machines, which function produces which value, what `Re-detect` should now do, etc.).
- Do NOT enumerate visual-vocabulary tables, design-token catalogs, or row-priority lists *unless the user asked for that artifact specifically*. A sketch that needs a legend to be understood is a sketch that's trying to decide too much at once.
- Do NOT tee up the next step ("I'll start implementing X to match this sketch"). End the message after the sketch + stub path. The user decides what comes next.

If implementation questions came up while sketching, note them in one line ("flag: this implies a new `audioSuggestedTitles` slot — separate conversation") and stop. Do not expand them inline.

### One decision per sketch — states vs alternatives

A sketch presents *one* layout decision. When multiple frames are needed, be explicit about which kind:

- **State variants** ("here's how the same layout looks in five different data states"): label as `State: clean`, `State: 1 pending edit`, `State: dropped`, etc. Make clear these are renderings of one design across data, not options to pick from.
- **Alternative options** ("here are three layouts to choose between"): label as `Option A`, `Option B`, with a one-line summary of what each is trading off. Cap at 3 — more than that is a brainstorm, not a decision.
- **Mixed** (alternatives × states) is almost always a sign the sketch is trying to do too much. Pick the highest-leverage state, sketch alternatives for *just that state*, and defer the rest.

Default to the smallest sketch that lets the user say yes/no. Six labelled frames is rarely the smallest sketch.

### Output 02 — Sibling .monojson Stub on Disk (opt-in)

**Do not emit the stub unless the user asks for a canvas.** When the ASCII sketch answers the question, the file is pure confusion — and it has already misfired: a user opened it expecting the sketch, found a blank document, and reasonably concluded the export was broken. It cannot ever contain the sketch. Monodraw's CLI is render-only with no import flag, so there is no path from ASCII back into a Monodraw file.

Emit it when the user asks to redraw, asks for a canvas, or pushes back on the layout in a way that means they want to move things themselves.

Write an empty Monodraw canvas to `<repo-root>/tmp/claude/sketches/<YYYY-MM-DD>-<HHMM>-<slug>.monojson` and print the path in chat so the user can click it in Ghostty to open Monodraw.

**Slug rules:**
- kebab-case
- max 40 characters
- describes the design topic, not the file purpose (e.g. `conflict-modal-action-column`, not `sketch-1`)

**Example path:** `<repo-root>/tmp/claude/sketches/2026-05-05-1430-conflict-modal.monojson`

> **⛔ RESOLVE `<repo-root>` TO AN ABSOLUTE PATH — NEVER A CWD-RELATIVE `tmp/…`.** The Bash tool's working directory is NOT guaranteed to be the repo root — an earlier `cd` may have left it in a subdirectory (`apps/foo`, `packages/bar`). A bare `tmp/claude/sketches/…` therefore drops the stub under whatever subdir the shell happens to be in, NOT the repo root, and the user won't find it where you told them.
>
> Resolve it in ITS OWN Bash call and reuse the absolute result verbatim:
> ```bash
> git rev-parse --show-toplevel   # → the absolute repo root; if it errors/empty (not a git repo), use the absolute output of `pwd` instead
> ```
> Every `mkdir`, `cp`, `Write`, and printed path below MUST be the absolute `<repo-root>/tmp/claude/sketches/…` from that result. If a path you're about to pass to Bash does not begin with `/`, STOP — it's the bug.

**How to create the stub:** (substitute the absolute `<repo-root>` you resolved above — every path here is absolute, none is relative to the current directory)

```bash
mkdir -p <repo-root>/tmp/claude/sketches
cp ~/.claude/skills/gui/seed.monojson \
   <repo-root>/tmp/claude/sketches/$(date +%Y-%m-%d-%H%M)-<slug>.monojson
```

Use the actual slug, not the placeholder. The seed is a valid empty canvas; the user draws into it.

**How to communicate the path to the user:**

After writing the stub, print one line in chat with the full absolute path so it's clickable in Ghostty. The path MUST be the last token on its line with **no trailing punctuation** (`.`, `,`, `)`, etc.) — Ghostty grabs the contiguous run under the cursor and a trailing character breaks the open:

```
Blank canvas to redraw in: <repo-root>/tmp/claude/sketches/2026-05-05-1430-conflict-modal.monojson
```

**Say it is blank, on the line that hands it over.** "Stub:" tells the user nothing about what is inside, so they open it expecting the sketch. Naming it a blank canvas makes the emptiness the stated purpose rather than a surprise.

In a follow-up sentence (not on the same line as the path), tell the user they can ⌘-click that path in Ghostty to open it in Monodraw, draw an alternative, save, and let you know.

## Escalating to a rendered greybox

ASCII is the default because it's instant and disposable. It runs out when the answer depends on
**proportion** — how wide the sidebar actually is next to the content, how a card grid wraps at a real
width, how far down the page the third region sits, whether a column of numbers fits. Monospace cells
can't show any of that honestly, so a yes/no given against ASCII would be answering a different
question.

When that's where you are, build a greybox wireframe:

```bash
"$HOME/.claude/tools/folio" build \
  --kind wireframe \
  --title "<what's being laid out>" \
  --fragment <repo-root>/tmp/claude/artifacts/<slug>.body.html \
  --out <repo-root>/tmp/claude/sketches/<YYYY-MM-DD>-<HHMM>-<slug>.html
```

Class vocabulary — `.wf-region`, `.wf-label`, `.wf-ph`, `.wf-text`, `.wf-control`, `.wf-note`,
`.wf-grid` — is in `../_folios/CONTRACT.md`.

**It stays a sketch.** The `wireframe` kind withholds colour deliberately: no brand palette, no
imagery, no type personality. The moment a wireframe looks designed, the feedback you get is about the
style instead of the arrangement, and you've spent a prototype's effort to get a sketch's answer wrong.
Everything in "stay on layout" above still applies.

**Screenshot it and look at it** before handing it over, then print the path. Same absolute-path rule
as the stub.

The `.monojson` stub follows the same opt-in rule as above — write it only if the user asks for a canvas, not by default.

## Reading the user's edits

When the user says "I edited it" / "take a look" / "I drew it":

1. Read the file via the `mcp__monodraw__export_diagram` tool (or fall back to `/usr/local/bin/monodraw <path>` via Bash)
2. Render the result inline in the reply to enable direct reference
3. Respond to what was actually drawn — what changed, what tradeoffs the user made, whether the layout has issues

## Inline-in-plan rule

When writing or editing a plan file (under `<repo-root>/tmp/claude/plans/` or a project's `docs/`) and the conversation included design decisions, embed the ASCII sketch directly in the plan under a `## Design` or `### Layout` heading. Plan files for design work must visually communicate what was decided, not just describe it.

The `.monojson` stub does NOT go into the plan — only the ASCII rendering. Reference the stub path in a "Working files" or "Artifacts" section if relevant.

## Cleanup

Before writing each new stub, prune the directory:

1. List `<repo-root>/tmp/claude/sketches/*.monojson`
2. Delete any file whose `<YYYY-MM-DD>` prefix is more than 30 days before today
3. If the directory still has more than 50 `.monojson` files, delete oldest until 50 remain (sort by filename, which is chronologically ordered)

A single `find` invocation handles the date-based prune:

```bash
find <repo-root>/tmp/claude/sketches -name "*.monojson" -mtime +30 -delete
```

For the count cap, list and trim:

```bash
ls -1t <repo-root>/tmp/claude/sketches/*.monojson 2>/dev/null | tail -n +51 | xargs rm -f
```

Run both before writing the new stub. Don't announce the cleanup unless something unusual happened.

## Notes

- The .monojson format is a UUID-referenced object graph. Do NOT attempt to author non-trivial .monojson files by hand — only the seed (empty canvas) is hand-authorable. The user is the only writer of meaningful .monojson content; you only read.
- The Monodraw CLI (`/usr/local/bin/monodraw`) is render-only: `.monojson` → ASCII. It cannot import ASCII back into a `.monojson`. Don't try.
- If `mcp-monodraw` is not configured in the current project, fall back to invoking the CLI via Bash — the workflow still works, just with one fewer convenience.
- If the user asks for ASCII without a Monodraw round-trip ("just sketch it"), skip the stub-file step. The ASCII alone is sometimes enough.
