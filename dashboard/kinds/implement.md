# dashboard implement — one pass, live

Slot `implement:<item-id>` (a GitHub `#12` becomes `implement:12`). Post it when the pass starts its Plan step, with
`--every 20`: the script reads the branch, the diff against the default branch and the commits
ahead on each refresh, so the card keeps moving during a long build.

```ts
{ kind: "implement", title: "implement <item-id>",   // 24 characters or fewer
  item: string,                                      // the item's title
  stage: "plan" | "edit" | "build" | "verify" | "review" | "gate",
  note?: string,                                     // one sentence: what is happening now
  tests?: string,                                    // "14/14", from the last run you read
  files?: (string | {path, change})[],               // the plan's file list
  base?: string }                                    // diff base; default origin/main, main, origin/master, master
```

- **Push** at each step change: set `stage`, `note` and `tests`, then `"$D" push implement:<id>`.
  The stages follow the pass's steps; Commit has none, and `gate` is set when the gate is shown.
- **End** with `"$D" end implement:<id>` after `wrap-up` lands the pass, or at `park`. The `--every` refresh stops when this
  session ends; the artifact stays until `end`.
