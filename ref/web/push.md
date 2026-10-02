# Web Push in the service worker

Read when writing or reviewing a push handler, a notification, or an offline cache in the same
service worker. Source: [Dr. Lex, Implementing Web Push Messages in 2024–2026](https://www.dr-lex.be/info-stuff/web-push.html),
a field report. Its platform bug claims (Safari, iOS 17.4.1, Firebase 10.10) are anecdotes tied
to those versions and are left out. Firebase-specific advice (token lifetime, topics) is not
covered here.

## The push handler

1. **Show a notification for every push, whatever the payload.** The page says Safari revokes
   notification permission when the service worker does not show one in time.
2. **Call `showNotification` first and await it**, then do other work. Never give `waitUntil` a
   promise that can reject: `Promise.all` rejects as soon as one member does and cancels
   nothing. Use `Promise.allSettled` for parallel work.
3. **Parse the payload defensively.** `'data' in event` is always true, so test `!event.data`.
   Wrap `.json()` in try/catch, and check that the result is an object, since valid JSON need
   not be one.
4. **Give every notification a unique tag** (a sequence number or timestamp). A reused tag
   silently replaces the earlier notification. `renotify: true` helps only on some platforms and
   only with a non-empty tag.
5. **Do not destructure `tag` out of the payload and spread the rest over defaults.** Every
   notification then inherits the default tag.
6. **Keep the push handler independent of the messaging library.** `importScripts` runs on every
   worker start and can fail. Wrap the import and initialisation in try/catch.
7. **Do not call `setTimeout` in a push handler.** The page says it suspends the worker.

## Permission and detection

- **Request notification permission from a user gesture.** On iOS it works only inside an
  installed PWA.
- **Feature-detect with `'PushManager' in window`**, parenthesised as
  `if (!('PushManager' in window))`. Do not sniff the user-agent string.

## Offline caching in the same worker

- **Handle `onerror` and `onblocked` on IndexedDB requests.** A promise that never settles keeps
  the worker alive and is worse than one that rejects.
- **Catch `cache.addAll()` failures in the install handler.** It is all-or-nothing: one 404 in
  the list fails the whole install, and the caching code can take notifications down with it.
