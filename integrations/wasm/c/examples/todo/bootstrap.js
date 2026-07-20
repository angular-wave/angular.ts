import { angular } from "@angular-wave/angular.ts";
import { wasmModule } from "@angular-wave/angular.ts/runtime/wasm";

const moduleName = "cWasmTodo";
const scopeName = "cTodo:main";
const wasmURL = new URL("./main.wasm", import.meta.url);
const installedWasmModule = wasmModule(angular);

const writeString = (exports, value) => {
  const encoded = new TextEncoder().encode(value);
  const ptr = exports.ng_abi_alloc(encoded.byteLength);
  if (!ptr) {
    throw new Error("C Wasm allocation failed");
  }

  new Uint8Array(exports.memory.buffer, ptr, encoded.byteLength).set(encoded);
  return { ptr, len: encoded.byteLength };
};

const callWithString = (exports, fn, value) => {
  const bytes = writeString(exports, value);
  try {
    fn(bytes.ptr, bytes.len);
  } finally {
    exports.ng_abi_free(bytes.ptr, bytes.len);
  }
};

const app = angular
  .module(moduleName, [installedWasmModule.name])
  .wasm("cTodoGuest", { source: wasmURL });

app.controller("cTodoController", [
  "$scope",
  "cTodoGuest",
  ($scope, guest) => {
    globalThis.__angularTsWasmConformance = {
      abi: guest._abi,
      get exports() {
        return guest.exports;
      },
      ready: guest.ready,
    };
    const ready = guest
      .bind($scope, { name: scopeName })
      .then(() => guest.exports.todo_bind());

    $scope.add = (title) =>
      void ready.then(() =>
        callWithString(guest.exports, guest.exports.todo_add, title || ""),
      );
    $scope.toggle = (index) =>
      void ready.then(() => guest.exports.todo_toggle(index));
    $scope.archive = () =>
      void ready.then(() => guest.exports.todo_archive_completed());

    $scope.$on("$destroy", () => {
      if (guest.status === "ready") guest.exports.todo_unbind();
    });
  },
]);

angular.bootstrap(document.body, [moduleName]);
