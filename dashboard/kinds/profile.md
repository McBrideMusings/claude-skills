# dashboard profile — a measurement loop

Slot `profile:<metric-slug>`, scope `session`. Post it once the baseline is measured; push after
every measured run. No `--every`: the numbers come only from your runs.

```ts
{ kind: "profile", title: "<metric> · <target>",
  metric: string, unit: string,               // "p95 /search", "ms"
  higherIsBetter?: boolean,                   // default false: lower is better
  runs: {label, value}[],                     // first entry is the baseline; label = commit or change
  hotspots?: {fn, pct}[] }                    // from the latest profile, largest first
```

The card shows now, baseline and change, a bar chart of every run, and the hotspot table. End
with `"$D" end profile:<metric-slug>` when the pass ends; the card stays in the feed with the
final numbers.
