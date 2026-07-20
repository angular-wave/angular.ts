import { angular } from "@angular-wave/angular.ts";
import { wasmModule } from "@angular-wave/angular.ts/runtime/wasm";

const moduleName = "assemblyScriptWasmTodo";
const scopeName = "assemblyScriptTodo:main";
const wasmURL = new URL("./main.wasm", import.meta.url);
const installedWasmModule = wasmModule(angular);

const imports = {
  env: {
    abort(_messagePtr, _fileNamePtr, line, column) {
      throw new Error(`AssemblyScript abort at ${line}:${column}`);
    },
  },
};

const writeString = (exports, value) => {
  const encoded = new TextEncoder().encode(value);
  const ptr = exports.ng_abi_alloc(encoded.byteLength);

  if (!ptr) {
    throw new Error("AssemblyScript Wasm allocation failed");
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
  .wasm("assemblyScriptTodoGuest", { source: wasmURL, imports });

app.controller("assemblyScriptTodoController", [
  "$scope",
  "assemblyScriptTodoGuest",
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
