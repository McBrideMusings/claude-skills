# Interaction structure & flow layer (layer 6)

Read by the `product-design` orchestrator when flow decisions are live. A library of techniques, not a
script — see "How to apply a layer cell" in `product-design`. Adapted from jamiemill/layers-skills (MIT).

**This is the bridge into the surface.** A settled breadboard is the input to `ui-design` sketch mode:
breadboard (structure — places, affordances, content) → ASCII layout sketch (visual arrangement) → craft
lenses. Get the structure right here *before* the surface makes changes expensive.

The interaction structure and flow layer defines how a person interacts with the product: the places they
navigate, the affordances available, the content presented, and the flow between states. It sits above
the conceptual model (which defines *what exists*, `conceptual-model.md`) and below the surface (which
defines *how it looks*, `ui-design`).

A breadboard is always for a particular user in a particular situation doing a particular job. Know which
job story before you start.

## The decisions this layer makes

- The distinct places this flow moves through
- What the user can do in each place, and where each action leads
- What content each place needs to show
- What happens on failure paths, empty states, and edge cases
- Whether the flow is as simple as it can be while still serving the job

If the conceptual model beneath isn't stable, flows built on it often need redoing — check that first.

## Disciplines — what keeps a flow honest

- **Every affordance has a named destination.** "Submit → where?" If you can't name it, it's an unmade
  decision.
- **Edges are required steps, not afterthoughts.** Breadboard the failure paths (validation, server
  error, disconnection, timeout, concurrent edit), the empty and loading states, the post-action state,
  and the cancel path. Each gap is an unmade design decision — name it.
- **No broken objects.** For each conceptual-model object in this flow, its attributes and actions should
  be available together — not scattered across screens with no cross-linking.
- **No isolated objects.** Each model relationship should be visible and navigable in the flow, or there
  should be a deliberate decision that it needn't be.
- **Vocabulary matches the model's ubiquitous language.**
- **Naming places is a design decision** — descriptive and user-meaningful ("Referral dashboard", not
  "Page 3").
- **Keep it minimal.** More than 5–6 places for a single job story is a signal to look for what can be
  collapsed.

## Breadboard notation

```
Place name
- affordance → destination place
- affordance → destination place
[ content shown in this place ]
```

## Techniques

Breadboarding is the default; the rest serve particular situations.

| Technique | Use it when |
|---|---|
| **Breadboarding** (Ryan Singer / Shape Up) | Default. Text notation that forces interaction logic to be settled before visual design makes changes expensive. |
| **Walk the flow as the user** | Narrate: "I'm a user who [situation]. I arrive at [place], I see [content], I want to [motivation], so I [affordance]…" Walk the happy path, then every edge. The fastest way to find unmade decisions. |
| **User story mapping** (Jeff Patton) | Complex product, many user types, incremental planning. Activities → tasks → stories across a timeline. |
| **Task analysis** | Redesigning an existing flow — decompose the current task to find where friction, errors, and workarounds concentrate. |
| **Service blueprinting** | Flow spans channels or involves backstage operations (staff, systems, third parties). |
| **Critical User Journeys** | Deciding which flow to work on — the minimal path to core value (high-traffic, high-revenue, metric-critical). |
| **Flow diagram** (`graph LR`) | Orientation only — flow through time reads left to right. The text breadboard stays the primary artefact; the diagram loses conditional detail. |
| **Current vs desired flow trees** | Changing a flow that already exists in shipped code, where the work has to end up as an implementation plan. See below. |

### Current vs desired flow trees

Breadboarding describes the flow you are designing. When the flow already exists and the job is to change it, two trees make the delta visible — and give the change a shape an engineer can act on without the plan collapsing into line numbers. Adapted from jnsahaj/skills `ux-flow-plan`.

Restate the goal in the user's own product words first. Then build both trees, current before desired:

```text
Current flow
User action
└─ System behavior
   └─ Architectural layer that owns it
      └─ Function / file anchor

Desired flow
User action
└─ System behavior
   └─ New or changed layer
      └─ Function / file anchor
```

Then name the boundary decisions the desired tree implies — which layer detects the condition, which owns the side effects, which updates the UI, which persists state. These are the real decisions; the trees exist to surface them.

**The ordering rule is the whole point: anchors attach after the tree settles, never before.** Function names and file paths go in as leaves once the flow is agreed, and they stay leaves — the narrative is the flow, not the code. Starting from the code produces a plan shaped like the existing implementation, which is exactly the thing being changed.

Close with a short decision list: the recommended structure, what was rejected, and the open questions. Say whether the feature is deliberately coupled to an existing concept or deliberately independent of it — that one is load-bearing and easy to leave implicit.

Keep the trees in plain product and architecture language. Reach for framework jargon only where it names a real boundary.

## Working the layer

Settle which job story the flow serves, where the user starts, and what success looks like. If
redesigning, describe the current flow first — it reveals decisions already made, many of them
unintentionally. Then name the places, map affordances and destinations, and walk the flow including its
edges, applying the disciplines above. Conditions — when an affordance is or isn't available — are often
where the real decisions hide.

Offer the technique that fits: breadboarding for most flows, task analysis for a redesign, story mapping
when there's a lot to plan. Do the next useful thing, not all of them.

Capture only the residue: the breadboard (places, affordances, destinations, content, key conditional
states), a flow diagram if it aids orientation, the open decisions (gaps and unresolved edge cases), and
risks that depend on unsettled lower-layer decisions.

A breadboard defines interaction logic without committing to visual form. Before moving to surface, make
sure the conceptual model beneath is stable — then hand the breadboard to `ui-design` sketch mode.
