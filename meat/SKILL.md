---
name: meat
description: Reduce a git diff to only the parts worth reading. Use this whenever the user asks to review a commit, review a diff, catch up on changes, understand what changed in a branch or PR, or says anything like "what actually changed here", "summarize this commit", "review the last N commits", or "what's the meat of this change". Use it even when the user does not say the word "review" — any request to make sense of a diff, a commit range, or a set of changes should trigger this skill. Do not use for writing code, for explaining code that has not changed, or for architecture questions about a whole codebase.
---

# meat

Elide a git diff down to what a reader actually needs to see. Subtract; do not
summarize, and do not narrate.

Ported from `boldsoftware/meat` (a Go CLI that sends a diff to a model with
the rubric below, then mechanically applies the model's edit plan). This
skill has no separate compiler — you play both roles: judge each hunk against
the rubric, AND produce the abridged diff text yourself. Where the rubric
below says "Meat does X automatically" (import removal, move-pair detection,
applying your remove/fold/replace plan to produce the final diff), there is
no separate mechanism doing that here — you do it directly by writing the
retained hunks out, replacing an elided run of lines with a single indented
`...` line (fold), or dropping lines entirely (remove). There are no
`preview_plan` / `submit` tools to call; just emit the final abridged diff.

## Operating rules

1. **Subtract, do not describe.** The output is the diff with the boring parts
   removed — not prose *about* the diff. The reader wants to read code.
2. **Do not narrate.** No "this commit refactors the authentication layer."
   Show the hunks that matter and let the reader conclude.
3. **Preserve fidelity.** Anything retained is retained verbatim. Never
   paraphrase a hunk, never reconstruct one from memory.
4. **Mark what was dropped.** State the count and category of elided hunks so
   the reader knows the shape of what is not shown. Never silently discard.
5. **When in doubt, keep it.** A false negative (hiding a real change) is far
   worse than a false positive (showing one boring hunk).

## Procedure

1. Resolve the target. Default to `HEAD`. Accept git-shaped arguments:
   `HEAD~3..HEAD`, a branch name, a SHA, `--staged`.
2. Obtain the diff:
   ```sh
   git diff <target>            # or
   git show <sha>
   ```
   Use `--stat` first if the diff is large, to decide whether to scope down.
3. Remove import/include/require/use statements outright — every language's
   equivalent, including inside embedded multiline source fixtures. This
   happens unconditionally, before applying the rest of the rubric, and is
   never mentioned in the elision ledger (rule 6 below covers why).
4. Apply the rubric in §Rubric to every remaining hunk. Notice moved
   behavioral blocks yourself (a chunk removed in one file, added elsewhere
   near-verbatim) and treat both sides symmetrically per rule 7 — nothing
   detects moves for you.
5. Emit retained hunks in file order, with the elision ledger last.

## Rubric

You are a code-reading assistant for a senior engineer who spends their day reading diffs of GOOD code. The code compiles and its tests pass. The reviewer is NOT hunting for nil panics or sweating details. They are trying to understand the change to the program at a high level: what changed, where did data come from, where did it go, what new control flow or behavior appeared.

Your job: given a diff (which may span MANY files), choose what to KEEP, REMOVE, and FOLD to produce an abridged "reading diff". You write the final abridged diff yourself, directly — there is no separate compiler applying your plan.

Most edits should remove whole original lines. For a contiguous run of source lines that carries useful shape but excessive detail, fold it: replace the range with one correctly indented `...` line. When only part of one line is noise, use a local elision whose replacement matches the source while representing every omitted span with `...` or `…`. Folds and elisions preserve a code-shaped reading experience without allowing invented identifiers, comments, or behavior. The result is for reading, not compiling.

Reason across the whole change: a line that looks like noise in one file is often explained by a change in another. Read the surrounding source tree when a clue would change your judgment about whether something is load-bearing. Do NOT over-investigate: most lines can be judged from the diff alone.

## Principles

1. KEEP lines where everything matters: a changed argument, a new condition, a different function being called, a changed return path, anything that alters behavior or data flow.

2. COLLAPSE mechanical repetition. Keep the semantic anchor that names the operation, then fold or remove repeated members, calls, setup, and cases. For a rename or call-site migration repeated across hunks, keep one representative old/new anchor and drop the other purely mechanical hunks; retain another only when it exposes a distinct condition, transformation, effect, or compatibility boundary. Use fold when the omitted block's existence or nesting still helps the reader; emit only a fixed `...`, never invented prose. Use plain removal when no placeholder is useful. The result should feel like code and need not compile.

   Default unified-diff context is not valuable by default. File and hunk headings usually provide orientation already. Remove nearby blank lines, unchanged comments, and the usual three context rows unless they identify the owning definition, close a retained construct, establish data used by a surviving row, or show control flow needed to interpret the change. Treat comments and docstrings the same way: retain contracts, security or compatibility caveats, non-obvious rationale, and conditions the code does not make evident; drop issue restatements, changelog prose, and line-by-line narration.

3. ELIDE error-message construction. If a branch calls `t.Errorf` / `fmt.Errorf` / `log` / returns an error, the reviewer generally trusts the message. Keep the control flow and the fact that it errors; replace noisy message arguments with `...`. Keep details when error identity, wrapping, type, status, or control behavior is itself changing.

4. DROP entirely changes that are obvious, forced, and behavior-neutral: a zero value added to a return list because a new return value was introduced, gofmt realignment, and mechanical renames already obvious from a kept line.

5. DROP generated code entirely. Machine-generated files are outputs of the change, not the change itself. Remove the full file section and mention regeneration in the summary/ledger. Strong clues include a "Code generated ... DO NOT EDIT." header and conventional generated paths. If unsure, read the file. Keep the hand-written source change that drove generation.

6. IMPORTS ARE REMOVED, WITHOUT EXCEPTION. Remove imports, includes, requires, and use declarations everywhere they appear: package swaps, aliases, multiline blocks, unchanged framing rows, and import statements inside embedded source snippets or multiline test-fixture strings. Do not spend effort deciding on these rows and do not mention them in the ledger; shape only the behavioral rows around the import-free result.

7. TREAT BEHAVIORAL MOVES SYMMETRICALLY. When you notice an exact source-evidenced move across hunks or files, give both sides of the pair identical keep/remove/fold treatment, including matching fold boundaries and equivalent local elisions. A moved behavioral block must read as relocation, never as a one-sided deletion or one-sided compression.

8. NEVER invent or alter program logic. Removal and compression are allowed; lying is not. If unsure whether something matters, KEEP it.

9. Preserve enough file, hunk, and context structure that the reviewer can locate every retained change. Keep `diff`/`---`/`+++` and `@@` lines for partially retained files and hunks. If an entire file is noise, remove its whole section rather than leaving orphan metadata.

## Python: semantic skeletons and suites

For Python files, abridge around a semantic skeleton rather than isolated interesting lines. Preserve the smallest connected path that shows:

1. CONTRACT / DEFINITION — the changed function, method, fixture, class, decorator, marker, or option being introduced or modified.
2. BEHAVIOR-CHANGING CONDITION — guards, exception boundaries, precedence, async/lifecycle points, and branches that determine when behavior applies.
3. TRANSFORMATION — the non-obvious computation, normalization, lookup, mutation, or dispatch.
4. OBSERVABLE EFFECT — return/yield/raise, emitted response, state mutation, warning/log category, callback, or external call.
5. TEST SPECIFICATION — scenario identity, distinctive stimulus/configuration, and expected result.

Compress everything else around those anchors. Imports are already removed (rule 6). Python has many other high-yield SUITES: decorator stacks, docstrings, literal tables, fixture bodies, repeated call sites, parametrized cases, assertion batches, and exception setup. Keep the suite's owner and decisive rows, then fold the repetitive interior. In tests, keep setup only when it is required to understand or produce a surviving stimulus or outcome. Keep the scenario owner, distinctive inputs/configuration, and one decisive assertion for each different outcome dimension; fold or remove repeated construction, teardown, equivalent cases, and assertion batches. Never delete a fixture, route, embedded configuration, or state transition that the retained stimulus actually depends on. A surviving loop, comprehension, or parametrized test must not refer to a table or fixture that was deleted so aggressively that its role is unknowable; keep the definition and representative shape, usually with a fold inside it. Reject your own fold if it hides a simple assignment such as `tests = [...]` while a retained line still references `tests`.

Python-specific rules:

- Decorators and the definition they govern are atomic. Never leave a decorator detached. Keep decorators whose arguments define behavior: route paths/methods, pytest marks and parameters, fixture scope/autouse, dataclass/typing semantics, caching/registration, or async/task behavior. Never fold in a way that swallows a decorator or suite owner; keep the anchor and fold only its indented interior.
- Multiline expressions, calls, comprehensions, signatures, and strings must preserve recognizable boundaries. Prefer folding complete interior rows while keeping opener and closer. Never retain a dangling delimiter, orphan continuation, or misleading fragment. Never change triple-quote boundary parity within a hunk. Import blocks are the exception: remove the whole block rather than preserving its boundaries.
- Multiline strings often are the stimulus or expected output. Keep the assignment/call and the distinctive lines that define the case. Fold boring bulk only when the remaining string still communicates its semantic role and shape. Never replace an entire multiline stimulus call with one fold merely because it is multiline.
- Parametrization values are test specification, not boilerplate. Keep dimensions and boundary/distinctive values; fold truly repetitive middle cases. Keep each surviving expected outcome paired with its input.
- Fixtures are semantic when scope, autouse, setup/teardown, yield boundary, monkeypatching, environment, or shared state matters. Keep those lifecycle edges; fold incidental construction.
- Imports are removed automatically (rule 6); do not duplicate those removals in your plan. References to imported names in retained code are expected and need no import context.
- Preserve async boundaries (`async def`, `await`, task/context-manager lifecycle), exception type and control behavior, and warning category/filter when changed. Error message prose may be locally elided unless exact text is part of a public contract or test assertion.
- For repetitive suites, prefer fold over deleting the entire suite. A fixed indented `...` shows that omitted code exists without pretending to explain it.

## Worked examples

Raw field copies:
```
+    // Extra data used for cache management but not routing.
+    resp.SSHKeyID = rd.sshKeyID
+    resp.UserID = rd.userID
+    resp.BoxID = int64(rd.boxID)
+    resp.BoxName = rd.boxName
+    resp.ExpiresAt = timestamppb.New(rd.expiresAt)
```
Good plan: keep the comment and `resp.SSHKeyID = rd...` (elide `.sshKeyID` to `...`); remove the other four assignments. The reading result is source-shaped, compact, and made only by elision.

Raw assertion:
```
+    if rd.sshKeyID != sshKeyID {
+        t.Errorf("route SSH Key ID = %d, want %d", rd.sshKeyID, sshKeyID)
+    }
```
Keep all three lines; elide the message-and-arguments span on the `t.Errorf` line to `t.Errorf(...)`. The checked condition remains visible.

When collapsing a test, keep it looking like code review rather than a paragraph. Remove repetitive setup, but retain the signature, stimulus, and assertion lines that communicate the scenario. Do not invent a prose comment to replace the body; when the meaningful body is short, the code itself is faster to read.

Python table and consumer:
```
+CASES = [
+    ("empty", "", None),
+    ("simple", "a", "a"),
+    ("escaped", "a\nb", "a\nb"),
+    ("unicode", "π", "π"),
+]
+
+@pytest.mark.parametrize("name, raw, expected", CASES)
+def test_parse(name, raw, expected):
+    assert parse(raw) == expected
```
Keep `CASES = [`, a couple of representative/distinctive rows, the closing `]`, and the decorator through the assertion. Fold the middle rows of `CASES` if they're repetitive enough to become `+    ...`. Do not delete the `CASES` definition while retaining a test that depends on it, and do not hide the parametrization dimensions or expected outcome.

Multiline call:
```
+result = render_template(
+    template_name,
+    context,
+    locale=locale,
+)
```
Keep the opener and closer. Keep any argument whose changed value is the behavior; fold only contiguous same-polarity interior arguments that are routine. Never leave the call without its closer.

Exact move with uniform reindentation:
```
-    config_filters = config.getini("filterwarnings")
-    apply_warning_filters(config_filters, cmdline_filters)
-    yield log
...
+        config_filters = config.getini("filterwarnings")
+        apply_warning_filters(config_filters, cmdline_filters)
+        yield log
```
If you notice this is the same block relocated (only reindented), keep both spans, remove both, or fold both identically. Folding or removing only one side is wrong because it makes relocation look like deletion.

Raw context plumbing:
```
+    ctx := context.Background()
@@
-    m, err := meat.NewAnthropicFromEnv(*model)
+    m, err := meat.NewAnthropicFromEnv(ctx, *model)
```
If this is merely forced context forwarding and the meaningful context origin/use is represented elsewhere, remove the complete hunk or file section. Keep it when timeout, cancellation, values, or `Done` behavior matters.

Import churn:
```
 import (
 	"fmt"
-	"math/rand"
+	"crypto/rand"
+	"encoding/hex"
 )
@@
-    return fmt.Sprintf("%x", b)
+    if _, err := rand.Read(b); err != nil {
+        panic(err)
+    }
+    return hex.EncodeToString(b)
```
Remove the whole import block (rule 6); keep and shape only the behavioral body below it. The package substitution may be security-relevant, but the behavioral body is the meat: `rand.Read` and the new return path already reveal the change. The same rule applies to Python `from`/`import` rows, JavaScript imports/requires, Rust `use` declarations, C/C++ includes, Java/Kotlin imports, and import rows inside multiline source fixtures.

Raw plumbing before a call:
```
+    host := cfg.Host
+    if override != "" {
+        host = override
+    }
+    conn, err := dial(host)
```
The override precedence here cannot be reconstructed by inventing a comment on the `dial` line. If that precedence is reviewer-important, keep the lines. Only remove them when the same behavior is already made explicit elsewhere in the retained change. Never semicolon-pack several removed statements onto one line to imply what they did.

Keep a changed argument exactly when it is the point of the change:
```
-    p, err := parseSSHKeyPerms(permsJSON)
+    p, err := parseSSHKeyPerms(vals.Permissions)
```

A zero value added only because a new return slot exists elsewhere may be removed with its complete hunk. A generated file may be removed with its complete file section. Mention fully omitted mechanical/generated material in the one-line summary/ledger.

The final result should be a dense reading diff made only by your explicit compressions on top of automatic import removal. Prefer code-shaped evidence over explanatory prose, and prefer keeping uncertain code over hiding something important.

## Output format

```
<retained hunks, in file order, verbatim, with file headers>

---
Elided: N hunks
  - <category>: <count>
  - <category>: <count>
```

## Scope limits

- One diff at a time. Do not attempt a whole-repository review.
- If the diff exceeds available context, scope down by path or by commit and say
  so explicitly. Do not silently truncate.
- Generated files, lockfiles, and vendored directories are elided by default and
  reported in the ledger.
