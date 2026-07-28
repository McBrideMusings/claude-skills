# Transport: herdr

Workers are real terminals — a `claude` or `codex` process in its own herdr tab. Watchable live, answerable mid-run, and they outlive the orchestrator session.

**Requires `HERDR_ENV=1`.** Outside herdr this transport is not on offer at all; see [SKILL.md](SKILL.md) → Transports → Choosing.

## Topology — fixed, do not invent one

**The orchestrator keeps its pane, whole, for the entire run. Every worker gets its own tab in the same workspace, holding one full-size pane.** Nothing is ever split.

```
workspace
├── tab 1   orchestrator (you) — never split, never closed
├── tab 2   worker: issue-71   ← one pane, the whole tab
├── tab 3   worker: issue-74
└── tab 4   worker: issue-80
```

`herdr tab create` puts the new tab in the active workspace, beside the orchestrator's, and returns both `.result.tab.tab_id` and `.result.root_pane.pane_id`. That root pane **is** the worker's pane. Nothing gets subdivided, so pane ratios and a `MIN_PANE` geometry check do not apply — a worker's pane is always the full tab.

**Never split `$HERDR_PANE_ID`.** Not once, for any reason. The orchestrator's pane is the only surface the human reads and the only place a worker's question can be answered.

Observed under the old shared-tab layout: workers tiled beside the orchestrator squeezed it into an 87×26 cell and the human could not follow the run.

## `dispatch(issue)` → handle

The handle is `{tab_id, pane_id, slug}`; the slug doubles as the agent name.

1. **Tab** — `herdr tab create --workspace "$HERDR_WORKSPACE_ID" --cwd <worktree> --label <slug> --no-focus`. Keep `.result.tab.tab_id` (teardown needs it) and `.result.root_pane.pane_id` (the agent starts there).
   `--no-focus` is not cosmetic: focusing a worker's tab marks it seen and collapses a later `done` into `idle`.
2. **Agent** — `herdr agent start <slug> --kind <kind> --pane <root-pane-id> --timeout 120000 -- --model <model>`. A `claude` worker **always** carries `-- --model <id>`; with no flag it inherits the machine default. Names must match `[a-z][a-z0-9_-]{0,31}` and be unique among live agents.
3. **Brief** — send [BRIEF.md](BRIEF.md), then **send Enter separately**: `herdr agent prompt <slug> '<text>'` pastes a long prompt without submitting it, leaving the worker idle at a filled input box. Follow every prompt with `herdr agent send-keys <slug> enter`.

`<how-to-ask>` for the brief:

> **stop and ask, in this pane, and wait.** Nobody is looking at this tab. An orchestrator polls it, relays your question to the human, and types their answer back into this pane.

**Confirmed working** = the worker reports `working` in `herdr agent list`. `agent start` returning is not confirmation.

## `wake()`

A persistent `Monitor`, emitting one line whenever a named worker's status is **not** `working`:

```bash
while true; do
  herdr agent list | jq -r '.result.agents[] | select(.name != null) | select(.agent_status != "working") | "\(.name) \(.agent_status)"'
  sleep 20
done
```

Emit on `blocked` and `unknown` too, never only `done`.

## `read(handle)`

`herdr pane read <pane-id> --lines 60`.

**Never focus a worker's tab to inspect it.** Focusing marks the tab seen and consumes `done`, collapsing it to `idle` — `herdr tab focus`, `herdr pane focus`, and `herdr agent focus` all do this. CLI *reads* do not.

## `answer(handle, text)`

`herdr agent prompt <slug> '<answer>'`, then `herdr agent send-keys <slug> enter`, then confirm the worker returns to `working`. The same paste-does-not-submit rule as the brief: an answer without the Enter leaves the worker sitting on a filled input box, looking idle, having received nothing.

## `retire(handle)`

`herdr tab close <tab-id>`, after SKILL.md step 7's worktree and branch teardown.

Close the **tab**, not the pane — the worker owns the whole tab, and a tab left holding an empty shell still occupies a slot to anyone reading `herdr tab list`.

## What this transport survives

The swarm outlives the orchestrator: tabs, agents, worktrees, and branches are all still there after the session dies or is compacted away. That is what [REATTACH.md](REATTACH.md) rebuilds from.
