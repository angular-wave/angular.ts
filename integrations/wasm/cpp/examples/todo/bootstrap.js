import { angular } from "@angular-wave/angular.ts";
import { wasmModule } from "@angular-wave/angular.ts/runtime/wasm";

const moduleName = "cppWasmTodo";
const scopeName = "cppTodo:main";
const wasmURL = new URL("./main.wasm", import.meta.url);
const installedWasmModule = wasmModule(angular);

let guest;

const writeU32 = (ptr, value) => {
  if (guest?.status !== "ready") {
    return;
  }
  new DataView(guest.exports.memory.buffer).setUint32(ptr, value, true);
};

const writeU64 = (ptr, value) => {
  writeU32(ptr, value >>> 0);
  writeU32(ptr + 4, Math.floor(value / 0x100000000) >>> 0);
};

const wasi = new Proxy(
  {},
  {
    get(_target, name) {
      if (name === "clock_res_get") {
        return (_id, resultPtr) => {
          writeU64(resultPtr, 0);
          return 0;
        };
      }
      if (name === "clock_time_get") {
        return (_id, _precision, resultPtr) => {
          writeU64(resultPtr, 0);
          return 0;
        };
      }
      if (name === "random_get") {
        return (ptr, len) => {
          if (guest?.status === "ready") {
            crypto.getRandomValues(
              new Uint8Array(guest.exports.memory.buffer, ptr, len),
            );
          }
          return 0;
        };
      }
      return () => 52;
    },
  },
);

const imports = {
  wasi_snapshot_preview1: wasi,
};

const writeString = (exports, value) => {
  const encoded = new TextEncoder().encode(value);
  const ptr = exports.ng_abi_alloc(encoded.byteLength);
  if (!ptr) {
    throw new Error("C++ Wasm allocation failed");
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
  .wasm("cppTodoGuest", { source: wasmURL, imports });

app.controller("cppTodoController", [
  "$scope",
  "cppTodoGuest",
  ($scope, resource) => {
    guest = resource;
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
