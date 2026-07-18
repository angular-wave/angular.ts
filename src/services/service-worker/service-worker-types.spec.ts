/// <reference types="jasmine" />
import type {
  ServiceWorkerConfig,
  ServiceWorkerMessageClientErrorCode,
  ServiceWorkerMessageClientOptions,
  ServiceWorkerMessageClientRequestOptions,
  ServiceWorkerMessageEvent,
  ServiceWorkerMessageRequest,
  ServiceWorkerMessageResponse,
  ServiceWorkerMessageTarget,
  ServiceWorkerRegistrationState,
  ServiceWorkerService,
  ServiceWorkerSupport,
  ServiceWorkerUpdateState,
} from "./service-worker.ts";

describe("$serviceWorker types", () => {
  it("typechecks public service-worker contract shapes", () => {
    const support: ServiceWorkerSupport = {
      supported: false,
      reason: "missing-service-worker",
    };
    const config: ServiceWorkerConfig = {
      scriptUrl: "/sw.js",
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
    const clientOptions: ServiceWorkerMessageClientOptions = {
      requestType: "app:request",
      responseType: "app:response",
      timeout: 1000,
      createId: () => "id",
      target,
    };
    const requestOptions: ServiceWorkerMessageClientRequestOptions = {
      transfer: [],
      timeout: 500,
      target: "waiting",
    };
    const clientRequest: ServiceWorkerMessageRequest<{ action: "sync" }> = {
      type: "app:request",
      id: "id",
      payload: { action: "sync" },
    };
    const clientResponse: ServiceWorkerMessageResponse<{ ok: true }> = {
      type: "app:response",
      id: "id",
      ok: true,
      data: { ok: true },
    };
    const clientErrorCode: ServiceWorkerMessageClientErrorCode = "timeout";
    const service = null as unknown as ServiceWorkerService;

    service.register("/sw.js", config);
    service.register(new URL("https://example.test/sw.js"), {
      updateViaCache: "all",
    });
    service.ready();
    service.update();
    service.unregister();
    service.post({ type: "ping" });
    service.post({ type: "ping" }, [], target);
    service.onMessage<{ ok: true }>((event) => {
      const ok: true = event.data.ok;

      void ok;
    });
    service.onControllerChange((controller) => {
      const current: ServiceWorker | null = controller;

      void current;
    });
    service.onUpdate((state) => {
      const waiting: boolean = state.waiting;

      void waiting;
    });

    const status: ServiceWorkerService["status"] = service.status;
    const message: ServiceWorkerMessageEvent<string> = {
      data: "ready",
      event: null as unknown as MessageEvent<string>,
      source: null,
    };

    // @ts-expect-error invalid support reason.
    support.reason = "unsupported-browser";
    // @ts-expect-error invalid service worker script type.
    config.type = "shared";
    // @ts-expect-error invalid update cache policy.
    config.updateViaCache = "cache-first";
    // @ts-expect-error invalid target.
    service.post("ping", [], "registration");
    // @ts-expect-error invalid status.
    service.status = "activating";
    // @ts-expect-error invalid client target.
    clientOptions.target = "registration";
    // @ts-expect-error invalid request option target.
    requestOptions.target = "registration";
    // @ts-expect-error invalid client error code.
    const invalidClientErrorCode: ServiceWorkerMessageClientErrorCode =
      "failed";

    expect(registrationState.registered).toBeTrue();
    expect(updateState.waiting).toBeTrue();
    expect(status).toBeDefined();
    expect(message.data).toBe("ready");
    expect(clientRequest.payload.action).toBe("sync");
    expect(clientResponse.data?.ok).toBeTrue();
    expect(clientErrorCode).toBe("timeout");
    void invalidClientErrorCode;
  });

  it("typechecks ng namespace aliases", () => {
    const config: ng.ServiceWorkerConfig = {
      scriptUrl: "/sw.js",
    };
    const service = null as unknown as ng.ServiceWorkerService;
    const state: ng.ServiceWorkerUpdateState = service.updateState;

    void config;
    void state;
  });
});
