import { _log, _parse } from "../../injection-tokens.ts";
import {
  callBackAfterFirst,
  directiveNormalize,
  isDefined,
  shouldHandleViewRetentionPause,
  wait,
} from "../../shared/utils.ts";
import {
  createWorkerConnection,
  type WorkerConfig,
  type WorkerConnection,
} from "../../services/worker/worker.ts";
import { getEventNameForElement } from "../events/event-name.ts";
import {
  getNormalizedAttr,
  hasNormalizedAttr,
  setNormalizedAttr,
} from "../../shared/dom.ts";

interface ScopeWorkerQueueState {
  _paused: boolean;
  _flushing: boolean;
  _pending: Array<() => void>;
  _deregisterPause: () => void;
  _deregisterResume: () => void;
  _deregisterDestroy: () => void;
}

const workerDirectiveScopeStates = new WeakMap<
  ng.Scope,
  ScopeWorkerQueueState
>();

ngWorkerDirective.$inject = [_parse, _log];

function getScopeWorkerQueueState(scope: ng.Scope): ScopeWorkerQueueState {
  let state = workerDirectiveScopeStates.get(scope);

  if (state) return state;

  let nextState!: ScopeWorkerQueueState;

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

function queueScopeWorkerOperation(
  scope: ng.Scope,
  operation: () => void,
): void {
  const state = getScopeWorkerQueueState(scope);

  if (state._paused) {
    state._pending.push(operation);
    flushScopeWorkerQueue(state);

    return;
  }

  operation();
}

function flushScopeWorkerQueue(state: ScopeWorkerQueueState): void {
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
export function ngWorkerDirective(
  $parse: ng.ParseService,
  $log: ng.LogService,
): ng.Directive {
  return {
    restrict: "A",
    link(scope: ng.Scope, element: HTMLElement) {
      const attr = (name: string): string | undefined =>
        getNormalizedAttr(element, name);

      const workerName = attr("ngWorker");

      if (!workerName) {
        $log.warn("ngWorker: missing worker name");

        return;
      }

      getScopeWorkerQueueState(scope);

      const eventName = attr("trigger") ?? getEventNameForElement(element);

      const paramsExpr = attr("params");

      const paramsFn = paramsExpr ? $parse(paramsExpr) : undefined;

      let throttled = false;

      let intervalId: ReturnType<typeof setInterval> | undefined;

      if (hasNormalizedAttr(element, "latch")) {
        const dispatchAfterFirst = callBackAfterFirst(() => {
          element.dispatchEvent(new Event(eventName));
        });

        dispatchAfterFirst();
        const observerName = directiveNormalize("latch");
        const observer = new MutationObserver((mutations) => {
          for (let i = 0; i < mutations.length; i++) {
            const attributeName = mutations[i].attributeName;

            if (
              attributeName &&
              directiveNormalize(attributeName) === observerName
            ) {
              dispatchAfterFirst();
            }
          }
        });
        observer.observe(element, { attributes: true });

        let deregisterDestroy: (() => void) | undefined = scope.$on(
          "$destroy",
          deregister,
        );

        function deregister(): void {
          observer.disconnect();
          deregisterDestroy?.();
          deregisterDestroy = undefined;
        }
      }

      if (hasNormalizedAttr(element, "interval")) {
        element.dispatchEvent(new Event(eventName));
        intervalId = setInterval(
          () => element.dispatchEvent(new Event(eventName)),
          parseInt(attr("interval") ?? "", 10) || 1000,
        );
      }

      const worker = createWorkerConnection(workerName, {
        onMessage: (result: unknown) => {
          queueScopeWorkerOperation(scope, () => {
            const onResult = attr("onResult");

            if (isDefined(onResult)) {
              $parse(onResult)(scope, { $result: result });
            } else {
              handleSwap(String(result), attr("swap") ?? "innerHTML", element);
            }
          });
        },
        onError: (err: ErrorEvent) => {
          queueScopeWorkerOperation(scope, () => {
            $log.error(`[ng-worker:${workerName}]`, err);

            const onError = attr("onError");

            if (isDefined(onError)) {
              $parse(onError)(scope, { $error: err });
            } else {
              element.textContent = "Error";
            }
          });
        },
      });

      const listener = () => {
        queueScopeWorkerOperation(scope, () => {
          void (async () => {
            if (element.hasAttribute("disabled")) return;

            if (hasNormalizedAttr(element, "delay")) {
              await wait(parseInt(String(attr("delay")), 10) || 0);
            }

            if (throttled) return;

            if (hasNormalizedAttr(element, "throttle")) {
              throttled = true;
              setNormalizedAttr(element, "throttled", true);
              setTimeout(
                () => {
                  setNormalizedAttr(element, "throttled", false);
                  throttled = false;
                },
                parseInt(String(attr("throttle")), 10) || 0,
              );
            }

            let params: unknown;

            try {
              params = paramsFn?.(scope);
            } catch (err) {
              $log.error("ngWorker: failed to evaluate data-params", err);
              params = undefined;
            }

            worker.postMessage(params);
          })();
        });
      };

      scope.$on("$destroy", () => {
        element.removeEventListener(eventName, listener);

        if (intervalId !== undefined) {
          clearInterval(intervalId);
          intervalId = undefined;
        }

        worker.terminate();
      });

      element.addEventListener(eventName, listener);

      if (eventName === "load") {
        element.dispatchEvent(new Event("load"));
      }
    },
  };
}

/**
 * Swap result into DOM based on strategy
 */
function handleSwap(result: string, swap: string, element: HTMLElement): void {
  switch (swap) {
    case "outerHTML": {
      const parent = element.parentNode;

      if (!parent) return;
      const temp = document.createElement("div");

      temp.innerHTML = result;

      if (temp.firstChild) {
        parent.replaceChild(temp.firstChild, element);
      }
      break;
    }
    case "textContent":
      element.textContent = result;
      break;
    case "beforebegin":
      element.insertAdjacentHTML("beforebegin", result);
      break;
    case "afterbegin":
      element.insertAdjacentHTML("afterbegin", result);
      break;
    case "beforeend":
      element.insertAdjacentHTML("beforeend", result);
      break;
    case "afterend":
      element.insertAdjacentHTML("afterend", result);
      break;
    case "innerHTML":
    default:
      element.innerHTML = result;
      break;
  }
}

export { createWorkerConnection };
export type { WorkerConfig, WorkerConnection };
