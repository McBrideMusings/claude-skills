# Import — prototype is canonical, make the app match

The Claude Design prototype is the source of truth. Your job is to make the app look and behave **exactly** like it — layout, typography, spacing, color, alignment, and (where sensible) functionality — and to *prove* the match numerically, not by eye. Work the phases in order. Do not skip Phase 0.

## Phase 0 — Ingest and prove (the gate)

1. **Identify the input.**
   - `.zip` → unzip into `tmp/claude/design/proto/`. Look for `package.json` (a runnable app — usually Vite/React) or a root `index.html` (static).
   - **standalone HTML** → copy into `tmp/claude/design/proto/`.
   - **native Handoff output** → it's already code in the repo or a downloaded folder; treat it like the `.zip` case and point at that directory.
   - **`claude.ai/design/...` share link** → these are authenticated. Attempt `browser_navigate` in the Playwright MCP using the user's logged-in browser. If it lands on a login wall or renders an empty canvas, it **did not load**.

2. **Render it for real.**
   - Runnable app → install + start it with the project's task runner conventions (`npm install && npm run dev`, `pnpm`, `bun`, etc.), then drive it with Playwright.
   - Static HTML → open the file directly in Playwright.
   - Enumerate every screen / route / canvas state the prototype contains.

3. **Write `tmp/claude/design/INGESTION.md`** — a table: each screen → real screenshot path + content hash (or DOM node count) + viewport. 

4. **GATE.** If the table is empty, or you only have the user's verbal description, **STOP here.** Output: "I couldn't load the prototype from `<input>`. Share links are auth-gated and don't fetch — please download the `.zip` or standalone-HTML export from Claude Design's Export menu and point me at the file." Do not proceed to Phase 1. Building UI now would be inventing a prototype, which is exactly what this skill forbids.

## Phase 1 — Extract the Manifest

From the **running prototype** (never from memory), populate `tmp/claude/design/manifest.md`:

- **Design tokens** — read `getComputedStyle` across representative elements (and read source: Tailwind config, CSS custom properties, if the export is code). Capture exact values: color palette (hex/rgb), type scale (family / size / weight / line-height / letter-spacing), spacing scale (margins / paddings / gaps), border-radii, shadows, breakpoints.
- **IA / route map** — every screen, its route/state, its purpose.
- **Per-screen layout spec** — structure (header / sidebar / grid / columns), the components present, and notable spacing & alignment.
- **Functionality** — interactions, state transitions, what data is shown, what each control does.

## Phase 2 — Triage (judgment)

Classify every prototype element into `tmp/claude/design/triage.md`:

- **Implementable as-is.**
- **Questionable** — fake data implying a backend you don't have; an animation/transition that won't perform; a layout that breaks at real breakpoints; a flow with no real endpoint; something the existing app deliberately does differently.
- **Can't / shouldn't do.**

**Stop and surface the questionable + can't-do lists to the user. Get answers before writing code.** Don't fake these and don't silently drop them.

## Phase 3 — Reconcile and implement

- Map each prototype screen to the existing app's routes/components.
- Reuse the app's existing component library and design-system tokens **where they already encode the prototype's values**. Where they don't, add/adjust tokens to match the prototype exactly — the prototype wins on values, but reuse the app's structure.
- Implement screen by screen against the Manifest. Only touch UI code in scope (respect the user's "don't touch unrelated code" rule).

## Phase 4 — Verify: visual AND numeric

For each screen, do not declare it done until it has been diffed:

1. Render **both** the prototype and the app at the same viewport(s).
2. **Visual** — screenshot both, present side-by-side for the user.
3. **Numeric** — extract computed `padding`, `margin`, `gap`, `font-size`, `line-height`, `color`, `background`, `border-radius`, and key element box sizes for matching elements from both DOMs. Build a delta table.
4. **Threshold** — spacing/size within 1px, colors exact, font metrics exact. Anything outside → punch-list item → fix → re-diff. Loop until deltas are zero or the user explicitly waives one (record the waiver + reason).
5. Write the final per-screen delta table + screenshot paths to `tmp/claude/design/verification.md`.

## Done

Report: screens matched, deltas closed, items waived (with reasons), and any decisions still owed by the user (carried from Phase 2). Update `manifest.md` to reflect the now-canonical state so the next EXPORT/IMPORT run has an accurate baseline.
