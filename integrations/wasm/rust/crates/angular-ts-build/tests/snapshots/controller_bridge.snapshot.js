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
