# `specimens/` — one fragment per kind, exercising every class in the store

The stylesheets are shared by five kinds and four widgets, so a value changed in
`kinds/_base.css` moves all of them at once. These fragments exist so that change can be
**looked at** rather than reasoned about: together they use every class `CONTRACT.md`
documents, both pickers, all five device frames, two rounds, three variants and two state
axes.

```bash
bash ~/.claude/skills/_folios/specimens/build.sh
```

Then run the critique pass from [`../CRITIQUE.md`](../CRITIQUE.md) over the result — press
`c` in both themes on each, and `C` on the prototype for the rail's own chrome.

## Why they are here

The store went a long time with no specimen, and it showed. When they were first built the
sweep found, in one pass: `--c-muted` at 3.2:1 and `--c-accent` at 2.96:1 in light mode
(so every link failed AA), three of the five semantic hues failing on their own callout
grounds, legend swatches that had never been given a colour, a prototype stage whose
background stopped partway down the window, a wireframe placeholder that broke its own
caption onto three lines, and a rail whose labels sat at 2.0–3.9:1. None of that is
visible in a diff; all of it is obvious in a screenshot.

## Keep them honest

- **Real content only.** Every specimen is about the folio store itself, so the copy is
  true and reads like something a person would write. No lorem, no `foo`.
- **Add a class, add it here.** A class that ships without appearing in a specimen is a
  class nobody will look at again.
- **The built HTML is not tracked.** `build.sh` writes to `/private/tmp/claude/<repo-slug>/specimens/`, which is
  gitignored and age-pruned. The fragments are the folio.
