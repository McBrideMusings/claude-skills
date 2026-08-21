# Report format

An audit is read top to bottom, in a terminal, by someone deciding what to fix. It is **prose, not a slide**. The failure this file exists to prevent is a report so airy it cannot be read — every line its own paragraph, every fix a nested sub-list, blank lines everywhere, the argument spread so thin the reader has to reassemble it.

## The shape

Each finding is exactly three parts, in this order, with **no blank line between them**:

1. **A numbered heading** — `### 1. <claim>`. The claim, not the topic. "relay never cleared the context, 3 attempts out of 3" beats "relay issues".
2. **One paragraph.** The evidence and the reasoning, run together as continuous prose. Quote the timestamp or the line inside the sentence. This paragraph is where the whole argument lives.
3. **One bolded fix line** — `**Fix:** …`. Exactly one, the recommended one.

Then **one blank line**, then the next finding.

## Hard rules

- **No line breaks inside a finding's paragraph.** Not for evidence, not for a quote, not for emphasis. If a quote is long enough to want its own line, it is long enough to paraphrase and cite instead.
- **No sub-lists inside a finding.** No `a)`/`b)`, no bullets, no nested numbering. A finding that seems to need branches is two findings, or one finding whose alternatives belong in a single sentence.
- **One fix, and it is bolded.** Rejected alternatives go in the paragraph as a clause — *"a `Stop` hook would fire at 10% precision, so the wording fix wins"* — never as their own line or option list.
- **No blockquote blocks.** Inline the quoted line with backticks inside the sentence.
- **No table of findings.** The numbered headings are the index.
- **Counts inline.** `3 of 12 sessions`, `7 of 9 blocked calls`, `334 of 830 turns` — inside the sentence, never as a separate stat line.

## Length

Aim for **60–120 words** in the paragraph. Under 60 usually means the evidence is missing. Over 120 means it is two findings.

Cap the report at the findings that survived scoring. Eight is a lot; twelve is unreadable. If more survive, merge the ones sharing a root cause and say so in the paragraph.

## Worked example

The two below are the same finding. The first is the failure mode.

**Wrong — unreadable:**

```
## 1. relay failed to clear

The log shows three attempts:

> [09:08:51] agent never went idle

> [09:22:48] agent never went idle

Each gave up after 120s.

The consequence:

- 334 of 830 turns at 500k+ context
- 469 cache-reads per output token

**Fix shapes tested.**

(a) HOOKS: already a hook, nothing new.

(b) Raise the timeout.

(c) Diagnose the idle-wait.
```

**Right:**

```
### 1. relay never cleared the context — 3 attempts, 3 failures

All three relays this session logged `agent never went idle; prompting without clearing` at 09:08:51, 09:22:48 and 10:45:11, each giving up after exactly 120s, and `session before clear` stayed `2e434af4…` throughout — so no clear ever happened and every relay degraded to its fallback. That is the whole spend profile: 334 of 830 turns ran above 500k context at 469 cache-read tokens per token produced. The fallback itself worked perfectly three times out of three, so the thing to keep is the degradation path and the thing to fix is the idle-wait; raising the 120s window is the cheap guess, but every relay this session followed a `/loop`, which makes a pending `ScheduleWakeup` the likelier culprit and the first thing to test.

**Fix:** relay should say out loud when it could not clear, instead of degrading silently — the failure was only discoverable by reading `relay.log` afterwards.
```

## The closing dispositions block

One line per finding, numbered to match, each ending in its default in brackets. No prose around it beyond a single lead-in sentence naming how to answer.

```
Dispositions — reply with any mix, e.g. `fix 5, file 2 3, skip 7`:

1. relay never clears — [papercut]
2. commit-prefix contradiction — [file]
3. manual-testing rule never fires — [file]
```
