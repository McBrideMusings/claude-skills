# Proposal template

The body a proposal is published with. Every section below is required except Settings and
Open Questions, which are left out entirely when there is nothing to put in them. Write in the
project's `docs/CONTEXT.md` terms.

```md
## Problem Statement
{Who has the problem today and what they do instead. One or two paragraphs, no solution.}

## Solution
{The feature from the user's side, one paragraph per role. End with any rule the feature
must never break, stated as one sentence.}

## Design
{One line: what the screenshots were made from (the project's real stylesheets, fonts and
assets) and the pixel size per platform.}

{When the prototype is shared (SHARE.md): "Try it: [phone](<htmlpreview link>) ·
[desktop](<htmlpreview link>)", pinned to the reviewed revision.}

### {Role}, on {platform}
| {State} | {State} | {State} |
| --- | --- | --- |
| ![{what the image shows, in words}](./{platform}-{state}.png) | … | … |

{One subsection per role × platform. At most three images per table row; a long flow is
several tables in flow order. Alt text says what is on screen, so the proposal still reads
with images off.}

## Flows
{One text diagram per role, in a ```text fence: each event, then what the screen shows,
indented by step. Name every branch, including cancel and failure.}

## UI details
Build from these; the prototype is not kept.

**{Component or screen}**
- {Where it sits and what it replaces.}
- {Every string, verbatim in quotes.}
- {Sizes and colours as `DESIGN.md` token names, px only where no token exists; weights;
  timings in seconds; caps such as "99+".}
- {Every state: when it shows, what it shows.}
- {What updates in place and what redraws.}

## Pseudo-code
{The data shape as a type, then the non-obvious logic as pseudo-code: ranking, caps,
state transitions, anything a reader could implement two ways. Not the obvious parts.}

## Likely changes
- **{Layer}** ({package or service}): {what changes there}.
{Grouped by layer, from data up to UI. One bullet per layer.}

## Settings
{Each setting, its type and its default, in a ```text block. When a change takes effect.}

## Open Questions
1. **{The question, ending in a question mark.}** {The options, and what each one does.}

   ![{what the option looks like}](./open-{n}.png)

## Testing Decisions
- {The boundaries to test at, and what each one covers.}
- {Prior art in this codebase.}

## Out of Scope
- {What this proposal deliberately does not cover.}

## Further Notes
- {Constraints of a platform or API, unverified behaviour and how it gets checked, related
  work that is separate.}
```

## Rules for the sections

- **Design** — full screens only. A crop of one component goes under Open Questions.
- **UI details** — the test: could someone rebuild every screenshot from this section alone?
  A state shown in Design with no line here fails it.
- **Pseudo-code** — `show-shape`'s type-signature and pseudocode techniques.
- **Open Questions** — only what the user said stays open. A question the user answered is
  written into the section it decided, with no trace of the other options.
- **A count you worked out by hand** says so, in the same sentence: "by my count, unverified".
