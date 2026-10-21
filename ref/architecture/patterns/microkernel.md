# Microkernel — a kernel and its extensions

**Applies when** the product hosts things other people or agents add: an editor, an IDE, a pipeline of swappable steps, a platform that runs pages, panes, commands or tools it did not ship. Skip it otherwise; a product with nothing to extend gains only ceremony from it.

Adapted from micsapp/micstec-skills [`architecture-paradigm-microkernel`](https://github.com/micsapp/micstec-skills/blob/main/claude-code/claude-night-market/plugins/archetypes/skills/architecture-paradigm-microkernel/SKILL.md), restated in the vocabulary of [../depth.md](../depth.md).

## Terms

- **Kernel** — the deep module every extension needs. Its interface is the contract.
- **Contract** — the interface at the seam extensions plug into.
- **Extension** — an adapter at the contract's seam.

"Two adapters = real seam" still governs: a contract with one extension behind it is hypothetical.

## Tests

- **Kernel test.** For each module the kernel owns, ask whether every extension needs it. Process lifecycle, state persistence, identity, permission and transport pass. A feature only one extension or one vendor needs fails, and is an extension living in the kernel.
- **Closed-kind test.** Count the files that change to add one more kind (a pane type, a command, a message). More than the extension's own files plus one registration means the seam is a closed enum, not a contract. A closed list is right when it is deliberately short and one of its kinds is the open contract (a web view that hosts any page).
- **Contract completeness.** A contract names: how an extension registers, what it declares it can do, its lifecycle (start, stop, crash), what it may touch (the permission model), and how data flows both ways between it and the kernel. A missing direction — an extension that can be fed but never answer — is a gap, not a simplification.
- **Isolation.** An extension that fails stops itself, never the kernel or its siblings. Check what a crashing, hanging or malicious extension reaches.
- **Reload without rebuilding the kernel.** Changing an extension takes effect without recompiling or restarting the kernel. An extension surface that only compiled code can fill fails this; the usual answers are a page in a web view, or data the kernel renders natively (a declared label, value and level) so nothing but data is reloaded.
- **The SDK is the programmatic surface.** An extension author — person or agent — needs a starter, a way to drive the extension from a script, and a way to read its state back. Without one, every extension is hand-built from reading kernel source.
- **Kernel bloat is the standing risk.** Each feature pushed into the kernel because the contract cannot yet express it is a finding against the contract, not a reason to grow the kernel.

## Versioning

When the kernel and its extensions live in one repo with one owner, version them together and change them in one commit; compatibility layers for old extensions are the residue the zero-callers rule removes. A contract published to authors outside the repo declares its version, and the kernel refuses an incompatible extension with a stated reason rather than shimming it.
