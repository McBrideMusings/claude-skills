---
name: delegate
description: "Reference for the cross-vendor `delegate` skill used by `audit dual` (delegate reviews) and `iterate delegate` (delegate implements): the `delegate` resolver (agent/check/exec verbs), CLAUDE_DELEGATE_AGENT vendor selection, auth health-gating, and the Terminal.app transport. Read when wiring, debugging, or extending cross-vendor delegation (Claude orchestrating Codex or Reasonix/DeepSeek). The router runs ANY delegated work — review OR implementation."
---

# Delegation backend

How the delegate flavors — `audit dual` (the delegate **reviews** the same diff) and `iterate delegate` (the delegate **implements** Claude's plan) — hand work to a second, **non-Claude** coding agent — Codex or Reasonix/DeepSeek — running non-interactively in a visible Terminal.app window. The router runs **any** delegated work; review vs implementation is just a difference in the prompt the consuming skill writes.

> ## ⛔ NEVER bypass the router — this is non-negotiable
>
> The delegate **always** runs through the `delegate exec` script. **NEVER** call a vendor binary directly — not from a Bash tool call, not "just this once," not because it seems quicker, not for any reason. The router is the whole point: it is the *only* thing that (1) opens the **visible Terminal.app window** the user watches to validate the delegate's process live, (2) enables the in-sandbox network access the agent needs, (3) writes the `/tmp/<slug>-delegate.md` output the skill reads back, and (4) hides the vendor behind `CLAUDE_DELEGATE_AGENT` so billing/profile selection stays correct.
>
> Calling a vendor binary directly runs it **headless in the background with no window** — silently defeating every one of those guarantees. The only correct invocation is `"$HOME/.claude/skills/delegate/delegate" exec [--headless] <prompt-file> <outfile>` — windowed (default) or `--headless`, both go **through the router** (the ban is on calling the vendor binary yourself, not on running without a window; `--headless` is the router's own no-GUI mode for cron/SSH). No exceptions. (The resolver internals below are the *one* place a binary name legitimately appears — everywhere else, route through `delegate`.)

> The smoke test showed `reasonix run` (and likewise `codex exec`) wraps its answer in its own chrome — a `thinking` line, a trailing token/cost footer. The consuming skill reads `<outfile>` and extracts the substantive findings; the resolver doesn't try to strip vendor chrome.

Two layers, kept separate on purpose:

1. **The `delegate` resolver** (`delegate` script in this directory) — the interface the skills actually call. It hides *which* vendor is in use behind three verbs.
2. **The Terminal.app transport** — how `delegate exec` spawns and watches the agent. Skills never touch this; only the resolver does.

> **This router is the cross-vendor path** (Claude → Codex/DeepSeek). Delegating to *another Claude* (e.g. a cheap Sonnet/Haiku implementer following a plan) is a **peer option, not forbidden** — it just doesn't go through this script: use the Agent tool with a model override and a tight brief (no terminal, no resolver). `iterate delegate` offers both as the implementer choice — cross-vendor via this router, or a cheaper Claude via the Agent tool. Pick the router when you want a non-Claude tool and a watchable window; pick the Agent tool when you want the cheapest, tightest plan-follower.

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

delegate exec [--headless] <prompt-file> <outfile>
    → run the resolved agent non-interactively with the prompt in <prompt-file>;
      its output lands in <outfile>. Default: runs in a visible Terminal.app window you
      can watch, blocks until the agent finishes, then returns. There is no "review" verb —
      a review is just an exec whose prompt asks for a review.
    → --headless: skip the window. Runs the agent as a plain subprocess, output straight to
      <outfile>, no AppleScript. Same prompt/outfile contract — the window is the only
      difference. Use it where there's no GUI session to open a window in (cron, SSH,
      scheduled agents): the windowed default needs Terminal.app plus the one-time macOS
      Automation grant, which a headless run can't satisfy. The visible window stays the
      default for interactive use; nothing asks you to choose.
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
   cat <prompt-file> | { codex exec | reasonix run } 2>&1 | tee <outfile>
   printf "\n__DELEGATE_DONE__\n" >> <outfile>
   # then: print a "done" line, delete itself ($0), and exit — leaving the window
   #       open at an idle shell (it does NOT close itself; see step 4 for why)
   ```
   Both `codex exec` and `reasonix run` read the prompt from **stdin** and run non-interactively (no approval prompts to babysit — the reason exec mode is used instead of an interactive session).
2. Spawns it with `osascript … do script …`. **Cold-start guard:** if Terminal wasn't already running, launching it opens a blank default window — so the resolver checks `application "Terminal" is running` first and, when it had to launch, runs the script **in that default window** (`do script … in window 1`) instead of letting `do script` spawn a *second* one. When Terminal was already running, a plain `do script` opens a fresh window so it never hijacks one of the user's. Either way: exactly one delegate window, never an orphaned blank.
3. Polls `<outfile>` for the `__DELEGATE_DONE__` sentinel (the source of truth; `busy` is a weaker secondary signal). The window is visible the whole time — output is `tee`'d to it, so you watch the agent work live.
4. On the sentinel: strips the sentinel line from `<outfile>` and **returns**. The window is left open at its idle login shell showing the full output — the resolver never closes it, and neither does the script. **The user dismisses it themselves** (Cmd-W / red button). This is deliberate: closing a window *from inside* while a process (`bash`/`osascript`) is still live makes Terminal pop its "terminate running processes?" dialog, whereas a window sitting at an idle login shell closes with no prompt — same as any other terminal window. So the result reaches the caller immediately and the window lingers, promptlessly closable, for you to read at your own pace. On timeout: same — window left open, exits nonzero.

### Cautions

- **`history`/`contents` expose whatever is on that pane — including secrets** another command may have printed. The resolver redirects agent output to a file rather than scraping the pane, but if you ever read a pane directly, summarize and flag rather than echoing.
- **First osascript control of Terminal triggers a one-time macOS Automation (TCC) prompt.** It must be granted once; it can't be granted from a script. If `osascript` returns `-1743` / "Not authorized to send Apple events", surface that — the user approves it in System Settings → Privacy & Security → Automation.
- The window is an outward-facing side effect. The resolver owns the **spawn** (and the cold-start single-window guard); it never closes the window — **the user does, by hand**. A finished delegate window is deliberately left at an idle login shell so it closes without Terminal's "terminate running processes?" prompt.

### Adding a third agent

Edit one place — the `case "$a"` blocks in `delegate` (its `KNOWN` list, the `check` command, and the `runner` string). Skills and this doc don't change.
