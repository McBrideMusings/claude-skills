# Sharing the prototype as a gist

A proposal published to GitHub can link an interactive version of its prototype. Readers can
click through the feature, and the prototype outlives the session's scratch directory. The
file goes up as a GitHub gist, and the link opens it through htmlpreview, which renders a
gist's raw HTML in the browser. GitHub itself serves gist files as `text/plain`.

```text
https://htmlpreview.github.io/?https://gist.githubusercontent.com/<user>/<gist-id>/raw/<sha>/<file>.html
```

## When this step applies

It applies when all of these hold:

- **The proposal goes to GitHub.** It is the tracker-issue output, or a document in a GitHub
  repo.
- **There is something to step through.** Either the step-3 prototype, or, when only static
  mockups exist, a slideshow of the step-4 PNGs inlined as `data:` URIs.
- **`gh auth status` lists the `gist` scope.**

It does not apply in these cases:

- **The proposal is not on GitHub**, for example a beads-only repo publishing a local
  document. There, the HTML file goes beside the document instead.
- **The prototype cannot be one self-contained file.** For example, a throwaway route on the
  project's dev server ([`../spike/UI.md`](../spike/UI.md)) renders real components.
- **The repo's own rules forbid hosting its material outside the repo.**

## Build the shared file

The prototype's build script writes a second output per platform,
`<topic>-<platform>.share.html`, from the same fragment as the prototype plus a share block.
The two files cannot drift, because the fragment is the only source. The gist names each file
`<topic>-<platform>.html`.

1. **Step-through mode, baked in.** Behind htmlpreview, `location.search` is the gist URL, so
   no query parameter reaches the page. The share block sets the mode in code. It leaves
   `SHOT` unset, so the faked data timers, motion and fit-to-window scaling all keep running.
2. **The bar.** A fixed bar under the screen holds:
   - Previous and Next;
   - "<n> / <total>";
   - a caption naming whose screen it is ("<role>, <platform>: <state>");
   - a select that jumps to any step.

   Steps follow the proposal's Design tables, in order. Each step names its `JUMP` state
   ([SCREENSHOTS.md](SCREENSHOTS.md)) and any tweak values that state needs:

   ```js
   var STEPS = [
     { state: 'start', caption: 'Owner, phone: empty list' },
     { state: 'list',  caption: 'Owner, phone: offline', tweaks: { conn: 'down' } }
   ], step = 0;
   function go(i) {
     step = i;
     var t = STEPS[i].tweaks || {};
     Object.keys(t).forEach(function (k) { atTweaks.set(k, t[k]); });  // boot() returns early: same screen
     screen = null; boot();               // fresh state, timers started, scaled to the window
     JUMP[STEPS[i].state](); render(); drawBar();
   }
   ```

   A tweak a step does not name keeps whatever the previous step left. Name it in every step
   that depends on its value.
3. **Harness chrome.** Insert both of these as the first children of `<head>`, before any
   harness script.

   ```html
   <script>history.replaceState = function () {}; history.pushState = function () {};</script>
   <style>.at-twk, .at-twk-pill { display: none !important; }</style>
   ```

   - **The script is required.** The harness writes the variant and tweaks into the query
     string on load and on every `atTweaks.set`. Behind htmlpreview, that rewrite turns the
     address bar into a URL that loads a blank page.
   - **The style removes the Tweaks panel.** The bar replaces it.

## Before it goes out

- **Self-contained.** This must print nothing. Plain `<a href>` links are allowed; the
  pattern skips them.

  ```bash
  grep -nE "<link|@import|import\(|src=[\"'](https?:)?//|url\([\"']?(https?:)?//|fetch\(|XMLHttpRequest" <file>.html
  ```

- **Stripped.** The harness title and subtitle, the fixture data and the comments get the
  same grep as the proposal body (SKILL.md step 6).
- **Owner shown.** The link carries the GitHub username that owns the gist. The confirm row
  names it.

## Confirm, publish, read back

The gist is a public write, so it gets its own row in step 6's slate, above the proposal's
row:

1. **Gist row.** It names:
   - the files;
   - `secret`;
   - the owning account;
   - the audience: "anyone with the link".

   On a private repo (`gh repo view --json visibility`), the row also says that the gist
   reaches further than the issue does. Its default is then `[skip]`, so a bare `go` does not
   publish the prototype of a private project.
2. **Proposal row.** The body shows the link as "pinned link from row 1".

On `go`, in this order:

1. **Create the gist.** `gh gist create -d "<feature> prototype" <files>`. It is secret by
   default: search and the owner's profile do not list it, but anyone with the link can open
   it without signing in. `--public` adds a listing and gives a reader nothing more.
2. **Pin the links.** `gh api gists/<gist-id> --jq '.files[] | .raw_url'` returns each file's
   raw URL with a sha in it. A pinned URL keeps serving the reviewed content after any later
   edit. The unpinned `/raw/<file>.html` can serve a stale cached copy right after an edit.
3. **Read back each link** in a browser (Playwright is enough). Check that:
   - the page title is the prototype's, not htmlpreview's own;
   - step 1 renders, and Next reaches step 2;
   - the address bar still holds the link exactly as created.

   The only console error allowed is htmlpreview's missing `favicon.ico`. If any check fails,
   run `gh gist delete <id> --yes`, publish nothing, and report the failure.
4. **Publish the proposal** with the pinned links under its Design heading.

Answering `skip` on the gist row publishes the proposal without the link. Answering `skip` on
the proposal row skips the gist too, since the gist exists only to serve the proposal.

**A leak found later means delete, not edit.** A gist keeps every revision, and each
revision's pinned URL keeps serving. Delete the gist and create a new one; once a gist is
deleted, its raw URLs return 404.
