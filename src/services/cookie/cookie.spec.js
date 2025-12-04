import { Angular } from "../../angular.js";
import { CookieProvider, CookieService } from "./cookie.js";

describe("$cookie service", () => {
  let $injector, $cookie, el, cookieProvider;

  beforeEach(() => {
    el = document.createElement("div");
    document.body.appendChild(el);
    clearCookies();
    const angular = new Angular();
    angular.module("default", []).config(($cookieProvider) => {
      cookieProvider = $cookieProvider;
    });

    // bootstrap the module that already provides $cookie
    $injector = angular.bootstrap(el, ["default"]);
    $cookie = $injector.get("$cookie");
  });

  afterEach(() => {
    clearCookies();
    el.remove();
  });

  // --------------------------- Tests ---------------------------
  it("should be defined", () => {
    expect($cookie).toBeDefined();
    expect($cookie instanceof CookieService).toBeTrue();
  });

  it("is available for configuration during config phase", () => {
    expect(cookieProvider).toBeDefined();
    expect(cookieProvider instanceof CookieProvider).toBeTrue();
  });

  it("should set and get a raw cookie", () => {
    $cookie.put("foo", "bar");
    expect($cookie.get("foo")).toBe("bar");
  });

  it("should remove a cookie", () => {
    $cookie.put("temp", "123");
    $cookie.remove("temp");
    expect($cookie.get("temp")).toBeNull();
  });

  it("should store and retrieve objects via putObject/getObject", () => {
    const obj = { id: 1, name: "Alice" };
    $cookie.putObject("user", obj);
    expect($cookie.getObject("user")).toEqual(obj);
  });

  it("should throw SyntaxError for invalid JSON in getObject", () => {
    document.cookie = "broken={unclosed";
    expect(() => $cookie.getObject("broken")).toThrowError(
      SyntaxError,
      /^badparse: "broken" =>/,
    );
  });

  it("getAll should return all cookies as an object", () => {
    $cookie.put("x", "10");
    $cookie.put("y", "20");
    const all = $cookie.getAll();
    expect(all.x).toBe("10");
    expect(all.y).toBe("20");
  });

  it("should maintain multiple cookies independently", () => {
    $cookie.put("a", "1");
    $cookie.put("b", "2");
    expect($cookie.get("a")).toBe("1");
    expect($cookie.get("b")).toBe("2");
  });

  it("should merge user options with defaults safely", () => {
    // Only use options that work locally
    const opts = { path: "/src/services/cookie/cookie.html", samesite: "Lax" };

    expect(() => $cookie.put("optTest", "v", opts)).not.toThrow();
    expect($cookie.get("optTest")).toBe("v"); // Should succeed
  });

  it("should round-trip putObject/getObject correctly", () => {
    const obj = { foo: "bar", num: 42 };
    $cookie.putObject("objTest", obj);
    expect($cookie.getObject("objTest")).toEqual(obj);
  });

  it("should remove a cookie with options applied without error", () => {
    $cookie.put("removeTest", "val", { path: "/" });
    expect($cookie.get("removeTest")).toBe("val");
    expect(() => $cookie.remove("removeTest", { path: "/" })).not.toThrow();
    expect($cookie.get("removeTest")).toBeNull();
  });

  it("should handle multiple putObject and getObject independently", () => {
    $cookie.putObject("o1", { a: 1 });
    $cookie.putObject("o2", { b: 2 });
    expect($cookie.getObject("o1")).toEqual({ a: 1 });
    expect($cookie.getObject("o2")).toEqual({ b: 2 });
  });

  it("should handle setting and removing multiple cookies reliably", () => {
    $cookie.put("c1", "v1");
    $cookie.put("c2", "v2");
    $cookie.remove("c1");
    expect($cookie.get("c1")).toBeNull();
    expect($cookie.get("c2")).toBe("v2");
  });

  it("should throw TypeError if expires is invalid type", () => {
    const invalidValues = [
      true,
      {},
      [],
      () => {
        /* empty */
      },
      Symbol(),
    ];
    invalidValues.forEach((val) => {
      expect(() => $cookie.put("badExp", "x", { expires: val })).toThrowError(
        TypeError,
        /^badarg:expires/,
      );
    });
  });

  it("should throw TypeError if expires is an invalid date", () => {
    expect(() =>
      $cookie.put("badDate", "x", { expires: "invalid-date" }),
    ).toThrowError(TypeError, /^badarg:expires/);
  });

  it("should accept a valid Date object in expires", () => {
    const exp = new Date(Date.now() + 1000 * 60); // 1 minute in future
    expect(() => $cookie.put("goodDate", "v", { expires: exp })).not.toThrow();
    expect($cookie.get("goodDate")).toBe("v");
  });

  it("should accept a valid date string in expires", () => {
    const exp = new Date(Date.now() + 1000 * 60).toUTCString();
    expect(() =>
      $cookie.put("goodString", "v", { expires: exp }),
    ).not.toThrow();
    expect($cookie.get("goodString")).toBe("v");
  });

  function clearCookies() {
    const cookies = document.cookie.split(";").map((c) => c.trim());
    cookies.forEach((c) => {
      const eq = c.indexOf("=");
      if (eq > -1) {
        const key = decodeURIComponent(c.substring(0, eq));

        // Delete at root path
        document.cookie = `${key}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;

        // Delete at current path
        document.cookie = `${key}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${location.pathname}`;

        // Optionally, delete at multiple levels of parent paths
        const pathParts = location.pathname.split("/").filter(Boolean);
        let pathAcc = "";
        pathParts.forEach((part) => {
          pathAcc += "/" + part;
          document.cookie = `${key}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${pathAcc}`;
        });
      }
    });
  }
});
