# Texture generation axis

Read by the `generate` engine when the requested asset is a texture.
Split from `image.md` on purpose: textures are **seamless/tiling** PBR surface maps
(albedo/normal/roughness) sized to powers of two — a different prompt scaffold and a different
post-process from one-off 2D art. Use `image.md` for non-tiling concepts, plates, decals, and UI.

Adapted from majidmanzarpour/threejs-game-skills.

## Backends

| Order | Backend | Provider | Env var / local | Health check |
| --- | --- | --- | --- | --- |
| 1 | comfy | local ComfyUI | local instance + GPU | comfy `generate_image` reachable, GPU up |
| 2 | gemini | Google Gemini (cloud) | `GEMINI_API_KEY` / `GOOGLE_API_KEY` | key present in env or `--api-key` |

Same backend pair as `image.md`; the tiling prompt + post-process below are what differ.

## Credential gate

- Never store keys in skill files or client-side game code; never paste a key value into a report.
- comfy: health-check the local ComfyUI instance and confirm a working GPU first — the user's GPU is
  currently down, so comfy is unreachable today.
- gemini: read from env or `--api-key`; **probe before declaring unavailable** and paste the literal
  output (`GEMINI_API_KEY=SET|MISSING`). Profile-only keys can be absent from process env.
- The engine tries comfy, falls through to gemini, reports "no working backend" if both fail.
- Keys not configured yet + GPU down → report **dormant**; never fabricate a map.

## Prompt conventions

- **Seamless texture reference:** orthographic / top-down, PBR-friendly albedo, clear material
  variation, **no perspective, no baked strong shadows, no directional lighting**, tileable edges.
- Name the surface and style: terrain, road, rock, sand, metal, sci-fi panel, trim sheet, fabric.
- Ask explicitly for a flat, evenly-lit, repeating field — not a hero object on a background.
- Request the map set the material needs (albedo + normal + roughness) rather than a lit render.

## Output + integration

- Output = **power-of-two PNG** map(s) (512/1024/2048…), stored under `assets/textures/`.
- Post-process: verify tiling (offset-and-inspect the seams), confirm no baked lighting, and derive
  or generate the normal/roughness companions before use.
- Wire as a repeating material (set wrap to repeat, tune tiling scale) — not as a UI sprite.
- Convert large opaque maps to WebP/KTX2 where the project pipeline supports it; keep PNG for masks.
- Report probe output/backend used, surface + style, map set produced, resolution, tiling-check
  result, and any remaining UV/compression/atlas work.
