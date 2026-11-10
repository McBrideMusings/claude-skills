---
name: recomp
description: Work on a native recompilation port (static recompiler plus a Vulkan/NVN-style renderer) running on the Steam Deck or Bazzite: get it built and installed, measure where a frame goes (GPU passes, CPU threads, power), and decide what to optimize. Use for "why is the port slow", "profile the Deck build", "which draw is expensive", or when bringing up a new port. Planning and acceptance rules live in `static-recompilation-pipeline`; this skill is the measuring workflow and tool map.
---

# Recomp

Read first: the project's `AGENTS.md` and `docs/current-state.md` (the handoff), then the knowledge base page
`fleet/steam-deck/recomp-profiling.md` (`~/.claude/tools/qmd get qmd://knowledge/fleet/steam-deck/recomp-profiling.md`),
which lists the tools by device and the commands that work. Planning, evidence levels and acceptance wording:
the `static-recompilation-pipeline` skill (`~/.codex/skills/static-recompilation-pipeline/SKILL.md`).

## Hosts

- `ssh deck`: the target. 4 Zen 2 cores, 15 W socket, shared memory. Never build here: a compile beside a game makes it unplayable.
- `ssh bazzite`: build host (RX 9070 XT) and a second target. Edits to its files go through a script run over ssh; a quote inside an ssh single-quoted command breaks the shell.
- Copy builds with `scp bazzite:<file> deck:<file>` through the Mac and check a hash.

## One run at a time

1. Stop the game and wait until `pgrep -f '^./bin/hookshot'` on the Deck is empty, plus a few seconds. Starting a second launch shows Steam's "Game already running".
2. Change one variable (an env var in the Deck's `test-env.sh`, one setting, one build).
3. Run, read the last steady-state report, record number and source.
4. Stop the game and restore every setting changed (`test-env.sh`, `hookshot_options.ini`, `steamosctl` CPU boost / scheduler / GPU level). Never leave a game running at the end of a turn.

Do not pipe a script that ends in a stop into `head`: the pipe closes and the script dies before the stop.

## Find where the frame goes, in this order

1. **GPU or not GPU?** Run pass timing (`RX_VK_PASS_TIMING=1`) at the automatic clock and with the GPU clock pinned (`steamosctl set-gpu-performance-level manual; steamosctl set-manual-gpu-clock 1600`). If GPU time falls and FPS does not, the limit is elsewhere. One `gpu_busy_percent` reading is not evidence.
2. **Power:** `gpu_metrics` shows socket, CPU and GPU watts. A Deck at 15 W with the CPU taking 9 W leaves the GPU 2 W and a 200-1150 MHz clock; the CPU and GPU compete.
3. **CPU:** per-thread running, ready-for-a-core and sleeping shares and kernel waits (`private/tools/sampler.py` in the OoT project), plus `RX_VK_FRAME_PHASE_LOG` per-frame phases. Frame generation alternates real and generated rows.
4. **What a program is:** `RX_VK_DUMP=<present>` with `RX_VK_DUMP_PROGS=<keys>` writes what each pass rendered.
5. **How a shader compiled:** `RADV_DEBUG=shaders,nocache` and `private/tools/aco_stats.py` (instructions, registers, spills).
6. **Is it pixel-bound?** Change the game's resolution setting and compare per-pass times: passes that do not shrink are geometry or compute bound.

## Tools that do not work here

- **RenderDoc on the Hookshot renderer:** the layer hides `VK_EXT_external_memory_host`, which Hookshot needs to import guest memory, so the renderer fails at startup. Deck has `renderdoccmd` 1.46; Bazzite has `qrenderdoc` 1.46. Revisit only if the renderer gains a copy path.
- **`perf`, `strace`, `gdb`:** not installed on the Deck, no root.
- **Capping guest threads** with cgroup quotas: a lock-holding thread throttled at 20 ms per 100 ms stalled the game to 8 FPS.

## Reporting

State what was measured against what was inferred; label a number as inferred when it was not timed. When a result contradicts an earlier claim, correct the artifact and handoff at once. Keep `docs/current-state.md` and the conversation's Wheel artifact in step with each run.
