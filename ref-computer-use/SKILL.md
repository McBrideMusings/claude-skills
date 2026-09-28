---
name: ref-computer-use
description: Driving a browser or a desktop GUI app for testing or automation without stealing window focus or the mouse/keyboard, optionally with a local decision model instead of a live LLM in the loop. Load before setting up browser or desktop automation, or evaluating a computer-use tool.
---

# Computer-use automation knowledge

| Open | When |
| --- | --- |
| [`context.md`](context.md) | The whole cell — open before setting up browser or desktop automation. |
| [`desktop-driver.md`](desktop-driver.md) | Cua Driver: background macOS/Windows/Linux app automation, its focus-avoidance mechanism, install/permissions, known gotchas. |
| [`local-decision-model.md`](local-decision-model.md) | Running cua-s1 (a small local model) to pick actions instead of calling out to an LLM API, and what it actually costs in latency. |

Playwright-specific browser config lives in this cell, not a separate file — see `context.md`.
