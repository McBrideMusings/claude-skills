# Repo Analysis — Examples

Concrete examples of what a useful finding looks like vs what gets rejected. Examples 1–3 are code mode; Example 4 is skills mode.

## Example 1 — Bug hunting

> **User:** "Our HLS streaming drops the first segment about 30% of the time. Diff us against video-dev/hls.js."

Locked scope: ours `src/streaming/hls/` vs hls.js `src/loader/`. Intent: bug hunt.

**Useful finding:**

> We start segment fetch immediately on manifest parse (`hls.ts:42`); hls.js waits for the playlist's `#EXT-X-START` offset (`playlist-loader.ts:340`). If the manifest declares a non-zero start, our code fetches a segment that may not exist yet.

**Rejected:**

> hls.js exposes a JS API for buffer events. Different scope — they're a library, we're an app.

## Example 2 — Feature mining

> **User:** "Look at qbittorrent and tell me what features our seedbox web UI is missing."

Locked scope: qbittorrent web UI features vs user's seedbox UI. Intent: feature mining.

**Worth porting:**

> qbittorrent's ATM auto-applies category save paths on torrent add (`sessionimpl.cpp:2410`). User's UI requires manual TMM toggle per torrent.

**Rejected:**

> qbittorrent's desktop GUI has a system tray indicator. User's project is web-only by design.

## Example 3 — Cross-language

> **User:** "Our Python rate limiter under-counts under burst load. Compare to envoyproxy's token bucket in C++."

Locked scope: ours `app/middleware/rate_limit.py` vs envoy `source/common/common/token_bucket_impl.cc`. Intent: bug hunt.

**Useful finding:**

> Envoy refills the bucket lazily based on elapsed wall-time at consume-time (`token_bucket_impl.cc:54`). We refill on a fixed-interval timer (`rate_limit.py:71`). Under burst load between ticks, our bucket reports stale fill state, so allowed = max instead of allowed = max - bursts_in_window. Lazy refill is straightforward to port despite the language difference.

## Example 4 — Skills harvest (skills mode)

> **User:** "Harvest mattpocock's skills repo — what should I take?"

Reference is SKILL.md-structured, no app code → skills mode. Whole-catalog scan (not a subsystem). Mapping their skills to the user's by capability:

**Copy whole:**

> Their `domain-modeling` skill is a gap — nothing in the user's catalog does it. Self-contained, no repo-specific tooling. Copy the folder, adapt the frontmatter to the user's `name`/`description` conventions.

**Merge into mine:**

> Their `to-prd` overlaps the user's `to-tickets` Phase 03, but their "one open question per section, flagged inline" step is sharper than the user's batch-at-end questions. Port that step into `to-tickets`; do not add a second skill.

**Fold as axis:**

> `majidmanzarpour/threejs-game-skills` carries a per-asset-type generation skill per type. The user's `generate` engine already runs that process — fold each type in as a per-type file inside the `generate` skill (the axis split), not as new skills. (This is how `generate`'s per-type files were built.)

**Rejected:**

> Their `setup-matt-pocock-skills` bootstraps *their* repo layout on a new machine — tooling-specific to their setup, no analog worth porting.
