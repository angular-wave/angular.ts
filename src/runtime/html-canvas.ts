import type { RuntimeModule } from "../angular-runtime.ts";
import { _document, _htmlCanvas, _window } from "../injection-tokens.ts";
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
import { getRuntimeComposition } from "./custom-ng.ts";

/** Register experimental HTML-in-Canvas support in a custom runtime. */
export const htmlCanvasModule: RuntimeModule = (angular) => {
  const composition = getRuntimeComposition(angular);
  const state = createHtmlCanvasRuntimeState();

  composition.configRegistry.register(_htmlCanvas, (value) => {
    applyHtmlCanvasConfiguration(state, value as HtmlCanvasConfig);
  });
  composition.platform.addDisposer(() => {
    destroyHtmlCanvasRuntimeState(state);
  });

  return angular
    .createModule("ng.htmlCanvas", [])
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
