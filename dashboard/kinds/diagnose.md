# dashboard diagnose — the hypothesis board

Slot `diagnose:<symptom-slug>`. Post once the first hypotheses are written down;
push each time one is ruled in or out. No `--every`.

```ts
{ kind: "diagnose", title: "<symptom, short>",
  symptom: string,                                            // what was observed, with the real values
  hypotheses: {text, state: "open" | "ruled-out" | "confirmed", evidence?}[],
  flow?: string,                                              // Mermaid flowchart of the failing path
  fix?: string }                                              // once known: the change and its file:line
```

End with `"$D" end diagnose:<slug>` once the fix is verified.
