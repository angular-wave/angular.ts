import { instantiateWasm } from "../../shared/utils.ts";
import { getNormalizedAttr } from "../../shared/dom.ts";

/**
 * Loads a WebAssembly module and exposes its exports on `scope.$target`.
 */
export function ngWasmDirective(): ng.Directive {
  return {
    link($scope: ng.Scope, element: Element): void {
      const src = getNormalizedAttr(element, "src");
      const exportName = getNormalizedAttr(element, "as");

      if (typeof src !== "string") {
        return;
      }

      void (async () => {
        const target = $scope.$target as Record<string, unknown>;

        target[typeof exportName === "string" ? exportName : "wasm"] = (
          await instantiateWasm(src)
        ).exports;
      })();
    },
  };
}
