# The project skill's `swarm.md`

`<repo>/.claude/skills/project/swarm.md` tells swarm workers how this one project behaves when
several of them build and test it at once. It wins over the runtime pages in
`skills/ref-cells/<runtime>/swarm.md`, which hold what is true of every project in that runtime.
It grows when a new heavy process or shared resource lands.

## Files

| File | Read by | Holds |
| --- | --- | --- |
| `swarm.md` | every worker, before its first build or test | the rules below, in prose |
| `swarm.env` | `swarm launch` | `KEY=VALUE` lines exported into each worker. `$MAIN` is the main checkout's path. `SWARM_MAX_WORKERS=<n>` caps the lead's slots |
| `swarm-settings.json` | `swarm launch` | merged into each worker's `claude --settings`, for example a plugin to turn off |

`swarm launch` reads `swarm.env` and `swarm-settings.json` from the main checkout, so a change
there reaches the next worker without landing first. Commit them wherever the project skill is
tracked; they are part of the project.

## What swarm.md answers

Write each as a section, with the exact commands. Leave a section out when the answer is "none".

1. **Heavy commands.** Every command that uses most of the CPU, the GPU, the disk or a lot of
   memory: builds, test suites, encoders, model runs, asset pipelines. Each one is called by its
   usual name so Turnstile queues it, or run as `turnstile run -- <command>` when it is a binary
   Turnstile does not shim. Name them exactly, so a worker never
   has to judge.
2. **The cheap check.** The fastest command that tells a worker its edit compiles or its unit
   passes, run often and without queueing if it really is cheap. A worker runs the full
   heavy suite once per round of edits, not after each file.
3. **Shared caches.** What every worker shares so nothing is built twice — a build directory, a
   package store, a downloaded model — and the `swarm.env` line that points workers at it.
4. **Per-worker resources.** Everything a worker must not share: ports, sockets, temp paths,
   databases, simulators, a local daemon, a GPU device. For each, how a worker gets its own,
   derived from `$SWARM_WORKER` (the bead id), and how it removes it before its pass ends.
5. **Queues and project tools.** Anything the project built to support parallel work — a job
   queue, a build server, a `--jobs` flag, an `admin` task that runs the suite in swarm mode —
   and when to use it.
6. **Slot cap.** When the machine can run fewer workers than the lead's default of 3 (a test
   suite that takes all memory, one GPU), set `SWARM_MAX_WORKERS` in `swarm.env` and say why here.

## Code support comes with it

When an answer above needs code that does not exist yet — a test that binds a fixed port, a
build script with no way to set its output directory, a suite with no cheap subset — write that
code too: a port read from the environment, a `--target-dir` flag, an `admin` task for the cheap
check. A rule the project cannot follow is not support.

## Audit

Run `swarm check` in the repo, then confirm every command `swarm.md` names still exists and
every per-worker resource still derives from `$SWARM_WORKER` in the code that binds it.
