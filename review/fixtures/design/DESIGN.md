---
name: Fixture File Manager
colors:
  primary: "#1f5fbf"
  danger: "#b3261e"
  surface: "#ffffff"
rounded:
  control: 6px
---

# Design System: Fixture File Manager

## Overview

Quiet and dense, like a well-kept toolbox. The file list is the product; chrome stays out of its way.

## Colors

### Named Rules

**One accent.** `primary` is the only saturated colour on a screen; destructive actions use `danger` and nothing else does.

## Do's and Don'ts

### Do:

- **Do** keep rows 32px tall so a screen holds forty files.
- **Do** confirm a delete in a dialog that names the file.

### Don't:

- **Don't** use a modal for anything a row menu can do.
- **Don't** hard-code a colour; use a token from the front matter.
- **Don't** colour a row to show selection without also showing a checkmark.
