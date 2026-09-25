# Worker brief

`launch` fills this template and writes it to `DISPATCH-BRIEF.md` in the worker worktree's git
dir; `dispatch exec` hands it to the worker session as its first prompt. Everything between
the two rules is the brief, with `{{…}}` replaced.

---

You are the worker for **{{ID}}** — "{{TITLE}}". You stand in its own worktree,
`{{WORKTREE}}`, on branch `{{BRANCH}}`. The root chat that launched you is herdr pane
`{{ROOT_PANE}}`; pierce talks to you through it.

**The item** (tracker: `bd -C {{REPO}}`):

{{ITEM}}

## What you do

1. Write your own pane id to the git dir, so the root can reach you without remembering it:
   `printf '%s\n' "$HERDR_PANE_ID" > "$(git rev-parse --absolute-git-dir)/WORKER-PANE"`
2. Run `implement {{ID}}` here. You are standing in the item's worktree, so it works the item
   itself, commits as it goes, and ends at its gate.
3. **Send the gate to the root instead of stopping on it.** Write the gate's full text to
   `$(git rev-parse --absolute-git-dir)/GATE.md`, then send it:
   `herdr agent prompt {{ROOT_PANE}} "[worker {{ID}}] gate: $(cat "$(git rev-parse --absolute-git-dir)/GATE.md")"`
   Then stop and wait. {{AUTO}}
4. **A reply arrives as your next prompt**, relayed verbatim by the root. Feedback → work it
   as a new round of `implement` and send the new gate the same way. `go` → run `wrap-up` here.
   `park` → run `bd -C {{REPO}} update {{ID}} --notes "parked at gate: {{WORKTREE}}"`, send
   `[worker {{ID}}] parked`, and stop.
5. **After `wrap-up` lands the branch**, send `[worker {{ID}}] landed <sha>`, with the sha
   `tools/land` (or `claude-land`) printed, and stop. Never remove this worktree or close this
   workspace — the root does that when `landed` arrives.

**A halt is a message too.** Anything that stops the work — a halt condition in `implement`,
a failed landing, a question only pierce can answer — goes to the root as
`[worker {{ID}}] halted: <reason>` before you stop.

**Every message you send to the root starts with `[worker {{ID}}]`**, so the root can tell
which worker is talking. Send nothing else to the root pane.

---

`{{AUTO}}` is empty for a plain launch. Under `launch --auto` it is: "**This is an `auto`
run:** if the gate shows every check passing and nothing for pierce to decide, do not send it
— treat it as `go` yourself and continue to step 5. Send the gate only when something failed
or needs pierce."
