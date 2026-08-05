---
name: wayfinder
description: "Plan a huge, foggy effort — bigger than one session can hold — as a shared map of investigation tickets on GitHub (or local markdown), resolved one per session until the way is clear. For greenfield builds, huge features, or migrations; produces decisions, not deliverables, then hands off to /to-spec."
disable-model-invocation: true
---

A loose idea has arrived — too big for one session, wrapped in fog: the way from here to the **destination** isn't visible yet. Wayfinding finds that way, it doesn't charge at the destination. This skill charts the way as a **shared map** of investigation tickets on the issue tracker, then works its tickets one at a time until the route is clear.

**Wayfinder is an ad-hoc on-ramp, not the front door.** Most work starts at `/grill-me` and runs `grill-me → to-spec → to-tickets → implement`. Reach for wayfinder only when the effort is too big and foggy to hold in one session — a greenfield project, a huge feature, a migration. Where `grill-me` sharpens an idea you *can* hold in one session, wayfinder is for the idea you can't. It runs `grill-me` *inside* itself (grilling is one of its ticket types); it doesn't hand off to it.

The destination varies per effort, and naming it is the first act of charting — it shapes every ticket. A spec to hand off, a decision to lock before planning, or a change made in place like a data-structure migration. The map is domain-agnostic.

## Plan, don't do

Wayfinder is **planning** by default: each ticket resolves a decision, and the map is done when the way is clear — nothing left to decide before someone goes and builds. The pull to just do the work is usually the signal you've reached the edge of the map and it's time to hand off. An effort can override this in its **Notes** (carrying execution into the map), but absent that, produce decisions, not deliverables.

## Refer by name

Every map and ticket is an issue, so it has a **name** — its title. In everything the human reads (narration, Decisions-so-far), refer to it by that name, never a bare id or number. A wall of `#42, #43, #44` is illegible; names read at a glance. The id and URL don't vanish — a name wraps its link — but they ride *inside* the name.

## The Map

The map is a single issue labelled `wayfinder:map` — the canonical artifact. Its tickets are its **child issues** (GitHub native sub-issues).

The map is an **index**, not a store. It lists the decisions made and points at the tickets that hold their detail; a decision lives in exactly one place — its ticket — so the map gists and links, never restates.

### The map body

The whole map at low resolution, loaded once per session. Open tickets are **not** listed — they're open child issues, found by query.

```markdown
## Destination

<what reaching the end of this map looks like — the spec, decision, or change this effort finds its way to. One or two lines; every session orients to it before choosing a ticket.>

## Notes

<domain; skills every session should consult; standing preferences for this effort>

<!-- If the effort is in a domain with a design axis (detect via ../_domains/_detect.md — today: `game`
     via ../_domains/game/design.md, `ui` via ../_domains/ui/design.md), point Notes at it so every
     session's grilling tickets consult the domain's design lenses (for `game`: MDA +
     toy/puzzle/contest/game; for `ui`: motion/frequency/fluid-interaction/typography). Structure +
     tradeoffs only — never a fun-verdict. -->

## Decisions so far

<!-- the index — one line per closed ticket: enough to judge relevance, then open the link for the detail -->

- [<closed ticket title>](link) — <one-line gist of the answer>

## Not yet specified

<!-- see "Fog of war": in-scope fog you can't ticket yet; graduates as the frontier advances -->

## Out of scope

<!-- see "Out of scope": work ruled beyond the destination; closed, never graduates -->
```

### Tickets

Each ticket is a **child issue** of the map; its issue id is its identity. Body is the question, sized to one ~100K-token session:

```markdown
## Question

<the decision or investigation this ticket resolves>

## Parent

Map: #<map issue number>
```

Each ticket carries a `wayfinder:<type>` label — one of `research`, `prototype`, `grilling`, `task` (see [Ticket types](#ticket-types)).

A session **claims** a ticket by self-assigning it (`gh issue edit <n> --add-assignee @me`) **before any work**, so concurrent sessions skip it. That assignee *is* the claim: an open, unassigned ticket is unclaimed.

**Blocking** is a `Blocked by #<n>` line in the ticket body (one per blocker). A ticket is **unblocked** when every ticket it's blocked by is closed. The **frontier** is the open, unblocked, unclaimed children — the edge of the known.

The answer isn't part of the body — it's recorded on resolution (see [Work through the map](#work-through-the-map)). Assets created while resolving a ticket are linked from the issue, not pasted in.

## Ticket types

Every ticket is either **HITL** — worked *with* a human who speaks for themselves — or **AFK**, driven by the agent alone. A HITL ticket only resolves through that live exchange; the agent never stands in for the human's side of it (a grilling agent that answers its own questions has broken this — see the guard in `grill-me`).

- **Research** (AFK) → runs **`research`**. Reading docs, third-party APIs, local knowledge bases. Produces a cited markdown file, linked as an asset. Use when knowledge outside the working directory is needed.
- **Prototype** (HITL) → runs **`prototype`**. Raise the fidelity of the discussion with a cheap, rough, concrete artifact to react to — an outline, a stub, or UI/logic code. Links the prototype as an asset. Use when "how should it look/behave" is the key question.
- **Grilling** (HITL) → runs **`grill-me`**. One question at a time, the human deciding. The default type.
- **Task** (HITL or AFK): manual work that must happen before a *decision* can be made — nothing to decide, prototype, or research, but the discussion is blocked until it's done (signing up for a service so its API can be judged, provisioning access, moving data so its shape can be seen). The one type that *does* rather than decides — and it earns its place by unblocking a decision, not by delivering the destination. Agent drives it alone where it can (AFK); otherwise hands the human a precise checklist (HITL). Resolved when done; the answer records what was done and any resulting facts (credentials location, new URLs, row counts) later tickets depend on.

## Fog of war

The map is *deliberately* incomplete: don't chart what you can't yet see. Beyond the live tickets lies the **fog of war** — decisions and investigations you can tell are coming but can't pin down, because they hang on questions still open. Resolving a ticket clears the fog ahead of it, graduating whatever's now specifiable into fresh tickets — one at a time, until the way is clear and no tickets remain.

The map's **Not yet specified** section is where that dim view is written: the suspected question, the area to revisit. Everything here is in scope, just not sharp enough to ticket. It doubles as a signpost for collaborators reading where the effort is headed.

**Fog or ticket?** The test is whether you can state the question precisely now — *not* whether you can answer it now.

- **Ticket when** the question is already sharp — even if it's blocked and you can't act yet.
- **Not yet specified when** you can't phrase it that sharply. Don't pre-slice the fog into ticket-sized pieces: one patch may graduate into several tickets, or none.

**Not yet specified** excludes what's already decided, what's already a live ticket, and what's out of scope.

## Out of scope

Fog only ever gathers *toward* the destination. The destination fixes the scope, so work beyond it is **out of scope** — it isn't fog. It gets its own **Out of scope** section: work you've consciously ruled out of *this* effort. Scope, not sharpness, lands it here.

Out-of-scope work never graduates — the frontier stops at the destination — so it returns only if the destination is redrawn, and then as a fresh effort.

When a ticket that already exists turns out to sit past the destination (mis-scoped while charting, or exposed by a resolution), **close it** and leave one line in **Out of scope**: the gist plus why it's out, linking the closed ticket. It stays out of **Decisions so far**, which records the route actually walked.

## Tracker mechanics

**GitHub (default).** When a github remote exists (`git remote -v | grep github`), the map and tickets are GitHub issues.

- **Labels** — ensure they exist, idempotently, before first use. Ignore "already exists" errors:
  ```bash
  gh label create wayfinder:map --color 5319e7 2>/dev/null; \
  gh label create wayfinder:research --color 0e8a16 2>/dev/null; \
  gh label create wayfinder:prototype --color fbca04 2>/dev/null; \
  gh label create wayfinder:grilling --color 1d76db 2>/dev/null; \
  gh label create wayfinder:task --color d93f0b 2>/dev/null
  ```
- **Map** — `gh issue create --label wayfinder:map --title "<map name>" --body "<body>"`.
- **Child tickets** — create the issue, then link it as a native sub-issue of the map:
  ```bash
  gh issue create --label "wayfinder:<type>" --title "<ticket name>" --body "<body>"
  gh api repos/{owner}/{repo}/issues/<map-number>/sub_issues -f sub_issue_id=<child-node-or-id>
  ```
  If the sub-issues API is unavailable on the repo, fall back to a task-list checkbox in the map body (`- [ ] #<child>`) plus the `## Parent` line in the child — the parent/child link is then the body convention, blocking stays the `Blocked by #<n>` line.
- **Frontier query** — open children of the map that are unassigned and whose every `Blocked by #<n>` is closed. Read the children (sub-issues list, or the map's task list), check each one's blockers' state, filter.
- **Claim** — `gh issue edit <n> --add-assignee @me`.
- **Resolve** — post the answer as a comment (`gh issue comment <n> --body ...`), `gh issue close <n>`, append the one-line gist to the map's Decisions-so-far.

**Local (no github remote).** The map is a single `wayfinder-map.md` at the repo root. Tickets are `## ` sections within it under a `# Tickets` heading, each with its Question, `Blocked by:` line, assignee/claim marker, and (on resolution) an `Answer:` line; closed tickets move their gist up into Decisions-so-far. Same concepts, one file. Tell the user the absolute path (own line, no trailing punctuation) so it stays Ghostty-clickable.

## Stay off the work backlog

Wayfinder tickets are *investigation*, not implementable backlog. `triage` and `implement` skip any `wayfinder:*`-labelled issue — they're a separate planning surface. Don't file wayfinder tickets as `ready-for-agent` work.

## Invocation

Two modes. Either way, **never resolve more than one ticket per session.**

### Chart the map

User invokes with a loose idea.

1. **Name the destination.** Run `/grill-me` to pin down what this map finds its way to — the spec, decision, or change. The destination fixes the scope, so it's settled first.
2. **Map the frontier.** Grill again, **breadth-first** this time: fan out across the whole space rather than deep on one thread, surfacing the open decisions and the first steps takeable now. **If this surfaces no fog** — the way is already clear, the whole journey fits one session — you don't need a map. Stop and ask the user how they'd like to proceed (likely straight to `/grill-me` → `/to-spec`).
3. **Create the map** (label `wayfinder:map`): Destination and Notes filled in, Decisions-so-far empty, the fog sketched into Not yet specified.
4. **Create the tickets you can specify now** as child issues, then wire blocking edges in a **second pass** (issues need ids before they can reference each other). Everything you can't yet specify stays in Not yet specified.
5. Stop — charting is one session's work; do not also resolve tickets.

### Work through the map

User invokes with a map (URL or number). A ticket is optional — without one, you pick the next decision, not the user.

1. Load the **map** — the low-res view, not every ticket body.
2. Choose the ticket. If the user named one, use it. Otherwise take the first frontier ticket in order. **Claim it** (self-assign) before any work.
3. Resolve it — **zoom as needed**: fetch the full body of any related or closed ticket on demand; run the skill its `wayfinder:<type>` names (research→`research`, prototype→`prototype`, grilling→`grill-me`, task→manual). If in doubt, `/grill-me`.
4. Record the resolution: post the answer as a comment, close the issue, append a one-line gist to the map's Decisions-so-far.
5. Add newly-surfaced tickets (create-then-wire); graduate any fog the answer made specifiable, clearing each graduated patch from Not yet specified. If the answer reveals a ticket sits beyond the destination, rule it out of scope rather than resolving it. If the decision invalidates other parts of the map, update or delete those tickets.

## When the way is clear — exit

The map is done when no tickets remain and nothing is left to decide before building. **Name the next step and stop — never auto-chain into it:**

- Normal case → tell the user to run **`/to-spec`** (the map's Decisions-so-far is the raw material; to-spec synthesizes it into a spec, which `/to-tickets` then slices, which `/implement` builds).
- If the effort turned out small enough → straight to **`/implement`**.

Report the map's final state (destination reached, N decisions made) and the handoff target. Do not invoke it yourself.
