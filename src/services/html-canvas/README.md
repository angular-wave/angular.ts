# HTML-in-Canvas Internals

This directory owns the optional AngularTS integration contract for native
HTML-in-Canvas rendering. The implementation is active when explicitly
configured and when the browser exposes the native primitives. AngularTS does
not provide a fallback renderer.

HTML-in-Canvas is not part of the default AngularTS runtime. It is available
only to custom builds that explicitly install `htmlCanvasModule`.

## Responsibilities

- Define the typed `$htmlCanvas` config surface.
- Detect native HTML-in-Canvas primitives without creating a fallback renderer.
- Register canvas root, source, and invalidation directives.
- Keep the integration out of the default runtime and disabled unless a custom
  build opts in.
- Fail fast when active config is used on unsupported runtimes.
- Preserve the no-fallback contract for the experimental browser API.

## Public Surface

- `HtmlCanvasConfig`: typed config accepted by
  `NgModule.config({ $htmlCanvas: ... })`.
- `ng.HtmlCanvasConfig`: namespace alias for generated and global typings.

- `HtmlCanvasService`: injectable `$htmlCanvas` runtime owner for support,
  root/source registration, and invalidation.

The runtime directives are:

- `ng-html-canvas`
- `ng-html-canvas-source`
- `ng-html-canvas-invalidate`

Using those directives throws when `$htmlCanvas` is disabled or when the
configured native mode is unsupported.

`ng-html-canvas-source` accepts numeric `x`, `y`, `width`, and `height`
attributes, plus `data-*` equivalents. AngularTS reads those values at draw
time, so interpolated attributes can move or resize a source without requiring
manual service calls.

Custom builds opt in through the runtime slice:

```ts
import { createAngular } from "@angular-wave/angular.ts/runtime";
import { htmlCanvasModule } from "@angular-wave/angular.ts/runtime/html-canvas";

const angular = createAngular({
  modules: [htmlCanvasModule],
});
```

## Core Model

The current model is native-only:

1. A custom runtime installs `htmlCanvasModule`.
2. Application code declares `$htmlCanvas` config.
3. `enabled: false` is accepted and produces no runtime work.
4. `enabled: true` requires the configured native mode and fails fast when
   unsupported.
5. `enabled: "auto"` activates only when the configured native mode is
   available.
6. Directive usage registers a canvas root, direct source children, and
   invalidation scheduling through the native `paint` lifecycle.

Important invariants:

- AngularTS must not emulate HTML-in-Canvas.
- Active config must not silently degrade to DOM-only rendering.
- The source DOM tree remains normal Angular-bound DOM when runtime support is
  eventually enabled.

## Lifecycle Contract

- Construction does not touch browser APIs.
- Runtime support detection is explicit and side-effect-light.
- Disabled config creates no provider, service, renderer, or scheduler.
- Active config is accepted during module config and enforced by `$htmlCanvas`
  at runtime.
- Runtime activation must remain explicit and module-owned.

## Runtime Support Gate

`getHtmlCanvasRuntimeSupport(...)` detects the experimental primitives described
by the WICG/Chromium shape:

- `<canvas layoutsubtree>`
- canvas `paint` event
- 2D `drawElementImage(...)`
- WebGL `texElementImage2D(...)`
- WebGPU `copyElementImageToTexture(...)`

`assertHtmlCanvasRuntimeSupported(...)` is the runtime gate for active config.
It allows disabled config, accepts active config only when the requested native
mode exists, and throws with the no-fallback error otherwise.

## Reactivity Contract

- `$htmlCanvas` does not create app state.
- Source layers use normal Angular binding and scope semantics.
- Redraw scheduling is root-owned DOM work, not app model work.
- Source mutations and ResizeObserver changes invalidate the owning root.
- Native paint events that report changed descendants redraw the owning source
  rather than requiring the changed element to be the source root itself.

## Interaction Strategy

Angular-bound controls remain normal DOM controls inside the canvas fallback
tree. AngularTS does not synthesize event coordinates, clone controls, or replay
DOM state into a framework-owned canvas tree. Native HTML-in-Canvas owns hit
testing, accessibility alignment, and rendered output. AngularTS owns the
source DOM binding, scope lifecycle, and explicit invalidation boundary.

That means standard directives such as `ng-click` and `ng-model` bind to the
source DOM tree. The rendering slice only schedules redraw/invalidation work; it
does not replace Angular event or model semantics.

## Policy Contract

- Default policy is disabled.
- No fallback renderer is provided.
- `throwOnUnsupported` is required for active config.
- `requireFlag` defaults to strict feature-flag expectations while the browser
  API is experimental.
- Enterprise interaction policy belongs in normal application code around the
  source DOM controls. AngularTS should not create a separate canvas event
  policy while native HTML-in-Canvas owns hit testing and control activation.

## Dependency Replacement Contract

- This replaces ad hoc canvas DOM rendering glue only after the runtime slice
  exists.
- It builds on native HTML-in-Canvas browser behavior.
- It does not replace canvas/WebGL/WebGPU engines.
- Native browser failure remains visible to application code.

## Failure Contract

- Active config fails synchronously when the configured mode is unsupported and
  `throwOnUnsupported` is true.
- Directive usage fails synchronously while the feature is disabled.
- Unsupported-browser failures are clear runtime errors.
- Fallback rendering is not allowed.

## Executable Samples

- `docs/static/examples/html-canvas/html-canvas.html` shows config and real
  `<canvas layoutsubtree>` source markup.
- The same docs sample includes a policy-oriented interaction panel where
  `ng-click` remains normal source-DOM behavior and application code accepts or
  blocks the operation.
- `src/services/html-canvas/html-canvas.test.ts` loads the docs sample and the
  unit spec so the runtime contract stays executable.
- `concepts/html-in-canvas/` demonstrates model-backed controls inside a native
  HTML-in-Canvas source tree.
