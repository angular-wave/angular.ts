import type { RuntimeModule } from "../angular-runtime.ts";
import { ngCanvasDirective } from "../directive/canvas/canvas.ts";
import { memoizeRuntimeModule } from "./custom-ng.ts";

/** Opt-in native canvas lifecycle support; supplies no drawing engine. */
export const canvasModule: RuntimeModule = memoizeRuntimeModule((angular) =>
  angular
    .createModule("ng.canvas", [])
    .directive("ngCanvas", ngCanvasDirective),
);

export { ngCanvasDirective };
export type {
  CanvasFrame,
  CanvasRenderer,
  CanvasSize,
  CanvasSurface,
} from "../directive/canvas/canvas.ts";
