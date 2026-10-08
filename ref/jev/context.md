# jev — injected context

> Jev is TypeSafe's typed-decision model, not a chat LLM. The key is already in the environment as `TYPESAFE_API_KEY`: use it, never ask for one.

- **What it is:** a "System One" model from TypeSafe AI ([announcement](https://typesafe.ai/blog/introducing-system-one-models-and-jev), Sep 15, 2026, early access). You send a `state` (text or structured program state) plus typed `questions`; it returns typed answers with probabilities. It generates no text, so it cannot write code, chat, or replace the model behind a coding agent ([docs](https://docs.typesafe.ai/introduction/coding-agents.md)).
- **Use it for** routing, classification, scoring and yes/no checks that code branches on: which label applies, which option to pick, how urgent something is.
- **Call:** `POST https://api.typesafe.ai/v1/systemone` with `Authorization: Bearer $TYPESAFE_API_KEY`, body `{"state": …, "model": "jev-latest", "questions": {…}}`. Question types are `choice`, `score` and `noul` (yes/no, 0–1). Shapes and a working example are in [`api.md`](api.md).
- **Already wired here:** `hooks/ref-picker.sh` calls it on every prompt to pick a ref label (`REF_PICKER=jev`, the default). Copy its `ask_jev` function for a new call.
- **Cardinality limit:** a choice takes at most 255 options ([announcement](https://typesafe.ai/blog/introducing-system-one-models-and-jev)).

## Files

| Open | When |
| --- | --- |
| [`api.md`](api.md) | Writing a Jev call: request and response shapes for each question type, confidence, and what to keep in the state. |
| [`driving.md`](driving.md) | Driving a browser or desktop UI with Jev: the read-choose-act-check loop and its limits. |
