# Standards / CLAUDE.md compliance lens

Review the changes against the `CLAUDE.md` files located in Phase 02. Only flag violations of **specific, stated rules**. **Skip what the repo's own tooling actually reports on this diff** — configured, running, and failing where the author will see it; anything not wired up, or green while the problem is real, is ours.

On top of whatever CLAUDE.md documents, this axis always carries the **smell baseline** below — a fixed set of Fowler code smells (_Refactoring_, ch. 3) that applies even when a repo documents nothing. Two rules bind it:

- **CLAUDE.md overrides.** A documented repo standard always wins; where it endorses something the baseline would flag, suppress the smell.
- **Always a judgement call.** Each smell is a labelled heuristic ("possible Feature Envy"), never a hard violation — and, like any standard here, skip anything tooling already enforces.

Each smell reads *what it is* → *how to fix*; match it against the diff:

- **Mysterious Name** — a function, variable, or type whose name doesn't reveal what it does or holds. → rename it; if no honest name comes, the design's murky.
- **Duplicated Code** — the same logic shape appears in more than one hunk or file in the change. → extract the shared shape, call it from both.
- **Feature Envy** — a method that reaches into another object's data more than its own. → move the method onto the data it envies.
- **Data Clumps** — the same few fields or params keep travelling together (a type wanting to be born). → bundle them into one type, pass that.
- **Primitive Obsession** — a primitive or string standing in for a domain concept that deserves its own type. → give the concept its own small type.
- **Repeated Switches** — the same `switch`/`if`-cascade on the same type recurs across the change. → replace with polymorphism, or one map both sites share.
- **Shotgun Surgery** — one logical change forces scattered edits across many files in the diff. → gather what changes together into one module.
- **Divergent Change** — one file or module is edited for several unrelated reasons. → split so each module changes for one reason.
- **Speculative Generality** — abstraction, parameters, or hooks added for needs the spec doesn't have. → delete it; inline back until a real need shows.
- **Message Chains** — long `a.b().c().d()` navigation the caller shouldn't depend on. → hide the walk behind one method on the first object.
- **Middle Man** — a class or function that mostly just delegates onward. → cut it, call the real target direct.
- **Refused Bequest** — a subclass or implementer that ignores or overrides most of what it inherits. → drop the inheritance, use composition.

## Names and comments are prose — the word rules

Mysterious Name above catches the name a reader can't decode. These catch the names that read fine and are still wrong. Same bind as the smells: judgement calls, CLAUDE.md overrides, skip anything tooling enforces. Adapted from bholmesdev/skills `simplify`, which applies Orwell's rules from "Politics and the English Language" to code.

- **One word per concept, one concept per word.** A repo keeps a vocabulary. If `sync` names "pull remote changes," it cannot also name "flush edits to disk" — rename one. A finding names both uses and their `file:line`; a word used twice for two jobs is the whole evidence.
- **Cut words the context already carries.** A name repeating what its module, file, or type already says is padding: inside `workspaceWatcher.ts`, `startNativeWorkspaceWatcher` says nothing `watchWorkspace` doesn't.
- **A compound name is usually a hedge.** A long stacked name is the author specifying instead of describing — `lastObservedDiskContent` is a specification to defend; `baseline` is a name. When a name grows a third qualifier, the concept underneath is usually unclear.
- **Prefer the short physical word to the long abstract one.** `prune`, `run`, `watch`, `drop`, `walk` over `reconcile`, `coalesce`, `normalize`, `reconciliation`. Latinate vocabulary sounds technical while saying less; the Anglo-Saxon word is shorter and names something that happens.
  - **Carve-out, and it is narrow:** the long word stands only when it is *this project's* own vocabulary — named in `CLAUDE.md` or `docs/CONTEXT.md`, or already used as a domain term across existing code. Point at where. "It's a normal technical word" does not clear it; `normalize` survives in a repo whose docs define normalization, not in a repo that merely uses it because it sounded right.

## Shape rules

- **Derivability — don't pass or store what's already computable.** If a value can be derived from values already in scope, it should not also be a parameter, a field, or stored state. A function taking both `content` and an `isDirty` flag that is always `content !== baseline` should take one. Removing derivable state usually simplifies the signature, the type, and the control flow in one move. Platform-neutral: it applies to a React component's state, a Swift initializer taking `items` and `count`, and a Go struct caching `total` beside the slice it sums.
- **Inverted pyramid within a file.** Exported and significant functions go at the top; private helpers below them. Don't make a reader scroll past six helpers to reach the function the file is named after.
- **Complexity is measured, not asserted.** A cyclomatic-complexity or similar count is evidence attached to a finding raised on other grounds — Repeated Switches, Mysterious Name, a bug — never a finding by itself: "`parseOrder` (`parser.py:88`, CC 14) switches on order type in three places." Tool per language: Python `radon cc -s -a <path>`; JS/TS the eslint `complexity` rule; Go `gocyclo`; polyglot `lizard <path>`. The repo under review sets its own threshold (eslintrc, radon, sonar config) — carry no threshold of our own. No tool available: count decision points by hand and show the count — `if`, `else if`, `case`, loops, `catch`, ternary, `&&`, `||`, plus 1.

## The reuse rule — search before accepting anything new

The smell baseline above catches duplication *inside the diff*. This rule catches the more common case: the diff writes something the repo already has, somewhere the diff doesn't touch.

**Before accepting any new helper, component, hook, utility, server action, route pattern, error shape, or styling primitive, grep the repo for an existing one.** A finding here names the existing thing and its path. Without that search, "you could have reused something" is a guess — don't file it.

- Prefer extending the existing flow, even when it needs a small change, over a parallel implementation beside it.
- If the diff creates a *shared* helper, check it has real reuse. Private logic extracted once and given a vague name is not a shared helper.
- Errors, loading states, and result shapes should use whatever pattern the repo already standardized on. A bespoke success/failure type next to an existing one is a finding.
- File placement should match the domain and its neighbours; user-facing copy should match the tone already in the product.

**Red flags — prompts to go look, not automatic findings:**

- A new top-level `utils`, `helpers`, `shared`, `common`, or `misc` module.
- A new custom primitive where the product already ships a component or pattern for it.
- Naming that describes the implementation rather than what the thing does, where the repo's siblings do the opposite.

Overlap with the `slop` axis: "this wrapper adds no meaning" is slop; "this already exists at `path/x.ts`" is this rule. Don't double-report.

Axis tag: `standards`.
