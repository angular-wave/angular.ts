const AFTER_RENDER_EVENT_SCHEDULER_KEY = "$$ar";
const afterRenderQueue = new Map();
let afterRenderScheduled = false;
/**
 * Queue one post-render callback for an instance.
 *
 * Multiple calls for the same instance before the next render flush are
 * coalesced into one callback. The callback runs after the current JavaScript
 * turn, after AngularTS has applied synchronous DOM work, and after one browser
 * animation frame gives layout a chance to settle.
 */
function queueAfterRender(instance, callback, options) {
    const pending = afterRenderQueue.get(instance);
    afterRenderQueue.set(instance, {
        _callback: callback,
        _fonts: !!options?.fonts || !!pending?._fonts,
    });
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
        runAfterRenderEntry(entries[i]);
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

export { AFTER_RENDER_EVENT_SCHEDULER_KEY, afterRender, queueAfterRender };
