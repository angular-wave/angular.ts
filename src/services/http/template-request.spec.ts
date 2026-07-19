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
      .module("test", ["ng"])
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
      cache,
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
      cache,
      transformResponse: null,
    });
  });

  describe("configuration", () => {
    describe("httpOptions", () => {
      it("should default to { headers: { Accept: 'text/html' } } and fallback to default $http options", async () => {
        spyOn($http, "get").and.callThrough();

        $templateRequest("/public/test.html");
        expect($http.get).toHaveBeenCalledOnceWith("/public/test.html", {
          cache: $templateCache,
          transformResponse: [],
          headers: { Accept: "text/html" },
        });
        await wait();
      });

      it("should be configurable", () => {
        function someTransform() {}

        angular.module("test", ["ng"]).config({
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
          "$templateCache",
          ($templateRequest, $http, $templateCache) => {
            spyOn($http, "get").and.callThrough();

            $templateRequest("/public/test.html");

            expect($http.get).toHaveBeenCalledOnceWith("/public/test.html", {
              cache: $templateCache,
              transformResponse: [someTransform],
              headers: { Accept: "moo" },
            });
          },
        ]);
      });

      it("should be allow you to override the cache", () => {
        const customCache = new Map();

        angular.module("test", ["ng"]).config({
          $templateRequest: {
            httpOptions: {
              cache: customCache,
            },
          },
        });

        createInjector(["test"]).invoke([
          "$templateRequest",
          "$http",
          ($templateRequest, $http) => {
            spyOn($http, "get").and.callThrough();

            $templateRequest("/public/test.html");

            expect($http.get).toHaveBeenCalledOnceWith("/public/test.html", {
              cache: customCache,
              transformResponse: [],
              headers: { Accept: "text/html" },
            });
          },
        ]);
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
