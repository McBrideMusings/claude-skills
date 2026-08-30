# Decision-quality lens — could the user answer without a round trip?

When a choice is put to the user, it either carries enough to decide inline or it costs a
round trip. A round trip is two turns on a full context, plus the user's attention, and it
is invisible in any cost report because the tokens look like normal conversation.

## The contract being audited

`~/.claude/CLAUDE.md` sets the bar. Quote the live text rather than these paraphrases, but
the standing requirements are:

- Options and a **pick**, then wait. A bare question is a non-answer; so is a list with no
  recommendation.
- **Every option carries its own best argument** — the case for the pick *and* the real case
  for each alternative, so the user weighs genuine tradeoffs rather than strawmen.
- **Formatted**, never one dense paragraph: the question numbered, each option a bolded
  `1A` / `1B` line naming what physically happens, bullets beneath, cost as the last bullet.
  Two numbering schemes in one message is a finding — the user cannot answer `3B` when `3`
  was an option rather than a question.
- Each option written as **what physically happens** — which file, which value, which
  process, when. Not a noun with no location.
- Options and recommendations go **in chat**, never in a file the user has to open.

## Method

From `--dump-user-messages`, find every point where the user was asked to choose. For each,
read the assistant turn that posed it and check the contract above. Then look at the user's
reply: **the reply is the ground truth.**

- A clean pick (`go`, `1`, `do the first one`) → the framing worked.
- A question back → the framing failed. Whatever they asked for is exactly what was missing.
- A correction of the premise → the options were wrong, not just underspecified.
- Answering something that wasn't offered → the real option space was not presented.

Cluster the failures by *what was missing*: no recommendation, no cost line, missing
alternative, prose-blob formatting, an option with no concrete location, a decision buried
in a file.

## The expensive sub-kind — a decision approved on incomplete information

Worse than a round trip: the user picks, work starts, and a blocker surfaces mid-execution
that should have been visible at decision time. The cost is the abandoned work plus the
re-decision.

When the corpus contains one, the finding is not "should have researched more" — it is
**"this specific fact was knowable before asking, and cheap to check."** Name the check.

## Also audit the selector

`AskUserQuestion` is banned in several skills, and separately it is a wall-clock sink: one
corpus lost 45.4 hours across 41 calls, 66 minutes blocked per question. A decision put
through the arrow-key selector in a context that bans it is a finding on both counts.

## What is not a finding

- A genuinely open question with no defensible default.
- A user follow-up that adds new information rather than asking for missing information.
- Short answers to small questions. Match length to stakes.

## Finding format

> **`<n>` of `<m>` decision points needed a round trip.**
> Pattern: `<what was missing, one phrase>`.
> Example: `<session>:<timestamp>` — asked `<X>`, user replied *"<quoted>"*.
> **Contract breached:** `CLAUDE.md:<line>` — `<quoted clause>`.
> **Fix:** `<the specific element to add, and to which skill or doc>`.

Axis tag: `decision-quality`.

**Before writing the `Fix:` line, test it against all five fix shapes** — [../FIX-SHAPES.md](../FIX-SHAPES.md).
