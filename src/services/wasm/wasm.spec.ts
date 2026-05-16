// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";
import { WasmScopeAbi } from "./wasm.ts";

describe("WasmScopeAbi", () => {
  let angular: Angular;
  let el: HTMLElement;
  let compile: ng.CompileService;
  let rootScope: ng.Scope;
  let wasmService: ng.WasmService;
  let guest: GuestMemory;
  let exports: any;
  let abi: WasmScopeAbi;
  let imports: any;

  beforeEach(() => {
    el = document.getElementById("app") as HTMLElement;
    dealoc(el);
    el.removeAttribute("ng-bind");
    angular = new Angular();
    angular
      .bootstrap(el, [])
      .invoke(
        (_$compile_: ng.CompileService, _$rootScope_: ng.Scope, _$wasm_) => {
          compile = _$compile_;
          rootScope = _$rootScope_;
          wasmService = _$wasm_;
        },
      );
    guest = new GuestMemory();
    exports = guest.exports();
    abi = new WasmScopeAbi(exports);
    imports = abi.imports.angular_ts;
  });

  afterAll(async () => {
    const target = document.getElementById("app") as HTMLElement;

    dealoc(target);
    target.removeAttribute("ng-bind");
    await renderWasmDomUpdate(target);
  });

  it("reads and writes scope state through numeric handles", () => {
    const scope = abi.createScope(rootScope, { name: "todoList:main" });
    const path = guest.write("items");
    const value = guest.writeJson([
      {
        task: "Learn ABI",
        done: false,
      },
    ]);

    expect(
      imports.scope_set(scope.handle, path.ptr, path.len, value.ptr, value.len),
    ).toBe(1);
    expect(rootScope.items).toEqual([
      {
        task: "Learn ABI",
        done: false,
      },
    ]);

    const result = imports.scope_get(scope.handle, path.ptr, path.len);

    expect(
      guest.readJson(imports.buffer_ptr(result), imports.buffer_len(result)),
    ).toEqual([
      {
        task: "Learn ABI",
        done: false,
      },
    ]);

    imports.buffer_free(result);

    expect(guest.freed.length).toBeGreaterThan(0);
  });

  it("targets scopes by name", () => {
    const scope = abi.createScope(rootScope, { name: "todoList:main" });
    const name = guest.write("todoList:main");
    const path = guest.write("count");
    const value = guest.writeJson(3);

    expect(imports.scope_resolve(name.ptr, name.len)).toBe(scope.handle);
    expect(
      imports.scope_set_named(
        name.ptr,
        name.len,
        path.ptr,
        path.len,
        value.ptr,
        value.len,
      ),
    ).toBe(1);
    expect(rootScope.count).toBe(3);

    const result = imports.scope_get_named(
      name.ptr,
      name.len,
      path.ptr,
      path.len,
    );

    expect(
      guest.readJson(imports.buffer_ptr(result), imports.buffer_len(result)),
    ).toBe(3);

    imports.buffer_free(result);
  });

  it("deletes scope paths by name", () => {
    abi.createScope(rootScope, { name: "todoList:main" });
    rootScope.filters = {
      status: "open",
    };

    const name = guest.write("todoList:main");
    const path = guest.write("filters.status");

    expect(
      imports.scope_delete_named(name.ptr, name.len, path.ptr, path.len),
    ).toBe(1);
    expect(rootScope.filters.status).toBeUndefined();
  });

  it("runs bridge sync callbacks asynchronously", async () => {
    const scope = abi.createScope(rootScope, { name: "todoList:main" });
    const name = guest.write("todoList:main");
    let bridgeSynced = false;

    scope.onSync(() => {
      bridgeSynced = true;
    });

    expect(imports.scope_sync_named(name.ptr, name.len)).toBe(1);
    expect(bridgeSynced).toBeFalse();

    await Promise.resolve();

    expect(bridgeSynced).toBeTrue();
  });

  it("updates the DOM when a Wasm import mutates a bound scope", async () => {
    rootScope.todo = {
      title: "Initial",
    };

    el.setAttribute("ng-bind", "todo.title");
    compile(el)(rootScope);

    await wait();

    expect(el.textContent).toBe("Initial");

    abi.createScope(rootScope, { name: "todoList:main" });

    const name = guest.write("todoList:main");
    const path = guest.write("todo.title");
    const value = guest.writeJson("Updated by Wasm");

    expect(
      imports.scope_set_named(
        name.ptr,
        name.len,
        path.ptr,
        path.len,
        value.ptr,
        value.len,
      ),
    ).toBe(1);
    expect(imports.scope_sync_named(name.ptr, name.len)).toBe(1);
    await wait();

    expect(el.textContent).toBe("Updated by Wasm");
  });

  it("notifies guest exports when watched scope paths change", async () => {
    const updates: any[] = [];

    exports.ng_scope_on_update = (
      scopeHandle,
      pathPtr,
      pathLen,
      valuePtr,
      valueLen,
    ) => {
      updates.push({
        scopeHandle,
        path: guest.read(pathPtr, pathLen),
        value: guest.readJson(valuePtr, valueLen),
      });
    };

    const scope = abi.createScope(rootScope, { name: "todoList:main" });
    const path = guest.write("count");
    const value = guest.writeJson(4);
    const watch = imports.scope_watch(scope.handle, path.ptr, path.len);

    expect(watch).toBeGreaterThan(0);
    expect(
      imports.scope_set(scope.handle, path.ptr, path.len, value.ptr, value.len),
    ).toBe(1);

    await wait();

    expect(updates).toEqual([
      {
        scopeHandle: scope.handle,
        path: "count",
        value: 4,
      },
    ]);

    expect(imports.scope_unwatch(watch)).toBe(1);

    const nextValue = guest.writeJson(5);

    expect(
      imports.scope_set(
        scope.handle,
        path.ptr,
        path.len,
        nextValue.ptr,
        nextValue.len,
      ),
    ).toBe(1);

    await wait();

    expect(updates.length).toBe(1);
  });

  it("calls bind and unbind lifecycle exports", () => {
    const calls: string[] = [];

    exports.ng_scope_on_bind = (scopeHandle, namePtr, nameLen) => {
      calls.push(`bind:${scopeHandle}:${guest.read(namePtr, nameLen)}`);
    };
    exports.ng_scope_on_unbind = (scopeHandle) => {
      calls.push(`unbind:${scopeHandle}`);
    };

    const scope = abi.createScope(rootScope, { name: "todoList:main" });
    const dispose = scope.bindExports(exports);

    dispose();
    dispose();

    expect(calls).toEqual([
      `bind:${scope.handle}:todoList:main`,
      `unbind:${scope.handle}`,
    ]);
  });

  it("unbinds scopes by name and clears owned watches", async () => {
    const updates: any[] = [];

    exports.ng_scope_on_update = (
      _scopeHandle,
      pathPtr,
      pathLen,
      valuePtr,
      valueLen,
    ) => {
      updates.push({
        path: guest.read(pathPtr, pathLen),
        value: guest.readJson(valuePtr, valueLen),
      });
    };

    const scope = abi.createScope(rootScope, { name: "todoList:main" });
    const name = guest.write("todoList:main");
    const path = guest.write("count");
    const value = guest.writeJson(1);

    expect(
      imports.scope_watch_named(name.ptr, name.len, path.ptr, path.len),
    ).toBeGreaterThan(0);
    expect(imports.scope_unbind_named(name.ptr, name.len)).toBe(1);
    expect(scope.isDisposed()).toBeTrue();
    expect(imports.scope_resolve(name.ptr, name.len)).toBe(0);
    expect(
      imports.scope_set(scope.handle, path.ptr, path.len, value.ptr, value.len),
    ).toBe(0);

    rootScope.count = 2;

    await wait();

    expect(updates).toEqual([]);
  });

  it("is available from the $wasm service", () => {
    expect(wasmService.createScopeAbi).toEqual(jasmine.any(Function));
    expect(wasmService.scope).toEqual(jasmine.any(Function));
  });
});

class GuestMemory {
  memory = new WebAssembly.Memory({ initial: 1 });

  offset = 1024;

  freed: Array<{ ptr: number; len: number }> = [];

  exports() {
    return {
      memory: this.memory,
      ng_abi_alloc: (size: number) => this.alloc(size),
      ng_abi_free: (ptr: number, len: number) => {
        this.freed.push({ ptr, len });
      },
    };
  }

  alloc(size: number): number {
    const ptr = this.offset;

    this.offset += Math.max(size, 1);

    return ptr;
  }

  write(value: string): { ptr: number; len: number } {
    const bytes = new TextEncoder().encode(value);
    const ptr = this.alloc(bytes.byteLength);

    new Uint8Array(this.memory.buffer, ptr, bytes.byteLength).set(bytes);

    return { ptr, len: bytes.byteLength };
  }

  writeJson(value: unknown): { ptr: number; len: number } {
    return this.write(JSON.stringify(value));
  }

  read(ptr: number, len: number): string {
    return new TextDecoder().decode(
      new Uint8Array(this.memory.buffer, ptr, len),
    );
  }

  readJson(ptr: number, len: number): unknown {
    return JSON.parse(this.read(ptr, len));
  }
}

async function renderWasmDomUpdate(target: HTMLElement): Promise<void> {
  const angular = new Angular();
  let compile: ng.CompileService;
  let rootScope: ng.Scope;

  angular
    .bootstrap(target, [])
    .invoke((_$compile_: ng.CompileService, _$rootScope_: ng.Scope) => {
      compile = _$compile_;
      rootScope = _$rootScope_;
    });

  rootScope.todo = {
    message: "Updated by Wasm 0",
  };
  target.setAttribute("ng-bind", "todo.message");
  compile(target)(rootScope);
  await wait();

  const guest = new GuestMemory();
  const abi = new WasmScopeAbi(guest.exports());
  const imports = abi.imports.angular_ts;

  abi.createScope(rootScope, { name: "todoList:main" });

  const name = guest.write("todoList:main");
  const path = guest.write("todo.message");

  for (let count = 1; count <= 3; count++) {
    await sleep(1000);

    const value = guest.writeJson(`Updated by Wasm ${count}`);

    imports.scope_set_named(
      name.ptr,
      name.len,
      path.ptr,
      path.len,
      value.ptr,
      value.len,
    );
    imports.scope_sync_named(name.ptr, name.len);
    await wait();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
