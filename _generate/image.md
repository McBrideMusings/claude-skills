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
- comfy: health-check the local ComfyUI instance and confirm a working GPU before use — the user's
  GPU is currently down, so comfy is unreachable today.
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

## Output + integration

- Output = **PNG**. Save concepts and image-to-3D sources under `assets/concepts/`; UI/decals under
  `assets/ui/` or `assets/decals/`.
- **Feeds `model.md`:** hand the saved PNG path to image-to-3D and record the chain in the ledger.
- Do not call the image API from client-side game code. Convert PNGs to runtime formats deliberately
  (PNG for alpha/UI; JPG/WebP/KTX2 for large opaque art) and verify how it appears in game.
- Report probe output/backend used, prompt + purpose, output path, resolution, and whether the image
  was used directly, edited further, or handed to `model.md`.
