import type { RuntimeModule } from "../angular-runtime.ts";
import { _document, _htmlCanvas, _window } from "../injection-tokens.ts";
import type { RuntimeComposition } from "../core/composition/runtime-composition.ts";
import {
  ngHtmlCanvasDirective,
  ngHtmlCanvasInvalidateDirective,
  ngHtmlCanvasSourceDirective,
} from "../directive/html-canvas/html-canvas.ts";
import {
  applyHtmlCanvasConfiguration,
  createHtmlCanvasRuntimeState,
  createHtmlCanvasService,
  destroyHtmlCanvasRuntimeState,
  type HtmlCanvasConfig,
} from "../services/html-canvas/html-canvas.ts";

/** Register experimental HTML-in-Canvas support in a custom runtime. */
export const htmlCanvasModule: RuntimeModule = (angular) => {
  const runtime = angular as ng.Angular & {
    _composition: RuntimeComposition;
  };
  const state = createHtmlCanvasRuntimeState();

  runtime._composition.configRegistry.register(_htmlCanvas, (value) => {
    applyHtmlCanvasConfiguration(state, value as HtmlCanvasConfig);
  });
  runtime._composition.platform.addDisposer(() => {
    destroyHtmlCanvasRuntimeState(state);
  });

  return angular
    .module("ng.htmlCanvas", [])
    .factory(_htmlCanvas, [
      _window,
      _document,
      (win: Window, doc: Document) => createHtmlCanvasService(state, win, doc),
    ])
    .directive("ngHtmlCanvas", ngHtmlCanvasDirective)
    .directive("ngHtmlCanvasInvalidate", ngHtmlCanvasInvalidateDirective)
    .directive("ngHtmlCanvasSource", ngHtmlCanvasSourceDirective);
};

export {
  ngHtmlCanvasDirective,
  ngHtmlCanvasInvalidateDirective,
  ngHtmlCanvasSourceDirective,
};
