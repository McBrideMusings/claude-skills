# The `project-deploy` skill

`<repo>/.claude/skills/project-deploy/` lets a session ship a landed change, or answer "is my
change live?", without the person walking it through: which command deploys each part, what
that command refuses, how to prove what is now running, and what to read when it went wrong.

## The rule it applies: the script catches the mistake

Every deploy, release, upload, publish and migration runs through a script: a package script
(`bun run deploy`), a Makefile target, or a file under the repo's `tools/` or `scripts/`. Never a
bare vendor command (`wrangler deploy`, `devvit publish`, `fly deploy`) typed by hand. The
script refuses, before it changes anything, every mistake a program can detect, and says what to
do instead. A warning in a doc is the fallback for a mistake no program can see, never the first
defence.

The checks most deploys need, each a small script that runs as the first step and exits non-zero
with the fix in its message:

| Mistake | The check |
| --- | --- |
| Shipping an old or local build | The deploy script builds; it never uploads a build directory it did not just write |
| Shipping from the wrong commit | Fetch `origin/<default>`; refuse a dirty tree or a `HEAD` that is not exactly it |
| Shipping to the wrong target or account | The target is an argument or a named script, checked against the logged-in account before the upload |
| Not knowing what went live | The build stamps the commit SHA and build date into the bundle, the UI shows it, and server logs carry it |
| A migration the running code cannot read | The migration step runs before the code that needs it, and refuses one that is not forward-compatible |

A guard lives in the repo's script, so a person running the deploy by hand gets it too. A session
that finds itself about to type a bare vendor command stops and uses the script, or writes it.

## What project-deploy answers

One section per part that ships separately (a web app, a worker, a mobile build, a platform
upload). For each:

1. **The command.** The script that deploys it, and what starts it: a merge to the default
   branch (CI/CD), a manual workflow, or a person at a terminal.
2. **What it refuses.** Each check the script runs first, by file.
3. **How to confirm what went live.** The command or page that shows the running version, and
   the value to expect (the commit SHA the build stamped).
4. **Watching it.** The live log tail to run right after a deploy (`wrangler tail <worker>`,
   the platform's `logs` command), and what a healthy first minute looks like.
5. **Rollback.** The command that puts the previous version back, and what it cannot undo (a
   migration, a sent message).

Then two lists for the whole repo:

- **Gotchas.** One row per mistake a deploy here can make: what happens, and the guard that
  refuses it by file and line, or `unguarded` and why no program can see it. Link the repo's
  own deploy doc for depth (`apps/<app>/DEPLOY.md#section`), never copy it.
- **Debugging a deploy.** From symptom to cause: the CI run to read, the version read to compare
  against the expected SHA, the log query (from `project-logs`) for the minutes after the
  deploy.

## Create

Write the sections from the repo's deploy scripts, CI workflows and deploy docs. For each gotcha
with no guard, write the guard into the script in the same change (Create step 4 in
[`SKILL.md`](SKILL.md)), and add one small test that the guard refuses the case it names. When
the person has said the repo gets docs only, leave the code alone and mark the row `unguarded`.

## Audit

- Run each guard against the case it refuses (a dirty tree, an off-default `HEAD`, a missing
  build, the wrong account) without the real upload: the script must exit non-zero before any
  network write. A guard that lets the case through is drift in the script, not the skill.
- Run each confirm command and check it returns the version the default branch's last deploy
  stamped.
- Follow every link into the repo's deploy doc; a heading that moved is drift.
- Read the deploy scripts and workflows for a command that changed since the skill was written.
- A gotcha still marked `unguarded` that a program could detect is a finding: write the guard,
  or report it when the repo is docs-only.
