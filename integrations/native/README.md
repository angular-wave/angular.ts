# AngularTS Native Contracts

This directory is the platform-neutral source of truth for AngularTS Native.
Android, HarmonyOS, the JavaScript runtime, integrations, and documentation
must consume these contracts instead of maintaining platform copies.

| File | Purpose |
| --- | --- |
| `native-elements.json` | Element properties, methods, events, ownership, and accessibility |
| `native-capabilities.json` | Service methods, events, permissions, lifecycle, and errors |
| `platform-matrix.json` | Provider status and module ownership |
| `protocol/` | Versioned bridge schemas and portable fixtures |

Run `make native-contract-check` after changing a contract.

## Shared application models

JavaScript running in a native destination can use `angular.getModel(name)`
after app initialization to lazily retrieve a registered reactive model. Native
callbacks should mutate that proxy or call `restore(snapshot, { mode: "merge" })`
through the destination's existing JavaScript bridge. The same instance is used
by dependency injection, and updates reach every observing view in its app
context. Unknown names, ordinary services, and uninitialized or destroyed apps
throw runtime errors. Model lookup does not add a native bridge protocol method.
