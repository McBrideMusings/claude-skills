# Lifecycle — done, kept, updated, ticketed

## When done

**Load [`show-shape`](../show-shape/SKILL.md) via the Skill tool before writing up which version won and what to build from it.** The verdict is a plan — it says what the real implementation should look like — and it is worth more when it carries the winning version's actual signatures and call shape than when it says "version B felt better".

The **answer** is the only thing worth keeping. Capture it somewhere durable (commit message, ADR in `docs/adr/`, a tracked issue) along with the question it was answering and which variant won — if the user is around, that's a quick conversation; if not, leave `NOTES.md` in `/private/tmp/claude/<repo-slug>/spikes/<slug>/` with the verdict blank. Then delete the whole topic directory.

## Keeping one

Ephemeral by default — `/private/tmp/claude/<repo-slug>/spikes/` is age-pruned. If the user asks to keep it,
move it to `<repo-root>/docs/spikes/` inside a repo, or `~/spikes/` outside one. Don't
auto-keep.

**Never invent a second word for the store.** Everything this skill writes goes in
`/private/tmp/claude/<repo-slug>/spikes/`, kept builds in `docs/spikes/`. Not `prototypes/`, not `mockups/`,
not `artifacts/`, not `folios/` — the tool is `spike`, so the directory is `spikes`,
everywhere, no exceptions. (`explain` owns the parallel pair, `/private/tmp/claude/<repo-slug>/explainers/`
and `docs/explainers/`.)

## A committed prototype is UPDATED, never duplicated

`docs/spikes/<slug>/` is not an archive of prototypes that have been built — it is the
**current** reference the surface it depicts is measured against. So when the question is
about a surface that already has a kept prototype, the default is to open that prototype and
change it. Building a second one beside it is the exception and needs a reason.

This is the standard path for an interactive UI prototype embedded in a repo, not one option
among several:

1. **Look before you build.** `ls docs/spikes/` first. A slug naming the surface you are about
   to prototype is the one to edit.
2. **Edit the build in place, then re-shoot every frame the directory owns** — not only the
   frames your change touched. A directory holding one fresh frame and five stale ones is
   worse than one holding six stale frames, because nothing on disk marks which is which.
3. **Keep the slug and the frame names.** Tickets, project `verify` skills and doc tables cite
   them by path. A new slug orphans every citation, and a renamed frame stops resolving
   without erroring.
4. **Add a frame rather than a directory** when the change introduces a state the surface did
   not have before.

Build a *new* directory only when the surface itself is new, or when the question is
explicitly "this direction versus that one" and both must stand side by side — and then the
losing direction's frames come out once the question is settled.

## Tickets from a prototype

When `backlog spec` (or any other pass) turns a prototype into issues, two steps always
happen:

1. It gets committed to `docs/spikes/<slug>/` — a directory, not a bare file — so every
   ticket can cite a path that resolves from any checkout.
2. **Screenshot every state into that same directory**, one PNG per named state:
   `empty.png`, `loading.png`, `error-rate-limited.png`, `populated.png`. The build stays
   canonical — a screenshot can't be clicked and rots faster than the thing it depicts —
   but a ticket that names a frame gives the agent a fixed target to compare against, and
   gives you something to check the result against without launching anything. Capture
   them with the `screenshot-checker` agent or the folios harness; never hand-wave a state
   you didn't render.

**Whether a third step follows depends on which kind of prototype it is, and only the user
decides that.**

### The expiring kind — file the teardown

The default. The prototype existed to get the slate written and has no job afterwards.

**File one last issue: delete it.** That issue depends on every other issue in the slate,
so it surfaces as ready only once the work it described is done. Closing it removes the
whole `docs/spikes/<slug>/` directory — build and screenshots together — and closes the
loop. Without it the reference outlives its subject and starts contradicting the shipped
code; the dependency is what makes the cleanup arrive on its own instead of needing to be
noticed. Screenshots make it more urgent, not less: a stale picture is argued with more
readily than stale markup.

**The teardown issue's dependencies make it *ready*, never *done*.** Those are different
facts and reading the first as the second deletes a live specification. A prototype is
discharged when a comparison against its frames actually passes — the four-step procedure a
project's `verify` skill owns — not when the tickets it produced are closed. An agent that
finds the teardown issue at the top of `bd ready` must run that comparison first and, if the
shipped surface still differs, leave the issue open and say which frames still do not match.
A slate can close in full against a prototype the code has never matched.

### The living kind — no teardown, ever

A prototype the user has declared the **design source of truth** for a surface: it is
maintained alongside the code, changed *first* when the design changes, and the code
follows it. Cutting tickets from it does not end it — the next slate cites the same
directory.

This is the same object § *A committed prototype is UPDATED, never duplicated* already
describes as "the **current** reference the surface it depicts is measured against". A
teardown issue would delete the thing that section tells the next pass to open and edit.

**Never file a teardown for one, and never offer to.** Its README says which kind it is —
a living prototype states it in the first lines, as `docs/spikes/agent-chat/README.md`
does with "This is the design source of truth for `apps/phone`. It is not a spike with an
expiry." Read that before writing the last ticket.

**When the README does not say, ask — one line, before publishing.** Getting it wrong in
this direction destroys a maintained artifact, and the answer costs a sentence.

**Getting comments back.** Every build carries the comment layer: the user presses the
speech-bubble button (or `a`), marks things up, and presses **Copy comments**. The
markdown starts with `<!-- folio-feedback: <slug> -->`, so you can either ask them to
paste it, or wait for it — [`CONTRACT.md`](CONTRACT.md) § Getting
comments back has the `pbpaste` watcher. Say which you are doing.

