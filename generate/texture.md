# Texture generation axis

Read by the `generate` engine when the requested asset is a texture.
Split from `image.md` on purpose: textures are **seamless/tiling** PBR surface maps
(basecolor/normal/roughness/height/AO/metallic) sized to powers of two — a different prompt
scaffold, a different graph, and a different post-process from one-off 2D art. Use `image.md`
for non-tiling concepts, plates, decals, and UI.

Adapted from majidmanzarpour/threejs-game-skills.

## Backends

| Order | Backend | Provider | Env var / local | Health check |
| --- | --- | --- | --- | --- |
| 1 | comfy | local ComfyUI on Tower (RTX 3090) | local instance + GPU | `GET <tower>:8188/system_stats` answers |
| 2 | gemini | Google Gemini (cloud) | `GEMINI_API_KEY` / `GOOGLE_API_KEY` | key present in env or `--api-key` |

comfy is live and benched (2026-07-22, see the unraid `local-genai` project, scorecard
`03-texture.md`). gemini is the cloud fallback and produces a flat image only — it has no PBR
decomposition, so a gemini result still needs the map extraction step below.

## Credential gate

- Never store keys in skill files or client-side game code; never paste a key value into a report.
- comfy: health-check ComfyUI first. The comfy MCP `enqueue_workflow` / `generate_image` tools
  false-fail with "ComfyUI is not running" against this externally-managed Docker instance —
  POST the workflow straight to `http://<tower>:8188/prompt` (`{"prompt": <wf>}`).
- gemini: read from env or `--api-key`; **probe before declaring unavailable** and paste the literal
  output (`GEMINI_API_KEY=SET|MISSING`).
- Keys not configured + ComfyUI down → report **dormant**; never fabricate a map.

## Two jobs, kept separate

1. **Make a tileable surface** — generate (or fix up) an image whose edges wrap.
2. **Decompose it into PBR maps** — basecolor / normal / roughness / height / AO / metallic / ORM.

They are independent. A photo needs only job 2 if it is already tileable; a generated texture
needs job 1 done *at generation time* (see below) or it will never tile cleanly.

## Comfy graphs (local — Tower RTX 3090 24GB)

Ready-to-run API workflows live beside this file in `comfy-texture/`. Same files as
`~/Projects/unraid/local-genai/workflows/`.

| Job | Workflow | Time | Notes |
| --- | --- | --- | --- |
| prompt → tileable PBR set | `comfy-texture/texture-sdxl-qfx-tileable.json` | ~14 s | **Default.** SDXL 1.0 sampled with circular convolution padding, then QFX map extraction. |
| photo → PBR set (2K) | `comfy-texture/texture-photo2pbr-qfx.json` | ~14 s | De-light → offset-tile → 7 maps at 2048². Bulk workhorse. |
| photo → *seamless* PBR set | `comfy-texture/texture-photo-seamless-inpaint-qfx.json` | ~13 s | Offsets the photo, then SDXL inpaints the seam band. Use when the photo must tile. |
| DX-vs-GL convention probe | `comfy-texture/texture-normal-convention-probe.json` | ~1 s | Diagnostic; re-run it if a pack updates. |
| CHORD learned decomposition | `comfy-texture/texture-chord-*.json` | — | **Blocked**: `chord_v1.safetensors` is a gated HF repo. Wired and ready; needs a token. |

Peak VRAM ~10 GB (SDXL sampling). The map-extraction nodes are numpy/OpenCV on CPU — free on the GPU.

### Node packs this depends on

`ComfyUI-QFX-PBRGenerator` (map extraction), `ComfyUI-TextureAlchemy` (de-light, tiling,
normal conversion, channel packing), `ComfyUI-Chord` (blocked), and
`comfyui-tileable-sampler` — a local two-node pack written for this
(`~/Projects/unraid/local-genai/custom_nodes/comfyui-tileable-sampler/`), see the crash note below.

### Tiling: do it at generation time, not afterwards

- **`TileableKSampler` + `TileableVAEDecode`** (the local pack) set torch's native
  `Conv2d.padding_mode = "circular"` for the duration of one sample/decode and restore it in a
  `finally`. The texture then wraps *by construction*. Measured edge continuity: wrap-seam mean
  absolute difference 4–20 vs 61–76 for an ordinary SDXL image.
- **Do NOT rely on post-hoc edge blending.** TextureAlchemy's `SeamlessTiling` in `blend_edges`
  mode removes the seam by mirroring the edge band — the mirror symmetry is glaring once tiled 4×4.
  Its `offset` mode does not mirror but only moves the seam to the middle; that mode is useful
  exactly as the mask source for the inpaint workflow.

## Prompt conventions

Material identity + microstructure + tiling intent + **flat even lighting**. Baked shadows in the
basecolor are the #1 cause of unusable output: every map here is derived from image luminance, so a
shadow becomes fake geometry in the normal map.

- Good: `weathered oak planks, fine grain, small knots, shallow cracks, seamless tiling,
  orthographic top-down, flat even lighting`
- Negative: `shadows, cast shadow, dramatic lighting, vignette, perspective, depth of field, blur,
  glare, highlight, watermark, text, border, frame`
- Name the surface and style: terrain, road, rock, sand, metal, sci-fi panel, trim sheet, fabric.
- Ask for a repeating field, never a hero object on a background.

## Normal maps — which convention, and how to flip

**OpenGL = Y+ (Blender, Unity, glTF, Godot, Maya). DirectX = Y− (Unreal, 3ds Max, CryENGINE.)**
Naming per the polycount wiki swizzle table — http://wiki.polycount.com/wiki/Normal_Map_Technical_Details

Measured on Tower with a synthetic ramp whose height rises downward in image rows (so OpenGL green
must read > 128):

- **QFX `normal_invert_y: false` → OpenGL. `true` (the pack default!) → DirectX.**
- **TextureAlchemy `HeightToNormal`'s `output_format` labels are inverted** — its "OpenGL" emits
  DirectX-handed green and vice versa. Ignore the label.
- **`NormalFormatValidator` is unreliable** — it only counts pixels above/below 0.5 green, so it
  reports "OpenGL, High confidence" for maps of either handedness.
- To flip: `NormalConverter` (`OpenGL_to_DirectX` / `DirectX_to_OpenGL`) is a plain green invert and
  is correct. All three shipped workflows emit **both** conventions every run, so no guess is needed.

## Working from a photo

- Crop square (`SquareMaker`), then **de-light** with `TextureEqualizer` at **strength ≤ 0.5,
  `soft_light`, radius 250–400**. Its defaults (radius 100, strength 1.0, `overlay`) make things
  worse: on a test brick photo the default *raised* low-frequency luminance spread (σ 10.9 → 12.0)
  and clipped the reds; the tuned setting cut it to 8.0 (−27%).
- Skip the equalizer entirely on an already flat-lit generated texture — the high-pass ring-inverts
  hard dark lines (black plank gaps came back out white).
- If the photo must tile, use the inpaint workflow, not edge blending.

## Web app — the interactive front door

Exposed as the **Texture** tab of the `local-genai` web app (container `local-genai-ui`, port 7860
on Tower). Module `apps/texture.py`; the add-a-domain recipe and deploy command are in
`~/Projects/unraid/local-genai/CLAUDE.md`.

The tab is **mode-first** — a radio picks which of the three graphs runs, and the controls change
with it:

| Mode | Controls shown | What it runs |
| --- | --- | --- |
| Prompt → tileable PBR | prompt, seed, steps | `texture-sdxl-qfx-tileable.json` |
| Photo → PBR set | photo upload, de-light strength | `texture-photo2pbr-qfx.json` |
| Photo → seamless PBR | photo upload, de-light strength, prompt, seed, steps | `texture-photo-seamless-inpaint-qfx.json` |

Always visible: **tile check N×N** (the 4×4 contact sheet is how you judge repetition) and a
**Metal** checkbox — left off, `metallic_min`/`max` are pinned to 0, because QFX reads pale mortar
or plaster as pure metal at its defaults.

A run returns a **labelled gallery of every map plus a .zip of the set**, not one picture — the
tab uses `comfy_client.generate(..., download_all=True)`, which is the only caller that needs
every output image. Maps are ordered tile-check first, then basecolor, both normals, and the rest.
Zips land in `<comfy output>/local-genai/texture/_zips/`; the History accordion prunes `png` + `zip`.

Smoke-test the whole path without a browser:
`ssh Tower 'docker exec local-genai-ui python /app/_smoke_texture.py'`

## Output + integration

- Output = **PNG** map set (1024² from prompt mode, 2048² from photo mode), under `assets/textures/`.
- Wire as a repeating material (wrap = repeat, tune the tiling scale) — not as a UI sprite.
- Use the **ORM** pack (AO in R, roughness in G, metallic in B) for Unity/Unreal to save texture
  memory; TextureAlchemy also packs RMA/ORMA variants.
- Convert large opaque maps to WebP/KTX2 where the pipeline supports it; keep PNG for masks and
  normals.
- Report: backend used, surface + style, which mode ran, the map set produced, resolution, the
  tiling check result, which normal convention the engine consumed, and any remaining UV/atlas work.

## Gotchas

- **A node that monkey-patches a cached model crashes the ComfyUI server.**
  `ComfyUI-seamless-tiling`'s `SeamlessTile` rebinds every `Conv2d._conv_forward` on the underlying
  module — its "Make a copy" option clones the ModelPatcher, not the module, so the mutation lands
  on the cached model and is never undone. With ComfyUI 0.28's dynamic VRAM manager (`comfy_aimdo`)
  owning pinned host buffers, freeing that model segfaults the process in
  `comfy_aimdo/host_buffer.py __del__` ("corrupted double-linked list" / "Segmentation fault") and
  **the container exits without auto-restarting**. That is why `comfyui-tileable-sampler` exists:
  same tiling effect, native `padding_mode`, restored in a `finally`. Verified over 8+ back-to-back
  runs with no crash and no leakage into later plain-SDXL runs.
- **Never install `opencv-python` into a ComfyUI venv that already has `opencv-python-headless`.**
  A node pack's `requirements.txt` did exactly that on Tower (5.0.0.93 over 4.13.0.90); two native
  OpenCV runtimes in one interpreter corrupt the heap. Fix: uninstall the non-headless one and
  force-reinstall the headless build.
- **SDXL here is not bit-deterministic** — same seed, same prompt, different bytes run to run
  (cudaMallocAsync + nondeterministic cuDNN kernels). To test whether a model got contaminated,
  compare a wrap-seam statistic, not a file hash.
- **No `"_comment"` or other non-node top-level keys** in an API workflow — `/prompt` rejects the
  whole graph with a bare HTTP 500.
- **`SquareMaker` requires `scaling_method`** even in `crop` mode.
- A prompt whose output nodes all fail validation is still accepted and then **wedges in
  `queue_running` forever**; `/queue {clear:true}` and `/interrupt` do not clear it, only a restart.
