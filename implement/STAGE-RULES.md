# Rules for one stage of an implement pass

An `/implement` pass runs staged — `~/.claude/skills/implement/implement.js` spawns one agent per stage, and you are one of them. **This file and the prompt you were handed are the whole of your instructions.** Do not go looking for `SKILL.md`: it describes a pass end to end, addressed to a reader who owns all of it, and you own one stage of it.

Your prompt names the work and the schema names the answer. Returning that object ends your stage; the script decides what happens next.

---

## Two rules the harness depends on

A stage agent has no `Agent` tool — `ToolSearch` cannot reach one either — so it cannot spawn a subagent. `build-runner` and `screenshot-checker` exist as subagent types elsewhere in this project, but a workflow stage cannot address them: do not go hunting for a way to reach them, and do not restore an instruction to spawn them.

- **Run a build, test, lint or typecheck yourself, in the foreground, and always bound the output.** Use an explicit `timeout` (up to 600000), never background it, and pipe — `<cmd> 2>&1 | tail -40` (add `| grep -E 'error|FAIL' | head -40` first when the runner is chatty). Raw build output is the largest single source of context growth in a pass; the tail is the mitigation, not a subagent. Say in your returned object that you ran it directly.
- **Never read a screenshot into this context.** There is no reachable way to hand one to another agent, so prove the result from text instead — logs, exit codes, a DOM or text dump the app already emits. Images were 84% of all tool-result bytes across a measured day, and an image stays in context for every turn after it lands.

---

## ⛔ You have no user to ask

Nobody is reading your output while you run. You are a stage agent inside a workflow, and the session that started the pass is blocked on it — often while several other passes run alongside yours.

- **Never call `AskUserQuestion`.** Not to pick between approaches, not to confirm a destructive step, not to resolve an ambiguity in your prompt.
- **Never end your stage on a question** and wait for an answer. There is no answer coming; the pass hangs until a human notices it stopped.
- **A decision your prompt does not settle goes in the object you return** — as a halt, a note, or an unresolved item, whichever your schema provides. The script reads it and decides. That is the entire escalation path and it is enough.

---

## ⛔ Bash command rules — read this before writing any shell command

These exist because implement is a walk-away tool. A single permission prompt kills the entire unattended run. There are no exceptions.

**Hard bans — these will ALWAYS trigger a permission prompt and MUST NEVER appear:**

1. **`@{u}`, `@{upstream}`, `@{push}`, or ANY `{…}` git refspec** typed as a bare argument. These trigger brace-expansion prompts unconditionally. Use `origin/$(git branch --show-current)` or `origin/main` instead. The one exception is a refspec inside single quotes in a command your prompt gives you verbatim — run that one exactly as written.
2. **Compound commands where ANY sub-command is not allowlisted.** `&&`, `||`, `;` chaining is only safe when EVERY piece would individually pass. If uncertain, run the commands separately.
3. **`$(…)` or backtick subshell expansion inside a command argument** where the inner command is not already allowlisted. Run the inner command first, capture the result, use it in a second call.
4. **`#` comments inside Bash tool calls.**
5. **Newlines inside a single Bash tool call** to separate commands.
6. **`cd /path && git <cmd>` to run git in a different directory.** This triggers an "untrusted hooks" prompt. Use `git -C /absolute/path <cmd>` — same effect, no compound, no prompt.
7. **`cat <file> || echo "not found"` existence-check compounds.** Use the Read tool to check or read files.

If you find yourself contorting a command to avoid a prompt, STOP. The right fix is adding the pattern to the allowlist, not clever reformatting. Report it in your returned object instead.

---

## Where you are

You did not start in the working directory. Every command either runs with `git -C <dir>` or inside a `( cd <dir> && … )` subshell, and never leaves the Bash working directory somewhere it did not start. A bare relative path resolves against a different checkout of the same repo.
