import { angular } from "@angular-wave/angular.ts";
import { wasmModule } from "@angular-wave/angular.ts/runtime/wasm";

const moduleName = "zigWasmTodo";
const scopeName = "zigTodo:main";
const wasmURL = new URL("./main.wasm", import.meta.url);
const installedWasmModule = wasmModule(angular);

const runCommand = (name, command, ...args) => {
  if (command(...args) !== 1) {
    throw new Error(`Zig Wasm command '${name}' failed`);
  }
};

const app = angular
  .module(moduleName, [installedWasmModule.name])
  .wasm("zigTodoGuest", { source: wasmURL });

app.controller("zigTodoController", [
  "$scope",
  "zigTodoGuest",
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
      .then(() => runCommand("bind", guest.exports.todo_bind));

    $scope.add = () =>
      void ready.then(() => runCommand("add", guest.exports.todo_add));
    $scope.toggle = (index) =>
      void ready.then(() =>
        runCommand("toggle", guest.exports.todo_toggle, index),
      );
    $scope.archive = () =>
      void ready.then(() =>
        runCommand("archive", guest.exports.todo_archive_completed),
      );

    $scope.$on("$destroy", () => {
      if (guest.status === "ready") guest.exports.todo_unbind();
    });
  },
]);

angular.bootstrap(document.body, [moduleName]);
