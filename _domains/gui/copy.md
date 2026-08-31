# Interface copy — voice, tone and wording

Read by `gui` (critique/audit) and by the engines when the domain is `gui`. The words inside the
interface: labels, buttons, errors, toggles, links. Which states exist and what an error must answer
structurally is `states.md`; this cell owns how the words are written. Adapted from
`jakubkrehel/skills` `better-writing` (MIT).

**Clear and brief beats clever; consistent beats varied.** The best error message is the interaction
redesigned so the error cannot happen.

## Recon the existing voice first

Before writing or reviewing copy, read the copy nearby: the product's terminology, its conventions,
any style guide. A deliberate brand voice is not a defect — flag a departure from plain language only
when it creates inconsistency, ambiguity, translation risk, or a tone the stakes don't support. A
local edit never invents a new voice, and terms stay consistent: if it's "Archive" in the menu, it
isn't "Move to storage" in the toast.

## One voice, tone by stakes

| Context | Tone |
| --- | --- |
| Success, onboarding, empty states | Warm, can be light |
| Routine actions, settings | Neutral, minimal |
| Errors, destructive confirmations | Calm, plain, zero playfulness |
| Data loss, security | Serious, explicit |

## Address the reader directly

Instructional copy says "you", never "the user". In errors, "we" reads as deflection — "Unable to
load content", not "We're having trouble loading this content". Possessives sparingly: "Favorites"
beats "Your Favorites". One perspective per flow.

## Plain words

Words a tired reader gets on the first pass; delete every word doing no work. No idioms, no humor
that won't translate. Skip unnecessary gender ("Subscribers can post recipes", not "his or her").
Match the input device: "tap" on touch, "click" with a pointer, "select" when both are possible.
Never assemble a sentence from fragments around a variable (`"You have " + n + " new messages"`) —
word order changes per language; use a full templated string with real pluralization (also in
`states.md` § Internationalization).

## Verb-first buttons

A button label starts with a verb naming the action: "Send", "Save draft", "Delete project" — never
"OK!", "Let's go!", or bare "Yes"/"No" on a consequential action. A confirmation button repeats the
consequence so the dialog is answerable without reading the body: "Delete this project?" offers
`Delete project` and `Cancel`. (The destructive-action rule this extends lives in `states.md`.)

## One vocabulary per flow

A multi-step flow uses one set of words throughout: "Get started" to enter, "Continue" *or* "Next"
(pick one) to advance, "Done" to finish. Alternating synonyms makes users wonder whether the buttons
do different things.

## Links describe their destination

Link text must make sense out of context — screen-reader users navigate by a list of the page's
links. "Read the billing docs", never "Click here". A bare "Learn more" breaks the moment two appear
on one page; suffix each: "Learn more about exports".

## One capitalization policy

Pick title case or sentence case per element type, then apply it to every instance. Sentence case is
the safer default: calmer, no per-word rules, localizes cleanly. "Save Changes" beside "Discard
changes" reads as sloppiness. Store text in natural case and let CSS `text-transform` present it.

## Toggles label the ON state

"Send read receipts" lets users infer the off state; "Don't send read receipts" turns the toggle
into a double negative. And link straight to a referenced setting ("Notification settings"), never a
described path ("Go to Settings > Notifications > Email").

## Errors say how to fix, next to where it broke

| Bad | Good |
| --- | --- |
| That password is too short | Choose a password with at least 8 characters |
| Invalid name | Use only letters for your name |
| Oops! Something went wrong. | Unable to save. Check your connection and try again. |

No blame, no "oops", no exclamation marks. Phrase hints positively ("Use only letters", not "Don't
use numbers or symbols") and show format requirements before the mistake, not after. An error that
keeps firing is an interaction to redesign, not a message to reword. (What an error must answer —
what failed, why, how to recover — is `states.md`'s structure; this cell owns the wording.)
