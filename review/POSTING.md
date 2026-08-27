# Review — dispositions and posting

How a finished review's findings get disposed of: fixed on the branch, posted back to the author,
or dropped. Loaded by [SKILL.md](SKILL.md) at end of pass, after the report is written.

**This file formats findings you are handing *to* an author.** Answering a reviewer who has
already read your code is the opposite job and lives in
[../unblock/FEEDBACK.md](../unblock/FEEDBACK.md) — different shape, different caps, different
banned phrases. Do not read one for the other.

[RULES.md](RULES.md) binds this file. RULE 0 applies hardest at exactly this point: the
end-of-pass disposition is where the selector gets reached for most often, and it is banned here
like everywhere else. RULE 1 too — how big a fix is never decides whether it happens.

## Always print, before any offer

- the **PR URL** if one exists (`gh pr view --json url --jq .url`),
- the **report itself**, in chat, quoted as a Markdown blockquote. There is no file — see
  [REVIEW-CORE.md](REVIEW-CORE.md) Phase 07.

## Order of the closing message — findings, then dispositions, then the quoted outcome

Three parts, in this order, and never interleaved:

1. **Every finding**, formatted and grouped per [REVIEW-CORE.md](REVIEW-CORE.md), so the user
   reads the whole set before being asked anything about it.
2. **The disposition list** — one line per finding, keywords, the recommended one marked.
3. **Beneath the recommended disposition, a blockquote of the text that disposition would
   actually put on GitHub.** Not the text some other branch of the offer would put there.

### The quoted body must be the body of the path you recommend

**A quoted verdict that contradicts the recommended keyword is the failure this section exists to
stop.** It has shipped: a pass printed a full *Request changes* body — "this is broken, the author
should fix it" — and then recommended `fix`, which means fixing it on the branch and pushing.
Those cannot both happen. Once the fix lands there is nothing left to request changes about, so
the honest verdict is Approve and the honest body is *"found this, fixed it on the branch, here is
what I pushed."* The user had to point out the contradiction.

**Self-check before sending the closing message: read the quoted body as if the recommended
keyword had already been carried out.** If the body describes work that the keyword itself would
have already done, or asks the author to do something you are about to do yourself, the body is
for the wrong branch — rewrite it for the recommended one.

When the alternatives lead to materially different outgoing text, don't quote all of them. Name
the paths in one line each, quote only the recommended path's body, and say the other body is the
one already printed above (or that you'll draft it if they pick that branch).

## The disposition list

One line per finding, its keyword options, and the recommended one leading with its rationale as
a clause — not a paragraph. Never an option menu.

```
1. [bug · T1 · high] <one-line finding> — verified `reproduced` — `post` (recommended — blocking, reproduces) · `fix` · `skip`
2. [best-practice · T2 · low] <one-line finding> — `fix` (land it on the branch, then Approve) · `post` · `skip`
3. [slop · T2 · low] <one-line finding> — over the 5-thread posting budget; `fix` · `skip` (no `post`)

Type a disposition per finding, e.g. `1 post, 2 fix, 3 skip` — or `go` to accept every listed `(recommended)` keyword at once.
```

`go`'s exact scope is RULES.md's; it covers only lines carrying a `(recommended)` keyword, and a
line without one must be typed individually.

**Which offers run depends on the route** (see [SKILL.md](SKILL.md) Phase 00):

| route | offer |
| --- | --- |
| my own code — my branch, or my owned-repo working tree | fix only. There is nowhere to post my own review. |
| teammate's PR I have checked out | combined fix-then-post, per finding |
| not mine, no PR | nothing. Print the report and the path, no offer. |

All offers are gated on an explicit yes in the moment — never automatic (global "never send /
act on my behalf" rule).

## Offer grill-me

Only on the self-review path, and only when the report carries uncertain findings (per
[REVIEW-CORE.md](REVIEW-CORE.md)'s hand-off rule). Offer a `grill-me` pass that interrogates those
findings one question at a time to settle intent. This is an *addition* to the fix offer, not a
replacement — run it first when it applies.

## Offer to fix (my own code)

Present both flows and let the user pick:

- **`implement`** — Claude fixes the findings itself.
- **`implement delegate`** — Claude orchestrates; a cheaper model implements; Claude validates.

Hand the report path to the chosen flow. Don't start it without a yes.

## Offer to fix and/or post (teammate's PR)

You already have the branch checked out, so each finding can go one of three ways and the user
picks per finding:

1. **Fix it on the branch** — apply the change, commit (as me, plain message, no AI attribution),
   push to the PR's own branch (`git push origin <headRefName>`).
2. **Post it for the author** — leave the code alone, hand the finding back via the formal review
   verdict or a comment.
3. **Neither** — drop it. It stays in the chat report above; nothing goes to GitHub or the branch.

**Default split — fix the small stuff, hand the rest back.** Propose this stance up front, then
let the user override per finding:

- **Fix directly:** `low`- or `medium`-severity findings that are small, contained, and
  **behavior-preserving** — a missing guard, a one-line bug fix, helper reuse, a typo, dead-code
  removal, a flag correction. They don't change what the author built, so applying them is safe
  and saves a round-trip.
- **Hand to the author:** `high`-severity findings, `architecture` / `negative-space` design
  calls, or **anything that would change or break the PR's intended behavior, feature, or
  outcome**. Here the author's intent is load-bearing — a direct edit risks overwriting a
  deliberate choice. When unsure whether a fix would alter intended behavior, treat it as
  hand-to-author.

Split on "is this small, safe, and intent-neutral," **not** on the blocking verdict — severity ≠
blocking still holds, so a blocking bug can be a tiny behavior-preserving one-liner that belongs
in the fix bucket, while a non-blocking architecture note usually belongs in the hand-back bucket.

**Fixing on the branch — mechanics + gate.** Pushing commits to someone else's PR branch is an
outward action on their work, held to the same **explicit-yes-in-this-message** gate as any send.

- Preflight: the PR branch checked out, clean working tree. State exactly which findings you'll
  commit and confirm before touching the branch.
- Apply them (hand the subset to `implement`, or edit directly for one-liners), run the project's
  checks, then `git push origin <headRefName>` — never to `main`, never `--force`. Pre-flight the
  no-attribution rule on the commit message.
- This needs push access to the PR's head branch. Same-org branches accept the push; a fork from
  an outside contributor only accepts it with "allow maintainer edits" on. If the push is
  rejected, say so and fall that finding back to the post bucket.

## Comment budget — at most FIVE posted threads per PR, per pass

Everything above the cap stays in the chat report already printed; it does not go to GitHub.
This caps the *posted* set only — the report printed in chat is always complete.

Five is the number because of what the extra ones cost. Concise, focused review comments are far
more likely to be acted on than long ones, and the failure being corrected here is a tool posting
14 comments carrying 3 real findings — the author then spends the round-trip sorting them instead
of fixing the bug. At the ≥0.80 signal-ratio target, five threads permit at most one item the
author judges to be noise; a sixth, seventh, and eighth do not add coverage, they add a review
cycle. If you cannot say the PR's problems in five threads, the PR needs a conversation, not a
longer comment list — say that in chat.

**Ranking for the cap**, applied after the Phase 06 filter:

1. **Tier 1 with verdict `reproduced`** — post every one. **The cap does not apply to these and
   they are never cut, at any count.** If seven reproduced Tier 1 findings survive, all seven
   post, and you say in chat that blocking findings exceeded the budget. Shipping broken behavior
   to save a comment slot is not a trade this rule permits.
2. **Tier 1, `not-executable`** — highest score first.
3. **Tier 2** — highest score first, then by file path.

Fill the remaining slots down that order and stop. Tier 3 never enters the list because it never
survives Phase 06.

**The posted comment says nothing about what was withheld.** No "3 additional non-blocking items
omitted", no counts, no axis summary, no offer to expand. A disclosure line is an invitation to
ask for the rest, which reinstates exactly the round-trip the cap removes. **Tell the user
instead**, in chat, in one line naming the count, the axes, and the report path: `3 Tier 2
findings held back (contracts, slop) — full list in the report.` They can post any of them by
name if they disagree.

## The verdict — block on broken behavior, not on severity

For the findings going back to the author, propose one consolidated review verdict. On a PR you
didn't author GitHub records that verdict as your review decision (Request changes even gates the
merge), so the post offer **always proposes a verdict**, never a bare comment. (Self-authored PRs
can't get a verdict — GitHub blocks self-approve and self-request-changes — which is why this
lives only on the teammate-PR path.)

**"It's not my PR" is never a reason to skip this section.** It is the reason this section runs at
all — a teammate's PR is exactly the case the verdict exists for; a self-review can't even use it.
`gh pr review --approve` needs read access to the repo, nothing more — it is not gated on push
access to the author's branch, and it is not a merge button. **Do not conflate the two.** "I can't
push a fix to their branch without asking" is real and governs the fix-on-branch offer above; "I
have no standing to approve or request changes on their PR" is false on any repo you can `gh pr
view` in, and saying it out loud is the specific failure this line exists to stop — a real
instance of this skill telling the user their review responsibilities are not its job, then having
to be told twice, in the same session, that finding nothing wrong on a teammate's PR **is** a
finished review with a verdict, not a review with no ending.

What separates blocking from non-blocking is *what the finding is about*, never how confident or
how large it is:

- **Blocking → Request changes** (`gh pr review --request-changes`; gates the merge). Any finding
  that the diff makes behavior *wrong*: a new bug, or existing behavior this diff breaks. **New or
  newly-broken behavior is always blocking** — a `low`-confidence regression still blocks, because
  the question is "does this ship something broken," not "how sure am I". Axis-independent: a
  `spec/wrong-impl`, a `contracts` violation that breaks a caller, a `negative-space` un-updated
  caller, or a `standards` correctness breach each block exactly as a `bug` does. One such
  survivor → Request changes.
- **Non-blocking → Comment** (`gh pr review --comment`; on record, no merge gate). Everything
  where behavior is *correct* but the code could be more elegant, more efficient, better
  organized, or better documented. Pure-quality `architecture`, `best-practice`, and most
  `contracts`/`standards` findings live here. A pre-existing bug the diff merely sits near, but
  does not introduce or worsen, is a non-blocking note.
- **Approve** (`gh pr review --approve`) — nothing survived (and on a draft, no expected-gap
  entries either), **or** every survivor has just been fixed on the branch. After the fix commits
  land, nothing broken or unaddressed remains, so Approve is the honest verdict.

### Low-severity, non-blocking finding → the fix-on-branch offer is MANDATORY

When the survivors are all `low`-severity, non-blocking quality notes and nothing is broken, you
**must** present **fix it on the branch, then Approve** as a listed option — and lead with it. Do
**not** present "Comment / Approve as-is / Neither" as the *only* choices: an offer set with no
fix-on-branch path buries a fixable nit or ships it unaddressed, and is the specific failure this
rule exists to stop. The finding is small and the merge isn't gated, so the cleanest outcome is
landing the small fix and approving clean.

This holds **even when the *ideal* fix needs the author's intent.** A design-call element does
**not** license collapsing to post-only — it changes *what* you offer to fix, not *whether* you
offer. Before falling back, ask: is there a narrower, safe, behavior-preserving version I could
land now (a guard, a comment clarifying the contract, a rename, a doc note) even if the fuller
restructure is the author's call? If yes, offer *that* on-branch, then Approve. Only when there is
genuinely **no** safe on-branch change at all may you present a post-only offer, and then you must
**say explicitly** "no safe on-branch fix here because …" so the omission is a stated decision
rather than a silent drop. When in doubt, list the fix-on-branch option and let the user decline
it.

### Local work first, then the body, then the post — two confirms, in that order

`go` (or any disposition naming a fix) is not a single action. It runs in three steps, and the
user's `go` authorises only the first:

1. **Enact every local change the dispositions imply** — write the fixes, run the project's
   checks, commit, push to the PR's head branch. Report what landed.
2. **Then draft the outgoing text against what actually happened**, not against what the report
   said before the fixes existed. A finding fixed in step 1 is described in the past tense and no
   longer asks anything of the author; a finding left alone keeps its original wording.
3. **Show that text and wait for a second explicit yes** before `gh pr review` touches the PR.
   The verdict changes the PR's merge state, so it is held to the explicit-yes-in-this-message
   gate on its own — the `go` that authorised the fix does not carry forward to the post.

When a disposition set implies **no** local work — everything is `post` or `skip` — step 1 is
empty and the first `go` goes straight to showing the body for confirmation. Say so rather than
appearing to skip a step.

### Propose, then confirm — never auto-submit

State the recommended verdict, then the exact body that will be posted — the report scoped to the
handed-back findings (summary line plus axis-grouped findings, minus any being fixed on the
branch, with a one-line note of what was pushed instead), quoted in chat as a Markdown blockquote,
never written to a file — and that the user can pick a different verdict or decline. A verdict review — Request changes especially — changes the PR's merge state,
so it is held to the same **explicit-yes-in-this-message** gate as any send. Prior or implied
consent does not count.

On an explicit yes in that message, submit one consolidated review:

```
gh pr review <number> --request-changes --body "$(cat <<'EOF'
<report body>
EOF
)"
```

**Never hard-wrap the body.** GitHub renders an embedded newline mid-paragraph as a real line
break, so terminal-style wrapping shows up as choppy broken lines. One continuous line per
paragraph and per bullet.

If the user wants to weigh in **without** a verdict, post as a plain conversation comment instead
(`gh pr comment <number> --body …`); if they'd rather post by hand, give them the body to paste.
Default to NOT posting anything.

## Offer to arm auto-merge (my own open PR)

Only on the self-review path, only when the target is **my own open PR**, and only when the pass
came out clean: no blocking or serious finding survived, **or** every finding was just fixed.
Gate on the repo actually allowing it:

```
gh api repos/<owner>/<repo> --jq '.allow_auto_merge'
```

`true` → **one more row on the disposition slate above, not a question of its own** (RULES.md, one
slate per message): ``N. **arm auto-merge** — repo allows it; GitHub would merge on approval. My
pick: arm.`` A separate `arm` / `skip` line under the findings list makes the user answer twice.
On an explicit `arm`, or a `go` that covers the row:

```
gh pr merge <n> --squash --delete-branch --auto
```

`false`, no open PR, or serious findings still open → **say nothing, no offer.** Never touches
repo settings; only the per-PR button, only where GitHub already offers it.
