KINDS.status = (() => {
  const TONE = { WORKING: "ok", EXCEEDED: "ok", PARTIAL: "warn", STUB: "warn", MISSING: "danger" };
  const count = (goals, s) => goals.filter(g => String(g.status || "").toUpperCase().startsWith(s)).length;
  return {
    page(d) {
      const goals = d.goals || [];
      const counts = ["WORKING", "PARTIAL", "STUB", "MISSING", "EXCEEDED"]
        .map(s => ({ label: s.toLowerCase(), value: count(goals, s), tone: TONE[s] }))
        .filter(t => t.value > 0 || ["WORKING", "PARTIAL", "MISSING"].includes(t.label.toUpperCase()));
      return header(d, d.headline)
        + tiles(counts)
        + (d.gatingGap ? section("Gating gap", `<p>${esc(d.gatingGap)}</p>`) : "")
        + section("Vision checklist", table(["#", "Goal", "Source", "Status", "Evidence"],
            goals.map(g => [g.n, g.goal, g.source,
              pill(g.status, TONE[String(g.status || "").toUpperCase().split(" ")[0]]),
              g.evidence]), { empty: "No goals extracted yet." }))
        + (d.coverage ? section("If every open item closed", `<p>${esc(d.coverage)}</p>`) : "");
    },
    widget(d) {
      const goals = d.goals || [];
      return widgetTitle(d)
        + `<div class="w-row"><div><b class="ok">${count(goals, "WORKING") + count(goals, "EXCEEDED")}</b><span>working</span></div>`
        + `<div><b class="warn">${count(goals, "PARTIAL") + count(goals, "STUB")}</b><span>partial</span></div>`
        + `<div><b class="danger">${count(goals, "MISSING")}</b><span>missing</span></div></div>`
        + (d.gatingGap ? `<div class="w-line">gating: ${esc(d.gatingGap)}</div>` : "");
    },
  };
})();
