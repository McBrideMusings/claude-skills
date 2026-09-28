# computer-use — injected context

> Drive apps in the background; never take focus, mouse or keyboard.

- **Playwright: run headless, don't fight windows.** Set `PLAYWRIGHT_MCP_HEADLESS=true` as an
  env var (Claude Code `settings.json` → `env`, not the plugin's own `.mcp.json`, which a
  marketplace sync overwrites). `browser_snapshot` is already accessibility-tree based, not
  screenshots — headless doesn't cost you that.
- **Desktop apps: Cua Driver (MIT, `trycua/cua`) drives any pid's AX tree in the background** —
  no cursor move, no focus steal, when addressed by `element_token`/AX action rather than pixel
  coordinates. See [`desktop-driver.md`](desktop-driver.md) before reaching for it.
- **A local model can pick the action instead of an LLM call** — see
  [`local-decision-model.md`](local-decision-model.md) for what it costs in latency.

## Files

| Open | When |
| --- | --- |
| [`desktop-driver.md`](desktop-driver.md) | Cua Driver: background macOS/Windows/Linux app automation, its focus-avoidance mechanism, install/permissions, known gotchas. |
| [`local-decision-model.md`](local-decision-model.md) | Running cua-s1 (a small local model) to pick actions instead of calling out to an LLM API, and what it actually costs in latency. |
