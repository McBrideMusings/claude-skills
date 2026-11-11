# OOT/MKW case: functional integration matters

In the OOT workbench, the Pokopia Windows snapshot already supplied an ARM64/LLVM compiler and a working game's runtime/renderer. The new target still required Linux ELF/platform work and a substantial different-title GPU/service/memory integration. “Runs another game” did not establish compatibility with all of the target's demands.

Hookshot's pinned design attributes its foundation to MKW7336f0a: static CPU lift, standalone Horizon runtime, NVN2, SM86 shader translation, Vulkan, captures and queue ordering. It preserves shared paths for three-way upstream patching and separates title adapters. This reduced the amount of unproven integration. Its public history is a mature snapshot, so dates do not establish total engineering time. Public availability of the documented historical MKW revision is not proven.

Concrete inherited practices to look for in any functional reference port:

- Cross-queue waits and resource registration ordering follow the guest command timeline.
- Replay observes submit-time data, not racing live guest pointers; host imports alone do not prove coherent lifetime/ordering.
- Dynamic-resolution feedback uses consistent GPU timing; render-pass hazards are represented explicitly.
- Thread limits are measured on the actual CPU; adding workers may reduce throughput.
- ISA/function comparisons use independent oracles; unsupported forms and stubs remain visible.
- Game-specific address hooks are gated by exact build IDs, and common fixes remain upstream-mergeable.

Our first-playable Hookshot test built in1009seconds and verified walking/camera/house→forest, but warm outdoor queue-present samples were25.08–25.16FPS with p99~56–58ms. That is evidence of a stronger playable baseline, not whole-game correctness or the requested30FPS pass. Source and shipped backend versions were not proven identical.

The successful debugging pattern was an exact shader-pipeline probe: an8GiB OOM reproduced in12seconds; a later cleanup compiled at~1.44GiB. The failed decision pattern was a large microbenchmark gain without matched world-FPS progress. Compare integration fit and end-to-end evidence rather than framework names or development-time claims.

Detailed evidence and source/timestamp references remain in the originating workspace's `docs/static-recompilation-retrospective.md`, `docs/hookshot-evaluation.md` and `private/process-retrospective/`. Those project-local records are optional case-study context, not dependencies a copied skill assumes exist. Do not embed this game's addresses or hardware settings in another game's pipeline.

A separate public reference, adriadam10/mkw-recomp at ab1ad52c4e2f19936aeb27ee6c6e1a73ef989875, was published November9. It is not Hookshot's private MKW base. Its tools/test/replay.sh compares serial/parallel frame replays against reference images; tools/run/ab.py uses scene-balanced same-session A/B; tools/shaders/flow_check.py validates restructuring off-GPU; tools/build/README.md separates runtime-only builds. These are practices to evaluate and adapt, not verified drop-in dependencies. Its documented timing/stability limitations remain explicit. The originating workspace's docs/mkw-port-reference.md contains pinned links.
