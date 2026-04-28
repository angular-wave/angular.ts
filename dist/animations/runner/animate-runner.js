/**
 * Hybrid AnimateRunner
 * Supports both CSS animations (batched) and JS animations (per-Tick).
 *
 * The runner:
 *   - tracks completion state
 *   - supports done callbacks
 *   - exposes a host API (end, cancel, pause, resume)
 *   - can be awaited as a Promise
 *
 * It intentionally mirrors AngularJS 1.x $$AnimateRunner behavior.
 */
/**
 * Internal runner states.
 * @internal
 */
const RunnerState = {
    /** Initial state before any completion logic started */
    _INITIAL: 0,
    /** Completion has been scheduled but not finished */
    _PENDING: 1,
    /** The runner is fully completed and callbacks fired */
    _DONE: 2,
};
/**
 * Global queue used to batch CSS animation callbacks.
 */
let queue = [];
let scheduled = false;
/**
 * Flushes all queued callbacks in FIFO order.
 * @private
 */
function flush() {
    const tasks = queue;
    queue = [];
    scheduled = false;
    for (let i = 0; i < tasks.length; i++) {
        tasks[i]();
    }
}
/**
 * Schedules a callback for next animation frame,
 * falling back to setTimeout(0) when RAF is unavailable.
 */
function schedule(fn) {
    queue.push(fn);
    if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(flush);
    }
}
class AnimateRunner {
    /**
     * Accepts optional host callbacks.
     * Set `jsAnimation` to `true` to use RAF/timer ticks instead of the batched CSS animation queue.
     */
    constructor(host = {}, jsAnimation = false) {
        this._host = host;
        this._doneCallbacks = [];
        this._state = RunnerState._INITIAL;
        /**
         * Deferred promise used by .then/.catch/.finally.
         */
        this._promise = null;
        /**
         * Internal tick scheduling function.
         * - JS animations: immediate RAF or fallback timer
         * - CSS animations: batched global queue
         */
        if (jsAnimation) {
            const rafTick = (fn) => {
                requestAnimationFrame(fn);
            };
            const timeoutTick = (fn) => {
                setTimeout(fn, 0);
            };
            this._tick = (fn) => {
                // When tab is hidden, requestAnimationFrame throttles heavily.
                if (document.hidden)
                    timeoutTick(fn);
                else
                    rafTick(fn);
            };
        }
        else {
            this._tick = schedule;
        }
    }
    /**
     * Sets or replaces the current host.
     */
    setHost(host) {
        this._host = host || {};
    }
    /**
     * Register a completion callback.
     * Fires immediately if animation is already done.
     */
    done(fn) {
        if (this._state === RunnerState._DONE) {
            fn(true);
        }
        else {
            this._doneCallbacks.push(fn);
        }
    }
    /**
     * Reports progress to host.
     */
    progress(...args) {
        this._host.progress?.(...args);
    }
    /** Pause underlying animation (if supported). */
    pause() {
        this._host.pause?.();
    }
    /** Resume underlying animation (if supported). */
    resume() {
        this._host.resume?.();
    }
    /**
     * Ends the animation successfully.
     * Equivalent to user choosing to finish it immediately.
     */
    end() {
        this._host.end?.();
        this._finish(true);
    }
    /**
     * Cancels the animation.
     */
    cancel() {
        this._host.cancel?.();
        this._finish(false);
    }
    /**
     * Schedule animation completion.
     */
    complete(status = true) {
        if (this._state === RunnerState._INITIAL) {
            this._state = RunnerState._PENDING;
            this._tick(() => this._finish(status));
        }
    }
    /**
     * Completes the animation and invokes all done callbacks.
     * @private
     */
    /** @internal */
    _finish(status) {
        if (this._state === RunnerState._DONE)
            return;
        this._state = RunnerState._DONE;
        const callbacks = this._doneCallbacks;
        this._doneCallbacks = [];
        for (let i = 0; i < callbacks.length; i++) {
            callbacks[i] && callbacks[i](status);
        }
    }
    /**
     * Returns an internal promise that resolves on success,
     * and rejects on cancel.
     */
    getPromise() {
        if (!this._promise) {
            this._promise = new Promise((resolve, reject) => {
                this.done((ok) => (ok === false ? reject() : resolve(undefined)));
            });
        }
        return this._promise;
    }
    /**
     * Standard "thenable" interface
     * @template T
     */
    then(onFulfilled, onRejected) {
        return this.getPromise().then(onFulfilled, onRejected);
    }
    /**
     * Standard promise catcher.
     */
    catch(onRejected) {
        return this.getPromise().catch(onRejected);
    }
    /**
     * Standard promise finally.
     */
    finally(onFinally) {
        return this.getPromise().finally(onFinally);
    }
    // ---------------------------------------------------------------------------
    //  STATIC HELPERS
    // ---------------------------------------------------------------------------
    /**
     * @internal
     * Executes a list of runners sequentially.
     * Each must complete before the next starts.
     */
    static _chain(runners, callback) {
        let i = 0;
        const next = (ok = true) => {
            if (!ok || i >= runners.length) {
                callback(ok);
                return;
            }
            runners[i++].done(next);
        };
        next();
    }
    /**
     * @internal
     * Waits until all runners complete.
     */
    static _all(runners, callback) {
        let remaining = runners.length;
        let status = true;
        for (const i of runners) {
            i.done((result) => {
                if (result === false)
                    status = false;
                if (--remaining === 0)
                    callback(status);
            });
        }
    }
}

export { AnimateRunner };
