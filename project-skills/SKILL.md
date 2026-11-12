---
name: project-skills
description: "Generate or audit a repo's own project skills — `<repo>/.claude/skills/project-verify/` (prove the real app works), `project-perf/` (what it may cost), `project-logs/` (where dev and production logs live and how to fetch them by device and time), `project-swarm/` (how swarm workers build and test it side by side) and, for a repo with a UI surface, `project-design/` (how to design an element, screen or layout here against the repo's root `DESIGN.md`). Load when a repo has no `project-verify` skill, when a commit is refused for lacking one, or when auditing them for drift."
---

# Generate or audit a repo's project skills

Every repo with a build or test step keeps a set of skills of its own under
`<repo>/.claude/skills/`, one per question about this repo. Each is a real skill: other skills
and the user call it by name (`Skill(project-verify)`, `/project-logs`), and its load shows in
the transcript. This skill writes and audits all of them the same way.

```text
<repo>/
├── DESIGN.md                 # the repo's design, Google DESIGN.md format (UI repos only)
└── .claude/skills/
    ├── project-verify/
    │   ├── SKILL.md          # prove the real thing works: launch, doctor, drive, evidence, cleanup
    │   ├── triggers.txt      # commands that mean verify work has started (optional)
    │   ├── features/         # the feature map, one file per user-facing feature
    │   └── tools/            # launch, fixture and drive scripts
    ├── project-perf/
    │   ├── SKILL.md          # scenarios, their scripts, the limits a pass fails on
    │   └── tools/
    ├── project-logs/
    │   ├── SKILL.md          # where logs live in dev and production, the fetch command, line → fix
    │   └── tools/
    ├── project-swarm/
    │   ├── SKILL.md          # heavy commands, cheap check, shared caches, per-worker resources
    │   ├── swarm.env         # KEY=VALUE lines `swarm launch` exports into each worker (optional)
    │   └── swarm-settings.json   # merged into each worker's --settings (optional)
    └── project-design/       # UI repos only
        ├── SKILL.md          # how to design here; the design itself is DESIGN.md
        └── tools/            # shots.sh (every state rendered), lint.sh (DESIGN.md + project rules)
```

A script lives in the skill that calls it. Another skill reuses it by its path
(`../project-verify/tools/launch.sh`), never by a copy.

`hooks/project-skills-guard.sh` refuses `git commit` in a repo with a build or test manifest
and no `project-verify/SKILL.md`, and says so at session start. The commit that adds the skill
goes through: the check reads the disk, not git.

Never ask which mode. `test -f <repo>/.claude/skills/project-verify/SKILL.md` decides: missing →
**Create**, present → **Audit**. In a linked worktree, the primary checkout's copy counts
(`admin populate` links `.claude/skills/*` into worktrees). A repo still holding the old
combined `project/` directory, or the older `verify-project/`, `swarm-worker/` and
`read-logs.md`, gets **Migrate** first.

## Create

0. **A repo with a build or test step and no task runner gets one proposed as an option set**, per `../bootstrap/PHASE-03-TASK-RUNNER-AND-LICENSE.md` §Task runner.
1. **Read the repo, not the user.** Its README, CLAUDE.md, `admin.toml`, build files, test
   setup, Dockerfiles and deploy scripts answer almost everything. Ask only what the code
   cannot say — usually which devices or hosts the thing runs on in production.
2. **Write each skill** from its page here, in this order. A skill whose answer is "none" still
   exists and says so in one line with the reason (a library has no process, so its
   `project-logs` is that one line). `project-design` is the exception: a repo with no UI
   surface gets none.

   | Skill | Page | Answers |
   | --- | --- | --- |
   | `project-verify` | [`verify.md`](verify.md) | How a program proves the real app or tooling works |
   | `project-perf` | [`perf.md`](perf.md) | What it may cost while it runs, as scenarios with limits |
   | `project-logs` | [`logs.md`](logs.md) | Where every log of every runtime lives, and how to read one without the user passing it in |
   | `project-swarm` | [`swarm.md`](swarm.md) | How several workers build and test it at once |
   | `project-design` | [`design.md`](design.md) | How to design an element, screen or layout here, against `DESIGN.md` |

3. **Write each `SKILL.md`'s frontmatter** from the templates below. The description is what
   makes the skill load, so it names this repo's surface, runtimes and stack, not the generic
   words.
4. **Write the code support a skill names** in the same change: a log file the app does not
   write yet, a push to Loki an app lacks, a configurable port, an `admin` task, a lint rule
   `DESIGN.md` says is enforced. A skill the project cannot follow is not support.
5. **Prove it.** Run each skill once: one verify drive end to end, every `project-perf`
   scenario (once on the current code and once on the broken version its limit is set
   against), one `project-logs` fetch that returns real lines from each runtime it names,
   `swarm check` for `project-swarm`, and `tools/shots.sh` plus `tools/lint.sh` for
   `project-design`. A skill never executed is a draft.

Whether the skills are tracked follows the repo: if `.claude/skills/` is tracked there, commit
them; if `.claude/` is excluded, add each `.claude/skills/project-*` path to
`.git/info/exclude`, never `.gitignore`. `DESIGN.md` sits at the root and is always tracked.

### Frontmatter templates

```markdown
---
name: project-verify
description: "<Project>: prove a change works on the real <surface> — launch, doctor, drive, evidence, cleanup. Read before reporting any change to <project> works."
---
```

```markdown
---
name: project-perf
description: "<Project>: the cost scenarios (<scenarios>) a diff must run after project-verify, and the limits that fail it."
---
```

```markdown
---
name: project-logs
description: "<Project>: where its logs live (<runtimes>) and the command that fetches them by device and time. Read when something happened while it ran — on <devices>, at a time; it fetches the lines itself, never ask the user to paste them."
---
```

```markdown
---
name: project-swarm
description: "<Project>: how swarm workers build and test it side by side — heavy commands, the cheap check, shared caches, per-worker <resources>. Read before the first build or test in a swarm worktree."
---
```

```markdown
---
name: project-design
description: "<Project>: how to design or change any element, screen, layout or flow in its <stack> UI — read DESIGN.md, follow its components and layout, render every state, lint. Read before building or changing anything a user sees."
---
```

## Migrate

A repo with the combined `<repo>/.claude/skills/project/` directory:

1. `git mv` (or `mv`, when `.claude/` is excluded) each section into its skill:
   `verify.md` → `project-verify/SKILL.md`, `features/` and `triggers.txt` →
   `project-verify/`, `perf.md` → `project-perf/SKILL.md`, `logs.md` →
   `project-logs/SKILL.md`, `swarm.md`, `swarm.env`, `swarm-settings.json` → `project-swarm/`.
   A section beyond those four (wheel's `deploy.md`) goes to the skill that calls it, or
   becomes its own `project-<name>` skill when the user asks for it by name.
2. Move each script in `tools/` to the skill that calls it (`grep -l tools/<script>`). A script
   two skills call stays in the first one's `tools/` and the other reaches it by path.
3. Give each `SKILL.md` its frontmatter from the templates, and rewrite every path inside the
   moved files (`project/tools/` → `project-<skill>/tools/`, `verify.md` →
   `project-verify`).
4. Delete `project/` and, if present, the older `verify-project/`, `swarm-worker/` and
   `read-logs.md` once their content is in the new skills.
5. Add `project-design` and `DESIGN.md` per [`design.md`](design.md) when the repo has a UI
   surface.
6. Prove it as in Create step 5.

## Audit

Run each skill's own audit (its page's Audit part) and fix drift under that skill's directory
and in `DESIGN.md` only. Outcomes, one per run: **clean** (no commit), **changed** (proven
corrections committed), **blocked** (say exactly what blocked it). Product behavior that is
broken goes to the user, never papered over in a skill.

Keep run notes under `/private/tmp/claude/<repo-slug>/`; don't commit them.
