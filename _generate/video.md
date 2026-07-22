# Video generation axis

Read by the `generate` engine when the requested asset is a video clip.
Covers short generated clips: text-to-video (T2V) and image-to-video (I2V), with or without a
generated soundtrack. For still frames use `image.md`; for seamless surfaces use `texture.md`.

**Default backend/model: LTX-2.3 distilled (local ComfyUI).** It is the only local model that
emits a **synced audio track in the same pass**, and it is 10–30× faster than the Wan 14B tiers.
Reach past it only for the reasons in the model table below.

## Backends

| Order | Backend | Provider | Env var / local | Health check |
| --- | --- | --- | --- | --- |
| 1 | comfy | local ComfyUI (Tower, RTX 3090) | local instance + GPU | `${COMFYUI_URL}/system_stats` returns, GPU present |

No cloud video backend is configured. If comfy is down, report **dormant** — never fabricate a clip.

## Credential gate

- comfy: health-check the ComfyUI instance and confirm a working GPU before use. On Tower ComfyUI
  runs in Docker, reachable over HTTP at `${COMFYUI_URL}` (Tailscale IP:8188 from the project
  `.env` — never `localhost`, never hardcoded).
- The comfy MCP `enqueue_workflow` / `generate_video` tools **false-fail** with "ComfyUI is not
  running" against this externally-managed Docker instance. `health_check` / `get_queue` /
  `get_history` still work. Drive generation by POSTing the API workflow straight to
  `${COMFYUI_URL}/prompt` as `{"prompt": <workflow>}`.

## Models — benched on RTX 3090 24GB (2026-07-22)

Workflows: `~/Projects/unraid/local-genai/workflows/video-*.json` (ComfyUI **API** format, ready to
POST). Full results + method: `~/Projects/unraid/local-genai/scorecards/02-video.md`.

| Model | Mode | Time (~5s clip) | VRAM | Audio | Use when |
| --- | --- | --- | --- | --- | --- |
| **LTX-2.3 distilled** (GGUF Q4, 22B) ★ | T2V / I2V | **74 s / 52 s** | ~20.7 GB | **yes** | **Default.** Want sound, text-to-video, or speed |
| Wan 2.2 5B TI2V (fp16) | T2V / I2V | ~120 s | ~23.5 GB | no | Cheap draft; sharper than LTX, no audio |
| Wan 2.2 14B (fp8 MoE) | T2V / I2V | **16–17 min** | ~21 GB | no | Hero shot — sharpest frames (only model that renders rain as real droplet rings) |
| Wan 2.1 14B I2V (fp8) | I2V | ~16.5 min | ~20 GB | no | Only to use a **Wan 2.1** LoRA; no quality edge over 2.2 |

Native 720p Wan 14B exists but costs 30–66 min and can exceed the container RAM cap — prefer
480p + upscale.

### LoRA families are mutually incompatible
A LoRA loads only on its own base architecture. Four separate families: **Wan 2.1 14B** (largest
third-party ecosystem) · **Wan 2.2 14B** (MoE — LoRAs ship as high-noise/low-noise **pairs**, load one
on each branch) · **Wan 2.2 5B** (14B LoRAs do *not* apply) · **LTX-2.3** (Lightricks IC-LoRAs,
distilled `lora-384`, a Foley/V2A audio LoRA). This is why one workflow per base model is kept.

## Prompt conventions

- **Describe motion and camera, not just the subject.** "slow push-in, he turns to look at camera,
  hair moves in wind" beats "a man". The subject is already fixed by the start image in I2V.
- **LTX-2.3 wants long, descriptive prompts** — short prompts measurably degrade it. Describe the
  scene, light, materials, and the motion.
- **Audio is prompted through the scene**, not a separate field: naming the sound source ("sound of
  steady rain and trickling water") is what puts it in the generated track.
- Wan uses a standard Chinese negative prompt (already baked into the saved workflows) — keep it.
- **Length/shape rules:** LTX frame count must be `8n+1` and width/height divisible by 32; Wan frame
  count must be `4n+1`. For LTX, `length` on the video latent **and** `frames_number` on
  `LTXVEmptyLatentAudio` must match or audio and video drift.

## Output

- `SaveVideo` writes an mp4. Set `filename_prefix` so it is born in the right folder — one copy,
  no move/duplication.
- ComfyUI files video results under the history `outputs[node]["images"]` key (with
  `"animated": [true]`), *not* a separate video key — the standard image fetch path works.
- LTX output carries a real stereo 48 kHz AAC track (~16.8 kHz bandwidth ceiling).

## Gotchas

- **Wan model names need their subdirectory prefix** (`Wan2.2/wan2.2_ti2v_5B_fp16.safetensors`);
  bare filenames fail validation.
- **LTX-2.3 is a joint audio-video model** — the video latent must be concatenated with an audio
  latent (`LTXVConcatAVLatent`) before sampling, even for video-only output.
- **Load LTX VAEs with core `VAELoader`, not `VAELoaderKJ`** — older KJNodes copies don't pass
  safetensors metadata and ComfyUI ≥0.28 needs it for the audio VAE.
- **Requires ComfyUI ≥ 0.28** (`comfy.ldm.lightricks.av_model`), the **ComfyUI-LTXVideo** node pack
  (audio nodes), and a **ComfyUI-GGUF** new enough to parse the `gemma3` architecture.
- **Long jobs go minutes with no WebSocket traffic** (model load, tiled VAE decode). Treat a ws read
  timeout as "still working" and confirm completion against `/history` instead of aborting.
- Wan 14B is two-stage MoE: changing `steps` must also move the high/low-noise split point
  (`end_at_step` / `start_at_step` ≈ steps/2), or the handoff breaks.

## Front-end

Exposed as the **Video** tab of the `local-genai` web app (container `local-genai-ui`, port 7860 on
Tower), LTX-2.3 selected by default. Module `apps/video.py`; see
`~/Projects/unraid/local-genai/CLAUDE.md` for the add-a-domain recipe and deploy command.
