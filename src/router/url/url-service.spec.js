import { dealoc } from "../../shared/dom.ts";
import { Angular } from "../../angular.ts";
import { map, find } from "../../shared/common.ts";
import { UrlMatcher } from "./url-matcher.ts";

describe("UrlMatcher", () => {
  let $url;
  let $injector;
  let $location;

  beforeEach(() => {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    window.angular
      .module("defaultModule", [])
      .config(
        ($locationProvider) =>
          ($locationProvider.html5ModeConf.enabled = false),
      );
    $injector = window.angular.bootstrap(document.getElementById("app"), [
      "defaultModule",
    ]);

    $injector.invoke((_$url_, _$location_) => {
      $url = _$url_;
      $location = _$location_;
    });
  });

  describe("provider", () => {
    it("should factory matchers with correct configuration", () => {
      $url._config.caseInsensitive(false);
      expect($url.compile("/hello").exec("/HELLO")).toBeNull();

      $url._config.caseInsensitive(true);
      expect($url.compile("/hello").exec("/HELLO")).toEqual({});

      $url._config.strictMode(true);
      expect($url.compile("/hello").exec("/hello/")).toBeNull();

      $url._config.strictMode(false);
      expect($url.compile("/hello").exec("/hello/")).toEqual({});
    });

    it("should correctly validate UrlMatcher interface", () => {
      let m = $url.compile("/");
      expect($url.isMatcher(m)).toBe(true);
    });

    it("should mark router link rewriting as configured when a url rule is added", () => {
      let $router;

      $injector.invoke((_$router_) => {
        $router = _$router_;
      });

      expect($router._hasConfiguredRouting()).toBeFalse();

      $url._rules.when($url.compile("/foo"), "/bar", {});

      expect($router._hasConfiguredRouting()).toBeTrue();
    });
  });

  it("should match static URLs", () => {
    expect($url.compile("/hello/world").exec("/hello/world")).toEqual({});
  });

  it("should match static case insensitive URLs", () => {
    expect(
      $url
        .compile("/hello/world", { caseInsensitive: true })
        .exec("/heLLo/World"),
    ).toEqual({});
  });

  it("should match against the entire path", () => {
    const matcher = $url.compile("/hello/world", { strict: true });
    expect(matcher.exec("/hello/world/")).toBeNull();
    expect(matcher.exec("/hello/world/suffix")).toBeNull();
  });

  it("should parse parameter placeholders", () => {
    const matcher = $url.compile(
      "/users/:id/details/{type}/{repeat:[0-9]+}?from&to",
    );
    expect(matcher.parameters().map((x) => x.id)).toEqual([
      "id",
      "type",
      "repeat",
      "from",
      "to",
    ]);
  });

  it("should encode and decode duplicate query string values as array", () => {
    const matcher = $url.compile("/?foo"),
      array = { foo: ["bar", "baz"] };
    expect(matcher.exec("/", array)).toEqual(array);
    expect(matcher.format(array)).toBe("/?foo=bar&foo=baz");
  });

  describe("snake-case parameters", () => {
    it("should match if properly formatted", () => {
      const matcher = $url.compile(
        "/users/?from&to&snake-case&snake-case-triple",
      );
      expect(matcher.parameters().map((x) => x.id)).toEqual([
        "from",
        "to",
        "snake-case",
        "snake-case-triple",
      ]);
    });

    it("should not match if invalid", () => {
      let err =
        "Invalid parameter name '-snake' in pattern '/users/?from&to&-snake'";
      expect(() => {
        $url.compile("/users/?from&to&-snake");
      }).toThrowError(err);

      err =
        "Invalid parameter name 'snake-' in pattern '/users/?from&to&snake-'";
      expect(() => {
        $url.compile("/users/?from&to&snake-");
      }).toThrowError(err);
    });
  });

  describe("parameters containing periods", () => {
    it("should match if properly formatted", () => {
      const matcher = $url.compile(
        "/users/?from&to&with.periods&with.periods.also",
      );
      const params = matcher.parameters().map(function (p) {
        return p.id;
      });

      expect(params.sort()).toEqual([
        "from",
        "to",
        "with.periods",
        "with.periods.also",
      ]);
    });

    it("should not match if invalid", () => {
      let err = new Error(
        "Invalid parameter name '.periods' in pattern '/users/?from&to&.periods'",
      );
      expect(() => {
        $url.compile("/users/?from&to&.periods");
      }).toThrow(err);

      err = new Error(
        "Invalid parameter name 'periods.' in pattern '/users/?from&to&periods.'",
      );
      expect(() => {
        $url.compile("/users/?from&to&periods.");
      }).toThrow(err);
    });
  });

  describe(".exec()", () => {
    it("should capture parameter values", () => {
      const m = $url.compile(
        "/users/:id/details/{type}/{repeat:[0-9]+}?from&to",
        { strict: false },
      );
      expect(m.exec("/users/123/details//0", {})).toEqual({
        id: "123",
        type: "",
        repeat: "0",
        to: undefined,
        from: undefined,
      });
    });

    it("should capture catch-all parameters", () => {
      const m = $url.compile("/document/*path");
      expect(m.exec("/document/a/b/c", {})).toEqual({ path: "a/b/c" });
      expect(m.exec("/document/", {})).toEqual({ path: "" });
    });

    it("should use the optional regexp with curly brace placeholders", () => {
      const m = $url.compile(
        "/users/:id/details/{type}/{repeat:[0-9]+}?from&to",
      );
      expect(
        m.exec("/users/123/details/what/thisShouldBeDigits", {}),
      ).toBeNull();
    });

    it("should not use optional regexp for '/'", () => {
      const m = $url.compile("/{language:(?:fr|en|de)}");
      expect(m.exec("/", {})).toBeNull();
    });

    it("should work with empty default value", () => {
      const m = $url.compile("/foo/:str", {
        state: { params: { str: { value: "" } } },
      });
      expect(m.exec("/foo/", {})).toEqual({ str: "" });
    });

    it("should work with empty default value for regex", () => {
      const m = $url.compile("/foo/{param:(?:foo|bar|)}", {
        state: { params: { param: { value: "" } } },
      });
      expect(m.exec("/foo/", {})).toEqual({ param: "" });
    });

    it("should treat the URL as already decoded and does not decode it further", () => {
      expect($url.compile("/users/:id").exec("/users/100%25", {})).toEqual({
        id: "100%25",
      });
    });

    it("should allow embedded capture groups", () => {
      const shouldPass = {
        "/url/{matchedParam:(?:[a-z]+)}/child/{childParam}":
          "/url/someword/child/childParam",
        "/url/{matchedParam:(?:[a-z]+)}/child/{childParam}":
          "/url/someword/child/childParam",
      };

      Object.entries(shouldPass).forEach(function ([route, url]) {
        expect($url.compile(route).exec(url, {})).toEqual({
          childParam: "childParam",
          matchedParam: "someword",
        });
      });
    });

    it("should throw on unbalanced capture list", () => {
      const shouldThrow = {
        "/url/{matchedParam:([a-z]+)}/child/{childParam}":
          "/url/someword/child/childParam",
        "/url/{matchedParam:([a-z]+)}/child/{childParam}?foo":
          "/url/someword/child/childParam",
      };

      Object.entries(shouldThrow).forEach(function ([route, url]) {
        expect(() => {
          $url.compile(route).exec(url, {});
        }).toThrowError("Unbalanced capture group in route '" + route + "'");
      });

      const shouldPass = {
        "/url/{matchedParam:[a-z]+}/child/{childParam}":
          "/url/someword/child/childParam",
        "/url/{matchedParam:[a-z]+}/child/{childParam}?foo":
          "/url/someword/child/childParam",
      };

      Object.entries(shouldPass).forEach(function ([route, url]) {
        expect(() => {
          $url.compile(route).exec(url, {});
        }).not.toThrow();
      });
    });
  });

  describe(".format()", () => {
    it("should reconstitute the URL", () => {
      const m = $url.compile("/users/:id/details/{type}/{repeat:[0-9]+}?from"),
        params = {
          id: "123",
          type: "default",
          repeat: 444,
          ignored: "value",
          from: "1970",
        };

      expect(m.format(params)).toEqual(
        "/users/123/details/default/444?from=1970",
      );
    });

    it("should encode URL parameters", () => {
      expect($url.compile("/users/:id").format({ id: "100%" })).toEqual(
        "/users/100%25",
      );
    });

    it("encodes URL parameters with hashes", () => {
      const m = $url.compile("/users/:id#:section");
      expect(m.format({ id: "bob", section: "contact-details" })).toEqual(
        "/users/bob#contact-details",
      );
    });

    it("should trim trailing slashes when the terminal value is optional", () => {
      const config = {
          state: { params: { id: { squash: true, value: "123" } } },
        },
        m = $url.compile("/users/:id", config),
        params = { id: "123" };

      expect(m.format(params)).toEqual("/users");
    });

    it("should format query parameters from parent, child, grandchild matchers", () => {
      const m = $url.compile("/parent?qParent");
      const m2 = m.append($url.compile("/child?qChild"));
      const m3 = m2.append($url.compile("/grandchild?qGrandchild"));

      const params = {
        qParent: "parent",
        qChild: "child",
        qGrandchild: "grandchild",
      };
      const url =
        "/parent/child/grandchild?qParent=parent&qChild=child&qGrandchild=grandchild";

      const formatted = m3.format(params);
      expect(formatted).toBe(url);
      expect(m3.exec(url.split("?")[0], params)).toEqual(params);
    });
  });

  describe(".append()", () => {
    it("should append matchers", () => {
      const matcher = $url
        .compile("/users/:id/details/{type}?from")
        .append($url.compile("/{repeat:[0-9]+}?to"));
      const params = matcher.parameters();
      expect(params.map((x) => x.id)).toEqual([
        "id",
        "type",
        "from",
        "repeat",
        "to",
      ]);
    });

    it("should return a new matcher", () => {
      const base = $url.compile("/users/:id/details/{type}?from");
      const matcher = base.append($url.compile("/{repeat:[0-9]+}?to"));
      expect(matcher).not.toBe(base);
    });

    it("should respect $urlProvider.strictMode", () => {
      let m = $url.compile("/");
      $url._config.strictMode(false);
      m = m.append($url.compile("foo"));
      expect(m.exec("/foo")).toEqual({});
      expect(m.exec("/foo/")).toEqual({});
    });

    it("should respect $urlProvider.caseInsensitive", () => {
      let m = $url.compile("/");
      $url._config.caseInsensitive(true);
      m = m.append($url.compile("foo"));
      expect(m.exec("/foo")).toEqual({});
      expect(m.exec("/FOO")).toEqual({});
    });

    it("should respect $urlProvider.caseInsensitive when validating regex params", () => {
      let m = $url.compile("/");
      $url._config.caseInsensitive(true);
      m = m.append($url.compile("foo/{param:bar}"));
      expect(m.validates({ param: "BAR" })).toEqual(true);
    });

    it("should generate/match params in the proper order", () => {
      let m = $url.compile("/foo?queryparam");
      m = m.append($url.compile("/bar/:pathparam"));
      expect(m.exec("/foo/bar/pathval", { queryparam: "queryval" })).toEqual({
        pathparam: "pathval",
        queryparam: "queryval",
      });
    });
  });

  describe("multivalue-query-parameters", () => {
    it("should handle .is() for an array of values", () => {
      const m = $url.compile("/foo?{param1:int}"),
        param = m.parameter("param1");
      expect(param.type.is([1, 2, 3])).toBe(true);
      expect(param.type.is([1, "2", 3])).toBe(false);
    });

    it("should handle .equals() for two arrays of values", () => {
      const m = $url.compile("/foo?{param1:int}&{param2:date}"),
        param1 = m.parameter("param1"),
        param2 = m.parameter("param2");

      expect(param1.type.equals([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(param1.type.equals([1, 2, 3], [1, 2])).toBe(false);
      expect(
        param2.type.equals(
          [new Date(2014, 11, 15), new Date(2014, 10, 15)],
          [new Date(2014, 11, 15), new Date(2014, 10, 15)],
        ),
      ).toBe(true);
      expect(
        param2.type.equals(
          [new Date(2014, 11, 15), new Date(2014, 9, 15)],
          [new Date(2014, 11, 15), new Date(2014, 10, 15)],
        ),
      ).toBe(false);
    });

    it("should conditionally be wrapped in an array by default", () => {
      const m = $url.compile("/foo?param1");

      // empty array [] is treated like "undefined"
      expect(m.format({ param1: undefined })).toBe("/foo");
      expect(m.format({ param1: [] })).toBe("/foo");
      expect(m.format({ param1: "" })).toBe("/foo");
      expect(m.format({ param1: "1" })).toBe("/foo?param1=1");
      expect(m.format({ param1: ["1"] })).toBe("/foo?param1=1");
      expect(m.format({ param1: ["1", "2"] })).toBe("/foo?param1=1&param1=2");

      expect(m.exec("/foo")).toEqual({ param1: undefined });
      expect(m.exec("/foo", {})).toEqual({ param1: undefined });
      expect(m.exec("/foo", { param1: "" })).toEqual({ param1: undefined });
      expect(m.exec("/foo", { param1: "1" })).toEqual({ param1: "1" }); // auto unwrap single values
      expect(m.exec("/foo", { param1: ["1", "2"] })).toEqual({
        param1: ["1", "2"],
      });

      $url.url("/foo");
      expect(m.exec($url.getPath(), $url.getSearch())).toEqual({
        param1: undefined,
      });
      $url.url("/foo?param1=bar");
      expect(m.exec($url.getPath(), $url.getSearch())).toEqual({
        param1: "bar",
      }); // auto unwrap
      $url.url("/foo?param1=");
      expect(m.exec($url.getPath(), $url.getSearch())).toEqual({
        param1: undefined,
      });
      $url.url("/foo?param1=bar&param1=baz");
      if (Array.isArray($url.getSearch()))
        // conditional for angular 1.0.8
        expect(m.exec($url.getPath(), $url.getSearch())).toEqual({
          param1: ["bar", "baz"],
        });

      expect(m.format({})).toBe("/foo");
      expect(m.format({ param1: undefined })).toBe("/foo");
      expect(m.format({ param1: "" })).toBe("/foo");
      expect(m.format({ param1: "bar" })).toBe("/foo?param1=bar");
      expect(m.format({ param1: ["bar"] })).toBe("/foo?param1=bar");
      expect(m.format({ param1: ["bar", "baz"] })).toBe(
        "/foo?param1=bar&param1=baz",
      );
    });

    it("should be wrapped in an array if array: true", () => {
      const m = $url.compile("/foo?param1", {
        state: { params: { param1: { array: true } } },
      });

      // empty array [] is treated like "undefined"
      expect(m.format({ param1: undefined })).toBe("/foo");
      expect(m.format({ param1: [] })).toBe("/foo");
      expect(m.format({ param1: "" })).toBe("/foo");
      expect(m.format({ param1: "1" })).toBe("/foo?param1=1");
      expect(m.format({ param1: ["1"] })).toBe("/foo?param1=1");
      expect(m.format({ param1: ["1", "2"] })).toBe("/foo?param1=1&param1=2");

      expect(m.exec("/foo")).toEqual({ param1: undefined });
      expect(m.exec("/foo", {})).toEqual({ param1: undefined });
      expect(m.exec("/foo", { param1: "" })).toEqual({ param1: undefined });
      expect(m.exec("/foo", { param1: "1" })).toEqual({ param1: ["1"] });
      expect(m.exec("/foo", { param1: ["1", "2"] })).toEqual({
        param1: ["1", "2"],
      });

      $url.url("/foo");
      expect(m.exec($url.getPath(), $url.getSearch())).toEqual({
        param1: undefined,
      });
      $url.url("/foo?param1=");
      expect(m.exec($url.getPath(), $url.getSearch())).toEqual({
        param1: undefined,
      });
      $url.url("/foo?param1=bar");
      expect(m.exec($url.getPath(), $url.getSearch())).toEqual({
        param1: ["bar"],
      });
      $url.url("/foo?param1=bar&param1=baz");
      if (Array.isArray($url.getSearch()))
        // conditional for angular 1.0.8
        expect(m.exec($url.getPath(), $url.getSearch())).toEqual({
          param1: ["bar", "baz"],
        });

      expect(m.format({})).toBe("/foo");
      expect(m.format({ param1: undefined })).toBe("/foo");
      expect(m.format({ param1: "" })).toBe("/foo");
      expect(m.format({ param1: "bar" })).toBe("/foo?param1=bar");
      expect(m.format({ param1: ["bar"] })).toBe("/foo?param1=bar");
      expect(m.format({ param1: ["bar", "baz"] })).toBe(
        "/foo?param1=bar&param1=baz",
      );
    });

    it("should be wrapped in an array if paramname looks like param[]", () => {
      const m = $url.compile("/foo?param1[]");
      expect(m.exec("/foo")).toEqual({ "param1[]": undefined });

      $url.url("/foo?param1[]=bar");
      expect(m.exec($url.getPath(), $url.getSearch())).toEqual({
        "param1[]": ["bar"],
      });
      expect(m.format({ "param1[]": "bar" })).toBe("/foo?param1[]=bar");
      expect(m.format({ "param1[]": ["bar"] })).toBe("/foo?param1[]=bar");

      $url.url("/foo?param1[]=bar&param1[]=baz");
      if (Array.isArray($url.getSearch()))
        // conditional for angular 1.0.8
        expect(m.exec($url.getPath(), $url.getSearch())).toEqual({
          "param1[]": ["bar", "baz"],
        });
      expect(m.format({ "param1[]": ["bar", "baz"] })).toBe(
        "/foo?param1[]=bar&param1[]=baz",
      );
    });

    // Test for issue #2222
    it("should return default value, if query param is missing.", () => {
      const m = $url.compile("/state?param1&param2&param3&param5", {
        state: {
          params: {
            param1: "value1",
            param2: { array: true, value: ["value2"] },
            param3: { array: true, value: [] },
            param5: {
              array: true,
              value: () => {
                return [];
              },
            },
          },
        },
      });

      const expected = {
        param1: "value1",
        param2: ["value2"],
        param3: [],
        param5: [],
      };

      // Parse url to get Param.value()
      const parsed = m.exec("/state");
      expect(parsed).toEqual(expected);

      // Pass again through Param.value() for normalization (like transitionTo)
      const paramDefs = m.parameters();
      const values = map(parsed, function (val, key) {
        return find(paramDefs, function (def) {
          return def.id === key;
        }).value(val);
      });
      expect(values).toEqual(expected);
    });

    it("should not be wrapped by ng-router into an array if array: false", () => {
      const m = $url.compile("/foo?param1", {
        state: { params: { param1: { array: false } } },
      });
      expect(m.exec("/foo")).toEqual({ param1: undefined });

      $url.url("/foo?param1=bar");
      expect(m.exec($url.getPath(), $url.getSearch())).toEqual({
        param1: "bar",
      });
      expect(m.format({ param1: "bar" })).toBe("/foo?param1=bar");
      expect(m.format({ param1: ["bar"] })).toBe("/foo?param1=bar");

      $url.url("/foo?param1=bar&param1=baz");
      if (Array.isArray($url.getSearch()))
        // conditional for angular 1.0.8
        expect(m.exec($url.getPath(), $url.getSearch())).toEqual({
          param1: "bar,baz",
        }); // coerced to string
      expect(m.format({ param1: ["bar", "baz"] })).toBe(
        "/foo?param1=bar%2Cbaz",
      ); // coerced to string
    });
  });

  describe("multivalue-path-parameters", () => {
    it("should behave as a single-value by default", () => {
      const m = $url.compile("/foo/:param1");

      expect(m.exec("/foo/")).toEqual({ param1: "" });

      expect(m.exec("/foo/bar")).toEqual({ param1: "bar" });
      expect(m.format({ param1: "bar" })).toBe("/foo/bar");
      expect(m.format({ param1: ["bar", "baz"] })).toBe("/foo/bar%2Cbaz"); // coerced to string
    });

    it("should be split on - in url and wrapped in an array if array: true", () => {
      const m = $url.compile("/foo/:param1", {
        state: { params: { param1: { array: true } } },
      });

      expect(m.exec("/foo/")).toEqual({ param1: undefined });
      expect(m.exec("/foo/bar")).toEqual({ param1: ["bar"] });
      $url.url("/foo/bar-baz");
      expect(m.exec($location.getUrl())).toEqual({
        param1: ["bar", "baz"],
      });

      expect(m.format({ param1: [] })).toEqual("/foo/");
      expect(m.format({ param1: ["bar"] })).toEqual("/foo/bar");
      expect(m.format({ param1: ["bar", "baz"] })).toEqual("/foo/bar-baz");
    });

    it("should behave similar to multi-value query params", () => {
      const m = $url.compile("/foo/:param1[]");

      // empty array [] is treated like "undefined"
      expect(m.format({ "param1[]": undefined })).toBe("/foo/");
      expect(m.format({ "param1[]": [] })).toBe("/foo/");
      expect(m.format({ "param1[]": "" })).toBe("/foo/");
      expect(m.format({ "param1[]": "1" })).toBe("/foo/1");
      expect(m.format({ "param1[]": ["1"] })).toBe("/foo/1");
      expect(m.format({ "param1[]": ["1", "2"] })).toBe("/foo/1-2");

      expect(m.exec("/foo/")).toEqual({ "param1[]": undefined });
      expect(m.exec("/foo/1")).toEqual({ "param1[]": ["1"] });
      expect(m.exec("/foo/1-2")).toEqual({ "param1[]": ["1", "2"] });

      $url.url("/foo/");
      expect(m.exec($url.getPath(), $url.getSearch())).toEqual({
        "param1[]": undefined,
      });
      $url.url("/foo/bar");
      expect(m.exec($url.getPath(), $url.getSearch())).toEqual({
        "param1[]": ["bar"],
      });
      $url.url("/foo/bar-baz");
      expect(m.exec($url.getPath(), $url.getSearch())).toEqual({
        "param1[]": ["bar", "baz"],
      });

      expect(m.format({})).toBe("/foo/");
      expect(m.format({ "param1[]": undefined })).toBe("/foo/");
      expect(m.format({ "param1[]": "" })).toBe("/foo/");
      expect(m.format({ "param1[]": "bar" })).toBe("/foo/bar");
      expect(m.format({ "param1[]": ["bar"] })).toBe("/foo/bar");
      expect(m.format({ "param1[]": ["bar", "baz"] })).toBe("/foo/bar-baz");
    });

    it("should be split on - in url and wrapped in an array if paramname looks like param[]", () => {
      const m = $url.compile("/foo/:param1[]");

      expect(m.exec("/foo/")).toEqual({ "param1[]": undefined });
      expect(m.exec("/foo/bar")).toEqual({ "param1[]": ["bar"] });
      expect(m.exec("/foo/bar-baz")).toEqual({ "param1[]": ["bar", "baz"] });

      expect(m.format({ "param1[]": [] })).toEqual("/foo/");
      expect(m.format({ "param1[]": ["bar"] })).toEqual("/foo/bar");
      expect(m.format({ "param1[]": ["bar", "baz"] })).toEqual("/foo/bar-baz");
    });

    it("should allow path param arrays with '-' in the values", () => {
      const m = $url.compile("/foo/:param1[]");

      expect(m.exec("/foo/")).toEqual({ "param1[]": undefined });
      expect(m.exec("/foo/bar\\-")).toEqual({ "param1[]": ["bar-"] });
      expect(m.exec("/foo/bar\\--\\-baz")).toEqual({
        "param1[]": ["bar-", "-baz"],
      });

      expect(m.format({ "param1[]": [] })).toEqual("/foo/");
      expect(m.format({ "param1[]": ["bar-"] })).toEqual("/foo/bar%5C%2D");
      expect(m.format({ "param1[]": ["bar-", "-baz"] })).toEqual(
        "/foo/bar%5C%2D-%5C%2Dbaz",
      );
      expect(
        m.format({ "param1[]": ["bar-bar-bar-", "-baz-baz-baz"] }),
      ).toEqual("/foo/bar%5C%2Dbar%5C%2Dbar%5C%2D-%5C%2Dbaz%5C%2Dbaz%5C%2Dbaz");

      // check that we handle $location.url decodes correctly
      $url.url(m.format({ "param1[]": ["bar-", "-baz"] }));
      expect(m.exec($url.getPath(), $url.getSearch())).toEqual({
        "param1[]": ["bar-", "-baz"],
      });

      // check that we handle $location.url decodes correctly for multiple hyphens
      $url.url(m.format({ "param1[]": ["bar-bar-bar-", "-baz-baz-baz"] }));
      expect(m.exec($url.getPath(), $url.getSearch())).toEqual({
        "param1[]": ["bar-bar-bar-", "-baz-baz-baz"],
      });

      // check that pre-encoded values are passed correctly
      $url.url(m.format({ "param1[]": ["%2C%20%5C%2C", "-baz"] }));
      expect(m.exec($url.getPath(), $url.getSearch())).toEqual({
        "param1[]": ["%2C%20%5C%2C", "-baz"],
      });
    });
  });
  describe("UrlMatcher custom parameter types", () => {
    function bootstrapConfiguredUrl(configure) {
      const app = document.getElementById("app");

      dealoc(app);
      window.angular = new Angular();
      window.angular.module("configuredUrlModule", []).config(configure);

      const injector = window.angular.bootstrap(app, ["configuredUrlModule"]);

      return {
        injector,
        $url: injector.get("$url"),
        $router: injector.get("$router"),
      };
    }

    it("should handle arrays properly with config-time custom type definitions", () => {
      const { $url } = bootstrapConfiguredUrl(($urlConfigProvider) => {
        $urlConfigProvider.type("myType", {}, () => ({
          decode: () => ({ status: "decoded" }),
          is: (value) => typeof value === "object",
        }));
      });

      const matcher = $url.compile("/test?{foo:myType}");
      expect(matcher.exec("/test", { foo: "1" })).toEqual({
        foo: { status: "decoded" },
      });
      expect(matcher.exec("/test", { foo: ["1", "2"] })).toEqual({
        foo: [{ status: "decoded" }, { status: "decoded" }],
      });
    });

    it("should accept object definitions", () => {
      const type = { encode: () => {}, decode: () => {} };
      $url._config.type("myType1", type);
      expect($url._config.type("myType1").encode).toBe(type.encode);
    });

    it("compiles patterns", () => {
      const matcher = $url.compile("/hello/world");
      expect(matcher instanceof UrlMatcher).toBe(true);
    });

    it("recognizes matcher-shaped objects", () => {
      const custom = Object.entries(UrlMatcher.prototype).reduce(
        (acc, [name, value]) => {
          if (typeof value === "function") {
            acc[name] = () => {};
          }

          return acc;
        },
        {},
      );

      expect($url.isMatcher($url.compile("/"))).toBe(true);
      expect($url.isMatcher(custom)).toBe(true);
      expect($url.isMatcher(null)).toBe(false);
    });

    it("should reject duplicate definitions", () => {
      $url._config.type("myType2", { encode: () => {}, decode: () => {} });
      expect(() => {
        $url._config.type("myType2", {});
      }).toThrowError("A type named 'myType2' has already been defined.");
    });

    it("should accept injected function definitions", () => {
      const { $url, $router } = bootstrapConfiguredUrl(($urlConfigProvider) => {
        $urlConfigProvider.type("myType3", {}, ($router) => ({
          decode: () => $router,
        }));
      });

      expect($url._config.type("myType3").decode()).toBe($router);
    });

    it("should accept annotated function definitions", () => {
      const { $url, $router } = bootstrapConfiguredUrl(($urlConfigProvider) => {
        $urlConfigProvider.type("myAnnotatedType", {}, [
          "$router",
          function (router) {
            return {
              decode: () => router,
            };
          },
        ]);
      });

      expect($url._config.type("myAnnotatedType").decode()).toBe($router);
    });

    it("should match built-in types", () => {
      const matcher = $url.compile("/{foo:int}/{flag:bool}");
      expect(matcher.exec("/1138/1")).toEqual({ foo: 1138, flag: true });
      expect(matcher.format({ foo: 5, flag: true })).toBe("/5/1");
      expect(matcher.exec("/-1138/1")).toEqual({ foo: -1138, flag: true });
      expect(matcher.format({ foo: -5, flag: true })).toBe("/-5/1");
    });

    it("should match built-in types with spaces", () => {
      const matcher = $url.compile("/{foo: int}/{flag:  bool}");
      expect(matcher.exec("/1138/1")).toEqual({ foo: 1138, flag: true });
      expect(matcher.format({ foo: 5, flag: true })).toBe("/5/1");
    });

    it("should throw an error if a param type is declared twice", () => {
      expect(() => {
        $url.compile("/{foo:int}", {
          state: {
            params: {
              foo: { type: "int" },
            },
          },
        });
      }).toThrowError("Param 'foo' has two type configurations.");
    });

    it("should encode and decode dates", () => {
      const matcher = $url.compile("/calendar/{date:date}");
      const result = matcher.exec("/calendar/2014-03-26");
      const date = new Date(2014, 2, 26);

      expect(result.date instanceof Date).toBe(true);
      expect(result.date.toUTCString()).toEqual(date.toUTCString());
      expect(matcher.format({ date })).toBe("/calendar/2014-03-26");
    });

    it("should encode and decode arbitrary objects to json", () => {
      const matcher = $url.compile("/state/{param1:json}/{param2:json}");
      const params = {
        param1: { foo: "huh", count: 3 },
        param2: { foo: "wha", count: 5 },
      };
      const json1 = '{"foo":"huh","count":3}';
      const json2 = '{"foo":"wha","count":5}';

      expect(matcher.format(params)).toBe(
        `/state/${encodeURIComponent(json1)}/${encodeURIComponent(json2)}`,
      );
      expect(matcher.exec(`/state/${json1}/${json2}`)).toEqual(params);
    });

    it("should not match invalid typed parameter values", () => {
      const matcher = $url.compile("/users/{id:int}");

      expect(matcher.exec("/users/1138").id).toBe(1138);
      expect(matcher.exec("/users/alpha")).toBeNull();
      expect(matcher.format({ id: 1138 })).toBe("/users/1138");
      expect(matcher.format({ id: "alpha" })).toBeNull();
    });

    it("should allow custom types to handle multiple search param values manually", () => {
      $url._config.type("custArray", {
        encode: (array) => array.join("-"),
        decode: (value) => (Array.isArray(value) ? value : value.split(/-/)),
        equals: (left, right) => JSON.stringify(left) === JSON.stringify(right),
        is: Array.isArray,
      });

      const matcher = $url.compile("/foo?{bar:custArray}", {
        state: { params: { bar: { array: false } } },
      });

      $url.url("/foo?bar=fox");
      expect(matcher.exec($url.getPath(), $url.getSearch())).toEqual({
        bar: ["fox"],
      });
      expect(matcher.format({ bar: ["fox"] })).toEqual("/foo?bar=fox");

      $url.url("/foo?bar=quick-brown-fox");
      expect(matcher.exec($url.getPath(), $url.getSearch())).toEqual({
        bar: ["quick", "brown", "fox"],
      });
      expect(matcher.format({ bar: ["quick", "brown", "fox"] })).toEqual(
        "/foo?bar=quick-brown-fox",
      );
    });

    it("should automatically handle multiple search param values", () => {
      const matcher = $url.compile("/foo/{fooid:int}?{bar:int}");

      $url.url("/foo/5?bar=1");
      expect(matcher.exec($url.getPath(), $url.getSearch())).toEqual({
        fooid: 5,
        bar: 1,
      });
      expect(matcher.format({ fooid: 5, bar: 1 })).toEqual("/foo/5?bar=1");

      $url.url("/foo/5?bar=1&bar=2&bar=3");
      expect(matcher.exec($url.getPath(), $url.getSearch())).toEqual({
        fooid: 5,
        bar: [1, 2, 3],
      });
      expect(matcher.format({ fooid: 5, bar: [1, 2, 3] })).toEqual(
        "/foo/5?bar=1&bar=2&bar=3",
      );
    });
  });

  describe("UrlMatcher optional parameters", () => {
    it("should match with or without values", () => {
      const matcher = $url.compile("/users/{id:int}", {
        state: {
          params: { id: { value: null, squash: true } },
        },
      });
      expect(matcher.exec("/users/1138")).toEqual({ id: 1138 });
      expect(matcher.exec("/users1138")).toBeNull();
      expect(matcher.exec("/users/").id).toBeNull();
      expect(matcher.exec("/users").id).toBeNull();
    });

    it("should correctly match multiple", () => {
      const matcher = $url.compile("/users/{id:int}/{state:[A-Z]+}", {
        state: {
          params: {
            id: { value: null, squash: true },
            state: { value: null, squash: true },
          },
        },
      });
      expect(matcher.exec("/users/1138")).toEqual({ id: 1138, state: null });
      expect(matcher.exec("/users/1138/NY")).toEqual({ id: 1138, state: "NY" });
      expect(matcher.exec("/users/").id).toBeNull();
      expect(matcher.exec("/users/").state).toBeNull();
      expect(matcher.exec("/users").id).toBeNull();
      expect(matcher.exec("/users").state).toBeNull();
      expect(matcher.exec("/users/NY").state).toBe("NY");
      expect(matcher.exec("/users/NY").id).toBeNull();
    });

    it("should correctly format with or without values", () => {
      const matcher = $url.compile("/users/{id:int}", {
        state: {
          params: { id: { value: null } },
        },
      });
      expect(matcher.format()).toBe("/users/");
      expect(matcher.format({ id: 1138 })).toBe("/users/1138");
    });

    it("should correctly format multiple", () => {
      const matcher = $url.compile("/users/{id:int}/{state:[A-Z]+}", {
        state: {
          params: {
            id: { value: null, squash: true },
            state: { value: null, squash: true },
          },
        },
      });

      expect(matcher.format()).toBe("/users");
      expect(matcher.format({ id: 1138 })).toBe("/users/1138");
      expect(matcher.format({ state: "NY" })).toBe("/users/NY");
      expect(matcher.format({ id: 1138, state: "NY" })).toBe("/users/1138/NY");
    });

    it("should match in between static segments", () => {
      const matcher = $url.compile("/users/{user:int}/photos", {
        state: {
          params: { user: { value: 5, squash: true } },
        },
      });
      expect(matcher.exec("/users/photos").user).toBe(5);
      expect(matcher.exec("/users/6/photos").user).toBe(6);
      expect(matcher.format()).toBe("/users/photos");
      expect(matcher.format({ user: 1138 })).toBe("/users/1138/photos");
    });

    it("should correctly format with an optional followed by a required parameter", () => {
      const matcher = $url.compile("/home/:user/gallery/photos/:photo", {
        state: {
          params: {
            user: { value: null, squash: true },
            photo: undefined,
          },
        },
      });
      expect(matcher.format({ photo: 12 })).toBe("/home/gallery/photos/12");
      expect(matcher.format({ user: 1138, photo: 13 })).toBe(
        "/home/1138/gallery/photos/13",
      );
    });

    it("should populate defaults if not supplied in URL", () => {
      const matcher = $url.compile("/users/{id:int}/{test}", {
        state: {
          params: {
            id: { value: 0, squash: true },
            test: { value: "foo", squash: true },
          },
        },
      });
      expect(matcher.exec("/users")).toEqual({ id: 0, test: "foo" });
      expect(matcher.exec("/users/2")).toEqual({ id: 2, test: "foo" });
      expect(matcher.exec("/users/bar")).toEqual({ id: 0, test: "bar" });
      expect(matcher.exec("/users/2/bar")).toEqual({ id: 2, test: "bar" });
      expect(matcher.exec("/users/bar/2")).toBeNull();
    });

    it("should populate even if the regexp requires 1 or more chars", () => {
      const matcher = $url.compile(
        "/record/{appId}/{recordId:[0-9a-fA-F]{10,24}}",
        {
          state: {
            params: { appId: null, recordId: null },
          },
        },
      );
      expect(matcher.exec("/record/546a3e4dd273c60780e35df3/")).toEqual({
        appId: "546a3e4dd273c60780e35df3",
        recordId: null,
      });
    });

    it("should allow shorthand definitions", () => {
      const matcher = $url.compile("/foo/:foo", {
        state: {
          params: { foo: "bar" },
        },
      });
      expect(matcher.exec("/foo/")).toEqual({ foo: "bar" });
    });

    it("should populate query params", () => {
      const defaults = { order: "name", limit: 25, page: 1 };
      const matcher = $url.compile("/foo?order&{limit:int}&{page:int}", {
        state: {
          params: defaults,
        },
      });
      expect(matcher.exec("/foo")).toEqual(defaults);
    });

    it("should allow function-calculated values", () => {
      const barFn = () => "Value from bar()";

      let matcher = $url.compile("/foo/:bar", {
        state: {
          params: { bar: barFn },
        },
      });
      expect(matcher.exec("/foo/").bar).toBe("Value from bar()");

      matcher = $url.compile("/foo/:bar", {
        state: {
          params: { bar: { value: barFn, squash: true } },
        },
      });
      expect(matcher.exec("/foo").bar).toBe("Value from bar()");

      matcher = $url.compile("/foo?bar", {
        state: {
          params: { bar: barFn },
        },
      });
      expect(matcher.exec("/foo").bar).toBe("Value from bar()");
    });

    it("should allow injectable functions", () => {
      const router = $injector.get("$router");
      const matcher = $url.compile("/users/{user:json}", {
        state: {
          params: {
            user: ($router) => $router.params.user,
          },
        },
      });
      const user = { name: "Bob" };

      router.params.user = user;
      expect(matcher.exec("/users/").user).toBe(user);
    });

    it("should match when used as prefix", () => {
      const matcher = $url.compile("/{lang:[a-z]{2}}/foo", {
        state: {
          params: { lang: { value: "de", squash: true } },
        },
      });
      expect(matcher.exec("/de/foo")).toEqual({ lang: "de" });
      expect(matcher.exec("/foo")).toEqual({ lang: "de" });
    });

    describe("squash policy", () => {
      const Session = { username: "loggedinuser" };
      const getMatcher = (squash) =>
        $url.compile("/user/:userid/gallery/:galleryid/photo/:photoid", {
          state: {
            params: {
              userid: {
                squash,
                value: () => Session.username,
              },
              galleryid: { squash, value: "favorites" },
            },
          },
        });

      it(": true should squash the default value and one slash", () => {
        const matcher = getMatcher(true);
        const defaultParams = {
          userid: "loggedinuser",
          galleryid: "favorites",
          photoid: "123",
        };
        expect(matcher.exec("/user/gallery/photo/123")).toEqual(defaultParams);
        expect(matcher.exec("/user//gallery//photo/123")).toEqual(
          defaultParams,
        );
        expect(matcher.format(defaultParams)).toBe("/user/gallery/photo/123");

        const nonDefaultParams = {
          userid: "otheruser",
          galleryid: "travel",
          photoid: "987",
        };
        expect(
          matcher.exec("/user/otheruser/gallery/travel/photo/987"),
        ).toEqual(nonDefaultParams);
        expect(matcher.format(nonDefaultParams)).toBe(
          "/user/otheruser/gallery/travel/photo/987",
        );
      });

      it(": false should not squash default values", () => {
        const matcher = getMatcher(false);
        const defaultParams = {
          userid: "loggedinuser",
          galleryid: "favorites",
          photoid: "123",
        };
        expect(
          matcher.exec("/user/loggedinuser/gallery/favorites/photo/123"),
        ).toEqual(defaultParams);
        expect(matcher.format(defaultParams)).toBe(
          "/user/loggedinuser/gallery/favorites/photo/123",
        );

        const nonDefaultParams = {
          userid: "otheruser",
          galleryid: "travel",
          photoid: "987",
        };
        expect(
          matcher.exec("/user/otheruser/gallery/travel/photo/987"),
        ).toEqual(nonDefaultParams);
        expect(matcher.format(nonDefaultParams)).toBe(
          "/user/otheruser/gallery/travel/photo/987",
        );
      });

      it(": '' should squash the default value to an empty string", () => {
        const matcher = getMatcher("");
        const defaultParams = {
          userid: "loggedinuser",
          galleryid: "favorites",
          photoid: "123",
        };
        expect(matcher.exec("/user//gallery//photo/123")).toEqual(
          defaultParams,
        );
        expect(matcher.format(defaultParams)).toBe("/user//gallery//photo/123");

        const nonDefaultParams = {
          userid: "otheruser",
          galleryid: "travel",
          photoid: "987",
        };
        expect(
          matcher.exec("/user/otheruser/gallery/travel/photo/987"),
        ).toEqual(nonDefaultParams);
        expect(matcher.format(nonDefaultParams)).toBe(
          "/user/otheruser/gallery/travel/photo/987",
        );
      });

      it(": '~' should squash the default value and replace it with '~'", () => {
        const matcher = getMatcher("~");
        const defaultParams = {
          userid: "loggedinuser",
          galleryid: "favorites",
          photoid: "123",
        };
        expect(matcher.exec("/user//gallery//photo/123")).toEqual(
          defaultParams,
        );
        expect(matcher.exec("/user/~/gallery/~/photo/123")).toEqual(
          defaultParams,
        );
        expect(matcher.format(defaultParams)).toBe(
          "/user/~/gallery/~/photo/123",
        );

        const nonDefaultParams = {
          userid: "otheruser",
          galleryid: "travel",
          photoid: "987",
        };
        expect(
          matcher.exec("/user/otheruser/gallery/travel/photo/987"),
        ).toEqual(nonDefaultParams);
        expect(matcher.format(nonDefaultParams)).toBe(
          "/user/otheruser/gallery/travel/photo/987",
        );
      });
    });
  });

  describe("UrlMatcher strict matching", () => {
    it("should match with or without trailing slash", () => {
      const matcher = $url.compile("/users", { strict: false });
      expect(matcher.exec("/users")).toEqual({});
      expect(matcher.exec("/users/")).toEqual({});
    });

    it("should not match multiple trailing slashes", () => {
      const matcher = $url.compile("/users", { strict: false });
      expect(matcher.exec("/users//")).toBeNull();
    });

    it("should match when defined with parameters", () => {
      const matcher = $url.compile("/users/{name}", {
        strict: false,
        state: {
          params: {
            name: { value: null },
          },
        },
      });
      expect(matcher.exec("/users/")).toEqual({ name: null });
      expect(matcher.exec("/users/bob")).toEqual({ name: "bob" });
      expect(matcher.exec("/users/bob/")).toEqual({ name: "bob" });
      expect(matcher.exec("/users/bob//")).toBeNull();
    });
  });
});
