# Dialogue generation axis

Read by the `generate` engine when the requested asset is dialogue.
Covers spoken voice: announcer barks, boss/character lines, tutorial prompts, menu narration, plus
voice conversion of a scratch performance and cleanup/isolation of noisy speech. `comfy` is NOT a
candidate — ElevenLabs TTS/voice is the only backend.

Adapted from majidmanzarpour/threejs-game-skills.

## Backends

| Order | Backend | Provider | Env var / local | Health check |
| --- | --- | --- | --- | --- |
| 1 | elevenlabs | ElevenLabs (cloud) | `ELEVENLABS_API_KEY` | key present in env or `--api-key`; `--validate` → `GET /user` |

No local fallback: comfy does not do TTS/voice. If ElevenLabs is dormant, the type reports no working
backend.

## Credential gate

- Never store keys in skill files or client-side game code; never paste a key value into a report.
- Read from env or `--api-key`. **Probe before declaring unavailable** and paste the literal output
  (`ELEVENLABS_API_KEY=SET|MISSING`). Profile-only keys can be absent from process env — re-run under
  a login shell that sources the profile if a plain probe prints MISSING unexpectedly.
- Add `--validate` to call `GET /user` (`VALID_USER=...`) when a key is present but a generation
  fails. An out-of-credit or plan-limited key surfaces as an `HTTP 4xx` on a real attempt — report it
  as a plan/purchase blocker, do not silently skip.
- The engine health-gates and falls through; here there is nothing to fall through to.
- Key not configured yet → report **dormant**; never fabricate a voice line.

## Prompt conventions

- **TTS:** clean generated lines — supply the exact `--text` and a `--voice-id`; keep lines short and
  in character (announcer, boss, tutorial). Best when timing/acting doesn't need a human take.
- **Voice conversion:** convert a scratch performance into a target character voice while preserving
  timing and emotion — use when the acting matters; pass the scratch input and target `--voice-id`.
- **Cleanup:** isolate/denoise noisy speech first (before voice conversion, TTS replacement, or
  transcription); add remove-background-noise on conversion when the source is dirty.

## Output + integration

- Output = **voice clip** (`mp3_44100_128`) plus a **manifest entry** (id, path, voice id, volume
  group), stored under `assets/audio/voice/`.
- Runtime: generate locally, commit/import files, load via Web Audio / Three.js; trigger on game
  events, respect the user-gesture unlock, pause/resume, and volume/mute groups. Never put keys in
  browser code.
- Report probe/validate output, text or input file, voice id, whether TTS / conversion / cleanup was
  used, output format/path, manifest entry, and any plan assumptions tied to the account.
