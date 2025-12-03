import { $injectTokens as $t } from "../../injection-tokens.js";
import { callBackAfterFirst, isDefined, wait } from "../../shared/utils.js";
import { getEventNameForElement } from "../http/http.js";

ngWorkerDirective.$inject = [$t.$parse, $t.$log];
/**
 * Usage: <div ng-worker="workerName" data-params="{{ expression }}" data-on-result="callback($result)"></div>
 *
 * @param {ng.ParseService} $parse
 * @param {ng.LogService} $log
 * @returns {ng.Directive}
 */
export function ngWorkerDirective($parse, $log) {
  return {
    restrict: "A",
    link(scope, element, attrs) {
      const workerName = attrs.ngWorker;

      if (!workerName) {
        $log.warn("ngWorker: missing worker name");

        return;
      }

      /** @type {string} */
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

      const worker = createWorkerConnection(workerName, {
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
        if (element.hasAttribute("disabled")) return;

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

/**
 * Creates a managed Web Worker connection.
 *
 * @param {string | URL} scriptPath
 * @param {ng.WorkerConfig} [config]
 * @returns {ng.WorkerConnection}
 */
export function createWorkerConnection(scriptPath, config) {
  if (!scriptPath) throw new Error("Worker script path required");

  const defaults = {
    autoRestart: false,
    autoTerminate: false,
    onMessage() {},
    onError() {},
    transformMessage(data) {
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    },
  };

  /** @type {ng.WorkerConfig} */
  const cfg = Object.assign({}, defaults, config);

  let worker = new Worker(scriptPath, { type: "module" });

  let terminated = false;

  const reconnect = function () {
    if (terminated) return;
    console.info("Worker: restarting...");
    worker.terminate();
    worker = new Worker(scriptPath, { type: "module" });
    wire(worker);
  };

  const wire = function (w) {
    w.onmessage = function (e) {
      let { data } = e;

      try {
        data = cfg.transformMessage(data);
      } catch {
        /* no-op */
      }
      cfg.onMessage(data, e); // always provide both args
    };

    w.onerror = function (err) {
      cfg.onError(err);

      if (cfg.autoRestart) reconnect();
    };
  };

  wire(worker);

  return {
    post(data) {
      if (terminated) return console.warn("Worker already terminated");

      try {
        worker.postMessage(data);
      } catch (err) {
        console.error("Worker post failed", err);
      }
    },

    terminate() {
      terminated = true;
      worker.terminate();
    },

    restart() {
      if (terminated)
        return console.warn("Worker cannot restart after terminate");
      reconnect();
    },

    config: cfg,
  };
}
