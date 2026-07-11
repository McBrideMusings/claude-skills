# Security lens

Does the diff introduce a security vulnerability an attacker could actually exploit?

**Gated on relevance — skip when the diff has no security surface.** Run this lens **only** when the change touches security-relevant surface: authentication/authorization, session/token/credential handling, cryptography, parsing of user- or network-supplied input, SQL or other query construction, shell/subprocess execution, deserialization, file-path or filesystem access, outbound HTTP / SSRF-reachable requests, template or HTML rendering, or a dependency/lockfile change. If the diff touches none of these, output `Skipped — no security-relevant surface in this diff.` and exit. **In repo mode this gate is off — the lens always runs across the whole tree.**

**What to look for** — concrete, reachable weaknesses this diff introduces or worsens:

- **Injection** — SQL/NoSQL, OS-command, shell, LDAP, template (SSTI), header, or log injection where untrusted input reaches a sink unsanitized.
- **AuthN / AuthZ** — a missing or wrong access check, privilege escalation, IDOR (an object reference with no ownership check), auth bypass, or trusting a client-supplied identity/role.
- **Secrets** — a hardcoded credential/key/token, a secret logged or returned in a response/error, or a secret written into a committed file (cross-check the CLAUDE.md no-secrets-in-git rule). **Never copy the secret value into your finding** — reference the `file:line` and the credential *type* only ("Stripe live key at `config.ts:12`"), and make the **Fix** recommend **rotation**, not just removal: a committed secret is burned even after it's deleted.
- **Crypto** — a weak/broken algorithm, static IV/nonce, predictable randomness used for a security purpose, a missing signature/verification step, or hand-rolled crypto.
- **Input & memory safety** — path traversal, unrestricted file upload, unsafe deserialization, XXE, ReDoS, or bounds/lifetime bugs in unsafe-language code.
- **Request forgery** — a user-controlled URL/host reaching an outbound request (SSRF), or a missing CSRF defense on a state-changing endpoint.
- **Web output** — XSS from unescaped output, `dangerouslySetInnerHTML`/`innerHTML` on untrusted data, or an open redirect.
- **Supply chain** — a newly added/updated dependency that is unpinned, typo-squatted, sourced from somewhere untrusted, or pinned to a known-vulnerable version.

**Report real, reachable issues — not theater.** Each finding must name (a) the untrusted source, (b) the dangerous sink, and (c) the path between them — or, for the non-dataflow cases, the concrete misuse — and state the **impact** (what the attacker gains). If a candidate isn't actually reachable by untrusted input, it's a false positive → drop it. Don't dress up defense-in-depth niceties or style as security findings; those belong to other lenses. Never assert a "known CVE / known-vulnerable" without a real, specific reference (the no-phantom-authority rule).

Axis tag: `security`. These are real findings (not flags) — they flow straight to Phase 05 scoring like bugs.
