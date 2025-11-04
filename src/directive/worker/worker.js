import { $injectTokens as $t } from "../../injection-tokens.js";
import { callBackAfterFirst, isDefined, wait } from "../../shared/utils";
import { getEventNameForElement } from "../http/http.js";

ngWorkerDirective.$inject = ["$worker", $t.$parse, $t.$log];
/**
 * ngWorker directive factory
 * Usage: <div ng-worker="workerName" data-params="{{ expression }}" data-on-result="callback($result)"></div>
 */
export function ngWorkerDirective($worker, $parse, $log) {
  return {
    restrict: "A",
    link(scope, element, attrs) {
      const workerName = attrs.ngWorker;
      if (!workerName) {
        $log.warn("ngWorker: missing worker name");
        return;
      }

      const eventName = attrs.trigger || getEventNameForElement(element);

      let throttled = false;
      let intervalId;

      if (isDefined(attrs.latch)) {
        attrs.$observe(
          "latch",
          callBackAfterFirst(() => element.dispatchEvent(new Event(eventName))),
        );
      }

      if (isDefined(attrs.interval)) {
        element.dispatchEvent(new Event(eventName));
        intervalId = setInterval(
          () => element.dispatchEvent(new Event(eventName)),
          parseInt(attrs.interval) || 1000,
        );
      }

      const worker = $worker(workerName, {
        onMessage: (result) => {
          if (isDefined(attrs.dataOnResult)) {
            $parse(attrs.dataOnResult)(scope, { $result: result });
          } else {
            const swap = attrs.swap || "innerHTML";
            handleSwap(result, swap, element);
          }
        },
        onError: (err) => {
          $log.error(`[ng-worker:${workerName}]`, err);
          if (isDefined(attrs.dataOnError)) {
            $parse(attrs.dataOnError)(scope, { $error: err });
          } else {
            element.textContent = "Error";
          }
        },
      });

      element.addEventListener(eventName, async () => {
        if (element.disabled) return;

        if (isDefined(attrs.delay)) {
          await wait(parseInt(attrs.delay) || 0);
        }

        if (throttled) return;

        if (isDefined(attrs.throttle)) {
          throttled = true;
          attrs.$set("throttled", true);
          setTimeout(() => {
            attrs.$set("throttled", false);
            throttled = false;
          }, parseInt(attrs.throttle));
        }

        let params;
        try {
          params = attrs.params ? scope.$eval(attrs.params) : undefined;
        } catch (err) {
          $log.error("ngWorker: failed to evaluate data-params", err);
          params = undefined;
        }

        worker.post(params);
      });

      if (intervalId) {
        scope.$on("$destroy", () => clearInterval(intervalId));
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
function handleSwap(result, swap, element) {
  switch (swap) {
    case "outerHTML": {
      const parent = element.parentNode;
      if (!parent) return;
      const temp = document.createElement("div");
      temp.innerHTML = result;
      parent.replaceChild(temp.firstChild, element);
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
