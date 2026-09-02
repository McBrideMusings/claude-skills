# Phase 02 — Bootstrap (Greenfield)

`docs/` doesn't exist. Build the VitePress site from scratch.

## Steps

1. **Install VitePress** — `npm add -D vitepress` (or match the project's package manager — pnpm, bun, yarn).
2. **Apply opt-in heuristics** (table below). Tell the user which matched and why.
3. **Create universal files.** See `references/vitepress-config.md` for the config starting point.
   - `docs/index.md` — `layout: home` frontmatter
   - `docs/file-map.md` — stub with H1 + TODO
4. **Create opt-in scaffolds** for matched heuristics (H1 + "TODO: fill in").
5. **Wire `package.json`:** `"docs:dev": "vitepress dev docs --port 5193"` (or main app port + 20).

   Don't add `docs:build` / `docs:preview` unless project deploys docs. Heuristic: workflows mention Pages / Netlify / Vercel / `vitepress build`, or `gh-pages` / `docs-deploy` script in package.json.
6. **Wire `admin.toml`** if present. See the `[commands.docs]` shape at the bottom of this file. The change takes effect immediately — the `admin` tool interprets `admin.toml` at runtime, so there's nothing to regenerate. Validate with `admin check`.
7. **Update `CLAUDE.md`** Documentation section (template below).
8. **Append to `.gitignore`** if missing:

   ```
   docs/.vitepress/cache
   docs/.vitepress/dist
   ```
9. Proceed to [PHASE-05-VERIFY.md](PHASE-05-VERIFY.md).

## Opt-in heuristics (any one is sufficient)

| Folder/file | Trigger |
|---|---|
| `api.md` | `package.json` has `main`/`bin`/`exports`/peer-or-library deps; OR GraphQL/OpenAPI schema; OR plugin manifest; OR CLI entry (`bin/`, `cmd/`, shebang); OR HTTP framework imported (Express/Fastify/Hono/Axum) |
| `architecture/` | 3+ top-level source folders, OR multi-subsystem (web+iOS, frontend+backend, monorepo) |
| `guide/` | User-facing surface (web app, CLI tool — not a library) |
| `development/` | Git repo with >1 contributor, OR CI configured, OR open source (LICENSE + non-private remote) |

**No roadmap file, and none is created here.** Forward-looking work lives in the repo's issue tracker, where a dependency graph orders it; `iron-out` reads that graph and prints the roadmap on demand. A markdown checklist cannot express a blocking edge, so it drifts from the tracker the day after it is written and there is no way to tell which one is wrong. If a repo has no tracker, the fix is `bd init` — never a roadmap file as a consolation prize. Same reasoning as [`bootstrap`'s PHASE-06](../bootstrap/PHASE-06-DOCS-ARTIFACTS.md).

## `CLAUDE.md` Documentation section template

Drop table rows for files that don't exist.

```md
## Documentation

This project has a VitePress docs site under `docs/`. Run `admin docs` (or `npm run docs:dev`) to read it on `http://localhost:5193`.

Keep these in sync as you work:

| File | Update when |
|---|---|
| `docs/file-map.md` | Major files/folders are added, removed, renamed, or moved |
| `docs/api.md` | (if exists) external API surface changes |
| `docs/architecture/*` | (if exists) subsystem behavior changes |

Don't write new top-level planning / phase / feature docs in `docs/` — file an issue on the repo's tracker instead (invoke `issues`). Nothing in `docs/` is forward-looking; the tracker owns everything not yet built.
```

## `[commands.docs]` shape for admin.toml

```toml
[commands.docs]
kind = "npm"
desc = "serve VitePress docs site with hot reload on http://localhost:5193"
run  = "docs:dev"
```

**Use `kind = "npm"`** — dedicated renderer that auto-detects npm vs bun (via `bun.lockb`), runs `<pkg> run <script>`, gives standardized output. Don't use `kind = "shell"` with `"npm run docs:dev"` — that bypasses lockfile detection.

Single command, no sub-targets. No `docs build` / `docs preview` — noise for local viewing. Add `"docs"` to `order` array between `clean` and utility commands. Standard shape:

```
order = ["build", "dev", "deploy", "---", "test", "clean", "docs", "icons", "reload"]
```

(Omit what doesn't apply.) `logs` is auto-registered via `[logs.*]` — don't add it to `order`; the generator validates strictly.

If project deploys docs (rare), use separate `[commands.docs-build]` / `[commands.docs-deploy]` rather than sub-targets.

**Not an action.** `[actions.X]` is for multi-step or shared-between-commands building blocks. Single npm script invocation is neither.

## ESM gotcha (always use `.mts`)

VitePress is ESM-only. With `"type": "commonjs"` (or no `type` on older Node), `config.ts` fails:

```
"vitepress" resolved to an ESM file. ESM file cannot be loaded by `require`
```

`.mts` forces TypeScript to treat the file as ESM regardless of project module type.

## Other gotchas

- **`{{ }}` in markdown** — Vue template syntax, even in backticks. Wrap with `<code v-pre>{{ }}</code>` or escape.
- **`outline: deep`** frontmatter for pages with H3+ headings to show full TOC.
- **Sidebar links omit `.md`** — `/guide/getting-started`, not `/guide/getting-started.md`.
- **Landing page** needs `layout: home` frontmatter.
