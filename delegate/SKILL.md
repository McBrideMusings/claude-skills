---
name: delegate
disable-model-invocation: true
description: "Owner of the delegation-target ladder every skill picks from — Claude agent by default, escalating to a live herdr tab or a Terminal.app window — plus the router behind it: resolver verbs (agent/transport/check/exec), CLAUDE_DELEGATE_AGENT vendor selection (Codex, Reasonix/DeepSeek, or another Claude), and auth health-gating. Read when wiring, debugging, or extending any delegated work."
---

# Delegation backend

How the delegate flavors — `review dual` (the delegate **reviews** the same diff) and `implement delegate` (the delegate **implements** Claude's plan) — hand work to a second coding agent — Codex, Reasonix/DeepSeek, or **another Claude** — running non-interactively in a visible Terminal.app window. The router runs **any** delegated work; review vs implementation is just a difference in the prompt the consuming skill writes.

> ## ⛔ NEVER bypass the router — this is non-negotiable
>
> The delegate **always** runs through the `delegate exec` script. **NEVER** call a vendor binary directly — not from a Bash tool call, not "just this once," not because it seems quicker, not for any reason. The router is the whole point: it is the *only* thing that (1) opens the **visible Terminal.app window** the user watches to validate the delegate's process live, (2) enables the in-sandbox network access the agent needs, (3) writes the `/tmp/<slug>-delegate.md` output the skill reads back, and (4) hides the vendor behind `CLAUDE_DELEGATE_AGENT` so billing/profile selection stays correct.
>
> Calling a vendor binary directly runs it **headless in the background with no window** — silently defeating every one of those guarantees. The only correct invocation is `"$HOME/.claude/skills/delegate/delegate" exec [--headless] <prompt-file> <outfile>` — windowed (default) or `--headless`, both go **through the router** (the ban is on calling the vendor binary yourself, not on running without a window; `--headless` is the router's own no-GUI mode for cron/SSH). No exceptions. (The resolver internals below are the *one* place a binary name legitimately appears — everywhere else, route through `delegate`.)

> The smoke test showed `reasonix run` (and likewise `codex exec`) wraps its answer in its own chrome — a `thinking` line, a trailing token/cost footer. The consuming skill reads `<outfile>` and extracts the substantive findings; the resolver doesn't try to strip vendor chrome.

> ## Which target, before any of this
>
> **[TARGETS.md](TARGETS.md) owns the choice** of *whether* to reach for this router at all: the default for any delegation is the in-session **Claude `Agent` tool**, and only cross-vendor work, work the user must watch or take over, or work that must outlive this session escalates to a separate process. Read it first; this file is only about what happens once that escalation is warranted.

Three layers, kept separate on purpose:

1. **The `delegate` resolver** (`delegate` script in this directory) — the interface the skills actually call. It hides *which* vendor is in use behind four verbs.
2. **The transport choice** — herdr tab or Terminal.app window. Resolved by `delegate`, never asked (see below). `delegate transport` prints the answer and its reason.
3. **The transports themselves** — `herdr-agent` in this directory for the live herdr tab, and the separate `terminal` skill for the Terminal.app window. Skills never touch a transport directly.

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

delegate transport
    → prints the surface `exec` would use and why: "herdr (inside herdr and herdr can
      start claude)", "terminal (inside herdr, but 'reasonix' is not in herdr's --kind
      enum)", "terminal (not inside herdr)".
    → use it to name the target in a status line without running anything.

delegate check
    → is the resolved agent authenticated & reachable? exit 0 = ready, nonzero + message.
    → this IS the health gate — run it first; halt the skill on nonzero.

delegate exec [--headless] <prompt-file> <outfile>
    → run the resolved agent with the prompt in <prompt-file>; its answer lands in
      <outfile>. Blocks until the agent finishes, then returns. There is no "review" verb —
      a review is just an exec whose prompt asks for a review.
    → the surface is resolved, not chosen: a live agent in a herdr tab when we're inside
      herdr, else a one-shot in a visible Terminal.app window. Same contract either way.
    → --headless: skip both surfaces. Runs the agent as a plain subprocess, output straight
      to <outfile>. Use it where there's no GUI session and no herdr session to put
      anything in (cron, SSH, scheduled agents): the windowed default needs Terminal.app
      plus the one-time macOS Automation grant, which a headless run can't satisfy.
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

## The two transports

`delegate exec` never spawns or watches a surface itself. It decides **which vendor command runs**, resolves **which surface** to run it in, and hands off. Both transports take the same contract — a prompt in a file, the answer in `<outfile>`, blocking until done — so no consuming skill branches on which one ran.

### Resolution — automatic, and stated

| Condition | Transport |
|---|---|
| `--headless` | plain subprocess, no surface at all |
| `HERDR_ENV=1` **and** the vendor is in herdr's `--kind` enum | **herdr tab** |
| anything else | **Terminal.app window** |
| `DELEGATE_TRANSPORT=terminal\|herdr` | forces one; forcing `herdr` where it can't run is an error, not a fallback |

`delegate exec` prints the resolved transport and its reason as its first line, and `delegate transport` prints the same without running anything. **Put that line in the status message** — a delegate the user is told to go watch, that was only ever a background subprocess, is the failure this exists to stop.

**`reasonix` is not in herdr's `--kind` enum**, so a reasonix delegate always lands in Terminal.app even inside herdr. On the personal profile (`CLAUDE_DELEGATE_AGENT=reasonix`) that is the normal case, not an edge.

### herdr — a live agent in its own tab (`herdr-agent` in this directory)

`herdr tab create` (never a split — splitting squeezes the pane the user is reading) → wait for the pane to reach its shell prompt → `herdr agent start <slug> --kind <kind> --pane <id>` → `herdr agent prompt … --wait --until idle --until done`.

What runs is the vendor's **real interactive TUI**, not a piped one-shot. Three consequences:

- **It has no stdout to tee**, so `herdr-agent` appends a paragraph to the prompt telling the agent to write its complete answer to `<outfile>` itself. **That appended paragraph is the outfile contract** — remove it and every caller reads an empty file. If the agent finishes without writing it, `herdr-agent` scrapes `herdr pane read` into `<outfile>` and says on stderr that it did.
- **You can take it over.** Switch to the tab and type. That is the reason to prefer this surface.
- **It outlives us.** The tab and the agent survive this Claude session dying. `herdr-agent` never closes the tab and never focuses it — focusing marks it seen and collapses a `done` into `idle`. The user closes it.

Completion is herdr's own agent lifecycle state, not a sentinel: herdr already tracks whether the agent is `working`, so there is nothing to poll a file for.

### Terminal.app — a one-shot in a window (the `terminal` skill)

`delegate` builds `cat <prompt-file> | <runner>` and hands it to:

```
"$HOME/.claude/skills/terminal/terminal" run [--headless] <payload-file> <outfile>
```

That skill owns the whole Terminal.app transport — the visible window, the cold-start single-window guard, the `__TERMINAL_DONE__` sentinel and polling, and the window-left-open-at-an-idle-shell behavior. For its internals, the TCC/Automation grant, the secrets-on-a-pane caution, and its session mode (a persistent pane you send commands to over time), read `skills/terminal/SKILL.md` and its `one-shot.md` / `session.md`.

### Adding another agent

Edit one place — the `case "$a"` blocks in `delegate` (its `KNOWN` list, the `check` command, and the `runner` string). Skills and this doc don't change.
