import {
  decodePath,
  encodePath,
  normalizePath,
  Location,
  LocationProvider,
  parseAppUrl,
  stripBaseUrl,
  stripHash,
  stripFile,
  serverBase,
  urlsEqual,
} from "./location.js";
import { Angular } from "../../angular.js";
import { createInjector } from "../../core/di/injector.js";

describe("$location", () => {
  let module;
  beforeEach(() => {
    window.angular = new Angular();
    module = window.angular.module("test1", ["ng"]);
  });

  // function initService(options) {
  //   module.config(($provide, $locationProvider) => {
  //     $locationProvider.setHtml5Mode(options.html5Mode);
  //     $locationProvider.hashPrefix(options.hashPrefix);
  //     $provide.value("$sniffer", { history: options.supportHistory });
  //   });
  // }

  describe("defaults", () => {
    it('should have hashPrefix of "!"', () => {
      let provider = new LocationProvider();
      expect(provider.hashPrefixConf).toBe("!");
    });

    it("should default to html5 mode with no base and rewrite links", () => {
      let provider = new LocationProvider();
      expect(provider.html5ModeConf.enabled).toBeTrue();
      expect(provider.html5ModeConf.requireBase).toBeFalse();
      expect(provider.html5ModeConf.rewriteLinks).toBeTrue();
    });
  });

  describe("File Protocol", () => {
    let urlParsingNodePlaceholder;
    let urlParsingNode;

    beforeEach(() => {
      urlParsingNodePlaceholder = urlParsingNode;

      // temporarily overriding the DOM element
      // with output from IE, if not in IE
      urlParsingNode = {
        hash: "#/C:/",
        host: "",
        hostname: "",
        href: "file:///C:/base#!/C:/foo",
        pathname: "/C:/foo",
        port: "",
        protocol: "file:",
        search: "",
        setAttribute: () => {
          /* empty */
        },
      };
    });

    afterEach(() => {
      urlParsingNode = urlParsingNodePlaceholder;
    });

    it("should not include the drive name in path() on WIN", () => {
      // See issue #4680 for details
      const locationUrl = new Location("file:///base", "file:///", false, "#!");
      locationUrl.parse("file:///base#!/foo?a=b&c#hash");

      expect(locationUrl.getPath()).toBe("/foo");
    });

    it("should include the drive name if it was provided in the input url", () => {
      const locationUrl = new Location("file:///base", "file:///", false, "#!");
      locationUrl.parse("file:///base#!/C:/foo?a=b&c#hash");

      expect(locationUrl.getPath()).toBe("/C:/foo");
    });
  });

  describe("NewUrl", () => {
    function createLocationHtml5Url() {
      const locationUrl = new Location(
        "http://www.domain.com:9877/",
        "http://www.domain.com:9877/",
        true,
      );
      locationUrl.parse(
        "http://www.domain.com:9877/path/b?search=a&b=c&d#hash",
      );
      return locationUrl;
    }

    it("should provide common getters", () => {
      const locationUrl = createLocationHtml5Url();
      expect(locationUrl.absUrl).toBe(
        "http://www.domain.com:9877/path/b?search=a&b=c&d#hash",
      );
      expect(locationUrl.getPath()).toBe("/path/b");
      expect(locationUrl.getSearch()).toEqual({ search: "a", b: "c", d: true });
      expect(locationUrl.getHash()).toBe("hash");
      expect(locationUrl.getUrl()).toBe("/path/b?search=a&b=c&d#hash");
    });

    it("path() should change path", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.setPath("/new/path");
      expect(locationUrl.getPath()).toBe("/new/path");
      expect(locationUrl.absUrl).toBe(
        "http://www.domain.com:9877/new/path?search=a&b=c&d#hash",
      );
    });

    it("path() should not break on numeric values", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.setPath(1);
      expect(locationUrl.getPath()).toBe("/1");
      expect(locationUrl.absUrl).toBe(
        "http://www.domain.com:9877/1?search=a&b=c&d#hash",
      );
    });

    it("path() should allow using 0 as path", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.setPath(0);
      expect(locationUrl.getPath()).toBe("/0");
      expect(locationUrl.absUrl).toBe(
        "http://www.domain.com:9877/0?search=a&b=c&d#hash",
      );
    });

    it("path() should set to empty path on null value", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.setPath("/foo");
      expect(locationUrl.getPath()).toBe("/foo");
      locationUrl.setPath(null);
      expect(locationUrl.getPath()).toBe("/");
    });

    it("search() should accept string", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.setSearch("x=y&c");
      expect(locationUrl.getSearch()).toEqual({ x: "y", c: true });
      expect(locationUrl.absUrl).toBe(
        "http://www.domain.com:9877/path/b?x=y&c#hash",
      );
    });

    it("search() should accept object", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.setSearch({ one: 1, two: true });
      expect(locationUrl.getSearch()).toEqual({ one: 1, two: true });
      expect(locationUrl.absUrl).toBe(
        "http://www.domain.com:9877/path/b?one=1&two#hash",
      );
    });

    it("search() should copy object", () => {
      const locationUrl = createLocationHtml5Url();
      const obj = { one: 1, two: true, three: null };
      locationUrl.setSearch(obj);
      expect(obj).toEqual({ one: 1, two: true, three: null });
      obj.one = "changed";
      expect(locationUrl.getSearch()).toEqual({ one: 1, two: true });
      expect(locationUrl.absUrl).toBe(
        "http://www.domain.com:9877/path/b?one=1&two#hash",
      );
    });

    it("search() should change single parameter", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.setSearch({ id: "old", preserved: true });
      locationUrl.setSearch("id", "new");

      expect(locationUrl.getSearch()).toEqual({ id: "new", preserved: true });
    });

    it("search() should remove single parameter", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.setSearch({ id: "old", preserved: true });
      locationUrl.setSearch("id", null);

      expect(locationUrl.getSearch()).toEqual({ preserved: true });
    });

    it("search() should remove multiple parameters", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.setSearch({ one: 1, two: true });
      expect(locationUrl.getSearch()).toEqual({ one: 1, two: true });
      locationUrl.setSearch({ one: null, two: null });
      expect(locationUrl.getSearch()).toEqual({});
      expect(locationUrl.absUrl).toBe("http://www.domain.com:9877/path/b#hash");
    });

    it("search() should accept numeric keys", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.setSearch({ 1: "one", 2: "two" });
      expect(locationUrl.getSearch()).toEqual({ 1: "one", 2: "two" });
      expect(locationUrl.absUrl).toBe(
        "http://www.domain.com:9877/path/b?1=one&2=two#hash",
      );
    });

    it("search() should handle multiple value", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.setSearch("a&b");
      expect(locationUrl.getSearch()).toEqual({ a: true, b: true });

      locationUrl.setSearch("a", null);

      expect(locationUrl.getSearch()).toEqual({ b: true });

      locationUrl.setSearch("b", undefined);
      expect(locationUrl.getSearch()).toEqual({});
    });

    it("search() should handle single value", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.setSearch("ignore");
      expect(locationUrl.getSearch()).toEqual({ ignore: true });
      locationUrl.setSearch(1);
      expect(locationUrl.getSearch()).toEqual({ 1: true });
    });

    it("search() should throw error an incorrect argument", () => {
      const locationUrl = createLocationHtml5Url();
      expect(() => {
        locationUrl.setSearch(null);
      }).toThrowError(/isrcharg/);
      expect(() => {
        locationUrl.setSearch(undefined);
      }).toThrowError(/isrcharg/);
    });

    it("hash() should change hash fragment", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.setHash("new-hash");
      expect(locationUrl.getHash()).toBe("new-hash");
      expect(locationUrl.absUrl).toBe(
        "http://www.domain.com:9877/path/b?search=a&b=c&d#new-hash",
      );
    });

    it("hash() should accept numeric parameter", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.setHash(5);
      expect(locationUrl.getHash()).toBe("5");
      expect(locationUrl.absUrl).toBe(
        "http://www.domain.com:9877/path/b?search=a&b=c&d#5",
      );
    });

    it("hash() should allow using 0", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.setHash(0);
      expect(locationUrl.getHash()).toBe("0");
      expect(locationUrl.absUrl).toBe(
        "http://www.domain.com:9877/path/b?search=a&b=c&d#0",
      );
    });

    it("hash() should accept null parameter", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.setHash(null);
      expect(locationUrl.getHash()).toBe("");
      expect(locationUrl.absUrl).toBe(
        "http://www.domain.com:9877/path/b?search=a&b=c&d",
      );
    });

    it("url getter/setter should change the path, search and hash", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.setUrl("/some/path?a=b&c=d#hhh");
      expect(locationUrl.getUrl()).toBe("/some/path?a=b&c=d#hhh");
      expect(locationUrl.absUrl).toBe(
        "http://www.domain.com:9877/some/path?a=b&c=d#hhh",
      );
      expect(locationUrl.getPath()).toBe("/some/path");
      expect(locationUrl.getSearch()).toEqual({ a: "b", c: "d" });
      expect(locationUrl.getHash()).toBe("hhh");
    });

    it("url getter/setter should change only hash when no search and path specified", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.setUrl("#some-hash");

      expect(locationUrl.getHash()).toBe("some-hash");
      expect(locationUrl.getUrl()).toBe("/path/b?search=a&b=c&d#some-hash");
      expect(locationUrl.absUrl).toBe(
        "http://www.domain.com:9877/path/b?search=a&b=c&d#some-hash",
      );
    });

    it("setUrl() should change only search and hash when no path specified", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.setUrl("?a=b");

      expect(locationUrl.getSearch()).toEqual({ a: "b" });
      expect(locationUrl.getHash()).toBe("");
      expect(locationUrl.getPath()).toBe("/path/b");
    });

    it("setUrl() should reset search and hash when only path specified", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.setUrl("/new/path");

      expect(locationUrl.getPath()).toBe("/new/path");
      expect(locationUrl.getSearch()).toEqual({});
      expect(locationUrl.getHash()).toBe("");
    });

    it("setUrl() should change path when empty string specified", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.setUrl("");

      expect(locationUrl.getPath()).toBe("/");
      expect(locationUrl.getSearch()).toEqual({});
      expect(locationUrl.getHash()).toBe("");
    });

    it("should parse new url", () => {
      let locationUrl = new Location("http://host.com/", "http://host.com/");
      locationUrl.parse("http://host.com/base");
      expect(locationUrl.getPath()).toBe("/base");

      locationUrl = new Location("http://host.com/", "http://host.com/", true);
      locationUrl.parse("http://host.com/base#");
      expect(locationUrl.getPath()).toBe("/base");
    });

    it("should prefix path with forward-slash", () => {
      const locationUrl = new Location(
        "http://server/",
        "http://server/",
        true,
      );
      locationUrl.setPath("b");

      expect(locationUrl.getPath()).toBe("/b");
      expect(locationUrl.absUrl).toBe("http://server/b");
    });

    it("should set path to forward-slash when empty", () => {
      const locationUrl = new Location(
        "http://server/",
        "http://server/",
        true,
      );
      locationUrl.parse("http://server/");
      expect(locationUrl.getPath()).toBe("/");
      expect(locationUrl.absUrl).toBe("http://server/");
    });

    it("setters should return Url object to allow chaining", () => {
      const locationUrl = createLocationHtml5Url();
      expect(locationUrl.setPath("/any")).toBe(locationUrl);
      expect(locationUrl.setSearch("")).toBe(locationUrl);
      expect(locationUrl.setHash("aaa")).toBe(locationUrl);
      expect(locationUrl.setUrl("/some")).toBe(locationUrl);
    });

    it("should not preserve old properties when parsing new url", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.parse("http://www.domain.com:9877/a");

      expect(locationUrl.getPath()).toBe("/a");
      expect(locationUrl.getSearch()).toEqual({});
      expect(locationUrl.getHash()).toBe("");
      expect(locationUrl.absUrl).toBe("http://www.domain.com:9877/a");
    });

    // it("should not rewrite when hashbang url is not given", () => {
    //   initService({ html5Mode: true, hashPrefix: "!", supportHistory: true });
    //   initBrowser({ url: "http://domain.com/base/a/b", basePath: "/base" });
    //   expect($browser.getUrl()).toBe("http://domain.com/base/a/b");
    // });

    it("should prepend path with basePath", () => {
      const locationUrl = new Location(
        "http://server/base/",
        "http://server/base/",
        true,
      );
      locationUrl.parse("http://server/base/abc?a");
      expect(locationUrl.getPath()).toBe("/abc");
      expect(locationUrl.getSearch()).toEqual({ a: true });

      locationUrl.setPath("/new/path");
      expect(locationUrl.absUrl).toBe("http://server/base/new/path?a");
    });

    it("should throw error when invalid server url given", () => {
      const locationUrl = new Location(
        "http://server.org/base/abc",
        "http://server.org/base/",
        true,
      );

      expect(() => {
        locationUrl.parse("http://other.server.org/path#/path");
      }).toThrowError(/ipthprfx/);
    });

    it("should throw error when invalid base url given", () => {
      const locationUrl = new Location(
        "http://server.org/base/abc",
        "http://server.org/base/",
        true,
      );

      expect(() => {
        locationUrl.parse("http://server.org/path#/path");
      }).toThrowError(/ipthprfx/);
    });

    describe("state", () => {
      it("should set _stateand return itself", () => {
        const locationUrl = createLocationHtml5Url();
        expect(locationUrl._state).toEqual(undefined);

        const returned = locationUrl.setState({ a: 2 });
        expect(locationUrl._state).toEqual({ a: 2 });
        expect(returned).toBe(locationUrl);
      });

      it("should set state", () => {
        const locationUrl = createLocationHtml5Url();
        locationUrl.setState({ a: 2 });
        expect(locationUrl.getState()).toEqual({ a: 2 });
      });

      it("should allow to set both URL and state", () => {
        const locationUrl = createLocationHtml5Url();
        locationUrl.setUrl("/foo").setState({ a: 2 });
        expect(locationUrl.getUrl()).toEqual("/foo");
        expect(locationUrl.getState()).toEqual({ a: 2 });
      });

      it("should allow to mix state and various URL functions", () => {
        const locationUrl = createLocationHtml5Url();
        locationUrl
          .setPath("/foo")
          .setHash("abcd")
          .setState({ a: 2 })
          .setSearch("bar", "baz");

        expect(locationUrl.getPath()).toEqual("/foo");
        expect(locationUrl.getState()).toEqual({ a: 2 });
        expect(locationUrl.getSearch() && locationUrl.getSearch().bar).toBe(
          "baz",
        );
        expect(locationUrl.getHash()).toEqual("abcd");
      });
    });

    describe("encoding", () => {
      it("should encode special characters", () => {
        const locationUrl = createLocationHtml5Url();
        locationUrl.setPath("/a <>#");
        locationUrl.setSearch({ "i j": "<>#" });
        locationUrl.setHash("<>#");

        expect(locationUrl.getPath()).toBe("/a <>#");
        expect(locationUrl.getSearch()).toEqual({ "i j": "<>#" });
        expect(locationUrl.getHash()).toBe("<>#");
        expect(locationUrl.absUrl).toBe(
          "http://www.domain.com:9877/a%20%3C%3E%23?i%20j=%3C%3E%23#%3C%3E%23",
        );
      });

      it("should not encode !$:@", () => {
        const locationUrl = createLocationHtml5Url();
        locationUrl.setPath("/!$:@");
        locationUrl.setSearch("");
        locationUrl.setHash("!$:@");

        expect(locationUrl.absUrl).toBe("http://www.domain.com:9877/!$:@#!$:@");
      });

      it("should decode special characters", () => {
        const locationUrl = new Location(
          "http://host.com/",
          "http://host.com/",
          true,
        );
        locationUrl.parse(
          "http://host.com/a%20%3C%3E%23?i%20j=%3C%3E%23#x%20%3C%3E%23",
        );
        expect(locationUrl.getPath()).toBe("/a <>#");
        expect(locationUrl.getSearch()).toEqual({ "i j": "<>#" });
        expect(locationUrl.getHash()).toBe("x <>#");
      });

      it("should not decode encoded forward slashes in the path", () => {
        const locationUrl = new Location(
          "http://host.com/base/",
          "http://host.com/base/",
          true,
        );
        locationUrl.parse("http://host.com/base/a/ng2;path=%2Fsome%2Fpath");
        expect(locationUrl.getPath()).toBe("/a/ng2;path=%2Fsome%2Fpath");
        expect(locationUrl.getSearch()).toEqual({});
        expect(locationUrl.getHash()).toBe("");
        expect(locationUrl.getUrl()).toBe("/a/ng2;path=%2Fsome%2Fpath");
        expect(locationUrl.absUrl).toBe(
          "http://host.com/base/a/ng2;path=%2Fsome%2Fpath",
        );
      });

      it("should decode pluses as spaces in urls", () => {
        const locationUrl = new Location(
          "http://host.com/",
          "http://host.com/",
          true,
        );
        locationUrl.parse("http://host.com/?a+b=c+d");
        expect(locationUrl.getSearch()).toEqual({ "a b": "c d" });
      });

      it("should retain pluses when setting search queries", () => {
        const locationUrl = createLocationHtml5Url();
        locationUrl.setSearch({ "a+b": "c+d" });
        expect(locationUrl.getSearch()).toEqual({ "a+b": "c+d" });
      });

      fit("should not drop encodings on already enconded params", () => {
        const locationUrl = createLocationHtml5Url();
        locationUrl.setUrl("/path/foo%2Fbar/baz%2Fqux");
        expect(locationUrl.getPath()).toEqual("/path/foo%2Fbar/baz%2Fqux");
      });
    });
  });

  describe("HashbangUrl", () => {
    function createHashbangUrl() {
      const locationUrl = new Location(
        "http://www.server.org:1234/base",
        "http://www.server.org:1234/",
        false,
        "#!",
      );
      locationUrl.parse("http://www.server.org:1234/base#!/path?a=b&c#hash");
      return locationUrl;
    }

    it("should parse hashbang url into path and search", () => {
      const locationUrl = createHashbangUrl();
      expect(locationUrl.getPath()).toBe("/path");
      expect(locationUrl.getSearch()).toEqual({ a: "b", c: true });
      expect(locationUrl.getHash()).toBe("hash");
    });

    it("absUrl should return hashbang url", () => {
      const locationUrl = createHashbangUrl();
      expect(locationUrl.absUrl).toBe(
        "http://www.server.org:1234/base#!/path?a=b&c#hash",
      );

      locationUrl.setPath("/new/path");
      locationUrl.setSearch({ one: 1 });
      locationUrl.setHash("hhh");
      expect(locationUrl.absUrl).toBe(
        "http://www.server.org:1234/base#!/new/path?one=1#hhh",
      );
    });

    it("should preserve query params in base", () => {
      const locationUrl = new Location(
        "http://www.server.org:1234/base?base=param",
        "http://www.server.org:1234/",
        false,
        "#",
      );
      locationUrl.parse(
        "http://www.server.org:1234/base?base=param#/path?a=b&c#hash",
      );
      expect(locationUrl.absUrl).toBe(
        "http://www.server.org:1234/base?base=param#/path?a=b&c#hash",
      );

      locationUrl.setPath("/new/path");
      locationUrl.setSearch({ one: 1 });
      locationUrl.setHash("hhh");
      expect(locationUrl.absUrl).toBe(
        "http://www.server.org:1234/base?base=param#/new/path?one=1#hhh",
      );
    });

    it("should prefix path with forward-slash", () => {
      const locationUrl = new Location(
        "http://host.com/base",
        "http://host.com/",
        false,
        "#",
      );
      locationUrl.parse("http://host.com/base#path");
      expect(locationUrl.getPath()).toBe("/path");
      expect(locationUrl.absUrl).toBe("http://host.com/base#/path");

      locationUrl.setPath("wrong");
      expect(locationUrl.getPath()).toBe("/wrong");
      expect(locationUrl.absUrl).toBe("http://host.com/base#/wrong");
    });

    it("should set path to forward-slash when empty", () => {
      const locationUrl = new Location(
        "http://server/base",
        "http://server/",
        false,
        "#!",
      );
      locationUrl.parse("http://server/base");
      locationUrl.setPath("aaa");

      expect(locationUrl.getPath()).toBe("/aaa");
      expect(locationUrl.absUrl).toBe("http://server/base#!/aaa");
    });

    it("should not preserve old properties when parsing new url", () => {
      const locationUrl = createHashbangUrl();
      locationUrl.parse("http://www.server.org:1234/base#!/");

      expect(locationUrl.getPath()).toBe("/");
      expect(locationUrl.getSearch()).toEqual({});
      expect(locationUrl.getHash()).toBe("");
      expect(locationUrl.absUrl).toBe("http://www.server.org:1234/base#!/");
    });

    it("should insert default hashbang if a hash is given with no hashbang prefix", () => {
      const locationUrl = createHashbangUrl();

      locationUrl.parse("http://www.server.org:1234/base#/path");
      expect(locationUrl.absUrl).toBe(
        "http://www.server.org:1234/base#!#%2Fpath",
      );
      expect(locationUrl.getHash()).toBe("/path");
      expect(locationUrl.getPath()).toBe("");

      locationUrl.parse("http://www.server.org:1234/base#");
      expect(locationUrl.absUrl).toBe("http://www.server.org:1234/base");
      expect(locationUrl.getHash()).toBe("");
      expect(locationUrl.getPath()).toBe("");
    });

    it("should ignore extra path segments if no hashbang is given", () => {
      const locationUrl = createHashbangUrl();
      locationUrl.parse("http://www.server.org:1234/base/extra/path");
      expect(locationUrl.absUrl).toBe("http://www.server.org:1234/base");
      expect(locationUrl.getPath()).toBe("");
      expect(locationUrl.getHash()).toBe("");
    });

    describe("encoding", () => {
      it("should encode special characters", () => {
        const locationUrl = createHashbangUrl();
        locationUrl.setPath("/a <>#");
        locationUrl.setSearch({ "i j": "<>#" });
        locationUrl.setHash("<>#");

        expect(locationUrl.getPath()).toBe("/a <>#");
        expect(locationUrl.getSearch()).toEqual({ "i j": "<>#" });
        expect(locationUrl.getHash()).toBe("<>#");
        expect(locationUrl.absUrl).toBe(
          "http://www.server.org:1234/base#!/a%20%3C%3E%23?i%20j=%3C%3E%23#%3C%3E%23",
        );
      });

      it("should not encode !$:@", () => {
        const locationUrl = createHashbangUrl();
        locationUrl.setPath("/!$:@");
        locationUrl.setSearch("");
        locationUrl.setHash("!$:@");

        expect(locationUrl.absUrl).toBe(
          "http://www.server.org:1234/base#!/!$:@#!$:@",
        );
      });

      it("should decode special characters", () => {
        const locationUrl = new Location(
          "http://host.com/a",
          "http://host.com/",
          false,
          "#",
        );
        locationUrl.parse(
          "http://host.com/a#/%20%3C%3E%23?i%20j=%3C%3E%23#x%20%3C%3E%23",
        );
        expect(locationUrl.getPath()).toBe("/ <>#");
        expect(locationUrl.getSearch()).toEqual({ "i j": "<>#" });
        expect(locationUrl.getHash()).toBe("x <>#");
      });

      it("should return decoded characters for search specified in URL", () => {
        const locationUrl = new Location(
          "http://host.com/",
          "http://host.com/",
          true,
        );
        locationUrl.parse("http://host.com/?q=1%2F2%203");
        expect(locationUrl.getSearch()).toEqual({ q: "1/2 3" });
      });

      it("should return decoded characters for search specified with setter", () => {
        const locationUrl = new Location(
          "http://host.com/",
          "http://host.com/",
          true,
        );
        locationUrl.parse("http://host.com/");
        locationUrl.setSearch("q", "1/2 3");
        expect(locationUrl.getSearch()).toEqual({ q: "1/2 3" });
      });

      it("should return an array for duplicate params", () => {
        const locationUrl = new Location(
          "http://host.com",
          "http://host.com",
          true,
        );
        locationUrl.parse("http://host.com");
        locationUrl.setSearch("q", ["1/2 3", "4/5 6"]);
        expect(locationUrl.getSearch()).toEqual({ q: ["1/2 3", "4/5 6"] });
      });

      it("should encode an array correctly from search and add to url", () => {
        const locationUrl = new Location(
          "http://host.com",
          "http://host.com",
          true,
        );
        locationUrl.parse("http://host.com");
        locationUrl.setSearch({ q: ["1/2 3", "4/5 6"] });
        expect(locationUrl.absUrl).toEqual(
          "http://host.com?q=1%2F2%203&q=4%2F5%206",
        );
      });

      it("should rewrite params when specifying a single param in search", () => {
        const locationUrl = new Location(
          "http://host.com",
          "http://host.com",
          true,
        );
        locationUrl.parse("http://host.com");
        locationUrl.setSearch({ q: "1/2 3" });
        expect(locationUrl.absUrl).toEqual("http://host.com?q=1%2F2%203");
        locationUrl.setSearch({ q: "4/5 6" });
        expect(locationUrl.absUrl).toEqual("http://host.com?q=4%2F5%206");
      });

      it("url getter/setter should decode non-component special characters in hashbang mode", () => {
        const locationUrl = new Location(
          "http://host.com",
          "http://host.com",
          false,
        );
        locationUrl.parse("http://host.com");
        locationUrl.setUrl("/foo%3Abar");
        expect(locationUrl.getPath()).toEqual("/foo:bar");
      });

      it("url getter/setter should decode non-component special characters in html5 mode", () => {
        const locationUrl = new Location(
          "http://host.com",
          "http://host.com",
          true,
        );
        locationUrl.parse("http://host.com");
        locationUrl.setUrl("/foo%3Abar");
        expect(locationUrl.getPath()).toEqual("/foo:bar");
      });
    });
  });

  describe("encodePath", () => {
    it("should encode each segment but preserve slashes", () => {
      const input = "user profile/images/pic 1.jpg";
      const result = encodePath(input);
      expect(result).toBe("user%20profile/images/pic%201.jpg");
    });

    it("should re-encode previously encoded forward slashes as literal slashes", () => {
      const input = "folder1%2Fsub/folder2";
      const result = encodePath(input);
      expect(result).toBe("folder1%2Fsub/folder2");
    });

    it("should handle special characters properly", () => {
      const input = "a$bc/def@gh";
      const result = encodePath(input);
      expect(result).toBe("a$bc/def@gh");
    });

    it("should return empty string for empty path", () => {
      const input = "";
      const result = encodePath(input);
      expect(result).toBe("");
    });

    it("should handle single segment", () => {
      const input = "hello world";
      const result = encodePath(input);
      expect(result).toBe("hello%20world");
    });

    it("should not double encode already encoded segments except slashes", () => {
      const input = "one%20two/three%2Ffour";
      const result = encodePath(input);
      expect(result).toBe("one%20two/three%2Ffour");
    });

    it("should not double encode already encoded segments", () => {
      const input = "double%20encoded";
      const result = encodePath(input);
      expect(result).toBe("double%20encoded");
    });

    it("should preserve double encoded segments as-is (single decode only)", () => {
      const input = "double%2520encoded";
      const result = encodePath(input);
      expect(result).toBe("double%2520encoded"); // double % stays double encoded
    });

    it("should preserve leading and trailing slashes", () => {
      const input = "/a b/c d/";
      const result = encodePath(input);
      expect(result).toBe("/a%20b/c%20d/");
    });

    it("should preserve multiple consecutive slashes as empty segments", () => {
      const input = "foo//bar///baz";
      const result = encodePath(input);
      expect(result).toBe("foo//bar///baz");
    });

    it("should not encode RFC 3986 reserved characters in segments", () => {
      const input = "key=value/param+test";
      const result = encodePath(input);
      expect(result).toBe("key=value/param+test");
    });

    it("should encode unicode characters properly", () => {
      const input = "café/naïve";
      const result = encodePath(input);
      expect(result).toBe("caf%C3%A9/na%C3%AFve");
    });

    it("should handle input with only slashes", () => {
      const input = "///";
      const result = encodePath(input);
      expect(result).toBe("///");
    });

    it("should treat encoded slashes as literal and decoded slashes as separators", () => {
      const input = "part1%2Fsub/part2";
      const result = encodePath(input);
      expect(result).toBe("part1%2Fsub/part2");
    });
  });

  describe("decodePath", () => {
    it("should decode percent-encoded segments", () => {
      const input = "hello%20world/abc%40def";
      const result = decodePath(input, false);
      expect(result).toBe("hello world/abc@def");
    });

    it("should encode slashes as %2F in html5Mode", () => {
      const input = "section%2Fname/data";
      const result = decodePath(input, true);
      expect(result).toBe("section%2Fname/data");
    });

    it("should preserve decoded forward slashes in html5Mode", () => {
      const input = "foo/bar%2Fbaz/qux";
      const result = decodePath(input, true);
      // 'bar/baz' becomes 'bar%2Fbaz'
      expect(result).toBe("foo/bar%2Fbaz/qux");
    });

    it("should not change decoded slashes when html5Mode is false", () => {
      const input = "foo/bar%2Fbaz/qux";
      const result = decodePath(input, false);
      expect(result).toBe("foo/bar/baz/qux");
    });

    it("should handle empty segments correctly", () => {
      const input = "a//b";
      const result = decodePath(input, false);
      expect(result).toBe("a//b"); // empty segment remains
    });

    it("should decode already decoded values without errors", () => {
      const input = "simple/path";
      const result = decodePath(input, false);
      expect(result).toBe("simple/path");
    });

    it("should decode and re-encode all forward slashes in segments when html5Mode is true", () => {
      const input = "a%2Fb/c%2Fd";
      const result = decodePath(input, true);
      expect(result).toBe("a%2Fb/c%2Fd");
    });

    it("should return an empty string if given an empty string", () => {
      expect(decodePath("", false)).toBe("");
      expect(decodePath("", true)).toBe("");
    });

    it("should decode double-encoded segments only once", () => {
      const input = "double%2520encoded"; // '%2520' = '%20'
      const result = decodePath(input, false);
      expect(result).toBe("double%20encoded"); // Only decode once
    });

    it("should correctly decode reserved URI characters", () => {
      const input = "%3A%3B%26%3D";
      const result = decodePath(input, false);
      expect(result).toBe(":;&=");
    });

    it("should throw URIError for malformed percent encodings", () => {
      const input = "bad%encoding";
      expect(() => decodePath(input, false)).toThrowError(URIError);
    });

    it("should preserve leading and trailing empty segments", () => {
      const input = "/path/with/trailing/";
      const result = decodePath(input, false);
      expect(result).toBe("/path/with/trailing/");
    });

    it("should re-encode slashes inside segments when html5Mode is true", () => {
      const input = "path%2Fsegment/next";
      const result = decodePath(input, true);
      expect(result).toBe("path%2Fsegment/next");
    });

    it("should handle completely empty segments (multiple slashes)", () => {
      const input = "///";
      const result = decodePath(input, false);
      expect(result).toBe("///");
    });
  });

  describe("normalizePath", () => {
    it("should encode the path, append search and hash correctly", () => {
      const path = "folder name/file name";
      const search = { q: "test", page: "1" };
      const hash = "section 2";

      const result = normalizePath(path, search, hash);
      expect(result).toBe(
        "folder%20name/file%20name?q=test&page=1#section%202",
      );
    });

    it("should return path only if no search and no hash", () => {
      const path = "simple/path";
      const result = normalizePath(path, null, null);
      expect(result).toBe("simple/path");
    });

    it("should correctly encode search params from object", () => {
      const search = { a: "1", b: "2" };
      const result = normalizePath("path", search, null);
      expect(result).toBe("path?a=1&b=2");
    });

    it("should correctly encode array values in search", () => {
      const search = { a: ["1", "2"] };
      const result = normalizePath("path", search, null);
      // Expected: a=1&a=2 (both keys repeated)
      expect(result).toBe("path?a=1&a=2");
    });

    it("should handle boolean true values", () => {
      const search = { flag: true };
      const result = normalizePath("path", search, null);
      expect(result).toBe("path?flag");
    });

    it("should encode hash value properly", () => {
      const path = "path";
      const hash = "hello world";
      const result = normalizePath(path, null, hash);
      expect(result).toBe("path#hello%20world");
    });

    it("should not append ? if search is empty string or empty object", () => {
      expect(normalizePath("path", "", "hash")).toBe("path#hash");
      expect(normalizePath("path", {}, "hash")).toBe("path#hash");
    });

    it("should handle empty path gracefully", () => {
      const result = normalizePath("", { a: "1" }, "h");
      expect(result).toBe("?a=1#h");
    });
  });

  describe("parseAppUrl", () => {
    let locationObj;

    beforeEach(() => {
      locationObj = new Location(
        "http://www.domain.com:9877/",
        "http://www.domain.com:9877/",
      );
    });

    it("should throw error on url starting with // or \\\\", () => {
      expect(() => parseAppUrl("//invalid/path", false)).toThrowError(
        /Invalid url/,
      );
      expect(() => parseAppUrl("\\\\invalid\\path", false)).toThrowError(
        /Invalid url/,
      );
    });

    it("should add leading slash if missing and parse url correctly", () => {
      parseAppUrl("some/path?foo=bar#hashValue", false);
      expect(locationObj.getPath()).toBe("/some/path");
      expect(locationObj.getSearch()).toEqual(
        jasmine.objectContaining({ foo: "bar" }),
      );
      expect(locationObj.getHash()).toBe("hashValue");
    });

    it("should keep leading slash if present", () => {
      parseAppUrl("/already/slashed?x=1#abc", locationObj, false);
      expect(locationObj.getPath()).toBe("/already/slashed");
      expect(locationObj.getSearch()).toEqual(
        jasmine.objectContaining({ x: "1" }),
      );
      expect(locationObj.getHash()).toBe("abc");
    });

    it("should remove leading slash from path if prefixed and path starts with slash", () => {
      parseAppUrl("foo/bar", locationObj, false);
      expect(locationObj.getPath().charAt(0)).toBe("/");
      expect(locationObj.getPath()).toBe("/foo/bar");
    });

    it("should set empty $$search when no query params", () => {
      parseAppUrl("/pathOnly", locationObj, false);
      expect(locationObj.getSearch()).toEqual({});
    });

    it("should decode hash correctly", () => {
      parseAppUrl("/path#%23encoded", locationObj, false);
      expect(locationObj.getHash()).toBe("#encoded");
    });
  });

  describe("stripBaseUrl", () => {
    it("should return substring after base if url starts with base", () => {
      expect(stripBaseUrl("/base", "/base/some/path")).toBe("/some/path");
      expect(
        stripBaseUrl("http://example.com", "http://example.com/page"),
      ).toBe("/page");
      expect(stripBaseUrl("", "/anything")).toBe("/anything"); // empty base returns full url
    });

    it("should return empty string if url equals base", () => {
      expect(stripBaseUrl("/base", "/base")).toBe("");
    });

    it("should return undefined if url does not start with base", () => {
      expect(stripBaseUrl("/base", "/notbase/something")).toBeUndefined();
      expect(
        stripBaseUrl("http://example.com", "https://example.com/page"),
      ).toBeUndefined();
    });

    it("should handle base being longer than url", () => {
      expect(stripBaseUrl("/longer/base", "/short")).toBeUndefined();
    });

    it("should be case sensitive", () => {
      expect(stripBaseUrl("/Base", "/base/something")).toBeUndefined();
    });
  });

  describe("stripHash", () => {
    it("should return the same URL if there is no hash", () => {
      expect(stripHash("http://example.com/path")).toBe(
        "http://example.com/path",
      );
      expect(stripHash("/some/path")).toBe("/some/path");
    });

    it("should remove the hash and everything after it", () => {
      expect(stripHash("http://example.com/path#section1")).toBe(
        "http://example.com/path",
      );
      expect(stripHash("/path/to/resource#hashvalue")).toBe(
        "/path/to/resource",
      );
    });

    it("should remove hash even if it is at the very end", () => {
      expect(stripHash("http://example.com/#")).toBe("http://example.com/");
    });

    it("should handle empty string input", () => {
      expect(stripHash("")).toBe("");
    });

    it("should handle hash only string", () => {
      expect(stripHash("#hashonly")).toBe("");
    });
  });

  describe("stripFile", () => {
    it("removes filename from URL without hash", () => {
      const input = "https://example.com/path/to/file.js";
      const expected = "https://example.com/path/to/";
      expect(stripFile(input)).toBe(expected);
    });

    it("removes filename and hash from URL", () => {
      const input = "https://example.com/path/to/file.js#section";
      const expected = "https://example.com/path/to/";
      expect(stripFile(input)).toBe(expected);
    });

    it("handles root URL with file", () => {
      const input = "https://example.com/file.js";
      const expected = "https://example.com/";
      expect(stripFile(input)).toBe(expected);
    });

    it("handles URL with no file", () => {
      const input = "https://example.com/path/to/";
      const expected = "https://example.com/path/to/";
      expect(stripFile(input)).toBe(expected);
    });

    it("handles relative URL with file and hash", () => {
      const input = "docs/static/app.js#v1";
      const expected = "docs/static/";
      expect(stripFile(input)).toBe(expected);
    });
  });

  describe("serverBase", () => {
    it("returns server base for https URL without port", () => {
      const input = "https://example.com/path/to/resource";
      const expected = "https://example.com";
      expect(serverBase(input)).toBe(expected);
    });

    it("returns server base for http URL with port", () => {
      const input = "http://localhost:8080/api/data";
      const expected = "http://localhost:8080";
      expect(serverBase(input)).toBe(expected);
    });

    it("returns server base for URL with subdomain", () => {
      const input = "https://api.example.com/v1/query";
      const expected = "https://api.example.com";
      expect(serverBase(input)).toBe(expected);
    });

    it("returns full URL if no path is present", () => {
      const input = "https://example.com";
      const expected = "https://example.com";
      expect(serverBase(input)).toBe(expected);
    });

    it("handles trailing slash after host", () => {
      const input = "https://example.com/";
      const expected = "https://example.com";
      expect(serverBase(input)).toBe(expected);
    });
  });

  describe("urlsEqual", () => {
    it("matches same URL", () => {
      expect(
        urlsEqual("http://example.com/foo", "http://example.com/foo"),
      ).toBe(true);
    });

    it("ignores trailing slash", () => {
      expect(
        urlsEqual("http://example.com/foo/", "http://example.com/foo"),
      ).toBe(true);
    });

    it("ignores encoded spaces", () => {
      expect(
        urlsEqual("http://example.com/foo%20bar", "http://example.com/foo bar"),
      ).toBe(true);
    });

    it("ignores empty hash", () => {
      expect(
        urlsEqual("http://example.com/foo#", "http://example.com/foo"),
      ).toBe(true);
    });

    it("resolves relative to base href", () => {
      const base = document.createElement("base");
      base.href = "http://localhost/";
      document.head.appendChild(base);

      expect(urlsEqual("/bar", "http://localhost/bar")).toBe(true);

      document.head.removeChild(base); // cleanup
    });

    it("returns false for different paths", () => {
      expect(
        urlsEqual("http://example.com/foo", "http://example.com/bar"),
      ).toBe(false);
    });
  });

  // describe("location watch", () => {
  //   it("should not update browser if only the empty hash fragment is cleared", () => {
  //     initService({ supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b#", baseHref: "/base/" });
  //     inject(($browser, $rootScope) => {
  //       $browser.url("http://new.com/a/b");
  //       const $browserUrl = spyOnlyCallsWithArgs(
  //         $browser,
  //         "url",
  //       ).and.callThrough();
  //       $rootScope.$digest();
  //       expect($browserUrl).not.toHaveBeenCalled();
  //     });
  //   });

  //   it("should not replace browser url if only the empty hash fragment is cleared", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/#", baseHref: "/" });
  //     inject(($browser, $location, $window) => {
  //       expect($browser.url()).toBe("http://new.com/");
  //       expect($location.absUrl).toBe("http://new.com/");
  //       expect($window.location.href).toBe("http://new.com/#");
  //     });
  //   });

  //   it("should not get caught in infinite digest when replacing path in locationChangeSuccess handler", () => {
  //     initService({ html5Mode: true, supportHistory: false });
  //     mockUpBrowser({
  //       initialUrl: "http://server/base/home",
  //       baseHref: "/base/",
  //     });
  //     inject(($browser, $location, $rootScope, $window) => {
  //       let handlerCalled = false;
  //       $rootScope.$on("$locationChangeSuccess", () => {
  //         handlerCalled = true;
  //         if ($location.getPath() !== "/") {
  //           $location.setPath("/").replace();
  //         }
  //       });
  //       expect($browser.url()).toEqual("http://server/base/#!/home");
  //       $rootScope.$digest();
  //       expect(handlerCalled).toEqual(true);
  //       expect($browser.url()).toEqual("http://server/base/#!/");
  //     });
  //   });

  //   it("should not infinitely digest when using a semicolon in initial path", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({
  //       initialUrl: "http://localhost:9876/;jsessionid=foo",
  //       baseHref: "/",
  //     });
  //     inject(($location, $browser, $rootScope) => {
  //       expect(() => {
  //         $rootScope.$digest();
  //       }).not.toThrow();
  //     });
  //   });

  //   // https://github.com/angular/angular.js/issues/16592
  //   it("should not infinitely digest when initial params contain a quote", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({
  //       initialUrl: "http://localhost:9876/?q='",
  //       baseHref: "/",
  //     });
  //     inject(($location, $browser, $rootScope) => {
  //       expect(() => {
  //         $rootScope.$digest();
  //       }).not.toThrow();
  //     });
  //   });

  //   // https://github.com/angular/angular.js/issues/16592
  //   it("should not infinitely digest when initial params contain an escaped quote", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({
  //       initialUrl: "http://localhost:9876/?q=%27",
  //       baseHref: "/",
  //     });
  //     inject(($location, $browser, $rootScope) => {
  //       expect(() => {
  //         $rootScope.$digest();
  //       }).not.toThrow();
  //     });
  //   });

  //   // https://github.com/angular/angular.js/issues/16592
  //   it("should not infinitely digest when updating params containing a quote (via $browser.url)", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://localhost:9876/", baseHref: "/" });
  //     inject(($location, $browser, $rootScope) => {
  //       $rootScope.$digest();
  //       $browser.url("http://localhost:9876/?q='");
  //       expect(() => {
  //         $rootScope.$digest();
  //       }).not.toThrow();
  //     });
  //   });

  //   // https://github.com/angular/angular.js/issues/16592
  //   it("should not infinitely digest when updating params containing a quote (via window.location + popstate)", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://localhost:9876/", baseHref: "/" });
  //     inject(($window, $location, $browser, $rootScope) => {
  //       $rootScope.$digest();
  //       $window.location.href = "http://localhost:9876/?q='";
  //       expect(() => {
  //         ($window).triggerHandler("popstate");
  //       }).not.toThrow();
  //     });
  //   });

  //   describe("when changing the browser URL/history directly during a `$digest`", () => {
  //     beforeEach(() => {
  //       initService({ supportHistory: true });
  //       mockUpBrowser({ initialUrl: "http://foo.bar/", baseHref: "/" });
  //     });

  //     it("should correctly update `$location` from history and not digest infinitely", inject((
  //       $browser,
  //       $location,
  //       $rootScope,
  //       $window,
  //     ) => {
  //       $location.setUrl("baz");
  //       $rootScope.$digest();

  //       const originalUrl = $window.location.href;

  //       $rootScope.$apply(() => {
  //         $rootScope.$evalAsync(() => {
  //           $window.history.pushState({}, null, `${originalUrl}/qux`);
  //         });
  //       });

  //       expect($browser.url()).toBe("http://foo.bar/#!/baz/qux");
  //       expect($location.absUrl).toBe("http://foo.bar/#!/baz/qux");

  //       $rootScope.$apply(() => {
  //         $rootScope.$evalAsync(() => {
  //           $window.history.replaceState({}, null, `${originalUrl}/quux`);
  //         });
  //       });

  //       expect($browser.url()).toBe("http://foo.bar/#!/baz/quux");
  //       expect($location.absUrl).toBe("http://foo.bar/#!/baz/quux");
  //     }));

  //     it("should correctly update `$location` from URL and not digest infinitely", inject((
  //       $browser,
  //       $location,
  //       $rootScope,
  //       $window,
  //     ) => {
  //       $location.setUrl("baz");
  //       $rootScope.$digest();

  //       $rootScope.$apply(() => {
  //         $rootScope.$evalAsync(() => {
  //           $window.location.href += "/qux";
  //         });
  //       });

  //       ($window).triggerHandler("hashchange");

  //       expect($browser.url()).toBe("http://foo.bar/#!/baz/qux");
  //       expect($location.absUrl).toBe("http://foo.bar/#!/baz/qux");
  //     }));
  //   });

  //   function updatePathOnLocationChangeSuccessTo(newPath, newParams) {
  //     inject(($rootScope, $location) => {
  //       $rootScope.$on("$locationChangeSuccess", (event, newUrl, oldUrl) => {
  //         $location.setPath(newPath);
  //         if (newParams) {
  //           $location.setSearch(newParams);
  //         }
  //       });
  //     });
  //   }

  //   describe("location watch for hashbang browsers", () => {
  //     it("should not infinite $digest when going to base URL without trailing slash when $locationChangeSuccess watcher changes path to /Home", () => {
  //       initService({ html5Mode: true, supportHistory: false });
  //       mockUpBrowser({ initialUrl: "http://server/app/", baseHref: "/app/" });
  //       inject(($rootScope, $location, $browser) => {
  //         const $browserUrl = spyOnlyCallsWithArgs(
  //           $browser,
  //           "url",
  //         ).and.callThrough();

  //         updatePathOnLocationChangeSuccessTo("/Home");

  //         $rootScope.$digest();

  //         expect($browser.url()).toEqual("http://server/app/#!/Home");
  //         expect($location.getPath()).toEqual("/Home");
  //         expect($browserUrl).toHaveBeenCalledTimes(1);
  //       });
  //     });

  //     it("should not infinite $digest when going to base URL without trailing slash when $locationChangeSuccess watcher changes path to /", () => {
  //       initService({ html5Mode: true, supportHistory: false });
  //       mockUpBrowser({
  //         initialUrl: "http://server/app/Home",
  //         baseHref: "/app/",
  //       });
  //       inject(($rootScope, $location, $browser, $window) => {
  //         const $browserUrl = spyOnlyCallsWithArgs(
  //           $browser,
  //           "url",
  //         ).and.callThrough();

  //         updatePathOnLocationChangeSuccessTo("/");

  //         $rootScope.$digest();

  //         expect($browser.url()).toEqual("http://server/app/#!/");
  //         expect($location.getPath()).toEqual("/");
  //         expect($browserUrl).toHaveBeenCalledTimes(1);
  //         expect($browserUrl.calls.argsFor(0)).toEqual([
  //           "http://server/app/#!/",
  //           false,
  //           null,
  //         ]);
  //       });
  //     });

  //     it("should not infinite $digest when going to base URL with trailing slash when $locationChangeSuccess watcher changes path to /Home", () => {
  //       initService({ html5Mode: true, supportHistory: false });
  //       mockUpBrowser({ initialUrl: "http://server/app/", baseHref: "/app/" });
  //       inject(($rootScope, $location, $browser) => {
  //         const $browserUrl = spyOnlyCallsWithArgs(
  //           $browser,
  //           "url",
  //         ).and.callThrough();

  //         updatePathOnLocationChangeSuccessTo("/Home");
  //         $rootScope.$digest();

  //         expect($browser.url()).toEqual("http://server/app/#!/Home");
  //         expect($location.getPath()).toEqual("/Home");
  //         expect($browserUrl).toHaveBeenCalledTimes(1);
  //         expect($browserUrl.calls.argsFor(0)).toEqual([
  //           "http://server/app/#!/Home",
  //           false,
  //           null,
  //         ]);
  //       });
  //     });

  //     it("should not infinite $digest when going to base URL with trailing slash when $locationChangeSuccess watcher changes path to /", () => {
  //       initService({ html5Mode: true, supportHistory: false });
  //       mockUpBrowser({ initialUrl: "http://server/app/", baseHref: "/app/" });
  //       inject(($rootScope, $location, $browser) => {
  //         const $browserUrl = spyOnlyCallsWithArgs(
  //           $browser,
  //           "url",
  //         ).and.callThrough();

  //         updatePathOnLocationChangeSuccessTo("/");
  //         $rootScope.$digest();

  //         expect($browser.url()).toEqual("http://server/app/#!/");
  //         expect($location.getPath()).toEqual("/");
  //         expect($browserUrl).toHaveBeenCalledTimes(1);
  //       });
  //     });
  //   });

  //   describe("location watch for HTML5 browsers", () => {
  //     it("should not infinite $digest when going to base URL without trailing slash when $locationChangeSuccess watcher changes path to /Home", () => {
  //       initService({ html5Mode: true, supportHistory: true });
  //       mockUpBrowser({ initialUrl: "http://server/app/", baseHref: "/app/" });
  //       inject(($rootScope, $injector, $browser) => {
  //         const $browserUrl = spyOnlyCallsWithArgs(
  //           $browser,
  //           "url",
  //         ).and.callThrough();

  //         const $location = $injector.get("$location");
  //         updatePathOnLocationChangeSuccessTo("/Home");

  //         $rootScope.$digest();

  //         expect($browser.url()).toEqual("http://server/app/Home");
  //         expect($location.getPath()).toEqual("/Home");
  //         expect($browserUrl).toHaveBeenCalledTimes(1);
  //       });
  //     });

  //     it("should not infinite $digest when going to base URL without trailing slash when $locationChangeSuccess watcher changes path to /", () => {
  //       initService({ html5Mode: true, supportHistory: true });
  //       mockUpBrowser({ initialUrl: "http://server/app/", baseHref: "/app/" });
  //       inject(($rootScope, $injector, $browser) => {
  //         const $browserUrl = spyOnlyCallsWithArgs(
  //           $browser,
  //           "url",
  //         ).and.callThrough();

  //         const $location = $injector.get("$location");
  //         updatePathOnLocationChangeSuccessTo("/");

  //         $rootScope.$digest();

  //         expect($browser.url()).toEqual("http://server/app/");
  //         expect($location.getPath()).toEqual("/");
  //         expect($browserUrl).not.toHaveBeenCalled();
  //       });
  //     });

  //     it("should not infinite $digest when going to base URL with trailing slash when $locationChangeSuccess watcher changes path to /Home", () => {
  //       initService({ html5Mode: true, supportHistory: true });
  //       mockUpBrowser({ initialUrl: "http://server/app/", baseHref: "/app/" });
  //       inject(($rootScope, $injector, $browser) => {
  //         const $browserUrl = spyOnlyCallsWithArgs(
  //           $browser,
  //           "url",
  //         ).and.callThrough();

  //         const $location = $injector.get("$location");
  //         updatePathOnLocationChangeSuccessTo("/Home");

  //         $rootScope.$digest();

  //         expect($browser.url()).toEqual("http://server/app/Home");
  //         expect($location.getPath()).toEqual("/Home");
  //         expect($browserUrl).toHaveBeenCalledTimes(1);
  //       });
  //     });

  //     it("should not infinite $digest when going to base URL with trailing slash when $locationChangeSuccess watcher changes path to /", () => {
  //       initService({ html5Mode: true, supportHistory: true });
  //       mockUpBrowser({ initialUrl: "http://server/app/", baseHref: "/app/" });
  //       inject(($rootScope, $injector, $browser) => {
  //         const $browserUrl = spyOnlyCallsWithArgs(
  //           $browser,
  //           "url",
  //         ).and.callThrough();

  //         const $location = $injector.get("$location");
  //         updatePathOnLocationChangeSuccessTo("/");

  //         $rootScope.$digest();

  //         expect($browser.url()).toEqual("http://server/app/");
  //         expect($location.getPath()).toEqual("/");
  //         expect($browserUrl).not.toHaveBeenCalled();
  //       });
  //     });

  //     // https://github.com/angular/angular.js/issues/16592
  //     it("should not infinite $digest when going to base URL with trailing slash when $locationChangeSuccess watcher changes query params to contain quote", () => {
  //       initService({ html5Mode: true, supportHistory: true });
  //       mockUpBrowser({ initialUrl: "http://server/app/", baseHref: "/app/" });
  //       inject(($rootScope, $injector, $browser) => {
  //         const $browserUrl = spyOnlyCallsWithArgs(
  //           $browser,
  //           "url",
  //         ).and.callThrough();

  //         const $location = $injector.get("$location");
  //         updatePathOnLocationChangeSuccessTo("/", { q: "'" });

  //         $rootScope.$digest();

  //         expect($location.getPath()).toEqual("/");
  //         expect($location.getSearch()).toEqual({ q: "'" });
  //         expect($browserUrl).toHaveBeenCalledTimes(1);
  //       });
  //     });
  //   });
  // });

  // describe("wiring", () => {
  //   it("should update $location when browser url changes", () => {
  //     initService({ html5Mode: false, hashPrefix: "!", supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b#!", baseHref: "/a/b" });
  //     inject(($window, $browser, $location, $rootScope) => {
  //       spyOn($location, "parse").and.callThrough();
  //       $window.location.href = "http://new.com/a/b#!/aaa";
  //       $browser.$$checkUrlChange();
  //       expect($location.absUrl).toBe("http://new.com/a/b#!/aaa");
  //       expect($location.getPath()).toBe("/aaa");
  //       expect($location.parse).toHaveBeenCalled();
  //     });
  //   });

  //   // location.href = '...' fires hashchange event synchronously, so it might happen inside $apply
  //   it("should not $apply when browser url changed inside $apply", () => {
  //     initService({ html5Mode: false, hashPrefix: "!", supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b#!", baseHref: "/a/b" });
  //     inject(($rootScope, $browser, $location, $window) => {
  //       const OLD_URL = $browser.url();
  //       const NEW_URL = "http://new.com/a/b#!/new";

  //       $rootScope.$apply(() => {
  //         $window.location.href = NEW_URL;
  //         $browser.$$checkUrlChange(); // simulate firing event from browser
  //         expect($location.absUrl).toBe(OLD_URL); // should be async
  //       });

  //       expect($location.absUrl).toBe(NEW_URL);
  //     });
  //   });

  //   // location.href = '...' fires hashchange event synchronously, so it might happen inside $digest
  //   it("should not $apply when browser url changed inside $digest", () => {
  //     initService({ html5Mode: false, hashPrefix: "!", supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b#!", baseHref: "/a/b" });
  //     inject(($rootScope, $browser, $location, $window) => {
  //       const OLD_URL = $browser.url();
  //       const NEW_URL = "http://new.com/a/b#!/new";
  //       let notRunYet = true;

  //       $rootScope.$watch(() => {
  //         if (notRunYet) {
  //           notRunYet = false;
  //           $window.location.href = NEW_URL;
  //           $browser.$$checkUrlChange(); // simulate firing event from browser
  //           expect($location.absUrl).toBe(OLD_URL); // should be async
  //         }
  //       });

  //       $rootScope.$digest();
  //       expect($location.absUrl).toBe(NEW_URL);
  //     });
  //   });

  //   it("should update browser when $location changes", () => {
  //     initService({ html5Mode: false, hashPrefix: "!", supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b#!", baseHref: "/a/b" });
  //     inject(($rootScope, $browser, $location) => {
  //       const $browserUrl = spyOnlyCallsWithArgs(
  //         $browser,
  //         "url",
  //       ).and.callThrough();
  //       $location.setPath("/new/path");
  //       expect($browserUrl).not.toHaveBeenCalled();
  //       $rootScope.$apply();

  //       expect($browserUrl).toHaveBeenCalled();
  //       expect($browser.url()).toBe("http://new.com/a/b#!/new/path");
  //     });
  //   });

  //   it("should update browser only once per $apply cycle", () => {
  //     initService({ html5Mode: false, hashPrefix: "!", supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b#!", baseHref: "/a/b" });
  //     inject(($rootScope, $browser, $location) => {
  //       const $browserUrl = spyOnlyCallsWithArgs(
  //         $browser,
  //         "url",
  //       ).and.callThrough();
  //       $location.setPath("/new/path");

  //       $rootScope.$watch(() => {
  //         $location.setSearch("a=b");
  //       });

  //       $rootScope.$apply();
  //       expect($browserUrl).toHaveBeenCalled();
  //       expect($browser.url()).toBe("http://new.com/a/b#!/new/path?a=b");
  //     });
  //   });

  //   it("should replace browser url when url was replaced at least once", () => {
  //     initService({ html5Mode: false, hashPrefix: "!", supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b#!", baseHref: "/a/b" });
  //     inject(($rootScope, $browser, $location) => {
  //       const $browserUrl = spyOnlyCallsWithArgs(
  //         $browser,
  //         "url",
  //       ).and.callThrough();
  //       $location.setPath("/n/url").replace();
  //       $rootScope.$apply();

  //       expect($browserUrl).toHaveBeenCalled();
  //       expect($browserUrl.calls.mostRecent().args).toEqual([
  //         "http://new.com/a/b#!/n/url",
  //         true,
  //         null,
  //       ]);
  //       expect($location.$$replace).toBe(false);
  //     });
  //   });

  //   it("should always reset replace flag after running watch", () => {
  //     initService({ html5Mode: false, hashPrefix: "!", supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b#!", baseHref: "/a/b" });
  //     inject(($rootScope, $browser, $location) => {
  //       // init watches
  //       $location.setUrl("/initUrl");
  //       $rootScope.$apply();

  //       // changes url but resets it before digest
  //       $location.setUrl("/newUrl").replace().url("/initUrl");
  //       $rootScope.$apply();
  //       expect($location.$$replace).toBe(false);

  //       // set the url to the old value
  //       $location.setUrl("/newUrl").replace();
  //       $rootScope.$apply();
  //       expect($location.$$replace).toBe(false);

  //       // doesn't even change url only calls replace()
  //       $location.replace();
  //       $rootScope.$apply();
  //       expect($location.$$replace).toBe(false);
  //     });
  //   });

  //   it("should update the browser if changed from within a watcher", () => {
  //     initService({ html5Mode: false, hashPrefix: "!", supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b#!", baseHref: "/a/b" });
  //     inject(($rootScope, $browser, $location) => {
  //       $rootScope.$watch(
  //         () => true,
  //         () => {
  //           $location.setPath("/changed");
  //         },
  //       );

  //       $rootScope.$digest();
  //       expect($browser.url()).toBe("http://new.com/a/b#!/changed");
  //     });
  //   });

  //   it("should not infinitely digest if hash is set when there is no hashPrefix", () => {
  //     initService({ html5Mode: false, hashPrefix: "", supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b", baseHref: "/a/b" });
  //     inject(($rootScope, $browser, $location) => {
  //       $location.setHash("test");

  //       $rootScope.$digest();
  //       expect($browser.url()).toBe("http://new.com/a/b##test");
  //     });
  //   });
  // });

  // describe("wiring in html5 mode", () => {
  //   it("should initialize state to initial state from the browser", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({
  //       initialUrl: "http://new.com/a/b/",
  //       baseHref: "/a/b/",
  //       state: { a: 2 },
  //     });
  //     inject(($location) => {
  //       expect($location.getState()).toEqual({ a: 2 });
  //     });
  //   });

  //   it("should update $location when browser state changes", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b/", baseHref: "/a/b/" });
  //     inject(($location, $rootScope, $window) => {
  //       $window.history.pushState({ b: 3 });
  //       $rootScope.$digest();

  //       expect($location.getState()).toEqual({ b: 3 });

  //       $window.history.pushState(
  //         { b: 4 },
  //         null,
  //         `${$window.location.href}c?d=e#f`,
  //       );
  //       $rootScope.$digest();

  //       expect($location.getPath()).toBe("/c");
  //       expect($location.getSearch()).toEqual({ d: "e" });
  //       expect($location.getHash()).toBe("f");
  //       expect($location.getState()).toEqual({ b: 4 });
  //     });
  //   });

  //   // https://github.com/angular/angular.js/issues/16592
  //   it("should not infinite $digest on pushState() with quote in param", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://server/app/", baseHref: "/app/" });
  //     inject(($rootScope, $injector, $window) => {
  //       const $location = $injector.get("$location");
  //       $rootScope.$digest(); // allow $location initialization to finish

  //       $window.history.pushState({}, null, "http://server/app/Home?q='");
  //       $rootScope.$digest();

  //       expect($location.absUrl).toEqual("http://server/app/Home?q='");
  //       expect($location.getPath()).toEqual("/Home");
  //       expect($location.getSearch()).toEqual({ q: "'" });
  //     });
  //   });

  //   // https://github.com/angular/angular.js/issues/16592
  //   it("should not infinite $digest on popstate event with quote in param", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://server/app/", baseHref: "/app/" });
  //     inject(($rootScope, $injector, $window) => {
  //       const $location = $injector.get("$location");
  //       $rootScope.$digest(); // allow $location initialization to finish

  //       $window.location.href = "http://server/app/Home?q='";
  //       ($window).triggerHandler("popstate");

  //       expect($location.absUrl).toEqual("http://server/app/Home?q='");
  //       expect($location.getPath()).toEqual("/Home");
  //       expect($location.getSearch()).toEqual({ q: "'" });
  //     });
  //   });

  //   it("should replace browser url & state when replace() was called at least once", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b/", baseHref: "/a/b/" });
  //     inject(($rootScope, $location, $browser) => {
  //       const $browserUrl = spyOnlyCallsWithArgs(
  //         $browser,
  //         "url",
  //       ).and.callThrough();
  //       $location.setPath("/n/url").state({ a: 2 }).replace();
  //       $rootScope.$apply();

  //       expect($browserUrl).toHaveBeenCalled();
  //       expect($browserUrl.calls.mostRecent().args).toEqual([
  //         "http://new.com/a/b/n/url",
  //         true,
  //         { a: 2 },
  //       ]);
  //       expect($location.$$replace).toBe(false);
  //       expect($location._state).toEqual({ a: 2 });
  //     });
  //   });

  //   it("should use only the most recent url & state definition", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b/", baseHref: "/a/b/" });

  //     inject(($rootScope, $location, $browser) => {
  //       const $browserUrl = spyOnlyCallsWithArgs(
  //         $browser,
  //         "url",
  //       ).and.callThrough();
  //       $location
  //         .setPath("/n/url")
  //         .state({ a: 2 })
  //         .replace()
  //         .state({ b: 3 })
  //         .setPath("/o/url");
  //       $rootScope.$apply();

  //       expect($browserUrl).toHaveBeenCalled();
  //       expect($browserUrl.calls.mostRecent().args).toEqual([
  //         "http://new.com/a/b/o/url",
  //         true,
  //         { b: 3 },
  //       ]);
  //       expect($location.$$replace).toBe(false);
  //       expect($location._state).toEqual({ b: 3 });
  //     });
  //   });

  //   it("should allow to set state without touching the URL", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b/", baseHref: "/a/b/" });

  //     inject(($rootScope, $location, $browser) => {
  //       const $browserUrl = spyOnlyCallsWithArgs(
  //         $browser,
  //         "url",
  //       ).and.callThrough();
  //       $location.setState({ a: 2 }).replace().state({ b: 3 });
  //       $rootScope.$apply();

  //       expect($browserUrl).toHaveBeenCalled();
  //       expect($browserUrl.calls.mostRecent().args).toEqual([
  //         "http://new.com/a/b/",
  //         true,
  //         { b: 3 },
  //       ]);
  //       expect($location.$$replace).toBe(false);
  //       expect($location._state).toEqual({ b: 3 });
  //     });
  //   });

  //   it("should always reset replace flag after running watch", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b/", baseHref: "/a/b/" });

  //     inject(($rootScope, $location) => {
  //       // init watches
  //       $location.setUrl("/initUrl").state({ a: 2 });
  //       $rootScope.$apply();

  //       // changes url & state but resets them before digest
  //       $location
  //         .url("/newUrl")
  //         .state({ a: 2 })
  //         .replace()
  //         .state({ b: 3 })
  //         .url("/initUrl");
  //       $rootScope.$apply();
  //       expect($location.$$replace).toBe(false);

  //       // set the url to the old value
  //       $location.setUrl("/newUrl").state({ a: 2 }).replace();
  //       $rootScope.$apply();
  //       expect($location.$$replace).toBe(false);

  //       // doesn't even change url only calls replace()
  //       $location.replace();
  //       $rootScope.$apply();
  //       expect($location.$$replace).toBe(false);
  //     });
  //   });

  //   it("should allow to modify state only before digest", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b/", baseHref: "/a/b/" });

  //     inject(($rootScope, $location, $browser) => {
  //       const o = { a: 2 };
  //       $location.setState(o);
  //       o.a = 3;
  //       $rootScope.$apply();
  //       expect($browser.state()).toEqual({ a: 3 });

  //       o.a = 4;
  //       $rootScope.$apply();
  //       expect($browser.state()).toEqual({ a: 3 });
  //     });
  //   });

  //   it("should make $location.getState() referencially identical with $browser.state() after digest", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b/", baseHref: "/a/b/" });

  //     inject(($rootScope, $location, $browser) => {
  //       $location.setState({ a: 2 });
  //       $rootScope.$apply();
  //       expect($location.getState()).toBe($browser.state());
  //     });
  //   });

  //   it("should allow to query the state after digest", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b/", baseHref: "/a/b/" });

  //     inject(($rootScope, $location) => {
  //       $location.setUrl("/foo").state({ a: 2 });
  //       $rootScope.$apply();
  //       expect($location.getState()).toEqual({ a: 2 });
  //     });
  //   });

  //   it("should reset the state on .url() after digest", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b/", baseHref: "/a/b/" });

  //     inject(($rootScope, $location, $browser) => {
  //       $location.setUrl("/foo").state({ a: 2 });
  //       $rootScope.$apply();

  //       const $browserUrl = spyOnlyCallsWithArgs(
  //         $browser,
  //         "url",
  //       ).and.callThrough();
  //       $location.setUrl("/bar");
  //       $rootScope.$apply();

  //       expect($browserUrl).toHaveBeenCalled();
  //       expect($browserUrl.calls.mostRecent().args).toEqual([
  //         "http://new.com/a/b/bar",
  //         false,
  //         null,
  //       ]);
  //     });
  //   });

  //   it("should force a page reload if navigating outside of the application base href", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b/", baseHref: "/a/b/" });

  //     inject(($window, $browser, $location) => {
  //       $window.location.href = "http://new.com/a/outside.html";
  //       spyOn($window.location, "$$setHref");
  //       expect($window.location.$$setHref).not.toHaveBeenCalled();
  //       $browser.$$checkUrlChange();
  //       expect($window.location.$$setHref).toHaveBeenCalledWith(
  //         "http://new.com/a/outside.html",
  //       );
  //     });
  //   });
  // });

  // TODO MOVE TO PLAYWRIGHT
  // html5 history is disabled
  // describe("disabled history", () => {
  //   it("should use hashbang url with hash prefix", () => {
  //     initService({ html5Mode: false, hashPrefix: "!" });
  //     mockUpBrowser({
  //       initialUrl: "http://domain.com/base/index.html#!/a/b",
  //       baseHref: "/base/index.html",
  //     });
  //     inject(($rootScope, $location, $browser) => {
  //       expect($browser.url()).toBe("http://domain.com/base/index.html#!/a/b");
  //       $location.setPath("/new");
  //       $location.setSearch({ a: true });
  //       $rootScope.$apply();
  //       expect($browser.url()).toBe(
  //         "http://domain.com/base/index.html#!/new?a",
  //       );
  //     });
  //   });

  //   it("should use hashbang url without hash prefix", () => {
  //     initService({ html5Mode: false, hashPrefix: "" });
  //     mockUpBrowser({
  //       initialUrl: "http://domain.com/base/index.html#/a/b",
  //       baseHref: "/base/index.html",
  //     });
  //     inject(($rootScope, $location, $browser) => {
  //       expect($browser.url()).toBe("http://domain.com/base/index.html#/a/b");
  //       $location.setPath("/new");
  //       $location.setSearch({ a: true });
  //       $rootScope.$apply();
  //       expect($browser.url()).toBe("http://domain.com/base/index.html#/new?a");
  //     });
  //   });
  // });

  // TODO MOVE TO PLAYWRIGHT
  // html5 history enabled, but not supported by browser
  // describe("history on old browser", () => {
  //   it("should use hashbang url with hash prefix", () => {
  //     initService({ html5Mode: true, hashPrefix: "!!", supportHistory: false });
  //     inject(
  //       initBrowser({
  //         url: "http://domain.com/base/index.html#!!/a/b",
  //         basePath: "/base/index.html",
  //       }),
  //       ($rootScope, $location, $browser) => {
  //         expect($browser.url()).toBe(
  //           "http://domain.com/base/index.html#!!/a/b",
  //         );
  //         $location.setPath("/new");
  //         $location.setSearch({ a: true });
  //         $rootScope.$apply();
  //         expect($browser.url()).toBe(
  //           "http://domain.com/base/index.html#!!/new?a",
  //         );
  //       },
  //     );
  //   });

  //   it("should redirect to hashbang url when new url given", () => {
  //     initService({ html5Mode: true, hashPrefix: "!" });
  //     inject(
  //       initBrowser({
  //         url: "http://domain.com/base/new-path/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       ($browser, $location) => {
  //         expect($browser.url()).toBe(
  //           "http://domain.com/base/index.html#!/new-path/index.html",
  //         );
  //       },
  //     );
  //   });

  //   it("should correctly convert html5 url with path matching basepath to hashbang url", () => {
  //     initService({ html5Mode: true, hashPrefix: "!", supportHistory: false });
  //     inject(
  //       initBrowser({
  //         url: "http://domain.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       ($browser, $location) => {
  //         expect($browser.url()).toBe(
  //           "http://domain.com/base/index.html#!/index.html",
  //         );
  //       },
  //     );
  //   });
  // });

  // TODO MOVE TO PLAYWRIGHT
  // html5 history enabled and supported by browser
  // describe("history on new browser", () => {
  //   it("should use new url", () => {
  //     initService({ html5Mode: true, hashPrefix: "", supportHistory: true });
  //     mockUpBrowser({
  //       initialUrl: "http://domain.com/base/old/index.html#a",
  //       baseHref: "/base/index.html",
  //     });
  //     inject(($rootScope, $location, $browser) => {
  //       expect($browser.url()).toBe("http://domain.com/base/old/index.html#a");
  //       $location.setPath("/new");
  //       $location.setSearch({ a: true });
  //       $rootScope.$apply();
  //       expect($browser.url()).toBe("http://domain.com/base/new?a#a");
  //     });
  //   });

  //   it("should rewrite when hashbang url given", () => {
  //     initService({ html5Mode: true, hashPrefix: "!", supportHistory: true });
  //     mockUpBrowser({
  //       initialUrl: "http://domain.com/base/index.html#!/a/b",
  //       baseHref: "/base/index.html",
  //     });
  //     inject(($rootScope, $location, $browser) => {
  //       expect($browser.url()).toBe("http://domain.com/base/a/b");
  //       $location.setPath("/new");
  //       $location.setHash("abc");
  //       $rootScope.$apply();
  //       expect($browser.url()).toBe("http://domain.com/base/new#abc");
  //       expect($location.getPath()).toBe("/new");
  //     });
  //   });

  //   it("should rewrite when hashbang url given (without hash prefix)", () => {
  //     initService({ html5Mode: true, hashPrefix: "", supportHistory: true });
  //     mockUpBrowser({
  //       initialUrl: "http://domain.com/base/index.html#/a/b",
  //       baseHref: "/base/index.html",
  //     });
  //     inject(($rootScope, $location, $browser) => {
  //       expect($browser.url()).toBe("http://domain.com/base/a/b");
  //       expect($location.getPath()).toBe("/a/b");
  //     });
  //   });
  // });

  // describe("PATH_MATCH", () => {
  //   it("should parse just path", () => {
  //     const match = PATH_MATCH.exec("/path");
  //     expect(match[1]).toBe("/path");
  //   });

  //   it("should parse path with search", () => {
  //     const match = PATH_MATCH.exec("/ppp/a?a=b&c");
  //     expect(match[1]).toBe("/ppp/a");
  //     expect(match[3]).toBe("a=b&c");
  //   });

  //   it("should parse path with hash", () => {
  //     const match = PATH_MATCH.exec("/ppp/a#abc?");
  //     expect(match[1]).toBe("/ppp/a");
  //     expect(match[5]).toBe("abc?");
  //   });

  //   it("should parse path with both search and hash", () => {
  //     const match = PATH_MATCH.exec("/ppp/a?a=b&c#abc/d?");
  //     expect(match[3]).toBe("a=b&c");
  //   });
  // });

  // TODO MOVE TO PLAYWRIGHT
  // describe("link rewriting", () => {
  //   let root;
  //   let link;
  //   let originalBrowser;
  //   let lastEventPreventDefault;

  //   function configureTestLink(options) {
  //     let { linkHref } = options;
  //     const { relLink } = options;
  //     let { attrs } = options;
  //     const { content } = options;

  //     attrs = attrs ? ` ${attrs} ` : "";

  //     if (typeof linkHref === "string" && !relLink) {
  //       if (linkHref[0] === "/") {
  //         linkHref = `http://host.com${linkHref}`;
  //       } else if (!linkHref.match(/:\/\//)) {
  //         // fake the behavior of <base> tag
  //         linkHref = `http://host.com/base/${linkHref}`;
  //       }
  //     }

  //     if (linkHref) {
  //       link = (`<a href="${linkHref}"${attrs}>${content}</a>`)[0];
  //     } else {
  //       link = (`<a ${attrs}>${content}</a>`)[0];
  //     }

  //     module(
  //       ($provide) =>
  //         function ($rootElement, $document) {
  //           $rootElement.append(link);
  //           root = $rootElement;
  //           // we need to do this otherwise we can't simulate events
  //           $document.querySelector("body").append($rootElement);
  //         },
  //     );
  //   }

  //   function setupRewriteChecks() {
  //     return function ($browser, $location, $rootElement) {
  //       originalBrowser = $browser.url();
  //       // we have to prevent the default operation, as we need to test absolute links (http://...)
  //       // and navigating to these links would kill jstd
  //       $rootElement.on("click", (e) => {
  //         lastEventPreventDefault = e.isDefaultPrevented();
  //         e.preventDefault();
  //       });
  //     };
  //   }

  //   function expectRewriteTo($browser, url) {
  //     expect(lastEventPreventDefault).toBe(true);
  //     expect($browser.url()).toBe(url);
  //   }

  //   function expectNoRewrite($browser) {
  //     expect(lastEventPreventDefault).toBe(false);
  //     expect($browser.url()).toBe(originalBrowser);
  //   }

  //   afterEach(() => {
  //     dealoc(root);
  //     dealoc(document.body);
  //   });

  //   it("should rewrite rel link to new url when history enabled on new browser", () => {
  //     configureTestLink({ linkHref: "link?a#b" });
  //     initService({ html5Mode: true, supportHistory: true });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectRewriteTo($browser, "http://host.com/base/link?a#b");
  //       },
  //     );
  //   });

  //   it("should do nothing if already on the same URL", () => {
  //     configureTestLink({ linkHref: "/base/" });
  //     initService({ html5Mode: true, supportHistory: true });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectRewriteTo($browser, "http://host.com/base/");

  //         (link).getAttribute("href", "http://host.com/base/foo");
  //         browserTrigger(link, "click");
  //         expectRewriteTo($browser, "http://host.com/base/foo");

  //         (link).getAttribute("href", "http://host.com/base/");
  //         browserTrigger(link, "click");
  //         expectRewriteTo($browser, "http://host.com/base/");

  //         (link)
  //           .getAttribute("href", "http://host.com/base/foo")
  //           .on("click", (e) => {
  //             e.preventDefault();
  //           });
  //         browserTrigger(link, "click");
  //         expect($browser.url()).toBe("http://host.com/base/");
  //       },
  //     );
  //   });

  //   it("should rewrite abs link to new url when history enabled on new browser", () => {
  //     configureTestLink({ linkHref: "/base/link?a#b" });
  //     initService({ html5Mode: true, supportHistory: true });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectRewriteTo($browser, "http://host.com/base/link?a#b");
  //       },
  //     );
  //   });

  //   it("should rewrite rel link to hashbang url when history enabled on old browser", () => {
  //     configureTestLink({ linkHref: "link?a#b" });
  //     initService({ html5Mode: true, supportHistory: false, hashPrefix: "!" });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectRewriteTo(
  //           $browser,
  //           "http://host.com/base/index.html#!/link?a#b",
  //         );
  //       },
  //     );
  //   });

  //   // Regression (gh-7721)
  //   it("should not throw when clicking anchor with no href attribute when history enabled on old browser", () => {
  //     configureTestLink({ linkHref: null });
  //     initService({ html5Mode: true, supportHistory: false });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it('should produce relative paths correctly when $location.getPath() is "/" when history enabled on old browser', () => {
  //     configureTestLink({ linkHref: "partial1" });
  //     initService({ html5Mode: true, supportHistory: false, hashPrefix: "!" });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser, $location, $rootScope) => {
  //         $rootScope.$apply(() => {
  //           $location.setPath("/");
  //         });
  //         browserTrigger(link, "click");
  //         expectRewriteTo(
  //           $browser,
  //           "http://host.com/base/index.html#!/partial1",
  //         );
  //       },
  //     );
  //   });

  //   it("should rewrite abs link to hashbang url when history enabled on old browser", () => {
  //     configureTestLink({ linkHref: "/base/link?a#b" });
  //     initService({ html5Mode: true, supportHistory: false, hashPrefix: "!" });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectRewriteTo(
  //           $browser,
  //           "http://host.com/base/index.html#!/link?a#b",
  //         );
  //       },
  //     );
  //   });

  //   it("should not rewrite full url links to different domain", () => {
  //     configureTestLink({ linkHref: "http://www.dot.abc/a?b=c" });
  //     initService({ html5Mode: true });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it('should not rewrite links with target="_blank"', () => {
  //     configureTestLink({ linkHref: "base/a?b=c", attrs: 'target="_blank"' });
  //     initService({ html5Mode: true, supportHistory: true });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it("should not rewrite links with target specified", () => {
  //     configureTestLink({
  //       linkHref: "base/a?b=c",
  //       attrs: 'target="some-frame"',
  //     });
  //     initService({ html5Mode: true, supportHistory: true });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it("should not rewrite links with `javascript:` URI", () => {
  //     configureTestLink({
  //       linkHref: ' jAvAsCrIpT:throw new Error("Boom!")',
  //       relLink: true,
  //     });
  //     initService({ html5Mode: true, supportHistory: true });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it("should not rewrite links with `mailto:` URI", () => {
  //     configureTestLink({ linkHref: " mAiLtO:foo@bar.com", relLink: true });
  //     initService({ html5Mode: true, supportHistory: true });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it("should not rewrite links when rewriting links is disabled", () => {
  //     configureTestLink({ linkHref: "link?a#b" });
  //     initService({
  //       html5Mode: { enabled: true, rewriteLinks: false },
  //       supportHistory: true,
  //     });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it("should rewrite links when the specified rewriteLinks attr is present", () => {
  //     configureTestLink({ linkHref: "link?a#b", attrs: "do-rewrite" });
  //     initService({
  //       html5Mode: { enabled: true, rewriteLinks: "do-rewrite" },
  //       supportHistory: true,
  //     });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectRewriteTo($browser, "http://host.com/base/link?a#b");
  //       },
  //     );
  //   });

  //   it("should not rewrite links when the specified rewriteLinks attr is not present", () => {
  //     configureTestLink({ linkHref: "link?a#b" });
  //     initService({
  //       html5Mode: { enabled: true, rewriteLinks: "do-rewrite" },
  //       supportHistory: true,
  //     });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it("should rewrite full url links to same domain and base path", () => {
  //     configureTestLink({ linkHref: "http://host.com/base/new" });
  //     initService({ html5Mode: true, supportHistory: false, hashPrefix: "!" });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectRewriteTo($browser, "http://host.com/base/index.html#!/new");
  //       },
  //     );
  //   });

  //   it("should rewrite when clicked span inside link", () => {
  //     configureTestLink({
  //       linkHref: "some/link",
  //       attrs: "",
  //       content: "<span>link</span>",
  //     });
  //     initService({ html5Mode: true, supportHistory: true });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         const span = (link).querySelector("span");

  //         browserTrigger(span, "click");
  //         expectRewriteTo($browser, "http://host.com/base/some/link");
  //       },
  //     );
  //   });

  //   it("should not rewrite when link to different base path when history enabled on new browser", () => {
  //     configureTestLink({ linkHref: "/other_base/link" });
  //     initService({ html5Mode: true, supportHistory: true });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it("should not rewrite when link to different base path when history enabled on old browser", () => {
  //     configureTestLink({ linkHref: "/other_base/link" });
  //     initService({ html5Mode: true, supportHistory: true });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it("should not rewrite when link to different base path when history disabled", () => {
  //     configureTestLink({ linkHref: "/other_base/link" });
  //     initService({ html5Mode: false });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it("should not rewrite when full link to different base path when history enabled on new browser", () => {
  //     configureTestLink({ linkHref: "http://host.com/other_base/link" });
  //     initService({ html5Mode: true, supportHistory: true });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it("should not rewrite when full link to different base path when history enabled on old browser", () => {
  //     configureTestLink({ linkHref: "http://host.com/other_base/link" });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it("should not rewrite when full link to different base path when history disabled", () => {
  //     configureTestLink({ linkHref: "http://host.com/other_base/link" });
  //     initService({ html5Mode: false });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it('should replace current hash fragment when link begins with "#" history disabled', () => {
  //     configureTestLink({ linkHref: "#link", relLink: true });
  //     initService({ html5Mode: true, supportHistory: false, hashPrefix: "!" });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser, $location, $rootScope) => {
  //         $rootScope.$apply(() => {
  //           $location.setPath("/some");
  //           $location.setHash("foo");
  //         });
  //         browserTrigger(link, "click");
  //         expect($location.getHash()).toBe("link");
  //         expectRewriteTo(
  //           $browser,
  //           "http://host.com/base/index.html#!/some#link",
  //         );
  //       },
  //     );
  //   });

  //   it('should replace current hash fragment when link begins with "#" history enabled', () => {
  //     configureTestLink({ linkHref: "#link", relLink: true });
  //     initService({ html5Mode: true, supportHistory: true });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser, $location, $rootScope) => {
  //         $rootScope.$apply(() => {
  //           $location.setPath("/some");
  //           $location.setHash("foo");
  //         });
  //         browserTrigger(link, "click");
  //         expect($location.getHash()).toBe("link");
  //         expectRewriteTo($browser, "http://host.com/base/some#link");
  //       },
  //     );
  //   });

  //   it("should not rewrite when clicked with ctrl pressed", () => {
  //     configureTestLink({ linkHref: "base/a?b=c" });
  //     initService({ html5Mode: true, supportHistory: true });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click", { keys: ["ctrl"] });
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it("should not rewrite when clicked with meta pressed", () => {
  //     configureTestLink({ linkHref: "base/a?b=c" });
  //     initService({ html5Mode: true, supportHistory: true });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click", { keys: ["meta"] });
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it("should not rewrite when right click pressed", () => {
  //     configureTestLink({ linkHref: "base/a?b=c" });
  //     initService({ html5Mode: true, supportHistory: true });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         const rightClick = document.createEvent("MouseEvents");
  //         rightClick.initMouseEvent(
  //           "click",
  //           true,
  //           true,
  //           window,
  //           1,
  //           10,
  //           10,
  //           10,
  //           10,
  //           false,
  //           false,
  //           false,
  //           false,
  //           2,
  //           null,
  //         );

  //         link.dispatchEvent(rightClick);
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it("should not rewrite when clicked with shift pressed", () => {
  //     configureTestLink({ linkHref: "base/a?b=c" });
  //     initService({ html5Mode: true, supportHistory: true });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click", { keys: ["shift"] });
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it("should not mess up hash urls when clicking on links in hashbang mode", () => {
  //     let base;
  //     module(
  //       () =>
  //         function ($browser) {
  //           window.location.hash = "someHash";
  //           base = window.location.href;
  //           $browser.url(base);
  //           base = base.split("#")[0];
  //         },
  //     );
  //     inject(
  //       (
  //         $rootScope,
  //         $compile,
  //         $browser,
  //         $rootElement,
  //
  //         $location,
  //       ) => {
  //         // we need to do this otherwise we can't simulate events
  //         $document.querySelector("body").append($rootElement);

  //         const element = $compile(
  //           '<a href="#!/view1">v1</a><a href="#!/view2">v2</a>',
  //         )($rootScope);
  //         $rootElement.append(element);
  //         const av1 = $rootElement.querySelector("a")[0];
  //         const av2 = $rootElement.querySelector("a")[1];

  //         browserTrigger(av1, "click");
  //         expect($browser.url()).toEqual(`${base}#!/view1`);

  //         browserTrigger(av2, "click");
  //         expect($browser.url()).toEqual(`${base}#!/view2`);

  //         $rootElement.remove();
  //       },
  //     );
  //   });

  //   it("should not mess up hash urls when clicking on links in hashbang mode with a prefix", () => {
  //     let base;
  //     module(
  //       ($locationProvider) =>
  //         function ($browser) {
  //           window.location.hash = "!!someHash";
  //           $browser.url((base = window.location.href));
  //           base = base.split("#")[0];
  //           $locationProvider.hashPrefix("!!");
  //         },
  //     );
  //     inject(
  //       (
  //         $rootScope,
  //         $compile,
  //         $browser,
  //         $rootElement,
  //
  //         $location,
  //       ) => {
  //         // we need to do this otherwise we can't simulate events
  //         $document.querySelector("body").append($rootElement);

  //         const element = $compile(
  //           '<a href="#!!/view1">v1</a><a href="#!!/view2">v2</a>',
  //         )($rootScope);
  //         $rootElement.append(element);
  //         const av1 = $rootElement.querySelector("a")[0];
  //         const av2 = $rootElement.querySelector("a")[1];

  //         browserTrigger(av1, "click");
  //         expect($browser.url()).toEqual(`${base}#!!/view1`);

  //         browserTrigger(av2, "click");
  //         expect($browser.url()).toEqual(`${base}#!!/view2`);
  //       },
  //     );
  //   });

  //   it("should not intercept clicks outside the current hash prefix", () => {
  //     let base;
  //     let clickHandler;
  //     module(($provide) => {
  //       $provide.value("$rootElement", {
  //         on(event, handler) {
  //           expect(event).toEqual("click");
  //           clickHandler = handler;
  //         },
  //         off: () => { /* empty */ },
  //       });
  //       return function ($browser) {
  //         $browser.url((base = "http://server/"));
  //       };
  //     });
  //     inject(($location) => {
  //       // make IE happy
  //       (document.body).html(
  //         '<a href="http://server/test.html">link</a>',
  //       );

  //       const event = {
  //         target: (document.body).querySelector("a")[0],
  //         preventDefault: jasmine.createSpy("preventDefault"),
  //         isDefaultPrevented: jasmine.createSpy().and.returnValue(false),
  //       };

  //       clickHandler(event);
  //       expect(event.preventDefault).not.toHaveBeenCalled();
  //     });
  //   });

  //   it("should not intercept hash link clicks outside the app base url space", () => {
  //     let base;
  //     let clickHandler;
  //     module(($provide) => {
  //       $provide.value("$rootElement", {
  //         on(event, handler) {
  //           expect(event).toEqual("click");
  //           clickHandler = handler;
  //         },
  //         off: () => { /* empty */ },
  //       });
  //       return function ($browser) {
  //         $browser.url((base = "http://server/"));
  //       };
  //     });
  //     inject(
  //       (
  //         $rootScope,
  //         $compile,
  //         $browser,
  //         $rootElement,
  //
  //         $location,
  //       ) => {
  //         // make IE happy
  //         (document.body).html(
  //           '<a href="http://server/index.html#test">link</a>',
  //         );

  //         const event = {
  //           target: (document.body).querySelector("a")[0],
  //           preventDefault: jasmine.createSpy("preventDefault"),
  //           isDefaultPrevented: jasmine.createSpy().and.returnValue(false),
  //         };

  //         clickHandler(event);
  //         expect(event.preventDefault).not.toHaveBeenCalled();
  //       },
  //     );
  //   });

  //   // regression https://github.com/angular/angular.js/issues/1058
  //   it("should not throw if element was removed", inject((
  //
  //     $rootElement,
  //     $location,
  //   ) => {
  //     // we need to do this otherwise we can't simulate events
  //     $document.querySelector("body").append($rootElement);

  //     $rootElement.html("<button></button>");
  //     const button = $rootElement.querySelector("button");

  //     button.on("click", () => {
  //       button.remove();
  //     });
  //     browserTrigger(button, "click");
  //   }));

  //   it("should not throw when clicking an SVGAElement link", () => {
  //     let base;
  //     module(
  //       ($locationProvider) =>
  //         function ($browser) {
  //           window.location.hash = "!someHash";
  //           $browser.url((base = window.location.href));
  //           base = base.split("#")[0];
  //           $locationProvider.hashPrefix("!");
  //         },
  //     );
  //     inject(
  //       (
  //         $rootScope,
  //         $compile,
  //         $browser,
  //         $rootElement,
  //
  //         $location,
  //       ) => {
  //         // we need to do this otherwise we can't simulate events
  //         $document.querySelector("body").append($rootElement);
  //         const template =
  //           '<svg><g><a xlink:href="#!/view1"><circle r="50"></circle></a></g></svg>';
  //         const element = $compile(template)($rootScope);

  //         $rootElement.append(element);
  //         const av1 = $rootElement.querySelector("a")[0];
  //         expect(() => {
  //           browserTrigger(av1, "click");
  //         }).not.toThrow();
  //       },
  //     );
  //   });
  // });

  // describe("location cancellation", () => {
  //   it("should fire $before/afterLocationChange event", inject((
  //     $location,
  //     $browser,
  //     $rootScope,
  //     $log,
  //   ) => {
  //     expect($browser.url()).toEqual("http://server/");

  //     $rootScope.$on("$locationChangeStart", (event, newUrl, oldUrl) => {
  //       $log.info("before", newUrl, oldUrl, $browser.url());
  //     });
  //     $rootScope.$on("$locationChangeSuccess", (event, newUrl, oldUrl) => {
  //       $log.info("after", newUrl, oldUrl, $browser.url());
  //     });

  //     expect($location.getUrl()).toEqual("");
  //     $location.setUrl("/somePath");
  //     expect($location.getUrl()).toEqual("/somePath");
  //     expect($browser.url()).toEqual("http://server/");
  //     expect($log.info.logs).toEqual([]);

  //     $rootScope.$apply();

  //     expect($log.info.logs.shift()).toEqual([
  //       "before",
  //       "http://server/#!/somePath",
  //       "http://server/",
  //       "http://server/",
  //     ]);
  //     expect($log.info.logs.shift()).toEqual([
  //       "after",
  //       "http://server/#!/somePath",
  //       "http://server/",
  //       "http://server/#!/somePath",
  //     ]);
  //     expect($location.getUrl()).toEqual("/somePath");
  //     expect($browser.url()).toEqual("http://server/#!/somePath");
  //   }));

  //   it("should allow $locationChangeStart event cancellation", inject((
  //     $location,
  //     $browser,
  //     $rootScope,
  //     $log,
  //   ) => {
  //     expect($browser.url()).toEqual("http://server/");
  //     expect($location.getUrl()).toEqual("");

  //     $rootScope.$on("$locationChangeStart", (event, newUrl, oldUrl) => {
  //       $log.info("before", newUrl, oldUrl, $browser.url());
  //       event.preventDefault();
  //     });
  //     $rootScope.$on("$locationChangeSuccess", (event, newUrl, oldUrl) => {
  //       throw new Error("location should have been canceled");
  //     });

  //     expect($location.getUrl()).toEqual("");
  //     $location.setUrl("/somePath");
  //     expect($location.getUrl()).toEqual("/somePath");
  //     expect($browser.url()).toEqual("http://server/");
  //     expect($log.info.logs).toEqual([]);

  //     $rootScope.$apply();

  //     expect($log.info.logs.shift()).toEqual([
  //       "before",
  //       "http://server/#!/somePath",
  //       "http://server/",
  //       "http://server/",
  //     ]);
  //     expect($log.info.logs[1]).toBeUndefined();
  //     expect($location.getUrl()).toEqual("");
  //     expect($browser.url()).toEqual("http://server/");
  //   }));

  //   it("should allow redirect during $locationChangeStart", inject((
  //     $location,
  //     $browser,
  //     $rootScope,
  //     $log,
  //   ) => {
  //     $rootScope.$on("$locationChangeStart", (event, newUrl, oldUrl) => {
  //       $log.info("before", newUrl, oldUrl, $browser.url());
  //       if (newUrl === "http://server/#!/somePath") {
  //         $location.setUrl("/redirectPath");
  //       }
  //     });
  //     $rootScope.$on("$locationChangeSuccess", (event, newUrl, oldUrl) => {
  //       $log.info("after", newUrl, oldUrl, $browser.url());
  //     });

  //     $location.setUrl("/somePath");
  //     $rootScope.$apply();

  //     expect($log.info.logs.shift()).toEqual([
  //       "before",
  //       "http://server/#!/somePath",
  //       "http://server/",
  //       "http://server/",
  //     ]);
  //     expect($log.info.logs.shift()).toEqual([
  //       "before",
  //       "http://server/#!/redirectPath",
  //       "http://server/",
  //       "http://server/",
  //     ]);
  //     expect($log.info.logs.shift()).toEqual([
  //       "after",
  //       "http://server/#!/redirectPath",
  //       "http://server/",
  //       "http://server/#!/redirectPath",
  //     ]);

  //     expect($location.getUrl()).toEqual("/redirectPath");
  //     expect($browser.url()).toEqual("http://server/#!/redirectPath");
  //   }));

  //   it("should allow redirect during $locationChangeStart even if default prevented", inject((
  //     $location,
  //     $browser,
  //     $rootScope,
  //     $log,
  //   ) => {
  //     $rootScope.$on("$locationChangeStart", (event, newUrl, oldUrl) => {
  //       $log.info("before", newUrl, oldUrl, $browser.url());
  //       if (newUrl === "http://server/#!/somePath") {
  //         event.preventDefault();
  //         $location.setUrl("/redirectPath");
  //       }
  //     });
  //     $rootScope.$on("$locationChangeSuccess", (event, newUrl, oldUrl) => {
  //       $log.info("after", newUrl, oldUrl, $browser.url());
  //     });

  //     $location.setUrl("/somePath");
  //     $rootScope.$apply();

  //     expect($log.info.logs.shift()).toEqual([
  //       "before",
  //       "http://server/#!/somePath",
  //       "http://server/",
  //       "http://server/",
  //     ]);
  //     expect($log.info.logs.shift()).toEqual([
  //       "before",
  //       "http://server/#!/redirectPath",
  //       "http://server/",
  //       "http://server/",
  //     ]);
  //     expect($log.info.logs.shift()).toEqual([
  //       "after",
  //       "http://server/#!/redirectPath",
  //       "http://server/",
  //       "http://server/#!/redirectPath",
  //     ]);

  //     expect($location.getUrl()).toEqual("/redirectPath");
  //     expect($browser.url()).toEqual("http://server/#!/redirectPath");
  //   }));

  //   it("should allow multiple redirect during $locationChangeStart", inject((
  //     $location,
  //     $browser,
  //     $rootScope,
  //     $log,
  //   ) => {
  //     $rootScope.$on("$locationChangeStart", (event, newUrl, oldUrl) => {
  //       $log.info("before", newUrl, oldUrl, $browser.url());
  //       if (newUrl === "http://server/#!/somePath") {
  //         $location.setUrl("/redirectPath");
  //       } else if (newUrl === "http://server/#!/redirectPath") {
  //         $location.setUrl("/redirectPath2");
  //       }
  //     });
  //     $rootScope.$on("$locationChangeSuccess", (event, newUrl, oldUrl) => {
  //       $log.info("after", newUrl, oldUrl, $browser.url());
  //     });

  //     $location.setUrl("/somePath");
  //     $rootScope.$apply();

  //     expect($log.info.logs.shift()).toEqual([
  //       "before",
  //       "http://server/#!/somePath",
  //       "http://server/",
  //       "http://server/",
  //     ]);
  //     expect($log.info.logs.shift()).toEqual([
  //       "before",
  //       "http://server/#!/redirectPath",
  //       "http://server/",
  //       "http://server/",
  //     ]);
  //     expect($log.info.logs.shift()).toEqual([
  //       "before",
  //       "http://server/#!/redirectPath2",
  //       "http://server/",
  //       "http://server/",
  //     ]);
  //     expect($log.info.logs.shift()).toEqual([
  //       "after",
  //       "http://server/#!/redirectPath2",
  //       "http://server/",
  //       "http://server/#!/redirectPath2",
  //     ]);

  //     expect($location.getUrl()).toEqual("/redirectPath2");
  //     expect($browser.url()).toEqual("http://server/#!/redirectPath2");
  //   }));

  //   it("should fire $locationChangeSuccess event when change from browser location bar", inject((
  //     $log,
  //     $location,
  //     $browser,
  //     $rootScope,
  //   ) => {
  //     $rootScope.$apply(); // clear initial $locationChangeStart

  //     expect($browser.url()).toEqual("http://server/");
  //     expect($location.getUrl()).toEqual("");

  //     $rootScope.$on("$locationChangeStart", (event, newUrl, oldUrl) => {
  //       $log.info("start", newUrl, oldUrl);
  //     });
  //     $rootScope.$on("$locationChangeSuccess", (event, newUrl, oldUrl) => {
  //       $log.info("after", newUrl, oldUrl);
  //     });

  //     $browser.url("http://server/#!/somePath");
  //     $browser.poll();

  //     expect($log.info.logs.shift()).toEqual([
  //       "start",
  //       "http://server/#!/somePath",
  //       "http://server/",
  //     ]);
  //     expect($log.info.logs.shift()).toEqual([
  //       "after",
  //       "http://server/#!/somePath",
  //       "http://server/",
  //     ]);
  //   }));

  //   it("should fire $locationChangeSuccess when browser location changes to URL which ends with #", inject((
  //     $location,
  //     $browser,
  //     $rootScope,
  //     $log,
  //   ) => {
  //     $location.setUrl("/somepath");
  //     $rootScope.$apply();

  //     expect($browser.url()).toEqual("http://server/#!/somepath");
  //     expect($location.getUrl()).toEqual("/somepath");

  //     $rootScope.$on("$locationChangeStart", (event, newUrl, oldUrl) => {
  //       $log.info("start", newUrl, oldUrl);
  //     });
  //     $rootScope.$on("$locationChangeSuccess", (event, newUrl, oldUrl) => {
  //       $log.info("after", newUrl, oldUrl);
  //     });

  //     $browser.url("http://server/#");
  //     $browser.poll();

  //     expect($log.info.logs.shift()).toEqual([
  //       "start",
  //       "http://server/",
  //       "http://server/#!/somepath",
  //     ]);
  //     expect($log.info.logs.shift()).toEqual([
  //       "after",
  //       "http://server/",
  //       "http://server/#!/somepath",
  //     ]);
  //   }));

  //   it("should allow redirect during browser url change", inject((
  //     $location,
  //     $browser,
  //     $rootScope,
  //     $log,
  //   ) => {
  //     $rootScope.$on("$locationChangeStart", (event, newUrl, oldUrl) => {
  //       $log.info("before", newUrl, oldUrl, $browser.url());
  //       if (newUrl === "http://server/#!/somePath") {
  //         $location.setUrl("/redirectPath");
  //       }
  //     });
  //     $rootScope.$on("$locationChangeSuccess", (event, newUrl, oldUrl) => {
  //       $log.info("after", newUrl, oldUrl, $browser.url());
  //     });

  //     $browser.url("http://server/#!/somePath");
  //     $browser.poll();

  //     expect($log.info.logs.shift()).toEqual([
  //       "before",
  //       "http://server/#!/somePath",
  //       "http://server/",
  //       "http://server/#!/somePath",
  //     ]);
  //     expect($log.info.logs.shift()).toEqual([
  //       "before",
  //       "http://server/#!/redirectPath",
  //       "http://server/#!/somePath",
  //       "http://server/#!/somePath",
  //     ]);
  //     expect($log.info.logs.shift()).toEqual([
  //       "after",
  //       "http://server/#!/redirectPath",
  //       "http://server/#!/somePath",
  //       "http://server/#!/redirectPath",
  //     ]);

  //     expect($location.getUrl()).toEqual("/redirectPath");
  //     expect($browser.url()).toEqual("http://server/#!/redirectPath");
  //   }));

  //   it("should allow redirect during browser url change even if default prevented", inject((
  //     $location,
  //     $browser,
  //     $rootScope,
  //     $log,
  //   ) => {
  //     $rootScope.$on("$locationChangeStart", (event, newUrl, oldUrl) => {
  //       $log.info("before", newUrl, oldUrl, $browser.url());
  //       if (newUrl === "http://server/#!/somePath") {
  //         event.preventDefault();
  //         $location.setUrl("/redirectPath");
  //       }
  //     });
  //     $rootScope.$on("$locationChangeSuccess", (event, newUrl, oldUrl) => {
  //       $log.info("after", newUrl, oldUrl, $browser.url());
  //     });

  //     $browser.url("http://server/#!/somePath");
  //     $browser.poll();

  //     expect($log.info.logs.shift()).toEqual([
  //       "before",
  //       "http://server/#!/somePath",
  //       "http://server/",
  //       "http://server/#!/somePath",
  //     ]);
  //     expect($log.info.logs.shift()).toEqual([
  //       "before",
  //       "http://server/#!/redirectPath",
  //       "http://server/#!/somePath",
  //       "http://server/#!/somePath",
  //     ]);
  //     expect($log.info.logs.shift()).toEqual([
  //       "after",
  //       "http://server/#!/redirectPath",
  //       "http://server/#!/somePath",
  //       "http://server/#!/redirectPath",
  //     ]);

  //     expect($location.getUrl()).toEqual("/redirectPath");
  //     expect($browser.url()).toEqual("http://server/#!/redirectPath");
  //   }));

  //   it("should listen on click events on href and prevent browser default in hashbang mode", () => {
  //     module(
  //       () =>
  //         function ($rootElement, $compile, $rootScope) {
  //           $rootElement.html('<a href="http://server/#!/somePath">link</a>');
  //           $compile($rootElement)($rootScope);
  //           (document.body).append($rootElement);
  //         },
  //     );

  //     inject(($location, $rootScope, $browser, $rootElement) => {
  //       let log = "";
  //       const link = $rootElement.find("a");

  //       $rootScope.$on("$locationChangeStart", (event) => {
  //         event.preventDefault();
  //         log += "$locationChangeStart";
  //       });
  //       $rootScope.$on("$locationChangeSuccess", () => {
  //         throw new Error("after cancellation in hashbang mode");
  //       });

  //       browserTrigger(link, "click");

  //       expect(log).toEqual("$locationChangeStart");
  //       expect($browser.url()).toEqual("http://server/");

  //       dealoc($rootElement);
  //     });
  //   });

  //   it("should listen on click events on href and prevent browser default in html5 mode", () => {
  //     module(($locationProvider, $provide) => {
  //       $locationProvider.setHtml5Mode(true);
  //       return function ($rootElement, $compile, $rootScope) {
  //         $rootElement.html('<a href="http://server/somePath">link</a>');
  //         $compile($rootElement)($rootScope);
  //         (document.body).append($rootElement);
  //       };
  //     });

  //     inject(($location, $rootScope, $browser, $rootElement) => {
  //       let log = "";
  //       const link = $rootElement.querySelector("a");
  //       const browserUrlBefore = $browser.url();

  //       $rootScope.$on("$locationChangeStart", (event) => {
  //         event.preventDefault();
  //         log += "$locationChangeStart";
  //       });
  //       $rootScope.$on("$locationChangeSuccess", () => {
  //         throw new Error("after cancellation in html5 mode");
  //       });

  //       browserTrigger(link, "click");

  //       expect(log).toEqual("$locationChangeStart");
  //       expect($browser.url()).toBe(browserUrlBefore);

  //       dealoc($rootElement);
  //     });
  //   });

  //   it("should always return the new url value via path() when $locationChangeStart event occurs regardless of cause", inject((
  //     $location,
  //     $rootScope,
  //     $browser,
  //     log,
  //   ) => {
  //     const base = $browser.url();

  //     $rootScope.$on("$locationChangeStart", () => {
  //       log($location.getPath());
  //     });

  //     // change through $location service
  //     $rootScope.$apply(() => {
  //       $location.setPath("/myNewPath");
  //     });

  //     // reset location
  //     $rootScope.$apply(() => {
  //       $location.setPath("");
  //     });

  //     // change through $browser
  //     $browser.url(`${base}#!/myNewPath`);
  //     $browser.poll();

  //     expect(log).toEqual(["/myNewPath", "/", "/myNewPath"]);
  //   }));
  // });

  describe("$locationProvider", () => {
    describe("html5ModeConf", () => {
      it("should have default values", () => {
        module.config(($locationProvider) => {
          expect($locationProvider.html5ModeConf).toEqual({
            enabled: true,
            requireBase: false,
            rewriteLinks: true,
          });
        });
        createInjector(["test1"]);
      });
    });
  });

  describe("Location with html5 url", () => {
    let locationUrl;
    let locationUmlautUrl;
    let locationIndexUrl;

    beforeEach(() => {
      locationUrl = new Location("http://server/pre/", "http://server/pre/");
      locationUmlautUrl = new Location(
        "http://särver/pre/",
        "http://särver/pre/",
      );
      locationIndexUrl = new Location(
        "http://server/pre/index.html",
        "http://server/pre/",
      );
    });

    it("should rewrite URL", () => {
      expect(parseLinkAndReturn(locationUrl, "http://other")).toEqual(
        undefined,
      );
      expect(parseLinkAndReturn(locationUrl, "http://server/pre")).toEqual(
        "http://server/pre/",
      );
      expect(parseLinkAndReturn(locationUrl, "http://server/pre/")).toEqual(
        "http://server/pre/",
      );
      expect(
        parseLinkAndReturn(locationUrl, "http://server/pre/otherPath"),
      ).toEqual("http://server/pre/otherPath");
      // Note: relies on the previous state!
      expect(
        parseLinkAndReturn(locationUrl, "someIgnoredAbsoluteHref", "#test"),
      ).toEqual("http://server/pre/otherPath#test");

      expect(parseLinkAndReturn(locationUmlautUrl, "http://other")).toEqual(
        undefined,
      );
      expect(
        parseLinkAndReturn(locationUmlautUrl, "http://särver/pre"),
      ).toEqual("http://särver/pre/");
      expect(
        parseLinkAndReturn(locationUmlautUrl, "http://särver/pre/"),
      ).toEqual("http://särver/pre/");
      expect(
        parseLinkAndReturn(locationUmlautUrl, "http://särver/pre/otherPath"),
      ).toEqual("http://särver/pre/otherPath");
      // Note: relies on the previous state!
      expect(
        parseLinkAndReturn(
          locationUmlautUrl,
          "someIgnoredAbsoluteHref",
          "#test",
        ),
      ).toEqual("http://särver/pre/otherPath#test");

      expect(parseLinkAndReturn(locationIndexUrl, "http://server/pre")).toEqual(
        "http://server/pre/",
      );
      expect(
        parseLinkAndReturn(locationIndexUrl, "http://server/pre/"),
      ).toEqual("http://server/pre/");
      expect(
        parseLinkAndReturn(locationIndexUrl, "http://server/pre/otherPath"),
      ).toEqual("http://server/pre/otherPath");
      // Note: relies on the previous state!
      expect(
        parseLinkAndReturn(locationUrl, "someIgnoredAbsoluteHref", "#test"),
      ).toEqual("http://server/pre/otherPath#test");
    });

    it("should complain if the path starts with double slashes", () => {
      expect(() => {
        parseLinkAndReturn(locationUrl, "http://server/pre///other/path");
      }).toThrowError(/badpath/);

      expect(() => {
        parseLinkAndReturn(locationUrl, "http://server/pre/\\\\other/path");
      }).toThrowError(/badpath/);

      expect(() => {
        parseLinkAndReturn(locationUrl, "http://server/pre//\\//other/path");
      }).toThrowError(/badpath/);
    });

    // it("should complain if no base tag present", () => {
    //   let module = window.angular.module("test1", ["ng"]);
    //   module.config((_$locationProvider_) => {
    //     $locationProvider.setHtml5Mode(true);
    //   });

    //   createInjector(["test1"]).invoke(($browser, $injector) => {
    //     $browser.$$baseHref = undefined;
    //     expect(() => {
    //       $injector.get("$location");
    //     }).toThrowError(/nobase/);
    //   });
    // });

    // it("should not complain if baseOptOut set to true in html5Mode", () => {
    //   module.config(($locationProvider) => {
    //     $locationProvider.setHtml5Mode({
    //       enabled: true,
    //       requireBase: false,
    //     });
    //   });

    //   inject(($browser, $injector) => {
    //     $browser.$$baseHref = undefined;
    //     expect(() => {
    //       $injector.get("$location");
    //     }).not.toThrow(
    //       "$location",
    //       "nobase",
    //       "$location in HTML5 mode requires a <base> tag to be present!",
    //     );
    //   });
    // });

    it("should support state", () => {
      expect(locationUrl.setState({ a: 2 }).getState()).toEqual({ a: 2 });
    });
  });

  describe("Location with hashbang url", () => {
    let locationUrl;

    it("should rewrite URL", () => {
      locationUrl = new Location(
        "http://server/pre/",
        "http://server/pre/",
        false,
        "#",
      );

      expect(parseLinkAndReturn(locationUrl, "http://other")).toEqual(
        undefined,
      );
      expect(parseLinkAndReturn(locationUrl, "http://server/pre/")).toEqual(
        "http://server/pre/",
      );
      expect(
        parseLinkAndReturn(locationUrl, "http://server/pre/#otherPath"),
      ).toEqual("http://server/pre/#/otherPath");

      expect(parseLinkAndReturn(locationUrl, "javascript:void(0)")).toEqual(
        undefined,
      );
    });

    it("should not set hash if one was not originally specified", () => {
      locationUrl = new Location(
        "http://server/pre/index.html",
        "http://server/pre/",
        false,
        "#",
      );

      locationUrl.parse("http://server/pre/index.html");
      expect(locationUrl.getUrl()).toBe("");
      expect(locationUrl.absUrl).toBe("http://server/pre/index.html");
    });

    it("should parse hash if one was specified", () => {
      locationUrl = new Location(
        "http://server/pre/index.html",
        "http://server/pre/",
        false,
        "#",
      );

      locationUrl.parse("http://server/pre/index.html#/foo/bar");
      expect(locationUrl.getUrl()).toBe("/foo/bar");
      expect(locationUrl.absUrl).toBe("http://server/pre/index.html#/foo/bar");
    });

    it("should prefix hash url with / if one was originally missing", () => {
      locationUrl = new Location(
        "http://server/pre/index.html",
        "http://server/pre/",
        false,
        "#",
      );

      locationUrl.parse("http://server/pre/index.html#not-starting-with-slash");
      expect(locationUrl.getUrl()).toBe("/not-starting-with-slash");
      expect(locationUrl.absUrl).toBe(
        "http://server/pre/index.html#/not-starting-with-slash",
      );
    });

    it("should not strip stuff from path just because it looks like Windows drive when it's not", () => {
      locationUrl = new Location(
        "http://server/pre/index.html",
        "http://server/pre/",
        false,
        "#",
      );

      locationUrl.parse(
        "http://server/pre/index.html#http%3A%2F%2Fexample.com%2F",
      );
      expect(locationUrl.getUrl()).toBe("/http://example.com/");
      expect(locationUrl.absUrl).toBe(
        "http://server/pre/index.html#/http://example.com/",
      );
    });

    it("should allow navigating outside the original base URL", () => {
      locationUrl = new Location(
        "http://server/pre/index.html",
        "http://server/pre/",
        false,
        "#",
      );

      locationUrl.parse("http://server/next/index.html");
      expect(locationUrl.getUrl()).toBe("");
      expect(locationUrl.absUrl).toBe("http://server/next/index.html");
    });
  });

  // function mockUpBrowser(options) {
  //   module(($windowProvider, $browserProvider) => {
  //     let browser;
  //     const parser = document.createElement("a");
  //     parser.href = options.initialUrl;

  //     $windowProvider.$get = () => {
  //       const win = {};
  //       angular.extend(win, window);
  //       // Ensure `window` is a reference to the mock global object, so that
  //       // JQLite does the right thing.
  //       win.window = win;
  //       win.history = {
  //         state: options.state || null,
  //         replaceState(state, title, url) {
  //           win.history.state = copy(state);
  //           if (url) win.location.href = url;
  //         },
  //         pushState(state, title, url) {
  //           win.history.state = copy(state);
  //           if (url) win.location.href = url;
  //         },
  //       };
  //       win.addEventListener = () => { /* empty */ };
  //       win.removeEventListener = () => { /* empty */ };
  //       win.location = {
  //         get href() {
  //           return this.$$getHref();
  //         },
  //         $$getHref() {
  //           return parser.href;
  //         },
  //         set href(val) {
  //           this.$$setHref(val);
  //         },
  //         $$setHref(val) {
  //           parser.href = val;
  //         },
  //         get hash() {
  //           return parser.hash;
  //         },
  //         // The parser correctly strips on a single preceding hash character if necessary
  //         // before joining the fragment onto the href by a new hash character
  //         // See hash setter spec: https://url.spec.whatwg.org/#urlutils-and-urlutilsreadonly-members
  //         set hash(val) {
  //           parser.hash = val;
  //         },

  //         replace(val) {
  //           win.location.href = val;
  //         },
  //       };
  //       return win;
  //     };
  //     $browserProvider.$get = function (
  //
  //       $window,
  //       $log,
  //       $sniffer,
  //       $$taskTrackerFactory,
  //     ) {
  //       browser = new Browser(
  //         $window,
  //
  //         $log,
  //         $sniffer,
  //         $$taskTrackerFactory,
  //       );
  //       browser.baseHref = () => {
  //         return options.baseHref;
  //       };
  //       return browser;
  //     };
  //   });
  // }

  function initBrowser(options) {
    return function ($browser) {
      $browser.url(options.url);
      $browser.$$baseHref = options.basePath;
    };
  }

  function expectThrowOnStateChange(location) {
    expect(() => {
      location.state({ a: 2 });
    }).toThrowError(/nostate/);
  }

  function parseLinkAndReturn(location, url, relHref) {
    if (location.parseLinkUrl(url, relHref)) {
      return location.absUrl;
    }
    return undefined;
  }
});
