/// <reference types="jasmine" />
import type {
  ServiceWorkerConfig,
  ServiceWorkerErrorCode,
  ServiceWorkerMessageEvent,
  ServiceWorkerMessageTarget,
  ServiceWorkerPostOptions,
  ServiceWorkerRegistrationState,
  ServiceWorkerRequestOptions,
  ServiceWorkerService,
  ServiceWorkerUpdateState,
} from "./service-worker.ts";

describe("$serviceWorker types", () => {
  it("typechecks public service-worker contract shapes", () => {
    const config: ServiceWorkerConfig = {
      scope: "/app/",
      type: "module",
      updateViaCache: "imports",
      autoRegister: true,
      checkForUpdatesOnRegister: true,
    };
    const registrationState: ServiceWorkerRegistrationState = {
      registered: true,
      scope: "/app/",
      updateViaCache: "none",
      active: "activated",
      waiting: "installed",
    };
    const updateState: ServiceWorkerUpdateState = {
      checking: false,
      waiting: true,
      controllerChanged: false,
      lastCheckedAt: Date.now(),
    };
    const target: ServiceWorkerMessageTarget = "controller";
    const transfer = [new ArrayBuffer(4)] as const;
    const postOptions: ServiceWorkerPostOptions = { transfer, target };
    const requestOptions: ServiceWorkerRequestOptions = {
      transfer: [],
      timeout: 500,
      target: "waiting",
    };
    const errorCode: ServiceWorkerErrorCode = "request-timeout";
    const service = null as unknown as ServiceWorkerService;

    service.register();
    service.register({ scope: "/configured/", updateViaCache: "none" });
    service.register("/sw.js", config);
    service.register(new URL("https://example.test/sw.js"), {
      updateViaCache: "all",
    });
    service.ready();
    service.update();
    service.unregister();
    service.post({ type: "ping" }, postOptions);
    service.request<{ ok: true }>({ type: "ping" }, requestOptions);
    service.onMessage<{ ok: true }>((event) => {
      const ok: true = event.data.ok;
      void ok;
    });

    const status: ServiceWorkerService["status"] = service.status;
    const message: ServiceWorkerMessageEvent<string> = {
      data: "ready",
      event: null as unknown as MessageEvent<string>,
      source: null,
    };

    // @ts-expect-error invalid service worker script type.
    config.type = "shared";
    // @ts-expect-error invalid update cache policy.
    config.updateViaCache = "cache-first";
    // @ts-expect-error invalid target.
    service.post("ping", { transfer: [], target: "registration" });
    // @ts-expect-error invalid request target.
    requestOptions.target = "registration";
    // @ts-expect-error registration state is framework-owned.
    registrationState.registered = false;
    // @ts-expect-error update state is framework-owned.
    updateState.checking = true;
    // @ts-expect-error unsupported is a service error, not an update-state error.
    const unsupportedUpdateError: NonNullable<
      ServiceWorkerUpdateState["errorCode"]
    > = "unsupported";

    expect(registrationState.registered).toBeTrue();
    expect(updateState.waiting).toBeTrue();
    expect(status).toBeDefined();
    expect(message.data).toBe("ready");
    expect(errorCode).toBe("request-timeout");
    expect(unsupportedUpdateError).toBe("unsupported");
  });

  it("typechecks ng namespace aliases", () => {
    const config: ng.ServiceWorkerConfig = { scope: "/" };
    const service = null as unknown as ng.ServiceWorkerService;
    const state: ng.ServiceWorkerUpdateState = service.updateState;
    const options: ng.ServiceWorkerRequestOptions = { timeout: 1000 };
    const postOptions: ng.ServiceWorkerPostOptions = { target: "active" };

    service.register();
    void config;
    void state;
    void options;
    void postOptions;
  });
});
