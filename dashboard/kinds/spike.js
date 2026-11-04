// Screenshots are written into the page by the `dashboard` script at post time
// (a host only makes local images it saw in the posted HTML loadable); this
// part renders the verdicts, which change as variants are judged.
KINDS.spike = (() => {
  const VERDICT = { in: "ok", winner: "ok", out: "danger", open: "" };
  const v = x => String(x.verdict || "open").toLowerCase();
  return {
    page(d) {
      const vs = d.variants || [];
      return header(d, d.question)
        + (d.winner ? `<p><span class="pill ok">winner</span> ${esc(d.winner)}</p>` : "")
        + section("Variants", table(["variant", "verdict", "why"],
            vs.map(x => [x.name, pill(v(x), VERDICT[v(x)]), x.note || ""]),
            { empty: "No variants yet." }));
    },
    widget(d) {
      const vs = d.variants || [];
      const n = s => vs.filter(x => v(x) === s).length;
      return widgetTitle(d)
        + (d.winner ? `<div class="w-big ok">${esc(d.winner)}</div><div class="w-line">winner of ${vs.length}</div>`
          : `<div class="w-row"><div><b>${vs.length}</b><span>variants</span></div><div><b class="danger">${n("out")}</b><span>out</span></div><div><b>${n("open")}</b><span>open</span></div></div>`);
    },
  };
})();
