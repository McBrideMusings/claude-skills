---
name: delegate
description: "Reference for the cross-vendor `delegate` skill used by `review dual` (delegate reviews) and `implement delegate` (delegate implements): the `delegate` resolver (agent/check/exec verbs), CLAUDE_DELEGATE_AGENT vendor selection, and auth health-gating. The transport (the visible Terminal.app window the agent runs in) is the separate `terminal` skill, which `delegate exec` calls. Read when wiring, debugging, or extending cross-vendor delegation (Claude orchestrating Codex or Reasonix/DeepSeek). The router runs ANY delegated work — review OR implementation."
---

# Delegation backend

How the delegate flavors — `review dual` (the delegate **reviews** the same diff) and `implement delegate` (the delegate **implements** Claude's plan) — hand work to a second, **non-Claude** coding agent — Codex or Reasonix/DeepSeek — running non-interactively in a visible Terminal.app window. The router runs **any** delegated work; review vs implementation is just a difference in the prompt the consuming skill writes.

> ## ⛔ NEVER bypass the router — this is non-negotiable
>
> The delegate **always** runs through the `delegate exec` script. **NEVER** call a vendor binary directly — not from a Bash tool call, not "just this once," not because it seems quicker, not for any reason. The router is the whole point: it is the *only* thing that (1) opens the **visible Terminal.app window** the user watches to validate the delegate's process live, (2) enables the in-sandbox network access the agent needs, (3) writes the `/tmp/<slug>-delegate.md` output the skill reads back, and (4) hides the vendor behind `CLAUDE_DELEGATE_AGENT` so billing/profile selection stays correct.
>
> Calling a vendor binary directly runs it **headless in the background with no window** — silently defeating every one of those guarantees. The only correct invocation is `"$HOME/.claude/skills/delegate/delegate" exec [--headless] <prompt-file> <outfile>` — windowed (default) or `--headless`, both go **through the router** (the ban is on calling the vendor binary yourself, not on running without a window; `--headless` is the router's own no-GUI mode for cron/SSH). No exceptions. (The resolver internals below are the *one* place a binary name legitimately appears — everywhere else, route through `delegate`.)

> The smoke test showed `reasonix run` (and likewise `codex exec`) wraps its answer in its own chrome — a `thinking` line, a trailing token/cost footer. The consuming skill reads `<outfile>` and extracts the substantive findings; the resolver doesn't try to strip vendor chrome.

Two layers, kept separate on purpose:

1. **The `delegate` resolver** (`delegate` script in this directory) — the interface the skills actually call. It hides *which* vendor is in use behind three verbs.
2. **The transport** — the visible Terminal.app window the agent runs in. This is **not** delegate's code: it's the separate `terminal` skill, which delegate's `exec` verb calls. Skills never touch either layer directly except through the three verbs.

> **This router is the cross-vendor path** (Claude → Codex/DeepSeek). Delegating to *another Claude* (e.g. a cheap Sonnet/Haiku implementer following a plan) is a **peer option, not forbidden** — it just doesn't go through this script: use the Agent tool with a model override and a tight brief (no terminal, no resolver). `implement delegate` offers both as the implementer choice — cross-vendor via this router, or a cheaper Claude via the Agent tool. Pick the router when you want a non-Claude tool and a watchable window; pick the Agent tool when you want the cheapest, tightest plan-follower.

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

## The transport — owned by the `terminal` skill

`delegate exec` does **not** spawn or watch the window itself. It builds the vendor payload (`cat <prompt-file> | <runner>`) and hands it to the `terminal` skill's one-shot verb:

```
"$HOME/.claude/skills/terminal/terminal" run [--headless] <payload-file> <outfile>
```

That skill owns the whole Terminal.app transport — the visible window, the cold-start single-window guard, the `__TERMINAL_DONE__` sentinel and polling, and the window-left-open-at-an-idle-shell behavior. `--headless` passes straight through for cron/SSH where there's no GUI to open a window in. The division of labor: **`delegate` decides *which vendor command* runs; `terminal` runs it in a watchable pane.**

For the transport internals, the TCC/Automation grant, the secrets-on-a-pane caution, and the session mode (a persistent pane you can send commands to over time), read the `terminal` skill — `skills/terminal/SKILL.md` and its `one-shot.md` / `session.md` reference files.

### Adding a third agent

Edit one place — the `case "$a"` blocks in `delegate` (its `KNOWN` list, the `check` command, and the `runner` string). Skills and this doc don't change.
