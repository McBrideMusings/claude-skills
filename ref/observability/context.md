# observability — injected context

> Every feature logs its boundaries to disk; state returns what it shows.

Applies to anything that runs: an app, a service, a daemon. A library has no process to
observe and takes none of this.

- **Log every boundary a feature crosses** — data in from outside, each user action, each
  failure — with raw values: full timestamps and source identifiers, never the
  display-formatted version.
- **Logs go to a file at the platform's log directory**, and the program's own control
  surface reports that path.
- **The state query returns what the feature shows**, row for row, not a count.

The full checklist, which `implement`, `verify-skill` and `improve observability` all test
against: [`checklist.md`](checklist.md).
