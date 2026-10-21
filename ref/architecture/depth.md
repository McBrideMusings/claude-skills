# Depth — the architecture vocabulary

The words every architecture judgment uses, and the principles stated in them. The aim is testability and AI-navigability: a module a caller can use, test and change without reading its insides.

## Vocabulary

Use these terms exactly. Consistent language is the point — don't drift into "component", "service", "API", or "boundary."

- **Module** — anything with an interface and an implementation (function, class, package, slice). Scale-agnostic.
  _Avoid_: unit, component, service, layer, wrapper.
- **Interface** — everything a caller must know to use the module correctly: type signature, invariants, ordering, error modes, required config, perf characteristics.
  _Avoid_: API, signature (those refer only to the type-level surface).
- **Implementation** — what's inside a module.
- **Depth** — leverage at the interface. A module is **deep** when a large amount of behaviour sits behind a small interface. **Shallow** when the interface is nearly as complex as the implementation.
- **Seam** _(Michael Feathers)_ — a place where you can alter behaviour without editing in that place. The *location* at which a module's interface lives.
  _Avoid_: boundary (overloaded with DDD's bounded context).
- **Adapter** — a concrete thing satisfying an interface at a seam. Describes *role* (what slot it fills), not substance.
- **Leverage** — what callers get from depth. More capability per unit of interface they have to learn.
- **Locality** — what maintainers get from depth. Change, bugs, knowledge concentrate at one place instead of spreading across callers.

## Principles

- **Depth is a property of the interface, not the implementation.** A deep module can be internally composed of small swappable parts — they just aren't part of the interface.
- **Deletion test.** Imagine deleting the module. If complexity vanishes, it was a pass-through. If complexity reappears across N callers, it was earning its keep.
- **The interface is the test surface.** Callers and tests cross the same seam. If you want to test *past* the interface, the module is probably the wrong shape.
- **One adapter = hypothetical seam. Two adapters = real seam.** Don't introduce a seam unless something actually varies across it.
- **Zero callers means delete, not improve.** Before preserving any compatibility path — a mode flag, a prop, a wrapper, a route alias, a fallback branch — grep for real callers. None means it goes; a compat path with no caller is not a constraint, it's residue. Making it tidier is work spent on code that should not exist. [end-state.md](end-state.md) is the design move this rule checks.

## Rejected framings

- **Depth as ratio of implementation-lines to interface-lines** (Ousterhout): rewards padding the implementation. Depth-as-leverage is used instead.
- **"Interface" as the TypeScript `interface` keyword or a class's public methods**: too narrow — interface here includes every fact a caller must know.

## Patterns

A whole-system pattern — how the modules of a product divide its work — is one page each under [patterns/](patterns/), stated in this vocabulary. Each page opens with when it applies.
