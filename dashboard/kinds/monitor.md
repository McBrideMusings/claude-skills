# dashboard monitor — something watched live

Slot `monitor:<subject-slug>`, scope `session`. Post with `--every <secs>`: the script runs every
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

**free-disk-space** uses slot `monitor:disk`:

```json
{ "kind": "monitor", "title": "disk", "subject": "this Mac",
  "probes": [
    {"label": "free", "unit": "GB", "cmd": "df -g ~ | awk 'NR==2{print $4}'", "warnBelow": 50, "dangerBelow": 20},
    {"label": "used", "unit": "%", "cmd": "df ~ | awk 'NR==2{print $5}'", "warnAt": 85, "dangerAt": 95}],
  "linksTitle": "What takes space",
  "links": [{"label": "Xcode DerivedData", "path": "/Users/<you>/Library/Developer/Xcode/DerivedData", "bytes": 40802189312}] }
```

The probes measure `~` because the home folder sits on the Data volume; plain `/` is the
read-only system volume and reports the wrong number. Each link is a folder; clicking it opens
Finder there. Links are fixed at post time: after
cleaning, re-measure and `"$D" post monitor:disk` again so the list matches the disk. End with
`"$D" end monitor:<slug>` when the watch is over.
