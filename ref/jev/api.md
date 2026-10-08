# Jev API

Source: [quick start](https://docs.typesafe.ai/introduction/quickstart.md), [confidence](https://docs.typesafe.ai/confidence.md), [docs index](https://docs.typesafe.ai/llms.txt). The docs index lists every page; fetch one when this file does not cover it.

## Request

```
POST https://api.typesafe.ai/v1/systemone
Authorization: Bearer $TYPESAFE_API_KEY
Content-Type: application/json
```

```json
{
  "state": "<the text or structured data to judge>",
  "model": "jev-latest",
  "questions": {
    "department": {"type": "choice", "instructions": "Which team should handle this",
                   "criteria": {"billing": "Payment issues", "technical": "Bugs", "sales": "Pricing"}},
    "frustration": {"type": "score", "instructions": "How frustrated the customer appears",
                    "criteria": ["Calm", "Frustrated but civil", "Very angry"]},
    "is_urgent": {"type": "noul", "instructions": "The message conveys urgency"}
  }
}
```

- `questions` is a map of your own keys to question objects. Mix types in one call; each question runs in parallel and in isolation against the same `state`, so adding questions barely adds time.
- `choice` `criteria` is a map of option key to description. `score` `criteria` is an ordered list of level descriptions. `noul` takes only `instructions`.

## Response

```json
{"model": "jev-1.13.0",
 "answers": {
   "department": {"type": "choice", "choice": "technical", "confidence": 0.78,
                  "probabilities": {"technical": 0.85, "sales": 0.0, "billing": 0.15}},
   "frustration": {"type": "score", "score": 1.0, "confidence": 1.0, "probabilities": {…}},
   "is_urgent": {"type": "noul", "noul": 0.97}},
 "usage": {"input_tokens": 331, "output_tokens": 48}}
```

A live call confirmed the `noul`, `choice` and `usage` shapes. `noul` carries no `confidence` field, so a yes/no judgment that needs a confidence floor is asked as a two-option `choice` (`yes`/`no`), which returns both; `review/tool/lens-gate` does this.

Read a choice with `jq -r '.answers.<key>.choice'`. `confidence` is separate from probability: a spread-out distribution gives low confidence even when one option leads, so gate an action on `confidence`, not only on the top probability.

## Writing good questions

- One narrow judgment per question. Decompose a broad question into several and combine the answers in code ([how to build with System One](https://docs.typesafe.ai/concepts/how-to-build-with-system-one.md)).
- Put program state in `state`; Jev is tuned for structured state more than for chat transcripts.
- A shell caller needs `--max-time`; the picker hook uses 1 second and treats failure as "no answer".
