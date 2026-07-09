# Apple / SwiftUI review lens

Platform lens for the `review` engine. Runs as one additional Sonnet sub-agent in Phase 04 when
the diff in scope contains Swift/SwiftUI files. Same output contract as the other `axes/` lenses:
report only genuine problems, `file:line`, a full-sentence headline, a **Why**, and a **Fix** with
a before/after where it clarifies. Axis tag: `apple`. Do not nitpick style or invent issues.

Adapted from MengTo/Skills `swiftui-pro` (Paul Hudson, MIT).

## Assumed baseline

- iOS 26 / current Xcode is the default target; Swift 6.2+ with modern concurrency.
- SwiftUI-first — flag UIKit only where the project isn't already committed to it; never propose
  adding UIKit unprompted.
- Do not introduce third-party frameworks; flag any the diff adds without evident need.

## What to flag (each carries a concrete cost — deprecation, correctness, a11y, or perf)

**Deprecated / superseded API**
- `foregroundColor(_:)` → `foregroundStyle(_:)`.
- `cornerRadius(_:)` on views → `.clipShape(.rect(cornerRadius:))`.
- `NavigationView` → `NavigationStack` / `NavigationSplitView`.
- `.onChange(of:) { newValue in }` (single-param) → two-param or zero-param modern form.
- Legacy `EnvironmentObject`/`ObservableObject` where `@Observable` (iOS 17+) fits the target.

**Data flow**
- `Binding(get:set:)` built inside `body` → `@State` + `.onChange`, or a real `@Bindable`.
- State stored higher than the view that uses it (forces broad re-eval) → push it down.
- Views observing a whole model when they read one field → narrow the observation.
- `@StateObject` vs `@ObservedObject` misuse (owning vs borrowing).

**Views / animation**
- Expensive work in `body`: formatters, decoders, sorts, filters, regex, image decode, view-model
  construction. → hoist to stored/cached state or off the main actor.
- `AnyView` / type-erased branching where `@ViewBuilder` or `Group` preserves diffing.
- `ForEach` over unstable ids (`UUID()`, indices) → stable model identifiers.
- Eager `VStack`/`HStack` in a `ScrollView` for large collections → `List` / `Lazy*` containers.

**Accessibility (Apple HIG)**
- Icon-only `Button { Image(systemName:) }` → `Button("Label", systemImage:)` so VoiceOver reads it.
- Missing Dynamic Type support (hardcoded font sizes that don't scale).
- Missing `accessibilityLabel`/`Hint` on custom-drawn or gesture-only controls.
- Motion that ignores `@Environment(\.accessibilityReduceMotion)`.

**Structure / hygiene**
- Multiple types crammed in one file → one primary type per file, folders by feature.

## Output

Group by file; skip clean files; end with a prioritized summary (highest-impact first). Findings
flow into the normal Phase 05 scoring and the ≥75 cutoff like any other axis.
