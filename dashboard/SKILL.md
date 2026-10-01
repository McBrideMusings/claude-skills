---
name: dashboard
description: "Live dashboard card for one job, pinned while the job runs: a project's status against its vision ('project status', 'reality check', 'how far along is this actually', 'what actually works'), an implement pass, a profiling loop, a spike's variants, a live monitor (disk, memory, a service), a chart of numbers, a diagram, a diagnosis. Other skills call `dashboard <kind>` at the point their job starts."
---

# dashboard

A **dashboard** is one card per job that stays current while the job runs. It is pinned to a
**slot** (`implement:canvas-12`, `status`, `monitor:disk`): posting to a held slot replaces that
card in place, so nobody tracks a card id. The pinned card shows as a small widget; the full
page opens from it.

`dashboard <kind> [scope]` picks the kind, then follows that kind's file. Each file says what
goes in the state, when to post, when to push, and when the pin ends:

| Kind | Open when |
| --- | --- |
| [`kinds/status.md`](kinds/status.md) | Measuring a project against its declared vision (the reality check). |
| [`kinds/implement.md`](kinds/implement.md) | An `implement` pass starts its Plan step. |
| [`kinds/profile.md`](kinds/profile.md) | A `profiling` pass has its first measurement. |
| [`kinds/spike.md`](kinds/spike.md) | A `spike` has variants screenshotted and is choosing between them. |
| [`kinds/monitor.md`](kinds/monitor.md) | Something is watched live: disk, memory, CPU, a service, a deploy, a queue. `free-disk-space` uses it. |
| [`kinds/chart.md`](kinds/chart.md) | Numbers read better as a line or bar chart, on their own or inside another job. |
| [`kinds/diagram.md`](kinds/diagram.md) | A structure reads better drawn: a flowchart, a call graph, a dependency graph. |
| [`kinds/diagnose.md`](kinds/diagnose.md) | A `diagnose` loop has its first hypotheses. |

## The lifecycle

`D=~/.claude/skills/dashboard/dashboard`. Every verb takes the slot.

```text
"$D" path <slot>                       # 1. where the state JSON lives; write {"kind": ..., "title": ..., ...} there
"$D" post <slot> [--scope session|repo] [--every SECS]
                                       # 2. builds page + widget from the state, posts it pinned
"$D" push <slot>                       # 3. after editing the state: recompute and push the values in
"$D" end <slot>                        # 4. job done: unpin; the card stays in the feed as history
```

- **Push or refresh.** Without `--every`, the card changes only when you `push`: write the new
  state, then push, at each point the job's numbers or stage change. With `--every SECS`, the host
  also runs `dashboard data <slot>` on that interval, so live probes (git state, a monitor's
  readings) stay current while you are busy or waiting; the refresh `cd`s into this checkout
  first, so it reads this checkout's state and git. Use `--every` only for a kind whose file
  names probes. A refresh that fails exits 1 with one stderr line, which the host shows in the
  card while keeping the last values.
- **Scope.** `session` (the default) ends the pin when this session ends or its process dies. `repo`
  keeps it until the next post to the slot or an `end`: only `status` uses it.
- **Links and screenshots are fixed at post time.** The host makes a local folder link or image
  usable only when it sees it in the posted HTML, so a `links` or `variants[].shot` change needs a
  new `post`, not a `push`.
- **When posting fails** (no host running, an older host without pins) the script exits non-zero
  with the host's error line and the page path. Say so in chat, give the path, and carry on with
  the job; the dashboard is a view of the work, never a step of it.
- `page <slot>` and `widget <slot>` print the HTML without posting, for a screenshot or a check;
  every verb logs a timestamped line to `dashboard.log` beside the state files.

## State every kind shares

```ts
{ kind: "status" | "implement" | "profile" | "spike" | "monitor" | "chart" | "diagram" | "diagnose",
  title: string,                        // widget line 1: 24 characters or fewer
  links?: {label, path /* absolute directory: opens in Finder */, bytes?}[],
  linksTitle?: string }
```

The script adds `slot`, `updated` and, for `implement` and `monitor`, `live` (the probe results).
