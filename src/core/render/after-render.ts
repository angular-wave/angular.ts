import { shouldHandleViewRetentionPause } from "../../shared/utils.ts";

export interface AfterRenderOptions {
  /**
   * Wait for `document.fonts.ready` before invoking the callback.
   *
   * This is opt-in because font loading can depend on external resources and
   * should not delay ordinary post-render layout reads.
   */
  fonts?: boolean;
}
export type AfterRenderCallback = () => void;

export const AFTER_RENDER_EVENT_SCHEDULER_KEY = "$$ar";

export type AfterRenderEventScheduler = () => void;

interface AfterRenderEntry {
  _instance: object;
  _callback: AfterRenderCallback;
  _fonts: boolean;
  _order: number;
  _scope?: ng.Scope;
}

interface ScopeAfterRenderRetentionState {
  _paused: boolean;
  _pending: Map<object, AfterRenderEntry>;
}

const afterRenderQueue = new Map<object, AfterRenderEntry>();

const scopeAfterRenderRetentionStates = new WeakMap<
  ng.Scope,
  ScopeAfterRenderRetentionState
>();

let afterRenderScheduled = false;
let afterRenderQueueOrder = 0;

/**
 * Queue one post-render callback for an instance.
 *
 * Multiple calls for the same instance before the next render flush are
 * coalesced into one callback. The callback runs after the current JavaScript
 * turn, after AngularTS has applied synchronous DOM work, and after one browser
 * animation frame gives layout a chance to settle.
 */
export function queueAfterRender(
  instance: object,
  callback: AfterRenderCallback,
  options?: AfterRenderOptions,
): void {
  queueAfterRenderEntry(instance, callback, options);
}

/**
 * Queue one post-render callback that is owned by a scope.
 *
 * This internal helper lets compile-owned controller `$afterRender` callbacks
 * defer while a retained route subtree is inactive. The public `afterRender`
 * utility intentionally remains scope-free.
 */
export function queueScopedAfterRender(
  instance: object,
  scope: ng.Scope,
  callback: AfterRenderCallback,
  options?: AfterRenderOptions,
): void {
  queueAfterRenderEntry(instance, callback, options, scope);
}

function queueAfterRenderEntry(
  instance: object,
  callback: AfterRenderCallback,
  options?: AfterRenderOptions,
  scope?: ng.Scope,
): void {
  const entry: AfterRenderEntry = {
    _instance: instance,
    _callback: callback,
    _fonts: !!options?.fonts,
    _order: afterRenderQueueOrder++,
    _scope: scope,
  };

  if (scope) {
    const retentionState = getScopeAfterRenderRetentionState(scope);

    if (retentionState._paused) {
      mergeAfterRenderEntry(retentionState._pending, entry);

      return;
    }
  }

  mergeAfterRenderEntry(afterRenderQueue, entry);
  scheduleAfterRenderFlush();
}

/**
 * Queue a post-render callback using the callback itself as the coalescing key.
 */
export function afterRender(
  callback: AfterRenderCallback,
  options?: AfterRenderOptions,
): void {
  queueAfterRender(callback, callback, options);
}

function scheduleAfterRenderFlush(): void {
  if (afterRenderScheduled) {
    return;
  }

  afterRenderScheduled = true;
  queueMicrotask(() => {
    requestFrame(flushAfterRenderQueue);
  });
}

function flushAfterRenderQueue(): void {
  afterRenderScheduled = false;

  const entries = Array.from(afterRenderQueue.values());

  afterRenderQueue.clear();

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    if (entry._scope) {
      const retentionState = getScopeAfterRenderRetentionState(entry._scope);

      if (retentionState._paused) {
        mergeAfterRenderEntry(retentionState._pending, entry);

        continue;
      }
    }

    runAfterRenderEntry(entry);
  }
}

function runAfterRenderEntry(entry: AfterRenderEntry): void {
  if (entry._fonts) {
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;

    if (fonts?.ready) {
      void fonts.ready
        .catch(() => undefined)
        .then(() => {
          invokeAfterRenderCallback(entry._callback);
          return undefined;
        });
      return;
    }
  }

  invokeAfterRenderCallback(entry._callback);
}

function invokeAfterRenderCallback(callback: AfterRenderCallback): void {
  try {
    callback();
  } catch (err) {
    setTimeout(() => {
      throw err;
    });
  }
}

function requestFrame(callback: FrameRequestCallback): void {
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(callback);
    return;
  }

  setTimeout(() => {
    callback(Date.now());
  });
}

function getScopeAfterRenderRetentionState(
  scope: ng.Scope,
): ScopeAfterRenderRetentionState {
  let state = scopeAfterRenderRetentionStates.get(scope);

  if (state) return state;

  state = {
    _paused: false,
    _pending: new Map(),
  };

  const deregisterPause = scope.$on("$viewRetentionPause", (...args) => {
    if (!shouldHandleViewRetentionPause(args, "schedulers")) {
      return;
    }

    state._paused = true;
  });
  const deregisterResume = scope.$on("$viewRetentionResume", (...args) => {
    if (!shouldHandleViewRetentionPause(args, "schedulers")) {
      return;
    }

    if (!state._paused) return;

    state._paused = false;
    flushPausedScopeAfterRenderEntries(state);
  });
  const deregisterDestroy = scope.$on("$destroy", () => {
    state._pending.clear();
    deregisterPause();
    deregisterResume();
    deregisterDestroy();
    scopeAfterRenderRetentionStates.delete(scope);
  });

  scopeAfterRenderRetentionStates.set(scope, state);

  return state;
}

function flushPausedScopeAfterRenderEntries(
  state: ScopeAfterRenderRetentionState,
): void {
  if (!state._pending.size) return;

  const entries = Array.from(state._pending.values()).sort(
    (left, right) => left._order - right._order,
  );

  state._pending.clear();

  entries.forEach((entry) => {
    mergeAfterRenderEntry(afterRenderQueue, entry);
  });

  scheduleAfterRenderFlush();
}

function mergeAfterRenderEntry(
  queue: Map<object, AfterRenderEntry>,
  entry: AfterRenderEntry,
): void {
  const pending = queue.get(entry._instance);

  queue.set(entry._instance, {
    ...entry,
    _fonts: entry._fonts || !!pending?._fonts,
    _order: pending?._order ?? entry._order,
  });
}
