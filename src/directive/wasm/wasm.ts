import { _wasm } from "../../injection-tokens.ts";
import { getNormalizedAttr } from "../../shared/dom.ts";

ngWasmDirective.$inject = [_wasm];

const unsafeWasmAliases = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Loads a WebAssembly resource and exposes it on the reactive scope.
 */
export function ngWasmDirective($wasm: ng.WasmService): ng.Directive {
  return {
    link($scope: ng.Scope, element: Element): void {
      const src = getNormalizedAttr(element, "src");
      const exportName = getNormalizedAttr(element, "as");

      if (typeof src !== "string") {
        return;
      }

      const alias = typeof exportName === "string" ? exportName : "wasm";

      if (unsafeWasmAliases.has(alias)) {
        throw new Error(
          `ng-wasm cannot publish the reserved alias '${alias}'.`,
        );
      }

      const loaded = $wasm.load({ source: src });

      $scope.$on("$destroy", () => {
        loaded.dispose();
      });

      ($scope as unknown as Record<string, unknown>)[alias] = loaded;
      void loaded.ready.catch(() => undefined);
    },
  };
}
