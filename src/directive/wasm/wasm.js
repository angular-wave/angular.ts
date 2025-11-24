import { instantiateWasm } from "../../shared/utils.js";

export function ngWasmDirective() {
  return {
    link: async function ($scope, _, $attrs) {
      $scope.$target[$attrs.as || "wasm"] = await instantiateWasm($attrs.src);
    },
  };
}
