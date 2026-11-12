# Verification

**The repo's `project-verify` skill owns what verification means; do not re-derive its
method.** Driving a surface is never generic — a TUI needs a headless frame dump, an iOS app a
simulator, a Worker a request against a dev server — so the recipe lives per repo, in
`<repo>/.claude/skills/project-verify/`, and this session calls `Skill(project-verify)` and
follows it.

**Why it has its own name.** The bundled `verify` skill is `disable-model-invocation`, so no
agent can load it: `Skill(verify)` returns `Skill verify cannot be used with Skill tool ... Ask
the user to run /verify themselves`. Do not hand-roll the check, do not substitute a test run,
and do not log a papercut about the bundled skill being unreachable — that is the tool working
as designed.

- If `<repo>/.claude/skills/project-verify/SKILL.md` exists, that is the recipe running. Trust
  it over anything generic.
- If not, write it per `project-skills` — from this repo's `README.md`, `CLAUDE.md` and
  `admin.toml`, naming *this* repo's real surface and commands. A recipe that would read the
  same in any repo is the weak check to avoid, not a bootstrap.
- **Never name it `verify`.** That collides with the bundled skill.
- **Tracked or not follows the repo** (`project-skills` §Create): committed where
  `.claude/skills/` is tracked, listed in `<repo>/.git/info/exclude` where `.claude/` is not —
  never `.gitignore`.

**A surface the item names, and that is not listening, is `BLOCKED`, not `SKIP`.** Before
loading `project-verify`, check every `host:port` and `http(s)://` URL named in the
item body, its acceptance criteria, and that skill. A closed one halts immediately rather than
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

## Design checks

A repo with a UI surface keeps its design in `<repo>/DESIGN.md` and the procedure in its
`project-design` skill ([`../project-skills/design.md`](../project-skills/design.md)).

- **Plan** (step 1): a pass that touches anything a user sees calls `Skill(project-design)` and
  names, in the plan, the `## Components` entries it reuses and the `## Layout` rule that places
  each new element. An element no entry covers is a `DESIGN.md` addition in the same commit.
- **Build green** (step 3): `project-design/tools/lint.sh`. A failure the diff added fails the
  step; one already failing on the base is listed as a follow-up, never fixed by editing an
  unrelated surface. Run it on the base first only when it fails on the diff.
- **Verify** (step 4): `project-design/tools/shots.sh <surface>` for each touched surface, and
  every PNG it prints is looked at. A state never rendered is an unverified case.
- **No `project-design` skill and no `DESIGN.md`**: none of this runs; a pass that builds a new
  UI surface there runs `redesign` step 4's roll first (`SKILL.md` step 1).

A `lint.sh` failure is a `FAIL`, not a `BLOCKED`: the diff violates the design.

---

**At least one recheck asserts a value, not an absence.** A grep expecting no output proves a
token is gone; it says nothing about whether what replaced it is right, so a diff that
recomputes a number wrongly passes every such check. When the diff changes a computed value —
a formula, a unit conversion, a figure in prose, a count of call sites — at least one recheck
compares the output against the specific expected number from the item's worked example
([`HANDOFF.md`](HANDOFF.md) §1's plan test): run the formula on a known input and match the result, or count
the call sites and match the count. Redo the arithmetic the old line encoded before trusting
the new one. Absence checks may accompany it, never replace it.

**A pass that touched tests first checks each one it adds or changes against the four
conditions below.** The four conditions: it catches a failure nothing cheaper (typechecker, linter, a five-minute manual run) catches; that failure is expensive (lost or corrupted data, an auth or privacy hole, contract drift between processes, a race or retry bug); it asserts behavior at a stable boundary (public interface, wire contract, persisted format), never internal calls or DOM structure; and no other kept test covers it. A test that fails any
condition is deleted before the commit; the surface check in step 4 is the evidence for that
behavior instead. Record each deleted test and the condition it failed in the gate's
verification notes. When the item's own acceptance check requires a committed test that fails
a condition, the item contradicts these conditions: halt and name the test and the condition.
*Knowledge base: search it for "keeping and writing tests". If you have none, skip this line and don't mention it.*

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
