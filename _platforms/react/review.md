# React / Next.js quality review lens

Platform lens for the `review` engine. Runs as one additional Sonnet sub-agent in Phase 04 when the diff
in scope contains React or Next.js code. Same output contract as the other lenses: report only genuine
problems, `file:line`, a full-sentence headline, a **Why** (concrete cost), and a **Fix** with a
before/after where it clarifies. Axis tag: `react`. Do not nitpick style or invent issues.

Loads **alongside** `../web/review.md` (motion, CSS, gestures) — `_detect.md` matches React to both. This
cell is about correctness and state ownership; that one is about how things move. Neither covers the other.

Grounded in the React docs' "You Might Not Need an Effect" —
<https://react.dev/learn/you-might-not-need-an-effect>.

## Effects that shouldn't be effects

The most common real defect in React diffs. Each of these runs a render late, can flash the wrong UI for
a frame, and adds a dependency array that will drift:

- **Deriving state in an effect.** `useEffect(() => setFullName(first + ' ' + last), [first, last])` →
  compute it during render (`const fullName = first + ' ' + last`). No state, no effect, no stale frame.
- **Resetting state when a prop changes.** An effect that clears form fields on a new `userId` → give the
  component a `key={userId}` and let React remount it.
- **Handling an event after the fact.** An effect that fires a POST when a flag flips true, where the flag
  was set by a click → do the POST in the click handler. The effect version fires again on any remount.
- **Chained effects.** Effect A sets state that triggers effect B that sets state that triggers a render.
  → collapse into one calculation during render or one event handler.
- **Syncing two pieces of state that are really one.** If B is always computable from A, B is not state.

**Real effects exist** — subscriptions, a non-React widget's lifecycle, an imperative focus call, analytics
on mount. Don't flag those. The test is: is this effect synchronizing with something *outside* React?

## Memoization without a reason

Flag `useMemo` / `useCallback` / `memo` added with no measured cost and no render-identity requirement.
A memo earns its place when it (a) skips a genuinely expensive computation, or (b) preserves a reference
identity that something downstream depends on (a dependency array, a `memo`'d child, an effect).

"It might re-render" is not a reason. Each unjustified memo costs a dependency array that will go stale and
a reader who has to work out why it's there.

Not applicable under the React Compiler — if the repo has it enabled (`babel-plugin-react-compiler`, or
`experimental.reactCompiler` in `next.config`), hand-written memos are noise by default and the finding is
stronger, not weaker.

## State ownership and prop plumbing

- **Redundant state** — a value stored in state that is already derivable from props or other state.
- **Prop plumbing through components that don't use the value.** Look for whether the intermediate
  component should take `children` instead, or whether the state is owned too high.
- **Two backing entities presented as one product concept.** When the UI treats them as one thing, pass one
  unified prop and one unified callback through the intermediate components; split back into the two real
  entities only at the root or the adapter where persistence or payload format actually requires it. A
  black-box component should not know the distinction.
- **Callback gymnastics** — chains of wrapped callbacks and memoized handlers that would disappear if the
  state lived one level up or one level down. Say where the state should live.

## Server and data code (Next.js)

- **Waterfalls** — sequential `await`s where the requests don't depend on each other. → run them
  concurrently with the pattern the repo already uses. Only flag when the independence is verifiable from
  the code.
- **Client/server boundary** — `'use client'` pushed higher than it needs to be, dragging a subtree into the
  client bundle. Name the component that should have carried the directive instead.
- **Fetching in an effect what a server component could fetch.** Only when the repo is already using server
  components — not as a general migration suggestion.

## Bounds

- **No general migration advice.** "You should use React Query", "this should be a server component" — only
  when the repo already has that pattern and this code is the outlier.
- **Skip anything the linter enforces** — `react-hooks/exhaustive-deps` already flags dependency arrays.
- Findings here are **correctness and maintainability**, not style. Component-splitting preferences with no
  concrete cost belong nowhere.

## Output

Group by file; skip clean files; end with a prioritized summary (highest-impact first). Findings flow into
the normal Phase 05 scoring and the ≥75 cutoff like any other axis.
