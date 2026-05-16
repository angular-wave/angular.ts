import type { Scope } from "../../../../@types/core/scope/scope.d.ts";

type RustController = Record<string, unknown>;

interface WasmScopeHost {
  dispose(): void;
  onFlush?(callback: () => void): () => void;
}

interface BridgeController {
  __fromRust: boolean;
  __inner: RustController;
  __syncRustProperties(): void;
  __flushScope(): void;
}

interface RustScopeUpdateController extends RustController {
  bindScopeUpdates?(): void;
  onDestroy?(): void;
  onInit?(): void;
  unbindScopeUpdates?(): void;
}

export function callOnInit(controller: BridgeController): void {
  const inner = controller.__inner as RustScopeUpdateController;

  if (typeof inner.onInit === "function") {
    inner.onInit();
    controller.__syncRustProperties();
    controller.__flushScope();
  }
}

export function callOnDestroy(controller: BridgeController): void {
  const inner = controller.__inner as RustScopeUpdateController;

  if (typeof inner.onDestroy === "function") {
    inner.onDestroy();
    controller.__syncRustProperties();
    controller.__flushScope();
  }
}

export function bindScopeUpdates(controller: BridgeController): void {
  const inner = controller.__inner as RustScopeUpdateController;

  if (typeof inner.bindScopeUpdates === "function") {
    inner.bindScopeUpdates();
  }
}

export function bindGeneratedRefresh(
  controller: BridgeController,
  wasmScope: WasmScopeHost | undefined,
  disposers: Array<() => void>,
): void {
  if (typeof wasmScope?.onFlush !== "function") {
    return;
  }

  disposers.push(
    wasmScope.onFlush(() => {
      controller.__syncRustProperties();
    }),
  );
}

export function unbindScopeUpdates(controller: BridgeController): void {
  const inner = controller.__inner as RustScopeUpdateController;

  if (typeof inner.unbindScopeUpdates === "function") {
    inner.unbindScopeUpdates();
  }
}

export function flushScope(angularScope: Scope | undefined): void {
  void angularScope;
}

export function invokeRustMethod(
  controller: BridgeController,
  method: string,
  args: unknown[],
): unknown {
  const target = controller.__inner[method];

  if (typeof target !== "function") {
    return undefined;
  }

  controller.__fromRust = true;
  let result: unknown;

  try {
    result = target.apply(controller.__inner, args);
  } catch (error) {
    controller.__fromRust = false;
    throw error;
  }

  if (isThenable(result)) {
    controller.__fromRust = false;

    return result.then(
      (value) => {
        controller.__fromRust = true;
        try {
          controller.__syncRustProperties();
          controller.__flushScope();
          return value;
        } finally {
          controller.__fromRust = false;
        }
      },
      (error: unknown) => {
        controller.__fromRust = true;
        try {
          controller.__syncRustProperties();
          controller.__flushScope();
        } finally {
          controller.__fromRust = false;
        }
        throw error;
      },
    );
  }

  try {
    controller.__syncRustProperties();
    controller.__flushScope();
    return result;
  } finally {
    controller.__fromRust = false;
  }
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    !!value &&
    (typeof value === "object" || typeof value === "function") &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

export function destroyBridge(
  controller: BridgeController,
  wasmScope: WasmScopeHost | undefined,
): void {
  unbindScopeUpdates(controller);
  wasmScope?.dispose();
}
