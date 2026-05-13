import { instantiateWasm } from "../../shared/utils.ts";
import type { Attributes } from "../../core/compile/attributes.ts";

/**
 * Loads a WebAssembly module and exposes its exports on `scope.$target`.
 */
export function ngWasmDirective(): ng.Directive {
  return {
    link(
      $scope: ng.Scope,
      _: Element,
      $attrs: Attributes & Record<string, string>,
    ): void {
      const attrValues = $attrs as { as?: unknown; src?: unknown };

      const { src } = attrValues;

      const exportName: unknown = attrValues.as;

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
