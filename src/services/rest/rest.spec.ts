// @ts-nocheck
/// <reference types="jasmine" />
import { _http } from "../../injection-tokens.ts";
import {
  CachedRestBackend,
  createRestCacheKey,
  HttpRestBackend,
  RestProvider,
  RestService,
} from "./rest.ts";
import { expandExpression, expandUriTemplate, pctEncode } from "./rfc.ts";

function httpResponse(data, overrides = {}) {
  return {
    data,
    status: 200,
    headers: () => ({}),
    config: {},
    statusText: "OK",
    xhrStatus: "complete",
    ...overrides,
  };
}

class UserEntity {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.mapped = true;
  }
}

function restService($http, baseUrl, entityClass, options) {
  return new RestService(
    new HttpRestBackend($http),
    baseUrl,
    entityClass,
    options,
  );
}

class TestRestCacheStore {
  constructor() {
    this.cache = new Map();
  }

  async get(key) {
    return this.cache.get(key);
  }

  async set(key, response) {
    this.cache.set(key, response);
  }

  async delete(key) {
    this.cache.delete(key);
  }

  async deletePrefix(prefix) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }
}

describe("$rest", () => {
  describe("RestService", () => {
    let $http;

    beforeEach(() => {
      $http = jasmine.createSpy("$http");
    });

    it("requires a non-empty baseUrl", () => {
      expect(() => restService($http, "")).toThrowError(
        Error,
        "baseUrl required",
      );
    });

    it("builds URLs from RFC templates", () => {
      const service = restService($http, "/users");

      expect(service.buildUrl("/users/{id}{?q}", { id: 10, q: "a b" })).toBe(
        "/users/10?q=a%20b",
      );
      expect(service.buildUrl("/users/{id}", null)).toBe("/users/");
    });

    it("lists entities, maps them, and forwards request options", async () => {
      $http.and.resolveTo(httpResponse([{ id: 1, name: "Ada" }]));
      const service = restService($http, "/users{?page}", UserEntity, {
        headers: { Accept: "application/json" },
        timeout: 25,
      });

      const items = await service.list({ page: 2 });

      expect(items.length).toBe(1);
      expect(items[0] instanceof UserEntity).toBeTrue();
      expect(items[0]).toEqual(
        jasmine.objectContaining({ id: 1, mapped: true }),
      );
      expect($http).toHaveBeenCalledWith({
        method: "GET",
        url: "/users?page=2",
        data: null,
        params: { page: 2 },
        headers: { Accept: "application/json" },
        timeout: 25,
      });
    });

    it("returns an empty list when the backend payload is not an array", async () => {
      $http.and.resolveTo(httpResponse({ items: [] }));
      const service = restService($http, "/users");

      await expectAsync(service.list()).toBeResolvedTo([]);
    });

    it("gets entities and preserves falsy non-null payloads", async () => {
      $http.and.resolveTo(httpResponse(0));
      const service = restService($http, "/users");

      await expectAsync(service.get(7)).toBeResolvedTo(0);
      expect($http).toHaveBeenCalledWith({
        method: "GET",
        url: "/users/7",
        data: null,
        params: {},
      });
    });

    it("maps get results to entity instances and returns null for nullish bodies", async () => {
      $http.and.returnValues(
        Promise.resolve(httpResponse({ id: 7, name: "Grace" })),
        Promise.resolve(httpResponse(undefined)),
      );
      const service = restService($http, "/users", UserEntity);

      const entity = await service.get(7);

      const missing = await service.get(8);

      expect(entity instanceof UserEntity).toBeTrue();
      expect(entity.name).toBe("Grace");
      expect(missing).toBeNull();
    });

    it("validates get, create, update, and delete arguments", async () => {
      const service = restService($http, "/users");

      await expectAsync(service.get(null)).toBeRejectedWithError(
        Error,
        "badarg:id null",
      );
      await expectAsync(service.create(null)).toBeRejectedWithError(
        Error,
        "badarg:item null",
      );
      await expectAsync(service.update(undefined, {})).toBeRejectedWithError(
        Error,
        "badarg:id undefined",
      );
      await expectAsync(service.delete(undefined)).toBeRejectedWithError(
        Error,
        "badarg:id undefined",
      );
    });

    it("creates entities and returns mapped data", async () => {
      $http.and.resolveTo(httpResponse({ id: 3, name: "Lin" }));
      const service = restService($http, "/users", UserEntity);

      const created = await service.create({ name: "Lin" });

      expect(created instanceof UserEntity).toBeTrue();
      expect($http).toHaveBeenCalledWith({
        method: "POST",
        url: "/users",
        data: { name: "Lin" },
        params: {},
      });
    });

    it("returns raw truthy payloads when no entity class is configured", async () => {
      const raw = { id: 9, name: "Raw" };

      $http.and.resolveTo(httpResponse(raw));
      const service = restService($http, "/users");

      await expectAsync(service.create({ name: "Raw" })).toBeResolvedTo(raw);
    });

    it("updates entities and swallows request failures as null", async () => {
      $http.and.returnValues(
        Promise.resolve(httpResponse({ id: 3, name: "Updated" })),
        Promise.reject(new Error("write failed")),
      );
      const service = restService($http, "/users", UserEntity);

      const updated = await service.update(3, { name: "Updated" });

      const failed = await service.update(4, { name: "Nope" });

      expect(updated instanceof UserEntity).toBeTrue();
      expect(updated.name).toBe("Updated");
      expect(failed).toBeNull();
    });

    it("returns null when update succeeds with a nullish body", async () => {
      $http.and.resolveTo(httpResponse(undefined));
      const service = restService($http, "/users", UserEntity);

      await expectAsync(service.update(3, { name: "Updated" })).toBeResolvedTo(
        null,
      );
    });

    it("deletes entities and converts failures to false", async () => {
      $http.and.returnValues(
        Promise.resolve(
          httpResponse(null, { status: 204, statusText: "No Content" }),
        ),
        Promise.reject(new Error("delete failed")),
      );
      const service = restService($http, "/users");

      await expectAsync(service.delete(1)).toBeResolvedTo(true);
      await expectAsync(service.delete(2)).toBeResolvedTo(false);
    });

    it("sends normalized REST request metadata to custom backends", async () => {
      const backend = {
        request: jasmine
          .createSpy("backend")
          .and.returnValues(
            Promise.resolve({ data: [{ id: 1, name: "Ada" }] }),
            Promise.resolve({ data: { id: 2, name: "Grace" } }),
            Promise.resolve({ data: { id: 3, name: "Lin" } }),
            Promise.resolve({ data: { id: 4, name: "Updated" } }),
            Promise.resolve({ data: null }),
          ),
      };

      const options = { headers: { Accept: "application/json" } };

      const service = new RestService(backend, "/users", UserEntity, options);

      await expectAsync(service.list({ page: 2 })).toBeResolvedTo([
        jasmine.objectContaining({ id: 1, mapped: true }),
      ]);
      await expectAsync(service.get(2, { include: "roles" })).toBeResolvedTo(
        jasmine.objectContaining({ id: 2, mapped: true }),
      );
      await expectAsync(service.create({ name: "Lin" })).toBeResolvedTo(
        jasmine.objectContaining({ id: 3, mapped: true }),
      );
      await expectAsync(service.update(4, { name: "Updated" })).toBeResolvedTo(
        jasmine.objectContaining({ id: 4, mapped: true }),
      );
      await expectAsync(service.delete(5)).toBeResolvedTo(true);

      expect(backend.request.calls.allArgs()).toEqual([
        [
          {
            method: "GET",
            url: "/users",
            data: null,
            params: { page: 2 },
            collectionUrl: "/users",
            id: undefined,
            options,
          },
        ],
        [
          {
            method: "GET",
            url: "/users/2",
            data: null,
            params: { include: "roles" },
            collectionUrl: "/users",
            id: 2,
            options,
          },
        ],
        [
          {
            method: "POST",
            url: "/users",
            data: { name: "Lin" },
            params: {},
            collectionUrl: "/users",
            id: undefined,
            options,
          },
        ],
        [
          {
            method: "PUT",
            url: "/users/4",
            data: { name: "Updated" },
            params: {},
            collectionUrl: "/users",
            id: 4,
            options,
          },
        ],
        [
          {
            method: "DELETE",
            url: "/users/5",
            data: null,
            params: {},
            collectionUrl: "/users",
            id: 5,
            options,
          },
        ],
      ]);
    });
  });

  describe("HttpRestBackend", () => {
    it("forwards REST requests through $http", async () => {
      const $http = jasmine
        .createSpy("$http")
        .and.resolveTo(httpResponse({ id: 1 }));

      const backend = new HttpRestBackend($http, { timeout: 25 });

      await backend.request({
        method: "GET",
        url: "/users/1",
        params: { include: "roles" },
        options: { headers: { Accept: "application/json" } },
      });

      expect($http).toHaveBeenCalledWith({
        method: "GET",
        url: "/users/1",
        data: null,
        params: { include: "roles" },
        timeout: 25,
        headers: { Accept: "application/json" },
      });
    });

    it("lets per-request options override backend defaults", async () => {
      const $http = jasmine
        .createSpy("$http")
        .and.resolveTo(httpResponse(null));

      const backend = new HttpRestBackend($http, {
        headers: { Accept: "text/plain" },
        timeout: 25,
      });

      await backend.request({
        method: "POST",
        url: "/users",
        data: { name: "Ada" },
        options: {
          headers: { Accept: "application/json" },
          timeout: 50,
        },
      });

      expect($http).toHaveBeenCalledWith({
        method: "POST",
        url: "/users",
        data: { name: "Ada" },
        params: {},
        headers: { Accept: "application/json" },
        timeout: 50,
      });
    });
  });

  describe("RestCacheStore fixtures", () => {
    it("gets, deletes, and deletes by prefix", async () => {
      const cache = new TestRestCacheStore();

      await cache.set("GET /users\n{}", httpResponse([{ id: 1 }]));
      await cache.set("GET /users/1\n{}", httpResponse({ id: 1 }));
      await cache.set("GET /posts\n{}", httpResponse([{ id: 2 }]));

      await expectAsync(cache.get("GET /users\n{}")).toBeResolvedTo(
        jasmine.objectContaining({ data: [{ id: 1 }] }),
      );

      await cache.delete("GET /users/1\n{}");
      await expectAsync(cache.get("GET /users/1\n{}")).toBeResolvedTo(
        undefined,
      );

      await cache.deletePrefix("GET /users");
      await expectAsync(cache.get("GET /users\n{}")).toBeResolvedTo(undefined);
      await expectAsync(cache.get("GET /posts\n{}")).toBeResolvedTo(
        jasmine.objectContaining({ data: [{ id: 2 }] }),
      );
    });
  });

  describe("CachedRestBackend", () => {
    function request(overrides = {}) {
      return {
        method: "GET",
        url: "/users/7",
        collectionUrl: "/users",
        params: {},
        ...overrides,
      };
    }

    it("uses deterministic cache keys with sorted params", () => {
      expect(
        createRestCacheKey(
          request({
            params: {
              b: 2,
              a: { z: true, y: [undefined, null, "x"] },
            },
          }),
        ),
      ).toEqual(
        createRestCacheKey(
          request({
            params: {
              a: { y: [undefined, null, "x"], z: true },
              b: 2,
            },
          }),
        ),
      );
    });

    it("fetches and caches cache-first misses", async () => {
      const cache = new TestRestCacheStore();

      const network = {
        request: jasmine
          .createSpy("network")
          .and.resolveTo(httpResponse({ id: 7 })),
      };

      const backend = new CachedRestBackend({
        network,
        cache,
        strategy: "cache-first",
      });

      const restRequest = request();

      const key = createRestCacheKey(restRequest);

      await expectAsync(backend.request(restRequest)).toBeResolvedTo(
        jasmine.objectContaining({
          data: { id: 7 },
          source: "network",
        }),
      );
      expect(network.request).toHaveBeenCalledOnceWith(restRequest);
      await expectAsync(cache.get(key)).toBeResolvedTo(
        jasmine.objectContaining({
          data: { id: 7 },
          source: "network",
        }),
      );
    });

    it("serves cache-first reads without hitting the network", async () => {
      const cache = new TestRestCacheStore();

      const network = { request: jasmine.createSpy("network") };

      const backend = new CachedRestBackend({
        network,
        cache,
        strategy: "cache-first",
      });

      const restRequest = request();

      await cache.set(createRestCacheKey(restRequest), httpResponse({ id: 7 }));

      await expectAsync(backend.request(restRequest)).toBeResolvedTo(
        jasmine.objectContaining({
          data: { id: 7 },
          source: "cache",
        }),
      );
      expect(network.request).not.toHaveBeenCalled();
    });

    it("stores successful network-first reads", async () => {
      const cache = new TestRestCacheStore();

      const network = {
        request: jasmine
          .createSpy("network")
          .and.resolveTo(httpResponse({ id: 7 })),
      };

      const backend = new CachedRestBackend({
        network,
        cache,
        strategy: "network-first",
      });

      const restRequest = request();

      const key = createRestCacheKey(restRequest);

      await expectAsync(backend.request(restRequest)).toBeResolvedTo(
        jasmine.objectContaining({
          data: { id: 7 },
          source: "network",
        }),
      );
      await expectAsync(cache.get(key)).toBeResolvedTo(
        jasmine.objectContaining({ data: { id: 7 }, source: "network" }),
      );
    });

    it("rejects network-first reads when network and cache both miss", async () => {
      const cache = new TestRestCacheStore();

      const error = new Error("offline");

      const network = {
        request: jasmine.createSpy("network").and.rejectWith(error),
      };

      const backend = new CachedRestBackend({
        network,
        cache,
        strategy: "network-first",
      });

      await expectAsync(backend.request(request())).toBeRejectedWith(error);
    });

    it("falls back to stale cache for network-first reads", async () => {
      const cache = new TestRestCacheStore();

      const network = {
        request: jasmine
          .createSpy("network")
          .and.rejectWith(new Error("offline")),
      };

      const backend = new CachedRestBackend({
        network,
        cache,
        strategy: "network-first",
      });

      const restRequest = request();

      await cache.set(createRestCacheKey(restRequest), httpResponse({ id: 7 }));

      await expectAsync(backend.request(restRequest)).toBeResolvedTo(
        jasmine.objectContaining({
          data: { id: 7 },
          source: "cache",
          stale: true,
        }),
      );
    });

    it("fetches and caches stale-while-revalidate misses", async () => {
      const cache = new TestRestCacheStore();

      const onRevalidate = jasmine.createSpy("onRevalidate");

      const network = {
        request: jasmine
          .createSpy("network")
          .and.resolveTo(httpResponse({ id: 7 })),
      };

      const backend = new CachedRestBackend({
        network,
        cache,
        strategy: "stale-while-revalidate",
        onRevalidate,
      });

      const restRequest = request();

      const key = createRestCacheKey(restRequest);

      await expectAsync(backend.request(restRequest)).toBeResolvedTo(
        jasmine.objectContaining({
          data: { id: 7 },
          source: "network",
        }),
      );
      expect(onRevalidate).not.toHaveBeenCalled();
      await expectAsync(cache.get(key)).toBeResolvedTo(
        jasmine.objectContaining({
          data: { id: 7 },
          source: "network",
        }),
      );
    });

    it("returns stale-while-revalidate cache and refreshes in the background", async () => {
      const cache = new TestRestCacheStore();

      const onRevalidate = jasmine.createSpy("onRevalidate");

      const network = {
        request: jasmine
          .createSpy("network")
          .and.resolveTo(httpResponse({ id: 7, name: "Fresh" })),
      };

      const backend = new CachedRestBackend({
        network,
        cache,
        strategy: "stale-while-revalidate",
        onRevalidate,
      });

      const restRequest = request();

      const key = createRestCacheKey(restRequest);

      await cache.set(key, httpResponse({ id: 7, name: "Cached" }));

      await expectAsync(backend.request(restRequest)).toBeResolvedTo(
        jasmine.objectContaining({
          data: { id: 7, name: "Cached" },
          source: "cache",
          stale: true,
        }),
      );

      await Promise.resolve();
      await Promise.resolve();

      expect(onRevalidate).toHaveBeenCalledWith(
        jasmine.objectContaining({
          key,
          request: restRequest,
          response: jasmine.objectContaining({
            data: { id: 7, name: "Fresh" },
            source: "network",
          }),
        }),
      );
      await expectAsync(cache.get(key)).toBeResolvedTo(
        jasmine.objectContaining({
          data: { id: 7, name: "Fresh" },
          source: "network",
        }),
      );
    });

    it("swallows stale-while-revalidate background refresh failures", async () => {
      const cache = new TestRestCacheStore();

      const onRevalidate = jasmine.createSpy("onRevalidate");

      const network = {
        request: jasmine
          .createSpy("network")
          .and.rejectWith(new Error("offline")),
      };

      const backend = new CachedRestBackend({
        network,
        cache,
        strategy: "stale-while-revalidate",
        onRevalidate,
      });

      const restRequest = request();

      const key = createRestCacheKey(restRequest);

      await cache.set(key, httpResponse({ id: 7, name: "Cached" }));

      await expectAsync(backend.request(restRequest)).toBeResolvedTo(
        jasmine.objectContaining({
          data: { id: 7, name: "Cached" },
          source: "cache",
          stale: true,
        }),
      );

      await Promise.resolve();
      await Promise.resolve();

      expect(onRevalidate).not.toHaveBeenCalled();
      await expectAsync(cache.get(key)).toBeResolvedTo(
        jasmine.objectContaining({
          data: { id: 7, name: "Cached" },
        }),
      );
    });

    it("invalidates collection and entity cache entries after writes", async () => {
      const cache = new TestRestCacheStore();

      const network = {
        request: jasmine
          .createSpy("network")
          .and.resolveTo(httpResponse({ id: 7 })),
      };

      const backend = new CachedRestBackend({
        network,
        cache,
        strategy: "cache-first",
      });

      const listRequest = request({ url: "/users" });

      const entityRequest = request();

      const listKey = createRestCacheKey(listRequest);

      const entityKey = createRestCacheKey(entityRequest);

      await cache.set(listKey, httpResponse([{ id: 7 }]));
      await cache.set(entityKey, httpResponse({ id: 7 }));

      await backend.request({
        method: "PUT",
        url: "/users/7",
        collectionUrl: "/users",
        data: { name: "Updated" },
        params: {},
      });

      await expectAsync(cache.get(listKey)).toBeResolvedTo(undefined);
      await expectAsync(cache.get(entityKey)).toBeResolvedTo(undefined);
    });

    it("does not invalidate cached reads when writes fail", async () => {
      const cache = new TestRestCacheStore();

      const network = {
        request: jasmine
          .createSpy("network")
          .and.rejectWith(new Error("write failed")),
      };

      const backend = new CachedRestBackend({
        network,
        cache,
        strategy: "cache-first",
      });

      const entityRequest = request();

      const entityKey = createRestCacheKey(entityRequest);

      await cache.set(entityKey, httpResponse({ id: 7 }));

      await expectAsync(
        backend.request({
          method: "DELETE",
          url: "/users/7",
          collectionUrl: "/users",
          params: {},
        }),
      ).toBeRejectedWithError("write failed");
      await expectAsync(cache.get(entityKey)).toBeResolvedTo(
        jasmine.objectContaining({ data: { id: 7 } }),
      );
    });
  });

  describe("RestProvider", () => {
    it("exposes the expected injection token and factory", async () => {
      const provider = new RestProvider();

      const $http = jasmine.createSpy("$http").and.resolveTo(httpResponse([]));

      provider.rest("users", "/users{?page}", UserEntity, { cache: true });

      expect(provider.$get[0]).toBe(_http);

      const factory = provider.$get[1]($http);

      const service = factory("/admins", UserEntity, { timeout: 10 });

      expect(typeof factory).toBe("function");
      expect(service instanceof RestService).toBeTrue();
      await expectAsync(service.list({ page: 1 })).toBeResolvedTo([]);
    });

    it("supports provider and factory defaults when entityClass and options are omitted", async () => {
      const provider = new RestProvider();

      const raw = { id: 5, title: "Post" };

      const $http = jasmine.createSpy("$http").and.resolveTo(httpResponse(raw));

      provider.rest("posts", "/posts");

      const factory = provider.$get[1]($http);

      const service = factory("/posts");

      await expectAsync(service.get(5)).toBeResolvedTo(raw);
    });

    it("uses an options backend instead of the default HTTP backend", async () => {
      const provider = new RestProvider();

      const $http = jasmine.createSpy("$http");

      const backend = {
        request: jasmine.createSpy("backend").and.resolveTo(httpResponse([])),
      };

      const factory = provider.$get[1]($http);

      const service = factory("/admins", UserEntity, {
        backend,
        timeout: 10,
      });

      await expectAsync(service.list()).toBeResolvedTo([]);
      expect(backend.request).toHaveBeenCalledWith(
        jasmine.objectContaining({
          method: "GET",
          url: "/admins",
          options: { timeout: 10 },
        }),
      );
      expect($http).not.toHaveBeenCalled();
    });
  });
});

describe("RFC 6570 helpers", () => {
  describe("pctEncode", () => {
    it("encodes reserved characters by default and can preserve them", () => {
      expect(pctEncode("a/b?c", false)).toBe("a%2Fb%3Fc");
      expect(pctEncode("a/b?c", true)).toBe("a/b?c");
    });
  });

  describe("expandUriTemplate", () => {
    it("throws when the template is not a string", () => {
      expect(() => expandUriTemplate(123)).toThrowError(
        TypeError,
        "template must be a string",
      );
    });

    it("expands simple, query, path, fragment, and reserved expressions", () => {
      expect(expandUriTemplate("/users/{id}", { id: 10 })).toBe("/users/10");
      expect(
        expandUriTemplate("/search{?q,lang}", { q: "a b", lang: "en" }),
      ).toBe("/search?q=a%20b&lang=en");
      expect(expandUriTemplate("{/segments*}", { segments: ["a", "b"] })).toBe(
        "/a/b",
      );
      expect(expandUriTemplate("{#path}", { path: "/docs" })).toBe("#/docs");
      expect(expandUriTemplate("{+path}", { path: "/docs?q=1" })).toBe(
        "/docs?q=1",
      );
    });
  });

  describe("expandExpression", () => {
    it("returns an empty string when nothing can be expanded", () => {
      expect(expandExpression("id", {})).toBe("");
      expect(expandExpression("?id", { id: null })).toBe("");
    });

    it("supports explode and prefix modifiers for scalars and arrays", () => {
      expect(expandExpression("name:3", { name: "angular" })).toBe("ang");
      expect(expandExpression("list", { list: ["red", "blue"] })).toBe(
        "red,blue",
      );
      expect(expandExpression("?list", { list: ["red", "blue"] })).toBe(
        "?list=red,blue",
      );
      expect(expandExpression("?list*", { list: ["red", null, "blue"] })).toBe(
        "?list=red&list=blue",
      );
      expect(expandExpression(";list", { list: [] })).toBe(";list");
      expect(expandExpression("?list", { list: [] })).toBe("?list=");
      expect(expandExpression("?list", { list: [null, undefined] })).toBe(
        "?list=",
      );
      expect(expandExpression(";list", { list: [null] })).toBe(";list");
    });

    it("supports object values with exploded and non-exploded forms", () => {
      expect(expandExpression("coords", { coords: { lat: 10, lng: 20 } })).toBe(
        "lat,10,lng,20",
      );
      expect(
        expandExpression("?coords", { coords: { lat: 10, lng: 20 } }),
      ).toBe("?coords=lat,10,lng,20");
      expect(
        expandExpression("?coords*", { coords: { lat: 10, lng: 20 } }),
      ).toBe("?lat=10&lng=20");
      expect(
        expandExpression("coords*", { coords: { lat: 10, lng: 20 } }),
      ).toBe("lat=10,lng=20");
      expect(expandExpression("?coords", { coords: {} })).toBe("?coords=");
      expect(expandExpression(";coords", { coords: {} })).toBe(";coords");
      expect(
        expandExpression("?coords*", { coords: { lat: null, lng: 20 } }),
      ).toBe("?lng=20");
    });

    it("handles empty-string values for named and unnamed operators", () => {
      expect(expandExpression("?name", { name: "" })).toBe("?name=");
      expect(expandExpression(";name", { name: "" })).toBe(";name");
      expect(expandExpression("name", { name: "" })).toBe("");
      expect(expandExpression("+name", { name: "" })).toBe("");
    });

    it("supports dot and ampersand operators", () => {
      expect(expandExpression(".ext", { ext: "json" })).toBe(".json");
      expect(expandExpression("&page", { page: 2 })).toBe("&page=2");
    });

    it("rejects invalid varspec syntax", () => {
      expect(() =>
        expandExpression("user-name", { "user-name": 1 }),
      ).toThrowError(Error, "Invalid varspec: user-name");
    });
  });
});
