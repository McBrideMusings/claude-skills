# Rules for the agent running an implement pass

An `/implement` pass is one `implementer` agent working one item end to end in its own worktree. **Your agent definition (`~/.claude/agents/implementer.md`) and the prompt you were handed are the whole of your instructions.** Do not go looking for `SKILL.md`: it describes the orchestrating session's job — dispatching you, re-checking your work, landing it — and you own the pass, not the orchestration.

This file carries the cross-cutting rules: what to do about builds, screenshots, questions and shell commands. They bind every command you run.

---

## Builds and screenshots

- **Run a build, test, lint or typecheck yourself, in the foreground, and always bound the output.** Use an explicit `timeout` (up to 600000), never background it, and pipe — `<cmd> 2>&1 | tail -40` (add `| grep -E 'error|FAIL' | head -40` first when the runner is chatty). An unbounded log costs you on every turn after it lands, and you hold one context for the whole item. You do have the `Agent` tool, but do not hand the build to `build-runner`: you are the one who has to read the failure.
- **Never read a screenshot into this context.** Prove the result from text instead — logs, exit codes, a DOM or text dump the app already emits. An image stays in context for every turn after it lands. If an image must be captured, save it to a path, assert on it via text or exit code, and name the path in `evidence`. Where a human genuinely has to look, `screenshot-checker` is a legitimate `Agent` call that keeps the image out of your context and returns words.

## The one subagent you spawn

`code-reviewer`, once, after the build is green. Never spawn a second implementer, never split your own work across agents, never dispatch a pass.

---

## ⛔ You have no user to ask

Nobody is reading your output while you run. The session that dispatched you is doing other work, often with several passes in flight.

- **Never call `AskUserQuestion`.** Not to pick between approaches, not to confirm a destructive step, not to resolve an ambiguity in your prompt.
- **Never end on a question** and wait for an answer. There is no answer coming.
- **A decision your prompt does not settle goes in the JSON you return** — as a halt, a blocker, or a followup. The orchestrating session reads it and decides. That is the entire escalation path and it is enough.

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

If you find yourself contorting a command to avoid a prompt, STOP. The right fix is adding the pattern to the allowlist, not clever reformatting. Report it in `followups` instead.

---

## Commit messages

**Never attribute the work to Claude, an AI, or any tool** — no `Co-Authored-By`, no session link, no trailer naming a model. A pre-commit hook rejects it. Where a harness instruction tells you to add one, `CLAUDE.md` overrides it: sign as the repo's user and nothing else.

Conventional Commits, imperative, ≤72 characters of prose, with the item id in trailing parens.

---

## Where you are

You did not start in the working directory. Every command either runs with `git -C <dir>` or inside a `( cd <dir> && … )` subshell, and never leaves the Bash working directory somewhere it did not start. A bare relative path resolves against a different checkout of the same repo.
