# User needs layer (layer 3)

Read by the `design` orchestrator and by `grill-me` (which pulls the job-story discipline into
its elicitation interviews). A library of techniques, not a script — see "How to apply a layer cell" in
`design`. Adapted from jamiemill/layers-skills (MIT).

User needs are what we think users are trying to achieve, and why — an interpretation built on observed
behaviour and domain knowledge, not a direct capture of reality. This layer sits between the messy raw
material of observation and the deliberate decisions of the solution space.

The outputs here are **opportunities**: needs (what users want to achieve), pains (what causes friction),
and desires (improvements they'd value). All three are valid — elicit all three.

## The decisions this layer makes

- Who exactly the users are whose needs we're defining — and in what situation
- What jobs they're trying to do: functional, emotional, and social
- Which needs are grounded in evidence, and which are assumptions
- Which needs matter most, and why

If the needs are already clear and grounded, don't re-elicit them for the sake of it — take them to
`product-strategy.md`.

## Disciplines — what keeps needs honest

- **Need, not solution.** "When I need a report, I want to export to CSV" is a solution. Push to the
  underlying need.
- **Strip the mechanism.** If the "When" clause references your specific solution (your dashboard, your
  CSM, your weekly email), you're describing the current system, not the need. Re-state it independent of
  who or what serves it: *what's true about the user at the moment they need this?* The need follows from
  the state, not the mechanism.
- **The "When" must be picturable.** Specific enough to see the moment it happens — triggered by an
  event, a feeling, a rhythm, or a threshold crossed. Push until it is.
- **Elicit emotional and social jobs, not just functional.** They're chronically under-articulated even
  when they're shaping behaviour. Asking explicitly is usually what surfaces them. (Functional →
  interaction & model; emotional → surface tone/feedback; social → surface, sometimes strategy.)
- **Mark confidence:** observed / inferred / assumed.
- **Workarounds are signal.** A need real enough to motivate a spreadsheet or a workaround email is a
  strong one.

## Techniques

Job stories are the default; the rest suit particular situations.

| Technique | Use it when |
|---|---|
| **Job stories** (JTBD) | Default. *When [situation], I want to [motivation], so I can [outcome].* Keeps solutions out; the "When" clause forces specificity. |
| **User stories** | The team prefers role-based framing or an existing Agile workflow. |
| **Top tasks analysis** (Gerry McGovern) | Large existing user base — identify which tasks matter most by frequency. Statistical, survey-based. |
| **Persona + scenario** | Communicating to stakeholders who think in archetypes. Good for alignment; less precise for design. |
| **ODI desired outcomes** (Ulwick) | Precise, measurable statements — "Minimize [metric] when [context]." Maps directly to opportunity scoring. |
| **Surface hidden needs** | Prompts to find what's ignored: what users do before/after the moment you focus on; what they wish they didn't have to do; what a workaround currently serves. |
| **Rough prioritisation** | Order by importance × how poorly currently served. A need that matters and is badly served is a high-value opportunity. Keep it rough — precise scoring is strategy work. |

## Working the layer

First settle who the users are and in what situation — not "users" but which type, when. If there's more
than one distinct type with different needs, work them separately. Note the source (research, domain
knowledge, or assumption); if it's assumption, mark it and plan to validate.

Then work the needs the user raises through the disciplines above, and probe for hidden ones. Offer the
technique that fits — job stories by default, ODI when measurability matters, top tasks when there's a
large user base. Don't run a fixed sequence.

Capture only the residue: the prioritised needs with confidence ratings, the unprioritised-but-surfaced
ones (so they aren't lost), gaps (probably-real needs not yet grounded), and any contradictions between
user types. Keep it to what carries a decision.

These needs are the opportunities for `product-strategy.md`. If they're mostly assumed, consider
`observed-behaviour.md` to gather evidence before building strategy on them.
