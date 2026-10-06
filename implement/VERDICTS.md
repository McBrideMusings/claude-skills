# Verification

**The project's own `verify-project` skill owns what verification means; do not re-derive its
method.** Driving a surface is never generic — a TUI needs a headless frame dump, an iOS app a
simulator, a Worker a request against a dev server — so the recipe lives per repo, in
`<repo>/.claude/skills/verify-project/SKILL.md`, and this session reads it as a file and
follows it.

**Where the recipe comes from, and why it's read as a file rather than invoked as a skill.**
The bundled `verify` skill is `disable-model-invocation`, so no agent can load it:
`Skill(verify)` returns `Skill verify cannot be used with Skill tool ... Ask the user to run
/verify themselves`. So this session reads `verify-project/SKILL.md` as a file and follows it,
and writes one when the repo has none. Do not hand-roll the check, do not substitute a test
run, and do not log a papercut about the bundled skill being unreachable — that is the tool
working as designed.

- If `<repo>/.claude/skills/verify-project/SKILL.md` exists, that is the recipe running. Trust
  it over anything generic.
- If not, write it — from this repo's `README.md`, `CLAUDE.md` and `admin.toml`, naming *this*
  repo's real surface and commands. A recipe that would read the same in any repo is the weak
  check to avoid, not a bootstrap.
- **Never name it `verify`.** That collides with the bundled skill, which is why the project
  skill has its own name.
- **Keep it out of git.** Add `.claude/skills/verify-project` to `<repo>/.git/info/exclude` —
  never `.gitignore`, which is committed. If you find it tracked, untrack it.

**A surface the item names, and that is not listening, is `BLOCKED`, not `SKIP`.** Before
reading `verify-project/SKILL.md`, check every `host:port` and `http(s)://` URL named in the
item body, its acceptance criteria, and that file. A closed one halts immediately rather than
being discovered partway through. `SKIP` reads like a soft pass and nothing forces the
environment up before the next attempt, so it is the wrong verdict here. `SKIP` remains only
for behaviour that cannot be observed for some other reason — no fixture data, no device —
with every named surface already reachable. `FAIL` is still behaviour observed to be wrong.

**Data that contradicts the item's own model is `BLOCKED`, never `FAIL`.** A `FAIL` says the
code is wrong and invites a fix that changes it; when the fixture is what is wrong, that fix
edits working code to satisfy a row that should not exist. Ask once, before returning `FAIL`
on a criterion you could not satisfy, whether the *data* is what is out of line — a seed row
outside the numbering the item defines, a fixture predating the schema, a database filled from
the constant this item is changing. If it is, name the row and the rule it violates and stop.

## Design-system checks

A repo governed by `dsys` has a `DESIGN.md` (owned) or a `DESIGN.local.yaml` overlay
(non-owned). Run `dsys status` first; its `mode`, `DESIGN.md`, `export` and `lint wired` lines
say which of the checks below exist:

- **Owned repo** (`mode: owned`, `DESIGN.md` present): build-green runs `dsys check --json`
  and the repo's ESLint with the `eslint.dsys.config.mjs` fragment (`dsys status` reads
  `lint wired: yes`). At step 1, before the first edit, save `dsys check --json` to
  `/private/tmp/claude/<repo-slug>/dsys-baseline-<id>.json` (its exit code does not matter; the
  array is on stdout). At build-green, a record the diff added fails the step; a record already
  in that baseline does not. Match records on `kind`, `file` and `message` with every digit
  run removed: `line` moves with edits, and a `theme-unused` message carries a token count
  that changes when the diff adds a token to that group. A `design.md` lint error stops
  `dsys check` before its other scans, so a baseline holding one is incomplete: when the diff
  clears that error, records of kinds the baseline could not report do not fail the step; list
  them as follow-ups. A repo
  `bootstrap` just gave a `DESIGN.md` starts with `theme-unused` records for every group the
  code has not moved onto tokens yet, and those are filed work, not this pass's failure. An
  ESLint error fails the step; violations recorded by `npx eslint --suppress-all` do not
  report. `dsys check` covers a design.md
  lint error, a stale export, a missing implementations entry and colour-token checks; the
  raw hex class `bg-[#ff0000]` passed it in a fixture run, while the fragment's `shadcn/no-arbitrary-values` rule
  reported it. Fix the code, or add the missing token or component to
  `DESIGN.md` in the same commit and run `dsys export` so the generated `@theme` file matches.
- **Non-owned repo** (`mode: non-owned`): `DESIGN.local.yaml` is an overlay, `DESIGN.md` is
  not edited, and `dsys check` and `dsys export` are skipped unless `dsys status` says they are
  available. `lint wired: no` means the ESLint fragment is not installed; report that, never
  install it.
- **No `DESIGN.md`** (`DESIGN.md: absent`): none of this runs.

A `dsys check` or ESLint-fragment failure is a `FAIL`, not a `BLOCKED`: the diff violates the contract.

---

**At least one recheck asserts a value, not an absence.** A grep expecting no output proves a
token is gone; it says nothing about whether what replaced it is right, so a diff that
recomputes a number wrongly passes every such check. When the diff changes a computed value —
a formula, a unit conversion, a figure in prose, a count of call sites — at least one recheck
compares the output against the specific expected number from the item's worked example
([`HANDOFF.md`](HANDOFF.md) §1's plan test): run the formula on a known input and match the result, or count
the call sites and match the count. Redo the arithmetic the old line encoded before trusting
the new one. Absence checks may accompany it, never replace it.

**A pass that touched tests must prove the tests discriminate.** A test is evidence only if it
fails without the change. Capture the production half of the diff as a patch, reverse it, run
only the new tests, restore, and record `mutation.discriminates`, which has three states.
`true` is evidence — the retained tests failed without the change. `false` means a test was
added and does not discriminate — fix it before treating the work as done. `null` means the
change was removal-only (deleted production code, or comment/documentation-only edits): there
was no behaviour to reverse, so reversing it just restores the deleted code and the retained
tests pass exactly as before — that is not a weak test, it is nothing to discriminate.

A `null` still needs attention when the change now claims another mechanism is load-bearing and
nothing exercises that mechanism — name the gap and close it, rather than treating a
self-consistent explanation of why reverting a deletion changes nothing as evidence the gap is
closed.

A test that rebuilds the production logic inside its own body and asserts against that copy
passes with the fix reverted. It is not evidence of anything.

A `blocking` or `major` review finding is fixed in the same pass, before it commits — one
review cycle, not two. A finding that survives that cycle is a follow-up, named as such, rather
than looping until the reviewer runs out of objections.
