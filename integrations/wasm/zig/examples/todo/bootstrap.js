import { angular } from "@angular-wave/angular.ts";
import { WasmScopeAbi } from "@angular-wave/angular.ts/runtime";

const moduleName = "zigWasmTodo";
const scopeName = "zigTodo:main";
const wasmURL = new URL("./main.wasm", import.meta.url);

const scopeAbi = new WasmScopeAbi();
const result = await WebAssembly.instantiateStreaming(fetch(wasmURL), {
  angular_ts: scopeAbi.imports(),
});
const exports = result.instance.exports;

scopeAbi.attach(exports);

const writeString = (value) => {
  const encoded = new TextEncoder().encode(value);
  const ptr = exports.ng_abi_alloc(encoded.byteLength);
  if (!ptr) {
    throw new Error("Zig Wasm allocation failed");
  }

  new Uint8Array(exports.memory.buffer, ptr, encoded.byteLength).set(encoded);
  return { ptr, len: encoded.byteLength };
};

const callWithString = (fn, value) => {
  const bytes = writeString(value);
  try {
    fn(bytes.ptr, bytes.len);
  } finally {
    exports.ng_abi_free(bytes.ptr, bytes.len);
  }
};

const app = angular.module(moduleName, []);

app.controller("zigTodoController", [
  "$scope",
  ($scope) => {
    const scope = scopeAbi.createScope($scope, { name: scopeName });

    $scope.add = (title) => callWithString(exports.todo_add, title || "");
    $scope.toggle = (index) => exports.todo_toggle(index);
    $scope.archive = () => exports.todo_archive_completed();

    $scope.$on("$destroy", () => {
      exports.todo_unbind();
      scopeAbi.unbind(scope.name);
    });

    exports.todo_bind();
  },
]);

angular.bootstrap(document.body, [moduleName]);
