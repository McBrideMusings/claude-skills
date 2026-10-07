// Shared helpers for every dashboard kind. Each kind file registers
//   KINDS[<kind>] = { page(d) -> html string, widget(d) -> html string }
// and the page shell calls the one matching d.kind on first paint and on every
// pushed value. Everything a value carries is escaped through esc().
const KINDS = {};

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function tone(t) { return ["ok", "warn", "danger"].includes(t) ? t : ""; }

// tiles([{label, value, tone}])
function tiles(items) {
  return `<div class="tiles">${items.map(i =>
    `<div class="tile"><b class="${tone(i.tone)}">${esc(i.value)}</b><span>${esc(i.label)}</span></div>`).join("")}</div>`;
}

// steps(["plan","edit",...], currentIndex)
function steps(names, current) {
  return `<div class="steps">${names.map((n, i) =>
    `<div class="step ${i < current ? "done" : i === current ? "now" : ""}">${i < current ? "✓ " : i === current ? "● " : ""}${esc(n)}</div>`).join("")}</div>`;
}

// Markup built here, never from a pushed value: JSON cannot construct a Raw, so a
// table cell is raw HTML only when a renderer made it one on purpose.
class Raw { constructor(html) { this.html = html; } }
function pill(text, t) { return new Raw(`<span class="pill ${tone(t)}">${esc(text)}</span>`); }

// table(["col", ...], [[cell, ...], ...], {num: [colIndex...]})
function table(cols, rows, opts = {}) {
  const num = new Set(opts.num || []);
  if (!rows.length) return `<p class="empty">${esc(opts.empty || "Nothing yet.")}</p>`;
  return `<table><tr>${cols.map(c => `<th>${esc(c)}</th>`).join("")}</tr>${rows.map(r =>
    `<tr>${r.map((c, i) => `<td class="${num.has(i) ? "num" : ""}">${c instanceof Raw ? c.html : esc(c)}</td>`).join("")}</tr>`).join("")}</table>`;
}

function kv(pairs) {
  return `<div class="kv">${pairs.filter(p => p[1] !== undefined && p[1] !== null && p[1] !== "")
    .map(([k, v]) => `<span>${esc(k)} <b>${esc(v)}</b></span>`).join("")}</div>`;
}

function section(title, body) { return `<section><h2>${esc(title)}</h2>${body}</section>`; }

function header(d, sub) {
  return `<h1>${esc(d.title || d.kind)}</h1><div class="sub">${esc(sub || "")}${d.updated ? ` · updated ${esc(clock(d.updated))}` : ""}</div>`;
}

function clock(iso) {
  const t = new Date(iso);
  return isNaN(t) ? iso : t.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

const SERIES = ["var(--accent)", "var(--ok)", "var(--warn)", "var(--danger)", "var(--muted)"];

// chart({style: "line"|"bar", series: [{name, points: [[x, y], ...]}], yUnit, xLabel}, w, h)
function chart(c, w = 800, h = 220) {
  // Points whose y is not a finite number are dropped rather than blanking the chart.
  const series = (c.series || [])
    .map(s => ({ ...s, points: (s.points || []).filter(p => Array.isArray(p) && isFinite(+p[1])) }))
    .filter(s => s.points.length);
  if (!series.length) return `<p class="empty">No data yet.</p>`;
  const pad = { l: 44, r: 10, t: 10, b: 26 };
  const xs = [...new Set(series.flatMap(s => s.points.map(p => String(p[0]))))];
  const ys = series.flatMap(s => s.points.map(p => +p[1]));
  const ymin = Math.min(0, ...ys);
  let ymax = Math.max(0, ...ys);
  if (ymax === ymin) ymax = ymin + 1;   // all zero: give the axis a span
  const plotW = w - pad.l - pad.r;
  // Bars sit centred in equal bands; line points run edge to edge.
  const X = c.style === "bar"
    ? i => pad.l + plotW * (i + 0.5) / xs.length
    : i => pad.l + (xs.length === 1 ? plotW / 2 : i * plotW / (xs.length - 1));
  const Y = v => pad.t + (h - pad.t - pad.b) * (1 - (v - ymin) / (ymax - ymin));
  let svg = "";
  for (let k = 0; k <= 4; k++) {
    const v = ymin + (ymax - ymin) * k / 4;
    svg += `<line class="grid" x1="${pad.l}" x2="${w - pad.r}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${pad.l - 6}" y="${Y(v) + 3}" text-anchor="end">${esc(fmt(v))}</text>`;
  }
  const every = Math.ceil(xs.length / 10);
  // End labels anchor inward so a line chart's first and last labels stay inside the frame.
  const anchor = i => c.style === "bar" || xs.length === 1 ? "middle" : i === 0 ? "start" : i === xs.length - 1 ? "end" : "middle";
  xs.forEach((x, i) => { if (i % every === 0 || i === xs.length - 1) svg += `<text x="${X(i)}" y="${h - 8}" text-anchor="${anchor(i)}">${esc(x)}</text>`; });
  if (c.style === "bar") {
    const bw = Math.max(4, plotW / xs.length * 0.7 / series.length);
    series.forEach((s, si) => s.points.forEach(p => {
      const x = X(xs.indexOf(String(p[0]))) - bw * series.length / 2 + si * bw;
      svg += `<rect x="${x}" y="${Y(Math.max(0, p[1]))}" width="${bw - 1}" height="${Math.abs(Y(p[1]) - Y(0))}" fill="${SERIES[si % 5]}"><title>${esc(s.name)} ${esc(p[0])}: ${esc(p[1])}</title></rect>`;
    }));
  } else {
    series.forEach((s, si) => {
      const pts = s.points.map(p => `${X(xs.indexOf(String(p[0])))},${Y(p[1])}`).join(" ");
      svg += `<polyline points="${pts}" fill="none" stroke="${SERIES[si % 5]}" stroke-width="2"/>`;
    });
  }
  const legend = series.length > 1 ? `<div class="kv">${series.map((s, si) => `<span><b style="color:${SERIES[si % 5]}">■</b> ${esc(s.name)}</span>`).join("")}</div>` : "";
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(c.title || "chart")}">${svg}</svg>${legend}${c.yUnit ? `<div class="muted" style="font-size:11px">${esc(c.xLabel || "")}${c.xLabel ? " · " : ""}${esc(c.yUnit)}</div>` : ""}`;
}

function spark(points, w = 176, h = 22) {
  const ys = (points || []).map(p => +(Array.isArray(p) ? p[1] : p));
  if (ys.length < 2) return "";
  const max = Math.max(...ys), min = Math.min(...ys), span = max - min || 1;
  const pts = ys.map((v, i) => `${i * w / (ys.length - 1)},${h - 1 - (v - min) / span * (h - 2)}`).join(" ");
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="1.5"/></svg>`;
}

function fmt(v) {
  const n = +v;
  if (!isFinite(n)) return String(v);
  return Math.abs(n) >= 100 ? Math.round(n).toLocaleString() : +n.toFixed(2) + "";
}

function widgetTitle(d) { return `<div class="w-title">${esc(d.title || d.kind)}</div>`; }
