import { _compile, _parse } from "../../injection-tokens.ts";
import {
  deProxy,
  isNullOrUndefined,
  isString,
  directiveNormalize,
  stringify,
  getNodeName,
} from "../../shared/utils.ts";
import { getNormalizedAttr, hasNormalizedAttr } from "../../shared/dom.ts";

interface DirectBindingScope extends ng.Scope {
  watch(
    expression: string,
    listener: ng.ListenerFn,
    lazy?: boolean,
    directLeaf?: boolean,
  ): (() => unknown) | undefined;
}

/** Binds the watched expression as plain text content. */
export function ngBindDirective(): ng.Directive {
  return {
    link(scope: ng.Scope, element: HTMLElement): void {
      if (getNodeName(element) === "script")
        throw new TypeError(
          "Use ng-prop-text with a scriptPolicy for script source.",
        );
      const expression = getNormalizedAttr(element, "ngBind");

      if (!isString(expression)) return;

      (scope as DirectBindingScope).watch(
        expression,
        (value: unknown) => {
          const text = stringify(deProxy(value));

          element.textContent = isString(text) ? text : "";
        },
        hasNormalizedAttr(element, "lazy"),
        true,
      );
    },
  };
}

/** Binds the interpolated template value as plain text content. */
export function ngBindTemplateDirective(): ng.Directive {
  return {
    link(scope: ng.Scope, element: HTMLElement): void {
      if (getNodeName(element) === "script")
        throw new TypeError(
          "Use ng-prop-text with a scriptPolicy for script source.",
        );
      const syncTemplate = () => {
        const value = getNormalizedAttr(element, "ngBindTemplate");

        element.textContent = isNullOrUndefined(value) ? "" : value;
      };

      syncTemplate();
      const observerName = directiveNormalize("ngBindTemplate");
      const observer = new MutationObserver((mutations) => {
        for (let i = 0; i < mutations.length; i++) {
          const attributeName = mutations[i].attributeName;

          if (
            attributeName &&
            directiveNormalize(attributeName) === observerName
          ) {
            syncTemplate();
          }
        }
      });
      observer.observe(element, { attributes: true });

      let deregisterDestroy: (() => void) | undefined = scope.on(
        "$destroy",
        deregister,
      );

      function deregister(): void {
        observer.disconnect();
        deregisterDestroy?.();
        deregisterDestroy = undefined;
      }
    },
  };
}

ngBindHtmlDirective.$inject = [_parse, _compile];
/** Binds trusted HTML into the element while still validating the expression. */
export function ngBindHtmlDirective(
  $parse: ng.ParseService,
  $compile: ng.CompileService,
): ng.Directive {
  return {
    restrict: "A",
    compile(tElement: Element) {
      if (getNodeName(tElement) === "script")
        throw new TypeError(
          "Use ng-prop-text with a scriptPolicy for script source.",
        );
      const expression: unknown = getNormalizedAttr(tElement, "ngBindHtml");

      if (!isString(expression)) return () => undefined;

      $parse(expression); // checks for interpolation errors

      return (
        /** Watches the expression and writes the resulting HTML into the element. */
        (scope: ng.Scope, element: HTMLElement): void => {
          (scope as DirectBindingScope).watch(
            expression,
            (val: unknown) => {
              const html = $compile._prepareHtml(
                val,
                element.ownerDocument.defaultView ?? window,
              );

              // TypeScript's DOM declarations do not include TrustedHTML yet.
              element.innerHTML = html as string;
            },
            false,
            true,
          );
        }
      );
    },
  };
}
