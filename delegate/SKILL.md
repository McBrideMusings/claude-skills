---
name: delegate
description: "Reference for the delegate router used by `review dual` and `implement delegate`: resolver verbs (agent/check/exec), CLAUDE_DELEGATE_AGENT vendor selection (Codex, Reasonix/DeepSeek, or another Claude), and auth health-gating. Read when wiring, debugging, or extending any delegated work; the visible Terminal.app transport is the separate `terminal` skill."
---

# Delegation backend

How the delegate flavors — `review dual` (the delegate **reviews** the same diff) and `implement delegate` (the delegate **implements** Claude's plan) — hand work to a second coding agent — Codex, Reasonix/DeepSeek, or **another Claude** — running non-interactively in a visible Terminal.app window. The router runs **any** delegated work; review vs implementation is just a difference in the prompt the consuming skill writes.

> ## ⛔ NEVER bypass the router — this is non-negotiable
>
> The delegate **always** runs through the `delegate exec` script. **NEVER** call a vendor binary directly — not from a Bash tool call, not "just this once," not because it seems quicker, not for any reason. The router is the whole point: it is the *only* thing that (1) opens the **visible Terminal.app window** the user watches to validate the delegate's process live, (2) enables the in-sandbox network access the agent needs, (3) writes the `/tmp/<slug>-delegate.md` output the skill reads back, and (4) hides the vendor behind `CLAUDE_DELEGATE_AGENT` so billing/profile selection stays correct.
>
> Calling a vendor binary directly runs it **headless in the background with no window** — silently defeating every one of those guarantees. The only correct invocation is `"$HOME/.claude/skills/delegate/delegate" exec [--headless] <prompt-file> <outfile>` — windowed (default) or `--headless`, both go **through the router** (the ban is on calling the vendor binary yourself, not on running without a window; `--headless` is the router's own no-GUI mode for cron/SSH). No exceptions. (The resolver internals below are the *one* place a binary name legitimately appears — everywhere else, route through `delegate`.)

> The smoke test showed `reasonix run` (and likewise `codex exec`) wraps its answer in its own chrome — a `thinking` line, a trailing token/cost footer. The consuming skill reads `<outfile>` and extracts the substantive findings; the resolver doesn't try to strip vendor chrome.

Two layers, kept separate on purpose:

1. **The `delegate` resolver** (`delegate` script in this directory) — the interface the skills actually call. It hides *which* vendor is in use behind three verbs.
2. **The transport** — the visible Terminal.app window the agent runs in. This is **not** delegate's code: it's the separate `terminal` skill, which delegate's `exec` verb calls. Skills never touch either layer directly except through the three verbs.

> **Three ways to hand work to a second agent — pick by what you want to watch and bill:**
>
> 1. **This router** (`CLAUDE_DELEGATE_AGENT=codex|reasonix|claude`) — a separate agent process in a watchable Terminal.app window (or `--headless`), output to a file. Cross-vendor AND Claude-to-Claude: `claude` runs `claude -p` non-interactively, model picked by `CLAUDE_DELEGATE_MODEL` (e.g. a cheap Sonnet/Haiku implementer, or Opus for heavy work).
> 2. **The Agent tool** with a model override — an in-session Claude subagent, no window, no resolver. Cheapest and tightest for a plan-follower that needs no independent terminal.
> 3. **A Herdr pane** (when running inside Herdr — `HERDR_ENV=1`) — an *interactive* Claude the user can take over: `herdr pane split` + `herdr agent start … --kind claude -- --model <model>` + `herdr agent prompt`. See the `herdr` skill. Pick this when the delegate should outlive the orchestrating session or the user wants to talk to it directly.
>
> `implement delegate` offers the router and the Agent tool as its implementer choices; the Herdr path is for sessions already inside Herdr.

---

## The `delegate` interface

Call it by absolute path so it works from either profile (the `skills/` dir is the same real directory for both):

```
$HOME/.claude/skills/delegate/delegate <verb>
```

```
delegate agent
    → prints the resolved agent: "codex" | "reasonix" | "claude"
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

`delegate` resolves the agent from **`$CLAUDE_DELEGATE_AGENT`** (`codex` | `reasonix` | `claude`):

- Set it per-profile in **`settings.local.json`**'s `env` block — the only per-profile spot, since `settings.json` is symlinked/shared. Personal → `reasonix`, work → `codex`. It's gitignored and holds only the agent *name*, never a key.
- A single repo can override it in its own `.claude/settings.local.json`; Claude Code's settings merge gives project scope precedence over user scope, so the override is free.
- **Unset or unknown is a hard error** — `delegate` never guesses a vendor (guessing means the wrong billing account). The error from `delegate check`/`agent` is the first line of the health gate.

### The `claude` vendor (Claude-to-Claude)

Runner: `claude -p --permission-mode <mode> [--model <model>]`, prompt on stdin, same windowed/headless transport as the other vendors. Two optional env knobs, set alongside `CLAUDE_DELEGATE_AGENT`:

- **`CLAUDE_DELEGATE_MODEL`** — the delegate's model (`sonnet`, `haiku`, `opus`, or a full model id). Unset → the CLI's default. This is the point of the vendor: a cheap plan-follower or a heavyweight, chosen per profile or per repo.
- **`CLAUDE_DELEGATE_PERMISSION_MODE`** — defaults to `acceptEdits`: file edits auto-approved, every other tool follows the user's own permission rules, and in print mode a denied tool call fails that call rather than prompting. If a delegated task needs more (e.g. free rein on git/test commands), the user sets a broader mode here themselves — the script never hardcodes one.

The delegate is a full Claude Code session: it reads the repo's CLAUDE.md, skills, and settings from whatever profile `CLAUDE_CONFIG_DIR` routing gives the spawned shell (the Terminal window inherits the cwd, so profile routing behaves exactly as if the user opened a terminal there).

### Where credentials live (never embedded)

The resolver only ever *checks* auth — it never sees a key.

- **Codex** — logged in via an OpenAI **API key** stored in `~/.codex` (`codex login`). `delegate check` runs `codex login status` (note: it prints to **stderr**) and looks for "logged in".
- **Reasonix** — reads `DEEPSEEK_API_KEY` from the environment, referenced by `reasonix.toml`'s `api_key_env`. `delegate check` runs `reasonix doctor` and looks for `key:present`.
- **Claude** — the normal Claude Code login (`claude auth login`). `delegate check` runs `claude auth status` and looks for `"loggedIn": true`.

Codex and Reasonix are **API-billed**; the `claude` vendor bills the signed-in Claude account (subscription or API, per the login) — same account the orchestrating session uses under that profile.

---

## The transport — owned by the `terminal` skill

`delegate exec` does **not** spawn or watch the window itself. It builds the vendor payload (`cat <prompt-file> | <runner>`) and hands it to the `terminal` skill's one-shot verb:

```
"$HOME/.claude/skills/terminal/terminal" run [--headless] <payload-file> <outfile>
```

That skill owns the whole Terminal.app transport — the visible window, the cold-start single-window guard, the `__TERMINAL_DONE__` sentinel and polling, and the window-left-open-at-an-idle-shell behavior. `--headless` passes straight through for cron/SSH where there's no GUI to open a window in. The division of labor: **`delegate` decides *which vendor command* runs; `terminal` runs it in a watchable pane.**

For the transport internals, the TCC/Automation grant, the secrets-on-a-pane caution, and the session mode (a persistent pane you can send commands to over time), read the `terminal` skill — `skills/terminal/SKILL.md` and its `one-shot.md` / `session.md` reference files.

### Adding another agent

Edit one place — the `case "$a"` blocks in `delegate` (its `KNOWN` list, the `check` command, and the `runner` string). Skills and this doc don't change.
