# Image comp — rung 2 of the fidelity ladder

A comp is a generated picture of the screen. It answers "what does this look like" in seconds and
costs one image call per direction, so it is the default rung for a UI question. It cannot show
behaviour; when the question is a transition, a state you reach by interacting, or a real
component's behaviour, climb to [UI.md](UI.md).

## Steps

1. **Take the project's look from `dsys prompt`.** Run it in the repo; it prints the palette, type,
   radius, density, components and rules from `DESIGN.md`. Put that block first in the image prompt,
   then the brief (what the screen is, what it holds, real copy). A repo with neither a `DESIGN.md` (owned) nor a `DESIGN.local.yaml` overlay (not owned; `dsys init` writes it) has no
   look to hand over: say so, and use UI.md's restrained default.
2. **Generate into the spike directory** — `/private/tmp/claude/<repo-slug>/spikes/<slug>/`, one
   PNG per direction, named for the direction (`quiet.png`, `dense.png`). Backend choice, keys and the
   driver are in [`../generate/image.md`](../generate/image.md).
   - **A new screen:** `generate/image-api --prompt "<dsys prompt block + brief>" --aspect <ratio> --out <png>`.
   - **A change to an existing screen:** screenshot the running screen, then
     `generate/image-api --edit <screenshot.png> --prompt "<the change, and what must stay unchanged>" --out <png>`.
     The prompt is the instruction, not a description of the whole picture.
3. **Look at each PNG.** Generators re-render the whole image, so check the copy and the layout
   against the brief; a misspelled label or a dropped region is invisible until you read the image.
4. **Directions diverge on one named axis** ([CONTRACT.md](CONTRACT.md) rule 11). Several comps of the
   same idea are one comp.
5. **Show them** per [CONTRACT.md](CONTRACT.md) rule 10, then stop: the choice is the user's.

## Storing the winner

A comp is stored with `dsys refs add <bead-id> <winner.png> --meta '{"prompt": …, "backend": …, "source": …}'`,
where `source` is the screenshot an edit started from. The command prints the ref
(`design-refs:<bead-id>-<file>.png`) and needs the bead id, so it runs when the ticket exists — in
`backlog spec`, which cites the ref in the ticket's design field ([LIFECYCLE.md](LIFECYCLE.md)).
`dsys refs get <ref>` writes the PNG back to scratch for whoever builds against it.

The PNG lives in `/private/tmp`, which is emptied after three untouched days. When the winner is
picked, say its absolute path and that it expires; if no ticket has been cut by then, the comp is
regenerated from its prompt, since nothing else holds it. A repo tracked on GitHub issues has no
bead id, so its comps are not stored; `backlog spec` puts the layout and copy in the ticket text.

Losing comps are not stored. They stay in the spike directory until `/private/tmp` ages them out.
