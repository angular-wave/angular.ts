import { _parse } from "../../injection-tokens.ts";
import {
  arrayFrom,
  createErrorFactory,
  deleteProperty,
  deProxy,
  isString,
} from "../../shared/utils.ts";
import { getNormalizedAttr } from "../../shared/dom.ts";

const ngElError = createErrorFactory("ngEl");

type ElementAssignFn = (scope: ng.Scope, value: Element | null) => unknown;

ngElDirective.$inject = [_parse];

/**
 * Exposes the current element on `scope.$target` or an assignable expression.
 */
export function ngElDirective($parse: ng.ParseService): ng.Directive {
  return {
    restrict: "A",
    compile(tElement: Element) {
      const expr = getNormalizedAttr(tElement, "ngEl");
      const expression = isString(expr) ? expr.trim() : "";
      const usesExpression = !!expression && !isSimpleElementKey(expression);
      const assign = usesExpression
        ? createElementAssignment($parse, expression)
        : undefined;

      return (scope: ng.Scope, element: HTMLElement): void => {
        const cleanup = assign
          ? bindExpressionElement(scope, element, assign)
          : bindKeyedElement(scope, element, expression || element.id);

        registerElementCleanup(scope, element, cleanup);
      };
    },
  };
}

function createElementAssignment(
  $parse: ng.ParseService,
  expression: string,
): ElementAssignFn {
  const getter = $parse(expression);
  const setter =
    (getter._assign as ElementAssignFn | undefined) ??
    function (): never {
      throw ngElError(
        "nonassign",
        'Expression in ngEl="{0}" is non-assignable!',
        expression,
      );
    };

  return setter;
}

function bindExpressionElement(
  scope: ng.Scope,
  element: Element,
  assign: ElementAssignFn,
): () => void {
  const targetScope = deProxy<unknown>(scope) as ng.Scope;

  assign(targetScope, element);

  return () => {
    assign(targetScope, null);
  };
}

function bindKeyedElement(
  scope: ng.Scope,
  element: Element,
  key: string,
): () => void {
  const target = scope.$target as Record<string, Element | undefined>;

  target[key] = element;

  return () => {
    deleteProperty(target, key);
  };
}

function registerElementCleanup(
  scope: ng.Scope,
  element: Element,
  cleanup: () => void,
): void {
  let cleaned = false;
  let observer: MutationObserver | undefined = undefined;
  let removeDestroyListener: () => void = () => undefined;

  const cleanupOnce = () => {
    if (cleaned) {
      return;
    }

    cleaned = true;
    cleanup();
    removeDestroyListener();
    observer?.disconnect();
  };

  removeDestroyListener = scope.$on("$destroy", cleanupOnce);
  const parent = element.parentNode;

  if (!parent) {
    return;
  }

  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      arrayFrom(mutation.removedNodes).forEach((removedNode: Node) => {
        if (removedNode === element) {
          cleanupOnce();
        }
      });
    }
  });

  observer.observe(parent, { childList: true });
}

function isSimpleElementKey(expression: string): boolean {
  return /^[$A-Z_a-z][$\w]*$/.test(expression);
}
