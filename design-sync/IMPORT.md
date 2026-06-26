# Import — prototype is canonical, make the app match

The Claude Design prototype is the source of truth. Your job is to make the app look and behave **exactly** like it — layout, typography, spacing, color, alignment, **and functionality** — and to *prove* the match numerically, not by eye. Work the phases in order. Do not skip Phase 0.

## The prototype's behavior is canonical — build it for real, ALWAYS

A Claude Design prototype is an **interactive UI prototype**. Of course its sorts, filters, buttons, tables, and flows don't actually work — they're visual stubs. **That is expected, and it is NEVER a question.** The prototype shows the intended *outcome*; importing it means implementing that outcome for real against the app's actual data, queries, and backend. The outcome is more important than whatever is implemented right now — when they conflict, the prototype wins.

**The single forbidden question.** Do not ever ask, in any phrasing, "should I wire this up for real, or ship it visual-only / leave it as a stub / defer the query work?" There is exactly one answer and you already have it: **make it work for real, now.** A stubbed chip, a fake-data table, a sort control that doesn't sort, a filter that doesn't filter, a flow whose button does nothing — every one of these is a thing to **build**, not a thing to ask about. Architect, re-architect, rebuild, refactor, gut, rewrite — do whatever the real implementation requires.

This does **not** weaken Phase 2's duty to surface genuine decisions the user owns (a real product conflict, a missing credential, a true platform limit, or a scope cut the user makes against the full inventory). Those still go to the user. "It isn't functional yet" is **not** one of them and never reaches the user as a question.

## Adjustment / re-sync — the app already implements a prior version (READ THIS — it is where the skill fails)

The common real case is **not** a fresh build. The app already implements the prototype from an earlier sync, and now the user says *"I made a series of small adjustments"* / *"I tweaked X, Y, Z, cover those and anything else"* — or you find a prior `INGESTION.md`/`manifest.md` on disk. This is a **re-sync**, and every phase below still applies **in full**. The trap here is the exact opposite of building from imagination: it is **under-scoping to "just what changed,"** and it is the single most likely way this skill silently fails.

- **The changed-surface set is found by DIFFING, never by the user's list and never by a shortcut.** The user's "I changed A, B, C" is a **FLOOR, not the scope** (non-negotiable 6). Edit timestamps, file etags, a changelog, "recently-modified" signals — every one of these is a **hint to prioritize, never the boundary.** The only authority on "did this surface change" is rendering the prototype surface next to the app surface and comparing. If you lean on any change-signal you MUST (a) process **every** item it flags — not the subset the user named — and (b) **still diff the surfaces it did not flag**, because the signal is incomplete and missing surfaces is precisely the failure.

- **"The app already had this from the last sync" is a CLAIM, not a pass.** It needs a render-diff beside it (non-negotiable 7), exactly like a fresh surface. A prior import being on disk does not let you assume any surface still matches — the prototype was edited *because something changed*, and you don't yet know what. Re-diff it.

- **Concrete gate — do this literally, and it is what stops the failure.** Take the full surface list (the Phase 0 import-graph component files + every interaction-reachable state — the whole inventory, not the recently-edited subset). For **each** surface, mark it `compared` (you put the prototype surface next to the app surface and actually looked) or `not-compared`. **A `not-compared` surface is an open difference** — you have not verified it matches, no matter how confident you are. The re-sync is not done until every surface is `compared`, and every comparison is a `verification.md` row (matched / diff-found-and-fixed / agreed-deviation). Reaching "done" with a `verification.md` that has a handful of rows when the prototype has dozens of surfaces is the tell that you laundered the user's bullet list into "the whole job."

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

   **When the fetch fails (404 / expired token / error), STOP and say so — do not go hunting.** This is the most important behavior of the gate and the one most easily violated. A dead handoff URL means the run is over until the user gives you a fresh export. You **must not** react to a failed fetch by searching the filesystem for a fallback: do not `ls`/`find`/`grep` for a previous run's `tmp/claude/design/proto/`, do not reuse an existing `INGESTION.md`/`manifest.md`/`triage.md`, do not open stale screenshots, do not unpack an old `handoff.tar.gz`. **A handoff token names one exact version of the prototype, and this skill is invoked *because the design changed* — so anything already on disk is by definition the OLD design and is forbidden as a stand-in.** Substituting it builds the app against a stale prototype while the artifacts make it look rigorous: a worse failure than building from a text description, because it hides behind real-looking files. The correct and only response is: tell the user the link is broken/expired and ask them to re-export (fresh handoff command, `.zip`, or standalone HTML). The single exception is step 1's *native Handoff* case where the **user themselves** points you at on-disk prototype code in this request — never a copy you found by looking around.

## Phase 1 — Extract the Manifest

The manifest must cover **every item in the Phase 0 master inventory** — every screen, surface, component, and interaction-reachable state, not only the ones with screenshots. If the inventory lists 11 component files and 6 modal/popover surfaces, the manifest accounts for all 17. A manifest that describes only what's visible in the export's hero screenshots has already dropped everything behind an interaction — go back to the inventory.

From the **running prototype** (never from memory), populate `tmp/claude/design/manifest.md`:

- **Design tokens** — read `getComputedStyle` across representative elements (and read source: Tailwind config, CSS custom properties, if the export is code). Capture exact values: color palette (hex/rgb), type scale (family / size / weight / line-height / letter-spacing), spacing scale (margins / paddings / gaps), border-radii, shadows, breakpoints.
- **IA / route map** — every screen, its route/state, its purpose.
- **Per-screen layout spec** — structure (header / sidebar / grid / columns), the components present, and notable spacing & alignment.
- **Functionality** — interactions, state transitions, what data is shown, what each control does.

## Phase 2 — Triage (judgment)

Classify **every item from the Phase 0 master inventory** into `tmp/claude/design/triage.md`:

- **Build it for real** — the default, and where the overwhelming majority lands. Everything the prototype merely *stubs* goes here: sorts that don't sort, filters that don't filter, fake-data tables, controls and flows whose handlers are empty. The prototype implies a backend you don't have yet → you build the backend/query/wiring. None of this is "questionable"; a non-functional prototype control is the normal case, and it is **never** surfaced as a question. Implement it against the app's real data.
- **Genuine decision the user owns** — narrow, and **not** "it isn't wired yet." Only: the behavior needs a secret / credential / external account that only the user can supply; the prototype's behavior genuinely conflicts with a deliberate product choice in the existing app (a real disagreement, not just "the app hasn't caught up yet" — the prototype wins by default, so flag only true conflicts); or a scope cut the *user* chooses against the full inventory. These go to the user.
- **Provably can't do** — a demonstrated platform/tool limit, not "this is a lot of work." Effort is never a reason to land here.

**Completeness check — do this literally, before writing any code.** Walk the Phase 0 inventory item by item; each one must land in exactly one bucket above. Triage entries ≥ inventory items. If any inventory item has no row, you have silently dropped a feature — stop and classify it. Out-of-scope is a *classification the user chooses*, never an omission you make for them; an item you think is out of scope still gets a row, marked for the user to confirm.

**Surface the full triage so nothing is silently dropped — but only the "genuine decision the user owns" and "provably can't do" rows are questions that block.** If those two buckets are empty (the common case — everything is build-for-real), there is nothing to ask: proceed and build. Never manufacture a blocking question out of a build-for-real item, and never hold the whole pass hostage to a stub's "should I make this functional?" — that question does not exist here. Don't fake anything and don't silently drop anything.

- **Do not present a pre-narrowed scope menu.** If you ask the user to cut scope (AskUserQuestion or prose), show the **complete** inventory-backed triage and let them remove items. A question like "how much of the toolbar+dock work should I do?" — asked when the inventory also contains bookmarks, settings, SFTP, terminal, etc. — launders your under-scoping into their approval. Frame it as "here is everything in the prototype; what's in scope for this pass?" against the whole list.
- Record each decision the user signs off on (drop / reshape / substitute / defer) as an **agreed deviation or deferral** — this set, plus any Phase 4 waivers, becomes the reconcile report. Every deferred item stays tracked; it does not vanish.

The target is an exact match for everything in scope: anything the user did *not* agree to diverge on or defer is a bug to close, not a deviation to log.

## Phase 3 — Reconcile and implement

- Map each prototype screen to the existing app's routes/components.
- Reuse the app's existing component library and design-system tokens **where they already encode the prototype's values**. Where they don't, add/adjust tokens to match the prototype exactly — the prototype wins on values, but reuse the app's structure.
- Implement **every surface in the inventory** against the Manifest, not just the ones the user's bullets named (those are a floor, not the scope — non-negotiable 6). The whole prototype is the scope.
- **"Don't touch unrelated code" ≠ "skip prototype surfaces you didn't pick."** In a design-sync the prototype *defines* what is related: any surface the prototype shows is in scope. The rule forbids refactoring things the prototype is silent on — it does **not** license deferring an Inspector, a modal, or a rail just because it wasn't in your headline list. Do not use it to launder under-scoping.
- **Prototype beats project conventions on rendered output** (non-negotiable 8). If a CLAUDE.md rule or house style says one thing and the prototype renders another, match the prototype and flag the convention as a deviation for the user — never silently apply the convention over the design.
- **Removing a superseded element is part of the change** (non-negotiable 9). When you add a control the prototype uses in place of an old one, delete the old one in the same pass; don't leave both. Likewise drop app-only surfaces the updated prototype removed (an extra column, a modal, a chip) — confirm with the user, then remove.

## Phase 4 — Verify: the diff gate (HARD — symmetric to Phase 0)

This is a **gate, not a step.** Phase 0 won't let you build without proving the *prototype* loaded; Phase 4 won't let you finish without proving the *app matches it*. `tsc`, unit tests, and a clean build are **not** verification — they cannot see a wrong icon, an oversized pill, an extra chip, a stuck drag, or a misplaced section, which is exactly the bug class this skill exists to close. "It compiles" is never a verification row.

**You must walk the Phase 0 master inventory item by item.** Every surface gets a row in `tmp/claude/design/verification.md`; a surface with no row means the sync is unfinished — go back. For each:

1. Render **both** the prototype and the app at the same viewport(s) — including interaction-reached states (paused, hover, each mode of a toggle, each modal/popover, the drag *in progress and released*).
2. **Visual** — capture both, present side-by-side for the user.
3. **Numeric** — extract computed `padding`, `margin`, `gap`, `font-size`, `line-height`, `color`, `background`, `border-radius`, and key element box sizes for matching elements from both DOMs. Build a delta table.
4. **Behavior** — exercise every interactive thing you built or changed: cycle the toggle through all states, start AND release the drag, open AND dismiss the modal, confirm a superseded control was removed (Phase 3 / non-negotiable 9). A control that compiles but traps the user is a fail.
5. **Threshold** — spacing/size within 1px, colors exact, font metrics exact, behavior matches. Anything outside → punch-list item → fix → re-diff. Loop until deltas are zero or the **user** explicitly waives one (record the waiver + reason).
6. Write the per-surface verdict table + capture paths to `tmp/claude/design/verification.md`.

**If you cannot render the app at all, STOP and report it as a BLOCK** — exactly like a failed prototype fetch in Phase 0. Do not substitute "verified via build/tests." Surface that the diff couldn't run and why.

**When the project forbids you from viewing the running app** (check CLAUDE.md + memories — some repos bar the agent from opening/screenshotting the deployed app): you do not get to skip the gate. Reroute it — (a) produce the **numeric** proof yourself (computed-style / DOM extraction that returns values, never a screenshot), and (b) hand the **user** an explicit per-surface visual checklist and get their confirmation surface-by-surface before any item is marked matched. The visual pass moves to the user; the obligation to verify every surface does not move.

## Phase 5 — Reconcile report (back-sync)

Write `tmp/claude/design/reconcile.md` — the back-sync delta — following [RECONCILE.md](RECONCILE.md). Direction is IMPORT, so the reconcile target is the **prototype**.

- Body = the agreed deviations from Phase 2 plus any Phase 4 waivers, each with prototype value → what we implemented → why agreed → how the prototype should change.
- "Open (unresolved) differences" must read **none**. If a real delta is neither closed nor agreed, the sync isn't done — go back.
- Include the standalone paste-back block the user copies into the Claude Design chat to update the prototype.

## Done

**Reconcile the claim against the Phase 0 inventory before you write a word of summary.** Every inventory item must be in one of three terminal states: implemented-**and-diff-gated** (verified per Phase 4, not merely compiled), agreed deviation, or user-signed-off deferral. "Implemented" without a Phase 4 verification row is NOT a terminal state — it is an open difference. Any item with no disposition is an open difference — the sync is not done; go back. Report coverage honestly as "N of M inventory surfaces diff-gated" — **M is the count of _every_ prototype surface (the full Phase 0 import-graph inventory), never the subset the user named, never the recently-edited file set, never the surfaces you chose to touch.** Redefining M down to your slice so "N of M" reads complete is the scope-laundering failure in its purest form. Never write "matched / synced / done" off the back of a clean build (non-negotiable 7). Scoping down is the user's call against the full list; *describing a subset as the whole*, or a compile as a match, is the failure.

In chat: surfaces matched, deltas closed, items deferred/waived (with reasons), and any decisions still owed by the user (carried from Phase 2). Point the user at `tmp/claude/design/reconcile.md` and say its paste-back block is ready to drop into Claude Design — do not paste it anywhere yourself. Update `manifest.md` to reflect the now-canonical state so the next EXPORT/IMPORT run has an accurate baseline.
