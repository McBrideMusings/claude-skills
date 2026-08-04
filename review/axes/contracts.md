# Code comments and contracts lens

Two questions, both about what a caller is promised.

## 1. Comments vs code

Read code comments in modified files. Flag changes that violate documented contracts, TODOs that should be addressed, or stale comments left in. For contracts issues, quote the comment or signature being violated.

## 2. The footgun test — does the obvious call do the right thing?

For every public seam the diff adds or changes — an exported function, a hook's return value, a setter, a component prop, a route body, a schema, a command — ask:

> **If someone does the obvious thing without knowing the hidden helper or convention, does behavior break?**

The failure this catches has no error and no failing test. The code looks right. Example: clearing a selection is supposed to also close the detail panel and reset the URL, and a `clearSelection()` helper does all three — but the raw `setSelection(null)` setter is still exported. A new maintainer reads the type, writes the obvious call, and gets a half-cleared state that nothing complains about.

Two more shapes of the same defect: a schema that accepts states the UI never wants (the bad state is merely discouraged instead of unrepresentable), and a prop that only works when a sibling prop is set the right way (you can wire it up half-right).

**When you flag one, the Fix names a rung on this ladder, highest first:**

1. Make the existing API do the safe thing.
2. Narrow the type or schema so the bad state cannot be represented at all.
3. Rename or split the API so the dangerous path is explicitly named.
4. Only then add a helper — and only if every natural caller would use it.

"Add a comment warning about it" is not on the ladder. Neither is fixing only the one call site the diff touched: if the seam is wrong, the finding is about the seam.

This is the read-only, diff-scoped version. The full refactor process — grep every caller, move the invariant, delete the bypasses, prove it with a test plus a grep — lives in [../../improve/INTERFACE-SAFETY.md](../../improve/INTERFACE-SAFETY.md); point the reader there when a finding clearly warrants the deeper pass.

Axis tag: `contracts`.
