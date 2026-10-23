KINDS.swarm = (() => {
  const TONE = { working: "", blocked: "warn", failed: "danger", landed: "ok" };
  const workers = d => d.workers || [];
  const count = (d, s) => workers(d).filter(w => w.state === s).length;
  return {
    page(d) {
      const ws = workers(d);
      return header(d, d.focus)
        + tiles([{ label: "running", value: count(d, "working") + count(d, "blocked") },
                 { label: "blocked", value: count(d, "blocked"), tone: count(d, "blocked") ? "warn" : "" },
                 { label: "failed", value: count(d, "failed"), tone: count(d, "failed") ? "danger" : "" },
                 { label: "landed", value: count(d, "landed"), tone: "ok" },
                 { label: "queued", value: (d.queued || []).length }])
        + (d.note ? section("Now", `<p>${esc(d.note)}</p>`) : "")
        + section("Workers", table(["bead", "title", "model", "state", "pane", "now"],
            ws.map(w => [w.bead, w.title, w.model, pill(w.state || "—", TONE[w.state]), w.pane, w.note]),
            { empty: "No worker launched yet." }))
        + ((d.queued || []).length ? section("Queued", table(["bead", "title"],
            d.queued.map(q => typeof q === "string" ? [q, ""] : [q.bead, q.title]))) : "");
    },
    widget(d) {
      const blocked = count(d, "blocked");
      return widgetTitle(d)
        + `<div><b>${count(d, "working") + blocked} running</b> <span class="muted">· ${count(d, "landed")} landed · ${(d.queued || []).length} queued</span></div>`
        + (blocked ? `<div class="w-line warn">${blocked} blocked on a prompt</div>` : "");
    },
  };
})();
