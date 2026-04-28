import { _http } from "../../injection-tokens.ts";
import { RestProvider, RestService } from "./rest.ts";
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

describe("$rest", () => {
  describe("RestService", () => {
    let $http;

    beforeEach(() => {
      $http = jasmine.createSpy("$http");
    });

    it("requires a non-empty baseUrl", () => {
      expect(() => new RestService($http, "")).toThrowError(
        Error,
        "baseUrl required",
      );
    });

    it("builds URLs from RFC templates", () => {
      const service = new RestService($http, "/users");

      expect(service.buildUrl("/users/{id}{?q}", { id: 10, q: "a b" })).toBe(
        "/users/10?q=a%20b",
      );
      expect(service.buildUrl("/users/{id}", null)).toBe("/users/");
    });

    it("lists entities, maps them, and forwards request options", async () => {
      $http.and.resolveTo(httpResponse([{ id: 1, name: "Ada" }]));
      const service = new RestService($http, "/users{?page}", UserEntity, {
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
      const service = new RestService($http, "/users");

      await expectAsync(service.list()).toBeResolvedTo([]);
    });

    it("reads entities and preserves falsy non-null payloads", async () => {
      $http.and.resolveTo(httpResponse(0));
      const service = new RestService($http, "/users");

      await expectAsync(service.read(7)).toBeResolvedTo(0);
      expect($http).toHaveBeenCalledWith({
        method: "GET",
        url: "/users/7",
        data: null,
        params: {},
      });
    });

    it("maps read results to entity instances and returns null for nullish bodies", async () => {
      $http.and.returnValues(
        Promise.resolve(httpResponse({ id: 7, name: "Grace" })),
        Promise.resolve(httpResponse(undefined)),
      );
      const service = new RestService($http, "/users", UserEntity);

      const entity = await service.read(7);
      const missing = await service.read(8);

      expect(entity instanceof UserEntity).toBeTrue();
      expect(entity.name).toBe("Grace");
      expect(missing).toBeNull();
    });

    it("validates read, create, update, and delete arguments", async () => {
      const service = new RestService($http, "/users");

      await expectAsync(service.read(null)).toBeRejectedWithError(
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
      const service = new RestService($http, "/users", UserEntity);

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
      const service = new RestService($http, "/users");

      await expectAsync(service.create({ name: "Raw" })).toBeResolvedTo(raw);
    });

    it("updates entities and swallows request failures as null", async () => {
      $http.and.returnValues(
        Promise.resolve(httpResponse({ id: 3, name: "Updated" })),
        Promise.reject(new Error("write failed")),
      );
      const service = new RestService($http, "/users", UserEntity);

      const updated = await service.update(3, { name: "Updated" });
      const failed = await service.update(4, { name: "Nope" });

      expect(updated instanceof UserEntity).toBeTrue();
      expect(updated.name).toBe("Updated");
      expect(failed).toBeNull();
    });

    it("returns null when update succeeds with a nullish body", async () => {
      $http.and.resolveTo(httpResponse(undefined));
      const service = new RestService($http, "/users", UserEntity);

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
      const service = new RestService($http, "/users");

      await expectAsync(service.delete(1)).toBeResolvedTo(true);
      await expectAsync(service.delete(2)).toBeResolvedTo(false);
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

      await expectAsync(service.read(5)).toBeResolvedTo(raw);
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
