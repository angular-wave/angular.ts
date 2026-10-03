# Pulse for HarmonyOS

This Stage-model shell runs the shared Pulse AngularTS application through
`AngularNativeNavigation`. The shell contains no feed, form, routing, HTTP, or
rendering logic.

Start the shared server from the repository root:

```sh
node integrations/native/samples/pulse/server.mjs --port 4175
```

The default application URL is `http://127.0.0.1:4175`. For a physical or cloud
device, launch `PulseAbility` with a `pulseUrl` Want parameter containing the
HTTPS or LAN address that reaches the server. Credentials, non-HTTP schemes,
and URL fragments are rejected.

Build the sample after installing the official HarmonyOS command-line tools:

```sh
make -C integrations/harmonyos/samples/pulse compile
```
