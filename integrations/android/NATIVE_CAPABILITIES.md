# Native Capability Catalog

This file is generated from `native-capabilities.json`. Edit the catalog and run
`make -C integrations/android generate-native-capabilities`.

| Capability | Artifact | Availability | Thread | Lifecycle | Errors | Permission | Methods | Events |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `navigation` | `navigation` | required | main | destination | `native-bridge-v1` | none | `status`, `push`, `replace`, `pop`, `modal`, `deep-link`, `external` | `change` |
| `platform` | `navigation` | required | main | destination | `native-bridge-v1` | none | `status` | none |
| `permissions` | `navigation` | required | main | destination | `native-bridge-v1` | none | `status`, `request` | none |
| `clipboard` | `navigation` | device | main | destination | `native-bridge-v1` | none | `read`, `write` | none |
| `sharing` | `navigation` | device | main | destination | `native-bridge-v1` | none | `share` | none |
| `intents` | `navigation` | device | main | destination | `native-bridge-v1` | none | `open` | none |
| `haptics` | `navigation` | device | main | destination | `native-bridge-v1` | none | `perform` | none |
| `connectivity` | `navigation` | required | main | destination | `native-bridge-v1` | `android.permission.ACCESS_NETWORK_STATE` | `status`, `watch`, `unwatch` | `change` |
| `lifecycle` | `navigation` | required | main | destination | `native-bridge-v1` | none | `status`, `watch`, `unwatch` | `change` |
| `window` | `navigation` | required | main | destination | `native-bridge-v1` | none | `status`, `watch`, `unwatch` | `change` |
| `notifications` | `navigation` | device | main | destination | `native-bridge-v1` | `android.permission.POST_NOTIFICATIONS` | `status`, `open-settings` | none |
| `geolocation` | `navigation` | device | main | destination | `native-bridge-v1` | `android.permission.ACCESS_FINE_LOCATION` | `status`, `current` | none |
| `biometrics` | `navigation` | device | main | destination | `native-bridge-v1` | none | `status` | none |
| `camera` | `navigation` | device | main | destination | `native-bridge-v1` | `android.permission.CAMERA` | `status`, `capture` | none |
| `files` | `navigation` | device | main | destination | `native-bridge-v1` | none | `status`, `open`, `upload` | `progress` |
| `credentials` | `credentials` | optional | main | destination | `native-bridge-v1` | none | `status`, `get`, `create-password`, `create-passkey`, `clear` | none |
| `media` | `media` | optional | main | destination | `native-bridge-v1` | none | `status`, `load`, `play`, `pause`, `stop`, `seek`, `release` | none |
