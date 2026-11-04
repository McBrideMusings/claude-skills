KINDS.diagnose = (() => {
  const STATE = { open: "", "ruled-out": "danger", confirmed: "ok" };
  const st = h => String(h.state || "open").toLowerCase();
  const n = (d, s) => (d.hypotheses || []).filter(h => st(h) === s).length;
  return {
    page(d) {
      return header(d, d.symptom)
        + tiles([{ label: "open", value: n(d, "open") }, { label: "ruled out", value: n(d, "ruled-out"), tone: "danger" },
                 { label: "confirmed", value: n(d, "confirmed"), tone: "ok" }])
        + (d.fix ? section("Fix", `<p>${esc(d.fix)}</p>`) : "")
        + section("Hypotheses", table(["hypothesis", "state", "evidence"],
            (d.hypotheses || []).map(h => [h.text, pill(st(h), STATE[st(h)]), h.evidence || ""]),
            { empty: "No hypotheses yet." }))
        + (d.flow ? section("Failing path", `<pre class="mermaid-src">${esc(d.flow)}</pre>`) : "");
    },
    after(d, root, isCurrent) { return renderMermaid(root, isCurrent); },
    widget(d) {
      return widgetTitle(d)
        + `<div class="w-row"><div><b>${n(d, "open")}</b><span>open</span></div><div><b class="danger">${n(d, "ruled-out")}</b><span>ruled out</span></div><div><b class="ok">${n(d, "confirmed")}</b><span>confirmed</span></div></div>`
        + `<div class="w-line">${esc(d.symptom || "")}</div>`;
    },
  };
})();
