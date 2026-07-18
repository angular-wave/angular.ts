import { _htmlCanvas } from "../../injection-tokens.ts";
import type { DirectiveLinkFn } from "../../interface.ts";
import type {
  HtmlCanvasService,
  HtmlCanvasSourceOptions,
} from "../../services/html-canvas/html-canvas.ts";

function getCanvasRoot(element: Element): HTMLCanvasElement {
  if (
    typeof HTMLCanvasElement !== "undefined" &&
    element instanceof HTMLCanvasElement
  ) {
    return element;
  }

  const parent = element.parentElement;

  if (
    typeof HTMLCanvasElement !== "undefined" &&
    parent instanceof HTMLCanvasElement
  ) {
    return parent;
  }

  throw new Error(
    "HTML-in-Canvas source and invalidation directives require a parent canvas root.",
  );
}

function readNumberAttribute(
  element: Element,
  name: keyof HtmlCanvasSourceOptions,
): number | undefined {
  const value =
    element.getAttribute(name) ?? element.getAttribute(`data-${name}`);

  if (value === null || value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function createHtmlCanvasSourceOptions(
  element: Element,
): HtmlCanvasSourceOptions {
  return {
    get x() {
      return readNumberAttribute(element, "x");
    },
    get y() {
      return readNumberAttribute(element, "y");
    },
    get width() {
      return readNumberAttribute(element, "width");
    },
    get height() {
      return readNumberAttribute(element, "height");
    },
  };
}

ngHtmlCanvasDirective.$inject = [_htmlCanvas];

export function ngHtmlCanvasDirective(
  $htmlCanvas: HtmlCanvasService,
): ng.Directive {
  return {
    restrict: "A",
    compile(element: HTMLCanvasElement): DirectiveLinkFn<unknown> {
      if (
        typeof HTMLCanvasElement !== "undefined" &&
        element instanceof HTMLCanvasElement
      ) {
        element.setAttribute("layoutsubtree", "true");
      }

      return (scope: ng.Scope, linkedElement: Element) => {
        const root = $htmlCanvas.registerRoot(
          linkedElement as HTMLCanvasElement,
        );
        scope.$on("$destroy", () => {
          root.dispose();
        });
      };
    },
  };
}

ngHtmlCanvasSourceDirective.$inject = [_htmlCanvas];

export function ngHtmlCanvasSourceDirective(
  $htmlCanvas: HtmlCanvasService,
): ng.Directive {
  return {
    restrict: "A",
    link(scope: ng.Scope, element: Element) {
      const destroy = $htmlCanvas.registerSource(
        getCanvasRoot(element),
        element,
        createHtmlCanvasSourceOptions(element),
      );

      scope.$on("$destroy", destroy);
    },
  };
}

ngHtmlCanvasInvalidateDirective.$inject = [_htmlCanvas];

export function ngHtmlCanvasInvalidateDirective(
  $htmlCanvas: HtmlCanvasService,
): ng.Directive {
  return {
    restrict: "A",
    link(_scope: ng.Scope, element: Element) {
      $htmlCanvas.invalidate(getCanvasRoot(element));
    },
  };
}
