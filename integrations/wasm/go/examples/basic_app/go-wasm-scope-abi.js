export class GoWasmScopeAbi {
  constructor(scopeAbi) {
    this.scopeAbi = scopeAbi;
    this.scopes = new Map();
  }

  imports() {
    return this.scopeAbi.imports.angular_ts;
  }

  attach(exports) {
    this.scopeAbi.attach({
      ...exports,
      memory: exports.memory || exports.mem,
      ng_abi_alloc() {
        throw new Error("standard Go Wasm does not expose ng_abi_alloc");
      },
      ng_abi_free() {},
    });
  }

  createScope(scope, options) {
    const wasmScope = this.scopeAbi.createScope(scope, options);

    this.bind(wasmScope.name, wasmScope);

    return wasmScope;
  }

  bind(name, scope) {
    this.scopes.set(name, scope);
  }

  unbind(name) {
    return this.scopes.delete(name);
  }

  getJSON(name, path) {
    const scope = this.scopes.get(name);

    return JSON.stringify(scope?.get(path) ?? null);
  }

  setJSON(name, path, json) {
    const scope = this.scopes.get(name);

    if (!scope) return false;

    scope.set(path, JSON.parse(json));
    scope.sync();

    return true;
  }

  sync(name) {
    const scope = this.scopes.get(name);

    if (!scope) return false;

    scope.sync();

    return true;
  }

  watchJSON(name, path, callback) {
    const scope = this.scopes.get(name);

    if (!scope) return () => {};

    return scope.watch(path, (update) => {
      callback(JSON.stringify(update.value ?? null));
    });
  }
}
