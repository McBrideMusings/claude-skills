# Music generation axis

Read by the `generate` engine when the requested asset is music.
Covers longer musical beds: looping ambience, room tones, and background tracks. For short one-shot
effects (jumps, hits, clicks) use `sfx.md`; for spoken lines use `dialogue.md`.

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
  Add a `--validate` call to `GET /user` to confirm the key works; a valid key can still be
  out-of-credit or plan-limited — that surfaces as an `HTTP 4xx` on a real attempt, report it as a
  plan/purchase blocker, do not silently skip.
- The engine tries comfy, falls through to elevenlabs, reports "no working backend" if both fail.
- Keys not configured yet + GPU down → report **dormant**; never fabricate audio.

## Prompt conventions

- Describe genre, mood, instrumentation, tempo feel, and the scene the bed plays under.
- Looping ambience/tracks: 8–30s, request a **seamless loop**, keep prompt influence low
  (`0.3–0.55`) so the model stays on the described bed rather than adding one-off events.
- Name the surface it sits behind (menu, battle arena, dungeon room) so density matches.

## Output + integration

- Output = **web-audio-ready loop** (`mp3_44100_128`) plus a **manifest entry** (id, path, loop flag,
  volume group), stored under `assets/audio/ambience/` or `assets/audio/music/`.
- Runtime: generate locally, commit/import the file, load via Web Audio / Three.js with looping on;
  respect the user-gesture unlock, pause/resume, and volume/mute groups. Never put keys in browser code.
- Report probe output/backend used, prompt, duration, loop flag, output format/path, manifest entry,
  and any licensing/plan assumptions tied to the account.
