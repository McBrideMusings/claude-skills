---
name: handout
disable-model-invocation: true
description: "Build a self-contained HTML deliverable that no other verb owns — a page, a report, a plan, a deck. Thin front door over the `_handouts/` store and the `handout` assembler; explainers go to `explain`, UI variants to `prototype`, layout sketches to `design`."
---

# handout

The front door for a visual HTML deliverable that **no verb already owns**. "Make me a page showing
X", "turn this into a deck" — the noun is the request, so nothing else picks it up.

This skill is deliberately thin. The substrate lives in [`../_handouts/`](../_handouts/README.md)
and is shared: `explain`, `prototype`, and `design` call the same tool for their own kinds. What
this skill adds is a caller for `page` and `deck`.

## Not this skill

| The request | Goes to |
|---|---|
| Explaining how something works | `explain` — its Tier 2 builds `--kind explainer` |
| Several different takes on one piece of UI | `prototype` — `--kind prototype` behind a picker |
| Where things sit in a layout | `design` — ASCII first, `--kind wireframe` when it escalates |
| A chart or dashboard as the point of the page | Still here, but read `_domains/gui/design.md` too |
| Exploring, investigating, or brainstorming | **Nothing.** Answer in chat. A file is not the deliverable unless one was asked for. |

That last row is a rule, not a preference. A cheap `page` kind makes reaching for a file easier, which
is exactly the pressure to resist.

## Run it

1. **Pick the kind.** `page` for a document — a plan, a report, a one-off deliverable. `deck` for
   slides. If neither fits, one of the other skills owns it.
2. **Read [`../_handouts/CONTRACT.md`](../_handouts/CONTRACT.md)** for the fragment rules and the
   class vocabulary.
3. **Read [`../_handouts/DIRECTION.md`](../_handouts/DIRECTION.md).** Both these kinds are
   identity-first: palette and typefaces are open decisions, and the direction cell is where the
   authority order and the originality bar live.
4. **Write the design plan first** — 4–6 named colours, the type roles, the organizing idea in a
   sentence. Then the fragment. Not the other way round.
5. **Write the fragment** to `<repo-root>/tmp/claude/handouts/<slug>.body.html`. Content only.
6. **Build:**

```bash
"$HOME/.claude/tools/handout" build \
  --kind page \
  --title "Q3 migration plan" \
  --fragment /abs/repo/tmp/claude/handouts/q3-migration.body.html \
  --out /abs/repo/tmp/claude/handouts/q3-migration.html
```

7. **Screenshot it and look at it.** Every slide for a deck, both themes. A path is delivery, not
   verification.
8. **Run the critique pass** — [`../_handouts/CRITIQUE.md`](../_handouts/CRITIQUE.md). Press `c` in
   both themes for the contrast number, read the screenshot against the fixed list, fix everything in
   one batch, stop. One pass, not a loop — and not a design review with the user in it.
9. **Open it** — `open <absolute-path>`, on its own line, no trailing punctuation.

**Getting comments back.** Every handout carries the comment layer: they press the speech-bubble
button (or `a`), mark things up, and press **Copy comments**. The markdown starts with
`<!-- handout-feedback: <slug> -->`, so you can either ask them to paste it, or wait for it —
`CONTRACT.md` § Getting comments back has the `pbpaste` watcher. Say which you are doing; the watcher
reads whatever else they copy meanwhile.

**Every path absolute.** Resolve the repo root in its own Bash call (`git rev-parse --show-toplevel`,
falling back to absolute `pwd`). A path that doesn't start with `/` is the bug.

## Refining

Edit the fragment, re-run the build to the same `--out`. Never a new file per refinement.

## Keeping it

Ephemeral by default — `tmp/claude/` is age-pruned. If the user asks to keep it, move it to
`<repo-root>/docs/` inside a repo, or `~/handouts/` outside one. Don't auto-keep.

## Delivery

Local file, opened locally. Never publish to a hosted page — see `~/.claude/CLAUDE.md` §5. If the user
wants it deployed somewhere, that's their call to raise and yours to ask about, not a default.
