# dashboard delegate — a delegated worker, watched

Slot `delegate:<worker-slug>` (the `--name` given to `dispatch exec`, slugged). Post it right
after `dispatch exec --report-back` prints its first line, with `--every 30`: each refresh runs
`dispatch alive <outfile> --json`, so the process tree's CPU, the time since the worker last
wrote its transcript or output, its last tool call and the liveness verdict stay current while
this session is busy or waiting.

```ts
{ kind: "delegate", title: "<what the worker does>",   // 24 characters or fewer
  task: string,                                       // one sentence: the brief's goal
  outfile: string,                                    // the <outfile> given to dispatch exec
  where: string,                                      // dispatch's first line: agent, transport, pane or space
  stages: string[],                                   // the planned stages, in order
  stage: string,                                      // one of stages: where the worker is now
  step?: string,                                      // what it is doing now, from its pane, board or last call
  eta?: string,                                       // "about 12 more minutes"
  etaBasis?: string,                                  // why: "build took 9m on the last run; 2 of 5 stages left"
  started: string }                                   // ISO time of the launch
```

- **Push** at every liveness check `delegate` runs: set `stage`, `step`, `eta` and `etaBasis`,
  then `"$D" push delegate:<slug>`. The probe fills `live` (`pids`, `cpuPct`, `cpuSeconds`,
  `elapsedSeconds`, `output`, `outputAgeSeconds`, `lastAction`, `verdict`); the page shows the
  verdict in red when it is `dead` or `alive and idle`, amber when output is older than five
  minutes.
- **End** with `"$D" end delegate:<slug>` once the result is read and reported. The `--every`
  refresh stops when this session ends; the artifact stays until `end`.
