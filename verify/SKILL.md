---
name: verify
description: Verify that a code change actually does what it's supposed to by exercising it end-to-end and observing behavior — drive the affected flow, not just tests or typecheck. Run before committing nontrivial changes; bootstraps this repo's project verify skill if none exists yet. Don't invoke it on a diff that only touches tests, docs, or other code with no runtime surface to drive (a change to product source always has one) — there's nothing to observe.
---

# Verify

## ⛔ Never drive a GUI by taking over the machine

**No `cliclick`. No `CGEventPost`. No `osascript` keystrokes or `System Events` clicks. No activating an app to the front. No synthetic drags. No moving windows. Not on macOS, not to verify, not "just for a second", not with a screenshot to show for it.**

The Mac this runs on is in use while the work happens. Every synthetic click lands wherever the pointer actually is, and pulling a window forward takes the keyboard away from whatever is being typed into. The cost lands on a person, not on a test run. **This section overrides the `GUI | pixels | drive it under xvfb/Playwright, screenshot` row in the surface table below.**

**A GUI's surface is its programmatic control interface, not its pixels.** The app's scripting dictionary (Apple Events), a debug-only HTTP or IPC control channel, an MCP server, a launch argument that runs the flow headlessly and prints what happened, a CLI subcommand, a state-dump endpoint. Ask the running app what it is showing and tell it what to do, in text.

**If a feature has no such surface, the missing surface is the work.** Build it, then verify through it. File it as a ticket if it is out of scope for this change. Do not reach for the mouse, and do not quietly substitute "the test suite passed" — that is the one thing this skill says is never verification.

**If something genuinely needs a human at the controls, hand it over.** Exact steps, one per line, and what a pass looks like. Then stop. That is a complete outcome, not a failure — report `SKIP` for the part you could not observe, with the reason.

A simulator is its own window server and steals nothing, so simulator driving stays allowed — but prefer a programmatic surface there too, because a driven-UI screenshot has repeatedly produced confident wrong answers. See `~/.claude/docs/driving-apple-uis.md`.

---

**Verification is runtime observation.** You build the app, run it, drive it to where the changed code executes, and capture what you see. That capture is your evidence. Nothing else is.

**Don't run tests. Don't typecheck.** Running them here proves you can run CI — not that the change works. Not as a warm-up, not "just to be sure," not as a regression sweep after. The time goes to running the app instead.

**Don't import-and-call.** `import { foo } from './src/...'` then `console.log(foo(x))` is a unit test you wrote. The function did what the function does — you knew that from reading it. The app never ran. Whatever calls `foo` in the real codebase ends at a CLI, a socket, or a window. Go there.

## Find the change

The scope is what you're verifying — usually a diff, sometimes just "does X work." In a git repo, establish the full range (a branch may be many commits, or the change may still be uncommitted):

```bash
git log --oneline origin/main..            # count commits
git diff origin/main.. --stat              # full range, not HEAD~1
git diff origin/HEAD... --stat             # no upstream: committed vs base
git diff HEAD --stat                       # uncommitted: working tree vs HEAD
gh pr diff                                 # if in a PR context
```

State the commit count. Large diff truncating? Redirect to a file then Read it. Repo but no diff from any of these → say so, stop.

**No repo → the scope is whatever the user named; ask if they didn't.**

**The diff is ground truth. Any description is a claim about it.** Read both. If they disagree, that's a finding.

## Surface

The surface is where a user — human or programmatic — meets the change. That's where you observe.

| Change reaches | Surface | You |
|---|---|---|
| CLI / TUI | terminal | type the command, capture the pane |
| Server / API | socket | send the request, capture the response |
| GUI | **its control interface** | drive it through scripting / MCP / debug channel / launch argument and read back state — **never the pointer or keyboard** (see the top of this file) |
| Library | package boundary | sample code through the public export — `import pkg`, not `import ./src/...` |
| Prompt / agent config | the agent | run the agent, capture its behavior |
| CI workflow | Actions | dispatch it, read the run |

**Internal function? Not a surface.** Something in the repo calls it and that caller ends at one of the rows above. Follow it there. A bash security gate's surface isn't the function's return value — it's the CLI prompting or auto-allowing when you type the command.

**No runtime surface at all** — docs-only, type declarations with no emit, build config that produces no behavioral diff — report **SKIP — no runtime surface: (reason).** Don't run tests to fill the space.

**Tests in the diff are the author's evidence, not a surface.** CI runs them. You'd be re-running CI. Tests-only PR → SKIP, one line. Mixed src+tests → verify the src, ignore the test files. Reading a test to learn what to check is fine — it's a spec. But then go run the app. Checking that assertions match source is code review.

## Get a handle

**Check `.claude/skills/` first — even if you already know how to build and run.** A matching `verifier-*` skill is the repo's evidence-capture protocol: it wraps the session so a reviewer can replay what you saw. Drive the surface without it and you get a verdict with no replay.

Skills live at the repo root **and** in the package/app dirs the diff touches — in a monorepo the unlock for `apps/desktop/` is usually `apps/desktop/.claude/skills/`, not the root. Probe both:

```bash
ls .claude/skills/                    # repo root
ls <touched-dir>/.claude/skills/      # each dir level the diff names
```

- **`verifier-*` matching your surface** → invoke it with the Skill tool and follow its setup. Mismatched surface → skip that one, try the next. Stale verifier (fails on mechanics unrelated to the change) → ask the user whether to patch it; don't FAIL the change for verifier rot.
- **`run-*` but no matching verifier** → use its build/launch primitives as your handle.
- **Neither** → cold start from README/package.json/Makefile. Timebox ~15min. Stuck → BLOCKED with exactly where. Got through → **persist what you learned**: create `.claude/skills/verify/SKILL.md` at the level you probed — repo root for a single-package repo; the touched package/app dir in a monorepo where verification is per-package — capturing the build/launch/drive recipe that worked, so the next session skips this cold start. Keep it short: the commands that worked, the flows worth driving, any gotchas. **Include the project's programmatic control surface** — the scripting terms, MCP tools, debug endpoints or launch arguments that let a script drive it — since that is what the next session needs and what the GUI rule at the top requires. A project verify skill already exists → edit it only when it steered you wrong: a documented command failed or turned out wrong, or a needed step it doesn't cover. Routine learnings don't warrant an edit, and never rewrite or reorganize existing content for style.

## Drive it

Smallest path that makes the changed code execute:

- Changed a flag? Run with it.
- Changed a handler? Hit that route.
- Changed error handling? Trigger the error.
- Changed an internal function? Find the CLI command / request / render that reaches it. Run that.

**Read your plan back before running.** If every step is build / typecheck / run test file — you've planned a CI rerun, not a verification. Find a step that reaches the surface or report BLOCKED. If every step is a click or a keystroke on the user's own machine, you've planned something you're not allowed to do — find the control interface or report SKIP for that part.

**The verdict is table stakes. Your observations are the signal.** A PASS with three sharp "hey, I noticed…" lines is worth more than a bare PASS. You're the only reviewer who actually *ran* the thing — anything that made you pause, work around, or go "huh" is information the author doesn't have. Don't filter for "is this a bug." Filter for "would I mention this if they were sitting next to me."

**End-to-end, through the real interface.** Pieces passing in isolation doesn't mean the flow works — seams are where bugs hide. If users click buttons, drive the same command path the button is wired to, at the app's own control interface — not the API two layers underneath it, and not the button itself.

**Destructive path?** If the change touches code that deletes, publishes, sends, or writes outside the workspace and there's no dry-run or safe target, don't drive it live. Verify what you can around it and say which path you didn't exercise and why.

## Push on it

The claim checked out — that's the first half. Confirming is step one, not the job. The description is what the author intended; your value is what they didn't.

You know exactly what changed. Probe *around* it, at the same surface you just drove:

- **New flag / option** → empty value, passed twice, combined with a conflicting flag, typo'd (does the error name it?)
- **New handler / route** → wrong method, malformed body, missing required field, oversized payload
- **Changed error path** → the adjacent errors it didn't touch — did the refactor catch them too, or only the one in the diff?
- **Interactive / TUI** → Ctrl-C mid-op, resize the pane, paste garbage, rapid-fire the key, Esc at the wrong moment
- **State / persistence** → do it twice, do it with stale state underneath, do it in two sessions at once
- **Wander** → what's adjacent? What looked off while you were confirming? Go back to it.

These aren't a checklist — pick the ones the change points at. Stop when you've covered the obvious adjacents or hit something worth a ⚠️. A probe that finds nothing is still a step: "🔍 passed `--from ''` → clean `error: --from requires a value`, exit 2." That the author didn't test it is exactly why it's worth knowing it holds.

Still not a test run. You're at the surface, sending what a user would send wrong.

## Capture

Stdout, response bodies, state dumps, pane dumps. Captured output is evidence; your memory isn't. Something unexpected? Don't route around it — capture, note, decide if it's the change or the environment. Unrelated breakage is a finding, not noise.

Shared process state (tmux, ports, lockfiles) — isolate. `tmux -L name`, bind `:0`, `mktemp -d`. You share a namespace with your host.

## Report

Inline, final message:

```
## Verification: <one-line what changed>

**Verdict:** PASS | FAIL | BLOCKED | SKIP

**Claim:** <what it's supposed to do — your read of the diff and/or the
stated claim; note any mismatch>

**Method:** <how you got a handle — which verifier/run-skill, or cold
start; what you launched; which control interface you drove>

### Steps

1. ✅/❌/⚠️/🔍 <what you did to the running app> → <what you observed>
   <evidence: the app's own output — response body, state dump, pane capture>

🔍 marks a probe — a step off the claim's happy path, trying to break
it. At least one. A Steps list that's all ✅ and no 🔍 is a happy-path
replay: still PASS, but you stopped at the first half.

**Sample:** <the one capture a reviewer looks at to see the feature —
the state dump or response that shows it working; omit for
build/types-only>

### Findings

<Things you noticed. Not just bugs — friction, surprises, anything a
first-time user would trip on. Lower the bar: if it made you pause, it
goes here. But the pause has to be yours, from running the app. Each
probe gets a line here even when it held. Lead with ⚠️ for lines worth
interrupting the reviewer for.

Name anything you could NOT observe because it has no programmatic
surface, and what would have to be built to observe it.>
```

Build/install/checkout are setup, not steps. Test runs and typecheck don't belong in Steps — they're CI's output.

**Evidence has to reach the reader.** A file path is only evidence if the person reading the report can open it. If the `SendUserFile` tool is in your toolset, you're on a remote surface where they can't — send the captures with it and let the report name what you sent. Without it, reference the path and keep the evidence that matters inline.

**Verdicts:**

- **PASS** — you ran the app, the change did what it should at its surface. Not: tests pass, builds clean, code looks right.
- **FAIL** — you ran it and it doesn't. Or it breaks something else. Or claim and diff disagree materially.
- **BLOCKED** — couldn't reach a state where the change is observable. Build broke, env missing a dep, handle wouldn't come up. Not a verdict on the change. Never report an approach blocked or impossible until you've enumerated the skills along the touched subtree — environment-specific unlocks usually live there. Say exactly where it stopped.
- **SKIP** — no runtime surface exists to drive. Docs-only, types-only, tests-only — or a GUI behaviour with no programmatic control interface yet, which is a ticket, not a reason to reach for the mouse. One line why.

No partial pass. "3 of 4 passed" is FAIL until 4 passes or is explained away.

**When in doubt, FAIL.** False PASS ships broken code; false FAIL costs one more human look. Ambiguous output is FAIL with the raw capture attached — don't interpret.
