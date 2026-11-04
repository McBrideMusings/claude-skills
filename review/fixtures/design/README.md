# Design lens fixture

A web-file-manager-shaped `DESIGN.md` and a UI diff that breaks it. `dsys` finds the repo root
from git, so set up a scratch repo first: `git init`, `git remote add origin
git@github.com:McBrideMusings/<name>.git` (an owned remote), and copy `DESIGN.md` into its root.
`dsys status --json` there reads `mode: "owned"`, `designMd: true`. Then run the
[`design` lens](../../axes/design.md) over `ui.diff`.

The lens passes when it reports both of these, each quoting the rule:

| Diff line | Rule cited |
| --- | --- |
| `background: selected ? "#d6e4ff" : "transparent"` | "**Don't** hard-code a colour; use a token from the front matter." and "**Don't** colour a row to show selection without also showing a checkmark." |
| `onClick={() => openRenameModal(file)}` | "**Don't** use a modal for anything a row menu can do." |

It must not report the `height: 32`, which matches the "keep rows 32px tall" rule.
