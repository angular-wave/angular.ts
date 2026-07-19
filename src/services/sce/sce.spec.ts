// @ts-nocheck
/// <reference types="jasmine" />
import { createInjector } from "../../core/di/injector.ts";
import { Angular } from "../../angular.ts";
import { adjustMatcher, SCE_CONTEXTS } from "./sce.ts";
import { wait } from "../../shared/test-utils.ts";

describe("SCE", () => {
  let $sce, $rootScope;

  const sceDelegateConfig = {
    trustedResourceUrlList(value) {
      window.angular._composition.configRegistry.configure("$sceDelegate", {
        trustedResourceUrlList: value,
      });
    },
    bannedResourceUrlList(value) {
      window.angular._composition.configRegistry.configure("$sceDelegate", {
        bannedResourceUrlList: value,
      });
    },
  };

  let logs = [];

  const errorLog = [];

  describe("when disabled", () => {
    beforeEach(() => {
      window.angular = new Angular();
      window.angular
        .module("myModule", ["ng"])
        .config({
          $sce: { enabled: false },
          $exceptionHandler: {
            handler: (err) => logs.push(err.message),
          },
        })
        .decorator("$exceptionHandler", () => {
          return (exception) => {
            errorLog.push(exception.message);
          };
        });
      createInjector(["myModule"]).invoke([
        "$sce",
        (_$sce_) => {
          $sce = _$sce_;
        },
      ]);
    });

    it("should provide the getter for enabled", () => {
      expect($sce.isEnabled()).toBe(false);
    });
  });

  describe("when enabled", () => {
    beforeEach(() => {
      window.angular = new Angular();
      logs = [];
      window.angular.module("sceEnabled", ["ng"]).config({
        $sce: { enabled: true },
        $exceptionHandler: {
          handler: (err) => {
            logs.push(err.message);
          },
        },
      });
      createInjector(["sceEnabled"]).invoke([
        "$sce",
        (_$sce_) => {
          $sce = _$sce_;
        },
      ]);
    });

    it("should wrap string values with TrustedValueHolder", () => {
      const originalValue = "original_value";

      let wrappedValue = $sce.trustAs(SCE_CONTEXTS._HTML, originalValue);

      expect(typeof wrappedValue).toBe("object");
      expect(String($sce.getTrusted(SCE_CONTEXTS._HTML, wrappedValue))).toBe(
        "original_value",
      );
      $sce.getTrusted(
        SCE_CONTEXTS._HTML,
        $sce.trustAs(SCE_CONTEXTS._URL, originalValue),
      );
      expect(logs[0]).toMatch(/unsafe/);
      wrappedValue = $sce.trustAs(SCE_CONTEXTS._URL, originalValue);
      expect(typeof wrappedValue).toBe("object");
      expect($sce.getTrusted(SCE_CONTEXTS._URL, wrappedValue)).toBe(
        "original_value",
      );
    });

    it("should use a registered HTML sanitizer", () => {
      const sanitize = jasmine
        .createSpy("sanitize")
        .and.callFake((value) => `sanitized:${value}`);

      window.angular = new Angular();
      window.angular
        .module("sceWithSanitizer", ["ng"])
        .value("$sanitize", sanitize)
        .config({ $sce: { enabled: true } });

      createInjector(["sceWithSanitizer"]).invoke([
        "$sce",
        (_$sce_) => {
          expect(_$sce_.getTrustedHtml("<b>x</b>")).toBe("sanitized:<b>x</b>");
        },
      ]);
      expect(sanitize).toHaveBeenCalledOnceWith("<b>x</b>");
    });

    it("should NOT wrap non-string values", () => {
      $sce.trustAsUrl(123);
      expect(logs[0]).toMatch(/itype/);
    });

    it("should NOT wrap unknown contexts", () => {
      $sce.trustAs("unknown1", "123");
      expect(logs[0]).toMatch(/icontext/);
    });

    it("should NOT wrap undefined context", () => {
      $sce.trustAs(undefined, "123");
      expect(logs[0]).toMatch(/icontext/);
    });

    it("should wrap undefined into undefined", () => {
      expect($sce.trustAsHtml(undefined)).toBeUndefined();
    });

    it("should unwrap undefined into undefined", () => {
      expect($sce.getTrusted(SCE_CONTEXTS._HTML, undefined)).toBeUndefined();
    });

    it("should wrap null into null", () => {
      expect($sce.trustAsHtml(null)).toBe(null);
    });

    it("should unwrap null into null", () => {
      expect($sce.getTrusted(SCE_CONTEXTS._HTML, null)).toBe(null);
    });

    it('should wrap "" into ""', () => {
      expect($sce.trustAsHtml("")).toBe("");
    });

    it('should unwrap "" into ""', () => {
      expect($sce.getTrusted(SCE_CONTEXTS._HTML, "")).toBe("");
    });

    it("should unwrap values and return the original", () => {
      const originalValue = "originalValue";

      const wrappedValue = $sce.trustAs(SCE_CONTEXTS._HTML, originalValue);

      expect(String($sce.getTrusted(SCE_CONTEXTS._HTML, wrappedValue))).toBe(
        originalValue,
      );
    });

    it("should NOT unwrap values when the type is different", () => {
      const originalValue = "originalValue";

      const wrappedValue = $sce.trustAs(SCE_CONTEXTS._URL, originalValue);

      $sce.getTrusted(SCE_CONTEXTS._HTML, wrappedValue);
      expect(logs[0]).toMatch(/unsafe/);
    });

    it("should NOT unwrap values that had not been wrapped", () => {
      function TrustedValueHolder(trustedValue) {
        this.$unwrapTrustedValue = function () {
          return trustedValue;
        };
      }
      const wrappedValue = new TrustedValueHolder("originalValue");

      $sce.getTrusted(SCE_CONTEXTS._HTML, wrappedValue);
      expect(logs[0]).toMatch(/unsafe/);
    });

    it("should implement toString on trusted values", () => {
      const originalValue = "123";

      const wrappedValue = $sce.trustAsHtml(originalValue);

      expect(String($sce.getTrustedHtml(wrappedValue))).toBe(originalValue);
      expect(wrappedValue.toString()).toBe(originalValue.toString());
      expect(wrappedValue.valueOf()).toBe(originalValue);
    });

    it("should preserve empty URL values", () => {
      expect($sce.getTrustedUrl(null)).toBeNull();
      expect($sce.getTrustedUrl(undefined)).toBeUndefined();
      expect($sce.getTrustedUrl("")).toBe("");
    });

    it("should reject values requested for an unknown context", () => {
      $sce.getTrusted("unknown", "value");

      expect(logs[0]).toMatch(/unsafe/);
    });

    it("should return native trusted values for trusted HTML when available", () => {
      if (!window.trustedTypes) {
        return;
      }

      const trustedHtml = $sce.getTrustedHtml($sce.trustAsHtml("<b>x</b>"));

      expect(trustedHtml instanceof window.TrustedHTML).toBe(true);
      expect(String(trustedHtml)).toBe("<b>x</b>");
    });
  });

  describe("replace $sceDelegate", () => {
    it("should override the default $sce.trustAs/valueOf/etc.", () => {
      window.angular = new Angular();
      window.angular
        .module("sceDelegateOverride", ["ng"])
        .value("$sceDelegate", {
          trustAs(type, value) {
            return `wrapped:${value}`;
          },
          getTrusted(type, value) {
            return `unwrapped:${value}`;
          },
          valueOf(value) {
            return `valueOf:${value}`;
          },
        });
      createInjector(["sceDelegateOverride"]).invoke([
        "$sce",
        (_$sce_) => {
          $sce = _$sce_;
        },
      ]);
      expect($sce.valueOf("value")).toBe("valueOf:value");
    });
  });

  describe("$sce.parseAs", () => {
    beforeEach(function () {
      logs = [];
      window.angular = new Angular();
      window.angular.module("sceParseAs", ["ng"]).config({
        $exceptionHandler: {
          handler: (err) => logs.push(err.message),
        },
      });
      createInjector(["sceParseAs"]).invoke([
        "$sce",
        "$rootScope",
        (_$sce_, _$rootScope_) => {
          $sce = _$sce_;
          $rootScope = _$rootScope_;
        },
      ]);
      logs = [];
    });

    it("should NOT return untrusted values from expression function", () => {
      const exprFn = $sce.parseAs(SCE_CONTEXTS._HTML, "foo");

      exprFn({}, { foo: true });
      expect(logs[0]).toMatch(/unsafe/);
    });

    it("should return trusted values from expression function", () => {
      const exprFn = $sce.parseAs(SCE_CONTEXTS._HTML, "foo");

      const result = exprFn(
        {},
        { foo: $sce.trustAs(SCE_CONTEXTS._HTML, "trustedValue") },
      );

      if (window.TrustedHTML) {
        expect(result).toEqual(jasmine.any(window.TrustedHTML));
      }
      expect(String(result)).toBe("trustedValue");
    });

    it("should support shorthand methods", () => {
      // Test shorthand parse methods.
      expect($sce.parseAsHtml("1")()).toBe(1);
      // Test short trustAs methods.
      expect($sce.trustAsAny).toBeUndefined();
      $sce.parseAsHtml("foo")({}, { foo: $sce.trustAsUrl("1") });
      expect(logs[0]).toMatch(/unsafe/);
    });
  });

  describe("$sceDelegate resource url policies", () => {
    beforeEach(() => {
      logs = [];
      window.angular = new Angular();
      window.angular.module("sceResourcePolicies", ["ng"]).config({
        $exceptionHandler: {
          handler: (err) => logs.push(err.message),
        },
      });
      createInjector(["sceResourcePolicies"]).invoke([
        "$sce",
        (_$sce_) => {
          $sce = _$sce_;
        },
      ]);
    });

    it('should default to "self" which allows relative urls', () => {
      expect($sce.getTrustedResourceUrl("foo/bar")).toEqual("foo/bar");
    });

    it("should reject everything when trusted resource URL list is empty", () => {
      sceDelegateConfig.trustedResourceUrlList([]);
      sceDelegateConfig.bannedResourceUrlList([]);
      $sce.getTrustedResourceUrl("#");
      expect(logs[0]).toMatch(/insecurl/);
    });

    it("should match against normalized urls", () => {
      sceDelegateConfig.trustedResourceUrlList([/^foo$/]);
      sceDelegateConfig.bannedResourceUrlList([]);
      $sce.getTrustedResourceUrl("foo");
      expect(logs[0]).toMatch(/insecurl/);
    });

    it("should not accept unknown matcher type", () => {
      expect(() => {
        sceDelegateConfig.trustedResourceUrlList([{}]);
      }).toThrowError(/imatcher/);
    });

    describe("adjustMatcher", () => {
      it("should rewrite regex into regex and add ^ & $ on either end", () => {
        expect(adjustMatcher(/a.*b/).exec("a.b")).not.toBeNull();
        expect(adjustMatcher(/a.*b/).exec("-a.b-")).toBeNull();
        // Adding ^ & $ onto a regex that already had them should also work.
        expect(adjustMatcher(/^a.*b$/).exec("a.b")).not.toBeNull();
        expect(adjustMatcher(/^a.*b$/).exec("-a.b-")).toBeNull();
      });

      it("should should match * and **", () => {
        expect(
          adjustMatcher("*://*.example.com/**").exec(
            "http://www.example.com/path",
          ),
        ).not.toBeNull();
      });
    });

    describe("regex matcher", () => {
      beforeEach(() => {
        window.angular = new Angular();
        window.angular.module("sceRegexMatcher", ["ng"]).config({
          $exceptionHandler: {
            handler: (err) => logs.push(err.message),
          },
        });
        createInjector(["sceRegexMatcher"]).invoke([
          "$sce",
          (_$sce_) => {
            $sce = _$sce_;
          },
        ]);
      });

      it("should support custom regex", () => {
        sceDelegateConfig.trustedResourceUrlList([
          /^http:\/\/example\.com\/.*/,
        ]);
        sceDelegateConfig.bannedResourceUrlList([]);
        expect($sce.getTrustedResourceUrl("http://example.com/foo")).toEqual(
          "http://example.com/foo",
        );
        // must match entire regex

        $sce.getTrustedResourceUrl("https://example.com/foo");
        expect(logs[0]).toMatch(/insecurl/);
        // https doesn't match (mismatched protocol.)
        $sce.getTrustedResourceUrl("https://example.com/foo");
        expect(logs[1]).toMatch(/insecurl/);
      });

      it("should match entire regex", () => {
        sceDelegateConfig.trustedResourceUrlList([
          /https?:\/\/example\.com\/foo/,
        ]);
        sceDelegateConfig.bannedResourceUrlList([]);
        expect($sce.getTrustedResourceUrl("http://example.com/foo")).toEqual(
          "http://example.com/foo",
        );
        expect($sce.getTrustedResourceUrl("https://example.com/foo")).toEqual(
          "https://example.com/foo",
        );
        $sce.getTrustedResourceUrl("http://example.com/fo");
        expect(logs[0]).toMatch(/insecurl/);
        // Suffix not allowed even though original regex does not contain an ending $.
        $sce.getTrustedResourceUrl("http://example.com/foo2");
        expect(logs[1]).toMatch(/insecurl/);
        // Prefix not allowed even though original regex does not contain a leading ^.
        $sce.getTrustedResourceUrl("xhttp://example.com/foo");
        expect(logs[2]).toMatch(/insecurl/);
      });
    });

    describe("string matchers", () => {
      beforeEach(() => {
        logs = [];
        window.angular = new Angular();
        window.angular.module("sceStringMatchers", ["ng"]).config({
          $exceptionHandler: {
            handler: (err) => logs.push(err.message),
          },
        });
        createInjector(["sceStringMatchers"]).invoke([
          "$sce",
          (_$sce_) => {
            $sce = _$sce_;
          },
        ]);
      });

      it("should support strings as matchers", () => {
        sceDelegateConfig.trustedResourceUrlList(["http://example.com/foo"]);
        sceDelegateConfig.bannedResourceUrlList([]);
        expect($sce.getTrustedResourceUrl("http://example.com/foo")).toEqual(
          "http://example.com/foo",
        );
        // "." is not a special character like in a regex.
        $sce.getTrustedResourceUrl("http://example-com/foo");
        expect(logs[0]).toMatch(/insecurl/);
        // You can match a prefix.
        $sce.getTrustedResourceUrl("http://example.com/foo2");
        expect(logs[1]).toMatch(/insecurl/);
        // You can match a suffix.
        $sce.getTrustedResourceUrl("xhttp://example.com/foo");
        expect(logs[2]).toMatch(/insecurl/);
      });

      it("should support the * wildcard", () => {
        sceDelegateConfig.trustedResourceUrlList(["http://example.com/foo*"]);
        sceDelegateConfig.bannedResourceUrlList([]);
        expect($sce.getTrustedResourceUrl("http://example.com/foo")).toEqual(
          "http://example.com/foo",
        );
        // The * wildcard should match extra characters.
        expect(
          $sce.getTrustedResourceUrl("http://example.com/foo-bar"),
        ).toEqual("http://example.com/foo-bar");
        // The * wildcard does not match ':'
        $sce.getTrustedResourceUrl("http://example-com/foo:bar");
        expect(logs[0]).toMatch(/insecurl/);
        // The * wildcard does not match '/'
        $sce.getTrustedResourceUrl("http://example-com/foo/bar");
        expect(logs[1]).toMatch(/insecurl/);
        // The * wildcard does not match '.'
        $sce.getTrustedResourceUrl("http://example-com/foo.bar");
        expect(logs[2]).toMatch(/insecurl/);
        // The * wildcard does not match '?'
        $sce.getTrustedResourceUrl("http://example-com/foo?bar");
        expect(logs[3]).toMatch(/insecurl/);
        // The * wildcard does not match '&'
        $sce.getTrustedResourceUrl("http://example-com/foo&bar");
        expect(logs[4]).toMatch(/insecurl/);
        // The * wildcard does not match ';'
        $sce.getTrustedResourceUrl("http://example-com/foo;bar");
        expect(logs[5]).toMatch(/insecurl/);
      });

      it("should support the ** wildcard", () => {
        sceDelegateConfig.trustedResourceUrlList(["http://example.com/foo**"]);
        sceDelegateConfig.bannedResourceUrlList([]);
        expect($sce.getTrustedResourceUrl("http://example.com/foo")).toEqual(
          "http://example.com/foo",
        );
        // The ** wildcard should match extra characters.
        expect(
          $sce.getTrustedResourceUrl("http://example.com/foo-bar"),
        ).toEqual("http://example.com/foo-bar");
        // The ** wildcard accepts the ':/.?&' characters.
        expect(
          $sce.getTrustedResourceUrl("http://example.com/foo:1/2.3?4&5-6"),
        ).toEqual("http://example.com/foo:1/2.3?4&5-6");
      });

      it("should not accept *** in the string", () => {
        expect(() => {
          sceDelegateConfig.trustedResourceUrlList(["http://***"]);
        }).toThrowError(/iwcard/);
      });
    });

    describe('"self" matcher', () => {
      beforeEach(() => {
        logs = [];
        window.angular = new Angular();
        window.angular.module("sceSelfMatcher", ["ng"]).config({
          $exceptionHandler: {
            handler: (err) => logs.push(err.message),
          },
        });
        createInjector(["sceSelfMatcher"]).invoke([
          "$sce",
          (_$sce_) => {
            $sce = _$sce_;
          },
        ]);
      });

      it('should support the special string "self" in trusted resource URL list', () => {
        sceDelegateConfig.trustedResourceUrlList(["self"]);
        sceDelegateConfig.bannedResourceUrlList([]);
        expect($sce.getTrustedResourceUrl("foo")).toEqual("foo");
      });

      it('should support the special string "self" in baneed resource URL list', () => {
        sceDelegateConfig.trustedResourceUrlList([/.*/]);
        sceDelegateConfig.bannedResourceUrlList(["self"]);
        $sce.getTrustedResourceUrl("foo");
        expect(logs[0]).toMatch(/insecurl/);
      });

      describe("when the document base URL has changed", () => {
        beforeEach(() => {
          window.angular = new Angular();
          window.angular.module("sceChangedBase", ["ng"]).config({
            $exceptionHandler: {
              handler: (err) => logs.push(err.message),
            },
            $sceDelegate: {
              trustedResourceUrlList: ["self"],
              bannedResourceUrlList: [],
            },
          });
          createInjector(["sceChangedBase"]).invoke([
            "$sce",
            (_$sce_) => {
              $sce = _$sce_;
            },
          ]);
        });

        let baseElem;

        beforeEach(() => {
          baseElem = document.createElement("BASE");
          baseElem.setAttribute(
            "href",
            `${window.location.protocol}//foo.example.com/path/`,
          );
          document.head.appendChild(baseElem);
        });

        afterEach(() => {
          document.head.removeChild(baseElem);
        });

        it("should allow relative URLs", () => {
          expect($sce.getTrustedResourceUrl("foo")).toEqual("foo");
        });

        it("should allow absolute URLs", () => {
          expect($sce.getTrustedResourceUrl("//foo.example.com/bar")).toEqual(
            "//foo.example.com/bar",
          );
        });

        it("should still block some URLs", () => {
          $sce.getTrustedResourceUrl("//bad.example.com");
          expect(logs[0]).toMatch(/insecurl/);
        });
      });

      it("should have the banned resource URL list override the trusted resource URL list", () => {
        sceDelegateConfig.trustedResourceUrlList(["self"]);
        sceDelegateConfig.bannedResourceUrlList(["self"]);
        $sce.getTrustedResourceUrl("foo");
        expect(logs[0]).toMatch(/insecurl/);
      });

      it("should support multiple items in both lists", () => {
        sceDelegateConfig.trustedResourceUrlList([
          /^http:\/\/example.com\/1$/,
          /^http:\/\/example.com\/2$/,
          /^http:\/\/example.com\/3$/,
          "self",
        ]);
        sceDelegateConfig.bannedResourceUrlList([
          /^http:\/\/example.com\/3$/,
          /.*\/open_redirect/,
        ]);
        expect($sce.getTrustedResourceUrl("same_domain")).toEqual(
          "same_domain",
        );
        expect($sce.getTrustedResourceUrl("http://example.com/1")).toEqual(
          "http://example.com/1",
        );
        expect($sce.getTrustedResourceUrl("http://example.com/2")).toEqual(
          "http://example.com/2",
        );
        $sce.getTrustedResourceUrl("http://example.com/3");
        expect(logs[0]).toMatch(/insecurl/);
        $sce.getTrustedResourceUrl("open_redirect");
        expect(logs[1]).toMatch(/insecurl/);
      });
    });

    describe("URL-context sanitization", () => {
      it("should sanitize values that are not found in the trusted resource URL list", () => {
        expect($sce.getTrustedMediaUrl("javascript:foo")).toEqual(
          "unsafe:javascript:foo",
        );
        expect($sce.getTrustedUrl("javascript:foo")).toEqual(
          "unsafe:javascript:foo",
        );
      });

      it("should not sanitize values that are found in the trusted resource URL list", () => {
        expect($sce.getTrustedMediaUrl("http://example.com")).toEqual(
          "http://example.com",
        );
        expect($sce.getTrustedUrl("http://example.com")).toEqual(
          "http://example.com",
        );
      });

      it("should not sanitize trusted values", () => {
        expect(
          $sce.getTrustedMediaUrl($sce.trustAsMediaUrl("javascript:foo")),
        ).toEqual("javascript:foo");
        expect(
          $sce.getTrustedMediaUrl($sce.trustAsUrl("javascript:foo")),
        ).toEqual("javascript:foo");
        expect(
          $sce.getTrustedMediaUrl($sce.trustAsResourceUrl("javascript:foo")),
        ).toEqual("javascript:foo");

        expect(
          $sce.getTrustedUrl($sce.trustAsMediaUrl("javascript:foo")),
        ).toEqual("unsafe:javascript:foo");
        expect($sce.getTrustedUrl($sce.trustAsUrl("javascript:foo"))).toEqual(
          "javascript:foo",
        );
        expect(
          $sce.getTrustedUrl($sce.trustAsResourceUrl("javascript:foo")),
        ).toEqual("javascript:foo");
      });

      it("should sanitize URL contexts directly", () => {
        window.angular = new Angular();
        window.angular
          .module("testSanitizeUri", ["ng"])
          .config({ $sce: { enabled: true } });
        createInjector(["testSanitizeUri"]).invoke([
          "$sce",
          (_$sce_) => {
            $sce = _$sce_;
          },
        ]);

        expect($sce.getTrustedMediaUrl("javascript:foo")).toEqual(
          "unsafe:javascript:foo",
        );
        expect($sce.getTrustedUrl("javascript:foo")).toEqual(
          "unsafe:javascript:foo",
        );
      });
    });

    describe("sanitizing html", () => {
      describe("when $sanitize is NOT available", () => {
        it("should throw an exception for getTrusted(string) values", async () => {
          $sce.getTrustedHtml("<b></b>");
          await wait();
          expect(logs[0]).toMatch(/unsafe/);
        });
      });
    });
  });
});
