# cua-s1 — local model for closed-candidate UI decisions

Part of [`trycua/cua`](https://github.com/trycua/cua), `libs/cua-s1`. Not a general chat model —
a "System 1" framing: given a fixed, closed list of (element, action) candidates for the current
screen, it answers with a single letter naming which one to take. One forward pass, softmax over
just the option-letter token logits. No open-ended generation, no tool-calling loop.

## Checkpoints that matter

- `cua-s1-4b-0.2` / `cua-s1-4b-0.1` — a LoRA adapter (Apache-2.0, HF `cua-ai/cua-s1-4b-0.2`) on
  top of the frozen, openly-licensed `Qwen/Qwen3.5-4B` base (~9.3GB). This is the one worth using.
  `0.2` does not supersede `0.1`; both are distributed independently. On-disk layout is
  `<adapter-root>/text/` and `<adapter-root>/multimodal/`, two independently-trained adapters —
  text mode reads an accessibility-tree description, multimodal mode reads a screenshot.
- `cua-s1-form-v0` — 706,048 params, trivial CPU-only research checkpoint for form-field
  decisions specifically. Not evaluated here.

Fetch pinned weights (verified by sha256, no HF token needed — public):
`python libs/cua-s1/ci/fetch_pinned_weights.py --dest <dir>`

## Loading it — `cua_s1.four_b.FourBModel`

```python
from cua_s1.four_b import FourBModel
model = FourBModel(
    base_model="Qwen/Qwen3.5-4B",
    lora_adapter_path="<dir>/cua-s1-4b-0.2",  # resolves text/ or multimodal/ subdir itself
    device="mps",       # Apple Silicon GPU backend — confirmed available and used, not CPU
    dtype="bfloat16",   # or "float16" — float16 loads ~30% faster, forward time is a wash
    modality="text",
)
model.load()  # ~12-18s on M3 Max
result = model.forward(options, app=..., task_family=..., ax_tree=..., goal=...)
```

Requires the `four-b` extra: `transformers>=5.10.1,<6`, `peft>=0.21,<1`, `torchvision>=0.17,<1`.
Pinned lock versions that are known to work together: torch 2.14.0, transformers 5.17.0,
peft 0.21.0.

No official loopback decision-server implementation ships in the repo — `decision-models.md`
in the jev-use example describes the wire contract (`cua.jev_choice_request_v2` in,
`cua.decision_choice_v1` out) but says "the service is not part of this example." Writing a
small stdlib `http.server` wrapper around `S1DecisionModel` + `decision_models.choose()` (both
in the jev-use example's `python/`) is the expected integration point, not a gap to work around
differently.

## Performance — verified, not assumed

Isolated `model.forward()` calls (no Driver, no MCP session, no HTTP round trip), on an M3 Max,
36GB, after a warm-up call:

| dtype | load | warm-up forward | forward (steady) |
|---|---|---|---|
| bfloat16 | 17.8s | 2.6s | 0.58–0.78s |
| float16 | 12.2s | 1.8s | 0.61–0.66s |

**The GPU forward pass is not the bottleneck.** A full `run_native.py --provider s1` run against
a real Driver session measured `decide_ms` of 28,000–37,000ms per decision — 40-60x slower than
the isolated number above. `sysctl vm.loadavg` read `{11.39 10.19 21.47}` immediately after that
run, well above idle, so system contention is the leading suspect, not raw compute. Open
follow-up: `cc-epdw` in this machine's beads (bd) — rerun the full pipeline on a verified-idle
machine and see if `decide_ms` drops toward the ~0.6-0.8s baseline, or whether the request/
response path itself (prompt building, tokenizing the real multi-candidate AX tree) is the
actual cost once contention is ruled out.

## The model card is explicit about scope — respect it

`libs/cua-s1/MODEL_CARD.md`: research profile, not measured for `general_decision` or several
other categories. Out-of-scope uses listed explicitly include "general-purpose or open-ended
computer operation" and "unsupervised operation on production accounts or sensitive data." A
high softmax score is not proof the chosen action's precondition actually holds — the caller
(not the model) is responsible for re-checking the candidate against a fresh observation before
dispatching it, and for verifying the postcondition from an independent source (an app-owned
state file, not the model's own claim or a screenshot).
