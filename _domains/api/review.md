# api — review lens

Added by the `review` engine when `api` is in scope. Full reasoning in [design.md](design.md).

Check, in this order — the first three are the ones that cost real money when missed:

1. **A field was removed, renamed, or retyped in a response.** This breaks every existing
   caller. Adding is safe; subtracting is not. Flag it as a breaking change and ask whether
   the endpoint should be versioned instead.
2. **An action-taking endpoint with no idempotency key.** POST/PATCH/DELETE that mutates,
   where a timeout leaves the caller unable to tell whether it happened. Worse the higher
   the stakes — payments, external side effects, anything that emails a human.
3. **Offset pagination on a list that can grow unbounded.** `OFFSET n` degrades with depth;
   cursor pagination does not.
4. **An unbounded or unrated endpoint that does heavy work per call.** Anything that fans
   out, imports, exports, or walks a large collection needs a limit tighter than the
   default one.
5. **A response that always serves an expensive field.** If computing it costs a query or
   a network hop, it belongs behind `includes`.
6. **Auth that requires an OAuth handshake with no API-key path.** Blocks every caller who
   is not a professional engineer.
7. **An endpoint whose shape leaks a bad internal model** — the caller is made to walk a
   linked list, poll for a state machine, or reassemble a record the server could have
   returned whole. The finding belongs against the model, not the route.

Not findings: REST purity, HATEOAS, whether it should have been GraphQL. Goedecke's own
framing is that this advice is deliberately unfancy.
