# Offscreen CSS and canvas animation profiler

Part of [`browser-profiling.md`](../browser-profiling.md) — run the payloads through the browser driver described there.

## CSS Animation Profiler

Adapt `sectionSelector` to the current page. Keep the DOM scan bounded.

```js
var profileAnimationPage = async (tab, label) => tab.playwright.evaluate((profileLabel) => {
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const isInView = (rect) => rect.bottom > 0 && rect.top < viewportHeight && rect.right > 0 && rect.left < viewportWidth;
  const durationPartActive = (part) => {
    const text = String(part || "").trim();
    if (!text || text === "0s" || text === "0ms") return false;
    const numeric = Number(text.replace("ms", "").replace("s", ""));
    return Number.isFinite(numeric) && numeric > 0;
  };
  const hasActiveDuration = (value) => String(value || "").split(",").some(durationPartActive);
  const records = [];
  const elements = Array.from(document.querySelectorAll("body *")).slice(0, 10000);
  const pushRecords = (element, pseudo = null) => {
    const styles = window.getComputedStyle(element, pseudo);
    if (!styles || !hasActiveDuration(styles.animationDuration)) return;
    const names = String(styles.animationName || "").split(",").map((name) => name.trim()).filter(Boolean);
    const states = String(styles.animationPlayState || "").split(",").map((state) => state.trim());
    names.forEach((name, index) => {
      if (!name || name === "none") return;
      const rect = element.getBoundingClientRect();
      records.push({
        name,
        state: states[index] || states[0] || "running",
        pseudo: pseudo || "element",
        tag: element.tagName.toLowerCase(),
        classes: String(element.className || "").slice(0, 180),
        text: String(element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        visible: isInView(rect),
      });
    });
  };
  elements.forEach((element) => {
    pushRecords(element, null);
    pushRecords(element, "::before");
    pushRecords(element, "::after");
  });
  const running = records.filter((record) => record.state !== "paused");
  const offscreenRunning = running.filter((record) => !record.visible);
  const countByName = (items) => items.reduce((acc, item) => {
    acc[item.name] = (acc[item.name] || 0) + 1;
    return acc;
  }, {});
  const canvases = Array.from(document.querySelectorAll("canvas")).map((canvas) => {
    const rect = canvas.getBoundingClientRect();
    return {
      classes: String(canvas.className || "").slice(0, 120),
      active: canvas.dataset.animationActive || "",
      width: canvas.width,
      height: canvas.height,
      top: Math.round(rect.top),
      bottom: Math.round(rect.bottom),
      visible: isInView(rect),
    };
  });
  return {
    label: profileLabel,
    url: location.href,
    scrollY: Math.round(window.scrollY || 0),
    viewport: { width: viewportWidth, height: viewportHeight },
    runningAnimationCount: running.length,
    offscreenRunningCount: offscreenRunning.length,
    runningByName: countByName(running),
    offscreenByName: countByName(offscreenRunning),
    offscreenRunning: offscreenRunning.slice(0, 30),
    canvases,
  };
}, label, { timeoutMs: 15000 });
```

## Suggested Measurement Pass

```js
await tab.playwright.evaluate(() => window.scrollTo(0, 0), undefined, { timeoutMs: 5000 });
await tab.playwright.waitForTimeout(500);
var topProfile = await profileAnimationPage(tab, "top");

await tab.playwright.evaluate(() => window.scrollTo(0, Math.floor(document.documentElement.scrollHeight * 0.42)), undefined, { timeoutMs: 5000 });
await tab.playwright.waitForTimeout(500);
var midProfile = await profileAnimationPage(tab, "mid");

await tab.playwright.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight - window.innerHeight - 12), undefined, { timeoutMs: 5000 });
await tab.playwright.waitForTimeout(500);
var footerProfile = await profileAnimationPage(tab, "footer");

var viewport = await browser.capabilities.get("viewport");
await viewport.set({ width: 390, height: 844 });
await tab.playwright.evaluate(() => window.scrollTo(0, 0), undefined, { timeoutMs: 5000 });
await tab.playwright.waitForTimeout(500);
var mobileTopProfile = await profileAnimationPage(tab, "mobile-top");
await viewport.reset();
```

Pass criteria for a targeted page optimization: every sampled state reports `offscreenRunningCount: 0`, and any canvas/WebGL `data-animation-active` marker or equivalent runtime signal is inactive when offscreen.
