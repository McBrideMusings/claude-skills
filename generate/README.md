# Asset-type axis for the `generate` engine

Per-asset-type knowledge files the `generate` engine reads at run time, one file per requested
asset type (`model`, `image`, `video`, `texture`, `music`, `sfx`, `dialogue`), living beside
SKILL.md so they never register as skills of their own.

`generate` is the single front door for all asset generation. For each asset type it walks an
ordered backend preference list from `generate/backends.toml`, health-gates every candidate (key
present? local comfy ComfyUI reachable with a working GPU?), and uses the first that passes —
falling through the list, and reporting "no working backend" if none do. The engine probes and
reports real state; it never fabricates output. `comfy` is the local/free option (driven via the
comfy plugin's `generate_image` / `generate_audio` MCP tools; needs a working local GPU). Cloud
backends need API keys not configured yet, so most asset types report dormant today.

Adapted from majidmanzarpour/threejs-game-skills.
