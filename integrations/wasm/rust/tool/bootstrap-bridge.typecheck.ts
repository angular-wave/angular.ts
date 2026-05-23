import type { Scope } from "../../../../@types/core/scope/scope.d.ts";

type RustController = Record<string, unknown>;

interface WasmScopeHost {
  dispose(): void;
  onSync?(callback: () => void): () => void;
}

const fromRustSlot = Symbol("angularTsRustFromRust");
const innerSlot = Symbol("angularTsRustInner");

interface BridgeController {
  [fromRustSlot]: boolean;
  [innerSlot]: RustController;
  syncRustProperties(): void;
  syncScope(): void;
}

interface RustScopeUpdateController extends RustController {
  bindScopeUpdates?(): void;
  onDestroy?(): void;
  onInit?(): void;
  unbindScopeUpdates?(): void;
}

export function callOnInit(controller: BridgeController): void {
  const inner = controller[innerSlot] as RustScopeUpdateController;

  if (typeof inner.onInit === "function") {
    inner.onInit();
    controller.syncRustProperties();
    controller.syncScope();
  }
}

export function callOnDestroy(controller: BridgeController): void {
  const inner = controller[innerSlot] as RustScopeUpdateController;

  if (typeof inner.onDestroy === "function") {
    inner.onDestroy();
    controller.syncRustProperties();
    controller.syncScope();
  }
}

export function bindScopeUpdates(controller: BridgeController): void {
  const inner = controller[innerSlot] as RustScopeUpdateController;

  if (typeof inner.bindScopeUpdates === "function") {
    inner.bindScopeUpdates();
  }
}

export function bindGeneratedRefresh(
  controller: BridgeController,
  wasmScope: WasmScopeHost | undefined,
  disposers: Array<() => void>,
): void {
  if (typeof wasmScope?.onSync !== "function") {
    return;
  }

  disposers.push(
    wasmScope.onSync(() => {
      controller.syncRustProperties();
    }),
  );
}

export function unbindScopeUpdates(controller: BridgeController): void {
  const inner = controller[innerSlot] as RustScopeUpdateController;

  if (typeof inner.unbindScopeUpdates === "function") {
    inner.unbindScopeUpdates();
  }
}

export function syncScope(angularScope: Scope | undefined): void {
  void angularScope;
}

export function invokeRustMethod(
  controller: BridgeController,
  method: string,
  args: unknown[],
): unknown {
  const target = controller[innerSlot][method];

  if (typeof target !== "function") {
    return undefined;
  }

  controller[fromRustSlot] = true;
  let result: unknown;

  try {
    result = target.apply(controller[innerSlot], args);
  } catch (error) {
    controller[fromRustSlot] = false;
    throw error;
  }

  if (isThenable(result)) {
    controller[fromRustSlot] = false;

    return result.then(
      (value) => {
        controller[fromRustSlot] = true;
        try {
          controller.syncRustProperties();
          controller.syncScope();
          return value;
        } finally {
          controller[fromRustSlot] = false;
        }
      },
      (error: unknown) => {
        controller[fromRustSlot] = true;
        try {
          controller.syncRustProperties();
          controller.syncScope();
        } finally {
          controller[fromRustSlot] = false;
        }
        throw error;
      },
    );
  }

  try {
    controller.syncRustProperties();
    controller.syncScope();
    return result;
  } finally {
    controller[fromRustSlot] = false;
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
