# dashboard spike — choosing between variants

Slot `spike:<slug>`, scope `session`. Post it once the variants are screenshotted. No `--every`.

```ts
{ kind: "spike", title: "spike <slug>",
  question: string,                                    // the question the spike settles
  variants: {name, shot /* absolute png path */, verdict?: "open" | "in" | "out" | "winner", note?}[],
  winner?: string }
```

- Screenshots are written into the page at post time, so a new or changed `shot` needs another
  `"$D" post`, which replaces the card in its slot. A verdict change is a `push`.
- **End** with `"$D" end spike:<slug>` once a winner is picked and recorded.
