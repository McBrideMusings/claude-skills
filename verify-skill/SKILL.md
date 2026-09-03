---
name: verify-skill
description: "Generate or audit a project's `verify-project` skill — the scripted, evidence-based proof that the real app or tooling works. Load before writing `.claude/skills/verify-project` for a repo that has none, or when auditing an existing one for drift. Covers UI/CLI/service apps and dev-tooling-only repos (hooks, libraries, CLIs with no live app) alike."
---

# Generate or audit a `verify-project` skill

Every project keeps `.claude/skills/verify-project` — the scripted way to prove the real
thing works, never "it built" or "the diff looks right." This skill is how that gets
written and kept honest. One skill, two modes, chosen by what's on disk:

- **No `.claude/skills/verify-project` yet → Create.**
- **One exists → Audit.**

Never ask which mode; `test -d .claude/skills/verify-project` answers it.

## Before either mode: pick the template

Read the repo to answer one question: **does a user drive this thing live (UI, CLI, TUI,
API, mobile), or is the code itself the artifact (hooks, libraries, generators, CI
scripts) with nothing to "run" as an app?**

- **Live-app repos** get the **feature-map template**: `Launch/Doctor/Drive/Evidence/
  Cleanup/Helpers` plus a `features/` directory, one file per user-facing feature.
- **Dev-tooling repos** (no runtime surface a user opens) get the **suite-driven
  template**: numbered sections that run the test suite at three granularities, then
  drive the artifact itself with a real payload, plus mutation testing and a
  `Not verification` section.

A repo can be both (a CLI tool that's also a library) — pick the primary surface and
note the other exists.

## Create mode

### 1. Interview the repo, not the user

Answer these by reading the codebase; only ask what you can't observe:

- **Surface** — what does a user touch? Pick the primary one if there are several.
- **Run** — the repo's own documented dev command (package scripts, Makefile, README).
  Ports, env vars, seed data, auth.
- **Drive** — existing harnesses first (Playwright/Cypress specs, expect scripts, PTY
  helpers, curl-able endpoints). Only then a generic recipe: browser/CDP for web and
  Electron, tmux/PTY for CLI/TUI, plain HTTP for services. For a suite-driven repo,
  "drive" means the test runner plus the artifact's own invocation (a hook fed a real
  payload, a CLI run with real flags).
- **Observe** — what evidence can be captured? Screenshots, terminal transcripts,
  response bodies, logs, exit codes, DB state, real output pasted from an actual run.
- **Isolate** — can two instances run side by side (ports, data dirs, profiles)? If not,
  say so in the generated skill: refusing to double-drive a shared instance beats
  corrupting the user's session.

If the repo doesn't build or start as-is, fix that first (or report precisely) before
generating — a skill written against a broken base teaches wrong steps.

### 2. Write `.claude/skills/verify-project/SKILL.md`

Frontmatter: `name: verify-project`, `description:` naming the app/tooling, the surface,
and when to reach for it.

**Feature-map template body:**

- **Launch** — exact start command, readiness signal, teardown. A short-lived CLI/TUI
  has no server to keep alive: launch means build/install once, then start each drive in
  its own isolated PTY or tmux session.
- **Doctor** — one read-only check answering "is this instance worth driving?" (process
  up, right version, port owned by us, auth valid).
- **Drive** — the harness recipe with real selectors/commands from this repo, not
  placeholders. Stable handles (ARIA labels, data attributes, prompt strings, routes)
  over coordinates and tab order.
- **Evidence** — what to capture and where. Exercise the real user path, not internal
  setters or test-only endpoints. Capture the action and the resulting state, not just
  the final screen. Verify side effects (files written, rows inserted, messages sent)
  alongside what's visible. When the safe path is a dry-run, verify what it actually
  skips by observing (files, network, git refs), not by trusting its name.
- **Cleanup** — tear down what this run started, never by process name. Cleanup removes
  instances and scratch state, never the evidence.
- **Helpers** — any shipped script is executable and its invocation is shown in the
  skill body.

**Suite-driven template body** — model this repo's own `.claude/skills/verify-project`
(`~/.claude`'s), adapted to the target repo's actual test tooling:

- Run the whole suite, then the narrowed suite for one change, then one suite directly —
  each section shows real pasted output, not a description of what output looks like.
- Drive the artifact itself with a real payload (a hook fed real stdin JSON, a CLI run
  with real args) — a passing test suite proves what the suite's author thought of, not
  the actual surface.
- A wiring/registration check if the repo has one (a hook that does nothing until it's
  registered somewhere).
- Mutation testing for any change that touched a test file: capture the non-test diff,
  reverse it, confirm the narrowed suite now fails, reapply, confirm it passes again.
- A closing **`Not verification`** section naming the false positives specific to this
  repo (clean git status, a build alone, reading the diff).

### 3. Seed the feature map (feature-map template only)

`.claude/skills/verify-project/features/README.md` plus one file per user-facing feature
(top 3-5 to start, from routes/commands/menus/docs). Each feature file: one H1 + one
paragraph, then exactly four H2s in order:

1. `Sub-features` — short IDs, one line each.
2. `How to get to it (user POV)` — every user entry point.
3. `Driving it with <harness>` — starts with `Preconditions:`, then labeled bullets
   pairing each user action with an exact command and observable result.
4. `Gotchas` — traps that can waste or invalidate a run.

Keep implementation details out — name only user paths, stable handles, required state,
commands, and observable proof. The map is the maintained verification source; a proof
that only drives one convenient entry point is incomplete when the map lists others.

### 4. Prove the generated skill before handing it over

Run its own instructions end to end once: launch, doctor, drive one mapped feature (or
one suite-driven section), capture evidence, clean up. After cleanup, confirm the
evidence still exists at the named location — a cleanup that eats the proof fails this
step. A generated skill that was never executed is a draft, not a deliverable.

## Audit mode

Keeps a `verify-project` honest as the app changes. The unit of rigor is the feature (or
section), not every sentence.

**Outcomes — pick one, say which:**

- **clean** — full coverage, nothing worth shipping. No branch, no commit.
- **changed** — proven doc/harness/map corrections, committed.
- **blocked** — coverage couldn't finish or a proven fix couldn't ship safely. Say
  exactly what blocked it.

**Edit scope:** only the verify-project skill's own directory (`SKILL.md`, `features/`,
its harness scripts). Never edit product code during a run — behavior the map describes
that the app no longer does is either doc drift (fix the map) or a product regression
(report it, don't paper over it in docs).

**Pass:**

1. **Index hygiene** — read the feature map README (or the suite-driven skill's section
   list) and its siblings. Fix missing, extra, duplicate, or dead entries.
2. **Source wave** — one read-only subagent per feature file (or per section),
   concurrent. Each explains how the behavior works from source, flags likely drift with
   citations, returns one live-verification recipe. Children never drive the app and
   never edit files.
3. **Reconcile** — merge overlapping recipes into as few app states as practical.
   Spot-check cited drift; don't re-prove clean claims. Sweep recent churn for
   user-facing surfaces (or new suites/hooks) missing from the map — require a concrete
   source path before calling one missing.
4. **Live pass** — required even when source looks clean. Follow the skill's own launch
   model: one long-lived instance driven serially for servers/UIs, a fresh isolated
   session per drive for short-lived CLIs, or the actual test/mutation run for
   suite-driven repos. Exercise every feature/section at least once. Three invariants
   hold the whole pass: doctor before the first drive and after any failed drive (or a
   real test run, for suite-driven repos); evidence captured so far survives every
   cleanup, checked at its named location, not assumed; nothing a drive started outlives
   that drive's usefulness. A doctor failure caused by skill drift is drift — fix it
   under edit scope and retry once before calling the pass `blocked`. A feature that
   can't be reached is `verified-unreachable` only with the concrete prerequisite (auth,
   entitlement, OS, external state) and the route attempted; if the map omits that
   prerequisite, that's drift too.
5. **Triage** — wrong or missing user-POV description → doc drift, fix it. Working
   behavior the harness can't drive → harness gap, fix it (same helpers rule: script
   executable, invocation documented in the skill body). App behavior that's actually
   broken → product gap: record it for the user, keep it out of this change.
6. **Ship or stop** — `changed`: commit the proven corrections, re-reading every changed
   file first. `clean`/`blocked`: no commit, report the outcome and coverage honestly.

Keep run notes (features covered, unreachable prerequisites, confirmed drift, outcome)
under `/private/tmp/claude/<repo-slug>/`; don't commit them.
