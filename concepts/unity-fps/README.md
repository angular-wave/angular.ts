# AngularTS Unity FPS Concept

This concept hosts a Unity WebGL FPS scene from an AngularTS app model.

AngularTS owns:

- player HUD state;
- pause/reload/heal controls;
- settings such as mouse sensitivity;
- event projection into DOM;
- player snapshot telemetry through `unityPlayerModel.$sync(...)`.

Unity owns:

- FPS camera and movement;
- target hit testing;
- ammo and damage simulation;
- render loop and pointer-lock interaction.

The bridge writes runtime state into `unityPlayerModel`. The model then
synchronizes through the injectable `unityTelemetrySyncTarget`, proving the
`runtime -> model -> sync target -> DOM` path without `scope.$watch` glue or a
runtime-specific AngularTS primitive.

The host page falls back to a mock runtime when `Build/unity-fps.loader.js` is
not present. Build the real Unity WebGL runtime with:

```sh
./build-unity-webgl.sh
```

Then run the repo server:

```sh
make serve
```

Open `/concepts/unity-fps/`.
