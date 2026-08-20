---
name: caffeinate
disable-model-invocation: true
description: "Keep the Mac awake with macOS caffeinate — manual holds for a duration, while a process runs, or with the display on — plus status/cleanup/doctor for the automatic turn-bound keep-awake hook. Use for any request to keep the Mac or screen awake or to check or clean up caffeinate state."
user_invocable: true
---

# Caffeinate (macOS keep-awake)

Keep the Mac awake using the built-in `caffeinate` command — no install. This skill is the **manual** control surface plus the **doctor / cleanup** for the automatic turn-bound hook that runs on every Claude session.

## The flag that matters most

`caffeinate` assertions are independent switches — combine only what you want:

| Flag | Holds awake |
|---|---|
| `-i` | idle **system** sleep (machine keeps running) |
| `-m` | **disk** idle sleep |
| `-d` | **display** sleep (monitors stay lit) |
| `-s` | system sleep on AC power (`-s` no-ops on battery) |
| `-u` | declare user active right now (wakes display) |

**Default for a background hold: `-i -m` and NOT `-d`** → the machine stays fully awake and working, while the **monitors go black on their own** normal timer. Add `-d` only when the user explicitly wants the screen lit (a dashboard, a presentation).

Duration is `-t <seconds>`: 2h = 7200, 8h = 28800, overnight (10h) = 36000. Omit `-t` and it runs until killed. Multiple caffeinate procs stack — the Mac is awake if *any* assertion is held, so overlapping holds never conflict.

## Manual holds

Always run detached so it never blocks the shell, and report the PID + expiry back:

```bash
mkdir -p ~/.claude-tmp/caffeinate
# system awake for N seconds, monitors free to sleep (the usual ask):
nohup caffeinate -i -m -t 28800 >/dev/null 2>&1 &  echo $! > ~/.claude-tmp/caffeinate/manual-$!.pid
# screen ON too (presentation/dashboard):
nohup caffeinate -i -m -d -t 7200 >/dev/null 2>&1 & echo $! > ~/.claude-tmp/caffeinate/manual-$!.pid
# tie to a process — dies when that PID exits (great for a long build):
nohup caffeinate -i -m -w <PID> >/dev/null 2>&1 &   echo $! > ~/.claude-tmp/caffeinate/manual-$!.pid
```

Write manual holds to `~/.claude-tmp/caffeinate/manual-<pid>.pid` so `status`/`doctor` can see them and `cleanup` knows to **leave them alone** (they're deliberate, not hook leaks). After starting, tell the user the PID, the flags, and the wall-clock expiry.

### `caffeinate remote` — the leave-the-house hold

When the user is about to work over SSH / from their phone and can't afford the Mac sleeping between tasks, start a long-lived, generous hold so they're never locked out:

```bash
nohup caffeinate -i -m -t 43200 >/dev/null 2>&1 & echo $! > ~/.claude-tmp/caffeinate/manual-$!.pid   # 12h
```

This is separate from the automatic hook's short post-turn grace — it's a deliberate "hold the machine open while I'm away" that only ends when it expires or the user runs `cleanup`.

## The automatic hook (context for doctor)

Two hooks in `settings.json` keep the Mac awake **only while Claude is actively working**, bound to the session — leak-proof by construction:

- **UserPromptSubmit** → `~/.claude/hooks/caffeinate.sh start` spawns `caffeinate -i -m -w <claude_pid> -t 3600` and records its PID in `~/.claude-tmp/caffeinate/hook-<session_id>.pid`. It holds the whole turn (however long), and dies on its own if the session process crashes (`-w`).
- **Stop / StopFailure** → `~/.claude/hooks/caffeinate.sh stop` kills the turn hold and swaps in a self-expiring **grace** hold `caffeinate -i -m -t $CLAUDE_CAFFEINATE_GRACE_SECS` (default 900 = 15 min). The next prompt cancels the grace and starts a fresh turn hold.

Why it can't leak: the turn hold is pinned to the session PID, the grace hold is a bounded `-t` timer, and 10 concurrent sessions are just the OR of 10 independent holds — no shared counter to get stuck. When every session is idle past its grace, zero caffeinate procs remain and the Mac sleeps normally. A manual hold (above) is invisible to the hook and outlives it.

The pidfiles themselves are self-maintaining, so `cleanup` is a diagnostic, not routine hygiene:

- `start` deletes any `hook-*.pid` untouched for more than 24h before doing anything else. A live session rewrites its own pidfile every turn and no hold outlives `MAX_TURN_SECS`, so an older file is dead by definition. `manual-*.pid` is never touched.
- Before killing the PID it recorded, the hook checks that PID is still a `caffeinate`. Without that check, resuming a weeks-old session would `kill` whatever unrelated process had since inherited that recycled PID.

Tunables (env, machine-local `settings.json` → `env`): `CLAUDE_CAFFEINATE_GRACE_SECS` (post-turn grace, default 900), `CLAUDE_CAFFEINATE_MAX_TURN_SECS` (turn backstop, default 3600), `CLAUDE_CAFFEINATE_DISABLE=1` (turn the hook off entirely).

## `status`

Show every hold and the live power state:

```bash
echo "== caffeinate procs =="; pgrep -fl caffeinate || echo "  none"
echo "== tracked pidfiles =="; ls -1 ~/.claude-tmp/caffeinate/*.pid 2>/dev/null || echo "  none"
echo "== power assertions =="; pmset -g assertions | grep -iE 'PreventUserIdleSystemSleep|PreventUserIdleDisplaySleep|PreventDiskIdle' | grep -v ' 0$'
echo "== grace setting =="; echo "  CLAUDE_CAFFEINATE_GRACE_SECS=${CLAUDE_CAFFEINATE_GRACE_SECS:-900}"
```

Report: which holds are hook (`hook-*.pid`) vs manual (`manual-*.pid`), whether the Mac is currently held awake, and whether the display is also held (`-d` present in any proc's flags).

## `cleanup`

Reap **hook** leaks only — stale `hook-*.pid` whose session is gone or whose PID is dead. **Never** touch `manual-*.pid` holds (those are deliberate); to end a manual hold, the user must ask for it by name/PID.

```bash
for pf in ~/.claude-tmp/caffeinate/hook-*.pid; do
  [ -e "$pf" ] || continue
  p="$(cat "$pf" 2>/dev/null)"
  if [ -z "$p" ] || ! kill -0 "$p" 2>/dev/null; then rm -f "$pf"; continue; fi   # dead → prune pidfile
done
# any caffeinate proc not referenced by a live pidfile is a true orphan — list it, confirm, then kill:
pgrep -fl caffeinate
```

Before killing any live process, list what you'll kill and get an explicit yes (it's a `kill`). Prune dead pidfiles freely — that's just file cleanup.

## `doctor`

Checklist — verify the whole keep-awake system is wired and leak-free:

1. **Binary** — `command -v caffeinate` resolves. (No → not macOS; hook self-disables.)
2. **Hook script present + executable** — `ls -l ~/.claude/hooks/caffeinate.sh`.
3. **Hooks wired** — `settings.json` has `caffeinate.sh start` under `UserPromptSubmit` and `caffeinate.sh stop` under `Stop` (and ideally `StopFailure`):
   ```bash
   jq -r '.hooks.UserPromptSubmit,.hooks.Stop,.hooks.StopFailure' ~/.claude/settings.json | grep -c 'caffeinate.sh'
   ```
4. **No leaks** — every live `caffeinate` proc is either referenced by a live pidfile or a manual hold. Note the direction: an untracked live proc is the leak. A `hook-*.pid` pointing at a dead PID is expected for up to 24h (the session's grace expired, the next `start` will reap the file) — only flag one older than that, since it means the age prune isn't running.
5. **State sanity** — if `pmset -g assertions` shows the system held awake but there is **no active turn and no manual hold and every grace window has expired**, that's a leak → run `cleanup`.

Report each as ✅ / ⚠️ with the one-line fix. If a hook line is missing, offer to add it via the `update-config` skill (never hand-edit a user into a broken `settings.json`).

## Gotchas

- `caffeinate` prints nothing and holds the terminal — it looks stuck but isn't. Verify with `pgrep -fl caffeinate`, never by staring at the terminal.
- With `-t`, it exits silently at expiry — no notification. "Is it still on?" → check `pgrep` first; it may have simply expired.
- Keyboard backlight has its own inactivity timer `caffeinate` can't hold. One-time manual fix: System Settings → Keyboard → "Turn keyboard backlight off after inactivity" → Never.
