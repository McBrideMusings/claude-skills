# Host dependencies

A host dependency is anything the code expects to find on the user's machine or network
rather than in its own build. It fails at runtime, on someone else's machine, often with no
message, so it is a decision proposed in chat before any code relies on it.

| | Bundled dependency | Host dependency |
| --- | --- | --- |
| What | A library or SDK compiled in or shipped inside the product | A binary, app, service, OS permission, network layout or account the user must have |
| Who supplies it | The build | The user's environment |
| Fails | At build time, on the developer's machine | At runtime, on the user's machine |
| The risk | Supply chain, size | Setup steps nobody was told about |

Forms a host dependency takes: a binary found on `PATH` or at a fixed path; an installed app or
system service; an OS grant (Screen Recording, Full Disk Access); a network shape (a VPN, a
reverse proxy, a relay); an account or key; a runtime context (works from a terminal, fails
under launchd or in a sandbox).

## The default is none

Look for the language or OS facility first. An address is on a network interface; a file's
type is in its bytes; a port is in configuration. Running another program to learn something
the OS already exposes adds a dependency and a failure mode for nothing.

## Two shapes that pass

**An optional integration.** The core product works without it. The product detects it, lets
the user turn it on, and shows its state: found or missing, on or off, working or failing
with the reason. A coding-agent viewer that detects each installed agent and offers to wire
its hooks is this shape.

**The product's purpose.** The product exists to extend that thing, so it makes no sense
without it: a tool that extends a media server's database needs the media server. Even so,
the connection lives in settings, a failure shows in the product with its reason, and the
product keeps running while the dependency is unreachable.

Both shapes share three duties:

1. **Configuration, not code.** The path, address, name or account comes from settings or a
   config file. The code never hard-codes where the dependency lives.
2. **Visible state.** Settings, first-run setup, or a status/`doctor` command says whether it
   was found, why the product uses it and how to set it up. A log line alone is invisible.
3. **Real verification.** At least one check runs against the real dependency in the context
   the product really runs in. A stand-in proves the code's logic, not that the dependency
   behaves the way the code assumes.

## Bring your own connectivity

A product whose parts talk across machines need not ship a relay. It shows the connection
facts the user needs (address, port, a QR code to scan from the other device) and lets the
user's own network carry the traffic. A VPN-aware mode is an option on top: detected, shown,
and switchable, never the only path.

## The stranger test

Could someone on a fresh machine get the feature working from the README and the product's
own UI, with no knowledge of the author's setup? If not, a host dependency is hiding.
