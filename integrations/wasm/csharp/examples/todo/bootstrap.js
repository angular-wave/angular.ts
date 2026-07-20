import { angular } from "@angular-wave/angular.ts";
import { WasmAbi } from "@angular-wave/angular.ts/services/wasm";

const moduleName = "csharpWasmTodo";
const scopeName = "csharpTodo:main";

const scopeAbi = WasmAbi.create();
const resultBufferStats = {
  created: 0,
  freed: 0,
};

const trackResultBuffers = (imports) => {
  const scopeGet = imports.scope_get;
  const bufferFree = imports.buffer_free;

  imports.scope_get = (...args) => {
    const handle = scopeGet(...args);

    if (handle !== 0) {
      resultBufferStats.created += 1;
    }

    return handle;
  };
  imports.buffer_free = (handle) => {
    if (handle !== 0) {
      resultBufferStats.freed += 1;
    }

    bufferFree(handle);
  };
};

trackResultBuffers(scopeAbi.imports.angular_ts);
globalThis.__angularTsCsharpWasmStats = () => ({ ...resultBufferStats });

const loadDotnetExports = async () => {
  const { dotnet } = await import("./_framework/dotnet.js");
  const runtime = await dotnet
    .withDiagnosticTracing(false)
    .withApplicationArguments()
    .create();
  runtime.setModuleImports("angular_ts", scopeAbi.imports.angular_ts);
  const config = runtime.getConfig();
  const exports = await runtime.getAssemblyExports(config.mainAssemblyName);
  const abiExports = exports.AngularTs.Wasm.AngularTsAbiExports;
  const heap = () => runtime.Module.HEAPU8 || runtime.localHeapViewU8();

  const conformanceExports = {
    memory: {
      get buffer() {
        return heap().buffer;
      },
    },
    ng_abi_version: abiExports.NgAbiVersionJs,
    ng_abi_alloc: (size) => runtime.Module._malloc(size),
    ng_abi_free: (ptr) => runtime.Module._free(ptr),
    ng_scope_on_bind: abiExports.NgScopeOnBindJs,
    ng_scope_on_unbind: abiExports.NgScopeOnUnbindJs,
    ng_scope_on_transaction: abiExports.NgScopeOnTransactionJs,
  };

  scopeAbi.attach(conformanceExports);
  globalThis.__angularTsWasmConformance = {
    abi: scopeAbi,
    exports: conformanceExports,
    ready: Promise.resolve(),
  };

  return {
    runtime,
    exports: exports.AngularTs.Wasm.Todo.Todo,
  };
};

const { exports } = await loadDotnetExports();

const app = angular.module(moduleName, []);

app.controller("csharpTodoController", [
  "$scope",
  ($scope) => {
    const scope = scopeAbi.createScope($scope, { name: scopeName });

    $scope.add = (title) => exports.TodoAdd(title || "");
    $scope.toggle = (index) => exports.TodoToggle(index);
    $scope.archive = () => exports.TodoArchiveCompleted();

    $scope.$on("$destroy", () => {
      exports.TodoUnbind();
      scopeAbi.unbind(scope.name);
    });

    exports.TodoBind(scopeName);
  },
]);

angular.bootstrap(document.body, [moduleName]);
