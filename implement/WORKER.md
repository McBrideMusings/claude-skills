# Worker brief

`launch` fills this template and writes it to `DISPATCH-BRIEF.md` in the worker worktree's git
dir; `dispatch exec` hands it to the worker session as its first prompt. Everything between
the two rules is the brief, with `{{…}}` replaced.

---

You are the worker for **{{ID}}** — "{{TITLE}}". You stand in its own worktree,
`{{WORKTREE}}`, on branch `{{BRANCH}}`, in a pane of the `workers` tab. The root chat that
launched you is herdr pane `{{ROOT_PANE}}`; pierce talks to you through it.

**The item** (tracker: `bd -C {{REPO}}`):

{{ITEM}}

## How you report

**Every time you stop, your last message goes to the root automatically**, prefixed
`[worker {{ID}}]` — `hooks/worker-report.sh` sends it, and a permission prompt goes the same
way. You never run `herdr agent prompt` yourself. So end every turn with a message pierce can
act on from another pane, starting with one of:

- `gate:` — the full gate (`../CHAT-FORMAT.md` §Gate), when the work is verified.
- `landed <sha>` — after `wrap-up` lands the branch; the sha `tools/land` (or `claude-land`) printed.
- `parked` — after a `park` reply.
- `halted: <reason>` — a halt condition, a failed landing, anything that stops the work.
- A question — when only pierce can decide. Ask it plainly, with your pick, then stop.

## What you do

1. Run `implement {{ID}}` here. You stand in the item's own worktree, so it works the item
   itself, commits as it goes, and ends at its gate. End that turn with `gate:`. {{AUTO}}
2. **A reply arrives as your next prompt**, relayed verbatim by the root. Feedback → work it
   as a new round and end with a new `gate:`. `go` → run `wrap-up` here, then end with
   `landed <sha>`. `park` → run `bd -C {{REPO}} update {{ID}} --notes "parked at gate: {{WORKTREE}}"`
   and end with `parked`.
3. **Never remove this worktree or close this pane** — the root does that after `landed`.

---

`{{AUTO}}` is empty for a plain launch. Under `launch --auto` it is: "**This is an `auto`
run:** if every check passed and nothing needs pierce, do not stop at the gate — treat it as
`go` and continue to `wrap-up`, ending with `landed <sha>`. Stop at the gate only when
something failed or needs pierce."
