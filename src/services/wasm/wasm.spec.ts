// @ts-nocheck
/// <reference types="jasmine" />
import { AppContext } from "../../core/app-context/app-context.ts";
import { Angular } from "../../angular.ts";
import { wasmModule } from "../../runtime/wasm.ts";
import { SCOPE_PROXY_BIND } from "../../core/scope/scope.ts";
import { dealoc } from "../../shared/dom.ts";
import { wait, waitUntil } from "../../shared/test-utils.ts";
import { instantiateWasm, isProxySymbol } from "../../shared/utils.ts";
import { WasmAbi, WasmAbiError, WasmError } from "./index.ts";
import type { WasmScopeAbi, WasmScopeUpdate } from "./index.ts";
import {
  createWasmRuntimeState,
  createWasmService,
  destroyWasmRuntimeState,
} from "./wasm.ts";

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
    const installedWasmModule = wasmModule(angular);
    angular.bootstrap(el, [installedWasmModule.name]).invoke([
      "$compile",
      "$rootScope",
      "$wasm",
      (_$compile_: ng.CompileService, _$rootScope_: ng.Scope, _$wasm_) => {
        compile = _$compile_;
        rootScope = _$rootScope_;
        wasmService = _$wasm_;
      },
    ]);
    guest = new GuestMemory();
    exports = guest.exports();
    abi = WasmAbi.create();
    abi.attach(exports);
    imports = abi.imports.angular_ts;
  });

  afterAll(async () => {
    const target = document.getElementById("app") as HTMLElement;

    dealoc(target);
    target.removeAttribute("ng-bind");
    await renderWasmDomUpdate(target);
  });

  it("creates the low-level ABI through the WasmAbi namespace", () => {
    const namespacedAbi = WasmAbi.create();

    namespacedAbi.attach(exports);

    expect(WasmAbi.create).toEqual(jasmine.any(Function));
    expect(WasmAbi.version).toBe(3);
    expect(namespacedAbi.imports.angular_ts.scope_resolve).toEqual(
      jasmine.any(Function),
    );
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

  it("applies one origin-aware transaction to an app-context model", () => {
    const context = new AppContext();
    const model = context.registerModel("wasmState", () => ({
      count: 1,
      stale: true,
    }));
    const changes: any[] = [];
    const stop = model.$sync({
      write: (snapshot, change) => {
        changes.push({ snapshot, change });
      },
    });
    const scope = abi.createScope(model, { name: "model:wasmState" });
    const transaction = guest.writeJson({
      set: { count: 2, "nested.ready": true },
      delete: ["stale"],
      origin: "guest:physics",
      echo: false,
    });

    expect(
      imports.scope_apply(scope.handle, transaction.ptr, transaction.len),
    ).toBe(1);

    context.modelScheduler.flush();

    expect(model.$snapshot()).toEqual({
      count: 2,
      nested: { ready: true },
    });
    expect(changes.length).toBe(1);
    expect(changes[0].change.origin).toBe("guest:physics");
    expect(changes[0].change.keys).toEqual(
      jasmine.arrayWithExactContents(["count", "stale", "nested"]),
    );

    stop();
    context.destroy();
  });

  it("suppresses transaction echoes unless the guest requests one", async () => {
    const updates: unknown[] = [];

    listenForGuestTransactions(exports, guest, (_scopeHandle, transaction) => {
      updates.push(...Object.values(transaction.set ?? {}));
    });

    const scope = abi.createScope(rootScope, { name: "echo:scope" });
    const path = guest.write("count");

    expect(
      imports.scope_watch(scope.handle, path.ptr, path.len),
    ).toBeGreaterThan(0);

    const silent = guest.writeJson({
      set: { count: 1 },
      origin: "guest:simulation",
    });

    expect(imports.scope_apply(scope.handle, silent.ptr, silent.len)).toBe(1);
    await wait();
    expect(updates).toEqual([]);

    const echoed = guest.writeJson({
      set: { count: 2 },
      origin: "guest:simulation",
      echo: true,
    });

    expect(imports.scope_apply(scope.handle, echoed.ptr, echoed.len)).toBe(1);
    await wait();
    expect(updates).toEqual([2]);
  });

  it("transfers binary scope values without JSON encoding", () => {
    const scope = abi.createScope(rootScope, { name: "binary:scope" });
    const path = guest.write("frame");
    const bytes = Uint8Array.from([0, 1, 2, 127, 255]);
    const valuePtr = guest.alloc(bytes.byteLength);

    new Uint8Array(guest.memory.buffer, valuePtr, bytes.byteLength).set(bytes);

    expect(
      imports.scope_set_binary(
        scope.handle,
        path.ptr,
        path.len,
        valuePtr,
        bytes.byteLength,
        0,
        0,
      ),
    ).toBe(1);
    expect(rootScope.frame).toEqual(bytes);

    const result = imports.scope_get_binary(scope.handle, path.ptr, path.len);
    const resultBytes = new Uint8Array(
      guest.memory.buffer,
      imports.buffer_ptr(result),
      imports.buffer_len(result),
    );

    expect(Array.from(resultBytes)).toEqual(Array.from(bytes));
    imports.buffer_free(result);
  });

  it("reports actionable guest failures", () => {
    const path = guest.write("count");
    const malformed = guest.write("{");

    expect(imports.scope_get(404, path.ptr, path.len)).toBe(0);
    expect(imports.error_code()).toBe(WasmAbiError.invalidHandle);

    const scope = abi.createScope(rootScope, { name: "errors:scope" });

    expect(
      imports.scope_apply(scope.handle, malformed.ptr, malformed.len),
    ).toBe(0);
    expect(imports.error_code()).toBe(WasmAbiError.invalidJson);

    const unsafe = guest.writeJson({ set: { "__proto__.value": true } });

    expect(imports.scope_apply(scope.handle, unsafe.ptr, unsafe.len)).toBe(0);
    expect(imports.error_code()).toBe(WasmAbiError.unsafePath);

    imports.error_clear();
    expect(imports.error_code()).toBe(WasmAbiError.none);
  });

  it("contains malformed guest pointers, lengths, and JSON", () => {
    const scope = abi.createScope(rootScope, { name: "todoList:main" });
    const path = guest.write("count");
    const malformed = guest.write("{");
    const value = guest.writeJson(1);
    const outsideMemory = guest.memory.buffer.byteLength + 1;

    expect(
      imports.scope_set(
        scope.handle,
        path.ptr,
        path.len,
        malformed.ptr,
        malformed.len,
      ),
    ).toBe(0);
    expect(
      imports.scope_set(scope.handle, outsideMemory, 1, value.ptr, value.len),
    ).toBe(0);
    expect(
      imports.scope_set(scope.handle, path.ptr, -1, value.ptr, value.len),
    ).toBe(0);
    expect(
      imports.scope_set(scope.handle, path.ptr, 16 * 1024 + 1, value.ptr, 1),
    ).toBe(0);
    expect(rootScope.count).toBeUndefined();
  });

  it("validates guest ABI versions and allocator ranges", () => {
    const mismatched = new GuestMemory();
    const mismatchedExports = mismatched.exports();

    mismatchedExports.ng_abi_version = () => 1;

    expect(() => WasmAbi.create().attach(mismatchedExports)).toThrowError(
      "Unsupported AngularTS Wasm ABI version 1; expected 3",
    );

    const invalidAllocatorExports = guest.exports();

    invalidAllocatorExports.ng_abi_alloc = () => guest.memory.buffer.byteLength;
    invalidAllocatorExports.ng_scope_on_bind = () => undefined;

    const invalidAllocatorAbi = WasmAbi.create();

    invalidAllocatorAbi.attach(invalidAllocatorExports);
    const invalidAllocatorScope = invalidAllocatorAbi.createScope(rootScope, {
      name: "invalid:allocator",
    });

    expect(() => invalidAllocatorScope.bind()).toThrowError(
      "AngularTS Wasm ABI guest allocation exceeds guest memory",
    );
  });

  it("bounds guest-owned resources and recovers released capacity", () => {
    const scope = abi.createScope(rootScope, { name: "limits:scope" });
    const path = guest.write("count");
    const buffers: number[] = [];

    rootScope.count = 1;

    for (let index = 0; index < 1024; index++) {
      buffers.push(imports.scope_get(scope.handle, path.ptr, path.len));
    }

    expect(buffers.every((handle) => handle > 0)).toBeTrue();
    expect(imports.scope_get(scope.handle, path.ptr, path.len)).toBe(0);

    imports.buffer_free(buffers.pop());
    expect(imports.scope_get(scope.handle, path.ptr, path.len)).toBeGreaterThan(
      0,
    );

    const ownedAbi = abi as any;

    ownedAbi._bufferBytes = 64 * 1024 * 1024;
    expect(imports.scope_get(scope.handle, path.ptr, path.len)).toBe(0);
    ownedAbi._bufferBytes = 0;

    ownedAbi._watches.clear();
    for (let index = 0; index < 4096; index++) {
      ownedAbi._watches.set(index + 1, {});
    }
    expect(imports.scope_watch(scope.handle, path.ptr, path.len)).toBe(0);

    ownedAbi._scopes.clear();
    for (let index = 0; index < 1024; index++) {
      ownedAbi._scopes.set(index + 1, {});
    }
    expect(() =>
      abi.createScope(rootScope.$new(), { name: "limits:overflow" }),
    ).toThrowError("AngularTS Wasm ABI scope limit exceeded");
  });

  it("contains recursive guest callbacks", () => {
    const ownedAbi = abi as any;
    const recurse = (): void => {
      ownedAbi._runGuestCallback("update", recurse);
    };

    expect(() => ownedAbi._runGuestCallback("update", recurse)).toThrowError(
      "AngularTS Wasm ABI guest callback depth exceeded",
    );
    expect(ownedAbi._guestCallbackDepth).toBe(0);
  });

  it("uses the current guest memory after memory growth", () => {
    const scope = abi.createScope(rootScope, { name: "memory:growth" });
    const path = guest.write("count");

    rootScope.count = 7;
    guest.memory.grow(1);

    const result = imports.scope_get(scope.handle, path.ptr, path.len);

    expect(
      guest.readJson(imports.buffer_ptr(result), imports.buffer_len(result)),
    ).toBe(7);
    imports.buffer_free(result);
  });

  it("accepts managed runtime memory views with a live buffer getter", () => {
    const managedExports = guest.exports();

    managedExports.memory = {
      get buffer() {
        return guest.memory.buffer;
      },
    };

    const managedAbi = WasmAbi.create();

    expect(() => managedAbi.attach(managedExports)).not.toThrow();
  });

  it("targets scopes by name", () => {
    const scope = abi.createScope(rootScope, { name: "todoList:main" });
    const name = guest.write("todoList:main");
    const path = guest.write("count");
    const value = guest.writeJson(3);

    const handle = imports.scope_resolve(name.ptr, name.len);

    expect(handle).toBe(scope.handle);
    expect(
      imports.scope_set(handle, path.ptr, path.len, value.ptr, value.len),
    ).toBe(1);
    expect(rootScope.count).toBe(3);

    const result = imports.scope_get(handle, path.ptr, path.len);

    expect(
      guest.readJson(imports.buffer_ptr(result), imports.buffer_len(result)),
    ).toBe(3);

    imports.buffer_free(result);
  });

  it("requires non-empty unique scope names", () => {
    const original = abi.createScope(rootScope, { name: "todoList:main" });

    expect(() => abi.createScope(rootScope, { name: "" })).toThrowError(
      "Wasm scope name must not be empty",
    );
    expect(() => abi.createScope(rootScope, { name: "   " })).toThrowError(
      "Wasm scope name must not be empty",
    );
    expect(() =>
      abi.createScope(rootScope.$new(), { name: "todoList:main" }),
    ).toThrowError("Wasm scope name 'todoList:main' is already bound");
    expect(abi.getScope("todoList:main")).toBe(original);
  });

  it("rejects already-destroyed reactive targets", () => {
    const target = rootScope.$new();

    target.$destroy();

    expect(() => abi.createScope(target)).toThrowError(
      "Cannot bind a destroyed AngularTS reactive target",
    );
  });

  it("deletes scope paths by name", () => {
    const scope = abi.createScope(rootScope, { name: "todoList:main" });
    rootScope.filters = {
      status: "open",
    };

    const path = guest.write("filters.status");

    expect(imports.scope_delete(scope.handle, path.ptr, path.len)).toBe(1);
    expect(rootScope.filters.status).toBeUndefined();
  });

  it("rejects prototype-polluting write paths", () => {
    const scope = abi.createScope(rootScope, { name: "todoList:main" });
    const value = guest.writeJson("polluted");
    const poisoned = [
      "__proto__.wasmPolluted",
      "safe.constructor.prototype.wasmPolluted",
      "safe.prototype.wasmPolluted",
    ];

    for (const pathValue of poisoned) {
      const path = guest.write(pathValue);

      expect(
        imports.scope_set(
          scope.handle,
          path.ptr,
          path.len,
          value.ptr,
          value.len,
        ),
      ).toBe(0);
    }

    expect(rootScope.safe).toBeUndefined();
    expect(({} as Record<string, unknown>).wasmPolluted).toBeUndefined();
  });

  it("rejects prototype-polluting read and delete paths", () => {
    const scope = abi.createScope(rootScope, { name: "todoList:main" });
    const path = guest.write("__proto__.wasmPolluted");

    (Object.prototype as Record<string, unknown>).wasmPolluted = "inherited";

    try {
      const result = imports.scope_get(scope.handle, path.ptr, path.len);

      expect(result).toBe(0);
      expect(imports.error_code()).toBe(WasmAbiError.unsafePath);
      expect(imports.scope_delete(scope.handle, path.ptr, path.len)).toBe(0);
      expect(({} as Record<string, unknown>).wasmPolluted).toBe("inherited");
    } finally {
      delete (Object.prototype as Record<string, unknown>).wasmPolluted;
    }
  });

  it("runs bridge sync callbacks asynchronously", async () => {
    const scope = abi.createScope(rootScope, { name: "todoList:main" });
    let bridgeSynced = false;

    scope.onSync(() => {
      bridgeSynced = true;
    });

    expect(imports.scope_sync(scope.handle)).toBe(1);
    expect(bridgeSynced).toBeFalse();

    await Promise.resolve();

    expect(bridgeSynced).toBeTrue();
  });

  it("skips pending sync callbacks after disposal", async () => {
    const scope = abi.createScope(rootScope, { name: "todoList:main" });
    let bridgeSynced = false;

    scope.onSync(() => {
      bridgeSynced = true;
    });

    scope.sync();
    scope.dispose();
    scope.dispose();

    const dispose = scope.onSync(() => {
      bridgeSynced = true;
    });

    dispose();

    await Promise.resolve();

    expect(bridgeSynced).toBeFalse();
    expect(scope.disposed).toBeTrue();
  });

  it("returns failure values for unknown handles", () => {
    const path = guest.write("count");
    const value = guest.writeJson(1);

    expect(imports.scope_get(404, path.ptr, path.len)).toBe(0);
    expect(
      imports.scope_set(404, path.ptr, path.len, value.ptr, value.len),
    ).toBe(0);
    expect(imports.scope_delete(404, path.ptr, path.len)).toBe(0);
    expect(imports.scope_sync(404)).toBe(0);
    expect(imports.scope_watch(404, path.ptr, path.len)).toBe(0);
    expect(imports.scope_unwatch(404)).toBe(0);
    expect(imports.scope_unbind(404)).toBe(0);
    expect(imports.buffer_ptr(404)).toBe(0);
    expect(imports.buffer_len(404)).toBe(0);

    imports.buffer_free(404);
  });

  it("contains guest allocator traps while releasing result buffers", () => {
    const trappingExports = guest.exports();

    trappingExports.ng_abi_free = () => {
      throw new WebAssembly.RuntimeError("guest free trapped");
    };

    const trappingAbi = WasmAbi.create();

    trappingAbi.attach(trappingExports);
    const trappingImports = trappingAbi.imports.angular_ts;
    const scope = trappingAbi.createScope(rootScope, { name: "trapping:free" });
    const path = guest.write("count");
    const bufferHandle = trappingImports.scope_get(
      scope.handle,
      path.ptr,
      path.len,
    );

    expect(bufferHandle).not.toBe(0);
    expect(() => trappingImports.buffer_free(bufferHandle)).not.toThrow();
    expect(trappingImports.buffer_ptr(bufferHandle)).toBe(0);

    trappingAbi.dispose();
  });

  it("contains guest-memory callbacks before exports are attached", () => {
    const detachedAbi = WasmAbi.create();

    expect(detachedAbi.imports.angular_ts.scope_resolve(0, 0)).toBe(0);
  });

  it("supports direct scope reads, writes, and deletes around empty or missing paths", () => {
    const scope = abi.createScope(rootScope, { name: "todoList:main" });

    expect(scope.get("")).toBe(rootScope);
    expect(scope.get("missing.value")).toBeUndefined();
    expect(scope.set("", "ignored")).toBeFalse();
    expect(scope.delete("missing.value")).toBeFalse();

    expect(scope.set("profile.name", "Ada")).toBeTrue();
    expect(rootScope.profile.name).toBe("Ada");
    expect(scope.delete("profile.name")).toBeTrue();
    expect(rootScope.profile.name).toBeUndefined();
  });

  it("writes through scope-proxy-like nested targets without redefining properties", () => {
    const scope = abi.createScope(rootScope, { name: "todoList:main" });
    const proxyLike = {
      $handler: {
        set() {
          return true;
        },
      },
      $target: {},
    };

    rootScope.proxyLike = proxyLike;

    expect(scope.set("proxyLike.name", "Ada")).toBeTrue();
    expect(rootScope.proxyLike.name).toBe("Ada");
  });

  it("falls back to safe writes for raw handler-only scope targets", () => {
    const scope = abi.createScope(rootScope, { name: "todoList:main" });
    const target = {
      $handler: {},
    };

    rootScope.$target.$nonscope = ["handlerOnly"];
    rootScope.$target.handlerOnly = target;

    expect(scope.set("handlerOnly.name", "Ada")).toBeTrue();
    expect(target.name).toBe("Ada");
  });

  it("writes through real scope-proxy nested targets without redefining properties", () => {
    const scope = abi.createScope(rootScope, { name: "todoList:main" });
    let assignedName = "";
    const proxy = {
      [isProxySymbol]: true,
      $target: {},
    };

    Object.defineProperty(proxy, "name", {
      configurable: true,
      enumerable: true,
      get() {
        return assignedName;
      },
      set(value) {
        assignedName = value;
      },
    });

    rootScope.proxy = proxy;

    expect(scope.set("proxy.name", "Ada")).toBeTrue();
    expect(assignedName).toBe("Ada");
    expect(rootScope.proxy.name).toBe("Ada");
  });

  it("falls back to safe property writes for malformed scope-proxy-like targets", () => {
    const scope = abi.createScope(rootScope, { name: "todoList:main" });
    const cases = [
      {},
      {
        $handler: {},
        $target: {},
      },
      {
        $handler: {
          set: "not a function",
        },
        $target: {},
      },
      {
        $handler: {
          set() {
            return true;
          },
        },
      },
      {
        $handler: {
          set() {
            return true;
          },
        },
        $target: "not an object",
      },
      {
        $handler: null,
        $target: {},
      },
      {
        $handler() {
          return true;
        },
        $target: {},
      },
      {
        $handler: {
          set() {
            return true;
          },
        },
        $target: null,
      },
      {
        $handler: {
          set() {
            return true;
          },
        },
        $target() {
          return true;
        },
      },
    ];

    cases.forEach((target, index) => {
      rootScope[`maybeProxy${index}`] = target;

      expect(scope.set(`maybeProxy${index}.name`, `Ada ${index}`)).toBeTrue();
      expect(rootScope[`maybeProxy${index}`].name).toBe(`Ada ${index}`);
    });
  });

  it("updates the DOM when a Wasm scope mutates a top-level bound scope path", async () => {
    rootScope.titleSeen = "";

    el.setAttribute("ng-bind", "titleSeen");
    compile(el)(rootScope);

    await wait();

    expect(el.textContent).toBe("");

    const scope = abi.createScope(rootScope, { name: "todoList:main" });

    expect(scope.set("titleSeen", "Updated by Wasm")).toBeTrue();

    await wait();

    expect(el.textContent).toBe("Updated by Wasm");
  });

  it("updates the DOM when a Wasm import mutates a bound scope", async () => {
    rootScope.todo = {
      title: "Initial",
    };

    el.setAttribute("ng-bind", "todo.title");
    compile(el)(rootScope);

    await wait();

    expect(el.textContent).toBe("Initial");

    const scope = abi.createScope(rootScope, { name: "todoList:main" });

    const path = guest.write("todo.title");
    const value = guest.writeJson("Updated by Wasm");

    expect(
      imports.scope_set(scope.handle, path.ptr, path.len, value.ptr, value.len),
    ).toBe(1);
    expect(imports.scope_sync(scope.handle)).toBe(1);
    await wait();

    expect(el.textContent).toBe("Updated by Wasm");
  });

  it("updates repeated DOM when a Wasm import replaces a collection", async () => {
    rootScope.items = [{ title: "Initial" }];
    el.innerHTML = '<span ng-repeat="item in items">{{ item.title }}</span>';
    compile(el)(rootScope);

    await wait();

    expect(el.querySelectorAll("span").length).toBe(1);

    const scope = abi.createScope(rootScope, { name: "todoList:main" });
    const path = guest.write("items");
    const value = guest.writeJson([
      { title: "Initial" },
      { title: "Added by Wasm" },
    ]);

    expect(
      imports.scope_set(scope.handle, path.ptr, path.len, value.ptr, value.len),
    ).toBe(1);
    expect(imports.scope_sync(scope.handle)).toBe(1);
    await wait();

    const rows = el.querySelectorAll("span");

    expect(rows.length).toBe(2);
    expect(rows[1].textContent).toBe("Added by Wasm");
  });

  it("notifies guest exports when watched scope paths change", async () => {
    const updates: any[] = [];

    listenForGuestUpdates(exports, guest, (update) => updates.push(update));

    const scope = abi.createScope(rootScope, { name: "todoList:main" });
    const path = guest.write("count");
    const watch = imports.scope_watch(scope.handle, path.ptr, path.len);

    expect(watch).toBeGreaterThan(0);
    rootScope.count = 4;

    await wait();

    expect(updates).toEqual([
      {
        scopeHandle: scope.handle,
        path: "count",
        value: 4,
      },
    ]);

    expect(imports.scope_unwatch(watch)).toBe(1);

    rootScope.count = 5;

    await wait();

    expect(updates.length).toBe(1);
  });

  it("coalesces watched paths into one origin-aware guest transaction", async () => {
    const transactions: any[] = [];

    listenForGuestTransactions(exports, guest, (scopeHandle, transaction) => {
      transactions.push({ scopeHandle, ...transaction });
    });

    rootScope.count = 1;
    rootScope.stale = true;
    const scope = abi.createScope(rootScope, { name: "transaction:main" });
    const countPath = guest.write("count");
    const stalePath = guest.write("stale");

    imports.scope_watch(scope.handle, countPath.ptr, countPath.len);
    imports.scope_watch(scope.handle, stalePath.ptr, stalePath.len);

    scope.apply(
      { set: { count: 2 }, delete: ["stale"] },
      { origin: "host:simulation" },
    );
    await wait();

    expect(transactions).toEqual([
      {
        scopeHandle: scope.handle,
        set: { count: 2 },
        delete: ["stale"],
        origin: "host:simulation",
      },
    ]);
  });

  it("defers watched update notifications while scope is retention-paused", async () => {
    const updates: any[] = [];

    listenForGuestUpdates(exports, guest, (update) => updates.push(update));

    const scope = abi.createScope(rootScope, { name: "todoList:main" });
    const path = guest.write("count");
    const watch = imports.scope_watch(scope.handle, path.ptr, path.len);

    expect(watch).toBeGreaterThan(0);

    rootScope.count = 1;
    rootScope.$emit("$viewRetentionPause");

    const value = guest.writeJson(2);

    expect(
      imports.scope_set(scope.handle, path.ptr, path.len, value.ptr, value.len),
    ).toBe(1);

    await wait();

    expect(updates).toEqual([]);

    rootScope.$emit("$viewRetentionResume");

    await wait();

    expect(updates).toEqual([
      {
        scopeHandle: scope.handle,
        path: "count",
        value: 2,
      },
    ]);
  });

  it("ignores unrelated retention scheduler events for watched updates", async () => {
    const updates: any[] = [];

    listenForGuestUpdates(exports, guest, (update) => updates.push(update));

    const scope = abi.createScope(rootScope, { name: "todoList:main" });
    const path = guest.write("count");
    const value = guest.writeJson(2);

    expect(
      imports.scope_watch(scope.handle, path.ptr, path.len),
    ).toBeGreaterThan(0);

    rootScope.count = 1;
    rootScope.$emit("$viewRetentionResume");
    rootScope.$emit("$viewRetentionPause", {
      _pause: "background",
    });

    expect(
      imports.scope_set(scope.handle, path.ptr, path.len, value.ptr, value.len),
    ).toBe(1);

    await wait();

    expect(updates).toContain(
      jasmine.objectContaining({
        scopeHandle: scope.handle,
        path: "count",
        value: 2,
      }),
    );
  });

  it("ignores unrelated retention resume events while scheduler updates are paused", async () => {
    const updates: any[] = [];

    listenForGuestUpdates(exports, guest, ({ path, value }) => {
      updates.push({ path, value });
    });

    const scope = abi.createScope(rootScope, { name: "todoList:main" });
    const path = guest.write("count");
    const value = guest.writeJson(2);

    expect(
      imports.scope_watch(scope.handle, path.ptr, path.len),
    ).toBeGreaterThan(0);

    rootScope.count = 1;
    rootScope.$emit("$viewRetentionPause");

    expect(
      imports.scope_set(scope.handle, path.ptr, path.len, value.ptr, value.len),
    ).toBe(1);

    rootScope.$emit("$viewRetentionResume", {
      _pause: "background",
    });

    await wait();

    expect(updates).toEqual([]);

    rootScope.$emit("$viewRetentionResume");

    await wait();

    expect(updates).toEqual([
      {
        path: "count",
        value: 2,
      },
    ]);
  });

  it("coalesces queued watched updates while retention-paused", async () => {
    const updates: any[] = [];

    listenForGuestUpdates(exports, guest, ({ path, value }) => {
      updates.push({ path, value });
    });

    const scope = abi.createScope(rootScope, { name: "todoList:main" });
    const path = guest.write("count");
    expect(
      imports.scope_watch(scope.handle, path.ptr, path.len),
    ).toBeGreaterThan(0);

    rootScope.count = 1;
    rootScope.$emit("$viewRetentionPause");

    rootScope.count = 2;
    await wait();
    expect(updates).toEqual([]);

    rootScope.count = 3;

    await wait();

    expect(updates).toEqual([]);

    rootScope.$emit("$viewRetentionResume");

    await wait();

    expect(updates).toEqual([
      {
        path: "count",
        value: 3,
      },
    ]);
  });

  it("keeps queued watched updates paused when the scope pauses again before flush", async () => {
    const updates: any[] = [];

    listenForGuestUpdates(exports, guest, ({ path, value }) => {
      updates.push({ path, value });
    });

    const scope = abi.createScope(rootScope, { name: "todoList:main" });
    const path = guest.write("count");
    const value = guest.writeJson(2);

    expect(
      imports.scope_watch(scope.handle, path.ptr, path.len),
    ).toBeGreaterThan(0);

    rootScope.count = 1;
    rootScope.$emit("$viewRetentionPause");

    expect(
      imports.scope_set(scope.handle, path.ptr, path.len, value.ptr, value.len),
    ).toBe(1);

    rootScope.$emit("$viewRetentionResume");
    rootScope.$emit("$viewRetentionPause");

    await wait();

    expect(updates).toEqual([]);

    rootScope.$emit("$viewRetentionResume");

    await wait();

    expect(updates).toEqual([
      {
        path: "count",
        value: 2,
      },
    ]);
  });

  it("drops queued watched updates when the scope is destroyed", async () => {
    const updates: any[] = [];

    listenForGuestUpdates(exports, guest, ({ path, value }) => {
      updates.push({ path, value });
    });

    const scope = abi.createScope(rootScope, { name: "todoList:main" });
    const path = guest.write("count");
    const value = guest.writeJson(2);

    expect(
      imports.scope_watch(scope.handle, path.ptr, path.len),
    ).toBeGreaterThan(0);

    rootScope.$emit("$viewRetentionPause");

    expect(
      imports.scope_set(scope.handle, path.ptr, path.len, value.ptr, value.len),
    ).toBe(1);

    rootScope.$destroy();
    rootScope.$emit("$viewRetentionResume");

    await wait();

    expect(updates).toEqual([]);
  });

  it("drops queued watched updates when the scope is destroyed after resume schedules a flush", async () => {
    const updates: any[] = [];

    listenForGuestUpdates(exports, guest, ({ path, value }) => {
      updates.push({ path, value });
    });

    const scope = abi.createScope(rootScope, { name: "todoList:main" });
    const path = guest.write("count");
    const value = guest.writeJson(2);

    expect(
      imports.scope_watch(scope.handle, path.ptr, path.len),
    ).toBeGreaterThan(0);

    rootScope.count = 1;
    rootScope.$emit("$viewRetentionPause");

    expect(
      imports.scope_set(scope.handle, path.ptr, path.len, value.ptr, value.len),
    ).toBe(1);

    rootScope.$emit("$viewRetentionResume");
    rootScope.$destroy();

    await wait();

    expect(updates).toEqual([]);
  });

  it("shares retention state across wrappers for the same AngularTS scope", async () => {
    const updates: any[] = [];

    listenForGuestUpdates(exports, guest, (update) => updates.push(update));

    const firstScope = abi.createScope(rootScope, { name: "todoList:first" });
    const secondScope = abi.createScope(rootScope, { name: "todoList:second" });
    const path = guest.write("count");
    const value = guest.writeJson(2);

    expect(
      imports.scope_watch(secondScope.handle, path.ptr, path.len),
    ).toBeGreaterThan(0);

    rootScope.count = 1;
    rootScope.$emit("$viewRetentionPause");

    expect(
      imports.scope_set(
        secondScope.handle,
        path.ptr,
        path.len,
        value.ptr,
        value.len,
      ),
    ).toBe(1);

    await wait();

    expect(updates).toEqual([]);

    rootScope.$emit("$viewRetentionResume");

    await wait();

    expect(updates).toEqual([
      {
        scopeHandle: secondScope.handle,
        path: "count",
        value: 2,
      },
    ]);
  });

  it("initializes watched exports when binding by default", async () => {
    const updates: any[] = [];

    rootScope.count = 7;
    listenForGuestUpdates(exports, guest, (update) => updates.push(update));

    const scope = abi.createScope(rootScope, { name: "todoList:main" });
    const dispose = scope.bind({
      watch: ["count"],
    });

    await wait();

    expect(updates).toEqual([
      {
        scopeHandle: scope.handle,
        path: "count",
        value: 7,
      },
    ]);

    dispose();
  });

  it("allows edge-triggered bindings to skip initial values", async () => {
    const updates: WasmScopeUpdate[] = [];

    rootScope.count = 7;
    listenForGuestUpdates(exports, guest, (update) => {
      updates.push({ ...update, scopeName: "todoList:main" });
    });

    const scope = abi.createScope(rootScope, { name: "todoList:main" });
    const dispose = scope.bind({
      watch: ["count"],
      initial: false,
    });

    await wait();

    expect(updates).toEqual([]);

    rootScope.count = 8;
    await wait();

    expect(updates).toEqual([
      {
        scopeHandle: scope.handle,
        scopeName: "todoList:main",
        path: "count",
        value: 8,
      },
    ]);

    dispose();
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
    const dispose = scope.bind();

    dispose();
    dispose();

    expect(calls).toEqual([
      `bind:${scope.handle}:todoList:main`,
      `unbind:${scope.handle}`,
    ]);
  });

  it("unbinds scopes by name and clears owned watches", async () => {
    const updates: any[] = [];

    listenForGuestUpdates(exports, guest, ({ path, value }) => {
      updates.push({ path, value });
    });

    const scope = abi.createScope(rootScope, { name: "todoList:main" });
    const name = guest.write("todoList:main");
    const path = guest.write("count");
    const value = guest.writeJson(1);

    expect(
      imports.scope_watch(scope.handle, path.ptr, path.len),
    ).toBeGreaterThan(0);
    expect(imports.scope_unbind(scope.handle)).toBe(1);
    expect(scope.disposed).toBeTrue();
    expect(imports.scope_resolve(name.ptr, name.len)).toBe(0);
    expect(
      imports.scope_set(scope.handle, path.ptr, path.len, value.ptr, value.len),
    ).toBe(0);

    rootScope.count = 2;

    await wait();

    expect(updates).toEqual([]);
  });

  it("rolls back tracked writes when an atomic transaction fails", () => {
    const target = {
      $id: 10_001,
      $handler: { _destroyed: false },
      $on: () => () => undefined,
      $batch: () => {
        throw new Error("transaction failed");
      },
      count: 1,
      stale: true,
    };
    const scope = abi.createScope(target, { name: "rollback:scope" });

    scope._watchedPaths.set("count", 1);
    scope._watchedPaths.set("stale", 1);

    expect(() =>
      scope.apply({ set: { count: 2 }, delete: ["stale"] }),
    ).toThrowError("transaction failed");

    const rollbackFirst = scope._trackWrite(
      "count",
      2,
      { origin: "first" },
      false,
    );
    const rollbackSecond = scope._trackWrite(
      "count",
      3,
      { origin: "second" },
      false,
    );

    rollbackSecond();
    rollbackFirst();
    scope._trackWrite("count", 1, {}, false)();
  });

  it("validates direct binary values and repeated path watches", () => {
    const scope = abi.createScope(rootScope, { name: "binary:direct" });
    const firstWatch = scope.watch("frame", () => undefined);
    const secondWatch = scope.watch("frame", () => undefined);
    const buffer = Uint8Array.from([1, 2, 3]).buffer;

    expect(scope.setBinary("frame", buffer)).toBeTrue();
    expect(Array.from(scope.getBinary("frame"))).toEqual([1, 2, 3]);
    expect(scope.setBinary("frame", {})).toBeFalse();

    const shared = new WebAssembly.Memory({
      initial: 1,
      maximum: 1,
      shared: true,
    }).buffer;
    const originalSharedArrayBuffer = globalThis.SharedArrayBuffer;

    globalThis.SharedArrayBuffer = shared.constructor;
    try {
      expect(scope.setBinary("shared", shared)).toBeTrue();
    } finally {
      globalThis.SharedArrayBuffer = originalSharedArrayBuffer;
    }

    firstWatch();
    firstWatch();
    secondWatch();
  });

  it("contains the remaining ABI handle and transaction failures", () => {
    const path = guest.write("value");
    const binary = guest.write("bytes");
    const transaction = guest.writeJson({ set: { value: 1 } });

    expect(imports.scope_apply(404, transaction.ptr, transaction.len)).toBe(0);
    expect(imports.scope_get_binary(404, path.ptr, path.len)).toBe(0);
    expect(
      imports.scope_set_binary(
        404,
        path.ptr,
        path.len,
        binary.ptr,
        binary.len,
        0,
        0,
      ),
    ).toBe(0);

    const scope = abi.createScope(rootScope, { name: "abi:failures" });

    rootScope.value = "not binary";
    expect(imports.scope_get_binary(scope.handle, path.ptr, path.len)).toBe(0);
    expect(imports.scope_delete(scope.handle, path.ptr, path.len)).toBe(1);
    const missing = guest.write("missing.value");

    expect(imports.scope_delete(scope.handle, missing.ptr, missing.len)).toBe(
      0,
    );

    const badOptions = [
      1,
      { origin: 1 },
      { echo: "yes" },
      { origin: "x".repeat(16 * 1024 + 1) },
    ];

    for (const value of badOptions) {
      const options = guest.writeJson(value);

      expect(
        imports.scope_set_binary(
          scope.handle,
          path.ptr,
          path.len,
          binary.ptr,
          binary.len,
          options.ptr,
          options.len,
        ),
      ).toBe(0);
    }
  });

  it("rejects malformed transaction shapes comprehensively", () => {
    const scope = abi.createScope(rootScope, { name: "transaction:invalid" });
    const invalid = [
      null,
      {},
      { set: [] },
      { delete: "value" },
      { delete: [1] },
      { set: { value: 1 }, delete: ["value"] },
      { delete: ["value", "value"] },
      { set: { "": 1 } },
      Object.assign(Object.create(null), { set: { value: 1 } }),
    ];

    for (const transaction of invalid.slice(0, -1)) {
      expect(() => scope.apply(transaction)).toThrow();
    }

    expect(() => scope.apply(invalid.at(-1))).not.toThrow();
  });

  it("contains invalid pointers, ABI versions, and memory views", () => {
    const path = guest.write("value");
    const scope = abi.createScope(rootScope, { name: "pointer:validation" });

    expect(imports.scope_get(scope.handle, 1.5, path.len)).toBe(0);
    expect(imports.scope_get(scope.handle, -1, path.len)).toBe(0);
    expect(imports.scope_get(scope.handle, 0, 1)).toBe(0);

    const missingVersion = guest.exports();

    delete missingVersion.ng_abi_version;
    expect(() => WasmAbi.create().attach(missingVersion)).toThrowError(
      "Unsupported AngularTS Wasm ABI version -1; expected 3",
    );

    const invalidVersion = guest.exports();

    invalidVersion.ng_abi_version = () => 1.5;
    expect(() => WasmAbi.create().attach(invalidVersion)).toThrowError(
      "Unsupported AngularTS Wasm ABI version -1; expected 3",
    );

    const originalSharedArrayBuffer = globalThis.SharedArrayBuffer;

    class TestSharedArrayBuffer {}

    globalThis.SharedArrayBuffer = TestSharedArrayBuffer;

    try {
      const sharedMemory = guest.exports();

      sharedMemory.memory = { buffer: new TestSharedArrayBuffer() };
      expect(() => WasmAbi.create().attach(sharedMemory)).not.toThrow();
    } finally {
      globalThis.SharedArrayBuffer = originalSharedArrayBuffer;
    }

    const throwingMemory = guest.exports();

    throwingMemory.memory = {
      get buffer() {
        throw new Error("memory unavailable");
      },
    };
    expect(() => WasmAbi.create().attach(throwingMemory)).toThrowError(
      "WebAssembly module does not export the AngularTS reactive ABI",
    );
  });

  it("drops queued guest transactions and releases outstanding buffers on dispose", async () => {
    const scope = abi.createScope(rootScope, { name: "dispose:queued" });
    const path = guest.write("value");

    rootScope.value = 1;
    const buffer = imports.scope_get(scope.handle, path.ptr, path.len);

    abi._queueUpdate({
      scopeHandle: scope.handle,
      scopeName: scope.name,
      path: "value",
      value: 2,
      deleted: false,
    });
    abi.dispose();
    await Promise.resolve();

    expect(imports.buffer_ptr(buffer)).toBe(0);
    expect(imports.error_code()).toBe(WasmAbiError.disposed);
  });

  it("handles unnamed scopes and safe direct path edge cases", () => {
    const unnamed = rootScope.$new();

    delete unnamed.$scopename;
    const scope = abi.createScope(unnamed);

    expect(scope.name).toBe(String(unnamed.$id));
    expect(scope.get("__proto__.polluted")).toBeUndefined();

    scope._watchedPaths.set("", 1);
    scope._trackWrite("", unnamed, {}, false)();
    scope._watchedPaths.set("__proto__.polluted", 1);
    scope._trackWrite("__proto__.polluted", undefined, {}, true)();

    unnamed.scalar = 1;
    scope._watchedPaths.set("scalar.child", 1);
    expect(scope.set("scalar.child", 2)).toBeTrue();
    expect(scope.delete("")).toBeFalse();
    expect(scope.delete("__proto__.polluted")).toBeFalse();
  });

  it("skips guest transactions without a callback and omits mixed origins", async () => {
    const scope = abi.createScope(rootScope, { name: "transaction:optional" });

    abi._queueUpdate({
      scopeHandle: scope.handle,
      scopeName: scope.name,
      path: "first",
      value: 1,
      deleted: false,
      origin: "left",
    });
    await Promise.resolve();

    const transactions = [];

    listenForGuestTransactions(exports, guest, (_handle, transaction) => {
      transactions.push(transaction);
    });
    abi._queueUpdate({
      scopeHandle: scope.handle,
      scopeName: scope.name,
      path: "first",
      value: 2,
      deleted: false,
      origin: "left",
    });
    abi._queueUpdate({
      scopeHandle: scope.handle,
      scopeName: scope.name,
      path: "second",
      value: 3,
      deleted: false,
      origin: "right",
    });
    await Promise.resolve();

    expect(transactions).toEqual([
      {
        set: { first: 2, second: 3 },
        delete: [],
      },
    ]);
  });

  it("reports asynchronous unbind callback faults", async () => {
    const report = jasmine.createSpy("report");
    const scope = abi.createScope(rootScope, { name: "unbind:fault" });

    abi._reportGuestFault = report;
    exports.ng_scope_on_unbind = () => {
      throw new Error("unbind failed");
    };

    scope.bind()();
    await Promise.resolve();

    expect(report).toHaveBeenCalledWith(jasmine.any(Error));
  });

  it("rejects host payloads larger than the ABI limit", () => {
    expect(() =>
      abi._writeGuestBytes(new Uint8Array(16 * 1024 * 1024 + 1)),
    ).toThrowError("AngularTS Wasm ABI payload exceeds 16777216 bytes");

    abi._bufferBytes = 64 * 1024 * 1024;
    expect(() => abi._createResultBytes(Uint8Array.of(1))).toThrow();
    abi._bufferBytes = 0;

    expect(() => abi._reportGuestFault(new Error("guest fault"))).toThrowError(
      "guest fault",
    );
  });

  it("exposes one high-level load operation", () => {
    expect(wasmService.load).toEqual(jasmine.any(Function));
  });

  it("loads a stable resource instead of a union result", async () => {
    const resource = wasmService.load<{
      add(left: number, right: number): number;
    }>({ source: "/src/directive/wasm/math.wasm" });

    expect(resource.status).toBe("loading");

    await resource.ready;

    expect(resource.exports.add(2, 3)).toBe(5);
    expect(resource.instance).toEqual(jasmine.any(WebAssembly.Instance));
    expect(resource.module).toEqual(jasmine.any(WebAssembly.Module));
    expect(resource.disposed).toBeFalse();
    await expectAsync(resource.bind(rootScope)).toBeRejectedWith(
      jasmine.objectContaining({ code: "unsupported-abi" }),
    );

    resource.dispose();

    expect(resource.disposed).toBeTrue();
  });

  it("loads native request, response, byte, and compiled module sources", async () => {
    const fetched = await fetch("/src/directive/wasm/math.wasm");
    const bytes = await fetched.clone().arrayBuffer();
    const module = await WebAssembly.compile(bytes);
    const sources = [
      new Request("/src/directive/wasm/math.wasm"),
      fetched,
      bytes,
      new Uint8Array(bytes),
      module,
    ];

    for (const source of sources) {
      const resource = wasmService.load<{
        add(left: number, right: number): number;
      }>({ source });

      await resource.ready;
      expect(resource.exports.add(2, 3)).toBe(5);
      resource.dispose();
    }

    expect(fetched.bodyUsed).toBeFalse();
  });

  it("falls back from streaming only for TypeError failures", async () => {
    const bytes = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]);
    const nativeCompile = WebAssembly.compile;
    const compileModule = spyOn(WebAssembly, "compile").and.callFake((source) =>
      nativeCompile(source),
    );

    spyOn(WebAssembly, "compileStreaming").and.rejectWith(
      new TypeError("invalid MIME type"),
    );

    await instantiateWasm(new Response(bytes), {});

    expect(compileModule).toHaveBeenCalledTimes(1);
  });

  it("does not retry compilation, linking, or guest start failures", async () => {
    const bytes = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]);
    const failure = new WebAssembly.CompileError("invalid module");
    const compileModule = spyOn(WebAssembly, "compile");

    spyOn(WebAssembly, "compileStreaming").and.rejectWith(failure);

    await expectAsync(
      instantiateWasm(
        new Response(bytes, {
          headers: { "Content-Type": "application/wasm" },
        }),
      ),
    ).toBeRejectedWith(failure);
    expect(compileModule).not.toHaveBeenCalled();
  });

  it("deduplicates compilation while creating independent instances", async () => {
    const nativeCompileStreaming = WebAssembly.compileStreaming;
    const compileStreaming = spyOn(
      WebAssembly,
      "compileStreaming",
    ).and.callFake((source) => nativeCompileStreaming(source));
    const left = wasmService.load({
      source: "/src/directive/wasm/math.wasm",
    });
    const right = wasmService.load({
      source: "/src/directive/wasm/math.wasm",
    });

    await Promise.all([left.ready, right.ready]);

    expect(compileStreaming).toHaveBeenCalledTimes(1);
    expect(left.module).toBe(right.module);
    expect(left.instance).not.toBe(right.instance);

    left.dispose();
    right.dispose();
  });

  it("forwards standard compile options and separates cache entries", async () => {
    const nativeCompileStreaming = WebAssembly.compileStreaming;
    const optionsSeen: unknown[] = [];
    const source = "/src/directive/wasm/math.wasm?compile-options-cache";

    spyOn(WebAssembly, "compileStreaming").and.callFake((source, options) => {
      optionsSeen.push(options);

      return (
        nativeCompileStreaming as (
          source: Promise<Response> | Response,
          options?: ng.WasmCompileOptions,
        ) => Promise<WebAssembly.Module>
      )(source, options);
    });

    const baseline = wasmService.load({
      source,
    });
    const builtins: string[] = [];
    const configured = wasmService.load({
      source,
      compile: { builtins },
    });

    builtins.push("js-string");

    await Promise.all([baseline.ready, configured.ready]);

    expect(optionsSeen).toEqual([undefined, { builtins: [] }]);
    expect(Object.isFrozen(optionsSeen[1])).toBeTrue();
    expect(Object.isFrozen((optionsSeen[1] as any).builtins)).toBeTrue();
    expect(baseline.module).not.toBe(configured.module);

    baseline.dispose();
    configured.dispose();
  });

  it("bounds the URL compilation cache with least-recently-used eviction", async () => {
    const context = new AppContext();
    const state = createWasmRuntimeState(context);
    const service = createWasmService(state);
    const bytes = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]);
    const module = await WebAssembly.compile(bytes);
    const compileStreaming = spyOn(
      WebAssembly,
      "compileStreaming",
    ).and.resolveTo(module);

    spyOn(window, "fetch").and.callFake(
      async () =>
        new Response(bytes, {
          headers: { "Content-Type": "application/wasm" },
        }),
    );

    for (let index = 0; index < 65; index++) {
      const resource = service.load({ source: `/lru-${String(index)}.wasm` });

      await resource.ready;
      resource.dispose();
    }

    expect(state.moduleCache.size).toBe(64);

    const evicted = service.load({ source: "/lru-0.wasm" });

    await evicted.ready;
    expect(compileStreaming).toHaveBeenCalledTimes(66);

    evicted.dispose();
    destroyWasmRuntimeState(state);
    context.destroy();
  });

  it("rejects collisions with reserved ABI imports and permits extensions", async () => {
    const module = await WebAssembly.compile(
      new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]),
    );
    const extension = (): number => 1;
    const valid = wasmService.load({
      source: module,
      imports: { angular_ts: { extension } },
    });

    await valid.ready;
    valid.dispose();

    const collision = wasmService.load({
      source: module,
      imports: { angular_ts: { scope_get: extension } },
    });

    await expectAsync(collision.ready).toBeRejectedWith(
      jasmine.objectContaining({
        code: "load",
        stage: "link",
        message: jasmine.stringContaining(
          "angular_ts.scope_get' is reserved by AngularTS",
        ),
      }),
    );
    collision.dispose();
  });

  it("keeps shared compilation alive until the final consumer releases it", async () => {
    const response = await fetch("/src/directive/wasm/math.wasm");
    let releaseFetch = (): void => undefined;
    let fetchSignal: AbortSignal | undefined;
    const blocked = new Promise<void>((resolve) => {
      releaseFetch = resolve;
    });

    spyOn(window, "fetch").and.callFake(async (_source, init) => {
      fetchSignal = init?.signal;
      await blocked;

      return response.clone();
    });

    const left = wasmService.load({ source: "/shared-module.wasm" });
    const right = wasmService.load({ source: "/shared-module.wasm" });

    left.dispose();

    expect(fetchSignal?.aborted).toBeFalse();

    releaseFetch();
    await right.ready;

    expect(right.status).toBe("ready");

    await expectAsync(left.ready).toBeRejectedWith(
      jasmine.objectContaining({ code: "disposed" }),
    );
    right.dispose();
  });

  it("binds reactive targets and owns binding disposal", async () => {
    const resource = wasmService.load({
      source: "/integrations/wasm/c/examples/todo/main.wasm",
    });
    const binding = await resource.bind(rootScope, {
      name: "runtime:scope",
      watch: ["count"],
    });

    expect(binding.name).toBe("runtime:scope");
    expect(binding.target).toBe(rootScope);
    expect(binding.disposed).toBeFalse();

    resource.dispose();

    expect(binding.disposed).toBeTrue();
    expect(resource.disposed).toBeTrue();
    expect(rootScope.$handler._destroyed).toBeFalse();
  });

  it("reports invalid binding names with structured errors", async () => {
    const resource = wasmService.load({
      source: "/integrations/wasm/c/examples/todo/main.wasm",
    });

    await resource.ready;

    await expectAsync(
      resource.bind(rootScope, { name: "   " }),
    ).toBeRejectedWith(
      jasmine.objectContaining({
        code: "binding",
        stage: "bind",
        message: "Wasm scope name must not be empty",
      }),
    );

    const binding = await resource.bind(rootScope, { name: "runtime:scope" });
    const duplicateTarget = rootScope.$new();

    await expectAsync(
      resource.bind(duplicateTarget, { name: "runtime:scope" }),
    ).toBeRejectedWith(
      jasmine.objectContaining({
        code: "binding",
        stage: "bind",
        message: "Wasm scope name 'runtime:scope' is already bound",
      }),
    );

    duplicateTarget.$destroy();
    binding.dispose();
    resource.dispose();
  });

  it("binds app-owned models and follows their lifecycle", async () => {
    const context = new AppContext();
    const model = context.createReactive({ count: 1 });
    const resource = wasmService.load({
      source: "/integrations/wasm/c/examples/todo/main.wasm",
    });
    const binding = await resource.bind(model, {
      name: "runtime:model",
      watch: ["count"],
    });

    expect(binding.target).toBe(model);
    expect(binding.name).toBe("runtime:model");
    expect(binding.disposed).toBeFalse();

    context.destroy();

    expect(binding.disposed).toBeTrue();
    expect(resource.disposed).toBeFalse();

    resource.dispose();
  });

  it("reports failed loads through resource state and structured errors", async () => {
    const resource = wasmService.load({ source: "/missing-module.wasm" });

    await expectAsync(resource.ready).toBeRejectedWith(
      jasmine.objectContaining({
        code: "load",
        source: "/missing-module.wasm",
        stage: "compile",
      }),
    );

    expect(resource.status).toBe("error");
    expect(resource.error).toEqual(jasmine.objectContaining({ code: "load" }));
    let exportsError: unknown;

    try {
      resource.exports;
    } catch (error) {
      exportsError = error;
    }

    expect(exportsError).toEqual(jasmine.objectContaining({ code: "load" }));

    resource.dispose();
  });

  it("distinguishes compilation, linking, and start failures", async () => {
    const invalid = wasmService.load({ source: new Uint8Array([0]) });

    await expectAsync(invalid.ready).toBeRejectedWith(
      jasmine.objectContaining({ code: "load", stage: "compile" }),
    );
    invalid.dispose();

    const module = await WebAssembly.compile(
      new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]),
    );

    spyOn(WebAssembly, "instantiate").and.rejectWith(
      new WebAssembly.LinkError("missing import"),
    );

    const linked = wasmService.load({ source: module });

    await expectAsync(linked.ready).toBeRejectedWith(
      jasmine.objectContaining({ code: "load", stage: "link" }),
    );
    linked.dispose();
  });

  it("classifies start-function traps separately from link failures", async () => {
    const module = await WebAssembly.compile(
      new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]),
    );

    spyOn(WebAssembly, "instantiate").and.rejectWith(
      new WebAssembly.RuntimeError("start trapped"),
    );

    const resource = wasmService.load({ source: module });

    await expectAsync(resource.ready).toBeRejectedWith(
      jasmine.objectContaining({ code: "load", stage: "start" }),
    );
    resource.dispose();
  });

  it("preserves HTTP status details in structured load failures", async () => {
    const source = new Response("unavailable", {
      status: 503,
      statusText: "Service Unavailable",
    });
    const resource = wasmService.load({ source });

    await expectAsync(resource.ready).toBeRejectedWith(
      jasmine.objectContaining({ code: "load", source, stage: "fetch" }),
    );
    expect((resource.error?.cause as Error).message).toBe(
      "WebAssembly fetch failed (503 Service Unavailable)",
    );

    resource.dispose();
  });

  it("reports HTTP failures without an empty status label", async () => {
    const source = new Response("unavailable", {
      status: 500,
      statusText: "",
    });
    const resource = wasmService.load({ source });

    await expectAsync(resource.ready).toBeRejected();
    expect((resource.error?.cause as Error).message).toBe(
      "WebAssembly fetch failed (500)",
    );

    resource.dispose();
  });

  it("classifies mismatched guest ABI versions before binding", async () => {
    const mismatchedGuest = new GuestMemory();
    const guestExports = mismatchedGuest.exports();
    const module = await WebAssembly.compile(
      new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]),
    );
    const instance = { exports: guestExports } as WebAssembly.Instance;

    guestExports.ng_abi_version = () => 1;

    spyOn(WebAssembly, "instantiate").and.resolveTo(instance);

    const resource = wasmService.load({ source: module });

    await expectAsync(resource.ready).toBeRejectedWith(
      jasmine.objectContaining({
        code: "unsupported-abi",
        message: "Unsupported AngularTS Wasm ABI version 1; expected 3",
        source: module,
      }),
    );
    expect(resource.status).toBe("error");

    resource.dispose();
  });

  it("handles failed readiness for status-only declarative consumers", async () => {
    const unhandled = jasmine.createSpy("unhandledrejection");
    const listener = (event: PromiseRejectionEvent) => {
      unhandled(event.reason);
      event.preventDefault();
    };

    window.addEventListener("unhandledrejection", listener);

    try {
      const resource = wasmService.load({
        source: "/missing-declarative.wasm",
      });

      await waitUntil(() => resource.status === "error");

      expect(resource.status).toBe("error");
      expect(unhandled).not.toHaveBeenCalled();
      resource.dispose();
    } finally {
      window.removeEventListener("unhandledrejection", listener);
    }
  });

  it("reports guest callback faults and disposes the failed binding", async () => {
    const context = new AppContext();
    const report = jasmine.createSpy("reportGuestFault");
    const state = createWasmRuntimeState(context);
    const service = createWasmService(state);
    const fakeGuest = new GuestMemory();
    const guestExports = fakeGuest.exports();
    const module = await WebAssembly.compile(
      new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]),
    );
    const instance = { exports: guestExports } as WebAssembly.Instance;

    context.setExceptionHandler(report);
    guestExports.ng_scope_on_transaction = () => {
      throw new Error("guest callback failed");
    };

    const nativeInstantiate = WebAssembly.instantiate;

    spyOn(WebAssembly, "instantiate").and.callFake((source, imports) => {
      if (source === module) {
        return Promise.resolve(instance);
      }

      return nativeInstantiate(source, imports);
    });

    const resource = service.load({ source: module });
    const model = context.createReactive({ count: 0 });
    const binding = await resource.bind(model, {
      name: "faulted:model",
      watch: ["count"],
      initial: false,
    });

    model.count = 1;
    await wait();

    expect(binding.disposed).toBeTrue();
    expect(report).toHaveBeenCalledWith(jasmine.any(Error));

    resource.dispose();
    destroyWasmRuntimeState(state);
    context.destroy();
  });

  it("publishes opt-in lifecycle and guest callback performance entries", async () => {
    const measureNames = [
      "angular.ts:wasm:bind",
      "angular.ts:wasm:compile",
      "angular.ts:wasm:guest-callback",
      "angular.ts:wasm:instantiate",
      "angular.ts:wasm:load",
    ];

    for (const name of measureNames) performance.clearMeasures(name);

    const resource = wasmService.load({
      source: "/integrations/wasm/c/examples/todo/main.wasm",
      diagnostics: true,
    });
    const target = rootScope.$new();
    const binding = await resource.bind(target, {
      name: "diagnostics:scope",
      watch: ["count"],
      initial: false,
    });

    target.count = 1;
    await wait();
    binding.dispose();
    resource.dispose();

    for (const name of measureNames) {
      expect(performance.getEntriesByName(name).length).toBeGreaterThan(0);
    }

    const compileEntry = performance.getEntriesByName(
      "angular.ts:wasm:compile",
    )[0] as PerformanceMeasure;

    expect(compileEntry.detail).toEqual(
      jasmine.objectContaining({
        cacheStatus: "miss",
        source: "/integrations/wasm/c/examples/todo/main.wasm",
      }),
    );

    target.$destroy();
    for (const name of measureNames) performance.clearMeasures(name);
  });

  it("distinguishes compilation misses, shared work, and settled hits", async () => {
    const source = "/src/directive/wasm/math.wasm?diagnostic-cache";

    performance.clearMeasures("angular.ts:wasm:compile");

    const left = wasmService.load({ source, diagnostics: true });
    const right = wasmService.load({ source, diagnostics: true });

    await Promise.all([left.ready, right.ready]);

    const cached = wasmService.load({ source, diagnostics: true });

    await cached.ready;

    const statuses = performance
      .getEntriesByName("angular.ts:wasm:compile")
      .map((entry) => (entry as PerformanceMeasure).detail.cacheStatus);

    expect(statuses).toEqual(["miss", "shared-pending", "hit"]);

    left.dispose();
    right.dispose();
    cached.dispose();
    performance.clearMeasures("angular.ts:wasm:compile");
  });

  it("releases resources, bindings, watches, and reactive targets under stress", async () => {
    const context = new AppContext();
    const state = createWasmRuntimeState(context);
    const service = createWasmService(state);

    for (let index = 0; index < 25; index++) {
      const resource = service.load({
        source: "/integrations/wasm/c/examples/todo/main.wasm",
      });
      const target = context.createReactive({ count: index });
      const binding = await resource.bind(target, {
        name: `stress:${String(index)}`,
        watch: ["count"],
      });
      const ownedAbi = resource._abi;

      target.count++;
      await wait();
      binding.dispose();
      resource.dispose();
      target.$destroy();

      expect(ownedAbi._scopes.size).toBe(0);
      expect(ownedAbi._watches.size).toBe(0);
      expect(ownedAbi._buffers.size).toBe(0);
      expect(state.resources.size).toBe(0);
    }

    expect(state.moduleCache.size).toBe(1);
    expect(state.moduleEntries.size).toBe(0);
    expect(context._reactiveModels.size).toBe(0);

    destroyWasmRuntimeState(state);
    context.destroy();

    expect(state.moduleCache.size).toBe(0);
    expect(state.resources.size).toBe(0);
    expect(context.models.size).toBe(0);
  });

  it("evicts failed compilations so later loads can retry", async () => {
    const context = new AppContext();
    const state = createWasmRuntimeState(context);
    const service = createWasmService(state);
    const first = service.load({ source: "/missing-cache-entry.wasm" });

    await expectAsync(first.ready).toBeRejected();

    expect(state.moduleCache.size).toBe(0);
    expect(state.moduleEntries.size).toBe(0);

    first.dispose();
    destroyWasmRuntimeState(state);
    context.destroy();
  });

  it("rejects a binding when its target is destroyed during loading", async () => {
    const response = await fetch("/src/directive/wasm/math.wasm");
    let releaseFetch: (response: Response) => void = () => undefined;
    const pendingFetch = new Promise<Response>((resolve) => {
      releaseFetch = resolve;
    });

    spyOn(window, "fetch").and.returnValue(pendingFetch);

    const resource = wasmService.load({
      source: "/src/directive/wasm/math.wasm",
    });
    const target = rootScope.$new();
    const binding = resource.bind(target);

    target.$destroy();

    await expectAsync(binding).toBeRejectedWith(
      jasmine.objectContaining({ code: "binding" }),
    );

    releaseFetch(response);
    await resource.ready;
    resource.dispose();
  });

  it("rejects an already-destroyed binding target immediately", async () => {
    const resource = wasmService.load({
      source: "/integrations/wasm/c/examples/todo/main.wasm",
    });
    const target = rootScope.$new();

    await resource.ready;
    target.$destroy();

    await expectAsync(resource.bind(target)).toBeRejectedWith(
      jasmine.objectContaining({
        code: "binding",
        message: "Cannot bind a destroyed AngularTS reactive target",
      }),
    );

    resource.dispose();
  });

  it("rejects readiness when disposed during loading", async () => {
    const response = await fetch("/src/directive/wasm/math.wasm");

    spyOn(window, "fetch").and.returnValue(Promise.resolve(response));

    const resource = wasmService.load({
      source: "/src/directive/wasm/math.wasm",
    });

    resource.dispose();

    await expectAsync(resource.ready).toBeRejectedWith(
      jasmine.objectContaining({ code: "disposed" }),
    );
    expect(resource.status).toBe("disposed");
  });

  it("aborts the module fetch when disposed during loading", async () => {
    let fetchSignal: AbortSignal | undefined;

    spyOn(window, "fetch").and.callFake((_input, init) => {
      fetchSignal = init?.signal ?? undefined;

      return new Promise<Response>((_resolve, reject) => {
        fetchSignal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted", "AbortError"));
        });
      });
    });

    const resource = wasmService.load({
      source: "/src/directive/wasm/math.wasm",
    });

    resource.dispose();

    expect(fetchSignal?.aborted).toBeTrue();
    await expectAsync(resource.ready).toBeRejectedWith(
      jasmine.objectContaining({ code: "disposed" }),
    );
  });

  it("disposes every resource owned by the runtime", async () => {
    const context = new AppContext();
    const state = createWasmRuntimeState(context);
    const service = createWasmService(state);
    const resource = service.load({
      source: "/src/directive/wasm/math.wasm",
    });

    await resource.ready;

    destroyWasmRuntimeState(state);
    destroyWasmRuntimeState(state);

    expect(resource.disposed).toBeTrue();
    expect(rootScope.$handler._destroyed).toBeFalse();
    let runtimeError: unknown;

    try {
      service.load({ source: "/src/directive/wasm/math.wasm" });
    } catch (error) {
      runtimeError = error;
    }

    expect(runtimeError).toEqual(
      jasmine.objectContaining({ code: "disposed" }),
    );

    context.destroy();
  });

  it("exposes loading and disposed resource failures consistently", async () => {
    const resource = wasmService.load({
      source: "/integrations/wasm/c/examples/todo/main.wasm?resource-state",
    });

    expect(() => resource.exports).toThrowError(
      "WebAssembly resource is still loading",
    );

    await resource.ready;

    const binding = await resource.bind(rootScope.$new(), {
      name: "resource:state",
    });

    binding.dispose();
    binding.dispose();
    resource.dispose();
    resource.dispose();

    expect(() => resource.exports).toThrowError(
      "WebAssembly resource has been disposed",
    );
    await expectAsync(resource.bind(rootScope)).toBeRejectedWith(
      jasmine.objectContaining({ code: "disposed" }),
    );
  });

  it("removes destroyed lifecycle observers before scheduling updates", async () => {
    const resource = wasmService.load({
      source: "/src/directive/wasm/math.wasm?lifecycle-observer",
    });
    const observer = rootScope.$new();
    const schedule = jasmine.createSpy("schedule");
    const liveHandler = {
      $id: 20_001,
      _destroyed: false,
      _scheduleWatchKeys: schedule,
    };

    resource[SCOPE_PROXY_BIND](observer.$handler);
    resource[SCOPE_PROXY_BIND](liveHandler);
    observer.$destroy();

    await resource.ready;

    expect(resource._scopeBindings.size).toBe(1);
    expect(schedule).toHaveBeenCalled();
    resource.dispose();
  });

  it("normalizes binding failures from ABI scope creation", async () => {
    const resource = wasmService.load({
      source: "/integrations/wasm/c/examples/todo/main.wasm?binding-errors",
    });

    await resource.ready;

    spyOn(resource._abi, "createScope").and.throwError(
      new WasmError("binding", "known binding failure"),
    );
    await expectAsync(resource.bind(rootScope.$new())).toBeRejectedWith(
      jasmine.objectContaining({
        code: "binding",
        message: "known binding failure",
      }),
    );

    resource._abi.createScope.and.callFake(() => {
      throw "unknown binding failure";
    });
    await expectAsync(resource.bind(rootScope.$new())).toBeRejectedWith(
      jasmine.objectContaining({
        code: "binding",
        message: "WebAssembly target binding failed",
      }),
    );

    resource.dispose();
  });

  it("rejects a bind that reaches readiness after resource disposal", async () => {
    const resource = wasmService.load({
      source: "/integrations/wasm/c/examples/todo/main.wasm?bind-race",
    });

    await resource.ready;

    const binding = resource.bind(rootScope.$new());

    resource.dispose();

    await expectAsync(binding).toBeRejectedWith(
      jasmine.objectContaining({ code: "disposed" }),
    );
  });

  it("preserves structured and non-Error instantiation failures", async () => {
    const module = await WebAssembly.compile(
      new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]),
    );
    const instantiate = spyOn(WebAssembly, "instantiate");

    instantiate.and.rejectWith(
      new WasmError("load", "structured failure", { stage: "link" }),
    );
    const structured = wasmService.load({ source: module });

    await expectAsync(structured.ready).toBeRejectedWith(
      jasmine.objectContaining({ message: "structured failure" }),
    );
    structured.dispose();

    instantiate.and.returnValue(Promise.reject("non-error failure"));
    const unknown = wasmService.load({ source: module });

    await expectAsync(unknown.ready).toBeRejectedWith(
      jasmine.objectContaining({
        message: "WebAssembly module failed during link",
      }),
    );
    unknown.dispose();
  });

  it("rejects loading after instantiation completes for a disposed resource", async () => {
    const module = await WebAssembly.compile(
      new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]),
    );
    let resolveInstance!: (instance: WebAssembly.Instance) => void;
    const instantiateResult = new Promise<WebAssembly.Instance>((resolve) => {
      resolveInstance = resolve;
    });
    const instantiate = spyOn(WebAssembly, "instantiate").and.returnValue(
      instantiateResult,
    );
    const resource = wasmService.load({ source: module });

    await waitUntil(() => instantiate.calls.count() === 1);
    resource.dispose();
    resolveInstance({ exports: {} } as WebAssembly.Instance);

    await expectAsync(resource.ready).toBeRejectedWith(
      jasmine.objectContaining({ code: "disposed" }),
    );
  });

  it("covers source diagnostics and compile-option defaults", async () => {
    const response = await fetch("/src/directive/wasm/math.wasm");
    const bytes = await response.clone().arrayBuffer();
    const module = await WebAssembly.compile(bytes);
    const sources = [
      new Request("/src/directive/wasm/math.wasm"),
      new Response(bytes),
      module,
      bytes,
    ];

    performance.clearMeasures("angular.ts:wasm:compile");

    for (const source of sources) {
      const resource = wasmService.load({ source, diagnostics: true });

      await resource.ready;
      resource.dispose();
    }

    const descriptions = performance
      .getEntriesByName("angular.ts:wasm:compile")
      .map((entry) => (entry as PerformanceMeasure).detail.source);

    expect(descriptions).toEqual([
      new URL("/src/directive/wasm/math.wasm", location.href).href,
      "Response",
      "WebAssembly.Module",
      "BufferSource",
    ]);
    performance.clearMeasures("angular.ts:wasm:compile");

    const configured = wasmService.load({
      source: "/src/directive/wasm/math.wasm?string-constants",
      compile: { importedStringConstants: "constants" },
    });

    await configured.ready;
    configured.dispose();
  });

  it("handles invalid URL cache keys and non-Error compilation failures", async () => {
    spyOn(WebAssembly, "compile").and.returnValue(
      Promise.reject("compile failed"),
    );

    const invalidUrl = wasmService.load({
      source: "http://[",
    });

    await expectAsync(invalidUrl.ready).toBeRejected();
    invalidUrl.dispose();

    const bytes = wasmService.load({ source: new Uint8Array([0]) });

    await expectAsync(bytes.ready).toBeRejectedWith(
      jasmine.objectContaining({
        message: jasmine.stringContaining("WebAssembly compilation failed"),
      }),
    );
    bytes.dispose();
  });

  it("classifies URL and Request TypeErrors as fetch failures", async () => {
    spyOn(window, "fetch").and.rejectWith(new TypeError("network failed"));

    const sources = [
      new URL("/url-failure.wasm", location.href),
      new Request("/request-failure.wasm"),
    ];

    for (const source of sources) {
      const resource = wasmService.load({ source });

      await expectAsync(resource.ready).toBeRejectedWith(
        jasmine.objectContaining({ stage: "fetch" }),
      );
      resource.dispose();
    }
  });

  it("skips pending cache entries while trimming settled modules", () => {
    const context = new AppContext();
    const state = createWasmRuntimeState(context);

    for (let index = 0; index < 65; index++) {
      state.moduleCache.set(`entry-${String(index)}`, {
        _settled: index !== 0,
      });
    }

    const service = createWasmService(state);
    const resource = service.load({ source: "/trigger-cache-trim.wasm" });

    expect(state.moduleCache.size).toBeLessThanOrEqual(65);
    resource.dispose();
    destroyWasmRuntimeState(state);
    context.destroy();
  });

  it("aborts pending module entries left in runtime ownership", () => {
    const context = new AppContext();
    const state = createWasmRuntimeState(context);
    const abort = jasmine.createSpy("abort");

    state.moduleEntries.add({
      _settled: false,
      _controller: { abort },
    });

    destroyWasmRuntimeState(state);

    expect(abort).toHaveBeenCalledTimes(1);
    context.destroy();
  });

  it("rejects attachment and scope creation after ABI disposal", () => {
    const ownedAbi = WasmAbi.create();

    ownedAbi.dispose();
    ownedAbi.dispose();

    expect(ownedAbi.disposed).toBeTrue();
    expect(() => ownedAbi.attach(exports)).toThrowError(
      "Cannot attach exports to a disposed Wasm scope ABI",
    );
    expect(() => ownedAbi.createScope(rootScope)).toThrowError(
      "Cannot create a scope from a disposed Wasm scope ABI",
    );
  });

  it("does not replace exports attached to an ABI", () => {
    const ownedAbi = WasmAbi.create();

    ownedAbi.attach(exports);

    expect(() => ownedAbi.attach(exports)).not.toThrow();
    expect(() => ownedAbi.attach(new GuestMemory().exports())).toThrowError(
      "Wasm scope ABI exports are already attached",
    );
  });

  it("validates native WebAssembly exports when attaching", () => {
    const ownedAbi = WasmAbi.create();
    const nativeExports: WebAssembly.Exports = {};

    expect(() => ownedAbi.attach(nativeExports)).toThrowError(
      "WebAssembly module does not export the AngularTS reactive ABI",
    );
  });
});

function listenForGuestTransactions(
  exports: any,
  guest: GuestMemory,
  listener: (scopeHandle: number, transaction: any) => void,
): void {
  exports.ng_scope_on_transaction = (
    scopeHandle: number,
    transactionPtr: number,
    transactionLen: number,
  ) => {
    listener(scopeHandle, guest.readJson(transactionPtr, transactionLen));
  };
}

function listenForGuestUpdates(
  exports: any,
  guest: GuestMemory,
  listener: (update: {
    scopeHandle: number;
    path: string;
    value: unknown;
  }) => void,
): void {
  listenForGuestTransactions(exports, guest, (scopeHandle, transaction) => {
    for (const [path, value] of Object.entries(transaction.set ?? {})) {
      listener({ scopeHandle, path, value });
    }
    for (const path of transaction.delete ?? []) {
      listener({ scopeHandle, path, value: undefined });
    }
  });
}

class GuestMemory {
  memory = new WebAssembly.Memory({ initial: 1 });

  offset = 1024;

  freed: Array<{ ptr: number; len: number }> = [];

  exports() {
    return {
      memory: this.memory,
      ng_abi_version: () => 3,
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

  angular.bootstrap(target, []).invoke([
    "$compile",
    "$rootScope",
    (_$compile_: ng.CompileService, _$rootScope_: ng.Scope) => {
      compile = _$compile_;
      rootScope = _$rootScope_;
    },
  ]);

  rootScope.todo = {
    message: "Updated by Wasm 0",
  };
  target.setAttribute("ng-bind", "todo.message");
  compile(target)(rootScope);
  await wait();

  const guest = new GuestMemory();
  const abi = WasmAbi.create();

  abi.attach(guest.exports());
  const imports = abi.imports.angular_ts;

  const scope = abi.createScope(rootScope, { name: "todoList:main" });

  const path = guest.write("todo.message");

  for (let count = 1; count <= 3; count++) {
    await sleep(1000);

    const value = guest.writeJson(`Updated by Wasm ${count}`);

    imports.scope_set(scope.handle, path.ptr, path.len, value.ptr, value.len);
    imports.scope_sync(scope.handle);
    await wait();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
