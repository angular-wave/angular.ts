// @ts-nocheck
/// <reference types="jasmine" />
import { createInjector } from "../../core/di/injector.ts";
import { createScope } from "../../core/scope/scope.ts";
import { hashKey, isObject } from "../../shared/utils.ts";
import { Angular } from "../../angular.ts";
import { wait } from "../../shared/test-utils.ts";
import {
  applyHttpConfiguration,
  createHttpService,
  createHttpRuntimeConfiguration,
  createHttpParamSerializer,
  http,
} from "./http.ts";

describe("HTTP runtime configuration", () => {
  it("merges defaults and appends interceptor and XSRF policy", () => {
    const configuration = createHttpRuntimeConfiguration();
    const interceptor = () => ({});

    applyHttpConfiguration(configuration, {
      defaults: {
        headers: {
          common: { Authorization: "Bearer token" },
          post: { "X-Mode": "configured" },
        },
        credentials: "include",
      },
      interceptors: [interceptor],
      xsrfTrustedOrigins: ["https://api.example.com"],
    });

    expect(configuration.defaults.headers.common).toEqual({
      Accept: "application/json, text/plain, */*",
      Authorization: "Bearer token",
    });
    expect(configuration.defaults.headers.post).toEqual({
      "Content-Type": "application/json;charset=utf-8",
      "X-Mode": "configured",
    });
    expect(configuration.defaults.credentials).toBe("include");
    expect(configuration.interceptors).toEqual([interceptor]);
    expect(configuration.xsrfTrustedOrigins).toEqual([
      "https://api.example.com",
    ]);
  });

  it("resolves a default serializer token while constructing the service", () => {
    const configuration = createHttpRuntimeConfiguration();
    const serializer = () => "serialized";
    const injector = {
      get: jasmine.createSpy("get").and.returnValue(serializer),
    };

    configuration.defaults.paramSerializer = "configuredSerializer";
    createHttpService(injector, {}, {}, {}, configuration);

    expect(injector.get).toHaveBeenCalledOnceWith("configuredSerializer");
    expect(configuration.defaults.paramSerializer).toBe(serializer);
  });
});

describe("$http", function () {
  let $http, $injector, requests, response, $rootScope;
  let httpConfigModule;
  let securityId = 0;

  beforeEach(function () {
    window.angular = new Angular();
    securityId += 1;
    httpConfigModule = window.angular.createModule(
      `httpSecurityCompat${securityId}`,
      [],
    );
    httpConfigModule.config({
      $security: {
        allowInsecureOrigins: [window.location.origin],
      },
    });
    requests = [];
    $injector = createInjector(["ng", `httpSecurityCompat${securityId}`]);
    $http = $injector.get("$http");
    $rootScope = $injector.get("$rootScope");
  });

  it("is a function", function () {
    expect($http instanceof Function).toBe(true);
  });

  it("returns a Promise", function () {
    const result = $http({ url: "test" });

    expect(result).toBeDefined();
    expect(result.then).toBeDefined();
  });

  it("rejects invalid request configurations and URLs", async function () {
    await expectAsync($http(null)).toBeRejectedWithError(/badreq/);
    await expectAsync($http({ url: {} })).toBeRejectedWithError(/badreq/);
  });

  it("resolves a configured default parameter serializer through DI", async function () {
    httpConfigModule.config({
      $http: {
        defaults: {
          paramSerializer: "$httpParamSerializer",
        },
      },
    });
    const injector = createInjector(["ng", httpConfigModule.name]);
    const configuredHttp = injector.get("$http");

    const result = await configuredHttp.get("/mock/hello", {
      params: { configured: true },
    });

    expect(result.config.paramSerializer(result.config.params)).toBe(
      "configured=true",
    );
  });

  it("makes a fetch request to given URL", async function () {
    await $http({
      method: "POST",
      url: "/mock/hello",
      data: "hello",
    }).then((res) => {
      requests.push(res);
    });
    expect(requests.length).toBe(1);
    expect(requests[0].config.method).toBe("POST");
    expect(requests[0].config.url).toBe("/mock/hello");
    expect(requests[0].config.data).toBe("hello");
  });

  it("resolves promise when transport result received", async function () {
    await $http({
      method: "GET",
      url: "/mock/hello",
    }).then(function (r) {
      response = r;
    });
    expect(response).toBeDefined();
    expect(response.status).toBe(200);
    expect(response.statusText).toBe("OK");
    expect(response.data).toBe("Hello");
    expect(response.config.url).toEqual("/mock/hello");
  });

  it("rejects promise when transport result received with error status", async function () {
    await $http({
      method: "GET",
      url: "/mock/401",
    }).catch(function (r) {
      response = r;
    });
    expect(response).toBeDefined();
    expect(response instanceof Error).toBe(true);
    expect(response.name).toBe("HttpError");
    expect(response.response).toBeDefined();
    expect(response.response.status).toBe(401);
    expect(response.status).toBe(401);
    expect(response.statusText).toBe("Unauthorized");
    expect(response.data).toBe("Unauthorized");
    expect(response.config.url).toEqual("/mock/401");
  });

  it("uses GET method by default", async function () {
    await $http({
      url: "/mock/hello",
    }).then(function (r) {
      response = r;
    });
    expect(response).toBeDefined();
    expect(response.config.method).toBe("GET");
  });

  it("sets default headers on request", async function () {
    await $http({
      url: "/mock/hello",
      headers: {
        Accept: "text/plain",
        "Cache-Control": "no-cache",
      },
    }).then(function (r) {
      response = r;
    });
    expect(response).toBeDefined();

    expect(response.config.headers.Accept).toBe("text/plain");
    expect(response.config.headers["Cache-Control"]).toBe("no-cache");
  });

  it("allows requests when default headers are unset", async function () {
    $http.defaults.headers = undefined;

    await $http.get("/mock/hello").then(function (r) {
      response = r;
    });

    await wait();
    expect(response.status).toBe(200);
  });

  it("sets method-specific default headers on POST request", async function () {
    await $http({
      method: "POST",
      url: "/mock/hello",
      data: "42",
    }).then(function (r) {
      response = r;
    });
    expect(response).toBeDefined();
    expect(response.config.headers["Content-Type"]).toBe(
      "application/json;charset=utf-8",
    );
  });

  it("sets method-specific default headers on PUT request", async function () {
    await $http({
      method: "PUT",
      url: "/mock/put",
      data: "42",
    }).then(function (r) {
      response = r;
    });
    expect(response).toBeDefined();
    expect(response.config.headers["Content-Type"]).toBe(
      "application/json;charset=utf-8",
    );
  });

  it("sets method-specific default headers on PATCH request", async function () {
    await $http({
      method: "PATCH",
      url: "/mock/patch",
      data: "42",
    }).then(function (r) {
      response = r;
    });
    expect(response).toBeDefined();
    expect(response.config.headers["Content-Type"]).toBe(
      "application/json;charset=utf-8",
    );
  });

  it("exposes default headers for overriding", async function () {
    $http.defaults.headers.post.Accept = "text/plain";
    $http.defaults.headers.post["Content-Type"] = "text/plain;charset=utf-8";
    await $http({
      method: "POST",
      url: "/mock/hello",
      data: "42",
    }).then(function (r) {
      response = r;
    });
    expect(response).toBeDefined();
    expect(response.config.headers.Accept).toBe("text/plain");
    expect(response.config.headers["Content-Type"]).toBe(
      "text/plain;charset=utf-8",
    );
  });

  it("merges default headers case-insensitively", async function () {
    await $http({
      method: "POST",
      url: "/mock/hello",
      data: "42",
      headers: {
        "content-type": "text/plain;charset=utf-8",
      },
    }).then(function (r) {
      response = r;
    });
    expect(response).toBeDefined();

    expect(response.config.headers["content-type"]).toBe(
      "text/plain;charset=utf-8",
    );
    expect(response.config.headers["Content-Type"]).toBeUndefined();
  });

  it("does not send content-type header when no data", async function () {
    await $http({
      method: "POST",
      url: "/mock/hello",
      headers: {
        "Content-Type": "application/json;charset=utf-8",
      },
    }).then(function (r) {
      response = r;
    });
    expect(response).toBeDefined();
    expect(response.config.headers["Content-Type"]).not.toBe(
      "application/json;charset=utf-8",
    );
  });

  it("supports functions as header values", async function () {
    const contentTypeSpy = jasmine
      .createSpy()
      .and.returnValue("text/plain;charset=utf-8");

    $http.defaults.headers.post["Content-Type"] = contentTypeSpy;
    const request = {
      method: "POST",
      url: "/mock/hello",
      data: 42,
    };

    await $http(request).then(function (r) {
      response = r;
    });
    expect(contentTypeSpy).toHaveBeenCalledWith(request);
    expect(response.config.headers["Content-Type"]).toBe(
      "text/plain;charset=utf-8",
    );
  });

  it("ignores header function value when null/undefined", async function () {
    const cacheControlSpy = jasmine.createSpy().and.returnValue(null);

    $http.defaults.headers.post["Cache-Control"] = cacheControlSpy;
    const request = {
      method: "POST",
      url: "/mock/hello",
      data: 42,
    };

    await $http(request).then(function (r) {
      response = r;
    });
    expect(cacheControlSpy).toHaveBeenCalledWith(request);
    expect(response.config.headers["Cache-Control"]).toBeUndefined();
  });

  it("makes response headers available", async function () {
    await $http({
      method: "POST",
      url: "/mock/hello",
      data: 42,
    }).then(function (r) {
      response = r;
    });
    expect(response.headers).toBeDefined();
    expect(response.headers instanceof Function).toBe(true);
    expect(response.headers("Content-Type")).toBe("text/html; charset=utf-8");
  });

  it("may returns all response headers", async function () {
    await $http({
      method: "POST",
      url: "/mock/hello",
      data: 42,
    }).then(function (r) {
      response = r;
    });
    expect(response.headers()).toBeTruthy();
  });

  it("supports native response streams", async function () {
    await $http
      .get("/mock/hello", {
        responseType: "stream",
      })
      .then(function (r) {
        response = r;
      });

    expect(response.data instanceof ReadableStream).toBe(true);

    const reader = response.data
      .pipeThrough(new TextDecoderStream())
      .getReader();

    const chunks = [];

    let result = await reader.read();

    while (!result.done) {
      chunks.push(result.value);
      result = await reader.read();
    }

    expect(chunks.join("")).toBe("Hello");
  });

  it("allows explicitly transforming native response streams", async function () {
    const transformResponse = jasmine
      .createSpy("transformResponse")
      .and.callFake((data) => data);

    await $http
      .get("/mock/hello", {
        responseType: "stream",
        transformResponse,
      })
      .then(function (r) {
        response = r;
      });

    expect(transformResponse).toHaveBeenCalled();
    expect(response.data instanceof ReadableStream).toBe(true);
  });

  it("allows setting credentials", async function () {
    await $http({
      method: "POST",
      url: "/mock/hello",
      data: 42,
      credentials: "include",
    }).then(function (r) {
      response = r;
    });
    expect(response.config.credentials).toBe("include");
  });

  it("allows setting credentials from defaults", async function () {
    $http.defaults.credentials = "include";
    await $http({
      method: "POST",
      url: "/mock/hello",
      data: 42,
    }).then(function (r) {
      response = r;
    });
    expect(response.config.credentials).toBe("include");
  });

  it("normalizes headers and transforms removed by request interceptors", async function () {
    httpConfigModule.config({
      $http: {
        interceptors: [
          () => ({
            request(config) {
              config.headers = undefined;
              config.transformRequest = undefined;
              config.transformResponse = undefined;

              return config;
            },
          }),
        ],
      },
    });
    const injector = createInjector(["ng", httpConfigModule.name]);
    const configuredHttp = injector.get("$http");

    const result = await configuredHttp.get("/mock/hello");

    expect(result.data).toBe("Hello");
    expect(result.config.headers).toEqual({});
  });

  it("allows transforming requests with functions", async function () {
    let transformedData;

    await $http({
      method: "POST",
      url: "/mock/hello",
      data: 42,
      transformRequest(data) {
        transformedData = `*${data}*`;

        return transformedData;
      },
    }).then(function (r) {
      response = r;
    });
    expect(transformedData).toBe("*42*");
  });

  it("allows multiple request transform functions", async function () {
    let transformedData;

    await $http({
      method: "POST",
      url: "/mock/hello",
      data: 42,
      transformRequest: [
        function (data) {
          transformedData = `*${data}*`;

          return transformedData;
        },
        function (data) {
          transformedData = `-${data}-`;

          return transformedData;
        },
      ],
    });
    expect(transformedData).toBe("-*42*-");
  });

  it("allows settings transforms in defaults", async function () {
    let transformedData;

    $http.defaults.transformRequest = [
      function (data) {
        transformedData = `*${data}*`;

        return transformedData;
      },
    ];
    await $http({
      method: "POST",
      url: "/mock/hello",
      data: 42,
    });
    expect(transformedData).toBe("*42*");
  });

  it("passes request headers getter to transforms", async function () {
    let transformedData;

    $http.defaults.transformRequest = [
      function (data, headers) {
        if (headers("Content-Type") === "text/emphasized") {
          transformedData = `*${data}*`;

          return transformedData;
        } else {
          return data;
        }
      },
    ];
    await $http({
      method: "POST",
      url: "/mock/hello",
      data: 42,
      headers: {
        "content-type": "text/emphasized",
      },
    });
    expect(transformedData).toBe("*42*");
  });

  it("allows transforming responses with functions", async function () {
    await $http({
      url: "/mock/hello",
      transformResponse(data) {
        return `*${data}*`;
      },
    }).then(function (r) {
      response = r;
    });
    await wait();

    expect(response.data).toEqual("*Hello*");
  });

  it("passes response headers to transform functions", async function () {
    await $http({
      url: "/mock/hello",
      transformResponse(data) {
        return `*${data}*`;
      },
    }).then(function (r) {
      response = r;
    });
    await wait();

    expect(response.data).toEqual("*Hello*");
  });

  it("allows setting default response transforms", async function () {
    $http.defaults.transformResponse = [
      function (data) {
        return `*${data}*`;
      },
    ];
    await $http({
      url: "/mock/hello",
    }).then(function (r) {
      response = r;
    });
    await wait();

    expect(response.data).toEqual("*Hello*");
  });

  it("transforms error responses also", async function () {
    await $http({
      url: "/mock/401",
      transformResponse(data) {
        return `*${data}*`;
      },
    }).catch(function (r) {
      response = r;
    });
    await wait();

    expect(response.data).toEqual("*Unauthorized*");
  });

  it("passes HTTP status to response transformers", async function () {
    let response;

    await $http({
      url: "/mock/401",
      transformResponse(data, headers, status) {
        if (status === 401) {
          return "unauthorized";
        } else {
          return data;
        }
      },
    }).catch(function (r) {
      response = r;
    });
    await wait();

    expect(response.data).toEqual("unauthorized");
  });

  it("serializes object data to JSON for requests", async function () {
    await $http({
      method: "POST",
      url: "/mock/post",
      data: { aKey: 42 },
    }).then(function (r) {
      response = r;
    });
    await wait();
    expect(response.data).toEqual({ aKey: 42 });
    expect(response.config.data).toEqual({ aKey: 42 });
  });

  it("deproxies scope payloads before data reaches the server", async function () {
    const payload = createScope({
      name: "Ada",
      $hashKey: "user:1",
      $$watchersCount: 3,
      nested: {
        role: "admin",
        $hashKey: "role:1",
      },
      tags: [
        {
          label: "primary",
          $hashKey: "tag:1",
        },
      ],
    });

    await $http({
      method: "POST",
      url: "/mock/json",
      data: payload,
    }).then(function (r) {
      response = r;
    });
    await wait();

    expect(response.data).toEqual({
      name: "Ada",
      $hashKey: "user:1",
      nested: { role: "admin", $hashKey: "role:1" },
      tags: [{ label: "primary", $hashKey: "tag:1" }],
    });
    expect(response.data._handler).toBeUndefined();
    expect(response.data._target).toBeUndefined();
    expect(response.data._proxy).toBeUndefined();
    expect(response.data.$$watchersCount).toBeUndefined();
    expect(response.data.nested).not.toBe("$SCOPE");
  });

  it("does not send internally generated hash keys", async function () {
    const payload = createScope({ name: "Grace" });

    hashKey(payload);

    await $http({
      method: "POST",
      url: "/mock/json",
      data: payload,
    }).then(function (r) {
      response = r;
    });
    await wait();

    expect(response.data).toEqual({ name: "Grace" });
    expect(response.data.$hashKey).toBeUndefined();
  });

  it("serializes array data to JSON for requests", async function () {
    await $http({
      method: "POST",
      url: "/mock/post",
      data: [1, "two", 3],
    }).then(function (r) {
      response = r;
    });
    await wait();
    expect(response.data).toEqual([1, "two", 3]);
  });

  it("does not serialize blobs for requests", async function () {
    const blob = new Blob(["hello"]);

    await $http({
      method: "POST",
      url: "/mock/blob",
      data: blob,
    }).then(function (r) {
      response = r;
    });

    await wait();

    expect(response.config.data.size).toEqual(5);
    expect(response.data).toEqual("");
  });

  it("does not serialize form data for requests", async function () {
    const formData = new FormData();

    formData.append("aField", "aValue");
    await $http({
      method: "POST",
      url: "/mock/form",
      data: formData,
    }).then(function (r) {
      response = r;
    });

    await wait();

    expect(response.config.data).toEqual(formData);
    expect(response.data).toEqual("");
  });

  it("parses JSON data for JSON responses", async function () {
    await $http({
      method: "POST",
      url: "/mock/post",
      data: { aKey: 42 },
    }).then(function (r) {
      response = r;
    });
    await wait();

    expect(isObject(response.data)).toBe(true);
    expect(response.data.aKey).toBe(42);
  });

  it("parses a JSON object response without content type", async function () {
    await $http({
      method: "POST",
      url: "/mock/nocontent",
      data: { aKey: 42 },
    }).then(function (r) {
      response = r;
    });
    await wait();

    expect(isObject(response.data)).toBe(true);
    expect(response.data.aKey).toBe(42);
  });

  it("parses a JSON array response without content type", async function () {
    await $http({
      method: "POST",
      url: "/mock/nocontent",
      data: [1, 2, 3],
    }).then(function (r) {
      response = r;
    });
    await wait();

    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data).toEqual([1, 2, 3]);
  });

  it("does not choke on response resembling JSON but not valid", async function () {
    let response;

    await $http({
      method: "POST",
      url: "/mock/invalidarray",
    }).then(function (r) {
      response = r;
    });
    await wait();

    expect(response.data).toEqual("{1, 2, 3]");
  });

  it("does not try to parse interpolation expr as JSON", async function () {
    let response;

    await $http({
      method: "GET",
      url: "/mock/interpolation",
    }).then(function (r) {
      response = r;
    });
    await wait();
    expect(response.data).toEqual("{{expr}}");
  });

  it("adds params to URL", async function () {
    await $http({
      method: "GET",
      url: "/mock/hello",
      params: {
        a: 42,
      },
    }).then(function (r) {
      response = r;
    });
    await wait();
    expect(
      response.config.paramSerializer(response.config.params).endsWith("a=42"),
    ).toBeTrue();
  });

  it("adds additional params to URL", async function () {
    await $http({
      url: "/mock/hello?a=42",
      params: {
        b: 42,
      },
    }).then(function (r) {
      response = r;
    });
    await wait();
    expect(
      response.config.paramSerializer(response.config.params).endsWith("b=42"),
    ).toBeTrue();
  });

  it("escapes url characters in params", async function () {
    await $http({
      url: "/mock/hello",
      params: {
        "==": "&&",
      },
    }).then(function (r) {
      response = r;
    });
    await wait();

    expect(
      response.config
        .paramSerializer(response.config.params)
        .endsWith("%3D%3D=%26%26"),
    ).toBeTrue();
  });

  it("does not attach null or undefined params", async function () {
    await $http({
      url: "/mock/hello",
      params: {
        a: null,
        b: undefined,
      },
    }).then(function (r) {
      response = r;
    });
    await wait();
    expect(
      response.config.paramSerializer(response.config.params).endsWith(""),
    ).toBeTrue();
  });

  it("attaches multiple params from arrays", async function () {
    await $http({
      url: "/mock/hello",
      params: {
        a: [42, 43],
      },
    }).then(function (r) {
      response = r;
    });
    await wait();
    expect(
      response.config
        .paramSerializer(response.config.params)
        .endsWith("a=42&a=43"),
    ).toBeTrue();
  });

  it("does not attach null, undefined, or function params from arrays", async function () {
    await $http({
      url: "/mock/hello",
      params: {
        a: [42, null, undefined, () => "ignored", 43],
      },
    }).then(function (r) {
      response = r;
    });
    await wait();

    expect(
      response.config
        .paramSerializer(response.config.params)
        .endsWith("a=42&a=43"),
    ).toBeTrue();
  });

  it("serializes objects to json", async function () {
    await $http({
      method: "POST",
      url: "/mock/post",
      params: {
        a: { b: 42 },
      },
    }).then(function (r) {
      response = r;
    });
    await wait();
    expect(
      response.config
        .paramSerializer(response.config.params)
        .endsWith("a=%7B%22b%22:42%7D"),
    ).toBeTrue();
  });

  it("serializes dates to ISO strings", async function () {
    await $http({
      url: "/mock/hello",
      params: {
        a: new Date(2015, 0, 1, 12, 0, 0),
      },
    }).then(function (r) {
      response = r;
    });
    await wait();
    expect(
      response.config
        .paramSerializer(response.config.params)
        .endsWith("00:00.000Z"),
    ).toBeTrue();
  });

  it("allows substituting param serializer", async function () {
    await $http({
      url: "/mock/hello",
      params: {
        a: 42,
        b: 43,
      },
      paramSerializer(params) {
        return Object.keys(params)
          .map(function (k) {
            return `${k}=${params[k]}lol`;
          })
          .join("&");
      },
    }).then(function (r) {
      response = r;
    });
    await wait();

    expect(
      response.config
        .paramSerializer(response.config.params)
        .endsWith("a=42lol&b=43lol"),
    ).toBeTrue();
  });

  it("allows substituting param serializer through DI", async function () {
    window.angular
      .createModule("specialSerializer", [])
      .factory("mySpecialSerializer", function () {
        return function (params) {
          return Object.keys(params)
            .map(function (k) {
              return `${k}=${params[k]}lol`;
            })
            .join("&");
        };
      });
    const injector = createInjector(["ng", "specialSerializer"]);

    await injector.invoke([
      "$http",
      "$rootScope",
      async function ($http, $rootScope) {
        await $http({
          url: "/mock/hello",
          params: {
            a: 42,
            b: 43,
          },
          paramSerializer: "mySpecialSerializer",
        }).then(function (r) {
          response = r;
        });
        await wait();
      },
    ]);
    expect(
      response.config
        .paramSerializer(response.config.params)
        .endsWith("a=42lol&b=43lol"),
    ).toBeTrue();
  });

  it("makes default param serializer available through DI", async function () {
    const injector = createInjector(["ng"]);

    injector.invoke([
      "$httpParamSerializer",
      function ($httpParamSerializer) {
        const result = $httpParamSerializer({ a: 42, b: 43 });

        expect(result).toEqual("a=42&b=43");
      },
    ]);
  });

  it("supports shorthand method for GET", async function () {
    await $http
      .get("/mock/hello", {
        params: { q: 42 },
      })
      .then(function (r) {
        response = r;
      });
    await wait();

    expect(
      response.config.paramSerializer(response.config.params).endsWith("q=42"),
    ).toBeTrue();
    expect(response.config.method).toBe("GET");
  });

  it("supports shorthand method for HEAD", async function () {
    await $http
      .head("/mock/head", {
        params: { q: 42 },
      })
      .then(function (r) {
        response = r;
      });
    await wait();

    expect(
      response.config.paramSerializer(response.config.params).endsWith("q=42"),
    ).toBeTrue();
    expect(response.config.method).toBe("HEAD");
  });

  it("supports shorthand method for DELETE", async function () {
    await $http
      .delete("/mock/delete", {
        params: { q: 42 },
      })
      .then(function (r) {
        response = r;
      });

    await wait();

    expect(
      response.config.paramSerializer(response.config.params).endsWith("q=42"),
    ).toBeTrue();
    expect(response.config.method).toBe("DELETE");
  });

  it("supports shorthand method for POST with data", async function () {
    await $http
      .post("/mock/hello", "data", {
        params: { q: 42 },
      })
      .then(function (r) {
        response = r;
      });
    await wait();

    expect(
      response.config.paramSerializer(response.config.params).endsWith("q=42"),
    ).toBeTrue();
    expect(response.config.method).toBe("POST");
    expect(response.config.data).toBe("data");
  });

  it("supports shorthand method for PUT with data", async function () {
    await $http
      .put("/mock/put", "data", {
        params: { q: 42 },
      })
      .then(function (r) {
        response = r;
      });
    await wait();
    expect(
      response.config.paramSerializer(response.config.params).endsWith("q=42"),
    ).toBeTrue();
    expect(response.config.method).toBe("PUT");
    expect(response.config.data).toBe("data");
  });

  it("supports shorthand method for PATCH with data", async function () {
    await $http
      .patch("/mock/patch", "data", {
        params: { q: 42 },
      })
      .then(function (r) {
        response = r;
      });
    await wait();

    expect(
      response.config.paramSerializer(response.config.params).endsWith("q=42"),
    ).toBeTrue();
    expect(response.config.method).toBe("PATCH");
    expect(response.config.data).toBe("data");
  });

  it("supports shorthand methods when options are omitted", async function () {
    const getResponse = await $http.get("/mock/hello");
    const postResponse = await $http.post("/mock/hello", "data");

    expect(getResponse.config.method).toBe("GET");
    expect(postResponse.config.method).toBe("POST");
  });

  it("uses request, configured, and internal caches", async function () {
    const requestStore = new Map();
    const requestCache = {
      strategy: "cache-first",
      store: requestStore,
    };

    const first = await $http.get("/mock/hello", { cache: requestCache });
    const second = await $http.get("/mock/hello", { cache: requestCache });

    expect(second.data).toBe(first.data);
    expect(requestStore.get("/mock/hello").data).toBe("Hello");

    const configuredStore = new Map();

    $http.defaults.cache = {
      strategy: "cache-first",
      store: configuredStore,
    };
    await $http.get("/mock/hello");
    expect(configuredStore.has("/mock/hello")).toBeTrue();

    $http.defaults.cache = undefined;
    await $http.get("/mock/hello", { cache: true });
    const internallyCached = await $http.get("/mock/hello", { cache: true });

    expect(internallyCached.data).toBe("Hello");
  });

  it("stores successful responses and does not cache failures", async function () {
    const store = new Map();
    const cache = { strategy: "cache-first", store };
    const response = await $http.get("/mock/hello", { cache });

    expect(response.data).toBe("Hello");
    expect(store.get("/mock/hello").data).toBe("Hello");

    await expectAsync($http.get("/mock/401", { cache })).toBeRejected();
    expect(store.has("/mock/401")).toBeFalse();
  });

  it("serves cached responses and preserves cached error statuses", async function () {
    const cachedResponse = {
      data: "cached",
      status: 200,
      headers: (headerName) => (headerName ? "" : {}),
      config: {},
      statusText: "OK",
      transportStatus: "complete",
    };
    const valueStore = new Map([["/mock/value", cachedResponse]]);
    const valueResponse = await $http.get("/mock/value", {
      cache: { strategy: "cache-first", store: valueStore },
    });

    expect(valueResponse.data).toBe("cached");
    expect(valueResponse.status).toBe(200);

    const statusStore = new Map([
      [
        "/mock/status",
        {
          ...cachedResponse,
          data: "failed",
          status: 503,
          statusText: "Unavailable",
          transportStatus: "error",
        },
      ],
    ]);

    await expectAsync(
      $http.get("/mock/status", {
        cache: { strategy: "cache-first", store: statusStore },
      }),
    ).toBeRejectedWith(
      jasmine.objectContaining({
        status: 503,
      }),
    );
  });

  it("preserves cache-store rejections", async function () {
    const error = new Error("cache unavailable");
    const pending = Promise.withResolvers();
    const store = new Map([["/mock/malformed", pending.promise]]);
    const request = $http.get("/mock/malformed", {
      cache: { strategy: "cache-first", store },
    });

    pending.reject(error);

    await expectAsync(request).toBeRejectedWith(error);
  });

  it("normalizes non-error cache-store rejections", async function () {
    const pending = Promise.withResolvers();
    const store = new Map([["/mock/primitive-rejection", pending.promise]]);
    const request = $http.get("/mock/primitive-rejection", {
      cache: { strategy: "cache-first", store },
    });

    pending.reject("cache unavailable");

    await expectAsync(request).toBeRejectedWith(
      jasmine.objectContaining({
        message: "$http request pipeline rejected without a response.",
        cause: "cache unavailable",
      }),
    );
  });

  it("rejects legacy cache objects with their configuration error", async function () {
    await expectAsync(
      $http.get("/mock/hello", { cache: new Map() }),
    ).toBeRejectedWithError(
      Error,
      "$http cache objects must use the { strategy, store } configuration shape.",
    );
  });

  it("adds XSRF cookies with default and request header names", async function () {
    document.cookie = "XSRF-TOKEN=secret; path=/";

    const defaultResponse = await $http.get("/mock/hello");
    const customResponse = await $http.get("/mock/hello", {
      xsrfHeaderName: "X-CUSTOM-XSRF",
    });

    expect(defaultResponse.config.headers["X-XSRF-TOKEN"]).toBe("secret");
    expect(customResponse.config.headers["X-CUSTOM-XSRF"]).toBe("secret");

    document.cookie = "XSRF-TOKEN=; Max-Age=0; path=/";
  });

  it("allows attaching interceptor factories", async function () {
    const interceptorFactorySpy = jasmine.createSpy();
    httpConfigModule.config({
      $http: { interceptors: [interceptorFactorySpy] },
    });
    const injector = createInjector(["ng", httpConfigModule.name]);

    $http = injector.get("$http");

    expect(interceptorFactorySpy).toHaveBeenCalled();
  });

  it("uses DI to instantiate interceptors", async function () {
    const interceptorFactorySpy = jasmine.createSpy();
    httpConfigModule.config({
      $http: {
        interceptors: [["$rootScope", interceptorFactorySpy]],
      },
    });
    const injector = createInjector(["ng", httpConfigModule.name]);

    $http = injector.get("$http");
    const $rootScope = injector.get("$rootScope");

    expect(interceptorFactorySpy).toHaveBeenCalledWith($rootScope);
  });

  it("allows referencing existing interceptor factories", async function () {
    const interceptorFactorySpy = jasmine.createSpy().and.returnValue({});

    window.angular
      .createModule("existingInterceptor", [])
      .factory("myInterceptor", interceptorFactorySpy)
      .config({
        $http: { interceptors: ["myInterceptor"] },
      });
    const injector = createInjector(["ng", "existingInterceptor"]);

    $http = injector.get("$http");

    expect(interceptorFactorySpy).toHaveBeenCalled();
  });

  it("allows intercepting requests", async function () {
    httpConfigModule.config({
      $http: {
        interceptors: [
          function () {
            return {
              request(config) {
                config.params.intercepted = true;

                return config;
              },
            };
          },
        ],
      },
    });
    const injector = createInjector(["ng", httpConfigModule.name]);

    $http = injector.get("$http");
    $rootScope = injector.get("$rootScope");

    await $http.get("/mock/hello", { params: {} }).then(function (r) {
      response = r;
    });

    await wait();

    expect(
      response.config
        .paramSerializer(response.config.params)
        .endsWith("intercepted=true"),
    ).toBeTrue();
  });

  it("allows returning promises from request intercepts", async function () {
    httpConfigModule.config({
      $http: {
        interceptors: [
          function () {
            return {
              request(config) {
                config.params.intercepted = true;

                return Promise.resolve(config);
              },
            };
          },
        ],
      },
    });
    const injector = createInjector(["ng", httpConfigModule.name]);

    $http = injector.get("$http");
    $rootScope = injector.get("$rootScope");

    await $http.get("/mock/hello", { params: {} }).then(function (r) {
      response = r;
    });
    await wait();

    expect(
      response.config
        .paramSerializer(response.config.params)
        .endsWith("intercepted=true"),
    ).toBeTrue();
  });

  it("allows intercepting responses", async function () {
    httpConfigModule.config({
      $http: {
        interceptors: [
          () => ({
            response(response) {
              response.intercepted = true;

              return response;
            },
          }),
        ],
      },
    });
    const injector = createInjector(["ng", httpConfigModule.name]);

    $http = injector.get("$http");
    $rootScope = injector.get("$rootScope");

    let response;

    await $http.get("/mock/hello").then(function (r) {
      response = r;
    });
    await wait();

    expect(response.intercepted).toBe(true);
  });

  it("allows intercepting request errors", async function () {
    const requestErrorSpy = jasmine.createSpy();
    httpConfigModule.config({
      $http: {
        interceptors: [
          () => ({
            request() {
              throw "fail";
            },
          }),
          () => ({ requestError: requestErrorSpy }),
        ],
      },
    });
    const injector = createInjector(["ng", httpConfigModule.name]);

    $http = injector.get("$http");
    $rootScope = injector.get("$rootScope");

    try {
      await $http.get("/mock/hello").then(function (r) {
        response = r;
      });
    } catch {}

    expect(requestErrorSpy).toHaveBeenCalledWith("fail");
  });

  it("allows intercepting response errors", async function () {
    const responseErrorSpy = jasmine.createSpy();
    httpConfigModule.config({
      $http: {
        interceptors: [
          () => ({ responseError: responseErrorSpy }),
          () => ({
            response() {
              throw "fail";
            },
          }),
        ],
      },
    });
    const injector = createInjector(["ng", httpConfigModule.name]);

    $http = injector.get("$http");
    $rootScope = injector.get("$rootScope");

    await $http.get("/mock/hello");
    await wait();
    await wait();

    expect(responseErrorSpy).toHaveBeenCalledWith("fail");
  });

  it("allows attaching success handlers", async function () {
    let data, status, config;

    await $http.get("/mock/hello").then(function (res) {
      data = res.data;
      status = res.status;
      config = res.config;
    });
    await wait();

    expect(data).toBe("Hello");
    expect(status).toBe(200);
    expect(config.method).toBe("GET");
  });

  it("allows attaching error handlers", async function () {
    let res;

    await $http.get("/mock/401").then(
      () => {
        /* empty */
      },
      function (r) {
        res = r;
      },
    );
    await wait();

    expect(res.data).toBe("Unauthorized");
    expect(res.status).toBe(401);
    expect(res.config.method).toBe("GET");
  });

  it("allows aborting a request with an AbortSignal", async function () {
    const controller = new AbortController();

    const result = $http
      .get("/mock/never", {
        signal: controller.signal,
      })
      .then(
        function () {},
        function (err) {
          response = err;
        },
      );
    await wait();
    expect($http.pendingRequests.length).toBe(1);
    controller.abort("cancelled by user");
    await result;
    expect(response.transportStatus).toBe("abort");
    expect($http.pendingRequests.length).toBe(0);
  });

  it("allows aborting a request after a timeout", async function () {
    await $http
      .get("/mock/never", {
        timeout: 50,
      })
      .then(
        function () {},
        function (err) {
          response = err;
        },
      );
    await wait();

    expect(response.transportStatus).toBe("timeout");
  });

  describe("pending requests", function () {
    it("are in the collection while pending", async function () {
      $http.get("/mock/hello");
      expect($http.pendingRequests.length).toBe(0);
      await wait();
      expect($http.pendingRequests).toBeDefined();
      expect($http.pendingRequests.length).toBe(1);
      expect($http.pendingRequests[0].url).toBe("/mock/hello");
    });

    it("are also cleared on failure", async function () {
      await $http.get("/mock/401").then(
        () => {
          /* empty */
        },
        (err) => {},
      );

      await wait();

      expect($http.pendingRequests.length).toBe(0);
    });
  });
});

function getRequestHeader(request, headerName) {
  const headers = request.headers;

  if (headers instanceof Headers) {
    return headers.get(headerName);
  }

  return headers?.[headerName];
}

describe("$http regression coverage", () => {
  let fetchEnv, configuration, cookies, $http;

  function configureHttp() {
    const injector = {
      get: () => createHttpParamSerializer(),
      invoke: (factory) => factory(),
    };

    $http = createHttpService(
      injector,
      cookies,
      { check: () => ({ type: "allow" }) },
      createStreamService(),
      configuration,
    );
  }

  beforeEach(() => {
    fetchEnv = installFakeFetch();
    configuration = createHttpRuntimeConfiguration();
    cookies = { getAll: jasmine.createSpy("getAll").and.returnValue({}) };
    configureHttp();
  });

  afterEach(() => fetchEnv.restore());

  async function respond(
    request,
    body = "response",
    headers = "",
    status = 200,
  ) {
    await wait();
    fetchEnv.requests.at(-1).respond(status, "Test status", body, headers);
    return request;
  }

  it("runs request interceptors in registration order and responses in reverse", async () => {
    const order = [];
    configuration.interceptors.push(
      ...["outer", "inner"].map((name) => () => ({
        request(config) {
          order.push(`request:${name}`);
          config.url += `/${name}`;
          return Promise.resolve(config);
        },
        response(response) {
          order.push(`response:${name}`);
          response.data = `{${response.data}} ${name}`;
          return Promise.resolve(response);
        },
      })),
    );
    configureHttp();
    const response = await respond($http.get("/url"));

    expect(fetchEnv.requests[0].url).toBe("/url/outer/inner");
    expect(response.data).toBe("{{response} inner} outer");
    expect(order).toEqual([
      "request:outer",
      "request:inner",
      "response:inner",
      "response:outer",
    ]);
  });

  it("recovers rejected request and response interceptor promises", async () => {
    let savedConfig, savedResponse;
    configuration.interceptors.push(
      () => ({
        request(config) {
          savedConfig = config;
          return Promise.reject("/recovered");
        },
      }),
      () => ({
        requestError(reason) {
          savedConfig.url += reason;
          return Promise.resolve(savedConfig);
        },
      }),
      () => ({
        responseError(reason) {
          savedResponse.data += reason;
          return Promise.resolve(savedResponse);
        },
      }),
      () => ({
        response(response) {
          savedResponse = response;
          return Promise.reject(":recovered");
        },
      }),
    );
    configureHttp();
    const response = await respond($http.get("/url"));

    expect(fetchEnv.requests[0].url).toBe("/url/recovered");
    expect(response.data).toBe("response:recovered");
  });

  it("rejects an unrecovered request interceptor failure without starting fetch", async () => {
    const error = new Error("request interceptor failed");
    configuration.interceptors.push(() => ({
      request: () => Promise.reject(error),
    }));
    configureHttp();

    await expectAsync($http.get("/url")).toBeRejectedWith(error);
    expect(fetchEnv.requests).toEqual([]);
    expect($http.pendingRequests).toEqual([]);
  });

  it("keeps caller config and headers unchanged when interceptors rewrite them", async () => {
    configuration.interceptors.push(() => ({
      request(config) {
        config.url = "/rewritten";
        config.headers.Accept = "rewritten";
        return config;
      },
    }));
    configureHttp();
    const config = { headers: { Accept: "original" } };
    const response = await respond($http.get("/url", config));

    expect(response.config.url).toBe("/rewritten");
    expect(response.config.headers.Accept).toBe("rewritten");
    expect(config).toEqual({ headers: { Accept: "original" } });
  });

  it("isolates header-function config and request-transform header mutations", async () => {
    const config = {
      headers: {
        Accept: (config) => {
          config.custom = true;
          return "original";
        },
      },
      transformRequest: (data, headers) => {
        headers().accept = "changed";
        return data;
      },
    };
    const response = await respond($http.get("/url", config));

    expect(config.custom).toBeUndefined();
    expect(response.config.custom).toBeUndefined();
    expect(fetchEnv.requests[0].headers.get("Accept")).toBe("original");
  });

  it("retains Content-Type when a request transform supplies the body", async () => {
    await respond(
      $http.post("/url", undefined, { transformRequest: () => "generated" }),
    );

    expect(fetchEnv.requests[0].body).toBe("generated");
    expect(fetchEnv.requests[0].headers.get("Content-Type")).toBe(
      "application/json;charset=utf-8",
    );
  });

  it("sends File payloads without JSON serialization", async () => {
    const file = new File(["contents"], "upload.txt", { type: "text/plain" });
    await respond($http.post("/url", file));

    expect(fetchEnv.requests[0].body).toBe(file);
  });

  for (const value of [42, "text", null, true, false, ""]) {
    it(`parses the JSON primitive ${JSON.stringify(value)} with a JSON Content-Type`, async () => {
      const response = await respond(
        $http.get("/url"),
        JSON.stringify(value),
        "Content-Type: application/json;charset=utf-8",
      );

      expect(response.data).toEqual(value);
    });
  }

  for (const prefix of [")]}',\n", ")]}'\n\n"]) {
    it(`parses JSON with protection prefix ${JSON.stringify(prefix)}`, async () => {
      const response = await respond(
        $http.get("/url"),
        `${prefix}  [1, {"foo":"bar"}]  `,
      );

      expect(response.data).toEqual([1, { foo: "bar" }]);
    });
  }

  for (const body of [
    "",
    "   ",
    ")]}',\nPlain text",
    "{broken}",
    "[mismatched}",
  ]) {
    it(`preserves non-JSON text ${JSON.stringify(body)} without a JSON Content-Type`, async () => {
      const response = await respond($http.get("/url"), body);

      expect(response.data).toBe(body);
    });
  }

  it("rejects invalid JSON when Content-Type declares JSON", async () => {
    const request = $http.get("/url");
    const rejection = expectAsync(request).toBeRejectedWithError(/baddata/);
    await wait();
    fetchEnv.requests[0].respond(
      200,
      "OK",
      "{broken}",
      "Content-Type: application/json",
    );
    await rejection;

    expect($http.pendingRequests).toEqual([]);
  });

  for (const body of ["", "   "]) {
    it(`preserves an empty JSON response ${JSON.stringify(body)}`, async () => {
      const response = await respond(
        $http.get("/url"),
        body,
        "Content-Type: application/json",
      );

      expect(response.data).toBe(body);
    });
  }

  it("pipelines response transforms even for an empty body", async () => {
    const response = await respond(
      $http.head("/url", {
        transformResponse: [
          (data, headers, status) => `${data}${headers("X-Test")}:${status}`,
          (data) => `${data}:transformed`,
        ],
      }),
      "",
      "X-Test: value\nContent-Type: application/json",
    );

    expect(response.data).toBe("value:200:transformed");
  });

  it("deduplicates pending cached requests while preserving config, headers, and transforms", async () => {
    const first = $http.get("/url", {
      cache: true,
      headers: { "X-Request": "first" },
    });
    const second = $http.get("/url", {
      cache: true,
      headers: { "X-Request": "second" },
      transformResponse: (data) => `${data}:second`,
    });
    await wait();

    expect(fetchEnv.requests.length).toBe(1);
    expect($http.pendingRequests.length).toBe(2);
    fetchEnv.requests[0].respond(201, "Created", "cached", "X-Test: original");
    const [firstResponse, secondResponse] = await Promise.all([first, second]);
    expect(firstResponse.data).toBe("cached");
    expect(secondResponse.data).toBe("cached:second");
    expect(secondResponse.config.headers["X-Request"]).toBe("second");
    expect(secondResponse.headers()).not.toBe(firstResponse.headers());
    firstResponse.headers()["x-test"] = "changed";
    expect(secondResponse.headers("X-Test")).toBe("original");

    const callback = jasmine.createSpy("cached callback");
    const cachedRequest = $http
      .get("/url", { cache: true, headers: { "X-Request": "third" } })
      .then(callback);
    expect(callback).not.toHaveBeenCalled();
    await cachedRequest;
    const cachedResponse = callback.calls.mostRecent().args[0];
    expect(cachedResponse.data).toBe("cached");
    expect(cachedResponse.status).toBe(201);
    expect(cachedResponse.statusText).toBe("Created");
    expect(cachedResponse.transportStatus).toBe("complete");
    expect(cachedResponse.headers("x-test")).toBe("original");
    expect(cachedResponse.headers("missing")).toBe("");
    expect(cachedResponse.config.headers["X-Request"]).toBe("third");
    expect(fetchEnv.requests.length).toBe(1);
    expect($http.pendingRequests).toEqual([]);
  });

  it("preserves each pending cached request's config on failure and retries the transport", async () => {
    const first = $http
      .get("/url", { cache: true, headers: { "X-Request": "first" } })
      .catch((error) => error);
    const second = $http
      .get("/url", { cache: true, headers: { "X-Request": "second" } })
      .catch((error) => error);
    await wait();
    expect(fetchEnv.requests.length).toBe(1);
    fetchEnv.requests[0].respond(503, "Unavailable", "failed");
    const errors = await Promise.all([first, second]);

    expect(errors.map((error) => error.config.headers["X-Request"])).toEqual([
      "first",
      "second",
    ]);
    expect(
      errors.every(
        (error) => error.status === 503 && error.transportStatus === "complete",
      ),
    ).toBeTrue();
    expect($http.pendingRequests).toEqual([]);
    const response = await respond($http.get("/url", { cache: true }), "retry");
    expect(response.data).toBe("retry");
    expect(fetchEnv.requests.length).toBe(2);
  });

  for (const method of ["POST", "PUT", "DELETE"]) {
    it(`does not cache ${method} responses`, async () => {
      for (let i = 0; i < 2; i++) {
        await respond($http({ method, url: "/url", cache: true }));
      }

      expect(fetchEnv.requests.length).toBe(2);
    });
  }

  it("lets request cache:false override defaults and caches an empty string", async () => {
    $http.defaults.cache = true;
    await respond($http.get("/url"), "");
    const cached = await $http.get("/url");
    expect(cached.data).toBe("");
    expect(fetchEnv.requests.length).toBe(1);
    await respond($http.get("/url", { cache: false }), "fresh");
    expect(fetchEnv.requests.length).toBe(2);
  });

  it("uses configurable XSRF cookie names and skips cookie reads for cache hits", async () => {
    cookies.getAll.and.returnValue({
      defaultToken: "default",
      requestToken: "request",
    });
    $http.defaults.xsrfCookieName = "defaultToken";
    $http.defaults.xsrfHeaderName = "X-Default-Token";
    await respond($http.get("/url", { cache: true }));
    expect(fetchEnv.requests[0].headers.get("X-Default-Token")).toBe("default");
    cookies.getAll.calls.reset();
    await $http.get("/url", { cache: true });
    expect(cookies.getAll).not.toHaveBeenCalled();

    await respond(
      $http.get("/other", {
        xsrfCookieName: "requestToken",
        xsrfHeaderName: "X-Request-Token",
      }),
    );
    expect(fetchEnv.requests[1].headers.get("X-Request-Token")).toBe("request");
    expect(fetchEnv.requests[1].headers.has("X-Default-Token")).toBeFalse();
  });

  for (const [url, trusted] of [
    ["https://trusted.example.com/path", true],
    ["https://trusted2.example.com:1337/path", true],
    ["https://api.example.com/path", false],
    ["http://trusted.example.com/path", false],
    ["https://trusted2.example.com:1338/path", false],
  ]) {
    it(`${trusted ? "sends" : "withholds"} the XSRF token for ${url}`, async () => {
      configuration.xsrfTrustedOrigins.push(
        "https://trusted.example.com",
        "https://trusted2.example.com:1337/ignored/path",
      );
      cookies.getAll.and.returnValue({ "XSRF-TOKEN": "secret" });
      configureHttp();
      await respond($http.get(url));

      expect(fetchEnv.requests[0].headers.get("X-XSRF-TOKEN")).toBe(
        trusted ? "secret" : null,
      );
      expect(cookies.getAll.calls.count()).toBe(trusted ? 1 : 0);
    });
  }

  it("keeps method defaults independent and exposes the default serializer", () => {
    $http.defaults.headers.post["X-Post"] = "post only";

    expect($http.defaults.headers.put["X-Post"]).toBeUndefined();
    expect($http.defaults.paramSerializer({ z: "last", a: "first" })).toBe(
      "a=first&z=last",
    );
    expect($http.defaults.paramSerializer(null)).toBe("");
    expect($http.defaults.paramSerializer(undefined)).toBe("");
  });
});

describe("$http security policy", () => {
  let fetchEnv;

  let $http;

  let requestDecision;

  beforeEach(() => {
    fetchEnv = installFakeFetch();

    requestDecision = {
      type: "allow",
    };

    window.angular = new Angular();
    const module = window.angular.createModule(
      "defaultSecurityPolicyModule",
      [],
    );

    module.value("$security", {
      check: () => requestDecision,
    });

    const $injector = createInjector(["ng", "defaultSecurityPolicyModule"]);
    $http = $injector.get("$http");
  });

  afterEach(() => {
    fetchEnv.restore();
  });

  it("attaches jwt credentials when request policy allows", async () => {
    requestDecision = {
      type: "allow",
      credentials: {
        headers: { Authorization: "Bearer abc123" },
      },
    };

    const result = $http.get("/mock/hello");
    await wait();

    expect(fetchEnv.requests.length).toBe(1);
    expect(getRequestHeader(fetchEnv.requests[0], "Authorization")).toBe(
      "Bearer abc123",
    );

    fetchEnv.requests[0].respond(200, "OK", '{"ok":true}');

    const response = await result;
    expect(response.status).toBe(200);
    expect(response.config.headers.Authorization).toBe("Bearer abc123");
  });

  it("denies request policy decisions before fetch", async () => {
    requestDecision = {
      type: "deny",
      reason: "blocked",
      status: 403,
    };

    let error;

    try {
      await $http.get("/mock/hello");
    } catch (e) {
      error = e;
    }

    expect(error).toBeDefined();
    expect(error.status).toBe(403);
    expect(error.statusText).toBe("blocked");
    expect(fetchEnv.requests.length).toBe(0);
  });

  it("uses the default deny response shape when policy omits status details", async () => {
    requestDecision = {
      type: "deny",
    };

    let error;

    try {
      await $http.get("/mock/hello");
    } catch (e) {
      error = e;
    }

    expect(error).toBeDefined();
    expect(error.status).toBe(403);
    expect(error.statusText).toBe("Request denied by security policy");
    expect(fetchEnv.requests.length).toBe(0);
  });

  it("redirects request policy decisions before fetch", async () => {
    requestDecision = {
      type: "redirect",
      reason: "login required",
      status: 302,
      target: "/login",
    };

    let error;

    try {
      await $http.get("/mock/hello");
    } catch (e) {
      error = e;
    }

    expect(error).toBeDefined();
    expect(error.status).toBe(302);
    expect(error.statusText).toBe("login required");
    expect(fetchEnv.requests.length).toBe(0);
  });

  it("uses the default redirect response shape when policy omits status details", async () => {
    requestDecision = {
      type: "redirect",
      target: "/login",
    };

    let error;

    try {
      await $http.get("/mock/hello");
    } catch (e) {
      error = e;
    }

    expect(error).toBeDefined();
    expect(error.status).toBe(302);
    expect(error.statusText).toBe("Request redirected by security policy");
    expect(fetchEnv.requests.length).toBe(0);
  });

  it("attaches custom header credentials when request policy allows", async () => {
    requestDecision = {
      type: "allow",
      credentials: {
        headers: {
          "X-Auth-Token": "custom-token",
        },
        withCredentials: true,
      },
    };

    const result = $http.get("/mock/hello");

    await wait();

    expect(fetchEnv.requests.length).toBe(1);
    expect(getRequestHeader(fetchEnv.requests[0], "X-Auth-Token")).toBe(
      "custom-token",
    );
    expect(fetchEnv.requests[0].init.credentials).toBe("include");

    fetchEnv.requests[0].respond(200, "OK", "{}");

    const response = await result;

    expect(response.config.headers["X-Auth-Token"]).toBe("custom-token");
    expect(response.config.credentials).toBe("include");
  });

  it("applies a policy that limits credentials to the same origin", async () => {
    requestDecision = {
      type: "allow",
      credentials: { withCredentials: false },
    };
    const result = $http.get("/mock/hello", { credentials: "include" });
    await wait();
    expect(fetchEnv.requests[0].init.credentials).toBe("same-origin");
    fetchEnv.requests[0].respond(200, "OK", "{}");
    expect((await result).config.credentials).toBe("same-origin");
  });

  it("attaches basic credentials when request policy allows", async () => {
    requestDecision = {
      type: "allow",
      credentials: {
        headers: { Authorization: "Basic encoded" },
      },
    };

    const result = $http.get("/mock/hello");

    await wait();

    expect(fetchEnv.requests.length).toBe(1);
    expect(getRequestHeader(fetchEnv.requests[0], "Authorization")).toBe(
      "Basic encoded",
    );

    fetchEnv.requests[0].respond(200, "OK", "{}");

    const response = await result;

    expect(response.config.headers.Authorization).toBe("Basic encoded");
  });
});

describe("$http security policy via app.config", () => {
  let fetchEnv;
  let injectorId = 0;

  afterEach(() => {
    fetchEnv?.restore();
  });

  function createConfiguredHttp(config) {
    injectorId += 1;
    const moduleName = `httpSecurityConfiguredModule${injectorId}`;

    window.angular = new Angular();
    const module = window.angular.createModule(moduleName, []);
    module.config({ $security: config });

    fetchEnv = installFakeFetch();

    return createInjector(["ng", moduleName]).get("$http");
  }

  it("denies insecure requests by default when configured centrally", async () => {
    const $http = createConfiguredHttp({
      fallback: "allow",
      allowInsecureOrigins: [],
    });

    let error;

    try {
      await $http({
        method: "GET",
        url: "http://example.invalid/resource",
        credentials: "include",
      });
    } catch (e) {
      error = e;
    }

    expect(error).toBeDefined();
    expect(error.status).toBe(401);
    expect(error.statusText).toBe("insecure transport blocked");
    expect(fetchEnv.requests.length).toBe(0);
  });

  it("honors the configured insecure origin allowlist", async () => {
    const $http = createConfiguredHttp({
      fallback: "allow",
      allowInsecureOrigins: ["http://example.invalid"],
    });

    const resultPromise = $http({
      method: "GET",
      url: "http://example.invalid/resource",
      credentials: "include",
    });

    await wait();
    expect(fetchEnv.requests.length).toBe(1);
    fetchEnv.requests[0].respond(200, "OK", "{}");

    const result = await resultPromise;

    expect(result.status).toBe(200);
    expect(result.data).toEqual({});
  });

  it("attaches configured jwt credentials through app.config()", async () => {
    const $http = createConfiguredHttp({
      fallback: "deny",
      allowInsecureOrigins: [window.location.origin],
      credentials: {
        bearer: "configured-token",
      },
    });

    const resultPromise = $http.get("/mock/hello");

    await wait();
    expect(fetchEnv.requests.length).toBe(1);
    expect(getRequestHeader(fetchEnv.requests[0], "Authorization")).toBe(
      "Bearer configured-token",
    );
    fetchEnv.requests[0].respond(200, "OK", "{}");

    const result = await resultPromise;

    expect(result.status).toBe(200);
  });

  it("enables cookie session requests through app.config()", async () => {
    const $http = createConfiguredHttp({
      fallback: "deny",
      allowInsecureOrigins: [window.location.origin],
      credentials: {
        cookie: true,
      },
    });

    const resultPromise = $http.get("/mock/hello");

    await wait();
    expect(fetchEnv.requests.length).toBe(1);
    expect(fetchEnv.requests[0].init.credentials).toBe("include");
    expect(getRequestHeader(fetchEnv.requests[0], "Cookie")).toBeNull();
    fetchEnv.requests[0].respond(200, "OK", "{}");

    const result = await resultPromise;

    expect(result.status).toBe(200);
  });
});

describe("http", () => {
  let fetchEnv;

  let callback;

  let requests;

  beforeEach(() => {
    fetchEnv = installFakeFetch();
    requests = fetchEnv.requests;

    window.angular = new Angular();
    callback = jasmine.createSpy("done");
  });

  afterEach(() => {
    fetchEnv.restore();
  });

  for (const credentials of ["omit", "same-origin", "include"]) {
    it(`passes the ${credentials} credential mode to fetch`, () => {
      http("GET", "/url", null, callback, {}, undefined, credentials);
      expect(requests[0].init.credentials).toBe(credentials);
    });
  }

  it("does not start fetch for an already aborted signal", () => {
    const controller = new AbortController();
    controller.abort("cancelled");
    http(
      "GET",
      "/url",
      null,
      callback,
      {},
      100,
      "omit",
      "text",
      controller.signal,
    );
    expect(requests.length).toBe(0);
    expect(callback).toHaveBeenCalledOnceWith(-1, null, null, "", "abort");
  });

  it("aborts fetch with the caller's custom reason", async () => {
    const controller = new AbortController();
    http(
      "GET",
      "/url",
      null,
      callback,
      {},
      100,
      undefined,
      undefined,
      controller.signal,
    );
    controller.abort({ message: "cancelled" });
    await wait();
    expect(requests[0].init.signal.reason).toEqual({ message: "cancelled" });
    expect(callback).toHaveBeenCalledOnceWith(-1, null, null, "", "abort");
  });

  for (const mode of ["abort", "timeout"]) {
    it(`reports ${mode} while reading the response body`, async () => {
      const controller = new AbortController();
      let streamController;
      const body = new ReadableStream({
        start(value) {
          streamController = value;
        },
      });
      http(
        "GET",
        "/url",
        null,
        callback,
        {},
        mode === "timeout" ? 20 : undefined,
        undefined,
        "text",
        controller.signal,
      );
      requests[0].init.signal.addEventListener("abort", () => {
        streamController.error(requests[0].init.signal.reason);
      });
      requests[0].respond(200, "OK", body);
      await wait(5);
      if (mode === "abort") controller.abort("custom cancellation");
      await wait(30);
      expect(callback).toHaveBeenCalledOnceWith(-1, null, null, "", mode);
    });
  }

  it("reports a body reader failure as a transport error", async () => {
    const completion = Promise.withResolvers();
    callback.and.callFake(completion.resolve);
    http("GET", "/url", null, callback, {}, undefined, undefined, "json");
    requests[0].respond(200, "OK", "invalid json");
    await completion.promise;
    expect(callback).toHaveBeenCalledOnceWith(-1, null, null, "", "error");
  });

  it("keeps stream responses connected to the caller's cancellation signal", async () => {
    const controller = new AbortController();
    http(
      "GET",
      "/url",
      null,
      callback,
      {},
      undefined,
      undefined,
      "stream",
      controller.signal,
    );
    requests[0].respond(200, "OK", "response");
    await wait();
    expect(callback.calls.mostRecent().args[4]).toBe("complete");
    controller.abort("stop reading");
    expect(requests[0].init.signal.aborted).toBe(true);
    expect(requests[0].init.signal.reason).toBe("stop reading");
  });

  it("should do basics - start fetch and send data", () => {
    http("POST", "/some-url", "some-data", () => {});
    expect(requests.length).toBe(1);
    expect(requests[0].method).toBe("POST");
    expect(requests[0].url).toBe("/some-url");
    expect(requests[0].body).toBe("some-data");
  });

  it("should omit body if no body is set", () => {
    http("GET", "/some-url", undefined, () => {});
    expect(requests[0].body).toBeUndefined();
  });

  it("should pass the correct falsy value as body if falsy body is set", () => {
    [false, 0, "", null].forEach((value, index) => {
      http("POST", "/some-url", value, () => {});
      expect(requests[index].body).toBe(value === null ? null : String(value));
    });
  });

  it("should pass NaN as body if NaN body is set", () => {
    http("POST", "/some-url", NaN, () => {});
    expect(requests[0].body).toBe("NaN");
  });

  it("should call completion function with response statusText if present", async () => {
    callback.and.callFake((status, response, headers, statusText) => {
      expect(statusText).toBe("OK");
    });

    http("GET", "/some-url", null, callback);
    requests[0].respond(200, "OK", "");
    await wait(10);
    expect(callback).toHaveBeenCalled();
  });

  it("should set only the requested headers", () => {
    http("POST", "URL", null, () => {}, {
      "X-header1": "value1",
      "X-header2": "value2",
    });

    expect(requests[0].headers.get("X-header1")).toEqual("value1");
    expect(requests[0].headers.get("X-header2")).toEqual("value2");
  });

  it("should not try to read response data when request is aborted", async () => {
    callback.and.callFake((status, response, headers, statusText) => {
      expect(status).toBe(-1);
      expect(response).toBe(null);
      expect(headers).toBe(null);
      expect(statusText).toBe("");
    });

    http("GET", "/url", null, callback, {}, 2000);

    requests[0].abort();
    await wait();
    expect(callback).toHaveBeenCalled();
  });

  it("should complete the request on abort", async () => {
    callback.and.callFake((status, response, headers, statusText) => {
      expect(status).toBe(-1);
      expect(response).toBe(null);
      expect(headers).toBe(null);
      expect(statusText).toBe("");
    });

    http("GET", "/url", null, callback, {});
    expect(callback).not.toHaveBeenCalled();

    requests[0].abort();
    await wait();
    expect(callback).toHaveBeenCalled();
  });

  it("should complete the request on error", async () => {
    callback.and.callFake(
      (status, response, headers, statusText, transportStatus) => {
        expect(status).toBe(-1);
        expect(response).toBe(null);
        expect(headers).toBe(null);
        expect(statusText).toBe("");
        expect(transportStatus).toBe("error");
      },
    );

    http("GET", "/url", null, callback, {});
    expect(callback).not.toHaveBeenCalled();

    requests[0].error();
    await wait();
    expect(callback).toHaveBeenCalled();
  });

  it("should complete the request on timeout", async () => {
    callback.and.callFake(
      (status, response, headers, statusText, transportStatus) => {
        expect(status).toBe(-1);
        expect(response).toBe(null);
        expect(headers).toBe(null);
        expect(statusText).toBe("");
        expect(transportStatus).toBe("timeout");
      },
    );

    http("GET", "/url", null, callback, {}, 1);
    expect(callback).not.toHaveBeenCalled();

    await wait(10);
    expect(callback).toHaveBeenCalled();
  });

  it("should complete the request on success", async () => {
    callback.and.callFake(
      (status, response, headers, statusText, transportStatus) => {
        expect(status).toBe(200);
        expect(response).toBe("response");
        expect(headers).toContain("content-type: text/plain");
        expect(statusText).toBe("OK");
        expect(transportStatus).toBe("complete");
      },
    );

    http("GET", "/url", null, callback, {});
    expect(callback).not.toHaveBeenCalled();

    requests[0].respond(200, "OK", "response");
    await wait(10);
    expect(callback).toHaveBeenCalled();
  });

  it("should read text responses through the stream service when provided", async () => {
    const streamService = createStreamService();

    callback.and.callFake((status, response) => {
      expect(status).toBe(200);
      expect(response).toBe("response");
    });

    http(
      "GET",
      "/url",
      null,
      callback,
      {},
      undefined,
      "same-origin",
      "text",
      undefined,
      streamService,
    );
    requests[0].respond(200, "OK", "response");
    await wait(10);

    expect(callback).toHaveBeenCalled();
    expect(streamService.readText).toHaveBeenCalledWith(
      jasmine.any(ReadableStream),
    );
  });

  it("should parse json responses read through the stream service", async () => {
    const streamService = createStreamService();

    callback.and.callFake((status, response) => {
      expect(status).toBe(200);
      expect(response).toEqual({ ok: true });
    });

    http(
      "GET",
      "/url",
      null,
      callback,
      {},
      undefined,
      "same-origin",
      "json",
      undefined,
      streamService,
    );
    requests[0].respond(200, "OK", '{"ok":true}');
    await wait(10);

    expect(callback).toHaveBeenCalled();
    expect(streamService.readText).toHaveBeenCalled();
  });

  it("should return response body stream for stream responseType", async () => {
    const streamService = createStreamService();

    callback.and.callFake(
      (status, response, headers, statusText, transportStatus) => {
        expect(status).toBe(200);
        expect(response instanceof ReadableStream).toBe(true);
        expect(statusText).toBe("OK");
        expect(transportStatus).toBe("complete");
      },
    );

    http(
      "GET",
      "/url",
      null,
      callback,
      {},
      undefined,
      "same-origin",
      "stream",
      undefined,
      streamService,
    );
    requests[0].respond(200, "OK", "response");
    await wait(10);

    expect(callback).toHaveBeenCalled();
    expect(streamService.readText).not.toHaveBeenCalled();
  });
});

function installFakeFetch() {
  const realFetch = window.fetch;

  const requests = [];

  window.fetch = (url, init = {}) => {
    let resolve;

    let reject;

    const request = {
      url: String(url),
      init,
      method: init.method || "GET",
      headers: init.headers,
      body: init.body,
      respond(status, statusText, body = "", headers = "") {
        resolve(
          new Response(body, {
            status,
            statusText,
            headers: parseHeaderString(headers),
          }),
        );
      },
      error() {
        reject(new TypeError("network error"));
      },
      abort() {
        reject(new DOMException("The operation was aborted.", "AbortError"));
      },
    };

    requests.push(request);

    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });

    init.signal?.addEventListener("abort", () => reject(init.signal.reason));

    return promise;
  };

  return {
    requests,
    timeout(request) {
      request.init.signal.dispatchEvent(new Event("abort"));
    },
    restore() {
      window.fetch = realFetch;
    },
  };
}

function createStreamService() {
  return {
    readText: jasmine
      .createSpy("readText")
      .and.callFake((stream) => new Response(stream).text()),
    readLines: jasmine.createSpy("readLines"),
  };
}

function parseHeaderString(headers) {
  const parsed = {};

  headers.split("\n").forEach((line) => {
    const index = line.indexOf(":");

    if (index === -1) return;

    parsed[line.slice(0, index).trim()] = line.slice(index + 1).trim();
  });

  return parsed;
}
