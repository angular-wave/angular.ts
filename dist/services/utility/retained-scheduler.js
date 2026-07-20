import { shouldHandleViewRetentionPause } from '../../shared/utils.js';

function createScopeRetainedWorkState(scope) {
    const state = {
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
            if (!state._paused)
                return;
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
function flushScopeRetainedWorkQueue(state) {
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
function queueScopeRetainedWork(scope, state, task) {
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
function createCanvasWorkAdapter(scope) {
    const state = createScopeRetainedWorkState(scope);
    return {
        schedule(task) {
            queueScopeRetainedWork(scope, state, task);
        },
        dispose() {
            if (state._destroyed)
                return;
            state._destroyed = true;
            state._pending.length = 0;
            state._deregisterPause();
            state._deregisterResume();
            state._deregisterDestroy();
        },
    };
}

export { createCanvasWorkAdapter };
