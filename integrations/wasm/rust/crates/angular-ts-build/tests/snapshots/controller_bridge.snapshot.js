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
      this.__flushScope();
    }

    $onInit() {
      const inner = this.__inner;

      if (inner && typeof inner.onInit === "function") {
        inner.onInit();
        this.__syncRustProperties();
        this.__flushScope();
      }
    }

    $onDestroy() {
      const inner = this.__inner;

      if (inner && typeof inner.onDestroy === "function") {
        inner.onDestroy();
        this.__syncRustProperties();
        this.__flushScope();
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

      if (!hostScope || typeof hostScope.onFlush !== "function") {
        return;
      }

      this.__scopeUpdateDisposers.push(
        hostScope.onFlush(() => {
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
            this.__flushScope();
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

    __flushScope() {
      const angularScope = this.__angularScope;

      if (angularScope && typeof angularScope.$flushQueue === "function") {
        angularScope.$flushQueue();
      }
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
              this.__flushScope();
              return value;
            } finally {
              this.__fromRust = false;
            }
          },
          (error) => {
            this.__fromRust = true;
            try {
              this.__syncRustProperties();
              this.__flushScope();
            } finally {
              this.__fromRust = false;
            }
            throw error;
          },
        );
      }

      try {
        this.__syncRustProperties();
        this.__flushScope();
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
