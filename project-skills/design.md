# The `project-design` skill and `DESIGN.md`

A repo with a UI surface — rendered components, a stylesheet, a native view hierarchy, a
terminal UI, a game HUD — keeps its design in one file, `<repo>/DESIGN.md`, and the procedure
for working against it in `<repo>/.claude/skills/project-design/`. A repo with no UI surface
gets neither.

**Every design decision lives in `DESIGN.md` and nowhere else.** The skill holds no colour, no
spacing, no layout rule and no component description: it says how an agent designs here (read,
place, render, lint). A design fact found in the skill, a CLAUDE.md, a ticket or a code comment
moves into `DESIGN.md` and the other copy becomes a pointer or goes.

## `DESIGN.md`

Google's DESIGN.md format (`@google/design.md`, its README is the spec):

- **Front matter** (optional) — the tokens: `colors`, `typography`, `rounded`, `spacing`,
  `components`, with `{group.name}` references. The tokens are the normative values. A stack
  with a token mechanism (Tailwind v4 `@theme`, CSS custom properties, a SwiftUI asset catalog,
  a GPUI theme struct) carries the same values, and the Components entry or Overview names the
  file that holds them. A stack with none writes no front matter; the prose is the design.
- **Body** — `##` sections in the spec's order, each optional: Overview, Colors, Typography,
  Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts. A section the spec does not
  name is kept by its tools, so a repo-specific section (wheel's `## Chat`) is fine; put it
  after the spec section it extends.

What each part has to answer for a session building something new:

| Section | Answers |
| --- | --- |
| Overview | What the product feels like, in sentences a critique can quote |
| Colors, Typography, Shapes, Elevation & Depth | The values and the roles they play, with Named Rules (`### Named Rules`) where a value has one use |
| Layout | The structure: the regions of every screen, navigation, what is persistent and what is a mode, and **where a new element of each kind goes** |
| Components | Every reusable element: what it is, when to use it, its states, and the file that implements it. A new element reuses one of these or adds an entry |
| Do's and Don'ts | The rules a reviewer checks a diff against. A rule enforced by a lint names it: `(enforced: eslint no-raw-colors)` |

### Writing it

1. **Read the code first.** Stylesheets, theme files, the asset catalog, the component folder,
   two or three screenshots from `project-verify`'s launch. Write the values the code actually
   uses, folding near-duplicates into one token and naming each by role, not by value.
2. **Write Layout and Components from the running app**, not from the source tree: each
   region and component as a user meets it, with its implementing file.
3. **Ask the user only for the Overview** when the repo says nothing about intent, as one
   question with the sentence drafted from what the screenshots show.
4. `npx --yes @google/design.md@0.4.0 lint DESIGN.md`. Errors (a broken reference) are fixed
   now; warnings are judged — `orphaned-tokens` on a prose-heavy file is expected.

## Project-owned lint

A `DESIGN.md` rule gets a mechanical check only when it guards behaviour (a contrast floor, a
focus ring, a hit-area minimum) or has been broken in a diff more than once. Every other rule is
judged by the `review` design lens. The check is the project's own: an ESLint rule, a stylelint
rule, a clippy lint, a SwiftLint custom rule, or a short script under `project-design/tools/`
for a stack with no linter. It is written in the same change as the rule, and the rule names
it. No shared design tool sits between a project and its linter.

## The skill

```text
<repo>/.claude/skills/project-design/
├── SKILL.md
└── tools/
    ├── shots.sh      # render every state of a surface; prints one PNG path per state
    └── lint.sh       # DESIGN.md lint + every check a Do's and Don'ts rule names; exit 1 on an error
```

`shots.sh <surface> [<state>…]` reuses `project-verify`'s launch and drive scripts by path,
puts the surface into each state (empty, loading, error, filled, and the states its Components
entry lists), and writes `/private/tmp/claude/<repo-slug>/shots/<surface>-<state>.png`. With no
state named it shoots all of them.

`lint.sh` runs `npx --yes @google/design.md@0.4.0 lint --format json DESIGN.md` (fails on an
`error` finding), then each project check `DESIGN.md` names, and exits non-zero when any fails.

`SKILL.md` body, with this repo's surfaces, stack and token file filled in:

```markdown
# <Project> — design

The design is [`DESIGN.md`](../../../DESIGN.md). This skill is how to work against it; it holds
no design itself.

1. **Read `DESIGN.md` whole** before the first edit.
2. **Place the work.** A new element reuses a `## Components` entry and goes where `## Layout`
   says that kind of element goes. Nothing fits → the new component, token or layout rule is
   added to `DESIGN.md` in the same commit, tokens in the front matter and in <token file>.
3. **A new screen, a new flow or a rearranged layout** runs `redesign` on it, with
   `tools/shots.sh` screenshots of the current app as the style anchor. A comp takes its look
   from `DESIGN.md` (`~/.claude/skills/spike/COMP.md`).
4. **Build with the tokens**: <how this stack reads them — Tailwind classes from @theme,
   Color("name") from the asset catalog, theme.colors.<role>>. A raw value where a token exists
   is a defect.
5. **Render every state**: `tools/shots.sh <surface>`, then look at each PNG. A state never
   rendered is not designed.
6. **Lint**: `tools/lint.sh` exits 0.

Done means every state of every touched surface was rendered and looked at, `DESIGN.md`
describes what was built, and `tools/lint.sh` passes.
```

## Audit

- `tools/lint.sh` passes.
- `tools/shots.sh` renders every surface it names; a surface that no longer launches is drift
  in the script or a product break — find which.
- Every Components entry's implementing file still exists, and every reusable component under
  the repo's component folder has an entry. A missing entry is added from the running app.
- Token values in the front matter match the stack's token file. A mismatch is fixed in
  whichever one the code renders from, then copied to the other.
- A design fact found outside `DESIGN.md` (a skill, CLAUDE.md, a comment) moves into it.
