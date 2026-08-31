# Wiring a prototype into `admin`

Every prototype gets an `admin prototype <slug>` entry, wired in the same pass that builds it.
Load the [`admin`](../admin/SKILL.md) skill for the manifest rules; this file is only the
prototype-specific half.

A prototype nobody can find is a prototype nobody looks at, and its path is a
`/private/tmp/claude/…` string too long to retype. Do it **without asking** — `admin.toml` is
globally gitignored and committed nowhere, so it is never a commit question and leaves no trace
in the repo.

## The shape

**The command is `prototype`.** Not `spike` — that is this skill's name, not the user's word for
the thing it produces. The menu says what the entry opens.

**One `prototype` command, one sub-target per prototype.** Several prototypes is the normal case:
one per device type is required, and one per screen is common. `prototype-tui`, `prototype-phone`,
`prototype-settings` as separate top-level verbs is the menu sprawl the fleet layout exists to
prevent.

```toml
[commands.prototype]
desc     = "Open a prototype"
steps    = ["prototype"]
group    = 2
priority = 70

[actions.prototype]
kind = "multi-target"

# ── HTML (UI / wireframe): hand the file to the default browser ──────────────
[actions.prototype.wheelhouse-phone]
kind = "shell"
desc = "Phone nav directions"
run  = "open /private/tmp/claude/<repo-slug>/spikes/wheelhouse-phone/wheelhouse-phone.html"

# ── TUI: must delegate, and the delegate must be interactive passthrough ─────
[actions.prototype.admin-tui]
desc   = "Dashboard reference prototype"
action = "prototype-admin-tui"

[actions.prototype-admin-tui]
kind        = "shell-passthrough"
run         = "go run /private/tmp/claude/<repo-slug>/spikes/admin-tui/"
interactive = true
```

- **The sub-target name is the slug**, so the menu reads as the prototype list and nothing has to
  be kept in sync.
- **A single prototype still gets a sub-target**, never a bare `run` on `[actions.prototype]`. The
  second one arrives sooner than you think, and adding it should not mean restructuring the first.
- **Point at wherever the prototype actually is** — `/private/tmp/claude/<repo-slug>/spikes/<slug>/`
  normally, `docs/spikes/<slug>/` once it is kept as ticket reference.

## The two traps, both silent

Neither is caught by `admin check`. Both were paid for once.

### 1. A multi-target sub-target's `kind` is ignored

`_make_multi_target` stores every target as a shell string and runs it through `run_cmd`,
whatever the sub-target declared. The **only** branch that dispatches by a target's own kind is
`shell.startswith("@")`, which is what `action = "<name>"` compiles to.

So `kind = "shell-passthrough"` written directly on a sub-target parses, resolves, passes
`admin check`, and then does nothing. **A TUI target delegates, or it is broken.**

### 2. Every `run_cmd` path timestamps the terminal

`_cmd_pump` stamps each line `%H:%M:%S.%f` on its way to the terminal and sizes the child to
admin's frame region. For a line-streaming process that is the feature; for a full-screen TUI it
destroys the frame — every row prefixed `21:13:15.211`, the design truncated to the region's
width instead of the window's.

`kind = "shell-passthrough"` with `interactive = true` is a bare `subprocess.call` with **no
pipes**, so the child inherits the real terminal: full size, no log tee, no stamping.

Two near-misses worth naming, because both look right:

- **`pty = true` does not help.** The pump is still in the path.
- **`interactive-shell` is the wrong kind.** It is deliberately non-TTY, and a full-screen TUI on
  a plain pipe does not render at all.

## Lifecycle

**Delete the sub-target when the prototype is deleted** — Phase 06, and the delete-me issue under
SKILL.md's "Tickets from a prototype". A `prototype` menu offering a path that no longer exists is
worse than no entry, and nothing will catch it: `admin check` validates the manifest's *shape*,
never whether a `run` line's path resolves.

## Verifying

`admin check` proves the manifest resolves. It does not prove the entry works — it cannot see an
ignored `kind`, a dead path, or a stamped frame. **Run it once, and look:**

```
admin prototype <slug>
```

For a TUI, the pass condition is specific: no `HH:MM:SS.mmm` prefix on any row, and the design
fills the window rather than sitting in a fixed-width island. Both failure modes render something
that looks close enough to pass a glance.
