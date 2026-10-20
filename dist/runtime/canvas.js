import { ngCanvasDirective } from '../directive/canvas/canvas.js';
import { memoizeRuntimeModule } from './custom-ng.js';

/** Opt-in native canvas lifecycle support; supplies no drawing engine. */
const canvasModule = memoizeRuntimeModule((angular) => angular
    .createModule("ng.canvas", [])
    .directive("ngCanvas", ngCanvasDirective));

export { canvasModule, ngCanvasDirective };
