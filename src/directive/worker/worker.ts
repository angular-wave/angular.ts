import { $injectTokens as $t } from "../../injection-tokens.ts";
import { callBackAfterFirst, isDefined, wait } from "../../shared/utils.js";
import { getEventNameForElement } from "../http/http.ts";
import type {
  DefultWorkerConfig,
  WorkerConfig,
  WorkerConnection,
} from "./interface.ts";

ngWorkerDirective.$inject = [$t._parse, $t._log, $t._exceptionHandler];

/**
 * Binds a DOM event to a module worker and routes its result back into the
 * element or an Angular expression callback.
 */
export function ngWorkerDirective(
  $parse: ng.ParseService,
  $log: ng.LogService,
  $exceptionHandler: ng.ExceptionHandlerService,
): ng.Directive {
  return {
    restrict: "A",
    link(scope: ng.Scope, element: HTMLElement, attrs: ng.Attributes) {
      const workerName = attrs.ngWorker;

      if (!workerName) {
        $log.warn("ngWorker: missing worker name");

        return;
      }

      const eventName = attrs.trigger || getEventNameForElement(element);
      let throttled = false;
      let intervalId: ReturnType<typeof setInterval> | undefined;

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
          parseInt(attrs.interval || "", 10) || 1000,
        );
      }

      const worker = createWorkerConnection(workerName, {
        logger: $log,
        err: $exceptionHandler,
        onMessage: (result: unknown) => {
          if (isDefined(attrs.dataOnResult)) {
            $parse(attrs.dataOnResult as string)(scope, { $result: result });
          } else {
            handleSwap(String(result), attrs.swap || "innerHTML", element);
          }
        },
        onError: (err: ErrorEvent) => {
          $log.error(`[ng-worker:${workerName}]`, err);

          if (isDefined(attrs.dataOnError)) {
            $parse(attrs.dataOnError as string)(scope, { $error: err });
          } else {
            element.textContent = "Error";
          }
        },
      });

      element.addEventListener(eventName, async () => {
        if (element.hasAttribute("disabled")) return;

        if (isDefined(attrs.delay)) {
          await wait(parseInt(attrs.delay || "", 10) || 0);
        }

        if (throttled) return;

        if (isDefined(attrs.throttle)) {
          throttled = true;
          attrs.$set("throttled", true);
          setTimeout(
            () => {
              attrs.$set("throttled", false);
              throttled = false;
            },
            parseInt(attrs.throttle || "", 10),
          );
        }

        let params: unknown;

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
 * Swaps worker output into the target element using the configured insertion strategy.
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

/**
 * Creates a managed worker wrapper with restart and message transformation hooks.
 */
export function createWorkerConnection(
  scriptPath: string | URL,
  config?: WorkerConfig,
): WorkerConnection {
  if (!scriptPath) throw new Error("Worker script path required");

  const defaults: DefultWorkerConfig = {
    autoRestart: false,
    autoTerminate: false,
    onMessage() {
      /* empty */
    },
    onError() {
      /* empty */
    },
    transformMessage(data: unknown) {
      if (typeof data !== "string") {
        return data;
      }

      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    },
    logger: (config?.logger || console) as ng.LogService,
    err: (config?.err || (() => {})) as ng.ExceptionHandlerService,
  };

  const cfg = Object.assign({}, defaults, config) as DefultWorkerConfig;
  let worker = new Worker(scriptPath, { type: "module" });
  let terminated = false;

  const wire = (workerParam: Worker) => {
    workerParam.onmessage = (event: MessageEvent) => {
      let { data } = event;

      try {
        data = cfg.transformMessage(data);
      } catch {
        /* no-op */
      }

      cfg.onMessage(data, event);
    };

    workerParam.onerror = (err: ErrorEvent) => {
      cfg.onError(err);

      if (cfg.autoRestart) {
        reconnect();
      }
    };
  };

  const reconnect = () => {
    if (terminated) return;

    cfg.logger.info("Worker: restarting...");
    worker.terminate();
    worker = new Worker(scriptPath, { type: "module" });
    wire(worker);
  };

  wire(worker);

  return {
    post(data: unknown) {
      if (terminated) {
        cfg.logger.warn("Worker already terminated");
      }

      try {
        worker.postMessage(data);
      } catch (err) {
        cfg.logger.log("Worker post failed", err);
      }
    },

    terminate() {
      terminated = true;
      worker.terminate();
    },

    restart() {
      if (terminated) {
        cfg.logger.warn("Worker cannot restart after terminate");
      }

      reconnect();
    },

    config: cfg,
  };
}
