# `asc` — the App Store Connect CLI

`asc` ([rorkai/App-Store-Connect-CLI](https://github.com/rorkai/App-Store-Connect-CLI), MIT,
homebrew-core) drives the App Store Connect API from the terminal. It is the answer to "don't send
me to the web console" for everything after the build is signed: uploads, TestFlight, metadata,
screenshots, submission, review status.

`brew install asc`. Every command takes `--output json` (also `table`, and the default human form),
so parse the JSON rather than the table.

## Auth is an API key, and only an API key

Four variables, matching the App Store Connect API key you already have:

```
ASC_KEY_ID  ASC_ISSUER_ID  ASC_PRIVATE_KEY_PATH  ASC_KEY_TYPE=team
```

`asc auth status --output json` reports `environmentCredentialsComplete: true` when the set is
valid. A complete environment set wins over any stored profile, so there is nothing to log into and
no keychain entry to manage.

**`asc web` is out of scope — never use it.** That family authenticates with an Apple ID and
password over SRP (`internal/web/auth.go`) to reach what the public API cannot: creating an app
record, App Groups, Website Push IDs, tax reports. Handing a CLI an Apple ID password is a different
trust decision from handing it a scoped API key. If a task genuinely needs one of those, say so and
stop — do not reach for `asc web` to get unblocked.

## The families, in release order

| Command | What it covers |
| --- | --- |
| `asc apps` | list and inspect app records |
| `asc builds` | upload, watch processing, distribute to TestFlight |
| `asc testflight` | groups, testers, feedback, crashes, beta review |
| `asc versions` | App Store versions, attaching a build, release |
| `asc metadata` / `asc localizations` | description, keywords, what's-new, per-locale |
| `asc screenshots` | capture, frame, upload |
| `asc validate` | version readiness *before* submitting |
| `asc submit` / `asc review` | submission lifecycle, review details and history |
| `asc status` | one release-pipeline dashboard for an app |

Two high-level verbs wrap the above: `asc publish appstore --submit` and `asc publish testflight`
run a whole path; `asc release` stages one. `asc workflow` runs a multi-step `workflow.json`.

Also present: `signing`, `certificates`, `profiles`, `bundle-ids`, `devices`, `iap`,
`subscriptions`, `pricing`, `age-rating`, `reviews` (customer reviews), `analytics`, `finance`,
`xcode-cloud`, `webhooks`, `notify`.

`asc validate` before `asc submit` is the habit worth keeping — a rejection costs a review round
trip, and the queue is measured in days.

## Telemetry ships on by default

Every runtime, CI included. It is disclosed in detail and excludes flag values, bundle IDs, team and
issuer IDs, paths and response bodies — but it is on unless something turns it off.
`ASC_TELEMETRY_DISABLED=1`, `DO_NOT_TRACK=1`, or `asc telemetry disable` (local state) each do it;
`asc telemetry status --output json` names which one is winning via its `reason` field.

## Never run `asc install-skills`

It clones a pinned commit of the vendor's skills repo and copies 25 skills into the global
agent-skills directory. That is this catalog's directory. Read their skills if they are interesting;
do not let a release tool write into the skill tree.
