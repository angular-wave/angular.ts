import { _attributes } from "../../injection-tokens.ts";
import { instantiateWasm } from "../../shared/utils.ts";

ngWasmDirective.$inject = [_attributes];

/**
 * Loads a WebAssembly module and exposes its exports on `scope.$target`.
 */
export function ngWasmDirective(
  $attributes: ng.AttributesService,
): ng.Directive {
  return {
    link($scope: ng.Scope, element: Element): void {
      const src = $attributes.read(element, "src");
      const exportName = $attributes.read(element, "as");

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
