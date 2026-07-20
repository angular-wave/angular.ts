import { shouldHandleViewRetentionPause } from '../../shared/utils.js';

const AFTER_RENDER_EVENT_SCHEDULER_KEY = "$$ar";
const afterRenderQueue = new Map();
const scopeAfterRenderRetentionStates = new WeakMap();
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
function queueAfterRender(instance, callback, options) {
    queueAfterRenderEntry(instance, callback, options);
}
/**
 * Queue one post-render callback that is owned by a scope.
 *
 * This internal helper lets compile-owned controller `$afterRender` callbacks
 * defer while a retained route subtree is inactive. The public `afterRender`
 * utility intentionally remains scope-free.
 */
function queueScopedAfterRender(instance, scope, callback, options) {
    queueAfterRenderEntry(instance, callback, options, scope);
}
function queueAfterRenderEntry(instance, callback, options, scope) {
    const entry = {
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
function afterRender(callback, options) {
    queueAfterRender(callback, callback, options);
}
function scheduleAfterRenderFlush() {
    if (afterRenderScheduled) {
        return;
    }
    afterRenderScheduled = true;
    queueMicrotask(() => {
        requestFrame(flushAfterRenderQueue);
    });
}
function flushAfterRenderQueue() {
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
function runAfterRenderEntry(entry) {
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
function invokeAfterRenderCallback(callback) {
    try {
        callback();
    }
    catch (err) {
        setTimeout(() => {
            throw err;
        });
    }
}
function requestFrame(callback) {
    if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(callback);
        return;
    }
    setTimeout(() => {
        callback(Date.now());
    });
}
function getScopeAfterRenderRetentionState(scope) {
    let state = scopeAfterRenderRetentionStates.get(scope);
    if (state)
        return state;
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
        if (!state._paused)
            return;
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
function flushPausedScopeAfterRenderEntries(state) {
    if (!state._pending.size)
        return;
    const entries = Array.from(state._pending.values()).sort((left, right) => left._order - right._order);
    state._pending.clear();
    entries.forEach((entry) => {
        mergeAfterRenderEntry(afterRenderQueue, entry);
    });
    scheduleAfterRenderFlush();
}
function mergeAfterRenderEntry(queue, entry) {
    const pending = queue.get(entry._instance);
    queue.set(entry._instance, {
        ...entry,
        _fonts: entry._fonts || !!pending?._fonts,
        _order: pending?._order ?? entry._order,
    });
}

export { AFTER_RENDER_EVENT_SCHEDULER_KEY, afterRender, queueAfterRender, queueScopedAfterRender };
