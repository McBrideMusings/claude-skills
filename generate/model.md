# Model generation axis

Read by the `generate` engine when the requested asset is a model.
Covers text-to-3D and image-to-3D, texturing, rigging, retargeting, stylization, and conversion to
game-ready GLB/FBX. `comfy` is NOT a candidate for 3D — Tripo is the only backend.

Adapted from majidmanzarpour/threejs-game-skills.

## Backends

| Order | Backend | Provider | Env var / local | Health check |
| --- | --- | --- | --- | --- |
| 1 | tripo | Tripo (cloud) | `TRIPO_API_KEY` | key present in env or `--api-key` |

No local fallback: comfy does not do 3D. If Tripo is dormant, the type reports no working backend.

## Credential gate

- Never store keys in skill files or client-side game code; never paste a key value into a report.
- Read from env or `--api-key`. **Probe before declaring unavailable** and paste the literal probe
  output (`TRIPO_API_KEY=SET|MISSING`). Keys in a shell profile can be absent from process env — if
  a plain probe prints MISSING unexpectedly, re-run under a login shell that sources the profile.
- The engine health-gates and falls through; here there is nothing to fall through to.
- Key not configured yet → report **dormant**, do not fabricate a GLB.
- Tripo download URLs expire quickly — download immediately after a task succeeds.

## Prompt conventions

- Improve the user's prompt with material, silhouette, camera/readability, scale, and game-use
  constraints; append "game-ready, readable silhouette, PBR, clean topology, centered pivot, no text".
- **Riggable characters:** require a full-body T-pose or A-pose, arms away from body, symmetric, no
  props fused to the silhouette; verify the rendered preview really is in T/A-pose before rigging.
- Keep the mesh fused: `--quad` forces FBX; `--generate-parts` disables texturing.
- Body plan routes the rigger: bipeds → `v1.0-20240301`; creatures → `v2.5-20260210`.
- Never pass `--animate-in-place` (corrupts the bake); strip root motion in the engine instead.

## Output + integration

- Output = **game-ready GLB** (PBR). Load with `GLTFLoader`; rigged clips via `AnimationMixer`.
- **Image → model chain:** an `image.md` PNG can feed image-to-3D here — pass the saved concept path
  as the `image` input and record the chain in the asset ledger.
- Pipeline: generate → prerigcheck → validated rig (with retries) → retargets → download.
- Inspect triangle/texture/material count, file size, scale, pivot, bounds, and clip names/counts
  before wiring. Verify motion visually in the engine, not just that the file exists.
- Report probe output, task IDs, output paths, model version, texture/geometry settings, animations,
  conversion settings, and any missing/failed steps.
