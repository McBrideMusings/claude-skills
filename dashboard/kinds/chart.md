# dashboard chart — numbers as a chart

Slot `chart:<slug>`, scope `session`. Post when the numbers exist; push when they change. No
`--every`: the series come from you.

```ts
{ kind: "chart", title: string,
  style: "line" | "bar",              // line for a trend over an ordered x; bar for categories or runs
  xLabel?: string, yUnit?: string,
  note?: string,                      // one sentence under the title: what to read off it
  series: {name, points: [x, y][]}[] }  // up to 5 series; x is a number or a label
```

The widget shows the first series' last value and a sparkline, so put the series that matters
first. End with `"$D" end chart:<slug>`, or post with `--no-pin` when the chart is a one-off that
never changes.
