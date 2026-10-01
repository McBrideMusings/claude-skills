KINDS.chart = {
  page(d) {
    return header(d, d.note) + chart(d);
  },
  widget(d) {
    const s = (d.series || [])[0] || { points: [] };
    const lastPt = s.points[s.points.length - 1];
    return widgetTitle(d)
      + `<div class="w-big">${lastPt ? esc(fmt(lastPt[1]) + (d.yUnit ? " " + d.yUnit : "")) : "—"}</div>`
      + `<div class="w-line">${lastPt ? esc(`${s.name} at ${lastPt[0]}`) : "no data yet"}</div>`
      + spark(s.points);
  },
};
