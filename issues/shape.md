# Shape

Give a backlog a structure it can be ordered by: every issue typed and labelled from the repo's
vocabulary, grouped under epics, with the blocking edges nobody wired, and a validated roadmap
of ready fronts printed at the end. Also charts a foggy effort from scratch.

**Worth doing on its own.** A backlog with no types, no grouping and no edges cannot be ordered, cannot be searched, and cannot be scoped down to something smaller than "everything". Run `issues shape` because the backlog is a heap, not because something is about to consume it.

**Resolving what waits on a person is [`iron-out.md`](iron-out.md)'s job.** Shape never answers an item's open question and never rewrites a body to settle a decision — charting's `grill-me` rounds find questions to file, they do not answer them; it ends by offering `issues iron-out` over the scope it just structured. The two read the same graph: shape builds it, iron-out drains the items in it that need you.

## Refer by name

Every issue has a title. In everything the user reads — the slate, the roadmap, the report — refer to it by that name with its **full clickable URL**, never a bare `#42`. A wall of `#42, #43, #44` is illegible; names read at a glance. Get URLs from the same `gh` call that fetched the bodies (`--json number,title,url`). For a local followup or papercut, give the absolute file path and line instead.

## Scope

Selector forms are shared with `implement` — one table, in [../implement/SELECTORS.md](../implement/SELECTORS.md) (`#133-140`, `label:X`, `milestone:X`, `followups`, `papercuts`; union multiple selectors). Shared because a selector means the same thing everywhere, not because this skill runs after that one. Bare `issues shape` = every open issue in the current repo.

**Dependencies are real edges, never prose.** On beads: `bd dep add <id> <blocker-id> -t blocks`, read back with `bd dep tree`, `bd blocked` and `bd ready --limit 0`. On GitHub: the native `blockedBy` / `blocking` fields, reachable through GraphQL. A `Blocked by #<n>` line in a body is a **finding** — an edge someone never wired — and Phase 0 offers to convert it. An item is unblocked when every blocker is closed.

**`bd ready` trusts a denormalized `is_blocked` flag that can go stale** after a pull whose scoped recompute was skipped, or a merge conflict resolved by hand. Run `bd recompute-blocked` before any read that orders work, or the roadmap silently hides ready issues.

**Free text that isn't a selector is a loose idea, not a scope** — `issues shape a 3D storefront browser for my Plex library`. There is no backlog to scan yet, so go to [Charting a foggy effort](#charting-a-foggy-effort) first; Phase 0 runs afterwards over the epic it creates.

## Charting a foggy effort

When the user arrives with an idea rather than a backlog — a greenfield build, a huge feature, a migration — there is nothing to scan yet. Chart it first. Only reach for this when the effort is too big to hold in one session; a smaller idea goes straight to `/grill-me` → `/issues spec`.

1. **Name the destination.** Run `grill-me` to pin down what this effort finds its way to — a spec, a decision, a change made in place. The destination fixes the scope, so it is settled first.
2. **Map the frontier.** Grill again, **breadth-first** — fan out across the whole space rather than deep on one thread, surfacing the open decisions and the first steps takeable now. **If no fog surfaces**, the way is already clear: say so and send the user to `/issues spec`. No milestone needed.
3. **Create the epic.** A repo with no `.beads/labels.toml` runs its labeling session first (Phase 0c's exit-2 path), since the guard denies every new bead until the file exists. Then `bd create "<effort>" -t epic -l <labels> -d "<brief>"` on beads (not bd's `milestone` type, which is a release gate over items in several epics, held by `blocks` edges: [`beads.md`](beads.md) §Grouping); a GitHub milestone where there is no beads store. Its title is the effort; its description is the brief:

```markdown
## Destination
<what reaching the end looks like. One or two lines; every pass orients to it first.>

## Notes
<domain; skills every pass should consult; standing preferences for this effort>

## Not yet specified
<in-scope fog — the suspected question, the area to revisit. Graduates into issues as the frontier advances.>

## Out of scope
<work consciously ruled beyond the destination. Never graduates.>
```

<!-- If the effort is in a domain with a design axis (detect via ../_detect.md — today: `game`
     via ../ref/game/design.md, `ui` via ../ref/gui/design.md), point Notes at it so every
     pass's interviews consult the domain's design lenses. Structure + tradeoffs only, never a fun-verdict. -->

4. **File the questions you can state now** as children of that epic (`--parent <epic-id>`), `-t decision`, carrying the `human` label. Then wire edges in a **second pass** with `bd dep add` — issues need IDs before they can reference each other.
5. Run Phase 0 over `epic:<id>`, then offer `issues iron-out epic:<id>` to answer the questions just filed.

**Fog or issue?** The test is whether you can state the question precisely now — *not* whether you can answer it now. Sharp enough to phrase → file it, even if it's blocked. Not sharp enough → leave it in **Not yet specified**. Don't pre-slice fog into issue-sized pieces; one patch may graduate into several issues, or none.

Fog only ever gathers *toward* the destination. Work past it is **Out of scope**, not fog — and if an existing issue turns out to sit past the destination, close it and leave one line in Out of scope saying why.

## Phase 0 — Structure

**A clean backlog skips it.** If the repo has a `.beads/labels.toml`, `~/.claude/tools/bead-labels check` prints nothing, every in-scope issue has a type and a parent, and `bd swarm validate` reports no warnings, say so in one line and go straight to the iron-out offer in 0e.

### 0a. Backend readiness

Resolve the backend through [`_detect.md`](./_detect.md). Beads is the target: the graph work below is `bd dep`, `bd swarm validate`, `bd ready --limit 0` and `bd graph`, none of which has a GitHub equivalent worth hand-writing.

**No `.beads/` in the repo** → offer it once, as one slate row:

```
<repo> has <n> GitHub issues and no beads store. `bd init` plus
`bd github sync --pull-only` imports them, and Phase 0 can then build epics,
edges, and a validated ready-front order. Decline and I do tier 1 only.
```

Before that row, resolve **stealth**:

- The `beads:stealth` label in `~/.claude/domains-map` is the source of truth.
- **No label yet** → propose a default from the repo's path (`~/Work/**`, `~/Freelance/**` → stealth) *and* its owner (`~/.claude/tools/repo-tier` prints `collaborative` or `unlisted` → stealth; no remote at all → stealth). Either signal alone is enough. Confirm with the user, then write the label into `domains-map` — from then on the label decides, not the inference.
- **Stealth** → `bd init --stealth --skip-agents --skip-hooks`. Stealth mode configures `.git/info/exclude`, which is never pushed, so no `.gitignore` diff appears and no collaborator sees anything. Auto-export is off by default, so no `.beads/issues.jsonl` lands either.
- **Stealth forbids sync.** `bd github sync` is **refused** in a stealth repo with a one-line error, never offered and never merely defaulted off. One sync pushes a private graph into someone else's GitHub organisation.
- Tell the user the one thing stealth does not hide: `.beads/` still sits in the working directory, invisible to `git status` but visible to anyone with filesystem access to that checkout.

**On decline**, run tier 1 only (below), then report exactly what was skipped and what it would have bought. Do not hand-implement the graph engine on GitHub primitives — `bd swarm validate` is not worth reproducing.

### 0b. Ask the tracker what it already knows

Beads computes structure drift natively. Run these before inferring anything, and treat the output as findings:

```bash
bd doctor --check=conventions    # lint + stale + orphans in one pass
bd orphans                       # broken dependency references
bd lint                          # issues missing required sections
bd stale                         # no recent activity
bd find-duplicates               # semantically similar issues
```

### 0c. One read, two tiers

Run `~/.claude/tools/bead-labels path` before the read. Exit 2 means the labeling session below runs first, so the read has a file to label against. Then hand every in-scope body to a **Sonnet** sub-agent so the bodies stay out of parent context. It returns, per issue: `issue_type`, a label set from `.beads/labels.toml`, `priority` (0–4), a proposed epic, and proposed `blocks` edges. Give it the file's path and the rules in [`./labels.md`](./labels.md); have it run `bead-labels set <labels>` on every proposed set and fix what fails before returning. Each issue's current labels go in as input: a `human` or `hitl` already on an issue stays `human`.

**When the Agent tool is unavailable, degrade — do not skip the isolation.** A session carrying a harness-injected "do not call the Agent tool unless the user requested it" instruction cannot spawn the reader, and that instruction wins. The fallback: write a paging script under the scratchpad that prints one truncated line per issue (ID, title, first ~700 characters), read it in chunks, and classify from that. Say in the report that the read ran inline. **Never page full bodies into the main context** — a 111-issue backlog read whole costs upward of 100k tokens per turn for the rest of the pass, which is the exact cost the sub-agent exists to avoid.

**The edge rule comes first in the brief, because it is the failure mode:**

```text
edge(A blocks B) is valid only if B *requires* A's output.
  "do A before B"       -> temporal. NOT an edge. Drop it.
  "B needs A's schema"  -> requirement. Emit it.
```

`bd swarm validate` rejects temporal edges as a structural error, so an inferred edge of that shape is worse than no edge.

**Tier 1 — mechanical, applied without a slate.** `issue_type`, labels from `.beads/labels.toml`, `priority`. Apply in bulk (`bd update --set-labels`, `bd priority`), and **report as counts, not rows**:

```
294 typed: 168 bug, 91 task, 35 feature.
Labelled: 150 client, 80 mac, 127 server, 42 perf, 47 human.
6 unclassifiable — listed below.
```

The unclassifiable remainder is the part worth the user's eyes; it would be buried in a 294-row list. Every tier-1 write is one command to undo.

**The repo's labels come from `.beads/labels.toml`, and Phase 0 makes sure it exists** — before the read above and before any epic is created.

- **Exit 2, no file** → this pass is the repo's labeling session. Name its parts from its submodules, apps, services and open issues, and draft the file in the shape [`./labels.md`](./labels.md) shows: families with their members as `parent` children, a short cross-cutting set, `human`, and the `required` list. It is a tier-2 slate row with the whole proposed file in the body. On `go`, write it, add the pre-commit block from `labels.md` where `.beads/hooks/` exists, and relabel every issue against it — closed ones too, so filters over past work answer.
- **File present** → run `bead-labels check`. Every finding is drift and this pass fixes it.

**⛔ Tier 1 may only write labels the file defines.** A label the work needs that the file lacks is not a tier-1 write — it goes to the tier-2 slate as a change to `.beads/labels.toml`, carrying its `about` line, its `parent`, and the existing label it was preferred over. Inventing a taxonomy is the single most expensive thing this phase can do wrong: it is applied at backlog scale, reported as a count rather than a row, and every later search and filter is built on it. `beads-label-guard.sh` denies a `bd create`, `q`, `update`, `tag` or `label` write outside the file (not `create -f`, `import` or `set-state`), and `bead-labels check` after the pass must print nothing.

**Tier 2 — judgment, slated.** Proposed **epics** (name, member count, member issue names), proposed **edges**, proposed **changes to `.beads/labels.toml`**, and one **migration row per label the file does not define**. Roughly fifteen rows, never three hundred. Grouping and ordering are what the user cannot recover by eye; a wrong label costs one `--remove-label`, a wrong epic reorganises how they think about the project.

**Labels the file does not define are drift and Phase 0 retires them.** Run `bd label list-all` and map *every* value onto a label the file defines, or delete it. [`./labels.md`](./labels.md) owns the rules — `hitl` becomes `human`, `afk` and any label restating a type or priority is deleted — and this skill deliberately does not restate them. A rename across the tracker is `bd label rename <old> <new>`. A pass that adds a vocabulary without retiring the one it supersedes leaves two where there was one.

**A colon in a category label is drift too.** `area:ui` or `mode:hitl` looks like a schema, and `mode:`, `patrol:` and `health:` are dimensions **beads itself owns**: `bd set-state <id> <dimension>=<value>` removes any existing label for that dimension before writing, so a label parked there is one beads will silently delete. Categories are flat words.

**The cheap positive test: run `bd human list` in Phase 0.** It is the whole reason `human` is bare. An empty queue on a backlog that visibly holds device work, credentials or unmade calls means the flag is being written somewhere `bd` cannot read — which is drift the label listing alone will not make obvious.

Priority is `0-4` / `P0-P4` — **never** high/medium/low, and never a `priority:*` label. Beads carries it as a field; `labels.md` forbids a label that restates one.

### 0d. Apply, then validate

```bash
bd create "<epic name>" -t epic -d "<what done looks like>" --silent   # epics first, keep title -> ID
bd update <id> --parent <epic-id>                                      # members second
bd dep add <id> <blocker-id> -t blocks                                 # edges third
bd recompute-blocked
bd swarm validate <epic-id>
```

Two passes for a reason: children need their epic's real ID before they can reference it, and edges need both endpoints to exist.

### 0e. Print the roadmap

`bd swarm validate <epic>` per epic plus `bd ready --limit 0 --json` across the scope. Print:

- **Waves** — ready fronts, in order. Wave 1 is what is workable now.
- **Warnings** — cycles, orphans, disconnected subgraphs, wrong-direction edges.
- **Max parallelism** and estimated worker-sessions.
- **Waiting on you** — the count `bd human list` returns over the scope, and how many wave-1 slots those items hold.

This is the deliverable for a user who wanted the lay of the land and nothing else. Close on it, per `../CHAT-FORMAT.md` §Hatch (next work here is `issues iron-out` over the same scope):

> Type `go` to apply my picks and continue into <next work>, or `park` to apply them and stop, or answer per row (`1 fix, 3 skip`).

**The roadmap is not iron-out's queue.** The roadmap is *every* issue by dependency wave — what to build next. Iron-out's queue is *only* the items waiting on a person, by unblock leverage — what to answer next.

## Rules

- **Don't implement, don't commit code.** Types, labels, priorities, epics, parents and edges are the only writes. Never close a work item — with **one exception**: Phase 0 may close a backlog-hygiene item whose entire content it just performed (retype these, label those, parent that set), and the close reason must name the tier-1 action that satisfied it. The item has to be hygiene the phase actually did; a work item that merely *looks* finished still stays open.
- **Every issue named to the user carries its full clickable URL.** `#121` on its own is not enough.
- **Never re-implement what `bd` computes.** Ready fronts, cycle detection, orphan checks, transitive blocking, duplicate detection, staleness — `bd swarm validate`, `bd ready --limit 0`, `bd blocked`, `bd orphans`, `bd find-duplicates`, `bd stale`, `bd doctor --check=conventions`. A second implementation here is free to disagree with the one beads ships.
- **An inferred edge is a requirement, never a sequence.** "Do A then B" is not an edge. `bd swarm validate` reports temporal edges as a structural error, so a wrong edge costs more than a missing one.
- **`bd github sync` is refused outright in a repo labelled `beads:stealth`** — not defaulted off, not offered with a warning. Refused, with a one-line reason.
- **Tier 1 writes without asking; tier 2 never does.** Types, labels the repo's `.beads/labels.toml` defines, and priority are one-command-to-undo and are reported as counts. Epics and edges always reach the user as a slate.
