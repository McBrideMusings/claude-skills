# Aspect brief: `security` (native)

Axis tag: `security`. Applicability: always.

**Read first, in full:** [../SECURITY.md](../SECURITY.md). Stop before "Interactive follow-up".

Security **posture**, not exploits. Find hardening gaps — practices the project is missing or doing weakly, where nothing is technically broken today.

## The boundary, which is hard

`review`'s security axis (`../../review/axes/security.md`) reports *exploitable-today* weaknesses — untrusted source → dangerous sink → impact — and explicitly drops defense-in-depth gaps. **This lens is those dropped gaps.** If you stumble on something actually exploitable, return it tagged `review-territory` with a pointer to run `/review security`; do not develop it here and do not score it as an opportunity.

## What to do

Walk only the areas in SECURITY.md that apply to what this project actually is — secrets handling, authN/authZ model, input-validation strategy, transport & headers (web surface only), dependency policy, least privilege, data protection, logging & audit.

For each gap: what's **absent or weak**, the **file or config that shows it**, and the **concrete practice to adopt** — a named tool, a named pattern, and where in this repo it would live.

## Aspect-specific rules

- **The areas are a lens, not a checklist to dump.** "You have no CSP" is a finding only if the project serves HTML. "No secret rotation practice" only if there are secrets. A finding that could be pasted into any repo's report is slop — drop it.
- **The missing strategy is the finding, not one missing check.** One reachable missing validation call is review's. "Validation is ad-hoc per handler with no edge schema" is yours.
- Flag drift from the account-wide no-secrets-in-git rule specifically: committed defaults or fallbacks that re-leak the value being hidden.
