# SFX generation axis

Read by the `generate` engine when the requested asset is an sfx.
Covers short one-shot sound effects: jumps, hits, weapons, explosions, coins, pickups, collisions,
and UI clicks/confirms/errors. For longer musical beds use `music.md`; for spoken lines use
`dialogue.md`.

Adapted from majidmanzarpour/threejs-game-skills.

## Backends

| Order | Backend | Provider | Env var / local | Health check |
| --- | --- | --- | --- | --- |
| 1 | comfy | local ComfyUI | local instance + GPU | comfy `generate_audio` reachable, GPU up |
| 2 | elevenlabs | ElevenLabs (cloud) | `ELEVENLABS_API_KEY` | key present in env or `--api-key` |

comfy is the free/local first choice; elevenlabs is the cloud fallback.

## Credential gate

- Never store keys in skill files or client-side game code; never paste a key value into a report.
- comfy: health-check the local ComfyUI instance and confirm a working GPU first — the user's GPU is
  currently down, so comfy is unreachable today.
- elevenlabs: read from env or `--api-key`; **probe before declaring unavailable** and paste the
  literal output (`ELEVENLABS_API_KEY=SET|MISSING`). Profile-only keys can be absent from process env.
  Add a `--validate` call to `GET /user` to confirm the key works; an out-of-credit or plan-limited
  key surfaces as an `HTTP 4xx` on a real attempt — report it as a plan/purchase blocker, don't skip.
- The engine tries comfy, falls through to elevenlabs, reports "no working backend" if both fail.
- Keys not configured yet + GPU down → report **dormant**; never fabricate audio.

## Prompt conventions

- Describe the transient, tail, and material: "tight futuristic boost pickup, bright transient, short
  sparkling tail, arcade racing game".
- One-shots: 0.5–2.5s, prompt influence `0.55–0.8`; UI clicks: 0.15–0.8s, high influence, keep
  transients clear. Name the game/genre so timbre matches the scene.

## Output + integration

- Output = **short one-shot** (`mp3_44100_128`) plus a **manifest entry** (id, path, volume group),
  stored under `assets/audio/sfx/` or `assets/audio/ui/`.
- Runtime: generate locally, commit/import files, load via Web Audio / Three.js and trigger on game
  events; map ids through the audio manifest; respect the user-gesture unlock and volume/mute groups.
  Never put keys in browser code.
- Report probe output/backend used, prompt, duration, prompt influence, output format/path, manifest
  entry, and any licensing/plan assumptions tied to the account.
