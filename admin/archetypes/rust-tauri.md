# Archetype: `rust-tauri` (Tauri desktop apps — Rust core + web UI)

Load when `admin.toml` has `archetypes = [… "rust-tauri" …]`. `dev` runs the
Tauri dev loop; `build` bundles the platform app.

## macOS bundles inherit the Apple icon gotchas

When Tauri bundles a **macOS `.app`**, the app-icon rules in
`archetypes/apple.md` apply: an icon PNG with **any alpha channel renders inset**
in the Dock — flatten to opaque RGB for full-bleed. Check `Image.open(p).mode`
(`RGB` good, `RGBA` suspect). See `apple.md` / ADR-0007 for the full explanation.

## Dev output

Tauri dev wraps a web dev server; if its output collapses, use
`kind = "interactive-shell"` not `pty = true` (main SKILL.md note).

No other archetype-specific gotchas documented yet — add them here.
