# Interface Design

When the user wants to explore alternative interfaces for a chosen deepening candidate, use the parallel sub-agent pattern. Based on "Design It Twice" (Ousterhout) — your first idea is unlikely to be the best.

Uses the vocabulary in [SKILL.md](SKILL.md) — **module**, **interface**, **seam**, **adapter**, **leverage**.

## Process

### Phase 01 — Frame the Problem Space

Before spawning sub-agents, write a user-facing explanation:

- The constraints any new interface must satisfy
- The dependencies it relies on and what category they fall into (pure value, owned state, infrastructure, cross-context)
- A rough illustrative code sketch to ground the constraints — not a proposal, just a way to make them concrete

Show this to the user, then immediately proceed to Step 2. The user reads and thinks while the sub-agents work in parallel.

### Phase 02 — Spawn Sub-Agents

Spawn 3+ sub-agents in parallel via the Agent tool. Each produces a **radically different** interface for the deepened module.

Prompt each with an independent technical brief: file paths, coupling details, what sits behind the seam, dependency strategy. Give each a different design constraint:

- **Agent 1**: "Minimise the interface — 1–3 entry points max. Maximise leverage per entry point."
- **Agent 2**: "Maximise flexibility — support many use cases and extension."
- **Agent 3**: "Optimise for the most common caller — make the default case trivial."
- **Agent 4** (if applicable): "Design around ports & adapters for cross-seam dependencies."

Include both architecture vocabulary (Module/Seam/Adapter/etc.) **and** `docs/CONTEXT.md` domain vocabulary in the brief so each sub-agent names things consistently.

Each sub-agent outputs:

1. Interface — types, methods, params, invariants, ordering, error modes
2. Usage example showing how callers use it
3. What the implementation hides behind the seam
4. Dependency strategy and adapters
5. Trade-offs — where leverage is high, where it's thin

### Phase 03 — Present and Compare

Present designs sequentially so the user can absorb each one, then compare in prose. Contrast by **depth** (leverage at the interface), **locality** (where change concentrates), and **seam placement**.

After comparing, give your own recommendation: which design is strongest and why. If elements from different designs combine well, propose a hybrid. Be opinionated — the user wants a strong read, not a menu.
