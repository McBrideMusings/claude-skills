---
name: recomp
description: Make a native static recompilation of a game faster on its target device (Steam Deck or Bazzite, static recompiler plus a Vulkan/NVN-style renderer), and bring one up to playable first if it is not. Use for "the port is slow", "get to 30 FPS", "why is the frame 90 ms", "profile the Deck build", or a port that does not boot yet. Each pass ends in a change that is kept or reverted on a measured frame; it never ends in a measurement alone.
disable-model-invocation: true
---

# Recomp

The deliverable is the game running at the target frame time on the target device at the user's settings. A document, a census, a probe or a plan is not the deliverable; it is allowed only as the step before a change.

Read first: the project's `AGENTS.md` and `docs/current-state.md` (the handoff), then the knowledge base page `fleet/steam-deck/recomp-profiling.md` (`~/.claude/tools/qmd get qmd://knowledge/fleet/steam-deck/recomp-profiling.md`), which lists the tools by device and the commands that work.

## 1. The frame model: one table that every decision reads

Before the first change and after every measured run, write the frame as a chain of links with a measured time per link at the current settings. The chain for a replay-style port (guest CPU builds a command stream, a replay thread translates it, the GPU executes it, the guest reads something back) is:

| Link | How it is measured | Serial with the next link? |
|---|---|---|
| Guest simulation CPU | main-thread CPU per frame | yes, until it hands off |
| Replay / translation CPU | replay-thread CPU per frame, sub-phases (descriptors, uploads, pipeline lookups) | depends on frames in flight |
| GPU execution | timestamp spans, busy percent, and clock | depends on readbacks |
| Readback waits | wait start/end per value, mean and count | yes when the guest blocks |
| Power budget | socket, CPU and GPU watts, GPU clock | couples CPU and GPU on a shared-TDP SoC |

Add links the project has (shader compilation, decompression workers, audio). Mark each link **serial** or **overlapped** with its neighbour from a timeline trace keyed by submission id, not from totals. The sum of overlapped links is not the frame; the longest serial path is. When the sum of the serial links is well under the frame, there is an unmeasured wait: find it before anything else.

The largest serial link is the target of the next change. Nothing else is.

Two patterns that have cost weeks when missed:

- **A shared-TDP device starves the GPU.** CPU watts and GPU watts come from one budget. A Deck at 15 W with the CPU taking 9 W leaves the GPU 2 W and a 200–1150 MHz clock. If the GPU runs at a fraction of its clock while busy, cutting guest CPU work raises GPU throughput. Pin the GPU clock as the *test configuration* to see the CPU-side frame; the fix is the CPU work.
- **A serial chain is not a throughput limit.** Replay 38 ms, GPU 35 ms busy, frame 87 ms means neither unit is saturated and the chain is serial. Overlapping the next frame's replay with this frame's GPU work is the change; shaving either link alone is not.

### Filling the table, in this order

1. **GPU or not GPU?** Pass timing (`RX_VK_PASS_TIMING=1`) at the automatic clock and with the GPU clock pinned (`steamosctl set-gpu-performance-level manual; steamosctl set-manual-gpu-clock 1600`). If GPU time falls and FPS does not, the limit is elsewhere. One `gpu_busy_percent` reading is not evidence.
2. **Power:** `gpu_metrics` gives socket, CPU and GPU watts and the GPU clock.
3. **CPU:** per-thread running, ready-for-a-core and sleeping shares and kernel waits (`private/tools/sampler.py` in the OoT project), plus `RX_VK_FRAME_PHASE_LOG` with `RX_VK_FRAME_LOG` for per-frame replay phases. Frame generation alternates real and generated rows.
4. **Waits:** each readback or capture wait with the value it waited on, start and end, on the thread that blocked.
5. **What a program is:** `RX_VK_DUMP=<present>` with `RX_VK_DUMP_PROGS=<keys>` writes what each pass rendered.
6. **How a shader compiled:** `RADV_DEBUG=shaders,nocache` and `private/tools/aco_stats.py` (instructions, registers, spills).
7. **Is it pixel-bound?** Change the resolution setting and compare per-pass times: passes that do not shrink are geometry or compute bound. This is a test configuration, never a kept fix.

## 2. The loop

Each pass is one cycle. Count passes; the number of passes with no kept change is the health of the project.

1. **Read the frame model.** Name the largest serial link and its measured ms.
2. **Name one change** that shortens that link, with the predicted ms it removes. A change is code, a build flag, or a configuration. If the link's cause is unknown, the change is one diagnostic launch that must end in a named change; it is not allowed to end in "needs more data".
3. **Build and launch once** on the device at the standard scene with the standard settings. Record native frame median and p99, generated frames separately, the build hash, and the model's links from the same launch.
4. **Decide at once.** Faster by more than the launch-to-launch spread and not visibly worse: **keep it as the working configuration** and move on. Not faster: revert, and write one line saying what the model got wrong. Visibly worse: revert the change, keep the direction.
5. **Update the frame model** from the launch. Write the checkpoint (section 6). Go to 1.

Budget: after three passes on one link with nothing kept, the model is wrong about that link. Re-measure the chain; do not refine the probe.

"Working configuration" means the build and settings every later pass measures against. It is not a release. Promote the working configuration to a release only when the acceptance contract in section 5 passes; until then nothing is held back from the loop by that contract.

Observational work that is acceptable in a pass: one launch with instrumentation on, producing the numbers for the table. Observational work that is not: a second arm of the same probe, a sampled variant of the same probe, an overhead measurement of the probe, a census of a component smaller than the largest link. Each of those is a pass spent on no change.

A measured gain is kept even when it is small and even when it was one launch, as long as a second launch of the previous configuration in the same session confirms the spread. "Within historical variation" is not a reason to drop a change; two launches each way is the test, and both run in the same pass.

Workarounds that prove a cause (a pinned clock, a disabled subsystem, a capped resolution) are legitimate test configurations and are recorded as such. They are not kept as the fix; the pass that follows attacks the cause they exposed.

## 3. Hosts and one run at a time

- `ssh deck`: the target. 4 Zen 2 cores, 15 W socket, shared memory. Never build here: a compile beside a game makes it unplayable.
- `ssh bazzite`: build host (RX 9070 XT) and a second target. Edits to its files go through a script run over ssh; a quote inside an ssh single-quoted command breaks the shell.
- Copy builds with `scp bazzite:<file> deck:<file>` through the Mac and check a hash.

1. Stop the game and wait until `pgrep -f '^./bin/hookshot'` on the Deck is empty, plus a few seconds. A second launch shows Steam's "Game already running".
2. Change one variable (an env var in the Deck's `test-env.sh`, one setting, one build).
3. Run, read the last steady-state report, record the number and its source.
4. Stop the game and restore temporary experiment settings (`test-env.sh`, `hookshot_options.ini`, `steamosctl` CPU boost / scheduler / GPU level). A kept change becomes the working configuration: retain its exact build and settings, update the handoff and the harness baseline checks, and keep the previous build for comparison. Do not let cleanup silently reinstall the previous build. Never leave a game running at the end of a turn.

Do not pipe a script that ends in a stop into `head`: the pipe closes and the script dies before the stop.

Tools that do not work here: RenderDoc on the Hookshot renderer (the layer hides `VK_EXT_external_memory_host`, which Hookshot needs to import guest memory); `perf`, `strace` and `gdb` on the Deck as root (user-mode `perf record -e cycles:u` from the project's own `build/perf/perf` does work); cgroup quotas on guest threads (a lock holder throttled to 20 ms per 100 ms stalled the game to 8 FPS).

## 4. Correctness is kept, not traded

A rendering correctness fix stays in the working configuration even when it costs frames. A faster launch with flicker, missing draws or wrong geometry reverts. When a performance change touches a wait, name the producer, consumer, byte range, ownership interval and exact completion dependency, and show the replacement preserves visibility, ordering and lifetime; a wait is not redundant because removing it is faster, and lower FPS after a fix is not evidence that its wait is unnecessary.

Distinguish presentation readiness, GPU-to-CPU readback, CPU overwrites of GPU inputs, and cross-queue dependencies. Name the actual wait rather than "waiting for the GPU". A resource lifetime tag or a completed recording chunk does not establish that an entire submission finished. Do not infer simultaneous writes to one image, premature presentation, or local responsibility from flicker alone: trace the dependency and inspect source provenance before assigning a cause.

Correctness checks run on every kept change: a temporal brightness scan and a contact sheet of the launch, compared with the previous working configuration. They are cheap and run inside the pass. The expensive checks (movement coverage, long play, other scenes) run at promotion.

## 5. Acceptance: at promotion, not at every pass

Promotion to a release needs, at the user's settings and scene: two independent warm launches, native median and p99 against the budget (33.33 ms for 30 FPS, 16.67 ms for 60), generated or repeated frames counted separately, movement as well as stationary, no temporal or geometric regression, the build hash and settings recorded, and no build or capture contention in the window. Queue-return timestamps are not scanout; say so. Cold shader compilation is reported separately from warm frames.

Do not apply this contract to a pass. A pass is one launch and a decision.

## 6. The checkpoint: one screen

Keep one current checkpoint (the project's `docs/current-state.md`), rewritten each pass, no longer than one screen, and keep the conversation's Wheel artifact in step with it:

1. Working configuration: build hashes, settings, host, and the one-line command to verify them.
2. The frame model table from the last launch.
3. Last pass: the change, predicted ms, measured ms, kept or reverted, and why.
4. Next pass: the link and the change.
5. Running jobs with owner, PID, log and stop command; and the device's owner right now.
6. Passes so far and passes with nothing kept.

History goes to git and to an archive file, never to the checkpoint. A checkpoint that needs scrolling has become a log. State what was measured against what was inferred; label a number as inferred when it was not timed. When a result contradicts an earlier claim, correct the artifact and handoff at once. Read [the checkpoint contract](references/checkpoint.md) for the fields a performance sample carries.

## 7. Bring-up, when the port does not run yet

Pick the foundation with the least unproven integration for this exact title, guest platform, graphics stack and target OS; a port that runs another game proves integration, not compatibility. Read [the OoT/MKW case](references/oot-mkw-case.md) when choosing between a framework and a functional port. Keep input hashes, source pins, local patches, build commands and the host's exact hardware recorded from the first build.

Advance the furthest verified checkpoint in order: startup, title, controllable scene, transitions and saves, required progression. Each is proven by exercising it, not by a compile or a screenshot of the previous one. For a failure, extract the exact shader, resource, instruction or service call into a bounded reproduction at real scale, form one falsifiable hypothesis, fix the translator or runtime contract, and replay the reproduction and the earlier checkpoints. Declare CPU and GPU translation policy separately; an on-demand fallback on a covered path is an open item.

Performance work starts the moment a scene is controllable. Bring-up and the loop in section 2 then alternate: a crash or visual defect found during a pass becomes that pass's change.

## 8. Ownership

One agent owns the device, the running game and the measured build at a time; the checkpoint names the owner. A second agent reads, builds in its own directory, and waits for the hand-off. Dispatching work is not progress; a kept change is.
