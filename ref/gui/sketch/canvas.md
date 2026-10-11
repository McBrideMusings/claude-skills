# A blank Monodraw canvas beside a sketch

Part of [`sketch.md`](../sketch.md) — an ASCII layout in chat comes first.

**Do not emit the stub unless the user asks for a canvas.** When the ASCII sketch answers the question, the file is pure confusion — and it has already misfired: a user opened it expecting the sketch, found a blank document, and reasonably concluded the export was broken. It cannot ever contain the sketch. Monodraw's CLI is render-only with no import flag, so there is no path from ASCII back into a Monodraw file.

Emit it when the user asks to redraw, asks for a canvas, or pushes back on the layout in a way that means they want to move things themselves.

Write an empty Monodraw canvas to `/private/tmp/claude/<repo-slug>/sketches/<YYYY-MM-DD>-<HHMM>-<slug>.monojson` and print the path in chat so the user can click it in Ghostty to open Monodraw.

**Slug rules:**
- kebab-case
- max 40 characters
- describes the design topic, not the file purpose (e.g. `conflict-modal-action-column`, not `sketch-1`)

**Example path:** `/private/tmp/claude/<repo-slug>/sketches/2026-05-05-1430-conflict-modal.monojson`

`/private/tmp/claude/<repo-slug>` is the directory `~/.claude/tools/repo-slug --path` prints.

**How to create the stub:**

```bash
mkdir -p /private/tmp/claude/<repo-slug>/sketches
cp ~/.claude/skills/ref/gui/seed.monojson \
   /private/tmp/claude/<repo-slug>/sketches/$(date +%Y-%m-%d-%H%M)-<slug>.monojson
```

Use the actual slug, not the placeholder. The seed is a valid empty canvas; the user draws into it.

**How to communicate the path to the user:**

After writing the stub, print one line in chat with the full absolute path so it's clickable in Ghostty. The path MUST be the last token on its line with **no trailing punctuation** (`.`, `,`, `)`, etc.) — Ghostty grabs the contiguous run under the cursor and a trailing character breaks the open:

```
Blank canvas to redraw in: /private/tmp/claude/<repo-slug>/sketches/2026-05-05-1430-conflict-modal.monojson
```

**Say it is blank, on the line that hands it over.** "Stub:" tells the user nothing about what is inside, so they open it expecting the sketch. Naming it a blank canvas makes the emptiness the stated purpose rather than a surprise.

In a follow-up sentence (not on the same line as the path), tell the user they can ⌘-click that path in Ghostty to open it in Monodraw, draw an alternative, save, and let you know.

## Reading the user's edits

When the user says "I edited it" / "take a look" / "I drew it":

1. Read the file via the `mcp__monodraw__export_diagram` tool (or fall back to `/usr/local/bin/monodraw <path>` via Bash)
2. Render the result inline in the reply to enable direct reference
3. Respond to what was actually drawn — what changed, what tradeoffs the user made, whether the layout has issues

## Cleanup

Before writing each new stub, prune the directory:

1. List `/private/tmp/claude/<repo-slug>/sketches/*.monojson`
2. Delete any file whose `<YYYY-MM-DD>` prefix is more than 30 days before today
3. If the directory still has more than 50 `.monojson` files, delete oldest until 50 remain (sort by filename, which is chronologically ordered)

A single `find` invocation handles the date-based prune:

```bash
find /private/tmp/claude/<repo-slug>/sketches -name "*.monojson" -mtime +30 -delete
```

For the count cap, list and trim:

```bash
ls -1t /private/tmp/claude/<repo-slug>/sketches/*.monojson 2>/dev/null | tail -n +51 | xargs rm -f
```

Run both before writing the new stub. Don't announce the cleanup unless something unusual happened.

## Notes

- The .monojson format is a UUID-referenced object graph. Do NOT attempt to author non-trivial .monojson files by hand — only the seed (empty canvas) is hand-authorable. The user is the only writer of meaningful .monojson content; you only read.
- The Monodraw CLI (`/usr/local/bin/monodraw`) is render-only: `.monojson` → ASCII. It cannot import ASCII back into a `.monojson`. Don't try.
- If `mcp-monodraw` is not configured in the current project, fall back to invoking the CLI via Bash — the workflow still works, just with one fewer convenience.
- If the user asks for ASCII without a Monodraw round-trip ("just sketch it"), skip the stub-file step. The ASCII alone is sometimes enough.
