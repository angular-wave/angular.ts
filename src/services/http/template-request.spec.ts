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
    $sce,
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
    $sce = injector.get("$sce");
  });

  it("keeps default options when configuration has no HTTP options", () => {
    const options = createTemplateRequestHttpOptions();

    expect(applyTemplateRequestConfig(options, {})).toBe(options);
  });

  it("removes a lone default response transform", async () => {
    const cache = new Map();
    const http = {
      defaults: { transformResponse: defaultHttpResponseTransform },
      get: jasmine.createSpy("get").and.resolveTo({ data: "template" }),
    };
    const request = createTemplateRequestService(cache, http, {});

    await expectAsync(request("/template.html")).toBeResolvedTo("template");

    expect(http.get).toHaveBeenCalledOnceWith("/template.html", {
      transformResponse: null,
    });
    expect(cache.get("/template.html")).toBe("template");
  });

  it("uses null when HTTP has no default response transform", async () => {
    const cache = new Map();
    const http = {
      defaults: {},
      get: jasmine.createSpy("get").and.resolveTo({ data: "template" }),
    };
    const request = createTemplateRequestService(cache, http, {});

    await request("/plain-template.html");

    expect(http.get).toHaveBeenCalledOnceWith("/plain-template.html", {
      transformResponse: null,
    });
  });

  it("serves cached templates without calling $http", async () => {
    const cache = new Map([["/cached.html", "cached template"]]);
    const http = {
      defaults: {},
      get: jasmine.createSpy("get"),
    };
    const request = createTemplateRequestService(cache, http, {});

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
    const request = createTemplateRequestService(cache, http, {});
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
    const request = createTemplateRequestService(cache, http, {});
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
    // Will throw on any template not in cache.
    spyOn($sce, "getTrustedResourceUrl").and.returnValue(false);

    $templateRequest("/public/test.html").catch((e) => {
      expect(e).toMatch("Template not found");
    }); // should go through $sce

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
