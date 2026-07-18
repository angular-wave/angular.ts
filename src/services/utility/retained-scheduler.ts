import { shouldHandleViewRetentionPause } from "../../shared/utils.ts";

interface ScopeRetainedWorkState {
  _paused: boolean;
  _flushing: boolean;
  _destroyed: boolean;
  _pending: Array<() => void>;
  _deregisterPause: () => void;
  _deregisterResume: () => void;
  _deregisterDestroy: () => void;
}

interface ScopeWorkScheduler {
  schedule(task: () => void): void;
  dispose(): void;
}

/**
 * Internal scope-owned scheduler contract for non-compile heavy workloads.
 *
 * Adapters that own timers, animation loops, canvas workloads, or game-engine
 * frame callbacks call this to keep work paused while a retained route subtree
 * is inactive.
 */
export interface CanvasWorkAdapter extends ScopeWorkScheduler {
  /**
   * Queues one callback for immediate execution or deferred execution while the
   * owning scope is paused.
   */
  schedule(task: () => void): void;
  /**
   * Disposes this adapter and clears pending work.
   */
  dispose(): void;
}

function createScopeRetainedWorkState(scope: ng.Scope): ScopeRetainedWorkState {
  const state: ScopeRetainedWorkState = {
    _paused: false,
    _flushing: false,
    _destroyed: false,
    _pending: [],
    _deregisterPause: scope.$on("$viewRetentionPause", (...args) => {
      if (!shouldHandleViewRetentionPause(args, "schedulers")) {
        return;
      }

      state._paused = true;
    }),
    _deregisterResume: scope.$on("$viewRetentionResume", (...args) => {
      if (!shouldHandleViewRetentionPause(args, "schedulers")) {
        return;
      }

      if (!state._paused) return;

      state._paused = false;
      flushScopeRetainedWorkQueue(state);
    }),
    _deregisterDestroy: scope.$on("$destroy", () => {
      state._destroyed = true;
      state._paused = false;
      state._flushing = false;
      state._pending.length = 0;
      state._deregisterPause();
      state._deregisterResume();
      state._deregisterDestroy();
    }),
  };

  return state;
}

function flushScopeRetainedWorkQueue(state: ScopeRetainedWorkState): void {
  if (state._flushing || state._paused || state._pending.length === 0) {
    return;
  }

  state._flushing = true;

  queueMicrotask(() => {
    state._flushing = false;

    if (state._paused || state._destroyed) {
      return;
    }

    const pending = state._pending.splice(0);

    for (let i = 0, l = pending.length; i < l; i++) {
      const task = pending[i];

      task();
    }
  });
}

function queueScopeRetainedWork(
  scope: ng.Scope,
  state: ScopeRetainedWorkState,
  task: () => void,
): void {
  if (scope.$handler._destroyed || state._destroyed) {
    return;
  }

  if (state._paused) {
    state._pending.push(task);
    flushScopeRetainedWorkQueue(state);
    return;
  }

  task();
}

/**
 * Creates a scope-owned adapter that pauses queued callbacks during retention.
 */
export function createCanvasWorkAdapter(scope: ng.Scope): CanvasWorkAdapter {
  const state = createScopeRetainedWorkState(scope);

  return {
    schedule(task: () => void): void {
      queueScopeRetainedWork(scope, state, task);
    },
    dispose(): void {
      if (state._destroyed) return;

      state._destroyed = true;
      state._pending.length = 0;
      state._deregisterPause();
      state._deregisterResume();
      state._deregisterDestroy();
    },
  };
}
