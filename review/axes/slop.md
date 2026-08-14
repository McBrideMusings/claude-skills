# Code slop lens

Flag code in the diff that adds shape without adding meaning. Slop is not a bug and not a style nit — it is structure a reader has to walk past to reach the actual logic, and every piece of it makes the next change slower.

This is the *code* counterpart to `_domains/gui/slop.md` (visual/AI-design slop). Neither one covers the other; a diff can be clean code and sloppy UI, or the reverse.

**The test for every entry below: delete it — does anything real break, or does the code just read better?** If deleting it loses nothing, it's slop. Adapted from jnsahaj/skills `code-refactor-review` (its Slop Detection section).

## The eight kinds

- **Comment slop** — a comment restating what the line plainly does (`// increment i`), a comment defending awkward code instead of the code being un-awkward, a long comment that should have been a clearer name, or stale context left over from an earlier shape of the change. → delete it, or turn what it explains into the code itself.
- **Helper slop** — a tiny wrapper that adds no meaning over the thing it wraps, a new file created only to make one function look shorter, an extra hop that exists so a call site reads as one line. → inline it back. A helper earns its name by having more than one real caller, or by naming a concept the raw call doesn't.
- **Type slop** — an exported one-off type used by a single function, a bespoke result/error shape where the codebase already has a standard one, an annotation where inference was clearer, or a type whose only job is to paper over an awkward signature. → drop it and use the existing shape, or fix the signature the type was hiding.
- **Memo/callback slop** — `useMemo`, `useCallback`, `memo`, or any equivalent memoization added without a measured cost or a real render-identity reason. → remove it. (React-specific handling of *why* it's usually unnecessary lives in `../../_domains/react/review.md`; the "no reason given" case is slop on any platform.)
- **Effect slop** — an effect that mirrors a prop into state, resets derived state, or handles something that already happened in an event handler. → derive during render, or move the work into the event that caused it.
- **Compatibility cruft** — a mode flag, prop, wrapper, route alias, or fallback bolted on to preserve a shape that the change is supposed to be replacing. → check for real callers; the deeper move is `improve`'s zero-caller rule in [../../improve/ARCHITECTURE.md](../../improve/ARCHITECTURE.md).
  - **First ask whether the old shape ever shipped.** If the signature, alias, or data shape being preserved only ever existed earlier in *this same branch*, nothing outside the branch could have called it — it is compatibility with something that was never deployed. That case needs no weighing: delete the old path and update its callers. `git log origin/main -- <path>` and a grep for callers outside the diff settle it.
- **Diff churn** — renames, reformatting, comment rewrites, or wrapper-shuffling unrelated to what the change is for, making the diff bigger without making the design better. → split it out or drop it.
- **Overfitted to the conversation** — code that only makes sense to someone who watched it get written: a name or comment that reads as a reply to a review remark, a parameter that exists because of a wrong turn taken earlier in the branch, a structure whose shape is the history of the change rather than the problem. → **the test: does this still parse for a reader who arrives with no history?** If it needs the branch, the PR thread, or this session to be understood, rewrite it against the codebase's own vocabulary. (Overlaps comment slop where the artifact is a comment; file it as this kind when the *code itself* carries the history.)

## Red flags — concrete tells worth grepping for

Each of these is a *prompt to look*, not an automatic finding:

- A new top-level `utils`, `helpers`, `shared`, `common`, or `misc` module.
- A directory containing only `index.ts` (or equivalent) with no stated reason.
- A re-export of something already exported elsewhere.
- A function whose name hides a side effect (`getUser` that also writes a session).
- Several new types introduced to support one local function.
- A large comment explaining why a prop or flag has to exist.
- New callback/memo/effect code that would disappear entirely if state ownership were simplified.

## Bounds

- **Slop findings are never blocking.** They don't make behavior wrong. Score them accordingly and expect most to land `low`.
- **Skip anything tooling enforces** — formatting, import order, unused-variable warnings belong to the linter.
- **Don't flag brevity for its own sake.** A helper with two real callers, a type that names a domain concept, a comment explaining *why* a non-obvious choice was made — none of those are slop.
- **Overlap with `standards`**: duplicated logic and Fowler smells stay on the `standards` axis. If a finding is "this already exists elsewhere in the repo", that's the reuse rule in `standards.md`, not here. Don't double-report.

Axis tag: `slop` (flat — name the kind in the headline prose, e.g. "wrapper adds no meaning over the call it hides").
