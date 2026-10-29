---
name: dispatch
description: "`dispatch <target>` — give a brief to another executor and take its result back. Targets: `agent` (the in-session Claude Agent tool, the default), `workspace` (a herdr space or a Wheel pane, nested under the repo's space where a worktree allows it), `window` (a Terminal.app window), or a vendor (`codex`, `reasonix`). Load before starting any other session: 'dispatch a session/worker/space', 'open a new space and tell it to…', 'spin up an agent for each of these'; and when wiring, debugging, or extending dispatched work."
---

# Dispatch

Control words (`go`, `park`, `dispatch`, `implement`, `verify` …) are defined in
[`../CONTEXT.md`](../CONTEXT.md).

`dispatch <target>` is how a skill hands work to another executor and takes its result back. The
`codex` and `reasonix` targets — `review dual` (the target **reviews** the same diff) and
`implement dispatch codex` (the target **implements** Claude's plan) — run a second coding
agent — Codex, Reasonix/DeepSeek, or **another Claude** — non-interactively in a visible
Terminal.app window. The router runs **any** dispatched work; review vs implementation is just a
difference in the prompt the consuming skill writes.

> ## Every vendor-target call runs through `dispatch exec`
>
> `"$HOME/.claude/skills/dispatch/dispatch" exec --job <job> [--headless] <prompt-file> <outfile>` is the only correct invocation — windowed (default) or `--headless`, both go through the router. It is the *only* thing that (1) opens the **visible Terminal.app window** the user watches to validate the target's process live, (2) enables the in-sandbox network access the agent needs, (3) writes the `/tmp/<slug>-dispatch.md` output the skill reads back, and (4) hides the vendor behind the job's agent list so billing/profile selection stays correct. Calling a vendor binary directly runs it headless in the background with no window, silently defeating all four. (The resolver internals below are the *one* place a binary name legitimately appears — everywhere else, route through `dispatch`.)
>
> **Who reads the outfile depends on the mode.** In a **fire-and-forget** dispatch (the user asked for the `workspace` or `window` run) the caller never reads the outfile or watches the run. In a **report-back** dispatch the caller waits, reads the outfile and verifies the result (see [TARGETS.md](TARGETS.md) § Who feeds the result back). The check and the read-back below apply to report-back calls, such as `review dual`.
>
> **Caller-side check:** trust a target's result only when the router-owned outfile (`/tmp/<slug>-dispatch.md`) exists at the path the router reported. Its absence means the router was bypassed or the run failed — don't proceed as if it succeeded.

> `reasonix run` (and likewise `codex exec`) wraps its answer in its own chrome — a `thinking` line, a trailing token/cost footer. The consuming skill reads `<outfile>` and extracts the substantive findings; the resolver doesn't try to strip vendor chrome.

> ## Which target, before any of this
>
> **[TARGETS.md](TARGETS.md) owns the choice** of *which target* to dispatch to at all: the default is the in-session **`agent` target** (the Claude `Agent` tool), and only cross-vendor work, work the user must watch or take over, or work that must outlive this session escalates to `workspace` or `window`. Read it first; this file is only about what happens once that escalation is warranted.

Three layers, kept separate on purpose:

1. **The `dispatch` resolver** (`dispatch` script in this directory) — the interface the skills actually call. It hides *which* vendor is in use behind five verbs.
2. **The transport choice** — `workspace` (herdr) or `window` (Terminal.app). Resolved by `dispatch`, never asked (see below). `dispatch transport` prints the answer and its reason.
3. **The transports themselves** — `herdr-agent` in this directory for the live herdr pane/workspace, and the separate `terminal` skill for the Terminal.app window. Skills never touch a transport directly.

---

## The `dispatch` interface

Call it by absolute path so it works from either profile (the `skills/` dir is the same real directory for both):

```
$HOME/.claude/skills/dispatch/dispatch <verb>
```

```
<sel> = --job mechanical|execute|decide      pick from that job's agent list (below)
      | --agent <name>[:<model>]              name the agent outright (swarm's lanes)

dispatch config
    → each job list and SPILL_AT with the settings file that set it, then every layer
      read, lowest first. Start here when a pick surprises you.

dispatch agent <sel>
    → prints the picked agent and why: "codex:gpt-6.1-terra (claude 7d at 74%)",
      "claude:sonnet (claude 7d at 7%, under 70%)".
    → exits nonzero if the list is unset or names an unknown agent. Skills use it only to
      label output, by the name before the colon.

dispatch transport <sel>
    → prints the surface `exec` would use and why: "herdr (inside herdr and herdr can
      start claude; it gets a child space of the repo's space)" (or "a standalone space"),
      "terminal (inside herdr, but 'reasonix' is not in herdr's --kind enum)",
      "terminal (not inside herdr)".
    → use it to name the target in a status line without running anything.

dispatch check [<sel>]
    → every job list names only agents dispatch can launch ("gemini: no launcher in
      dispatch; known: claude, codex, reasonix"), and the agent <sel> picks — every listed
      agent, with no <sel> — is authenticated. exit 0 = ready, nonzero + message.
    → this IS the health gate — run it first; halt the skill on nonzero.

dispatch exec <sel> [--headless] [--name <name>] <prompt-file> <outfile>
    → run the picked agent with the prompt in <prompt-file>; its answer lands in
      <outfile>. Blocks until the agent finishes, then returns. There is no "review" verb —
      a review is just an exec whose prompt asks for a review.
    → the surface is resolved, not chosen: a live agent as a `workspace` when we're
      inside herdr, else `window` (a one-shot in a visible Terminal.app window). Same
      contract either way.
    → --headless: skip both surfaces. Runs the agent as a plain subprocess, output straight
      to <outfile>. Use it where there's no GUI session and no herdr session to put
      anything in (cron, SSH, scheduled agents): the windowed default needs Terminal.app
      plus the one-time macOS Automation grant, which a headless run can't satisfy.
```

The review prompt, the verdict format (e.g. `MERGEABLE / BLOCK`), and any follow-up rounds live in the **skills**, not here. The resolver doesn't know or care what the prompt is about.

### Calling pattern from a skill

```bash
D="$HOME/.claude/skills/dispatch/dispatch"
"$D" check --job decide || { echo "Cannot dispatch — see message above"; halt; }   # hard gate
# write the prompt (review instructions + the diff command to run) to a temp file
prompt="$(mktemp -t dispatch-prompt.XXXXXX)"
cat > "$prompt" <<'PROMPT'
Review the diff produced by `<diff-cmd>` for correctness, security, regressions, and
architecture fit. Output prioritized findings and a MERGEABLE/BLOCK verdict.
PROMPT
out="/tmp/<slug>-dispatch.md"
"$D" exec --job decide "$prompt" "$out"        # run this verb in the BACKGROUND (Bash run_in_background)
# when it returns, read "$out" for the findings
```

Run `dispatch exec` with the Bash tool's **background** mode: the agent can take minutes, and backgrounding keeps the Claude session free — the harness notifies you when the script (and thus the agent) exits, at which point you read `<outfile>`.

---

## Selecting the vendor

Every dispatch names a **job**, and each job has an ordered list of `agent:model` entries in a settings file's `env` block:

```sh
CLAUDE_DISPATCH_MECHANICAL=claude:haiku,codex:gpt-6-luna      # a rename, a string, a bounds check
CLAUDE_DISPATCH_EXECUTE=claude:sonnet,codex:gpt-6.1-terra     # follow a plan that names the files
CLAUDE_DISPATCH_DECIDE=claude:opus,codex:gpt-6-astra          # judgment: review, design
CLAUDE_DISPATCH_SPILL_AT=70                                   # usage percent that spills to the next agent
```

- **Order is preference.** `dispatch` takes the first entry, unless that agent's fullest usage window (5-hour or 7-day) is at or over `SPILL_AT` and the next entry's is under it — then the next one, and the launch line says why: `codex:gpt-6.1-terra (claude 7d at 74%)`. Only the first two entries are ever compared. When either agent's usage cannot be read, `dispatch` stays on the first and the reason says which reader failed.
- **Usage readers.** Claude: `~/.claude/tools/fetch-claude-usage.py`, for the profile `CLAUDE_CONFIG_DIR` names (`$DISPATCH_CLAUDE_USAGE` replaces the command, for a test). Codex: the newest `rate_limits` record in `$CODEX_HOME/sessions/**/*.jsonl` — a window whose `resets_at` has passed reads 0. Reasonix has no reader.
- **Where the lists live.** `dispatch` reads the files itself, lowest layer first, and the higher layer wins: `$CLAUDE_CONFIG_DIR/settings.json` (shared by both profiles), **`$CLAUDE_CONFIG_DIR/settings.local.json`** (the profile's own file — Claude Code does not read it, so `dispatch` does), the repo's `.claude/settings.json`, then the main checkout's `.claude/settings.local.json`. A repo changes a job by restating its whole list: `CLAUDE_DISPATCH_EXECUTE=claude:sonnet` there keeps Codex out of that repo. Exported environment variables do not count; `dispatch config` prints which file set each value. Reading them needs `jq` on PATH; without it every verb stops and says so. Spaces around the commas are ignored.
- **Profiles.** The work profile lists Codex second in each job; the personal profile lists `claude:` only.
- **The part after the colon** goes to the vendor's model flag: `claude --model`, `codex --model`, and `reasonix run -model`, which takes a provider name from Reasonix's own config (`reasonix doctor` lists them, e.g. `deepseek-pro`).
- **An unset list or an unknown name is a hard error** — `dispatch` never guesses a vendor (guessing means the wrong billing account). `--agent <name>[:<model>]` skips the list and the usage check, for a caller that already chose, such as `swarm` picking each lane's model.

### The `claude` vendor (Claude-to-Claude)

Runner: `claude -p --permission-mode <mode> [--model <model>]`, prompt on stdin, same windowed/headless transport as the other vendors. The model is the part after the colon in the picked entry. Optional env knobs:

- **`CLAUDE_DISPATCH_REMOTE_CONTROL`** — a session name; a herdr-hosted worker starts with `--remote-control <name>`, so the user can follow and steer it from the Claude app. Set it whenever the user asks for the worker to have Remote Control on. A Terminal.app one-shot (`-p`) ignores it.
- **`CLAUDE_DISPATCH_PERMISSION_MODE`** — defaults to `auto`: the auto-mode classifier approves or refuses each tool call, so a dispatched session nobody is watching does not stop on a permission prompt. Hooks and deny rules still apply. Set a narrower mode here (`acceptEdits`, `manual`) for a task that should ask before running commands.

The dispatched agent is a full Claude Code session: it reads the repo's CLAUDE.md, skills, and settings from whatever profile `CLAUDE_CONFIG_DIR` routing gives the spawned shell (the Terminal window inherits the cwd, so profile routing behaves exactly as if the user opened a terminal there).

### Where credentials live (never embedded)

The resolver only ever *checks* auth — it never sees a key.

- **Codex** — logged in via an OpenAI **API key** stored in `~/.codex` (`codex login`). `dispatch check` runs `codex login status` (note: it prints to **stderr**) and looks for "logged in".
- **Reasonix** — reads `DEEPSEEK_API_KEY` from the environment, referenced by `reasonix.toml`'s `api_key_env`. `dispatch check` runs `reasonix doctor` and looks for `key:present`.
- **Claude** — the normal Claude Code login (`claude auth login`). `dispatch check` runs `claude auth status` and looks for `"loggedIn": true`.

Codex and Reasonix are **API-billed**; the `claude` vendor bills the signed-in Claude account (subscription or API, per the login) — same account the orchestrating session uses under that profile.

---

## The two transports

`dispatch exec` never spawns or watches a surface itself. It decides **which vendor command runs**, resolves **which surface** to run it in, and hands off. Both transports take the same contract — a prompt in a file, the answer in `<outfile>`, blocking until done — so no consuming skill branches on which one ran.

### Resolution — automatic, and stated

| Condition | Transport |
|---|---|
| `--headless` | plain subprocess, no surface at all |
| `HERDR_ENV=1` **and** the vendor is in herdr's `--kind` enum | **`workspace`** (a herdr space) |
| `WHEEL_ENV=1` (and not herdr) **and** the vendor is `claude` | **`wheel`** (a pane in the caller's Wheel space) |
| anything else | **Terminal.app window** |
| `DISPATCH_TRANSPORT=terminal\|herdr\|wheel` | forces one; forcing `herdr` or `wheel` where it can't run is an error, not a fallback |

`dispatch exec` prints the resolved transport and its reason as its first line, and `dispatch transport` prints the same without running anything. **Put that line in the status message** — a target the user is told to go watch, that was only ever a background subprocess, is the failure this exists to stop.

**`reasonix` is not in herdr's `--kind` enum**, so a `dispatch reasonix` always lands in Terminal.app even inside herdr.

### herdr — a live agent in its own space (`herdr-agent` in this directory)

`herdr-agent` gives the worker a **space** (herdr's workspace), never a tab of the caller's. Run from a linked worktree of a repo herdr tracks, it runs `herdr worktree open --workspace <repo-workspace-id>`: a child space nested under the repo's space, with the agent in its first tab. Anywhere else — read-only work in the main checkout, a worktree herdr refuses (one of the skills submodule), a directory that is not a repo — it runs `herdr workspace create --cwd <dir> --label <name> --no-focus`: a standalone top-level space, because `herdr workspace create` has no parent option. It never runs `herdr tab create` as a fallback and never `herdr pane split`, which would squeeze the caller's own pane, the one the user is reading. The one tab it still adds carries the dispatch's name, when the child space was already open: never open the space yourself first. **The name is `dispatch exec --name "<what the work is>"`** — a few words the user can read in herdr's sidebar; the space (a child space it opened is renamed with `herdr workspace rename`) and its tab carry it, and the agent's own name is that text made legal plus the process id. Always pass it; without it the label falls back to the directory's name. Then it waits for the pane to reach its shell prompt → `herdr agent start <slug> --kind <kind> --pane <id>` → `herdr agent prompt … --wait --until idle --until done`.

**Never write `/<skill>` into a dispatched prompt** — slash expansion is an interactive-input feature; text delivered by herdr agent prompt, `--exec`, or a relay arrives as plain user text and is never expanded. Write "call `Skill(<name>)` first, then …" instead.

What runs is the vendor's **real interactive TUI**, not a piped one-shot. Three consequences:

- **It has no stdout to tee**, so `herdr-agent` appends a paragraph to the prompt telling the agent to write its complete answer to `<outfile>` itself. **That appended paragraph is the outfile contract** — remove it and every caller reads an empty file. If the agent finishes without writing it, `herdr-agent` scrapes `herdr pane read` into `<outfile>` and says on stderr that it did.
- **You can take it over.** Switch to the space and type. That is the reason to prefer this surface.
- **It outlives us.** The space and the agent survive this Claude session dying. `herdr-agent` never closes the space and never focuses it — focusing marks it seen and collapses a `done` into `idle`. Whoever owns the result closes it (`herdr workspace close`).

Completion is herdr's own agent lifecycle state, not a sentinel: herdr already tracks whether the agent is `working`, so there is nothing to poll a file for.

### Wheel — a live claude in a pane (`wheel-agent` in this directory)

By default the worker stays in the caller's own space. `wheel-agent` splits a terminal pane off the caller's pane (`$WHEEL_PANE`) to the right for the first worker, and under the newest live worker for each later one, so workers stack in one column beside the caller. With `$WHEEL_AGENT_SPACE` (a space name) and `$WHEEL_AGENT_SPACE_DIR`, workers go to that space instead, made with `wheel space new --background` when it is not open and split with `pane split --background`, so it runs with no window and the caller's screen never moves; the Mac app closes it once its last pane closes (ADR-0014 in the wheel repo). `swarm` uses this. It types `claude --permission-mode … --model … --settings … "<brief>"` at that pane's shell, so the shell's profile router and every flag herdr would pass still apply.

Wheel does not track the state of a claude running in a terminal, so the worker reports its own: `wheel-agent` merges hooks into its `--settings` (`UserPromptSubmit` and `PostToolUse` write `working`, a `permission_prompt` Notification writes `blocked`, `Stop` writes `idle`) and waits on that file. Only `claude` has those hooks, so a codex or reasonix dispatch inside Wheel goes to Terminal.app. `$WHEEL_AGENT_DIR` (default a temp dir) receives `pane` and `state`. The outfile contract and the pane-scrape fallback (exit 3) are the same as herdr's. The pane is left open; whoever owns the result closes it (`wheel pane close <pane>`).

### Terminal.app — a one-shot in a window (the `terminal` skill)

`dispatch` builds `cat <prompt-file> | <runner>` and hands it to:

```
"$HOME/.claude/skills/dispatch/terminal" run [--headless] <payload-file> <outfile>
```

That skill owns the whole Terminal.app transport — the visible window, the cold-start single-window guard, the `__TERMINAL_DONE__` sentinel and polling, and the window-left-open-at-an-idle-shell behavior. For its internals, the TCC/Automation grant, the secrets-on-a-pane caution, and its session mode (a persistent pane you send commands to over time), read `skills/dispatch/TRANSPORT-TERMINAL.md` and its `TRANSPORT-TERMINAL-ONESHOT.md` / `TRANSPORT-TERMINAL-SESSION.md`.

### Adding another agent

Edit one place — `dispatch` itself: its `KNOWN` list, the `auth_check` case, a `usage_<name>` reader if the agent reports usage, and the `runner` string. Then name it in a job list.
