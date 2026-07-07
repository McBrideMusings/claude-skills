# Architecture fit lens

Evaluate whether the *diff* sits correctly in the existing structure. This is a read-only surface check on the change, not a full architecture review — for a dedicated deepening pass, the `improve-codebase-architecture` skill is the heavier tool, and this brief should point the reader there when a finding clearly warrants it. Use the architecture vocabulary from `improve-codebase-architecture` (module, interface, depth, seam — not "component/service/boundary"), and judge the change on these five lenses:

- **Fit** — does the change respect existing module/layer responsibilities, or introduce cross-layer coupling (e.g. routing domain logic through the UI layer)?
- **Abstraction level** — are new interfaces/types at the right level of generality, or do they leak implementation detail / over-generalize for one caller?
- **Pattern consistency** — does it follow the patterns already in use here (how errors are represented, how state is held, how side effects are isolated), or invent a one-off?
- **Structural scalability** — is there a *structural* (not algorithmic) decision that becomes painful at 10× the code/load?
- **Ownership clarity** — is it obvious which module owns each new piece of logic, or is responsibility ambiguous?

Architecture findings are **always design calls — never style nits**, and are in scope even when the file they concern wasn't directly modified (a layer violation introduced by a single new import is still a layer violation). Tag each `[architecture · <severity>]`. Surface them separately from bug findings, and use the **Fix (design call):** framing in the report entry.

Axis tag: `architecture`.
