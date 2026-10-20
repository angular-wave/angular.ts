---
title: ng-canvas
description: 'Own native canvas sizing, drawing schedules, and view lifecycle.'
---

`ng-canvas` connects a native Canvas 2D or WebGL renderer to an AngularTS view.
Install the optional runtime module and declare a renderer on the canvas:

```ts
import { createAngular } from '@angular-wave/angular.ts/runtime';
import { canvasModule } from '@angular-wave/angular.ts/runtime/canvas';

const angular = createAngular({ modules: [canvasModule] });
```

Add your normal template, event, and model directives to a custom runtime as
needed. With the full runtime, call `canvasModule(angular)` and include
`ng.canvas` in your application's module dependencies.

```html
<canvas
  ng-canvas="chart.renderer"
  ng-canvas-watch="chart.model.value"
  aria-label="Value chart"
></canvas>
```

The renderer implements the documented
[`CanvasRenderer`](../../../typedoc/interfaces/CanvasRenderer.html) contract.
`mount(surface)` receives the native canvas, context, and an `invalidate()`
callback. Required `render(frame)` receives seconds-based `time` and `delta`
plus the current CSS and backing-store dimensions.

Optional hooks are `resize(size)`, `suspend()`, `resume()`, and `dispose()`. Set
`context` to `2d` (the default), `webgl`, or `webgl2`. `animate: true` opts into
continuous frames; the default renders only after mounting, resizing,
`ng-canvas-watch` changes, or explicit `surface.invalidate()` calls. Repeated
invalidations coalesce into one animation frame. Set `maxPixelRatio` to a
positive finite number to limit backing-store resolution.

## Sizing and drawing

Give the canvas stable CSS dimensions or an explicit CSS aspect ratio. The
directive measures the canvas border box and owns its backing-store `width` and
`height`; application code owns drawing coordinates and context transforms. For
exact drawable dimensions, put borders and padding on a wrapper.

Changing backing-store dimensions resets native drawing state. Use `resize` or
`render` to restore transforms, styles, and WebGL viewport state. Zero-sized
canvases skip rendering. ResizeObserver and window resize events request
redraws. Continuous renderers also detect pixel-ratio changes each frame.

Keep contexts, GPU resources, and audio handles in renderer closures. Mark a
renderer with `$nonscope: true` if it holds native resources or mutable runtime
internals; keep meaningful display state in reactive models.

## Lifecycle and failures

Replacing the renderer disposes the previous one. View retention with
`pause: 'schedulers'` cancels pending frames and calls `suspend`; resume calls
`resume`, requests a frame, and resets `delta` to zero. Scope destruction
cancels frames, disconnects observers, removes listeners, and calls `dispose`.

Initialization and drawing failures stop the renderer and report through
`$exceptionHandler`. Unavailable contexts fail explicitly. The directive
supplies no rendering engine or context fallback. WebGL applications own GPU
context-loss recovery through their renderer and normal event directives.

This module is separate from the experimental HTML-in-Canvas module. It is
excluded from the default runtime and requires no experimental browser APIs.

## Examples

The chart below uses redraw-on-change. The repository's `concepts/flappy-bird/`
uses continuous frames, a reactive session machine, and an injectable game
service. `concepts/canvas/` provides a second redraw-on-change example with
position and color controls.

{{< showdemo src="examples/canvas/chart.html" >}}

{{< showhtml src="examples/canvas/chart.html" >}}

{{< showjs src="examples/canvas/chart.js" >}}
