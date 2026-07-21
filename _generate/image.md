# Image generation axis

Read by the `generate` engine when the requested asset is an image.
Covers non-tiling 2D art: concept sheets, image-to-3D reference inputs, sky/background plates,
decals, logos, icons, GUI art, title/menu art, and marketing stills. For seamless/PBR surfaces use
`texture.md` instead — that is a deliberately separate axis.

Adapted from majidmanzarpour/threejs-game-skills.

## Backends

| Order | Backend | Provider | Env var / local | Health check |
| --- | --- | --- | --- | --- |
| 1 | comfy | local ComfyUI | local instance + GPU | comfy `generate_image` reachable, GPU up |
| 2 | gemini | Google Gemini (cloud) | `GEMINI_API_KEY` / `GOOGLE_API_KEY` | key present in env or `--api-key` |

comfy is the free/local first choice; gemini is the cloud fallback.

## Credential gate

- Never store keys in skill files or client-side game code; never paste a key value into a report.
- comfy: health-check the local ComfyUI instance and confirm a working GPU before use. On Tower
  (RTX 3090) ComfyUI runs in Docker, reachable over HTTP. The comfy MCP `enqueue_workflow` /
  `generate_image` tools false-fail with "ComfyUI is not running" against this externally-managed
  instance (their managed-process gate doesn't apply) — `health_check` / `get_queue` still work. Work
  around by POSTing the workflow straight to `http://<tower>:8188/prompt` (`{"prompt": <wf>}`).
- gemini: read from env or `--api-key`; **probe before declaring unavailable** and paste the literal
  output (`GEMINI_API_KEY=SET|MISSING`). Profile-only keys can be absent from process env.
- The engine tries comfy, falls through to gemini, and reports "no working backend" if both fail.
- Keys not configured yet + GPU down → report **dormant**; never fabricate a PNG.

## Prompt conventions

- **Image-to-3D reference:** centered single object, full object visible, plain light background,
  readable silhouette, clear material zones, game-ready style, no motion blur, no crop, no text.
- **Character/creature reference:** full-body T/A-pose or side view, symmetric, visible hands/feet,
  plain background, layered costume/anatomy, no weapon fused to hands.
- **Logo/icon/UI:** transparent-friendly silhouette, high contrast at small size, no tiny text.
- **Sky/background:** wide plate, layered depth, readable horizon, no foreground subject.
- Resolution: 1K drafts/icons, 2K default production reference, 4K hero/title/large plates.

## Comfy model roster (local — Tower RTX 3090 24GB)

Benched 2026-07-21 against a frozen 5-prompt set (see the unraid `local-genai` project, scorecard
`01-image.md`). Ready-to-run `workflow_api.json` for each lives beside this axis in
`_generate/comfy-image/`. Pick by job:

| Model | Job | Workflow | Settings (1024²) | Speed | Peak VRAM |
| --- | --- | --- | --- | --- | --- |
| **FLUX.1 dev** (fp8 all-in-one) | Default / best all-rounder, style + prompt fidelity | `comfy-image/image-flux-dev.json` | 20 step, euler/simple, FluxGuidance 3.5, cfg 1 | ~25s | 19.4 GB |
| **Z-Image Turbo** (bf16 6B) | Fast iteration + most photoreal portraits/scenes | `comfy-image/image-zimage-turbo.json` | 8 step, euler/simple, cfg 1 | ~8s | 21.9 GB |
| **Qwen-Image** (fp8) | Legible in-image text + dense/cluttered composition | `comfy-image/image-qwen.json` | 50 step, euler/simple, AuraFlow shift 3.1, cfg 4 | ~128s | 21.4 GB |
| **SDXL 1.0** (v10 VAEFix) | ControlNet / CHORD ecosystem base only — NOT for text | `comfy-image/image-sdxl.json` | 25 step, DPM++ 2M Karras, cfg 7 | ~7s | 16.3 GB |

Notes: FLUX.1 dev is the **fp8 all-in-one checkpoint** (`CheckpointLoaderSimple`, bundles t5+clip+ae) —
there is no assemblable bf16 UNET path in the store. Z-Image Turbo loads its Qwen3-4B encoder via
`CLIPLoader type=qwen_image` (this ComfyUI build has no native `z_image` type). Qwen would drop to ~10s
with a Qwen-Image Lightning LoRA (not installed yet).

### LoRA compatibility — base-architecture-specific

A LoRA only loads on its own base architecture. A Flux LoRA will **not** apply to SDXL / Qwen / Z-Image,
and vice versa. Match the `loras/<family>/` folder to the checkpoint:

| Checkpoint | Compatible LoRA folder | Installed on Tower |
| --- | --- | --- |
| FLUX.1 dev | `loras/Flux.1 D/` | `concept/und3rtab13` |
| Z-Image Turbo | `loras/ZImageTurbo/`, `loras/ZImageBase/` | none yet |
| Qwen-Image | `loras/Qwen/` (+ Qwen-Image-Lightning speed LoRA) | none yet |
| SDXL 1.0 base | `loras/SDXL 1.0/` | `concept/BUT_SDXL_SHS`, `concept/realcumv5` |

Caveat: **Pony** and **Illustrious** LoRAs are SDXL-architecture but tuned to their own checkpoints —
they load on base SDXL but usually degrade; pair them with a matching Pony/Illustrious checkpoint, not
`sdXL_v10VAEFix`.

## Output + integration

- Output = **PNG**. Save concepts and image-to-3D sources under `assets/concepts/`; UI/decals under
  `assets/ui/` or `assets/decals/`.
- **Feeds `model.md`:** hand the saved PNG path to image-to-3D and record the chain in the ledger.
- Do not call the image API from client-side game code. Convert PNGs to runtime formats deliberately
  (PNG for alpha/UI; JPG/WebP/KTX2 for large opaque art) and verify how it appears in game.
- Report probe output/backend used, prompt + purpose, output path, resolution, and whether the image
  was used directly, edited further, or handed to `model.md`.
