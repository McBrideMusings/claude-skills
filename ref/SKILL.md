---
name: ref
description: Domain reference — one directory per label (go, apple, gui, api, game, …). Load before designing, building, testing, reviewing or shipping in a domain whose conventions you have not already read this session.
argument-hint: "<label>"
---

# Domain reference

`/ref <label>` means: read `ref/<label>/context.md`, then open whichever file its map points
to for the task at hand. With no label, pick the row below that matches the work; if none
matches, say so rather than guessing.

Three hooks load cells without anyone calling this skill. At session start, a repo's labels
inject each cell's headline, which says the cell exists. On the first Edit, Write or MultiEdit of a
file in a label's domain, `hooks/ref-edit-inject.sh` injects that label's whole `context.md`.
The extension or filename picks the label: `.go` is `go`, `SKILL.md` is `agent-docs`, any file under `docs/adr/` or `docs/CONTEXT.md` is `docs`, and
`.ts` is `web` only where the repo's map carries `web` for that path. On every prompt except
one made only of control words (`go`, `park` …), `hooks/ref-picker.sh` asks a model to choose one label from the table below, or none, and
injects the chosen label's whole `context.md`; `REF_PICKER` selects the model (`jev`, the
default, `local`, or `off`). The two body-injecting hooks share one claim per label, so a
session gets each cell at most once, whichever hook fires first. Any other domain's body is
yours to read when the work enters it.

The picker reads the table's rows as its menu, so each **Covers** entry is also the text the
model chooses by. Keep a new row in the same `` [`label`](label/context.md) `` shape.

Every label's root file is `context.md`: a `> ` headline, a short body, and a **Files** map.
Everything else in the directory is content, named for what it holds. There is no `SKILL.md`
below this directory. Private labels live under `ref/local/<label>/`, gitignored, and are
reached by the same hooks; they are never listed here.

| Label | Covers |
| --- | --- |
| [`agent-docs`](agent-docs/context.md) | Writing a skill, a CLAUDE.md, or any document an agent reads — pointer wording, progressive disclosure, pruning, failure modes. |
| [`api`](api/context.md) | API contracts — versioning, idempotency, pagination, error shapes, breaking changes. |
| [`app-store`](app-store/context.md) | App Store submission — review queues, metadata, rejections, release timing, and the `asc` CLI. |
| [`apple`](apple/context.md) | Apple platforms — signing, provisioning, simulators, XCTest, Instruments, xcodebuild. |
| [`architecture`](architecture/context.md) | Code design — module boundaries, coupling, the conditions a bug needs to exist, interface safety, security. |
| [`audio`](audio/context.md) | Audio — volume sliders and gain curves, dB and loudness, normalisation, playback and signal handling. |
| [`backend`](backend/context.md) | Backend services — secrets and logging discipline, data access, service boundaries. |
| [`cli`](cli/context.md) | Building a command-line tool — its exit codes, stdout versus stderr, TTY detection, flags, piping. |
| [`cloudflare`](cloudflare/context.md) | Cloudflare Workers, KV, D1, R2 — wrangler, bindings, secrets, deploys. |
| [`computer-use`](computer-use/context.md) | Driving a browser or desktop GUI app for testing or automation without stealing focus, optionally with a local decision model. |
| [`container`](container/context.md) | Containers — Dockerfile, Compose, multi-stage builds, healthchecks, image size. |
| [`desktop`](desktop/context.md) | Desktop apps — packaging, code signing, per-platform install and update. |
| [`docs`](docs/context.md) | Recording a new term, an ADR-worthy decision or a subsystem in `docs/CONTEXT.md`, `docs/adr/` and `docs/<name>.md` — slate rows, the three-conditions test, formats. |
| [`game`](game/context.md) | Game development — game feel, playable loop, fixed timestep, prototyping, tuning, profiling, and the end-to-end build arc. |
| [`go`](go/context.md) | Go — go test, vet, gofmt, error handling, never discarding an error, concurrency. |
| [`gui`](gui/context.md) | Interface design — what to build, design layers, layout sketches, critique, states, colour, typography, motion, AI-slop, accessibility. |
| [`jev`](jev/context.md) | Jev, TypeSafe's typed-decision model and its API (`TYPESAFE_API_KEY`) — what it is, when to call it for routing, scoring or yes/no checks, request and response shapes. |
| [`mobile`](mobile/context.md) | Mobile apps — small screens, unreliable network, backgrounded processes, real-device testing. |
| [`python`](python/context.md) | Python — venv and uv rather than a global interpreter, packaging, tooling, idioms. |
| [`react`](react/context.md) | React — derive during render rather than syncing with effects, stable keys, state ownership, component boundaries. |
| [`rust`](rust/context.md) | Rust — cargo test, clippy, fmt, error handling, unwrap discipline, ownership. |
| [`threejs`](threejs/context.md) | Three.js and WebGL — resource disposal, frame-loop allocation, scene graph, GPU profiling. |
| [`tui`](tui/context.md) | Terminal interfaces — keyboard-first navigation, no hover, on-screen state, reflow to 80 columns. |
| [`tvos`](tvos/context.md) | tvOS — the focus engine, no touch or cursor, ten-foot viewing distance. |
| [`web`](web/context.md) | Web frontend — semantic HTML, accessibility, narrow viewports, cold cache, load performance. |

How labels resolve for a repo, and how engines (`review`, `diagnose`, `profiling`, `tdd`) read
the per-engine files inside each cell: [`../DOMAINS.md`](../DOMAINS.md) and
[`../_detect.md`](../_detect.md).
