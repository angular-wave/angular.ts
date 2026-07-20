import { _htmlCanvas, _window, _document } from '../injection-tokens.js';
import { ngHtmlCanvasDirective, ngHtmlCanvasInvalidateDirective, ngHtmlCanvasSourceDirective } from '../directive/html-canvas/html-canvas.js';
import { applyHtmlCanvasConfiguration, destroyHtmlCanvasRuntimeState, createHtmlCanvasService, createHtmlCanvasRuntimeState } from '../services/html-canvas/html-canvas.js';

/** Register experimental HTML-in-Canvas support in a custom runtime. */
const htmlCanvasModule = (angular) => {
    const runtime = angular;
    const state = createHtmlCanvasRuntimeState();
    runtime._composition.configRegistry.register(_htmlCanvas, (value) => {
        applyHtmlCanvasConfiguration(state, value);
    });
    runtime._composition.platform.addDisposer(() => {
        destroyHtmlCanvasRuntimeState(state);
    });
    return angular
        .module("ng.htmlCanvas", [])
        .factory(_htmlCanvas, [
        _window,
        _document,
        (win, doc) => createHtmlCanvasService(state, win, doc),
    ])
        .directive("ngHtmlCanvas", ngHtmlCanvasDirective)
        .directive("ngHtmlCanvasInvalidate", ngHtmlCanvasInvalidateDirective)
        .directive("ngHtmlCanvasSource", ngHtmlCanvasSourceDirective);
};

export { htmlCanvasModule, ngHtmlCanvasDirective, ngHtmlCanvasInvalidateDirective, ngHtmlCanvasSourceDirective };
