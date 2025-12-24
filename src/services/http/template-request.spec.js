import { createInjector } from "../../core/di/injector.js";
import { Angular } from "../../angular.js";
import { wait } from "../../shared/test-utils.js";

describe("$templateRequest", () => {
  let module,
    $rootScope,
    $templateRequest,
    $templateCache,
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
    let injector = createInjector(["test"]);
    $rootScope = injector.get("$rootScope");
    $templateRequest = injector.get("$templateRequest");
    $templateCache = injector.get("$templateCache");
    $sce = injector.get("$sce");
  });

  describe("provider", () => {
    describe("httpOptions", () => {
      it("should default to undefined and fallback to default $http options", () => {
        angular.module("test", [
          "ng",
          ($templateRequestProvider) => {
            expect($templateRequestProvider.httpOptions).toBeUndefined();
          },
        ]);

        createInjector(["test"]).invoke(
          async ($templateRequest, $http, $templateCache) => {
            spyOn($http, "get").and.callThrough();

            $templateRequest("/public/test.html");
            expect($http.get).toHaveBeenCalledOnceWith("/public/test.html", {
              cache: $templateCache,
              transformResponse: [],
            });
            await wait();
          },
        );
      });

      it("should be configurable", () => {
        function someTransform() {}

        angular.module("test", [
          "ng",
          ($templateRequestProvider) => {
            // Configure the template request service to provide  specific headers and transforms
            $templateRequestProvider.httpOptions = {
              headers: { Accept: "moo" },
              transformResponse: [someTransform],
            };
          },
        ]);

        createInjector(["test"]).invoke(
          ($templateRequest, $http, $templateCache) => {
            spyOn($http, "get").and.callThrough();

            $templateRequest("/public/test.html");

            expect($http.get).toHaveBeenCalledOnceWith("/public/test.html", {
              cache: $templateCache,
              transformResponse: [someTransform],
              headers: { Accept: "moo" },
            });
          },
        );
      });

      it("should be allow you to override the cache", () => {
        const httpOptions = {};

        angular.module("test", [
          "ng",
          ($templateRequestProvider) => {
            $templateRequestProvider.httpOptions = httpOptions;
          },
        ]);

        createInjector(["test"]).invoke(($templateRequest, $http) => {
          spyOn($http, "get").and.callThrough();

          const customCache = new Map();
          httpOptions.cache = customCache;

          $templateRequest("/public/test.html");

          expect($http.get).toHaveBeenCalledOnceWith("/public/test.html", {
            cache: customCache,
            transformResponse: [],
          });
        });
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
    let res = await $templateRequest("/public/test.html");
    expect(res).toBeDefined();
  });

  it("should not try to parse a response as JSON", async () => {
    const spy = jasmine.createSpy("success");
    await $templateRequest("/mock/jsoninterpolation").then(spy);

    expect(spy).toHaveBeenCalledOnceWith('"{{expr}}"');
  });

  it("should use custom response transformers (array)", async () => {
    module.config(($httpProvider) => {
      $httpProvider.defaults.transformResponse.push((data) => `${data}!!`);
    });
    let injector = createInjector(["test"]);
    $rootScope = injector.get("$rootScope");
    $templateRequest = injector.get("$templateRequest");
    $templateCache = injector.get("$templateCache");

    const spy = jasmine.createSpy("success");

    await $templateRequest("/mock/jsoninterpolation").then(spy);
    expect(spy).toHaveBeenCalledOnceWith('"{{expr}}"!!');
  });

  it("should use custom response transformers (function)", async () => {
    module.config(($httpProvider) => {
      $httpProvider.defaults.transformResponse = function (data) {
        return `${data}!!`;
      };
    });
    let injector = createInjector(["test"]);
    $rootScope = injector.get("$rootScope");
    $templateRequest = injector.get("$templateRequest");
    $templateCache = injector.get("$templateCache");
    const spy = jasmine.createSpy("success");
    await $templateRequest("/mock/jsoninterpolation").then(spy);
    expect(spy).toHaveBeenCalledOnceWith('"{{expr}}"!!');
  });
});
