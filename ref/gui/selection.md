# Selection and inspection

Part of [`gui`](context.md). Anything a person can select to inspect — a list or table row, a graph
node, a map point, a card, a canvas object — has a way to deselect it, built in the same change.

## Every select ships with its deselect

A selection with no way out leaves the interface in a mode the person did not ask to stay in: the
panel keeps showing the old item, highlights stay dimmed around it, and the only escape is to select
something else. Plan the exit together with the entry:

| Entry | Exit to build with it |
| --- | --- |
| Click an item on a canvas (graph, map, diagram) | Click empty canvas, meaning a press and release with no drag between them, deselects |
| Click a row or card | Click the selected row again, or Esc |
| Any selection | **Esc** clears it, unless focus is in a text field, which keeps Esc for itself |
| A side panel or inspector that opened for the selection | A close control in the panel, which also clears the selection |
| A selection the URL records (`#tag=…`) | Deselecting removes it from the URL, so reload doesn't bring it back |

## Rules

- **A drag is not a click.** On a pannable canvas, only a press that ends near where it started selects
  or deselects. A pan that happens to end on empty space must not clear the selection.
- **Deselect returns to the exact unselected state**, not a near copy. Use one `clear()` procedure,
  and have everything that drops the selection call it: empty click, Esc, the panel's close control,
  switching data set. Deselect must not be a second hand-written reset that can drift from the first.
- **Layered Esc peels one layer per press**: an open menu or suggestion list first, then a pinned
  card, then the selection, then a search filter. One press never clears two layers.
- **Hover is not selection.** Hover previews the item; selection persists until deselected. When
  both show on one surface, draw them differently: a ring for hover, fill plus ring for selected.
- **State the exit where it isn't obvious**, for example "click empty space or press Esc to clear"
  in the canvas's help line.

## Verifying it

Drive every exit in the table above as well as the entry. Select, then click empty canvas: check the
panel, the highlights, the URL and the keyboard focus all return to the unselected state. Select,
then pan by dragging: check the selection survived.
