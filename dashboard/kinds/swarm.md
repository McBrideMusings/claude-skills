# dashboard swarm — the workers of one run, live

Slot `swarm:<repo>`. The swarm lead posts it before its first launch and keeps it current, so
the person reads what every worker is doing instead of asking.

```ts
{ kind: "swarm", title: "swarm <repo>",              // 24 characters or fewer
  focus?: string,                                    // the run's focus: an epic, a label, a phrase
  note?: string,                                     // one sentence: what the lead is doing now
  workers: { bead: string, title: string, model: string,
             state: "working" | "blocked" | "failed" | "landed",
             pane?: string,                          // where the person can watch it: a Wheel pane id or herdr space
             note?: string }[],                      // one line: its stage, or why it failed
  queued?: (string | {bead, title})[] }              // beads picked but not launched yet
```

- **Push** whenever a worker launches, blocks on a prompt, finishes, lands or fails: edit its
  row, then `"$D" push swarm:<repo>`.
- **End** with `"$D" end swarm:<repo>` when the run's last worker has landed or failed and the
  lead has reported.
