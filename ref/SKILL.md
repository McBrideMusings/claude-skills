---
name: ref
description: Domain reference — one directory per label (go, apple, gui, api, game, …). Load before designing, building, testing, reviewing or shipping in a domain whose conventions you have not already read this session.
argument-hint: "<label>"
---

# Domain reference

`/ref <label>` means: read `ref/<label>/context.md`, then open whichever file its map points
to for the task at hand. With no label, pick the row below that matches the work; if none
matches, say so rather than guessing.

Two hooks load cells without anyone calling this skill. At session start, a repo's labels
inject each cell's headline, which says the cell exists. Then `hooks/ref-picker.sh` runs on
every prompt (except one made only of control words: `go`, `park` …) and before every Edit,
Write or MultiEdit. It asks a model one yes/no question per label in the table below and
injects the whole `context.md` of every label answered a confident yes, so a test-file edit
in a web repo gets both `web` and `testing`. A second call asks one yes/no question per row
of those cells' `## Files` tables and injects each page answered yes. Each cell and each
page arrives at most once per session. One event's output stays within 9,500 bytes, because
Claude Code cuts longer hook output to a 2KB preview: a cell or page that does not fit is
left unclaimed and is asked about again on the next prompt or edit, and a page over 7,500
bytes arrives as a line telling you to read its file. On a prompt, the first call also asks
one yes/no question per skill in its `TRIGGERS` table and injects a load line for each confident yes
(see `retro/SKILL-SHAPE.md`). On an edit, the model reads the file path, the last prompt and
the text being written. `REF_PICKER` selects the model (`jev`, the default, `local`, or
`off`; `local` names at most one label, on prompts only). Any other page is yours to read when
the work enters it.

The picker reads the table's rows as its label menu, so each **Covers** entry is also the
text the model judges each label by. Keep a new row in the same `` [`label`](label/context.md) `` shape.
Likewise each cell's Files table is its page menu: the **When** column is the question the
model answers, so write it as the work that needs the page ("a dialog, popover or menu"),
and keep each row in the `` | [`page.md`](page.md) | When | `` shape.
`python3 ~/.claude/skills/retro/pointer_rate.py --ref` measures the picks and whether sessions
used them; run it before and after rewriting a Covers or When entry.

Every label's root file is `context.md`: a `> ` headline, a short body, and a **Files** map.
Everything else in the directory is content, named for what it holds. There is no `SKILL.md`
below this directory.

The cells are written in a private knowledge repo and published here: each `ref/<label>/`
directory in this repo is a generated copy, so edit a cell where it is written, never here.
On the author's machine the private repo is read through `skills/ref-cells/`, a gitignored
symlink at the same depth as `ref/`, which also holds the private labels under
`ref-cells/local/<label>/`. Those are reached by the same hooks and never listed here.

| Label | Covers |
| --- | --- |
| [`agent-docs`](agent-docs/context.md) | Writing a skill, a CLAUDE.md, or any document an agent reads — pointer wording, progressive disclosure, pruning, failure modes. |
| [`api`](api/context.md) | API contracts — versioning, idempotency, pagination, error shapes, breaking changes. |
| [`app-store`](app-store/context.md) | App Store submission — review queues, metadata, rejections, release timing, and the `asc` CLI. |
| [`apple`](apple/context.md) | Apple platforms — signing, provisioning, simulators, XCTest, Instruments, xcodebuild. |
| [`architecture`](architecture/context.md) | Code design — module boundaries, coupling, the conditions a bug needs to exist, interface safety, security. |
| [`audio`](audio/context.md) | Audio — volume sliders and gain curves, dB and loudness, normalisation, playback and signal handling. |
| [`backend`](backend/context.md) | Backend services — secrets and logging discipline, data access, service boundaries. |
| [`backlog`](backlog/context.md) | Beads and issue tracking — filing, labeling from `.beads/labels.toml`, `human` and decision beads, ironing out what waits on a person, relabeling a backlog. |
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
| [`testing`](testing/context.md) | Automated tests in any stack — which tests to commit, test-first loop, seams, mocking, auditing a suite. |
| [`threejs`](threejs/context.md) | Three.js and WebGL — resource disposal, frame-loop allocation, scene graph, GPU profiling. |
| [`tui`](tui/context.md) | Terminal interfaces — keyboard-first navigation, no hover, on-screen state, reflow to 80 columns. |
| [`tvos`](tvos/context.md) | tvOS — the focus engine, no touch or cursor, ten-foot viewing distance. |
| [`web`](web/context.md) | Web frontend — semantic HTML, accessibility, narrow viewports, cold cache, load performance. |

How labels resolve for a repo, and how engines (`review`, `diagnose`, `profiling`) read
the per-engine files inside each cell: [`../DOMAINS.md`](../DOMAINS.md) and
[`../_detect.md`](../_detect.md).
