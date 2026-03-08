import { instantiateWasm } from "../../shared/utils.js";

export function ngWasmDirective(): ng.Directive {
  return {
    async link(
      $scope: ng.Scope,
      _: Element,
      $attrs: import("../../core/compile/attributes.ts").Attributes &
        Record<string, string>,
    ): Promise<void> {
      $scope.$target[$attrs.as || "wasm"] = (
        await instantiateWasm($attrs.src)
      ).exports;
    },
  };
}
