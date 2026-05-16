import { angular, WasmScopeAbi } from "@angular-wave/angular.ts";
import init, * as app from "../pkg/angular_ts_rust_scope_bridge.js";

const scopeAbi = new WasmScopeAbi();
globalThis.__angularTsWasmScopeAbi = scopeAbi;
const wasmExports = await init();
scopeAbi.attach(wasmExports);

const requireExport = (name) => {
  const value = app[name];
  if (value === undefined || value === null) {
    throw new Error(`Rust AngularTS package does not export ${name}.`);
  }
  return value;
};

const readRustManifest = () => {
  if (typeof app.__ng_manifest !== "function") {
    return {};
  }

  const manifest = app.__ng_manifest();

  if (typeof manifest === "string") {
    return JSON.parse(manifest);
  }

  return manifest || {};
};

const readBridgeMetadataValue = (read) => {
  if (typeof read !== "function") {
    return {};
  }

  const metadata = read();

  if (typeof metadata === "string") {
    return JSON.parse(metadata);
  }

  return metadata || {};
};

const uniqueStrings = (...values) => {
  const output = [];

  for (const value of values.flat()) {
    if (typeof value === "string" && !output.includes(value)) {
      output.push(value);
    }
  }

  return output;
};

const mergeBridgeMetadata = (...metadataList) => {
  const merged = {};

  for (const metadata of metadataList) {
    if (!metadata || typeof metadata !== "object") {
      continue;
    }

    merged.scopeUpdateBind ??= metadata.scopeUpdateBind;
    merged.scopeUpdateUnbind ??= metadata.scopeUpdateUnbind;
  }

  merged.syncProperties = uniqueStrings(
    ...metadataList.map((metadata) => metadata?.syncProperties || []),
  );
  merged.methods = uniqueStrings(
    ...metadataList.map((metadata) => metadata?.methods || []),
  );
  merged.scopeUpdateRoutes = [
    ...metadataList.flatMap((metadata) => metadata?.scopeUpdateRoutes || []),
  ];

  return merged;
};

const readBridgeMetadata = (registration) => {
  const exportName = registration.export;

  if (!exportName) {
    return {};
  }

  return mergeBridgeMetadata(
    readBridgeMetadataValue(app[`${exportName}_fieldBridgeMetadata`]),
    readBridgeMetadataValue(app[`${exportName}_bridgeMetadata`]),
  );
};

const runtimeRegistrations = new Map(
  (readRustManifest().registrations || []).map((registration) => [
    registration.name,
    registration,
  ]),
);

const buildRegistrationOverrides = new Map();
buildRegistrationOverrides.set("scopeProbe", {"kind":"component","name":"scopeProbe","export":"__ng_component_ScopeProbe","template":"<section class=\"scope-demo\">\n  <h1>Rust Scope Bridge</h1>\n\n  <p id=\"scope-count\">Count: {{ ctrl.count }}</p>\n  <p id=\"scope-seen\">Seen by Rust: {{ ctrl.seenCount }}</p>\n  <p id=\"scope-source\">Source: {{ ctrl.source }}</p>\n\n  <button type=\"button\" id=\"wasm-increment\" ng-click=\"ctrl.increment()\">\n    Increment from Rust\n  </button>\n\n  <label>\n    Browser count\n    <input id=\"browser-count\" type=\"number\" ng-model=\"ctrl.count\" />\n  </label>\n</section>\n","controllerAs":"ctrl"});


const mergeRegistration = (runtime, registration = {}) => {
  const merged = {
    ...runtime,
    ...registration,
    export: registration.export || runtime.export,
  };
  const bridgeMetadata = readBridgeMetadata(merged);

  merged.inject = registration.inject || runtime.inject || [];
  merged.syncProperties =
    registration.syncProperties ||
    runtime.syncProperties ||
    bridgeMetadata.syncProperties ||
    [];
  merged.methods =
    registration.methods ||
    runtime.methods ||
    bridgeMetadata.methods ||
    [];
  merged.scopeUpdateBind =
    registration.scopeUpdateBind ||
    runtime.scopeUpdateBind ||
    bridgeMetadata.scopeUpdateBind;
  merged.scopeUpdateUnbind =
    registration.scopeUpdateUnbind ||
    runtime.scopeUpdateUnbind ||
    bridgeMetadata.scopeUpdateUnbind;
  merged.scopeUpdateRoutes =
    registration.scopeUpdateRoutes ||
    runtime.scopeUpdateRoutes ||
    bridgeMetadata.scopeUpdateRoutes ||
    [];

  if (merged.template) {
    delete merged.templateUrl;
  }

  return merged;
};

let nextWasmScopeId = 0;

const createComponent = (controllerName, options) => {
  const controller = requireExport(controllerName);
  const { inject, syncProperties, methods, controllerAs, kind, name, export: exportName, ...component } = options;
  const angularController = createController(controllerName, {
    inject,
    syncProperties,
    methods,
    controllerAs,
    scopeUpdateBind: options.scopeUpdateBind,
    scopeUpdateUnbind: options.scopeUpdateUnbind,
    scopeUpdateRoutes: options.scopeUpdateRoutes,
  });
  if (inject.length > 0) {
    angularController.$inject = inject;
  }
  return {
    ...component,
    ...(controllerAs ? { controllerAs } : {}),
    controller: angularController,
  };
};

const createController = (controllerName, options) => {
  const controller = requireExport(controllerName);
  const { inject, syncProperties, methods, controllerAs, scopeUpdateBind, scopeUpdateUnbind, scopeUpdateRoutes } = options;
  const angularController = createControllerBridge(
    controller,
    syncProperties,
    methods,
    { inject, controllerAs, controllerName, scopeUpdateBind, scopeUpdateUnbind, scopeUpdateRoutes },
  );
  if (inject.length > 0) {
    angularController.$inject = inject;
  }
  return angularController;
};

const createControllerBridge = (RustController, syncProperties, methods, bridgeConfig) => {
  const { inject, controllerAs, controllerName, scopeUpdateBind, scopeUpdateUnbind, scopeUpdateRoutes } = bridgeConfig;
  const scopeExpressionPrefix = (controllerAs || "ctrl").replace(/\\.$/, "");

  const toWasmScope = (scopeValue) => {
    const name = `${controllerName}:${++nextWasmScopeId}`;
    const hostScope = scopeAbi.createScope(scopeValue, { name });

    return {
      hostScope,
      rustScope: new app.WasmScope(hostScope.handle, scopeExpressionPrefix),
    };
  };

  class AngularTsRustController {
    constructor(...deps) {
      const hasScope = inject.indexOf("$scope") >= 0;
      const scopeIndex = inject.indexOf("$scope");
      const angularScope =
        scopeIndex >= 0 ? deps[scopeIndex] : undefined;

      if (hasScope) {
        if (typeof app.WasmScope !== "function") {
          throw new Error("Rust AngularTS package does not export WasmScope.");
        }

        const wasmScope = toWasmScope(angularScope);

        this.__wasmScope = wasmScope.hostScope;
        deps[scopeIndex] = wasmScope.rustScope;
      }

      this.__inner = Reflect.construct(RustController, deps);
      this.__angularScope = angularScope;
      this.__scopeUpdateDisposers = [];
      this.__controllerProxy = this;
      this.__fromRust = false;
      this.__publishControllerAlias();
      this.__bindGeneratedRefresh();
      this.__bindScopeUpdates();
      this.__bindScopeUpdateRoutes();
      this.__syncRustProperties();
      this.__syncScope();
    }

    $onInit() {
      const inner = this.__inner;

      if (inner && typeof inner.onInit === "function") {
        inner.onInit();
        this.__syncRustProperties();
        this.__syncScope();
      }
    }

    $onDestroy() {
      const inner = this.__inner;

      if (inner && typeof inner.onDestroy === "function") {
        inner.onDestroy();
        this.__syncRustProperties();
        this.__syncScope();
      }

      if (
        scopeUpdateUnbind &&
        inner &&
        typeof inner[scopeUpdateUnbind] === "function"
      ) {
        inner[scopeUpdateUnbind]();
      }

      for (const dispose of this.__scopeUpdateDisposers.splice(0)) {
        dispose();
      }

      this.__wasmScope?.dispose();
    }

    __bindGeneratedRefresh() {
      const hostScope = this.__wasmScope;

      if (!hostScope || typeof hostScope.onSync !== "function") {
        return;
      }

      this.__scopeUpdateDisposers.push(
        hostScope.onSync(() => {
          this.__syncRustProperties();
        }),
      );
    }

    __bindScopeUpdates() {
      const inner = this.__inner;

      if (
        scopeUpdateBind &&
        inner &&
        typeof inner[scopeUpdateBind] === "function"
      ) {
        inner[scopeUpdateBind]();
      }
    }

    __bindScopeUpdateRoutes() {
      const inner = this.__inner;
      const hostScope = this.__wasmScope;

      if (!hostScope || !Array.isArray(scopeUpdateRoutes)) {
        return;
      }

      for (const route of scopeUpdateRoutes) {
        if (
          !route ||
          !route.path ||
          !route.method ||
          !inner ||
          typeof inner[route.method] !== "function"
        ) {
          continue;
        }

        const path = scopeExpressionPrefix
          ? `${scopeExpressionPrefix}.${route.path}`
          : route.path;
        const dispose = hostScope.watch(path, (update) => {
          if (this.__fromRust) {
            return;
          }

          inner[route.method](update.value);
          queueMicrotask(() => {
            this.__syncRustProperties();
            this.__syncScope();
          });
        });

        this.__scopeUpdateDisposers.push(dispose);
      }
    }

    __syncRustProperties() {
      const target = this.__controllerProxy || this.$proxy || this;

      for (const property of syncProperties) {
        const next = this.__inner[property];
        const value =
          Array.isArray(next) ? next.slice() : next;

        target[property] = value;
      }
    }

    __syncScope() {
      // Scope syncing is a bridge callback boundary. AngularTS schedules DOM
      // updates through the normal scope microtask pipeline.
    }

    __publishControllerAlias() {
      const angularScope = this.__angularScope;

      if (!angularScope || !scopeExpressionPrefix || scopeExpressionPrefix.includes(".")) {
        return;
      }

      angularScope[scopeExpressionPrefix] = this;
      this.__controllerProxy = angularScope[scopeExpressionPrefix] || this;
    }
  }

  for (const method of methods) {
    AngularTsRustController.prototype[method] = function (...args) {
      this.__fromRust = true;
      let result;

      try {
        result = this.__inner[method](...args);
      } catch (error) {
        this.__fromRust = false;
        throw error;
      }

      if (result && typeof result.then === "function") {
        this.__fromRust = false;

        return result.then(
          (value) => {
            this.__fromRust = true;
            try {
              this.__syncRustProperties();
              this.__syncScope();
              return value;
            } finally {
              this.__fromRust = false;
            }
          },
          (error) => {
            this.__fromRust = true;
            try {
              this.__syncRustProperties();
              this.__syncScope();
            } finally {
              this.__fromRust = false;
            }
            throw error;
          },
        );
      }

      try {
        this.__syncRustProperties();
        this.__syncScope();
        return result;
      } finally {
        this.__fromRust = false;
      }
    };
  }

  return AngularTsRustController;
};

const registerRegistration = (registration) => {
  const name = registration.name;
  const exportName = registration.export;

  switch (registration.kind) {
    case "service":
      module.service(name, requireExport(exportName));
      break;
    case "factory":
      module.factory(name, requireExport(exportName));
      break;
    case "value":
      module.value(name, requireExport(exportName)());
      break;
    case "controller":
      module.controller(name, createController(exportName, registration));
      break;
    case "component":
      module.component(name, createComponent(exportName, registration));
      break;
    default:
      throw new Error(`Unsupported Rust AngularTS registration kind: ${registration.kind}`);
  }
};

const module = angular.module("rustScopeBridge", []);
const registeredRegistrationNames = new Set();

for (const runtimeRegistration of runtimeRegistrations.values()) {
  const buildRegistration = buildRegistrationOverrides.get(runtimeRegistration.name) || {};
  registerRegistration(mergeRegistration(runtimeRegistration, buildRegistration));
  registeredRegistrationNames.add(runtimeRegistration.name);
}

for (const buildRegistration of buildRegistrationOverrides.values()) {
  if (!registeredRegistrationNames.has(buildRegistration.name)) {
    registerRegistration(mergeRegistration({}, buildRegistration));
  }
}

angular.bootstrap(document.body, ["rustScopeBridge"]);
