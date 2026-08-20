# Alt text (image description rules)

A reference, not an engine cell. Read by `design` when writing or reviewing the alt text on an
image — in a component, a doc, a README, a slide. For *writing the line*, not for auditing a page's
accessibility (that's a11y testing, a different job). Adapted from bholmesdev/skills `alt-text`.

Alt text is read aloud in place of the image, by someone who will never see it. Every rule below
follows from that one fact.

## The rules

- **Never open with "image of", "picture of", "screenshot of", "photo of", or "diagram of".** A screen
  reader already announces that it is an image before reading the text — those words spend the
  listener's first second telling them something they were just told.
- **Describe what is visible and important, nothing else.** No intent, no mood, no backstory, no
  interpretation the pixels don't support. "Two people at a whiteboard covered in boxes and arrows" —
  not "a team collaborating on an exciting new architecture".
- **Include text that appears in the image when the text is the point.** A screenshot of an error
  dialog is useless as "a macOS dialog box"; the error message *is* the content. Quote the key words,
  not every label on screen.
- **Keep it to one line.** If it needs a paragraph, the image is carrying content that belongs in the
  page body, where everyone can read it — say so rather than writing a paragraph of alt text.
- **Return only the alt text.** No preamble, no "here's the alt text", no offered alternatives unless
  asked.

## Two cases the rules above don't cover

- **Decorative images** — a divider, a texture, a purely ornamental flourish carries no information.
  It takes empty alt (`alt=""`), not a description, so the screen reader skips it entirely.
  Describing decoration is noise, not access.
- **The image is a link or a button** — then the alt text names *where it goes or what it does*, not
  what it depicts. A logo linking home is "Home", not "company logo".
