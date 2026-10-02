---
name: proposal
description: "Propose a feature as one document or one tracker issue: the idea, comps, screenshots of every state, and how it would work. Use for a feature proposal, or 'here's an idea, here's how it would work'. Bug reports are `issues`."
---

# proposal — an idea, its comps, its screenshots, how it would work

A **proposal** is one finished thing: a document, or one tracker issue. It says what the
problem is, shows the feature in screenshots of every state, and states how it works in
enough detail that the build reads the proposal and the tracker, never the prototype.

The prototype is throwaway ([`../spike/LIFECYCLE.md`](../spike/LIFECYCLE.md)), so everything
the build needs (copy, sizes, timings, states, logic) ends up in the proposal text or in the
tracker items.

## Steps

Each step names its owner. Where the owner is another skill, load it at that step and follow
it; this skill only sets the order and what each step must produce. An idea too vague to mock
up goes to `grill-me` (Shape mode) first, and comes back at step 2 once its open decisions
can be named.

1. **Read** — this skill. The existing proposal and its tickets, if any (through `issues`); the
   project's `DESIGN.md` and `docs/CONTEXT.md`; the real components and stylesheets the
   feature touches. Done when you can name every screen the feature changes and every decision
   still open.
2. **Options round** — `spike`, rung 3 ([`../spike/MOCKUP.md`](../spike/MOCKUP.md)). Static
   mockups on the project's real CSS: up to three options per open decision, every state,
   light and dark. Put the decisions as one option set ([`../CHAT-FORMAT.md`](../CHAT-FORMAT.md)
   §Option set), on one Canvas card because the options are visual. Done when every decision
   has an answer, or the user has said it stays open.
3. **Prototype** — `spike`, rung 4 ([`../spike/UI.md`](../spike/UI.md)). One interactive
   prototype per platform, with faked data arriving on a timer, so the user can walk each
   role's flow from start to end. Each piece of feedback is a rebuild over the same file and
   one line saying what changed.
4. **Screenshot mode** — this skill, [SCREENSHOTS.md](SCREENSHOTS.md). Full-screen sizes per
   platform are `spike`'s rule, in [`../spike/MOCKUP.md`](../spike/MOCKUP.md). Done when
   SCREENSHOTS.md's own done-when holds.
5. **Write** — this skill, [TEMPLATE.md](TEMPLATE.md). Load `show-shape` before the Flows and
   Pseudo-code sections. Done when the build needs nothing from the prototype: every state in
   the screenshots has its copy, sizes and timings under UI details.
6. **Confirm, publish, read back** — this skill; `issues` for a tracker.
   - Show the draft rendered with its images: one Canvas card of the Markdown, images as
     absolute paths. In chat, one slate row ([`../CHAT-FORMAT.md`](../CHAT-FORMAT.md) §Slate row)
     naming where it goes and what changes there: a new issue or file, or which sections of the
     existing one are replaced. Wait for `go`.
   - Publish to the target the user named:
     - **Document:** a Markdown file at the path the user gives, with the PNGs copied from the
       shoot directory into a sibling directory its relative links name. No path given: ask.
     - **Tracker issue:** through `issues`, on the backend it resolves. On GitHub, attach each
       PNG with `--attach` using the same relative path the body references
       ([`../issues/github.md`](../issues/github.md) §Attaching media). A beads item renders no
       image, so on a beads-only repo the proposal goes out as the document.
   - Read the published copy back: the written file, or the issue body through `issues`.
     Every image reference must be an uploaded asset URL, or a relative path that exists
     beside the document. Grep the body for `/Users/`, `/private/`, `tmp/`, `localhost`,
     worktree and branch names, hostnames, IPs and keys. Every hit is a leak or a missing
     image: fix it and publish again.
7. **Tracker items** — `issues`. With no slices yet, run `issues spec` with the published
   proposal as its structured source. With slices already filed, rewrite each one so its
   Visual acceptance block ([`../issues/TICKET-TEMPLATE.md`](../issues/TICKET-TEMPLATE.md))
   carries its states, verbatim copy, layout, motion and acceptance criteria from the
   proposal, citing its screenshots the way [`../issues/spec.md`](../issues/spec.md) Phase 07
   says for that backend. Done when every screen in the proposal is claimed by exactly one
   slice.

## What a proposal leaves out

- **User stories.** The flows and UI details say who does what; a story list repeats them.
- **A decision that was not made.** An undecided point goes under Open Questions, stated as a
  question, with a screenshot when one shows the choice.
- **The prototype as a source.** The build reads the proposal and the tracker.

## Read on demand

| Open | When |
| --- | --- |
| [TEMPLATE.md](TEMPLATE.md) | Step 5: the sections, in order, and what each one must hold. |
| [SCREENSHOTS.md](SCREENSHOTS.md) | Step 4: adding `?shot=` to a prototype and writing the shoot script. |
