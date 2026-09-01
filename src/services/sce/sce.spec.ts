// @ts-nocheck
/// <reference types="jasmine" />
import { createInjector } from "../../core/di/injector.ts";
import { Angular } from "../../angular.ts";
import { adjustMatcher, SCE_CONTEXTS } from "./sce.ts";

describe("SCE", () => {
  let $sce, $rootScope;

  const sceDelegateConfig = {
    setTrustedResourceUrlList(value) {
      window.angular._composition.configRegistry.configure("$sceDelegate", {
        trustedResourceUrlList: value,
      });
    },
    setBannedResourceUrlList(value) {
      window.angular._composition.configRegistry.configure("$sceDelegate", {
        bannedResourceUrlList: value,
      });
    },
  };

  let logs = [];

  const errorLog = [];

  function expectSceError(callback, code) {
    expect(callback).toThrowError(new RegExp(code));
  }

  describe("when disabled", () => {
    beforeEach(() => {
      window.angular = new Angular();
      window.angular
        .createModule("myModule", ["ng"])
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
      window.angular.createModule("sceEnabled", ["ng"]).config({
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
      expectSceError(
        () =>
          $sce.getTrusted(
            SCE_CONTEXTS._HTML,
            $sce.trustAs(SCE_CONTEXTS._URL, originalValue),
          ),
        "unsafe",
      );
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
        .createModule("sceWithSanitizer", ["ng"])
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
      expectSceError(() => $sce.trustAsUrl(123), "itype");
    });

    it("should NOT wrap unknown contexts", () => {
      expectSceError(() => $sce.trustAs("unknown1", "123"), "icontext");
    });

    it("should NOT wrap undefined context", () => {
      expectSceError(() => $sce.trustAs(undefined, "123"), "icontext");
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

      expectSceError(
        () => $sce.getTrusted(SCE_CONTEXTS._HTML, wrappedValue),
        "unsafe",
      );
    });

    it("should NOT unwrap values that had not been wrapped", () => {
      function TrustedValueHolder(trustedValue) {
        this.$unwrapTrustedValue = function () {
          return trustedValue;
        };
      }
      const wrappedValue = new TrustedValueHolder("originalValue");

      expectSceError(
        () => $sce.getTrusted(SCE_CONTEXTS._HTML, wrappedValue),
        "unsafe",
      );
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
      expectSceError(() => $sce.getTrusted("unknown", "value"), "unsafe");
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
        .createModule("sceDelegateOverride", ["ng"])
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
      window.angular.createModule("sceParseAs", ["ng"]).config({
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

      expectSceError(() => exprFn({}, { foo: true }), "unsafe");
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
      expectSceError(
        () => $sce.parseAsHtml("foo")({}, { foo: $sce.trustAsUrl("1") }),
        "unsafe",
      );
    });
  });

  describe("$sceDelegate resource url policies", () => {
    beforeEach(() => {
      logs = [];
      window.angular = new Angular();
      window.angular.createModule("sceResourcePolicies", ["ng"]).config({
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
      sceDelegateConfig.setTrustedResourceUrlList([]);
      sceDelegateConfig.setBannedResourceUrlList([]);
      expectSceError(() => $sce.getTrustedResourceUrl("#"), "insecurl");
    });

    it("should treat null resource URL lists as empty", () => {
      sceDelegateConfig.setTrustedResourceUrlList(null);
      sceDelegateConfig.setBannedResourceUrlList(null);

      expectSceError(() => $sce.getTrustedResourceUrl("#"), "insecurl");
    });

    it("should match against normalized urls", () => {
      sceDelegateConfig.setTrustedResourceUrlList([/^foo$/]);
      sceDelegateConfig.setBannedResourceUrlList([]);
      expectSceError(() => $sce.getTrustedResourceUrl("foo"), "insecurl");
    });

    it("should not accept unknown matcher type", () => {
      expect(() => {
        sceDelegateConfig.setTrustedResourceUrlList([{}]);
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
        window.angular.createModule("sceRegexMatcher", ["ng"]).config({
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
        sceDelegateConfig.setTrustedResourceUrlList([
          /^http:\/\/example\.com\/.*/,
        ]);
        sceDelegateConfig.setBannedResourceUrlList([]);
        expect($sce.getTrustedResourceUrl("http://example.com/foo")).toEqual(
          "http://example.com/foo",
        );
        // must match entire regex

        expectSceError(
          () => $sce.getTrustedResourceUrl("https://example.com/foo"),
          "insecurl",
        );
        // https doesn't match (mismatched protocol.)
        expectSceError(
          () => $sce.getTrustedResourceUrl("https://example.com/foo"),
          "insecurl",
        );
      });

      it("should match entire regex", () => {
        sceDelegateConfig.setTrustedResourceUrlList([
          /https?:\/\/example\.com\/foo/,
        ]);
        sceDelegateConfig.setBannedResourceUrlList([]);
        expect($sce.getTrustedResourceUrl("http://example.com/foo")).toEqual(
          "http://example.com/foo",
        );
        expect($sce.getTrustedResourceUrl("https://example.com/foo")).toEqual(
          "https://example.com/foo",
        );
        expectSceError(
          () => $sce.getTrustedResourceUrl("http://example.com/fo"),
          "insecurl",
        );
        // Suffix not allowed even though original regex does not contain an ending $.
        expectSceError(
          () => $sce.getTrustedResourceUrl("http://example.com/foo2"),
          "insecurl",
        );
        // Prefix not allowed even though original regex does not contain a leading ^.
        expectSceError(
          () => $sce.getTrustedResourceUrl("xhttp://example.com/foo"),
          "insecurl",
        );
      });
    });

    describe("string matchers", () => {
      beforeEach(() => {
        logs = [];
        window.angular = new Angular();
        window.angular.createModule("sceStringMatchers", ["ng"]).config({
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
        sceDelegateConfig.setTrustedResourceUrlList(["http://example.com/foo"]);
        sceDelegateConfig.setBannedResourceUrlList([]);
        expect($sce.getTrustedResourceUrl("http://example.com/foo")).toEqual(
          "http://example.com/foo",
        );
        // "." is not a special character like in a regex.
        expectSceError(
          () => $sce.getTrustedResourceUrl("http://example-com/foo"),
          "insecurl",
        );
        // You can match a prefix.
        expectSceError(
          () => $sce.getTrustedResourceUrl("http://example.com/foo2"),
          "insecurl",
        );
        // You can match a suffix.
        expectSceError(
          () => $sce.getTrustedResourceUrl("xhttp://example.com/foo"),
          "insecurl",
        );
      });

      it("should support the * wildcard", () => {
        sceDelegateConfig.setTrustedResourceUrlList([
          "http://example.com/foo*",
        ]);
        sceDelegateConfig.setBannedResourceUrlList([]);
        expect($sce.getTrustedResourceUrl("http://example.com/foo")).toEqual(
          "http://example.com/foo",
        );
        // The * wildcard should match extra characters.
        expect(
          $sce.getTrustedResourceUrl("http://example.com/foo-bar"),
        ).toEqual("http://example.com/foo-bar");
        // The * wildcard does not match ':'
        expectSceError(
          () => $sce.getTrustedResourceUrl("http://example-com/foo:bar"),
          "insecurl",
        );
        // The * wildcard does not match '/'
        expectSceError(
          () => $sce.getTrustedResourceUrl("http://example-com/foo/bar"),
          "insecurl",
        );
        // The * wildcard does not match '.'
        expectSceError(
          () => $sce.getTrustedResourceUrl("http://example-com/foo.bar"),
          "insecurl",
        );
        // The * wildcard does not match '?'
        expectSceError(
          () => $sce.getTrustedResourceUrl("http://example-com/foo?bar"),
          "insecurl",
        );
        // The * wildcard does not match '&'
        expectSceError(
          () => $sce.getTrustedResourceUrl("http://example-com/foo&bar"),
          "insecurl",
        );
        // The * wildcard does not match ';'
        expectSceError(
          () => $sce.getTrustedResourceUrl("http://example-com/foo;bar"),
          "insecurl",
        );
      });

      it("should support the ** wildcard", () => {
        sceDelegateConfig.setTrustedResourceUrlList([
          "http://example.com/foo**",
        ]);
        sceDelegateConfig.setBannedResourceUrlList([]);
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
          sceDelegateConfig.setTrustedResourceUrlList(["http://***"]);
        }).toThrowError(/iwcard/);
      });
    });

    describe('"self" matcher', () => {
      beforeEach(() => {
        logs = [];
        window.angular = new Angular();
        window.angular.createModule("sceSelfMatcher", ["ng"]).config({
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
        sceDelegateConfig.setTrustedResourceUrlList(["self"]);
        sceDelegateConfig.setBannedResourceUrlList([]);
        expect($sce.getTrustedResourceUrl("foo")).toEqual("foo");
      });

      it('should support the special string "self" in baneed resource URL list', () => {
        sceDelegateConfig.setTrustedResourceUrlList([/.*/]);
        sceDelegateConfig.setBannedResourceUrlList(["self"]);
        expectSceError(() => $sce.getTrustedResourceUrl("foo"), "insecurl");
      });

      describe("when the document base URL has changed", () => {
        beforeEach(() => {
          window.angular = new Angular();
          window.angular.createModule("sceChangedBase", ["ng"]).config({
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
          expectSceError(
            () => $sce.getTrustedResourceUrl("//bad.example.com"),
            "insecurl",
          );
        });
      });

      it("should have the banned resource URL list override the trusted resource URL list", () => {
        sceDelegateConfig.setTrustedResourceUrlList(["self"]);
        sceDelegateConfig.setBannedResourceUrlList(["self"]);
        expectSceError(() => $sce.getTrustedResourceUrl("foo"), "insecurl");
      });

      it("should support multiple items in both lists", () => {
        sceDelegateConfig.setTrustedResourceUrlList([
          /^http:\/\/example.com\/1$/,
          /^http:\/\/example.com\/2$/,
          /^http:\/\/example.com\/3$/,
          "self",
        ]);
        sceDelegateConfig.setBannedResourceUrlList([
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
        expectSceError(
          () => $sce.getTrustedResourceUrl("http://example.com/3"),
          "insecurl",
        );
        expectSceError(
          () => $sce.getTrustedResourceUrl("open_redirect"),
          "insecurl",
        );
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
          .createModule("testSanitizeUri", ["ng"])
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
        it("should throw an exception for getTrusted(string) values", () => {
          expectSceError(() => $sce.getTrustedHtml("<b></b>"), "unsafe");
        });
      });
    });
  });
});
