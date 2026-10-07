# dashboard monitor — something watched live

Slot `monitor:<subject-slug>`. Post with `--every <secs>`: the script runs every
probe on each refresh, keeps the last 120 readings per probe, and draws them as charts. A probe
that fails shows its error in its tile; the others still update.

```ts
{ kind: "monitor", title: "<subject>",
  subject: string,                                     // "this Mac", "plex-sync service", "deploy 412"
  probes: {label, cmd, unit?,                          // cmd: shell; the first number it prints is the reading
           warnAt?, dangerAt?,                         // amber/red at or above: usage, load, queue length
           warnBelow?, dangerBelow?}[],                // amber/red at or below: free space, headroom
  links?: {label, path, bytes?}[] }                    // folders worth opening, largest first
```

Pick the interval from how fast the subject changes: 10–30s for CPU or a queue, 60s or more for
disk. Readings past a threshold turn amber/red; only `data`, `post` and `push` add a point
to the history, so `page` and `widget` can be run to look without skewing the chart.

Disk is not a monitor slot: **free-disk-space** uses the standing Canvas artifact titled `Disk`
(see its skill). A disk probe measures `~`, not `/`: the home folder sits on the Data volume and
`/` is the read-only system volume. Each link is a folder; clicking it opens Finder there. Links
are fixed at post time. End with `"$D" end monitor:<slug>` when the watch is over.
