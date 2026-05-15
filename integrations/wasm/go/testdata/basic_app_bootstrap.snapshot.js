import { angular, WasmScopeAbi } from "@angular-wave/angular.ts";
import { GoWasmScopeAbi } from "../go-wasm-scope-abi.js";
import "../wasm_exec.js";

const moduleName = "goWasmTodo";
const requires = [];
const manifest = {"registrations":[{"kind":"controller","name":"goTodoController","export":"__ng_controller_GoTodoController","scopeName":"goTodo:main","methods":["add","toggle","archive"],"fields":[{"name":"items","goName":"items","goType":"[]main.Todo"},{"name":"remainingCount","goName":"remainingCount","goType":"int"},{"name":"newTodo","goName":"newTodo","goType":"string"},{"name":"titleSeen","goName":"titleSeen","goType":"string"}],"watches":[{"path":"newTodo","handler":"onNewTodoChanged","goType":"string"}]}]};

const scopeAbi = new WasmScopeAbi();
const goScopeAbi = new GoWasmScopeAbi(scopeAbi);

globalThis.__angularTsGoWasmScopeAbi = goScopeAbi;

const goReady = new Promise((resolve) => {
  globalThis.addEventListener("angular-ts-go-ready", resolve, { once: true });
});

const go = new Go();
go.importObject.angular_ts = goScopeAbi.imports();

const result = await WebAssembly.instantiateStreaming(
  fetch(new URL("../main.wasm", import.meta.url)),
  go.importObject,
);
const exports = result.instance.exports;

goScopeAbi.attach(exports);

void go.run(result.instance);
await goReady;

const readExport = (name) => {
  const value = globalThis[name];

  if (!value) {
    throw new Error("Go Wasm export is not available" + ": " + name);
  }

  return value;
};

const createController = (registration) => [
  "$scope",
  ($scope) => {
    const controller = readExport(registration.export);
    const scopeName =
      registration.scopeName || controller.scopeName || registration.name + ":main";
    const scope = goScopeAbi.createScope($scope, { name: scopeName });
    const methods = registration.methods || controller.methods || [];

    methods.forEach((method) => {
      if (typeof controller[method] !== "function") {
        throw new Error("Go Wasm controller method is not available" + ": " + method);
      }

      $scope[method] = (...args) => controller[method](...args);
    });

    $scope.$on("$destroy", () => {
      if (typeof controller.unbind === "function") {
        controller.unbind();
      }
      goScopeAbi.unbind(scope.name);
    });

    if (typeof controller.bind === "function") {
      controller.bind(scope.name);
    }
  },
];

const register = (module, registration) => {
  switch (registration.kind) {
    case "controller":
      module.controller(registration.name, createController(registration));
      break;
    case "component":
      module.component(registration.name, {
        controller: createController(registration),
        template: registration.template,
        templateUrl: registration.templateUrl,
      });
      break;
    case "service":
      module.service(registration.name, readExport(registration.export));
      break;
    case "factory":
      module.factory(registration.name, readExport(registration.export));
      break;
    case "value":
      module.value(registration.name, readExport(registration.export));
      break;
    default:
      throw new Error("Unsupported Go AngularTS registration kind" + ": " + registration.kind);
  }
};

const module = angular.module(moduleName, requires);

(manifest.registrations || []).forEach((registration) => {
  register(module, registration);
});

angular.bootstrap(document.body, [moduleName]);
