---
name: folio
description: "Build a self-contained HTML deliverable that no other verb owns — a page, a report, a plan, a deck — as a local file opened locally. Also the meaning of 'artifact': asking for an artifact is asking for a folio, never a hosted page. Explainers go to `explain`, UI variants to `spike`, layout sketches to `gui`."
---

# folio

The front door for a visual HTML deliverable that **no verb already owns**. "Make me a page showing
X", "turn this into a deck" — the noun is the request, so nothing else picks it up.

## "Artifact" means a folio

When the user says **artifact**, they are asking for a folio: this skill, a local file. They do not
mean Anthropic's hosted `Artifact` tool and they do not mean a Cloudflare page. Build the folio and
hand back the path — don't explain the distinction, don't offer hosting as an alternative, and don't
treat the word as a reason to re-read the global ban.

The word carries no other freight. "Add this to the folio", "update the artifact", "make me an
artifact of X" are all the same request: build or rebuild a folio at a stable path.

This skill is deliberately thin. The substrate lives in [`../_folios/`](../_folios/README.md)
and is shared: `explain`, `spike`, and `gui` call the same tool for their own kinds. What
this skill adds is a caller for `page` and `deck`.

## Not this skill

| The request | Goes to |
|---|---|
| Explaining how something works | `explain` — its Tier 2 builds `--kind explainer` |
| Several different takes on one piece of UI | `spike` — `--kind prototype` behind a picker |
| Where things sit in a layout | `gui` — ASCII first, `--kind wireframe` when it escalates |
| A chart or dashboard as the point of the page | Still here, but read `_domains/gui/design.md` too |
| Exploring, investigating, or brainstorming | **Nothing.** Answer in chat. A file is not the deliverable unless one was asked for. |

That last row is a rule, not a preference. A cheap `page` kind makes reaching for a file easier, which
is exactly the pressure to resist.

## Run it

1. **Pick the kind.** `page` for a document — a plan, a report, a one-off deliverable. `deck` for
   slides. If neither fits, one of the other skills owns it.
2. **Read [`../_folios/CONTRACT.md`](../_folios/CONTRACT.md)** for the fragment rules and the
   class vocabulary.
3. **Read [`../_folios/DIRECTION.md`](../_folios/DIRECTION.md).** Both these kinds are
   identity-first: palette and typefaces are open decisions, and the direction cell is where the
   authority order and the originality bar live.
4. **Write the design plan first** — 4–6 named colours, the type roles, the organizing idea in a
   sentence. Then the fragment. Not the other way round.
5. **Write the fragment** to `<repo-root>/tmp/claude/folios/<slug>.body.html`. Content only.
6. **Build:**

```bash
"$HOME/.claude/tools/folio" build \
  --kind page \
  --title "Q3 migration plan" \
  --fragment /abs/repo/tmp/claude/folios/q3-migration.body.html \
  --out /abs/repo/tmp/claude/folios/q3-migration.html
```

7. **Screenshot it and look at it.** Every slide for a deck, both themes. A path is delivery, not
   verification.
8. **Run the critique pass** — [`../_folios/CRITIQUE.md`](../_folios/CRITIQUE.md). Press `c` in
   both themes for the contrast number, read the screenshot against the fixed list, fix everything in
   one batch, stop. One pass, not a loop — and not a design review with the user in it.
9. **Open it** — `open <absolute-path>`, on its own line, no trailing punctuation.

**Getting comments back.** Every folio carries the comment layer: they press the speech-bubble
button (or `a`), mark things up, and press **Copy comments**. The markdown starts with
`<!-- folio-feedback: <slug> -->`, so you can either ask them to paste it, or wait for it —
`CONTRACT.md` § Getting comments back has the `pbpaste` watcher. Say which you are doing; the watcher
reads whatever else they copy meanwhile.

**Every path absolute.** Resolve the repo root in its own Bash call (`git rev-parse --show-toplevel`,
falling back to absolute `pwd`). A path that doesn't start with `/` is the bug.

## Refining

Edit the fragment, re-run the build to the same `--out`. Never a new file per refinement.

## Keeping it

Ephemeral by default — `tmp/claude/` is age-pruned. If the user asks to keep it, move it to
`<repo-root>/docs/folios/` inside a repo, or `~/folios/` outside one. Don't auto-keep.

**Never invent a second word for the store.** Fragments go in `tmp/claude/folios/`, kept builds in
`docs/folios/`. Not `prototypes/`, not `mockups/`, not `artifacts/` — the tool is `folio`, so the
directory is `folios`, everywhere, no exceptions.

## Tickets from a folio

A folio that a ticket slate is cut from is **reference material with an expiry**, and the expiry is
tracked, not remembered. When `to-tickets` (or any other pass) turns a folio into issues:

1. The folio gets committed to `docs/folios/` so every ticket can cite a path that resolves from any
   checkout. A screenshot set is not a substitute — it can't be clicked, and it rots faster than the
   thing it depicts.
2. **File one last issue: delete the folio.** It depends on every other issue in the slate, so it
   surfaces as ready only once the work it described is done. Closing it removes the file from
   `docs/folios/` and closes the loop.

Without step 2 the reference outlives its subject and starts contradicting the shipped code. The
dependency is what makes the cleanup arrive on its own instead of needing to be noticed.

## Delivery

Local file, opened locally. Never publish to a hosted page. If the user wants it deployed somewhere,
that's their call to raise and yours to ask about, not a default.
