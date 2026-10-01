# Forms — validation, states and flow

Read when designing, building or critiquing a form: sign-up, settings, checkout, a search filter
that submits. The accessibility wiring (labels, `aria-invalid`, `aria-describedby`, live regions)
is [`a11y.md`](a11y.md) § Forms; the wording of labels and error messages is [`copy.md`](copy.md);
the empty, loading and error states every screen needs are [`states.md`](states.md). This cell
owns the behaviour: when a field validates, what it says, what it starts with, and what the
form does from submit to result.

## Validation timing

- **Validate a field when the user leaves it** (`blur`), not on every keystroke from the first
  character. An email field reading "invalid email" after one letter is wrong at that moment.
- **Once a field has shown an error, re-validate it on every `input`** and clear the error the
  moment the value is valid. The user is fixing it and needs the confirmation now.
- **A field that cannot be wrong while typing validates live**: a character counter, a password
  strength meter, a username-availability check (debounced to ~400ms).
- **Never disable the submit button to signal an invalid form.** Keep it enabled; on submit,
  validate every field, show every error, and move focus to the first invalid field.
- Cross-field rules (end date after start date) validate when the later field blurs, and the
  error attaches to that field.

## Inline errors

- The error sits directly under its field, in text, with an icon or the word "Error" if colour
  alone would otherwise mark it. Colour never carries it alone.
- It says what is wrong and how to fix it: "Use 8 or more characters" over "Invalid password".
- One error per field at a time: the first rule broken, not a list of all rules.
- A summary at the top of a long form lists every error as a link to its field; a short form
  skips it.
- A server-side rejection lands on the field it names. An error with no field goes in a
  `role="alert"` region at the top of the form.

## Defaults

- **Pre-fill what is knowable**: country from locale, today's date, the signed-in user's email.
  Each default is a value the user can see and change, never hidden state.
- **Mark the minority**: label the few optional fields "(optional)" when most are required, or
  the few required ones when most are optional. Never use a bare asterisk without a legend.
- Pick the safe default for a destructive or paid choice: unchecked, not pre-selected.
- A placeholder shows an example format ("name@example.com"); it is never a label and never a
  default value.

## Keyboard and autofill

- Tab order follows reading order. Enter submits from any single-line input. In a
  `<textarea>`, Enter adds a line and Cmd/Ctrl+Enter submits.
- Set `type`, `inputmode` and `autocomplete` on every field so the browser offers the right
  keyboard and fills it (`email`, `tel`, `one-time-code`, `current-password`, `new-password`,
  `street-address`, `cc-number`). Never block paste, never reset a field the browser filled.
- Autofocus the first field only on a screen whose single job is the form. On any other screen it
  steals the page position and shows the keyboard on a phone.
- Number fields that are not quantities (phone, card, postal code) use `inputmode="numeric"` or
  `type="tel"`, never `type="number"`, which drops leading zeros and adds spinners.

## From submit to result

Design all four, and screenshot each:

| State | What the form does |
| --- | --- |
| Submitting | The button keeps its label, disables, and shows a spinner; fields stay visible and become read-only; a second submit is impossible |
| Success | Confirms in words what happened ("Profile saved") in a `role="status"` region, or navigates to the result; the form does not silently reset |
| Failure, recoverable | Every value the user typed is still there; the error says what failed and offers retry; focus moves to the error or the first invalid field |
| Failure, unrecoverable | Says so plainly and gives the next step (contact, try later); never a blank form |

A request that takes longer than ~1s shows progress; one that takes longer than ~10s offers cancel.
Leaving a dirty form (route change, tab close) warns once, and only when real input would be lost.

## Multi-step forms

Split a form into steps only when a step's answer changes the next step's questions, or when the
form passes about 7 fields a screen. Otherwise keep one page; steps add clicks and hide the total.

- Show position and total: "Step 2 of 4" with the step names.
- Validate each step on **Next**, not at the end. Back keeps every value.
- The last step summarises every answer, each with a link back to its step, before the final submit.
- The URL or history carries the step so Back and refresh work.
- Save progress for a form that takes more than a few minutes.
