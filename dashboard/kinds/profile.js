KINDS.profile = (() => {
  const runs = d => d.runs || [];
  const last = d => runs(d).length ? runs(d)[runs(d).length - 1].value : undefined;
  const first = d => runs(d).length ? runs(d)[0].value : undefined;
  const change = d => first(d) ? Math.round((last(d) - first(d)) / first(d) * 100) : undefined;
  return {
    page(d) {
      const c = change(d);
      return header(d, d.metric)
        + tiles([
            { label: "now", value: last(d) === undefined ? "—" : `${fmt(last(d))} ${d.unit || ""}` },
            { label: "baseline", value: first(d) === undefined ? "—" : `${fmt(first(d))} ${d.unit || ""}` },
            { label: "change", value: c === undefined ? "—" : `${c > 0 ? "+" : ""}${c}%`,
              tone: !c ? "" : (c > 0) === !!d.higherIsBetter ? "ok" : "danger" },
          ])
        + section("Runs", chart({ style: "bar", series: [{ name: d.metric, points: runs(d).map(r => [r.label, r.value]) }], yUnit: d.unit, title: d.metric }))
        + section("Hotspots", table(["function", "share"], (d.hotspots || []).map(h => [h.fn, `${h.pct}%`]), { num: [1], empty: "No profile captured yet." }));
    },
    widget(d) {
      return widgetTitle(d)
        + `<div class="w-big">${last(d) === undefined ? "—" : esc(fmt(last(d)) + " " + (d.unit || ""))}</div>`
        + `<div class="w-line">${first(d) === undefined ? "" : `from ${esc(fmt(first(d)))} ${esc(d.unit || "")}`}</div>`
        + spark(runs(d).map(r => r.value));
    },
  };
})();
