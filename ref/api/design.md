# api — design

Distilled from Sean Goedecke, *Everything I know about good API design*
(<https://www.seangoedecke.com/good-api-design/>, read 2026-08-23). Quotes and claims
below are his; anything marked **[local]** is not from the article.

## The governing tension

**Good APIs are boring.** "An API that's interesting is a bad API." The builder sees a
product they polish; the caller sees a tool standing between them and their actual goal.
Every second spent thinking about the API is wasted. The target: the caller can guess how
it works before reading the docs.

Against that pulls the fact that **APIs are hard to change**. Each breaking change makes
users seriously consider a competitor with a more stable interface. So: simplest possible
interface, balanced against the flexibility to survive without breaking.

## We do not break userspace

- **Additive is safe.** New fields in a response are fine. A consumer that blows up on
  unexpected fields is the one behaving irresponsibly — sensible typed JSON parsers ignore
  them by default.
- **Removing a field, changing its type, or restructuring the response is not safe.**
- **When you must, version.** Serve old and new simultaneously; `/v1/` in the path is the
  easy way (OpenAI's `v1/chat/completions` leaves room for a `v2`). Stripe does it in a
  header with a per-account default instead.
- **Migration takes months to years.** Banners, docs, emails, response headers — and you
  will still get angry users the day you remove the old version. Do it anyway, and do what
  you can about it.

## Idempotency

The rule: **any request that takes action carries an idempotency key.** A 422 tells you
validation failed before anything happened. A 500 or a timeout tells you nothing — the
error may have fired after the write. Retrying blind risks a duplicate comment, a duplicate
transfer, a duplicate dose.

Mechanism: the caller supplies a string; the server checks whether it has seen it, acts
only if not, then records it. Storage in Redis or similar is fine — Goedecke notes the
Hacker News objection that Redis and your database cannot be updated atomically together,
and answers that bolting Redis onto a non-idempotent API is still far better than nothing.
He also concedes he should have mentioned `PUT`, while doubting the verb makes anything
inherently more idempotent than `POST`.

Internal APIs get to relax most of these rules — fewer consumers, and you can ship code for
all of them — **but not this one.** Internal APIs still cause incidents and still need
idempotency on key operations.

## Pagination

Offset pagination (`?page=2`, `?offset=20`) is trivial to implement and degrades: a
relational database counts through the offset every time, so page N gets slower as N grows,
and by the hundreds of thousands it is a real problem.

**Cursor pagination** instead: return the last id from the previous page and query
`WHERE id > cursor ORDER BY id LIMIT n`. Equally fast at any depth.

## Safety and rate limiting

**"Any operation you expose via an API can be called at the speed of code."** A user
clicking through your UI is limited by their hands; a script is not.

- Rate-limit everything, with **tighter limits on expensive operations**.
- Keep a killswitch to disable the API for one customer when they are hammering you.
- Return `X-Limit-Remaining` and `Retry-After` so well-behaved clients can back off — which
  also lets you set stricter limits than you otherwise could.
- Be wary of endpoints that do a lot of work per request. Goedecke's example: a Zendesk
  fan-out-notification endpoint that a third party turned into a chat system.

Real integrations misbehave in mundane ways — creating and deleting the same record
hundreds of times a minute, polling `/index` with no delay forever, importing without
backing off on errors.

## Authentication

**Support a long-lived API key.** Yes, short-lived credentials are more secure, and you
should probably offer OAuth too. It does not matter: every integration starts life as a
simple script.

The reason is who your users are. **Many are not professional engineers** — salespeople,
PMs, students, hobbyists. If getting started requires an OAuth handshake, a large fraction
of them never do.

## Optional fields, and GraphQL

**Make expensive parts of a response optional and off by default.** If subscription status
costs a backend call, gate it behind `include_subscription`, or a general `includes` array.

Goedecke dislikes GraphQL — impenetrable to non-engineers, arbitrary caller-crafted queries
complicate caching and multiply edge cases, and the backend implementation is fiddlier than
REST. He holds this loosely (~6 months of GraphQL experience) and frames `includes` as
getting most of the benefit without the cost.

## The product constraint

**A technically-poor product makes an elegant API nearly impossible.** API design tracks a
product's basic resources — Jira's issues, projects, users. If those are modelled awkwardly,
the API inherits it. His example: comments stored as an in-memory linked list, producing
either `GET /comments/1 -> { next_comment_id: 2 }` or a nested horror. The fix is in the
product's model, not the endpoint.

The reverse also holds: **API quality is a marginal feature.** "If your product is valuable
enough, users will flock to even a terrible API" — Facebook and Jira are his examples,
integrated with everywhere despite appalling APIs, because the product is the thing wanted
and the API is only the layer in front of it. Quality decides anything only when a consumer
is choosing between two basically-equivalent products. The *presence* of an API is a
different story: technical users demand some way to integrate via code, so having none is a
real problem even where polish would not be.
