// @ts-nocheck
/// <reference types="jasmine" />
import { dealoc } from "../../shared/dom.ts";
import { Angular } from "../../angular.ts";
import { UrlMatcher } from "./url-matcher.ts";

describe("UrlMatcher", () => {
  let router;

  let $injector;

  let $location;

  let $stateRegistry;

  function setUrl(url) {
    $location.setUrl(decodeURIComponent(url));
  }

  function matcherParams(matcher) {
    const path = matcher._cache._path || [matcher];

    const params = [];

    path.forEach((pathMatcher) => params.push(...pathMatcher._params));

    return params;
  }

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

    $injector.invoke((_$location_, _$stateRegistry_) => {
      router = $injector.get("$$r");
      $location = _$location_;
      $stateRegistry = _$stateRegistry_;
    });
  });

  describe("provider", () => {
    it("should factory matchers with correct configuration", () => {
      router._isCaseInsensitive = false;
      expect(router._compile("/hello")._exec("/HELLO")).toBeNull();

      router._isCaseInsensitive = true;
      expect(router._compile("/hello")._exec("/HELLO")).toEqual({});

      router._isStrictMode = true;
      expect(router._compile("/hello")._exec("/hello/")).toBeNull();

      router._isStrictMode = false;
      expect(router._compile("/hello")._exec("/hello/")).toEqual({});
    });

    it("should compile UrlMatcher instances", () => {
      const matcher = router._compile("/");

      expect(matcher instanceof UrlMatcher).toBe(true);
    });
  });

  it("should match static URLs", () => {
    expect(router._compile("/hello/world")._exec("/hello/world")).toEqual({});
  });

  it("should match static case insensitive URLs", () => {
    expect(
      router
        ._compile("/hello/world", { caseInsensitive: true })
        ._exec("/heLLo/World"),
    ).toEqual({});
  });

  it("should match against the entire path", () => {
    const matcher = router._compile("/hello/world", { strict: true });

    expect(matcher._exec("/hello/world/")).toBeNull();
    expect(matcher._exec("/hello/world/suffix")).toBeNull();
  });

  it("should parse parameter placeholders", () => {
    const matcher = router._compile(
      "/users/:id/details/{type}/{repeat:[0-9]+}?from&to",
    );

    expect(matcherParams(matcher).map((x) => x.id)).toEqual([
      "id",
      "type",
      "repeat",
      "from",
      "to",
    ]);
  });

  it("should encode and decode duplicate query string values as array", () => {
    const matcher = router._compile("/?foo"),
      array = { foo: ["bar", "baz"] };

    expect(matcher._exec("/", array)).toEqual(array);
    expect(matcher._format(array)).toBe("/?foo=bar&foo=baz");
  });

  describe("snake-case parameters", () => {
    it("should match if properly formatted", () => {
      const matcher = router._compile(
        "/users/?from&to&snake-case&snake-case-triple",
      );

      expect(matcherParams(matcher).map((x) => x.id)).toEqual([
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
        router._compile("/users/?from&to&-snake");
      }).toThrowError(err);

      err =
        "Invalid parameter name 'snake-' in pattern '/users/?from&to&snake-'";
      expect(() => {
        router._compile("/users/?from&to&snake-");
      }).toThrowError(err);
    });
  });

  describe("parameters containing periods", () => {
    it("should match if properly formatted", () => {
      const matcher = router._compile(
        "/users/?from&to&with.periods&with.periods.also",
      );

      const params = matcherParams(matcher).map(function (p) {
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
        router._compile("/users/?from&to&.periods");
      }).toThrow(err);

      err = new Error(
        "Invalid parameter name 'periods.' in pattern '/users/?from&to&periods.'",
      );
      expect(() => {
        router._compile("/users/?from&to&periods.");
      }).toThrow(err);
    });
  });

  describe("._exec()", () => {
    it("should capture parameter values", () => {
      const m = router._compile(
        "/users/:id/details/{type}/{repeat:[0-9]+}?from&to",
        { strict: false },
      );

      expect(m._exec("/users/123/details//0", {})).toEqual({
        id: "123",
        type: "",
        repeat: "0",
        to: undefined,
        from: undefined,
      });
    });

    it("should capture catch-all parameters", () => {
      const m = router._compile("/document/*path");

      expect(m._exec("/document/a/b/c", {})).toEqual({ path: "a/b/c" });
      expect(m._exec("/document/", {})).toEqual({ path: "" });
    });

    it("should use the optional regexp with curly brace placeholders", () => {
      const m = router._compile(
        "/users/:id/details/{type}/{repeat:[0-9]+}?from&to",
      );

      expect(
        m._exec("/users/123/details/what/thisShouldBeDigits", {}),
      ).toBeNull();
    });

    it("should not use optional regexp for '/'", () => {
      const m = router._compile("/{language:(?:fr|en|de)}");

      expect(m._exec("/", {})).toBeNull();
    });

    it("should work with empty default value", () => {
      const m = router._compile("/foo/:str", {
        state: { params: { str: { value: "" } } },
      });

      expect(m._exec("/foo/", {})).toEqual({ str: "" });
    });

    it("should work with empty default value for regex", () => {
      const m = router._compile("/foo/{param:(?:foo|bar|)}", {
        state: { params: { param: { value: "" } } },
      });

      expect(m._exec("/foo/", {})).toEqual({ param: "" });
    });

    it("should treat the URL as already decoded and does not decode it further", () => {
      expect(router._compile("/users/:id")._exec("/users/100%25", {})).toEqual({
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
        expect(router._compile(route)._exec(url, {})).toEqual({
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
          router._compile(route)._exec(url, {});
        }).toThrowError(`Unbalanced capture group in route '${route}'`);
      });

      const shouldPass = {
        "/url/{matchedParam:[a-z]+}/child/{childParam}":
          "/url/someword/child/childParam",
        "/url/{matchedParam:[a-z]+}/child/{childParam}?foo":
          "/url/someword/child/childParam",
      };

      Object.entries(shouldPass).forEach(function ([route, url]) {
        expect(() => {
          router._compile(route)._exec(url, {});
        }).not.toThrow();
      });
    });
  });

  describe("._format()", () => {
    it("should reconstitute the URL", () => {
      const m = router._compile(
          "/users/:id/details/{type}/{repeat:[0-9]+}?from",
        ),
        params = {
          id: "123",
          type: "default",
          repeat: 444,
          ignored: "value",
          from: "1970",
        };

      expect(m._format(params)).toEqual(
        "/users/123/details/default/444?from=1970",
      );
    });

    it("should encode URL parameters", () => {
      expect(router._compile("/users/:id")._format({ id: "100%" })).toEqual(
        "/users/100%25",
      );
    });

    it("encodes URL parameters with hashes", () => {
      const m = router._compile("/users/:id#:section");

      expect(m._format({ id: "bob", section: "contact-details" })).toEqual(
        "/users/bob#contact-details",
      );
    });

    it("should trim trailing slashes when the terminal value is optional", () => {
      const config = {
          state: { params: { id: { squash: true, value: "123" } } },
        },
        m = router._compile("/users/:id", config),
        params = { id: "123" };

      expect(m._format(params)).toEqual("/users");
    });

    it("should format query parameters from parent, child, grandchild matchers", () => {
      const m = router._compile("/parent?qParent");

      const m2 = m._append(router._compile("/child?qChild"));

      const m3 = m2._append(router._compile("/grandchild?qGrandchild"));

      const params = {
        qParent: "parent",
        qChild: "child",
        qGrandchild: "grandchild",
      };

      const url =
        "/parent/child/grandchild?qParent=parent&qChild=child&qGrandchild=grandchild";

      const formatted = m3._format(params);

      expect(formatted).toBe(url);
      expect(m3._exec(url.split("?")[0], params)).toEqual(params);
    });
  });

  describe("._append()", () => {
    it("should append matchers", () => {
      const matcher = router
        ._compile("/users/:id/details/{type}?from")
        ._append(router._compile("/{repeat:[0-9]+}?to"));

      const params = matcherParams(matcher);

      expect(params.map((x) => x.id)).toEqual([
        "id",
        "type",
        "from",
        "repeat",
        "to",
      ]);
    });

    it("should return a new matcher", () => {
      const base = router._compile("/users/:id/details/{type}?from");

      const matcher = base._append(router._compile("/{repeat:[0-9]+}?to"));

      expect(matcher).not.toBe(base);
    });

    it("should respect router.strictMode", () => {
      let m = router._compile("/");

      router._isStrictMode = false;
      m = m._append(router._compile("foo"));
      expect(m._exec("/foo")).toEqual({});
      expect(m._exec("/foo/")).toEqual({});
    });

    it("should respect router.caseInsensitive", () => {
      let m = router._compile("/");

      router._isCaseInsensitive = true;
      m = m._append(router._compile("foo"));
      expect(m._exec("/foo")).toEqual({});
      expect(m._exec("/FOO")).toEqual({});
    });

    it("should respect router.caseInsensitive when validating regex params", () => {
      let m = router._compile("/");

      router._isCaseInsensitive = true;
      m = m._append(router._compile("foo/{param:bar}"));
      expect(m._exec("/FOO/BAR")).toEqual({ param: "BAR" });
    });

    it("should generate/match params in the proper order", () => {
      let m = router._compile("/foo?queryparam");

      m = m._append(router._compile("/bar/:pathparam"));
      expect(m._exec("/foo/bar/pathval", { queryparam: "queryval" })).toEqual({
        pathparam: "pathval",
        queryparam: "queryval",
      });
    });
  });

  describe("multivalue-query-parameters", () => {
    it("should handle .is() for an array of values", () => {
      const m = router._compile("/foo?{param1:int}"),
        param = m._parameter("param1");

      expect(param.type.is([1, 2, 3])).toBe(true);
      expect(param.type.is([1, "2", 3])).toBe(false);
    });

    it("should handle .equals() for two arrays of values", () => {
      const m = router._compile("/foo?{param1:int}&{param2:date}"),
        param1 = m._parameter("param1"),
        param2 = m._parameter("param2");

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
      const m = router._compile("/foo?param1");

      // empty array [] is treated like "undefined"
      expect(m._format({ param1: undefined })).toBe("/foo");
      expect(m._format({ param1: [] })).toBe("/foo");
      expect(m._format({ param1: "" })).toBe("/foo");
      expect(m._format({ param1: "1" })).toBe("/foo?param1=1");
      expect(m._format({ param1: ["1"] })).toBe("/foo?param1=1");
      expect(m._format({ param1: ["1", "2"] })).toBe("/foo?param1=1&param1=2");

      expect(m._exec("/foo")).toEqual({ param1: undefined });
      expect(m._exec("/foo", {})).toEqual({ param1: undefined });
      expect(m._exec("/foo", { param1: "" })).toEqual({ param1: undefined });
      expect(m._exec("/foo", { param1: "1" })).toEqual({ param1: "1" }); // auto unwrap single values
      expect(m._exec("/foo", { param1: ["1", "2"] })).toEqual({
        param1: ["1", "2"],
      });

      setUrl("/foo");
      expect(m._exec($location.getPath(), $location.getSearch())).toEqual({
        param1: undefined,
      });
      setUrl("/foo?param1=bar");
      expect(m._exec($location.getPath(), $location.getSearch())).toEqual({
        param1: "bar",
      }); // auto unwrap
      setUrl("/foo?param1=");
      expect(m._exec($location.getPath(), $location.getSearch())).toEqual({
        param1: undefined,
      });
      setUrl("/foo?param1=bar&param1=baz");

      if (Array.isArray($location.getSearch()))
        // conditional for angular 1.0.8
        expect(m._exec($location.getPath(), $location.getSearch())).toEqual({
          param1: ["bar", "baz"],
        });

      expect(m._format({})).toBe("/foo");
      expect(m._format({ param1: undefined })).toBe("/foo");
      expect(m._format({ param1: "" })).toBe("/foo");
      expect(m._format({ param1: "bar" })).toBe("/foo?param1=bar");
      expect(m._format({ param1: ["bar"] })).toBe("/foo?param1=bar");
      expect(m._format({ param1: ["bar", "baz"] })).toBe(
        "/foo?param1=bar&param1=baz",
      );
    });

    it("should be wrapped in an array if array: true", () => {
      const m = router._compile("/foo?param1", {
        state: { params: { param1: { array: true } } },
      });

      // empty array [] is treated like "undefined"
      expect(m._format({ param1: undefined })).toBe("/foo");
      expect(m._format({ param1: [] })).toBe("/foo");
      expect(m._format({ param1: "" })).toBe("/foo");
      expect(m._format({ param1: "1" })).toBe("/foo?param1=1");
      expect(m._format({ param1: ["1"] })).toBe("/foo?param1=1");
      expect(m._format({ param1: ["1", "2"] })).toBe("/foo?param1=1&param1=2");

      expect(m._exec("/foo")).toEqual({ param1: undefined });
      expect(m._exec("/foo", {})).toEqual({ param1: undefined });
      expect(m._exec("/foo", { param1: "" })).toEqual({ param1: undefined });
      expect(m._exec("/foo", { param1: "1" })).toEqual({ param1: ["1"] });
      expect(m._exec("/foo", { param1: ["1", "2"] })).toEqual({
        param1: ["1", "2"],
      });

      setUrl("/foo");
      expect(m._exec($location.getPath(), $location.getSearch())).toEqual({
        param1: undefined,
      });
      setUrl("/foo?param1=");
      expect(m._exec($location.getPath(), $location.getSearch())).toEqual({
        param1: undefined,
      });
      setUrl("/foo?param1=bar");
      expect(m._exec($location.getPath(), $location.getSearch())).toEqual({
        param1: ["bar"],
      });
      setUrl("/foo?param1=bar&param1=baz");

      if (Array.isArray($location.getSearch()))
        // conditional for angular 1.0.8
        expect(m._exec($location.getPath(), $location.getSearch())).toEqual({
          param1: ["bar", "baz"],
        });

      expect(m._format({})).toBe("/foo");
      expect(m._format({ param1: undefined })).toBe("/foo");
      expect(m._format({ param1: "" })).toBe("/foo");
      expect(m._format({ param1: "bar" })).toBe("/foo?param1=bar");
      expect(m._format({ param1: ["bar"] })).toBe("/foo?param1=bar");
      expect(m._format({ param1: ["bar", "baz"] })).toBe(
        "/foo?param1=bar&param1=baz",
      );
    });

    it("should be wrapped in an array if paramname looks like param[]", () => {
      const m = router._compile("/foo?param1[]");

      expect(m._exec("/foo")).toEqual({ "param1[]": undefined });

      setUrl("/foo?param1[]=bar");
      expect(m._exec($location.getPath(), $location.getSearch())).toEqual({
        "param1[]": ["bar"],
      });
      expect(m._format({ "param1[]": "bar" })).toBe("/foo?param1[]=bar");
      expect(m._format({ "param1[]": ["bar"] })).toBe("/foo?param1[]=bar");

      setUrl("/foo?param1[]=bar&param1[]=baz");

      if (Array.isArray($location.getSearch()))
        // conditional for angular 1.0.8
        expect(m._exec($location.getPath(), $location.getSearch())).toEqual({
          "param1[]": ["bar", "baz"],
        });
      expect(m._format({ "param1[]": ["bar", "baz"] })).toBe(
        "/foo?param1[]=bar&param1[]=baz",
      );
    });

    // Test for issue #2222
    it("should return default value, if query param is missing.", () => {
      const m = router._compile("/state?param1&param2&param3&param5", {
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
      const parsed = m._exec("/state");

      expect(parsed).toEqual(expected);

      // Pass again through Param.value() for normalization (like transitionTo)
      const paramDefs = matcherParams(m);

      const values = {};

      Object.entries(parsed).forEach(([key, val]) => {
        values[key] = paramDefs.find((def) => def.id === key).value(val);
      });

      expect(values).toEqual(expected);
    });

    it("should not be wrapped by ng-router into an array if array: false", () => {
      const m = router._compile("/foo?param1", {
        state: { params: { param1: { array: false } } },
      });

      expect(m._exec("/foo")).toEqual({ param1: undefined });

      setUrl("/foo?param1=bar");
      expect(m._exec($location.getPath(), $location.getSearch())).toEqual({
        param1: "bar",
      });
      expect(m._format({ param1: "bar" })).toBe("/foo?param1=bar");
      expect(m._format({ param1: ["bar"] })).toBe("/foo?param1=bar");

      setUrl("/foo?param1=bar&param1=baz");

      if (Array.isArray($location.getSearch()))
        // conditional for angular 1.0.8
        expect(m._exec($location.getPath(), $location.getSearch())).toEqual({
          param1: "bar,baz",
        }); // coerced to string
      expect(m._format({ param1: ["bar", "baz"] })).toBe(
        "/foo?param1=bar%2Cbaz",
      ); // coerced to string
    });
  });

  describe("multivalue-path-parameters", () => {
    it("should behave as a single-value by default", () => {
      const m = router._compile("/foo/:param1");

      expect(m._exec("/foo/")).toEqual({ param1: "" });

      expect(m._exec("/foo/bar")).toEqual({ param1: "bar" });
      expect(m._format({ param1: "bar" })).toBe("/foo/bar");
      expect(m._format({ param1: ["bar", "baz"] })).toBeNull();
    });

    it("should ignore array mode for path parameters", () => {
      const m = router._compile("/foo/:param1", {
        state: { params: { param1: { array: true } } },
      });

      expect(m._exec("/foo/")).toEqual({ param1: "" });
      expect(m._exec("/foo/bar")).toEqual({ param1: "bar" });
      expect(m._exec("/foo/bar-baz")).toEqual({ param1: "bar-baz" });

      expect(m._format({ param1: [] })).toBeNull();
      expect(m._format({ param1: ["bar"] })).toBeNull();
      expect(m._format({ param1: ["bar", "baz"] })).toBeNull();
    });

    it("should treat path params named with [] as single values", () => {
      const m = router._compile("/foo/:param1[]");

      expect(m._format({ "param1[]": "1" })).toBe("/foo/1");
      expect(m._format({ "param1[]": ["1"] })).toBeNull();
      expect(m._format({ "param1[]": ["1", "2"] })).toBeNull();

      expect(m._exec("/foo/")).toEqual({ "param1[]": "" });
      expect(m._exec("/foo/1")).toEqual({ "param1[]": "1" });
      expect(m._exec("/foo/1-2")).toEqual({ "param1[]": "1-2" });

      setUrl("/foo/");
      expect(m._exec($location.getPath(), $location.getSearch())).toEqual({
        "param1[]": "",
      });
      setUrl("/foo/bar");
      expect(m._exec($location.getPath(), $location.getSearch())).toEqual({
        "param1[]": "bar",
      });
      setUrl("/foo/bar-baz");
      expect(m._exec($location.getPath(), $location.getSearch())).toEqual({
        "param1[]": "bar-baz",
      });

      expect(m._format({ "param1[]": "bar" })).toBe("/foo/bar");
      expect(m._format({ "param1[]": ["bar"] })).toBeNull();
      expect(m._format({ "param1[]": ["bar", "baz"] })).toBeNull();
    });
  });
  describe("UrlMatcher parameter types", () => {
    it("compiles patterns", () => {
      const matcher = router._compile("/hello/world");

      expect(matcher instanceof UrlMatcher).toBe(true);
    });

    it("should match built-in types", () => {
      const matcher = router._compile("/{foo:int}/{flag:bool}");

      expect(matcher._exec("/1138/1")).toEqual({ foo: 1138, flag: true });
      expect(matcher._format({ foo: 5, flag: true })).toBe("/5/1");
      expect(matcher._exec("/-1138/1")).toEqual({ foo: -1138, flag: true });
      expect(matcher._format({ foo: -5, flag: true })).toBe("/-5/1");
    });

    it("should match built-in types with spaces", () => {
      const matcher = router._compile("/{foo: int}/{flag:  bool}");

      expect(matcher._exec("/1138/1")).toEqual({ foo: 1138, flag: true });
      expect(matcher._format({ foo: 5, flag: true })).toBe("/5/1");
    });

    it("should throw an error if a param type is declared twice", () => {
      expect(() => {
        router._compile("/{foo:int}", {
          state: {
            params: {
              foo: { type: "int" },
            },
          },
        });
      }).toThrowError("Param 'foo' has two type configurations.");
    });

    it("should encode and decode dates", () => {
      const matcher = router._compile("/calendar/{date:date}");

      const result = matcher._exec("/calendar/2014-03-26");

      const date = new Date(2014, 2, 26);

      expect(result.date instanceof Date).toBe(true);
      expect(result.date.toUTCString()).toEqual(date.toUTCString());
      expect(matcher._format({ date })).toBe("/calendar/2014-03-26");
    });

    it("should encode and decode arbitrary objects to json", () => {
      const matcher = router._compile("/state/{param1:json}/{param2:json}");

      const params = {
        param1: { foo: "huh", count: 3 },
        param2: { foo: "wha", count: 5 },
      };

      const json1 = '{"foo":"huh","count":3}';

      const json2 = '{"foo":"wha","count":5}';

      expect(matcher._format(params)).toBe(
        `/state/${encodeURIComponent(json1)}/${encodeURIComponent(json2)}`,
      );
      expect(matcher._exec(`/state/${json1}/${json2}`)).toEqual(params);
    });

    it("should not match invalid typed parameter values", () => {
      const matcher = router._compile("/users/{id:int}");

      expect(matcher._exec("/users/1138").id).toBe(1138);
      expect(matcher._exec("/users/alpha")).toBeNull();
      expect(matcher._format({ id: 1138 })).toBe("/users/1138");
      expect(matcher._format({ id: "alpha" })).toBeNull();
    });

    it("should automatically handle multiple search param values", () => {
      const matcher = router._compile("/foo/{fooid:int}?{bar:int}");

      setUrl("/foo/5?bar=1");
      expect(matcher._exec($location.getPath(), $location.getSearch())).toEqual(
        {
          fooid: 5,
          bar: 1,
        },
      );
      expect(matcher._format({ fooid: 5, bar: 1 })).toEqual("/foo/5?bar=1");

      setUrl("/foo/5?bar=1&bar=2&bar=3");
      expect(matcher._exec($location.getPath(), $location.getSearch())).toEqual(
        {
          fooid: 5,
          bar: [1, 2, 3],
        },
      );
      expect(matcher._format({ fooid: 5, bar: [1, 2, 3] })).toEqual(
        "/foo/5?bar=1&bar=2&bar=3",
      );
    });
  });

  describe("UrlMatcher optional parameters", () => {
    it("should match with or without values", () => {
      const matcher = router._compile("/users/{id:int}", {
        state: {
          params: { id: { value: null, squash: true } },
        },
      });

      expect(matcher._exec("/users/1138")).toEqual({ id: 1138 });
      expect(matcher._exec("/users1138")).toBeNull();
      expect(matcher._exec("/users/").id).toBeNull();
      expect(matcher._exec("/users").id).toBeNull();
    });

    it("should correctly match multiple", () => {
      const matcher = router._compile("/users/{id:int}/{state:[A-Z]+}", {
        state: {
          params: {
            id: { value: null, squash: true },
            state: { value: null, squash: true },
          },
        },
      });

      expect(matcher._exec("/users/1138")).toEqual({ id: 1138, state: null });
      expect(matcher._exec("/users/1138/NY")).toEqual({
        id: 1138,
        state: "NY",
      });
      expect(matcher._exec("/users/").id).toBeNull();
      expect(matcher._exec("/users/").state).toBeNull();
      expect(matcher._exec("/users").id).toBeNull();
      expect(matcher._exec("/users").state).toBeNull();
      expect(matcher._exec("/users/NY").state).toBe("NY");
      expect(matcher._exec("/users/NY").id).toBeNull();
    });

    it("should correctly format with or without values", () => {
      const matcher = router._compile("/users/{id:int}", {
        state: {
          params: { id: { value: null } },
        },
      });

      expect(matcher._format()).toBe("/users/");
      expect(matcher._format({ id: 1138 })).toBe("/users/1138");
    });

    it("should correctly format multiple", () => {
      const matcher = router._compile("/users/{id:int}/{state:[A-Z]+}", {
        state: {
          params: {
            id: { value: null, squash: true },
            state: { value: null, squash: true },
          },
        },
      });

      expect(matcher._format()).toBe("/users");
      expect(matcher._format({ id: 1138 })).toBe("/users/1138");
      expect(matcher._format({ state: "NY" })).toBe("/users/NY");
      expect(matcher._format({ id: 1138, state: "NY" })).toBe("/users/1138/NY");
    });

    it("should match in between static segments", () => {
      const matcher = router._compile("/users/{user:int}/photos", {
        state: {
          params: { user: { value: 5, squash: true } },
        },
      });

      expect(matcher._exec("/users/photos").user).toBe(5);
      expect(matcher._exec("/users/6/photos").user).toBe(6);
      expect(matcher._format()).toBe("/users/photos");
      expect(matcher._format({ user: 1138 })).toBe("/users/1138/photos");
    });

    it("should correctly format with an optional followed by a required parameter", () => {
      const matcher = router._compile("/home/:user/gallery/photos/:photo", {
        state: {
          params: {
            user: { value: null, squash: true },
            photo: undefined,
          },
        },
      });

      expect(matcher._format({ photo: 12 })).toBe("/home/gallery/photos/12");
      expect(matcher._format({ user: 1138, photo: 13 })).toBe(
        "/home/1138/gallery/photos/13",
      );
    });

    it("should populate defaults if not supplied in URL", () => {
      const matcher = router._compile("/users/{id:int}/{test}", {
        state: {
          params: {
            id: { value: 0, squash: true },
            test: { value: "foo", squash: true },
          },
        },
      });

      expect(matcher._exec("/users")).toEqual({ id: 0, test: "foo" });
      expect(matcher._exec("/users/2")).toEqual({ id: 2, test: "foo" });
      expect(matcher._exec("/users/bar")).toEqual({ id: 0, test: "bar" });
      expect(matcher._exec("/users/2/bar")).toEqual({ id: 2, test: "bar" });
      expect(matcher._exec("/users/bar/2")).toBeNull();
    });

    it("should populate even if the regexp requires 1 or more chars", () => {
      const matcher = router._compile(
        "/record/{appId}/{recordId:[0-9a-fA-F]{10,24}}",
        {
          state: {
            params: { appId: null, recordId: null },
          },
        },
      );

      expect(matcher._exec("/record/546a3e4dd273c60780e35df3/")).toEqual({
        appId: "546a3e4dd273c60780e35df3",
        recordId: null,
      });
    });

    it("should allow shorthand definitions", () => {
      const matcher = router._compile("/foo/:foo", {
        state: {
          params: { foo: "bar" },
        },
      });

      expect(matcher._exec("/foo/")).toEqual({ foo: "bar" });
    });

    it("should populate query params", () => {
      const defaults = { order: "name", limit: 25, page: 1 };

      const matcher = router._compile("/foo?order&{limit:int}&{page:int}", {
        state: {
          params: defaults,
        },
      });

      expect(matcher._exec("/foo")).toEqual(defaults);
    });

    it("should allow function-calculated values", () => {
      const barFn = () => "Value from bar()";

      let matcher = router._compile("/foo/:bar", {
        state: {
          params: { bar: barFn },
        },
      });

      expect(matcher._exec("/foo/").bar).toBe("Value from bar()");

      matcher = router._compile("/foo/:bar", {
        state: {
          params: { bar: { value: barFn, squash: true } },
        },
      });
      expect(matcher._exec("/foo").bar).toBe("Value from bar()");

      matcher = router._compile("/foo?bar", {
        state: {
          params: { bar: barFn },
        },
      });
      expect(matcher._exec("/foo").bar).toBe("Value from bar()");
    });

    it("should allow injectable functions", () => {
      const $stateParams = $injector.get("$stateParams");

      const matcher = router._compile("/users/{user:json}", {
        state: {
          params: {
            user: ($stateParams) => $stateParams.user,
          },
        },
      });

      const user = { name: "Bob" };

      $stateParams.user = user;
      expect(matcher._exec("/users/").user).toBe(user);
    });

    it("should match when used as prefix", () => {
      const matcher = router._compile("/{lang:[a-z]{2}}/foo", {
        state: {
          params: { lang: { value: "de", squash: true } },
        },
      });

      expect(matcher._exec("/de/foo")).toEqual({ lang: "de" });
      expect(matcher._exec("/foo")).toEqual({ lang: "de" });
    });

    describe("squash policy", () => {
      const Session = { username: "loggedinuser" };

      const getMatcher = (squash) =>
        router._compile("/user/:userid/gallery/:galleryid/photo/:photoid", {
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

        expect(matcher._exec("/user/gallery/photo/123")).toEqual(defaultParams);
        expect(matcher._exec("/user//gallery//photo/123")).toEqual(
          defaultParams,
        );
        expect(matcher._format(defaultParams)).toBe("/user/gallery/photo/123");

        const nonDefaultParams = {
          userid: "otheruser",
          galleryid: "travel",
          photoid: "987",
        };

        expect(
          matcher._exec("/user/otheruser/gallery/travel/photo/987"),
        ).toEqual(nonDefaultParams);
        expect(matcher._format(nonDefaultParams)).toBe(
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
          matcher._exec("/user/loggedinuser/gallery/favorites/photo/123"),
        ).toEqual(defaultParams);
        expect(matcher._format(defaultParams)).toBe(
          "/user/loggedinuser/gallery/favorites/photo/123",
        );

        const nonDefaultParams = {
          userid: "otheruser",
          galleryid: "travel",
          photoid: "987",
        };

        expect(
          matcher._exec("/user/otheruser/gallery/travel/photo/987"),
        ).toEqual(nonDefaultParams);
        expect(matcher._format(nonDefaultParams)).toBe(
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

        expect(matcher._exec("/user//gallery//photo/123")).toEqual(
          defaultParams,
        );
        expect(matcher._format(defaultParams)).toBe(
          "/user//gallery//photo/123",
        );

        const nonDefaultParams = {
          userid: "otheruser",
          galleryid: "travel",
          photoid: "987",
        };

        expect(
          matcher._exec("/user/otheruser/gallery/travel/photo/987"),
        ).toEqual(nonDefaultParams);
        expect(matcher._format(nonDefaultParams)).toBe(
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

        expect(matcher._exec("/user//gallery//photo/123")).toEqual(
          defaultParams,
        );
        expect(matcher._exec("/user/~/gallery/~/photo/123")).toEqual(
          defaultParams,
        );
        expect(matcher._format(defaultParams)).toBe(
          "/user/~/gallery/~/photo/123",
        );

        const nonDefaultParams = {
          userid: "otheruser",
          galleryid: "travel",
          photoid: "987",
        };

        expect(
          matcher._exec("/user/otheruser/gallery/travel/photo/987"),
        ).toEqual(nonDefaultParams);
        expect(matcher._format(nonDefaultParams)).toBe(
          "/user/otheruser/gallery/travel/photo/987",
        );
      });
    });
  });

  describe("UrlMatcher strict matching", () => {
    it("should match with or without trailing slash", () => {
      const matcher = router._compile("/users", { strict: false });

      expect(matcher._exec("/users")).toEqual({});
      expect(matcher._exec("/users/")).toEqual({});
    });

    it("should not match multiple trailing slashes", () => {
      const matcher = router._compile("/users", { strict: false });

      expect(matcher._exec("/users//")).toBeNull();
    });

    it("should match when defined with parameters", () => {
      const matcher = router._compile("/users/{name}", {
        strict: false,
        state: {
          params: {
            name: { value: null },
          },
        },
      });

      expect(matcher._exec("/users/")).toEqual({ name: null });
      expect(matcher._exec("/users/bob")).toEqual({ name: "bob" });
      expect(matcher._exec("/users/bob/")).toEqual({ name: "bob" });
      expect(matcher._exec("/users/bob//")).toBeNull();
    });
  });
});
