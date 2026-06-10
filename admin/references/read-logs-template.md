Template body for `.claude/skills/read-logs.md`. Copy verbatim when the file is missing in a project.

```markdown
---
name: read-logs
description: Read runtime logs from the last admin dev or other command. Use when the user says they ran the app and something didn't work, or when you need to check what happened during the last run.
---

# Read Logs

Admin commands write to `tmp/<route>.log` (e.g. `admin dev ios` → `tmp/dev-ios.log`). Previous runs: `.log.1`, `.log.2`, `.log.3`.

## Strategy

- **Build problem** (didn't launch): read top 80 lines. Look for `error:`, `BUILD FAILED`, crash on launch.
- **Runtime bug** (launched then misbehaved): read bottom 80 lines.
- Read full file only if targeted reads insufficient.
- Check `.log.1` if current log empty/unrelated.

## Don't

- Read full log upfront if large
- Ask user to paste logs — just read the file
- Run `admin logs` — use Read directly
```
