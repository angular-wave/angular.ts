import { instantiateWasm } from "../../shared/utils.ts";
import type { Attributes } from "../../core/compile/attributes.ts";

/**
 * Loads a WebAssembly module and exposes its exports on `scope.$target`.
 */
export function ngWasmDirective(): ng.Directive {
  return {
    async link(
      $scope: ng.Scope,
      _: Element,
      $attrs: Attributes & Record<string, string>,
    ): Promise<void> {
      $scope.$target[$attrs.as || "wasm"] = (
        await instantiateWasm($attrs.src)
      ).exports;
    },
  };
}
