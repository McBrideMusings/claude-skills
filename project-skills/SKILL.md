---
name: project-skills
description: "Generate or audit a repo's own `project` skill — `<repo>/.claude/skills/project/`, holding how to verify the real app works (verify.md), what it may cost (perf.md), where its dev and production logs live and how to fetch them by device and time (logs.md), how swarm workers build and test it side by side (swarm.md), and the project's scripts (tools/). Load when a repo has no project skill, when a commit is refused for lacking one, or when auditing one for drift."
---

# Generate or audit a repo's `project` skill

Every repo with a build or test step keeps one skill of its own, `<repo>/.claude/skills/project/`.
It answers four questions about this one repo, each in its own section file, and this skill
writes and audits all four the same way.

```text
<repo>/.claude/skills/project/
├── SKILL.md      # frontmatter + one paragraph per section, saying when to read it
├── verify.md     # prove the real thing works: launch, doctor, drive, evidence, cleanup
├── perf.md       # what it may cost: scenarios, their scripts, the limits a pass fails on
├── logs.md       # where logs live in dev and production, the fetch command, line → fix
├── swarm.md      # heavy commands, cheap check, shared caches, per-worker resources
├── swarm.env     # KEY=VALUE lines `swarm launch` exports into each worker (optional)
├── swarm-settings.json   # merged into each worker's --settings (optional)
├── features/     # verify.md's feature map, one file per user-facing feature
└── tools/        # the project's own scripts the sections call
```

`hooks/project-skills-guard.sh` refuses `git commit` in a repo with a build or test manifest
and no `project/SKILL.md`, and says so at session start. The commit that adds the skill goes
through: the check reads the disk, not git.

Never ask which mode. `test -f <repo>/.claude/skills/project/SKILL.md` decides: missing →
**Create**, present → **Audit**. In a linked worktree, the primary checkout's copy counts
(`admin populate` links `.claude/skills/*` into worktrees).

## Create

0. **A repo with a build or test step and no task runner gets one proposed as an option set**, per `../bootstrap/PHASE-03-TASK-RUNNER-AND-LICENSE.md` §Task runner.
1. **Read the repo, not the user.** Its README, CLAUDE.md, `admin.toml`, build files, test
   setup, Dockerfiles and deploy scripts answer almost everything. Ask only what the code
   cannot say — usually which devices or hosts the thing runs on in production.
2. **Write each section** from its page here, in this order. A section whose answer is
   "none" still exists and says so in one line with the reason (a library has no process, so
   its `logs.md` is that one line).

   | Section | Page | Answers |
   | --- | --- | --- |
   | `verify.md` | [`verify.md`](verify.md) | How a program proves the real app or tooling works |
   | `perf.md` | [`perf.md`](perf.md) | What it may cost while it runs, as scenarios with limits |
   | `logs.md` | [`logs.md`](logs.md) | Where every log of every runtime lives, and how to read one without the user passing it in |
   | `swarm.md` | [`swarm.md`](swarm.md) | How several workers build and test it at once |

3. **Write `SKILL.md`** last, from the template below.
4. **Write the code support a section names** in the same change: a log file the app does not
   write yet, a push to Loki an app lacks, a configurable port, an `admin` task. A section the
   project cannot follow is not support.
5. **Prove it.** Run each section once: one verify drive end to end, every `perf.md` scenario
   (once on the current code and once on the broken version its limit is set against), one `logs.md` fetch that
   returns real lines from each runtime it names, and `swarm check` for `swarm.md`. A section
   never executed is a draft.

Whether the skill is tracked follows the repo: if `.claude/skills/` is tracked there, commit
it; if `.claude/` is excluded, add `.claude/skills/project` to `.git/info/exclude`, never
`.gitignore`.

### SKILL.md template

```markdown
---
name: project
description: "<Project>: how to verify it works (<surface>), where its logs live (<runtimes>) and how to fetch them, and how swarm workers build it. Read before declaring a change verified, before diagnosing anything that happened while it ran, and before the first build in a swarm worktree."
---

# <Project>

- **Verify** — read [verify.md](verify.md) before reporting any change works.
- **Performance** — read [perf.md](perf.md) after `verify.md`: the scenarios a diff must run and
  the limits that fail it.
- **Logs** — read [logs.md](logs.md) when something happened while it ran: on a device, a
  server, a container, at a time. It fetches the lines itself; never ask the user to paste them.
- **Swarm** — read [swarm.md](swarm.md) before the first build or test in a swarm worktree.

Scripts the sections call live in [tools/](tools/).
```

## Audit

Run each section's own audit (its page's Audit part) and fix drift under this skill's
directory only. Outcomes, one per run: **clean** (no commit), **changed** (proven
corrections committed), **blocked** (say exactly what blocked it). Product behavior that is
broken goes to the user, never papered over in the skill.

Keep run notes under `/private/tmp/claude/<repo-slug>/`; don't commit them.
