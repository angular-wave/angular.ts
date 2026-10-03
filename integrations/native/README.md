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
