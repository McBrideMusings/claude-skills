# issues reconcile — close beads whose pull request already shipped them

On a repo that lands work through pull requests, the PR merges after the session that opened
it has ended. `wrap-up` records the PR on each bead it ships (`bead-pr link`), and
`bead-pr reconcile` closes the bead once GitHub reports the merge. The SessionStart sync hook
and `git-sweep` run that close on their own. This verb is for the rest: beads that shipped
through a PR nobody linked, which stay open with nothing to close them.

The tool is `~/.claude/tools/bead-pr`; its docstring is the contract. Run it from anywhere in
the repo, or pass `-C <dir>`.

## 1. Close what is already linked

```sh
~/.claude/tools/bead-pr reconcile
```

It prints one line per bead it closed, per PR that closed without merging (bead left open),
and per PR it could not check. Report those lines as they are.

## 2. Gather the unlinked side

```sh
~/.claude/tools/bead-pr unlinked --since <date> > <scratch>/unlinked.json
```

`<date>` is the `created_at` day of the oldest open bead. No merged PR before a bead existed
can have shipped it. The JSON holds `beads` (open, no `pr` key) and `merged_prs` (merged since
`<date>`, no bead linked to them), each trimmed to title, description or body, and dates.

## 3. Match

For each bead, look for the merged PR that delivered its stated outcome. Match on what the
change does, never on wording alone:

- The PR title or body states the bead's outcome, or the PR's commits on the default branch
  (`git log --oneline <merge-sha>^..<merge-sha>`) touch the files the bead names.
- The PR merged after the bead was created.
- A PR that ships only part of the bead is **partial**: the bead stays open, and the slate
  row names what remains.

Read the merge's diff (`gh pr diff <n>`) before calling a match strong when the title alone is
ambiguous. A bead with no plausible PR gets no row: it is either unshipped or shipped outside
a PR, and neither is this verb's call.

## 4. Slate, then close through the same tool

One slate row per match, in the [`CHAT-FORMAT.md`](../CHAT-FORMAT.md) § Slate row shape: the
bead id and title, the PR number and title, the evidence in one line, and a disposition of
`close` (strong), `skip`, or `partial` (no close, the remaining work named). Nothing closes
before `go`.

On `go`, for every `close` row:

```sh
~/.claude/tools/bead-pr link <bead-id> <pr-number>
```

then one `~/.claude/tools/bead-pr reconcile`. The close goes through the same path the hook
uses, so the reason line names the PR and its merge commit like every other PR close. Report
the closed ids, then run `bd ready` and report what they unblocked.
