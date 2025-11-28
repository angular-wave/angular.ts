import { instantiateWasm } from "../../shared/utils.js";

/**
 * @return {ng.Directive}
 */
export function ngWasmDirective() {
  return {
    async link($scope, _, $attrs) {
      $scope.$target[$attrs.as || "wasm"] = (
        await instantiateWasm($attrs.src)
      ).exports;
    },
  };
}
