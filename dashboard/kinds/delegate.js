// Liveness comes from `dispatch alive <outfile> --json`, run by the `dashboard` script on every
// `data` call; stage, step and ETA come from the delegating session's pushes.
KINDS.delegate = (() => {
  const dur = s => s == null ? "—" : s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor(s % 3600 / 60)}m`
    : s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
  const live = d => d.live || {};
  const verdictTone = l => ["dead", "alive and idle"].includes(l.verdict) ? "danger"
    : l.verdict === "finished" || l.verdict === "working" ? "ok"
    : l.outputAgeSeconds != null && l.outputAgeSeconds >= (l.staleAfterSeconds || 300) ? "warn" : "";
  return {
    page(d) {
      const l = live(d), stages = d.stages || [];
      return header(d, d.where)
        + (d.task ? `<p>${esc(d.task)}</p>` : "")
        + (stages.length ? steps(stages, Math.max(0, stages.indexOf(d.stage))) : "")
        + (l.error ? `<p class="danger">${esc(l.error)}</p>` : "")
        + tiles([
            { label: "verdict", value: l.verdict || "—", tone: verdictTone(l) },
            { label: "running", value: dur(l.elapsedSeconds) },
            { label: "expected left", value: d.eta || "—" },
            { label: "last output", value: l.outputAgeSeconds == null ? "none yet" : `${dur(l.outputAgeSeconds)} ago`,
              tone: l.outputAgeSeconds >= (l.staleAfterSeconds || 300) ? "warn" : "" },
            { label: "CPU now", value: l.cpuPct == null ? "—" : `${fmt(l.cpuPct)}%` },
          ])
        + kv([["doing now", d.step || l.lastAction], ["ETA basis", d.etaBasis],
              ["last call", d.step ? l.lastAction : null],
              ["processes", (l.pids || []).join(", ")], ["CPU time", l.cpuSeconds == null ? null : dur(l.cpuSeconds)],
              ["output file", l.output], ["outfile", d.outfile]]);
    },
    widget(d) {
      const l = live(d);
      return widgetTitle(d)
        + `<div class="w-row"><div><b class="${tone(verdictTone(l))}" style="font-size:14px">${esc(l.verdict || "—")}</b><span>${esc(d.stage || "")}</span></div>`
        + `<div><b style="font-size:14px">${esc(dur(l.elapsedSeconds))}</b><span>${esc(d.eta || "running")}</span></div></div>`;
    },
  };
})();
