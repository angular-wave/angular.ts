# Pulse

Pulse is the shared AngularTS Native sample application used by the Android and
HarmonyOS shells. Its HTML, controller, routes, HTTP server, design tokens,
test data, media, and tests are platform-neutral. Platform projects may provide
only application packaging, signing, and native host configuration.

Run the development server from the repository root:

```sh
node integrations/native/samples/pulse/server.mjs --port 4175
```

The application uses `ng-app` auto-bootstrap, AngularTS services, and the
shared native element and capability contracts. Do not add Android, HarmonyOS,
Kotlin, or ArkTS application behavior here.
