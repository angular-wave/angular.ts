import { _parse, _log, _worker, _injector } from '../../injection-tokens.js';
import { directiveNormalize, shouldHandleViewRetentionPause, callBackAfterFirst, isDefined, wait } from '../../shared/utils.js';
import { WorkerError } from '../../services/worker/worker.js';
import { getEventNameForElement } from '../events/event-name.js';
import { hasNormalizedAttr, getNormalizedAttr, setNormalizedAttr } from '../../shared/dom.js';

const workerDirectiveScopeStates = new WeakMap();
ngWorkerDirective.$inject = [_parse, _log, _worker, _injector];
function getScopeWorkerQueueState(scope) {
    let state = workerDirectiveScopeStates.get(scope);
    if (state)
        return state;
    let nextState;
    const deregisterPause = scope.$on("$viewRetentionPause", (...args) => {
        if (!shouldHandleViewRetentionPause(args, "schedulers")) {
            return;
        }
        nextState._paused = true;
    });
    const deregisterResume = scope.$on("$viewRetentionResume", (...args) => {
        if (!shouldHandleViewRetentionPause(args, "schedulers")) {
            return;
        }
        if (!nextState._paused) {
            return;
        }
        nextState._paused = false;
        flushScopeWorkerQueue(nextState);
    });
    const deregisterDestroy = scope.$on("$destroy", () => {
        nextState._pending.length = 0;
        nextState._paused = false;
        nextState._flushing = false;
        nextState._deregisterPause();
        nextState._deregisterResume();
        nextState._deregisterDestroy();
        workerDirectiveScopeStates.delete(scope);
    });
    state = nextState = {
        _paused: false,
        _flushing: false,
        _pending: [],
        _deregisterPause: deregisterPause,
        _deregisterResume: deregisterResume,
        _deregisterDestroy: deregisterDestroy,
    };
    workerDirectiveScopeStates.set(scope, state);
    return state;
}
function queueScopeWorkerOperation(scope, operation) {
    const state = getScopeWorkerQueueState(scope);
    if (state._paused) {
        state._pending.push(operation);
        flushScopeWorkerQueue(state);
        return;
    }
    operation();
}
function flushScopeWorkerQueue(state) {
    if (state._flushing || state._paused || state._pending.length === 0) {
        return;
    }
    state._flushing = true;
    queueMicrotask(() => {
        state._flushing = false;
        if (state._paused) {
            return;
        }
        const pending = state._pending.splice(0);
        for (let i = 0, l = pending.length; i < l; i++) {
            pending[i]();
        }
    });
}
/**
 * Usage: <div ng-worker="workerName" data-params="{{ expression }}" on-result="callback($result)"></div>
 */
function ngWorkerDirective($parse, $log, $worker, $injector) {
    return {
        restrict: "A",
        link(scope, element) {
            const attr = (name) => getNormalizedAttr(element, name);
            const workerName = attr("ngWorker");
            const handleName = attr("handle");
            const workerSource = handleName ?? workerName;
            if (!workerSource) {
                $log.warn("ngWorker: missing worker script or data-handle");
                return;
            }
            getScopeWorkerQueueState(scope);
            const eventName = attr("trigger") ?? getEventNameForElement(element);
            const paramsExpr = attr("params");
            const paramsFn = paramsExpr ? $parse(paramsExpr) : undefined;
            let throttled = false;
            let intervalId;
            if (hasNormalizedAttr(element, "latch")) {
                const dispatchAfterFirst = callBackAfterFirst(() => {
                    element.dispatchEvent(new Event(eventName));
                });
                dispatchAfterFirst();
                const observerName = directiveNormalize("latch");
                const observer = new MutationObserver((mutations) => {
                    for (let i = 0; i < mutations.length; i++) {
                        const attributeName = mutations[i].attributeName;
                        if (attributeName &&
                            directiveNormalize(attributeName) === observerName) {
                            dispatchAfterFirst();
                        }
                    }
                });
                observer.observe(element, { attributes: true });
                let deregisterDestroy = scope.$on("$destroy", deregister);
                function deregister() {
                    observer.disconnect();
                    deregisterDestroy?.();
                    deregisterDestroy = undefined;
                }
            }
            if (hasNormalizedAttr(element, "interval")) {
                element.dispatchEvent(new Event(eventName));
                intervalId = setInterval(() => element.dispatchEvent(new Event(eventName)), parseInt(attr("interval") ?? "", 10) || 1000);
            }
            const ownsWorker = !handleName;
            const worker = handleName
                ? resolveWorkerHandle($injector, handleName)
                : $worker(workerSource);
            const workerLabel = workerSource;
            const requestMode = hasNormalizedAttr(element, "request");
            const applyResult = (result) => {
                queueScopeWorkerOperation(scope, () => {
                    const onResult = attr("onResult");
                    if (isDefined(onResult)) {
                        $parse(onResult)(scope, { $result: result });
                    }
                });
            };
            const applyError = (err) => {
                queueScopeWorkerOperation(scope, () => {
                    $log.error(`[ng-worker:${workerLabel}]`, err);
                    const onError = attr("onError");
                    if (isDefined(onError)) {
                        $parse(onError)(scope, { $error: err });
                    }
                });
            };
            const disposeMessage = requestMode
                ? () => undefined
                : worker.onMessage(applyResult);
            const disposeError = worker.onError(applyError);
            const listener = () => {
                queueScopeWorkerOperation(scope, () => {
                    void (async () => {
                        if (element.hasAttribute("disabled"))
                            return;
                        if (hasNormalizedAttr(element, "delay")) {
                            await wait(parseInt(String(attr("delay")), 10) || 0);
                        }
                        if (throttled)
                            return;
                        if (hasNormalizedAttr(element, "throttle")) {
                            throttled = true;
                            setNormalizedAttr(element, "throttled", true);
                            setTimeout(() => {
                                setNormalizedAttr(element, "throttled", false);
                                throttled = false;
                            }, parseInt(String(attr("throttle")), 10) || 0);
                        }
                        let params;
                        try {
                            params = paramsFn?.(scope);
                        }
                        catch (err) {
                            $log.error("ngWorker: failed to evaluate data-params", err);
                            params = undefined;
                        }
                        if (requestMode) {
                            try {
                                const result = await worker.request(params);
                                applyResult(result);
                            }
                            catch (requestError) {
                                if (requestError !== worker.error) {
                                    applyError(normalizeWorkerError(requestError));
                                }
                            }
                        }
                        else {
                            worker.post(params);
                        }
                    })();
                });
            };
            scope.$on("$destroy", () => {
                element.removeEventListener(eventName, listener);
                if (intervalId !== undefined) {
                    clearInterval(intervalId);
                    intervalId = undefined;
                }
                if (ownsWorker)
                    worker.terminate();
                disposeMessage();
                disposeError();
            });
            element.addEventListener(eventName, listener);
            if (eventName === "load") {
                element.dispatchEvent(new Event("load"));
            }
        },
    };
}
function resolveWorkerHandle($injector, name) {
    const handle = $injector.get(name);
    if (!handle ||
        typeof handle.post !== "function" ||
        typeof handle.request !== "function" ||
        typeof handle.onMessage !== "function" ||
        typeof handle.onError !== "function" ||
        typeof handle.terminate !== "function") {
        throw new Error(`ngWorker: injectable '${name}' is not a WorkerHandle. Register it with module.worker().`);
    }
    return handle;
}
function normalizeWorkerError(error) {
    return error instanceof WorkerError
        ? error
        : new WorkerError("request", "Worker request failed", { cause: error });
}

export { ngWorkerDirective };
