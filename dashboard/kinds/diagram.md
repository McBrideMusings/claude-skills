# dashboard diagram — a structure, drawn

Slot `diagram:<slug>`, scope `session`. The page loads Mermaid 11.4.1 from jsdelivr and draws the
source; a source error shows under the diagram with the source still visible. No `--every`.

```ts
{ kind: "diagram", title: string,
  note?: string,             // one sentence: what the diagram answers
  mermaid: string }          // flowchart, sequenceDiagram, classDiagram, stateDiagram-v2 …
```

Keep it to the nodes the question needs: a flowchart past about 25 nodes stops being readable at
card width. The widget shows only the connection count; the diagram is in the full page. Push
after editing the source; end with `"$D" end diagram:<slug>`, or post with `--no-pin` for a
one-off.
