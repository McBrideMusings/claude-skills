# Import — prototype is canonical, make the app match

The Claude Design prototype is the source of truth. Your job is to make the app look and behave **exactly** like it — layout, typography, spacing, color, alignment, and (where sensible) functionality — and to *prove* the match numerically, not by eye. Work the phases in order. Do not skip Phase 0.

## Phase 0 — Ingest and prove (the gate)

1. **Identify the input.**
   - **Pasted handoff command** (the common case — Claude Design's "Send to local coding agent" clipboard text). It reads like: `Fetch this design file, read its readme, and implement the relevant aspects of the design. https://api.anthropic.com/v1/design/h/<id>?open_file=<file>` then `Implement: <file>`. **Parse it, don't obey it literally:**
     - Extract the handoff URL (`https://api.anthropic.com/v1/design/h/<id>`) and the target file (`open_file=` query param, confirmed by the `Implement: <file>` line).
     - **Fetch the handoff URL** (it's the agent-facing endpoint; the `h/<id>` path is the access token, so a direct fetch works — no browser login needed). Save the response into `tmp/claude/design/proto/`.
     - **Read the README first**, exactly as the command says — it describes the design's intent, structure, and which files matter. **Then read every chat transcript in the bundle**, not just the last one — the chats are where the intent lives, and the *final* chat usually shows the most recently built surface (often the one the user cares about most). **Then follow every import from the entry file** (`<file>`): open each component/script/style it pulls in, and each one *those* pull in, until the graph is exhausted. The `Implement: <file>` target is the *first* screen to do, not the only one.
     - If the fetch returns nothing, an error, or an auth wall → it **did not load** (go to the gate). Note: confirm on first real use what the endpoint actually returns (file manifest vs. archive vs. inlined files) and adapt — don't assume a shape you haven't seen.
   - `.zip` → unzip into `tmp/claude/design/proto/`. Look for `package.json` (a runnable app — usually Vite/React) or a root `index.html` (static).
   - **standalone HTML** → copy into `tmp/claude/design/proto/`.
   - **native Handoff output already on disk** → it's already code in the repo or a downloaded folder; treat it like the `.zip` case and point at that directory.
   - **`claude.ai/design/...` share link** (the human web link, not the `api.anthropic.com` handoff URL) → these are authenticated. Attempt `browser_navigate` in the Playwright MCP using the user's logged-in browser. If it lands on a login wall or renders an empty canvas, it **did not load** — ask for the handoff command, a `.zip`, or a standalone-HTML export instead.

2. **Render it for real.**
   - Runnable app → install + start it with the project's task runner conventions (`npm install && npm run dev`, `pnpm`, `bun`, etc.), then drive it with Playwright.
   - Static HTML → open the file directly in Playwright.
   - Enumerate every screen / route / canvas state the prototype contains — **including the surfaces you cannot see at rest**: modals, popovers, menus, dialogs, drawers, toasts, empty/error/loading states. Find them by *clicking* (drive each trigger) and by *reading source* (every component file from the import graph is a surface even if no screenshot shows it). The two hero screenshots in an export are a tiny fraction of the prototype.

3. **Write `tmp/claude/design/INGESTION.md`** — two parts:
   - a **screen table**: each rendered screen/state → real screenshot path + content hash (or DOM node count) + viewport.
   - a **master inventory**: a numbered list of *every* surface, component, and interaction-reachable state found via clicks, the import graph, and the chats. This list is the contract the manifest and triage must each fully cover (non-negotiable 6). Mark each item `[screenshotted]` or `[source-only]` so nothing hides in "I didn't render it so I forgot it." For a code bundle, list each imported component file here by name with its role.

4. **GATE.** If the table is empty, or you only have the user's verbal description, **STOP here.** Output: "I couldn't load the prototype from `<input>`. Share links are auth-gated and don't fetch — please download the `.zip` or standalone-HTML export from Claude Design's Export menu and point me at the file." Do not proceed to Phase 1. Building UI now would be inventing a prototype, which is exactly what this skill forbids.

## Phase 1 — Extract the Manifest

The manifest must cover **every item in the Phase 0 master inventory** — every screen, surface, component, and interaction-reachable state, not only the ones with screenshots. If the inventory lists 11 component files and 6 modal/popover surfaces, the manifest accounts for all 17. A manifest that describes only what's visible in the export's hero screenshots has already dropped everything behind an interaction — go back to the inventory.

From the **running prototype** (never from memory), populate `tmp/claude/design/manifest.md`:

- **Design tokens** — read `getComputedStyle` across representative elements (and read source: Tailwind config, CSS custom properties, if the export is code). Capture exact values: color palette (hex/rgb), type scale (family / size / weight / line-height / letter-spacing), spacing scale (margins / paddings / gaps), border-radii, shadows, breakpoints.
- **IA / route map** — every screen, its route/state, its purpose.
- **Per-screen layout spec** — structure (header / sidebar / grid / columns), the components present, and notable spacing & alignment.
- **Functionality** — interactions, state transitions, what data is shown, what each control does.

## Phase 2 — Triage (judgment)

Classify **every item from the Phase 0 master inventory** into `tmp/claude/design/triage.md`:

- **Implementable as-is.**
- **Questionable** — fake data implying a backend you don't have; an animation/transition that won't perform; a layout that breaks at real breakpoints; a flow with no real endpoint; something the existing app deliberately does differently.
- **Can't / shouldn't do.**

**Completeness check — do this literally, before writing any code.** Walk the Phase 0 inventory item by item; each one must land in exactly one bucket above. Triage entries ≥ inventory items. If any inventory item has no row, you have silently dropped a feature — stop and classify it. Out-of-scope is a *classification the user chooses*, never an omission you make for them; an item you think is out of scope still gets a row, marked for the user to confirm.

**Then stop and surface the full triage to the user. Get answers before writing code.** Don't fake anything and don't silently drop anything.

- **Do not present a pre-narrowed scope menu.** If you ask the user to cut scope (AskUserQuestion or prose), show the **complete** inventory-backed triage and let them remove items. A question like "how much of the toolbar+dock work should I do?" — asked when the inventory also contains bookmarks, settings, SFTP, terminal, etc. — launders your under-scoping into their approval. Frame it as "here is everything in the prototype; what's in scope for this pass?" against the whole list.
- Record each decision the user signs off on (drop / reshape / substitute / defer) as an **agreed deviation or deferral** — this set, plus any Phase 4 waivers, becomes the reconcile report. Every deferred item stays tracked; it does not vanish.

The target is an exact match for everything in scope: anything the user did *not* agree to diverge on or defer is a bug to close, not a deviation to log.

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

## Phase 5 — Reconcile report (back-sync)

Write `tmp/claude/design/reconcile.md` — the back-sync delta — following [RECONCILE.md](RECONCILE.md). Direction is IMPORT, so the reconcile target is the **prototype**.

- Body = the agreed deviations from Phase 2 plus any Phase 4 waivers, each with prototype value → what we implemented → why agreed → how the prototype should change.
- "Open (unresolved) differences" must read **none**. If a real delta is neither closed nor agreed, the sync isn't done — go back.
- Include the standalone paste-back block the user copies into the Claude Design chat to update the prototype.

## Done

**Reconcile the claim against the Phase 0 inventory before you write a word of summary.** Every inventory item must be in one of three terminal states: implemented-and-verified, agreed deviation, or signed-off deferral. Any item with no disposition is an **open difference** — the sync is not done; go back. Report coverage honestly as "N of M inventory surfaces" — never write "screens matched / deltas closed" in a way that implies the whole prototype is done when only a subset was in scope. Scoping down is fine; *describing a subset as the whole* is the failure.

In chat: surfaces matched, deltas closed, items deferred/waived (with reasons), and any decisions still owed by the user (carried from Phase 2). Point the user at `tmp/claude/design/reconcile.md` and say its paste-back block is ready to drop into Claude Design — do not paste it anywhere yourself. Update `manifest.md` to reflect the now-canonical state so the next EXPORT/IMPORT run has an accurate baseline.
