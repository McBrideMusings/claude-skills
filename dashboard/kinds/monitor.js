// Readings come from the probes the `dashboard` script runs on every `data`
// call; links (folders that open in Finder) are written into the page at post time.
KINDS.monitor = (() => {
  const readings = d => (d.live && d.live.readings) || [];
  const shown = r => r.error ? "error" : `${fmt(r.value)}${r.unit ? " " + r.unit : ""}`;
  return {
    page(d) {
      const hist = (d.live && d.live.history) || {};
      const charts = Object.entries(hist).filter(([, pts]) => pts.length > 1).slice(0, 4)
        .map(([label, pts]) => section(label, chart({ style: "line", series: [{ name: label, points: pts }],
          yUnit: (readings(d).find(r => r.label === label) || {}).unit }, 800, 140)));
      return header(d, d.subject)
        + tiles(readings(d).map(r => ({ label: r.label, value: shown(r), tone: r.error ? "danger" : r.tone })))
        + readings(d).filter(r => r.error).map(r => `<p class="danger">${esc(r.label)}: ${esc(r.error)}</p>`).join("")
        + charts.join("");
    },
    widget(d) {
      return widgetTitle(d)
        + `<div class="w-row">${readings(d).slice(0, 3).map(r =>
            `<div><b class="${r.error ? "danger" : tone(r.tone)}" style="font-size:16px">${esc(shown(r))}</b><span>${esc(r.label)}</span></div>`).join("")}</div>`;
    },
  };
})();
