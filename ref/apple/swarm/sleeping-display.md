# A sleeping display blinds a macOS GUI worker

Part of [`swarm.md`](../swarm.md) — the per-worker simulator and UDID pinning rules are there.

An unattended run happens late, on an idle machine, which is exactly when the display sleeps. A
Metal-backed view has no drawable then, so anything read *out of the rendered surface* comes back
empty rather than wrong — a terminal grid reports zero rows, a snapshot field derived from layout
reports nothing. Empty is indistinguishable from broken, and the natural reading is that the change
under test failed.

**It cannot be fixed from inside the run.** Checked 2026-08-13 on macOS 15: `caffeinate -u -t 300`,
`caffeinate -d -i -t 600` and a synthetic `System Events` key event all left `screencapture`
returning an all-black frame. Waking a sleeping display needs real hardware input.

So, when gating macOS-app issues for an unattended swarm, prefer the ones whose verification reads
**state** rather than **pixels** — a JSON snapshot of which tab is active, an HTTP route's response,
a file on disk. Send anything that has to inspect rendered output to a run with a human at the
screen, and say in the report that it was held back rather than letting a worker return an empty
read as a pass.
