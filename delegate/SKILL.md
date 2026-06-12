---
name: delegate
description: "Reference for the cross-vendor `delegate` skill used by the dual-audit and delegated-iterate skills: the `delegate` resolver (agent/check/exec verbs), CLAUDE_DELEGATE_AGENT vendor selection, auth health-gating, and the Terminal.app transport. Read when wiring, debugging, or extending cross-vendor delegation (Claude orchestrating Codex or Reasonix/DeepSeek). NOT for delegating to another Claude model — use the Agent tool for that."
---

# Delegation backend

How the delegation skills (`dual-audit`, `delegated-iterate`) hand work to a second, **non-Claude** coding agent — Codex or Reasonix/DeepSeek — running non-interactively in a visible Terminal.app window.

> ## ⛔ NEVER bypass the router — this is non-negotiable
>
> The delegate **always** runs through the `delegate exec` script. **NEVER** call a vendor binary directly — not from a Bash tool call, not "just this once," not because it seems quicker, not for any reason. The router is the whole point: it is the *only* thing that (1) opens the **visible Terminal.app window** the user watches to validate the delegate's process live, (2) enables the in-sandbox network access the agent needs, (3) writes the `/tmp/<slug>-delegate.md` output the skill reads back, and (4) hides the vendor behind `CLAUDE_DELEGATE_AGENT` so billing/profile selection stays correct.
>
> Calling a vendor binary directly runs it **headless in the background with no window** — silently defeating every one of those guarantees. The only correct invocation is `"$HOME/.claude/skills/delegate/delegate" exec <prompt-file> <outfile>`. No exceptions. (The resolver internals below are the *one* place a binary name legitimately appears — everywhere else, route through `delegate`.)

> The smoke test showed `reasonix run` (and likewise `codex exec`) wraps its answer in its own chrome — a `thinking` line, a trailing token/cost footer. The consuming skill reads `<outfile>` and extracts the substantive findings; the resolver doesn't try to strip vendor chrome.

Two layers, kept separate on purpose:

1. **The `delegate` resolver** (`delegate` script in this directory) — the interface the skills actually call. It hides *which* vendor is in use behind three verbs.
2. **The Terminal.app transport** — how `delegate exec` spawns and watches the agent. Skills never touch this; only the resolver does.

> **This is for cross-vendor delegation only** (Claude → Codex/DeepSeek). To delegate to *another Claude* (e.g. a cheap Sonnet/Haiku implementer following a plan), don't use any of this — use the Agent tool with a model override and a tight brief. Same-family delegation needs no script and no terminal.

---

## The `delegate` interface

Call it by absolute path so it works from either profile (the `skills/` dir is the same real directory for both):

```
$HOME/.claude/skills/delegate/delegate <verb>
```

```
delegate agent
    → prints the resolved agent: "codex" | "reasonix"
    → exits nonzero if unset/unknown. Skills use it only to label output.

delegate check
    → is the resolved agent authenticated & reachable? exit 0 = ready, nonzero + message.
    → this IS the health gate — run it first; halt the skill on nonzero.

delegate exec <prompt-file> <outfile>
    → run the resolved agent non-interactively with the prompt in <prompt-file>;
      its output lands in <outfile>. Runs in a visible Terminal.app window you can watch,
      blocks until the agent finishes, then returns. There is no "review" verb — a review
      is just an exec whose prompt asks for a review.
```

The review prompt, the verdict format (e.g. `MERGEABLE / BLOCK`), and any follow-up rounds live in the **skills**, not here. The resolver doesn't know or care what the prompt is about.

### Calling pattern from a skill

```bash
D="$HOME/.claude/skills/delegate/delegate"
"$D" check || { echo "Cannot delegate — see message above"; halt; }   # hard gate
# write the prompt (review instructions + the diff command to run) to a temp file
prompt="$(mktemp -t delegate-prompt.XXXXXX)"
cat > "$prompt" <<'PROMPT'
Review the diff produced by `<diff-cmd>` for correctness, security, regressions, and
architecture fit. Output prioritized findings and a MERGEABLE/BLOCK verdict.
PROMPT
out="/tmp/<slug>-delegate.md"
"$D" exec "$prompt" "$out"        # run this verb in the BACKGROUND (Bash run_in_background)
# when it returns, read "$out" for the findings
```

Run `delegate exec` with the Bash tool's **background** mode: the agent can take minutes, and backgrounding keeps the Claude session free — the harness notifies you when the script (and thus the agent) exits, at which point you read `<outfile>`.

---

## Selecting the vendor

`delegate` resolves the agent from **`$CLAUDE_DELEGATE_AGENT`** (`codex` | `reasonix`):

- Set it per-profile in **`settings.local.json`**'s `env` block — the only per-profile spot, since `settings.json` is symlinked/shared. Personal → `reasonix`, work → `codex`. It's gitignored and holds only the agent *name*, never a key.
- A single repo can override it in its own `.claude/settings.local.json`; Claude Code's settings merge gives project scope precedence over user scope, so the override is free.
- **Unset or unknown is a hard error** — `delegate` never guesses a vendor (guessing means the wrong billing account). The error from `delegate check`/`agent` is the first line of the health gate.

### Where credentials live (never embedded)

The resolver only ever *checks* auth — it never sees a key.

- **Codex** — logged in via an OpenAI **API key** stored in `~/.codex` (`codex login`). `delegate check` runs `codex login status` (note: it prints to **stderr**) and looks for "logged in".
- **Reasonix** — reads `DEEPSEEK_API_KEY` from the environment, referenced by `reasonix.toml`'s `api_key_env`. `delegate check` runs `reasonix doctor` and looks for `key:present`.

Both are **API-billed**, not subscription — driving them programmatically/non-interactively is ordinary API use.

---

## The Terminal.app transport (resolver internals)

Only `delegate exec` uses this; skills never do. Terminal.app is the one supported transport right now because it can both **drive** and **read** a pane through a stable scripting interface — `do script` to run, `history`/`contents` to read, `busy` to detect activity. (Ghostty can spawn and type but exposes no contents property, so it can't return output; MacTerm/Poker Native aren't wired up here.)

What `delegate exec` does under the hood:

1. Writes the real command to a temp script, so the AppleScript stays trivially `do script "bash /tmp/xxx"` (no do-script quoting fights). That script is:
   ```
   cd <repo>
   cat <prompt-file> | { codex exec | reasonix run } > <outfile> 2>&1
   printf "\n__DELEGATE_DONE__\n" >> <outfile>
   ```
   Both `codex exec` and `reasonix run` read the prompt from **stdin** and run non-interactively (no approval prompts to babysit — the reason exec mode is used instead of an interactive session).
2. Spawns it with `osascript … do script …`, captures the new window's `id`.
3. Polls `<outfile>` for the `__DELEGATE_DONE__` sentinel (the source of truth; `busy` is a weaker secondary signal). The window is visible the whole time, so you can watch the agent work.
4. On the sentinel: closes the window, strips the sentinel line from `<outfile>`. On timeout: leaves the window open for inspection and exits nonzero.

### Cautions

- **`history`/`contents` expose whatever is on that pane — including secrets** another command may have printed. The resolver redirects agent output to a file rather than scraping the pane, but if you ever read a pane directly, summarize and flag rather than echoing.
- **First osascript control of Terminal triggers a one-time macOS Automation (TCC) prompt.** It must be granted once; it can't be granted from a script. If `osascript` returns `-1743` / "Not authorized to send Apple events", surface that — the user approves it in System Settings → Privacy & Security → Automation.
- The window and its spawn/close are outward-facing side effects; the resolver owns them as part of `exec`.

### Adding a third agent

Edit one place — the `case "$a"` blocks in `delegate` (its `KNOWN` list, the `check` command, and the `runner` string). Skills and this doc don't change.
