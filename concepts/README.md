# AppContext Model Runtime Concepts

These demos show the smallest useful shape for driving non-DOM runtimes from
AngularTS app-owned models.

Each demo follows the same pattern:

1. register shared state with `app.model(...)`;
2. inject that model into a controller;
3. let a runtime adapter render from the model;
4. update the model through normal AngularTS bindings.

Run them from the repo dev server so `/dist/angular-ts.umd.min.js` resolves:

```sh
make serve
```

Then open `/concepts/` for the grouped concept index.

Implemented groups:

- Browser drawing runtimes: Canvas, WebGL, WebGPU, HTML-in-Canvas, AudioGraph.
- 3D and rendering runtimes: Three.js, BabylonJS, PlayCanvas.
- Game runtimes: Cockpit Breach, Glyph Rush, Phaser, PixiJS, Excalibur, Unity FPS.
- Data visualization runtimes: ECharts.
- Low-level visualization runtimes: D3.
- CAD, design, and canvas object runtimes: Konva.
- Map runtimes: MapLibre GL.
- Worker, WASM, and data runtimes: Web Worker Compute, Shared WASM Module
  Worker, and SQLite WASM.
- Local-first and collaboration runtimes: Yjs.

The broader experiment set is tracked by the runnable demos in this directory.
