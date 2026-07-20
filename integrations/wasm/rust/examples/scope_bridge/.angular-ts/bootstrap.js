import { angular } from "@angular-wave/angular.ts";
import { WasmAbi } from "@angular-wave/angular.ts/services/wasm";
import init, * as app from "../pkg/angular_ts_rust_scope_bridge.js";

const scopeAbi = WasmAbi.create();
globalThis.__angularTsWasmScopeAbi = scopeAbi;
const wasmExports = await init();
scopeAbi.attach(wasmExports);
globalThis.__angularTsWasmConformance = {
  abi: scopeAbi,
  exports: wasmExports,
  ready: Promise.resolve(),
};

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
  const wasmScopeSlot = Symbol("angularTsRustWasmScope");
  const innerSlot = Symbol("angularTsRustInner");
  const angularScopeSlot = Symbol("angularTsRustAngularScope");
  const scopeUpdateDisposersSlot = Symbol("angularTsRustScopeUpdateDisposers");
  const controllerProxySlot = Symbol("angularTsRustControllerProxy");
  const fromRustSlot = Symbol("angularTsRustFromRust");

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

        this[wasmScopeSlot] = wasmScope.hostScope;
        deps[scopeIndex] = wasmScope.rustScope;
      }

      this[innerSlot] = Reflect.construct(RustController, deps);
      this[angularScopeSlot] = angularScope;
      this[scopeUpdateDisposersSlot] = [];
      this[controllerProxySlot] = this;
      this[fromRustSlot] = false;
      this.publishControllerAlias();
      this.bindGeneratedRefresh();
      this.bindScopeUpdates();
      this.bindScopeUpdateRoutes();
      this.syncRustProperties();
      this.syncScope();
    }

    $onInit() {
      const inner = this[innerSlot];

      if (inner && typeof inner.onInit === "function") {
        inner.onInit();
        this.syncRustProperties();
        this.syncScope();
      }
    }

    $onDestroy() {
      const inner = this[innerSlot];

      if (inner && typeof inner.onDestroy === "function") {
        inner.onDestroy();
        this.syncRustProperties();
        this.syncScope();
      }

      if (
        scopeUpdateUnbind &&
        inner &&
        typeof inner[scopeUpdateUnbind] === "function"
      ) {
        inner[scopeUpdateUnbind]();
      }

      for (const dispose of this[scopeUpdateDisposersSlot].splice(0)) {
        dispose();
      }

      this[wasmScopeSlot]?.dispose();
    }

    bindGeneratedRefresh() {
      const hostScope = this[wasmScopeSlot];

      if (!hostScope || typeof hostScope.onSync !== "function") {
        return;
      }

      this[scopeUpdateDisposersSlot].push(
        hostScope.onSync(() => {
          this.syncRustProperties();
        }),
      );
    }

    bindScopeUpdates() {
      const inner = this[innerSlot];

      if (
        scopeUpdateBind &&
        inner &&
        typeof inner[scopeUpdateBind] === "function"
      ) {
        inner[scopeUpdateBind]();
      }
    }

    bindScopeUpdateRoutes() {
      const inner = this[innerSlot];
      const hostScope = this[wasmScopeSlot];

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
          if (this[fromRustSlot]) {
            return;
          }

          inner[route.method](update.value);
          queueMicrotask(() => {
            this.syncRustProperties();
            this.syncScope();
          });
        });

        this[scopeUpdateDisposersSlot].push(dispose);
      }
    }

    syncRustProperties() {
      const target = this[controllerProxySlot] || this.$proxy || this;

      for (const property of syncProperties) {
        const next = this[innerSlot][property];
        const value =
          Array.isArray(next) ? next.slice() : next;

        target[property] = value;
      }
    }

    syncScope() {
      // Scope syncing is a bridge callback boundary. AngularTS schedules DOM
      // updates through the normal scope microtask pipeline.
    }

    publishControllerAlias() {
      const angularScope = this[angularScopeSlot];

      if (!angularScope || !scopeExpressionPrefix || scopeExpressionPrefix.includes(".")) {
        return;
      }

      angularScope[scopeExpressionPrefix] = this;
      this[controllerProxySlot] = angularScope[scopeExpressionPrefix] || this;
    }
  }

  for (const method of methods) {
    AngularTsRustController.prototype[method] = function (...args) {
      this[fromRustSlot] = true;
      let result;

      try {
        result = this[innerSlot][method](...args);
      } catch (error) {
        this[fromRustSlot] = false;
        throw error;
      }

      if (result && typeof result.then === "function") {
        this[fromRustSlot] = false;

        return result.then(
          (value) => {
            this[fromRustSlot] = true;
            try {
              this.syncRustProperties();
              this.syncScope();
              return value;
            } finally {
              this[fromRustSlot] = false;
            }
          },
          (error) => {
            this[fromRustSlot] = true;
            try {
              this.syncRustProperties();
              this.syncScope();
            } finally {
              this[fromRustSlot] = false;
            }
            throw error;
          },
        );
      }

      try {
        this.syncRustProperties();
        this.syncScope();
        return result;
      } finally {
        this[fromRustSlot] = false;
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
