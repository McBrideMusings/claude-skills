# dashboard swarm — the workers of one run, live

Slot `swarm:<repo>`. The swarm lead posts it before its first launch and keeps it current, so
the person reads what every worker is doing instead of asking.

```ts
{ kind: "swarm", title: "swarm <repo>",              // 24 characters or fewer
  focus?: string,                                    // the run's focus: an epic, a label, a phrase
  note?: string,                                     // one sentence: what the lead is doing now
  session?: string,                                  // the lead's Claude session id: rows come from its declaration
  workers: { bead: string, title: string, model: string,
             state: "working" | "blocked" | "failed" | "landed",
             pane?: string,                          // where the person can watch it: a Wheel pane id or herdr space
             note?: string }[],                      // one line: its stage, or why it failed
  queued?: (string | {bead, title})[] }              // beads picked but not launched yet
```

- **Live rows.** Write the lead's Claude session id as `session` and post with `--every 10`.
  Each refresh rebuilds `workers` and `queued` from `work-snapshot session <session>` (the lead's
  work-board declaration: lanes, models, each worker's reported stage, landed) and `swarm status`
  (each worker's agent state and pane), so the page follows the run with no push. The lead keeps
  its `work_set` declaration current at every launch, which it does anyway; `note` stays the
  lead's to write.
- **Push** after changing `note`, or for a dashboard without `session`: edit the state, then
  `"$D" push swarm:<repo>`.
- **End** with `"$D" end swarm:<repo>` when the run's last worker has landed or failed and the
  lead has reported.
