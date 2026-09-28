# computer-use — injected context

> Background delivery beats headless when you need to see it; headless beats background delivery when you don't.

- **Playwright: run headless, don't fight windows.** Set `PLAYWRIGHT_MCP_HEADLESS=true` as an
  env var (Claude Code `settings.json` → `env`, not the plugin's own `.mcp.json`, which a
  marketplace sync overwrites). `browser_snapshot` is already accessibility-tree based, not
  screenshots — headless doesn't cost you that.
- **Desktop apps: Cua Driver (MIT, `trycua/cua`) drives any pid's AX tree in the background** —
  no cursor move, no focus steal, when addressed by `element_token`/AX action rather than pixel
  coordinates. See [`desktop-driver.md`](desktop-driver.md) before reaching for it.
- **A local model can pick the action instead of an LLM call** — see
  [`local-decision-model.md`](local-decision-model.md) for what that actually costs (verified:
  under 1s of GPU compute per decision on Apple Silicon; a ~30s real-world run was pipeline/system
  contention, not the model).
