KINDS.implement = (() => {
  const STEPS = ["plan", "edit", "build", "verify", "review", "gate"];
  const names = d => d.steps || STEPS;
  const at = d => names(d).indexOf(d.stage);   // -1: a stage this list does not name
  return {
    page(d) {
      const live = d.live || {};
      return header(d, d.item)
        + steps(names(d), at(d))
        + (at(d) < 0 && d.stage ? `<p class="warn">Stage "${esc(d.stage)}" is not one of ${esc(names(d).join(", "))}.</p>` : "")
        + `<div style="margin-top:10px">${kv([["branch", live.branch], ["diff", live.diff], ["files", live.filesChanged],
            ["commits ahead", live.ahead], ["tests", d.tests]])}</div>`
        + (d.note ? section("Now", `<p>${esc(d.note)}</p>`) : "")
        + section("Files", table(["file", "change"], (d.files || []).map(f => typeof f === "string" ? [f, ""] : [f.path, f.change]),
            { empty: "No files planned yet." }));
    },
    widget(d) {
      const i = at(d), live = d.live || {};
      return widgetTitle(d)
        + `<div class="w-strip">${names(d).map((_, k) => `<i class="${k < i ? "done" : k === i ? "now" : ""}"></i>`).join("")}</div>`
        + `<div><b>${esc(d.stage || "—")}</b> <span class="muted">${i < 0 ? "" : `· step ${i + 1} of ${names(d).length}`}</span></div>`
        + `<div class="w-line">${[d.tests && `tests ${d.tests}`, live.diff && `diff ${live.diff}`].filter(Boolean).map(esc).join(" · ")}</div>`;
    },
  };
})();
