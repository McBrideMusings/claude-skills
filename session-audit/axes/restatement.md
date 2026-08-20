# Restatement lens — where the user had to say it again

Every time the user repeats, re-scopes, or corrects, the first attempt failed. The repeat is
a free, precisely-labelled bug report: whatever they added the second time is what was
missing the first time.

## Method

Read `--dump-user-messages` **in order**. Consecutive messages are the signal; the tool
output between them is context. Classify each repeat:

**Re-ask** — same question, more forcefully or more narrowly. The first answer missed the
question.

**Re-scope** — *"I meant just X"*, *"only the Y part"*. The scope was assumed instead of
resolved. Look at whether the ambiguity was visible at the time; if it was, it should have
been asked or stated as an assumption.

**Correction of fact** — the user fixes something asserted wrongly. Highest severity in this
lens: an unverified claim reached them. Check whether it was knowable by reading a file or
running a command, which the steering docs require before asserting.

**Correction of behaviour** — *"don't do X"*, *"stop doing Y"*. Check whether the behaviour
was already covered by `CLAUDE.md` or a skill. **If it was, that is a `negative-space`
finding, not this one — route it there.** A behaviour corrected twice across a corpus is
strong evidence a removed or weakened rule should come back.

**Re-request of the same output** — *"show me that again"*, *"where was that file"*. Usually
an output-format failure: a path not given absolutely, a table without the column they
needed, an answer buried in prose or written to a file instead of chat.

**Impatience** — *"just do it"*, *"stop asking"*. Over-confirmation. Cross-check against
`decision-quality`: asking too often and asking too thinly are different bugs with opposite
fixes, and confusing them makes both worse.

## The count is the finding

One re-scope is conversation. The same class of restatement in six sessions is a documented
rule that is missing, unclear, or ignored. Always report the denominator.

## Also worth catching

- **The user supplying a fact that was in the repo.** They should not be the lookup service.
- **The user re-stating a preference that already exists in `CLAUDE.md`.** Quote the clause;
  route to `negative-space`.
- **A path re-requested because it was given relative, or with punctuation stuck to it.**
  There is a standing rule about both.

## What is not a finding

- Genuine iteration — a user refining an evolving design is the process working.
- New information arriving that could not have been known earlier.
- A correction the user immediately reversed.

## Finding format

> **`<n>` restatements of class `<re-ask|re-scope|fact|behaviour|re-request|impatience>`.**
> Example: `<session>:<timestamp>` — *"<quoted, ≤15 words>"*.
> What the repeat supplied that the original lacked: `<one phrase>`.
> **Already documented?** `<yes: CLAUDE.md:<line> — route to negative-space | no>`.
> **Fix:** `<the rule to add or the format to change>`.

Axis tag: `restatement`.

**Enforceable?** Before writing the `Fix:` line, answer the hook question — see [../HOOKS.md](../HOOKS.md). If a hook could enforce this deterministically, name the event and predicate plus its simulated fires/precision; if not, say why (trigger needs judgment, or a load trigger removes the condition instead).
