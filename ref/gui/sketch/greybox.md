# Escalating a sketch to a rendered greybox

Part of [`sketch.md`](../sketch.md) — an ASCII layout in chat comes first.

ASCII is the default because it's instant and disposable. It runs out when the answer depends on
**proportion** — how wide the sidebar actually is next to the content, how a card grid wraps at a real
width, how far down the page the third region sits, whether a column of numbers fits. Monospace cells
can't show any of that honestly, so a yes/no given against ASCII would be answering a different
question.

When that's where you are, the question has outgrown ASCII. `spike` owns every fidelity above ASCII — `wireframe` (greybox, colour withheld), then the image comp,
the HTML `mockup` (the project's real CSS, variants × states, screenshotted) and the `prototype` (working variants behind a Tweaks panel). Escalating is a routing step, not a
different build: read [`spike/SKILL.md`](../../../spike/SKILL.md), then build the greybox:

```bash
"$HOME/.claude/skills/spike/tool/spike" build \
  --kind wireframe \
  --title "<what's being laid out>" \
  --fragment /private/tmp/claude/<repo-slug>/spikes/<slug>.body.html \
  --out /private/tmp/claude/<repo-slug>/spikes/<slug>.html
```

Stop at `wireframe`. Going straight to a comp or `prototype` because it looks better is how a
layout question turns into a style conversation — that jump is a decision the user makes,
not one that happens because the tool offered it.

Class vocabulary — `.wf-region`, `.wf-label`, `.wf-ph`, `.wf-text`, `.wf-control`, `.wf-note`,
`.wf-grid` — is in [`spike/CONTRACT.md`](../../../spike/CONTRACT.md).

**It stays a sketch.** The `wireframe` kind withholds colour deliberately: no brand palette, no
imagery, no type personality. The moment a wireframe looks designed, the feedback you get is about the
style instead of the arrangement, and you've spent a prototype's effort to get a sketch's answer wrong.
Everything in "stay on layout" in [`../sketch.md`](../sketch.md) still applies.

**Screenshot it and look at it** before handing it over, then print the path. Same absolute-path rule
as the canvas stub in [`canvas.md`](canvas.md).

The `.monojson` stub follows its opt-in rule in [`canvas.md`](canvas.md) — write it only if the user asks for a canvas, not by default.
