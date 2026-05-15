import { _exceptionHandler, _log, _parse } from "../../injection-tokens.ts";
import { getNormalizedAttr, hasNormalizedAttr } from "../../shared/dom.ts";
import { callBackAfterFirst, isDefined, wait } from "../../shared/utils.ts";
import {
  createWorkerConnection,
  type WorkerConfig,
  type WorkerConnection,
} from "../../services/worker/worker.ts";
import { getEventNameForElement } from "../events/event-name.ts";

ngWorkerDirective.$inject = [_parse, _log, _exceptionHandler];

/**
 * Usage: <div ng-worker="workerName" data-params="{{ expression }}" data-on-result="callback($result)"></div>
 */
export function ngWorkerDirective(
  $parse: ng.ParseService,
  $log: ng.LogService,
  $exceptionHandler: ng.ExceptionHandlerService,
): ng.Directive {
  return {
    restrict: "A",
    link(scope: ng.Scope, element: HTMLElement, attrs: ng.Attributes) {
      const attr = (name: string): string | undefined =>
        getNormalizedAttr(element, name) ?? undefined;

      const workerName = attr("ngWorker");

      if (!workerName) {
        $log.warn("ngWorker: missing worker name");

        return;
      }

      const eventName = attr("trigger") || getEventNameForElement(element);

      const paramsExpr = attr("params");

      const paramsFn = paramsExpr ? $parse(paramsExpr) : undefined;

      let throttled = false;

      let intervalId: ReturnType<typeof setInterval> | undefined;

      if (hasNormalizedAttr(element, "latch")) {
        attrs.$observe(
          "latch",
          callBackAfterFirst(() => element.dispatchEvent(new Event(eventName))),
        );
      }

      if (hasNormalizedAttr(element, "interval")) {
        element.dispatchEvent(new Event(eventName));
        intervalId = setInterval(
          () => element.dispatchEvent(new Event(eventName)),
          parseInt(attr("interval") || "", 10) || 1000,
        );
      }

      const worker = createWorkerConnection(workerName, {
        logger: $log,
        err: $exceptionHandler,
        onMessage: (result: unknown) => {
          const onResult = attr("onResult");

          if (isDefined(onResult)) {
            $parse(onResult)(scope, { $result: result });
          } else {
            handleSwap(String(result), attr("swap") || "innerHTML", element);
          }
        },
        onError: (err: ErrorEvent) => {
          $log.error(`[ng-worker:${workerName}]`, err);

          const onError = attr("onError");

          if (isDefined(onError)) {
            $parse(onError)(scope, { $error: err });
          } else {
            element.textContent = "Error";
          }
        },
      });

      element.addEventListener(eventName, () => {
        void (async () => {
          if (element.hasAttribute("disabled")) return;

          if (hasNormalizedAttr(element, "delay")) {
            await wait(parseInt(attr("delay") || "", 10) || 0);
          }

          if (throttled) return;

          if (hasNormalizedAttr(element, "throttle")) {
            throttled = true;
            attrs.$set("throttled", true);
            setTimeout(
              () => {
                attrs.$set("throttled", false);
                throttled = false;
              },
              parseInt(attr("throttle") || "", 10),
            );
          }

          let params: unknown;

          try {
            params = paramsFn?.(scope);
          } catch (err) {
            $log.error("ngWorker: failed to evaluate data-params", err);
            params = undefined;
          }

          worker.post(params);
        })();
      });

      if (intervalId) {
        scope.$on("$destroy", () => {
          clearInterval(intervalId);
        });
      }

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
