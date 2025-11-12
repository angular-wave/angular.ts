export function ngWasmDirective() {
  return {
    link: async function ($scope, $element, $attrs) {
      try {
        const response = await fetch($attrs.src);
        const bytes = await response.arrayBuffer();
        const { instance } = await WebAssembly.instantiate(bytes);
        const exports = instance.exports;

        $scope["demo"] = exports;
      } catch (err) {
        console.error("[wasm-loader] Failed to load:", err);
        $element.addClass("wasm-error");
      }
    },
  };
}
