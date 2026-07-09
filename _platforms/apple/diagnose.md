# Apple / SwiftUI diagnose axis

Read at `diagnose` Phase 04 (Instrument) when the target is a SwiftUI app and the symptom is a
rendering / responsiveness bug: unnecessary `body` re-evaluations, jank, list/grid stutter, state
that resets, repeated `onAppear`, focus loss, scroll resets. For a *perf* symptom (CPU/memory/
launch/energy) also read `../apple/profiling.md`. This axis supplies *what to instrument and how to
read it*; the diagnose loop (repro → hypothesise → instrument → fix → regression-test) is unchanged.

Adapted from MengTo/Skills `swiftui-debugging`.

## Confirm re-evaluation vs re-creation first

Two different problems with different fixes: SwiftUI **re-evaluating** a `body` (cheap unless the
body does expensive work) vs **destroying and recreating** a view (loses `@State`, restarts
animations, re-fires `onAppear`). Instrument to tell them apart before touching code.

### `Self._printChanges()` — the cheapest probe

```swift
var body: some View {
    let _ = Self._printChanges()
    // view content
}
```

| Output | Meaning | Look at |
| --- | --- | --- |
| `@self changed` | Parent recreated this view value | parent invalidation, input `Equatable`-ness |
| `@identity changed` | SwiftUI destroyed + recreated the view | `.id()`, `ForEach` ids, conditional branching |
| `_<property> changed` | A stored/state/binding/environment value changed | whether the view even reads that value |

### Instruments — SwiftUI template

Inspect **View Body** counts, **View Properties** changes, **Core Animation** commits. Sort by
count/duration, reproduce the slow interaction, edit only the hottest view types. Use `os.Logger`
for quick counts or `os_signpost` for timeline correlation.

## Quick triage → likely cause

| Symptom | First suspect |
| --- | --- |
| `body` runs when unrelated values change | over-observation, parent recreation, state too high |
| `@identity changed` in `_printChanges` | unstable `.id()`, conditional structure change |
| ScrollView creates hundreds of rows at once | `VStack`/`HStack` in `ScrollView`, no lazy container |
| `onAppear` repeats for same content | identity churn or lazy-cell recycling |
| Typing in a field redraws the whole screen | broad `ObservableObject`, state stored too high |
| Initial load / animation stutters | expensive work in `body`, image decode, eager layout |
| Poor diffing around dynamic view types | `AnyView` / erased branching |

## Fix direction (narrowest first)

- Move state **down** to the view that uses it; split large views so unrelated changes don't
  re-evaluate expensive subtrees.
- Preserve identity: stable `ForEach` ids, no `UUID()`/`Date()`/index as `.id()`, don't use a
  conditional branch only to toggle a modifier.
- Replace eager containers with `List` / `LazyVStack` / `LazyHStack` / `LazyVGrid` / `LazyHGrid`.
- Move formatting, decoding, sorting, filtering, image prep **out of** `body`.
- Prefer `@Observable` (iOS 17+) over broad `ObservableObject` so views observe only what they read.

## Before done

Remove temporary `_printChanges()`, prints, and signposts unless the user wants them kept (the
diagnose Phase 06 cleanup gate). Verify the original symptom is gone against the un-minimised case.
