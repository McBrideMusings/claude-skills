// Mermaid source drawn in the page. The shell loads Mermaid for this kind and
// for diagnose; renderMermaid() lives here so both kinds share it.
// isCurrent() turns false once a newer value has redrawn the page; a render still in
// flight then drops its result instead of writing into a detached node.
async function renderMermaid(root, isCurrent = () => true) {
  const nodes = root.querySelectorAll("pre.mermaid-src");
  if (!nodes.length) return;
  if (typeof mermaid === "undefined") {
    nodes.forEach(n => n.insertAdjacentHTML("afterend", `<p class="danger">Mermaid did not load; showing the source.</p>`));
    return;
  }
  const dark = matchMedia("(prefers-color-scheme: dark)").matches;
  // suppressErrorRendering: on a parse error Mermaid otherwise appends its own
  // full-size error graphic to the page; the catch below shows one line instead.
  mermaid.initialize({ startOnLoad: false, theme: dark ? "dark" : "default", securityLevel: "strict", suppressErrorRendering: true });
  for (const [i, n] of [...nodes].entries()) {
    try {
      const { svg } = await mermaid.render(`m${Date.now()}${i}`, n.textContent);
      if (isCurrent() && n.isConnected) n.outerHTML = `<div class="mermaid-out">${svg}</div>`;
    } catch (e) {
      if (isCurrent() && n.isConnected) n.insertAdjacentHTML("afterend", `<p class="danger">Diagram error: ${esc(e.message || e)}</p>`);
    }
  }
}

KINDS.diagram = {
  page(d) {
    return header(d, d.note) + `<pre class="mermaid-src">${esc(d.mermaid || "")}</pre>`;
  },
  after(d, root, isCurrent) { return renderMermaid(root, isCurrent); },
  widget(d) {
    const src = d.mermaid || "";
    const edges = (src.match(/-->|---|-\.->|==>/g) || []).length;
    return widgetTitle(d)
      + `<div class="w-big">${edges}</div><div class="w-line">connections</div>`;
  },
};
