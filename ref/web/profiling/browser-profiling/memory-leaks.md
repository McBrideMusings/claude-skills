# Memory, idle and route-cycle leak audit

Part of [`browser-profiling.md`](../browser-profiling.md) — run the payloads through the browser driver described there.

## Memory And Leak Audit Sampler

Use this when the user asks about leaks, long-session slowdowns, runaway CPU/GPU, or the computer getting slower over time. Browser heap APIs may be unavailable; return `null` honestly when they are blocked.

```js
var samplePerformancePage = async (tab, label, scrollY = 0, settleMs = 1600) => {
  await tab.playwright.evaluate((nextY) => window.scrollTo(0, nextY), scrollY, { timeoutMs: 5000 });
  await tab.playwright.waitForTimeout(settleMs);
  return tab.playwright.evaluate((sampleLabel) => {
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const isVisible = (element) => {
      if (!element || typeof element.getBoundingClientRect !== "function") return true;
      const rect = element.getBoundingClientRect();
      return rect.bottom >= 0 && rect.right >= 0 && rect.top <= viewportHeight && rect.left <= viewportWidth;
    };
    const animations = (document.getAnimations ? document.getAnimations() : []).map((animation) => {
      const target = animation.effect && animation.effect.target ? animation.effect.target : null;
      const rect = target && target.getBoundingClientRect ? target.getBoundingClientRect() : null;
      return {
        name: animation.animationName || "",
        playState: animation.playState,
        visible: target ? isVisible(target) : true,
        offscreenClass: Boolean(target && target.classList && target.classList.contains("is-offscreen")),
        tag: target && target.tagName ? target.tagName.toLowerCase() : "",
        classes: target && typeof target.className === "string" ? target.className.slice(0, 160) : "",
        top: rect ? Math.round(rect.top) : null,
        bottom: rect ? Math.round(rect.bottom) : null,
      };
    });
    const running = animations.filter((animation) => animation.playState === "running");
    const offscreenRunning = running.filter((animation) => !animation.visible || animation.offscreenClass);
    const canvases = Array.from(document.querySelectorAll("canvas")).map((canvas) => {
      const rect = canvas.getBoundingClientRect();
      return {
        classes: String(canvas.className || "").slice(0, 120),
        active: canvas.dataset.animationActive || "",
        width: canvas.width || 0,
        height: canvas.height || 0,
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        visible: isVisible(canvas),
      };
    });
    const countByName = (items) => items.reduce((acc, item) => {
      const name = item.name || "(unnamed)";
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});
    return {
      label: sampleLabel,
      url: location.href,
      title: document.title,
      scrollY: Math.round(window.scrollY || 0),
      viewport: { width: viewportWidth, height: viewportHeight },
      memory: performance && performance.memory ? {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      } : null,
      elements: document.querySelectorAll("*").length,
      canvases: canvases.length,
      visibleCanvases: canvases.filter((canvas) => canvas.visible).length,
      images: document.images.length,
      iframes: document.querySelectorAll("iframe").length,
      animations: animations.length,
      runningAnimations: running.length,
      offscreenRunningCount: offscreenRunning.length,
      offscreenRunningByName: countByName(offscreenRunning),
      offscreenRunning: offscreenRunning.slice(0, 20),
      canvasDetails: canvases.slice(0, 20),
    };
  }, label, { timeoutMs: 15000 });
};
```

## Idle And Route-Cycle Checks

Keep route cycling bounded. Three cycles are usually enough to catch obvious DOM/canvas accumulation without turning the profiler into the workload.

```js
var auditLongSession = async (tab, homeUrl, alternateUrl) => {
  const result = { idle: [], routes: [] };
  await tab.goto(homeUrl);
  await tab.playwright.waitForLoadState({ state: "domcontentloaded", timeoutMs: 10000 }).catch(() => {});
  result.idle.push(await samplePerformancePage(tab, "idle-start", 0));
  await tab.playwright.waitForTimeout(12000);
  result.idle.push(await samplePerformancePage(tab, "idle-after-12s", 0));

  const countPage = async (label) => {
    await tab.playwright.waitForTimeout(1400);
    return tab.playwright.evaluate((sampleLabel) => ({
      label: sampleLabel,
      url: location.href,
      title: document.title,
      elements: document.querySelectorAll("*").length,
      canvases: document.querySelectorAll("canvas").length,
      images: document.images.length,
      iframes: document.querySelectorAll("iframe").length,
      animations: document.getAnimations ? document.getAnimations().length : null,
    }), label, { timeoutMs: 15000 });
  };

  for (let index = 1; index <= 3; index += 1) {
    await tab.goto(alternateUrl);
    await tab.playwright.waitForLoadState({ state: "domcontentloaded", timeoutMs: 10000 }).catch(() => {});
    result.routes.push(await countPage(`alternate-${index}`));
    await tab.goto(homeUrl);
    await tab.playwright.waitForLoadState({ state: "domcontentloaded", timeoutMs: 10000 }).catch(() => {});
    result.routes.push(await countPage(`home-${index}`));
  }
  return result;
};
```

Interpretation:

- Stable canvas/image/iframe counts after route cycles are good evidence against obvious retained visual resources.
- Small element-count changes can be normal when async content, auth state, or embeds settle; investigate monotonic growth.
- If `memory` is `null`, say the Browser runtime did not expose heap counters. Do not claim a heap leak was ruled out.
- If the Browser sandbox blocks listener/timer monkey-patching, use source audit plus observable counts instead.
