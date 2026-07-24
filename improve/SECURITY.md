# Aspect: `security` (native)

Security **posture**, not exploits. This lens finds hardening gaps — practices the project is missing or doing weakly, where nothing is technically broken today. The boundary with `review`'s security axis (`../review/axes/security.md`) is hard: that axis reports *exploitable-today* weaknesses (untrusted source → dangerous sink → impact) and explicitly drops defense-in-depth gaps; this lens is those dropped gaps. If the pass stumbles on something actually exploitable, report it tagged `review-territory` with a pointer to run `/review security` — don't develop it here.

## Grounding rule

Same as [ARCHITECTURE.md](ARCHITECTURE.md): every finding cites this repo's files and what the project actually does. The areas below are a lens to look through, not a checklist to dump — "you have no CSP" is only a finding if the project serves HTML; "no secret rotation practice" only if there are secrets. A finding that could be pasted into any repo's report is slop; drop it.

## Areas

Walk the ones that apply to what the project actually is:

- **Secrets handling** — where do credentials live (env vars, `.env` gitignored, keychain) and is the pattern consistent? Any committed defaults or fallbacks re-leaking a value? Rotation practice for long-lived tokens? (Overlaps the account-wide no-secrets-in-git rule — flag drift from it.)
- **AuthN / AuthZ model** — is there a *model* (roles, scopes, ownership checks named in one place) or ad-hoc checks scattered per endpoint? Password hashing choice, session/token lifetime and revocation story.
- **Input-validation strategy** — centralized validation at the edge (schema, parser) vs per-handler ad-hoc checks. The finding is the missing *strategy*, not one missing check (one reachable missing check is review's).
- **Transport & headers** *(web surface only)* — TLS assumptions, CSP, CORS policy, cookie flags, security headers. Absence is the gap.
- **Dependency policy** — pinning discipline, update cadence, whether any audit tooling runs (`npm audit`, dependabot, etc.). Unmaintained load-bearing dependencies.
- **Least privilege** — DB users, API token scopes, container users (root?), file permissions on anything sensitive.
- **Data protection** — what user data exists, is anything sensitive encrypted at rest, is there a backup/recovery story, deletion semantics.
- **Logging & audit** — do logs leak secrets or PII; is there any audit trail for sensitive actions.

## Findings

Each finding: the **gap** (what's absent or weak), **evidence** (file/config that shows it), **practice** (the concrete thing to adopt — named tool, named pattern, where it would live), **strength** (`Strong` / `Worth exploring` / `Speculative`, same badges as architecture). Card fields per [HTML-REPORT.md](HTML-REPORT.md) — no before/after diagram required; a small table or config snippet carries a security card fine.

## Interactive follow-up

Same grilling loop as architecture (see [ARCHITECTURE.md](ARCHITECTURE.md)) — walk the chosen hardening with the user: what it costs, what it touches, whether an ADR should record a deliberate "we accept this risk" decision.
