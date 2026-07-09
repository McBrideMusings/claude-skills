---
name: generate
description: "Single front door for generating game/app assets — 3D models, images, textures, music, sound effects, and dialogue/voice — picking a backend (local ComfyUI, or cloud Tripo/Gemini/ElevenLabs) per asset type from a health-gated preference list. Use for 'generate a model/image/texture/sfx/music/voice line', 'make a game asset', 'text-to-3D', 'image-to-3D', 'need a sound effect', 'generate a texture', 'concept art', 'TTS/voiceover'. The engine holds the how-to once; each asset type's backends, prompts, and output format live in the _generate/ axis."
---

# Generate

One engine for all asset generation. The *process* — pick asset-type → choose a working backend →
prompt → call → post-process → write a game-ready file + manifest entry — is backend-agnostic. **Which**
backend and **how to prompt it** come from the asset-type axis in `_generate/<type>.md`.

Asset types: `model`, `image`, `texture`, `music`, `sfx`, `dialogue`. (Image vs texture are split on
purpose — texture demands seamless tiling + PBR maps + power-of-two sizing; image is flat 2D art.)

## Phase 01 — Resolve the asset type

From the request, pick exactly one type. Ambiguous "make art" → ask which (one plain-chat question).
Load `_generate/<type>.md` — it holds that type's backend candidates, credential gate, prompt
conventions, and output contract.

## Phase 02 — Choose a working backend (health-gated fallthrough)

Read the preference list for the type from `generate/backends.toml`. Walk it **in order** and use the
first backend that passes its health check:

- `comfy` (local, free) — passes only if the comfy ComfyUI plugin is reachable **and** a working local
  GPU is present. Drive it via the comfy plugin's `generate_image` / `generate_audio` MCP tools.
- `gemini` / `tripo` / `elevenlabs` (cloud, paid) — pass only if the env key
  (`generate/backends.toml` → `[providers.*]`) is present. Probe with the axis file's credential
  check and **paste the probe output**; never assume a key from memory.

Fall through to the next candidate on a failed gate. If **none** pass, stop and report exactly which
backends were tried and why each failed (GPU down / key missing) — do **not** fabricate an asset.

> Current machine state: comfy GPU is down and no cloud keys are configured, so most types report
> dormant today. That is the correct, honest output — a missing backend is a report, not an error.

## Phase 03 — Prompt + generate

Build the prompt from the axis file's conventions for that type. Generate. For the image→model chain,
an `image` output can feed `model` (image-to-3D) — run `image` first, then hand its file to `model`.

## Phase 04 — Post-process + integrate

Apply the axis file's post-process (texture tiling/PBR bake, audio trim/normalize, GLB optimize) and
write the game-ready output plus a manifest entry so the project can load it. Report the file path and
the backend actually used.

## Relationship to the `comfy` skill

`comfy` stays directly invocable for hands-on local ComfyUI work. `generate` is the routing layer that
*may* call comfy as one backend among several — use `generate` when you want "make me an asset, pick
the right tool"; use `comfy` when you specifically want to drive ComfyUI yourself.

Adapted from majidmanzarpour/threejs-game-skills (asset-generation providers) — see `_generate/`.
