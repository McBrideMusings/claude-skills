# Design lens fixture

A web-file-manager-shaped `DESIGN.md` and a UI diff that breaks it. Set up a scratch repo
first: `git init` and copy `DESIGN.md` into its root, which is what the lens gates on
(`files: [DESIGN.md]`). Then run the [`design` lens](../../axes/design.md) over `ui.diff`.

The lens passes when it reports both of these, each quoting the rule:

| Diff line | Rule cited |
| --- | --- |
| `background: selected ? "#d6e4ff" : "transparent"` | "**Don't** hard-code a colour; use a token from the front matter." and "**Don't** colour a row to show selection without also showing a checkmark." |
| `onClick={() => openRenameModal(file)}` | "**Don't** use a modal for anything a row menu can do." |

It must not report the `height: 32`, which matches the "keep rows 32px tall" rule.
