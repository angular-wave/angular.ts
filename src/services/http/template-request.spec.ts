// @ts-nocheck
/// <reference types="jasmine" />
import { createInjector } from "../../core/di/injector.ts";
import { Angular } from "../../angular.ts";
import { wait } from "../../shared/test-utils.ts";
import { defaultHttpResponseTransform } from "./http.ts";
import {
  applyTemplateRequestConfig,
  createTemplateRequestHttpOptions,
  createTemplateRequestService,
} from "../template-request/template-request.ts";

describe("$templateRequest", () => {
  let module,
    $rootScope,
    $templateRequest,
    $templateCache,
    $http,
    angular,
    errors;

  beforeEach(() => {
    errors = [];
    angular = window.angular = new Angular();
    module = angular
      .createModule("test", ["ng"])
      .decorator("$exceptionHandler", () => {
        return (exception, cause) => {
          errors.push(exception.message);
        };
      });
    const injector = createInjector(["test"]);

    $rootScope = injector.get("$rootScope");
    $templateRequest = injector.get("$templateRequest");
    $templateCache = injector.get("$templateCache");
    $http = injector.get("$http");
  });

  describe("consumer cancellation", () => {
    let cache, http, responses, request;
    beforeEach(() => {
      cache = new Map();
      responses = [];
      http = {
        defaults: {},
        get: jasmine.createSpy("get").and.callFake(() => {
          const response = Promise.withResolvers();
          responses.push(response);
          return response.promise;
        }),
      };
      request = createTemplateRequestService(cache, http, {}, (url) => url);
    });

    it("cancels one waiter while another receives the shared download", async () => {
      const first = new AbortController(),
        second = new AbortController();
      const a = request("/shared", { signal: first.signal });
      const b = request("/shared", { signal: second.signal });
      await Promise.resolve();
      const transport = http.get.calls.first().args[1].signal;
      first.abort("replaced");
      await expectAsync(a).toBeRejectedWith("replaced");
      expect(transport.aborted).toBeFalse();
      responses[0].resolve({ data: "shared" });
      await expectAsync(b).toBeResolvedTo("shared");
      expect(http.get).toHaveBeenCalledTimes(1);
      second.abort();
      expect(transport.aborted).toBeFalse();
    });

    it("aborts an abandoned download and preserves a newer request for the same URL", async () => {
      const controller = new AbortController();
      const obsolete = request("/retry", { signal: controller.signal });
      await Promise.resolve();
      const transport = http.get.calls.first().args[1].signal;
      controller.abort();
      await expectAsync(obsolete).toBeRejectedWith(controller.signal.reason);
      expect(transport.aborted).toBeTrue();
      const current = request("/retry");
      await Promise.resolve();
      // An uncooperative transport must neither cache stale content nor delete the new entry.
      responses[0].resolve({ data: "stale" });
      await wait();
      expect(cache.has("/retry")).toBeFalse();
      expect(request("/retry")).toBe(current);
      responses[1].resolve({ data: "fresh" });
      await expectAsync(current).toBeResolvedTo("fresh");
      expect(cache.get("/retry")).toBe("fresh");
    });

    it("keeps an unsignalled consumer alive when its signalled peer cancels", async () => {
      const controller = new AbortController();
      const a = request("/persistent", { signal: controller.signal });
      const b = request("/persistent");
      await Promise.resolve();
      controller.abort();
      await expectAsync(a).toBeRejected();
      expect(http.get.calls.first().args[1].signal.aborted).toBeFalse();
      responses[0].resolve({ data: "persistent" });
      await expectAsync(b).toBeResolvedTo("persistent");
    });

    it("does not start work for pre-aborted consumers or immediately abandoned requests", async () => {
      const controller = new AbortController();
      controller.abort("cancelled");
      await expectAsync(
        request("/pre", { signal: controller.signal }),
      ).toBeRejectedWith("cancelled");
      const immediate = new AbortController();
      const pending = request("/immediate", { signal: immediate.signal });
      immediate.abort();
      await expectAsync(pending).toBeRejected();
      await wait();
      expect(http.get).not.toHaveBeenCalled();
    });

    it("preserves configured cancellation and rejects failed downloads for every waiter", async () => {
      const global = new AbortController(),
        consumer = new AbortController();
      request = createTemplateRequestService(
        cache,
        http,
        { signal: global.signal },
        (url) => url,
      );
      const a = request("/failure", { signal: consumer.signal });
      const b = request("/failure", { signal: new AbortController().signal });
      await Promise.resolve();
      const transport = http.get.calls.first().args[1].signal;
      global.abort("global cancellation");
      expect(transport.aborted).toBeTrue();
      responses[0].reject("failure");
      await expectAsync(a).toBeRejectedWith("failure");
      await expectAsync(b).toBeRejectedWith("failure");
    });

    it("keeps cached templates available after configured HTTP cancellation", async () => {
      const global = new AbortController();
      global.abort();
      request = createTemplateRequestService(
        cache,
        http,
        { signal: global.signal },
        (url) => url,
      );
      cache.set("/cached-global", "cached");
      await expectAsync(request("/cached-global")).toBeResolvedTo("cached");
      expect(http.get).not.toHaveBeenCalled();
      const consumer = new AbortController();
      consumer.abort("consumer cancelled");
      await expectAsync(
        request("/cached-global", { signal: consumer.signal }),
      ).toBeRejectedWith("consumer cancelled");
    });

    it("serves cached templates to a signalled consumer and removes its abort listener", async () => {
      const controller = new AbortController();
      const remove = spyOn(
        controller.signal,
        "removeEventListener",
      ).and.callThrough();
      cache.set("/cached", "cached");
      await expectAsync(
        request("/cached", { signal: controller.signal }),
      ).toBeResolvedTo("cached");
      expect(http.get).not.toHaveBeenCalled();
      expect(remove).toHaveBeenCalledWith("abort", jasmine.any(Function));
    });
  });

  it("keeps default options when configuration has no HTTP options", () => {
    const options = createTemplateRequestHttpOptions();

    expect(applyTemplateRequestConfig(options, {})).toBe(options);
  });

  it("enforces resource policy before cache and pending-request lookup", async () => {
    const cache = new Map([
      ["https://blocked.example/template.html", "cached"],
    ]);
    const response = Promise.withResolvers();
    const http = {
      defaults: {},
      get: jasmine.createSpy("get").and.returnValue(response.promise),
    };
    let allow = false;
    const policy = jasmine.createSpy("resourcePolicy").and.callFake((url) => {
      if (!allow) throw new Error("resource denied");
      return url;
    });
    const request = createTemplateRequestService(cache, http, {}, policy);
    await expectAsync(
      request("https://blocked.example/template.html"),
    ).toBeRejectedWithError("resource denied");
    expect(http.get).not.toHaveBeenCalled();
    allow = true;
    const pending = request("/pending.html");
    await Promise.resolve();
    await Promise.resolve();
    allow = false;
    await expectAsync(request("/pending.html")).toBeRejectedWithError(
      "resource denied",
    );
    response.resolve({ data: "approved template" });
    await expectAsync(pending).toBeResolvedTo("approved template");
    expect(policy).toHaveBeenCalledTimes(3);
  });

  it("uses the resource-policy result for requests and cache keys", async () => {
    const cache = new Map();
    const http = {
      defaults: {},
      get: jasmine.createSpy("get").and.resolveTo({ data: "template" }),
    };
    const request = createTemplateRequestService(
      cache,
      http,
      {},
      () => "/approved.html",
    );
    await expectAsync(request("/unprocessed.html")).toBeResolvedTo("template");
    expect(http.get).toHaveBeenCalledWith(
      "/approved.html",
      jasmine.any(Object),
    );
    expect(cache.get("/approved.html")).toBe("template");
    expect(cache.has("/unprocessed.html")).toBeFalse();
  });

  it("removes a lone default response transform", async () => {
    const cache = new Map();
    const http = {
      defaults: { transformResponse: defaultHttpResponseTransform },
      get: jasmine.createSpy("get").and.resolveTo({ data: "template" }),
    };
    const request = createTemplateRequestService(cache, http, {}, (url) => url);

    await expectAsync(request("/template.html")).toBeResolvedTo("template");

    expect(http.get).toHaveBeenCalledOnceWith("/template.html", {
      transformResponse: null,
      signal: jasmine.any(AbortSignal),
    });
    expect(cache.get("/template.html")).toBe("template");
  });

  it("uses null when HTTP has no default response transform", async () => {
    const cache = new Map();
    const http = {
      defaults: {},
      get: jasmine.createSpy("get").and.resolveTo({ data: "template" }),
    };
    const request = createTemplateRequestService(cache, http, {}, (url) => url);

    await request("/plain-template.html");

    expect(http.get).toHaveBeenCalledOnceWith("/plain-template.html", {
      transformResponse: null,
      signal: jasmine.any(AbortSignal),
    });
  });

  it("serves cached templates without calling $http", async () => {
    const cache = new Map([["/cached.html", "cached template"]]);
    const http = {
      defaults: {},
      get: jasmine.createSpy("get"),
    };
    const request = createTemplateRequestService(cache, http, {}, (url) => url);

    await expectAsync(request("/cached.html")).toBeResolvedTo(
      "cached template",
    );
    expect(http.get).not.toHaveBeenCalled();
  });

  it("observes templates cached later in the request turn", async () => {
    const cache = new Map();
    const http = {
      defaults: {},
      get: jasmine.createSpy("get"),
    };
    const request = createTemplateRequestService(cache, http, {}, (url) => url);
    const pending = request("/late-cached.html");

    cache.set("/late-cached.html", "late cached template");

    await expectAsync(pending).toBeResolvedTo("late cached template");
    expect(http.get).not.toHaveBeenCalled();
  });

  it("shares an in-flight request for the same template", async () => {
    const cache = new Map();
    const response = Promise.withResolvers();
    const http = {
      defaults: {},
      get: jasmine.createSpy("get").and.returnValue(response.promise),
    };
    const request = createTemplateRequestService(cache, http, {}, (url) => url);
    const first = request("/pending.html");
    const second = request("/pending.html");

    await Promise.resolve();
    expect(http.get).toHaveBeenCalledTimes(1);
    response.resolve({ data: "pending template" });
    await expectAsync(Promise.all([first, second])).toBeResolvedTo([
      "pending template",
      "pending template",
    ]);
    expect(cache.get("/pending.html")).toBe("pending template");
  });

  describe("configuration", () => {
    describe("httpOptions", () => {
      it("should default to { headers: { Accept: 'text/html' } } and fallback to default $http options", async () => {
        spyOn($http, "get").and.callThrough();

        $templateRequest("/public/test.html");
        await Promise.resolve();
        expect($http.get).toHaveBeenCalledOnceWith("/public/test.html", {
          transformResponse: [],
          signal: jasmine.any(AbortSignal),
          headers: { Accept: "text/html" },
        });
        await wait();
      });

      it("should be configurable", async () => {
        function someTransform() {}

        let configuredHttp;

        angular.createModule("test", ["ng"]).config({
          $templateRequest: {
            httpOptions: {
              headers: { Accept: "moo" },
              transformResponse: [someTransform],
            },
          },
        });

        createInjector(["test"]).invoke([
          "$templateRequest",
          "$http",
          ($templateRequest, $http) => {
            configuredHttp = $http;
            spyOn($http, "get").and.callThrough();

            $templateRequest("/public/test.html");
          },
        ]);

        await Promise.resolve();
        expect(configuredHttp.get).toHaveBeenCalledOnceWith(
          "/public/test.html",
          {
            transformResponse: [someTransform],
            signal: jasmine.any(AbortSignal),
            headers: { Accept: "moo" },
          },
        );
      });

      it("allows an HTTP cache policy override", async () => {
        const cache = {
          strategy: "cache-first",
          store: new Map(),
        };

        let configuredHttp;

        angular.createModule("test", ["ng"]).config({
          $templateRequest: {
            httpOptions: {
              cache,
            },
          },
        });

        createInjector(["test"]).invoke([
          "$templateRequest",
          "$http",
          ($templateRequest, $http) => {
            configuredHttp = $http;
            spyOn($http, "get").and.callThrough();

            $templateRequest("/public/test.html");
          },
        ]);

        await Promise.resolve();
        expect(configuredHttp.get).toHaveBeenCalledOnceWith(
          "/public/test.html",
          {
            cache,
            signal: jasmine.any(AbortSignal),
            transformResponse: [],
            headers: { Accept: "text/html" },
          },
        );
      });
    });
  });

  it("should download the provided template file", async () => {
    let content;

    await $templateRequest("/mock/div").then((html) => {
      content = html;
    });
    await wait();
    expect(content).toBe("<div>Hello</div>");
  });

  it("should cache the request to prevent extra downloads", async () => {
    const content = [];

    function tplRequestCb(html) {
      content.push(html);
    }

    await $templateRequest("/mock/div").then(tplRequestCb);

    $templateRequest("/mock/div").then(tplRequestCb);
    await wait();
    expect(content[0]).toBe("<div>Hello</div>");
    expect(content[1]).toBe("<div>Hello</div>");
    expect($templateCache.get("/mock/div")).toBe("<div>Hello</div>");
  });

  it("should return the cached value on the first request", async () => {
    $templateCache.set("/public/test.html", "_matias");
    const content = [];

    function tplRequestCb(html) {
      content.push(html);
    }

    await $templateRequest("/public/test.html").then(tplRequestCb);
    expect(content[0]).toBe("_matias");
  });

  it("should not call `$exceptionHandler` when the template is empty", async () => {
    const onError = jasmine.createSpy("onError");

    await $templateRequest("/mock/empty").catch(onError);
    expect(onError).not.toHaveBeenCalled();
  });

  it("should accept empty templates and refuse null or undefined templates in cache", async () => {
    $templateRequest("/public/test.html").catch((e) => {
      expect(e).toMatch("Template not found");
    });

    $templateCache.set("/public/test.html", ""); // should work (empty template)
    const res = await $templateRequest("/public/test.html");

    expect(res).toBeDefined();
  });

  it("should not try to parse a response as JSON", async () => {
    const spy = jasmine.createSpy("success");

    await $templateRequest("/mock/jsoninterpolation").then(spy);

    expect(spy).toHaveBeenCalledOnceWith('"{{expr}}"');
  });

  it("should use custom response transformers (array)", async () => {
    $http.defaults.transformResponse.push((data) => `${data}!!`);

    const spy = jasmine.createSpy("success");

    await $templateRequest("/mock/jsoninterpolation").then(spy);
    expect(spy).toHaveBeenCalledOnceWith('"{{expr}}"!!');
  });

  it("should use custom response transformers (function)", async () => {
    $http.defaults.transformResponse = function (data) {
      return `${data}!!`;
    };
    const spy = jasmine.createSpy("success");

    await $templateRequest("/mock/jsoninterpolation").then(spy);
    expect(spy).toHaveBeenCalledOnceWith('"{{expr}}"!!');
  });
});
