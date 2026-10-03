# HarmonyOS Security Model

AngularTS Native treats the page, HarmonyOS shell, server, custom HAR
providers, and external applications as separate trust boundaries.

## Bridge calls

- Every destination receives a cryptographically random session token.
- Messages require protocol version 1, the active token, and the original
  approved HTTP or HTTPS origin.
- Messages larger than 256 KiB are rejected before JSON dispatch.
- Targets, methods, elements, properties, events, and types are allowlisted.
- Errors do not expose native exceptions or stack traces.
- Requests, subscriptions, files, media, and nodes are destination-owned.

## Platform rules

- Availability and permission state are reported separately.
- External operations use allowlisted schemes and abilities.
- Files cross the bridge through safe content handles, not filesystem paths.
- Credentials, tokens, bridge secrets, and results are not stored in restored
  route or ability state.
- Third-party providers can access only their declared contracts.
- Production pages use HTTPS and release builds disable ArkWeb debugging.
