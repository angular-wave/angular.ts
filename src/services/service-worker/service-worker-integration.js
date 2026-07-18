import { createServiceWorkerService } from "./service-worker.ts";

const scope = new URL("./", location.href).href;
const timeoutMs = 10_000;

let service = createService();

function createService() {
  return createServiceWorkerService(navigator.serviceWorker, {
    log: console,
    err(error) {
      throw error;
    },
  });
}

function workerScriptUrl(testId, version) {
  const url = new URL("./service-worker-integration-worker.js", location.href);

  url.searchParams.set("test", testId);
  url.searchParams.set("version", version);

  return url.href;
}

function withTimeout(promise, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${String(timeoutMs)}ms.`));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function waitForController() {
  if (navigator.serviceWorker.controller) {
    return Promise.resolve(navigator.serviceWorker.controller);
  }

  return withTimeout(
    new Promise((resolve) => {
      const onControllerChange = () => {
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          onControllerChange,
        );
        resolve(navigator.serviceWorker.controller);
      };

      navigator.serviceWorker.addEventListener(
        "controllerchange",
        onControllerChange,
      );
    }),
    "service worker controller",
  );
}

function waitForServiceMessage(predicate, label) {
  return withTimeout(
    new Promise((resolve) => {
      const dispose = service.onMessage((event) => {
        if (!predicate(event.data)) {
          return;
        }

        dispose();
        resolve(event.data);
      });
    }),
    label,
  );
}

async function cleanup() {
  if (!("serviceWorker" in navigator)) {
    return false;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  const testRegistrations = registrations.filter(
    (registration) => registration.scope === scope,
  );

  await Promise.all(
    testRegistrations.map((registration) => registration.unregister()),
  );

  service = createService();

  return testRegistrations.length > 0;
}

async function register(testId, version) {
  service = createService();

  const registration = await service.register(
    workerScriptUrl(testId, version),
    {
      scope,
      updateViaCache: "none",
    },
  );
  await service.ready();
  await waitForController();

  return {
    controller: Boolean(
      service.controller ?? navigator.serviceWorker.controller,
    ),
    scope: registration.scope,
    status: service.status,
    registered: service.registrationState.registered,
    active: service.registrationState.active,
  };
}

async function registerAndExchange(testId) {
  await register(testId, "message");

  const responsePromise = waitForServiceMessage(
    (data) => data?.kind === "pong" && data.testId === testId,
    "service worker pong message",
  );

  await service.post({
    kind: "ping",
    testId,
    payload: { ok: true },
  });

  const response = await responsePromise;

  return {
    controller: Boolean(
      service.controller ?? navigator.serviceWorker.controller,
    ),
    message: response,
    status: service.status,
  };
}

async function detectUpdate(testId) {
  await register(testId, "one");

  const observed = [];
  const updatePromise = withTimeout(
    new Promise((resolve) => {
      const dispose = service.onUpdate((state) => {
        const update = {
          phase: state.phase,
          waiting: state.waiting,
          scriptUrl: state.worker?.scriptURL ?? "",
        };

        observed.push(update);

        if (
          update.scriptUrl.includes("version=two") &&
          update.phase !== undefined
        ) {
          dispose();
          resolve(update);
        }
      });
    }),
    "service worker update",
  );

  await navigator.serviceWorker.register(workerScriptUrl(testId, "two"), {
    scope,
    updateViaCache: "none",
  });

  const update = await updatePromise;

  return {
    update,
    observed,
    status: service.status,
  };
}

window.serviceWorkerIntegration = {
  cleanup,
  detectUpdate,
  register,
  registerAndExchange,
  supported() {
    return "serviceWorker" in navigator;
  },
};
