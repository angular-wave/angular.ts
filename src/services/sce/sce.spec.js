import { createInjector } from "../../core/di/injector.js";
import { Angular } from "../../angular.js";
import { adjustMatcher } from "./sce.js";
import { wait } from "../../shared/test-utils.js";

describe("SCE", () => {
  let $sce, $rootScope;
  let sceDelegateProvider;
  let logs = [];
  let errorLog = [];

  describe("when disabled", () => {
    beforeEach(function () {
      window.angular = new Angular();
      window.angular
        .module("myModule", ["ng"])
        .decorator("$exceptionHandler", function () {
          return (exception) => {
            errorLog.push(exception.message);
          };
        });
      createInjector([
        "myModule",
        function ($sceProvider, $exceptionHandlerProvider) {
          $exceptionHandlerProvider.handler = (err) => logs.push(err.message);
          $sceProvider.enabled(false);
        },
      ]).invoke((_$sce_) => {
        $sce = _$sce_;
      });
    });

    it("should provide the getter for enabled", () => {
      expect($sce.isEnabled()).toBe(false);
    });

    it("should not wrap/unwrap any value or throw exception on non-string values", () => {
      const originalValue = { foo: "bar" };
      expect($sce.trustAs($sce.JS, originalValue)).toBe(originalValue);
      expect($sce.getTrusted($sce.JS, originalValue)).toBe(originalValue);
    });
  });

  describe("when enabled", () => {
    beforeEach(function () {
      window.angular = new Angular();
      logs = [];
      createInjector([
        "ng",
        function ($sceProvider, $exceptionHandlerProvider) {
          $exceptionHandlerProvider.handler = (err) => {
            logs.push(err.message);
          };
          $sceProvider.enabled(true);
        },
      ]).invoke((_$sce_) => {
        $sce = _$sce_;
      });
    });

    it("should wrap string values with TrustedValueHolder", () => {
      const originalValue = "original_value";
      let wrappedValue = $sce.trustAs($sce.HTML, originalValue);
      expect(typeof wrappedValue).toBe("object");
      expect($sce.getTrusted($sce.HTML, wrappedValue)).toBe("original_value");
      $sce.getTrusted($sce.CSS, wrappedValue);
      expect(logs[0]).toMatch(/unsafe/);
      wrappedValue = $sce.trustAs($sce.CSS, originalValue);
      expect(typeof wrappedValue).toBe("object");
      expect($sce.getTrusted($sce.CSS, wrappedValue)).toBe("original_value");
      $sce.getTrusted($sce.HTML, wrappedValue);
      expect(logs[0]).toMatch(/unsafe/);
      wrappedValue = $sce.trustAs($sce.URL, originalValue);
      expect(typeof wrappedValue).toBe("object");
      expect($sce.getTrusted($sce.URL, wrappedValue)).toBe("original_value");
      wrappedValue = $sce.trustAs($sce.JS, originalValue);
      expect(typeof wrappedValue).toBe("object");
      expect($sce.getTrusted($sce.JS, wrappedValue)).toBe("original_value");
    });

    it("should NOT wrap non-string values", () => {
      $sce.trustAsCss(123);
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
      expect($sce.getTrusted($sce.HTML, undefined)).toBeUndefined();
    });

    it("should wrap null into null", () => {
      expect($sce.trustAsHtml(null)).toBe(null);
    });

    it("should unwrap null into null", () => {
      expect($sce.getTrusted($sce.HTML, null)).toBe(null);
    });

    it('should wrap "" into ""', () => {
      expect($sce.trustAsHtml("")).toBe("");
    });

    it('should unwrap "" into ""', () => {
      expect($sce.getTrusted($sce.HTML, "")).toBe("");
    });

    it("should unwrap values and return the original", () => {
      const originalValue = "originalValue";
      const wrappedValue = $sce.trustAs($sce.HTML, originalValue);
      expect($sce.getTrusted($sce.HTML, wrappedValue)).toBe(originalValue);
    });

    it("should NOT unwrap values when the type is different", () => {
      const originalValue = "originalValue";
      const wrappedValue = $sce.trustAs($sce.HTML, originalValue);
      $sce.getTrusted($sce.CSS, wrappedValue);
      expect(logs[0]).toMatch(/unsafe/);
    });

    it("should NOT unwrap values that had not been wrapped", () => {
      function TrustedValueHolder(trustedValue) {
        this.$unwrapTrustedValue = function () {
          return trustedValue;
        };
      }
      const wrappedValue = new TrustedValueHolder("originalValue");
      $sce.getTrusted($sce.HTML, wrappedValue);
      expect(logs[0]).toMatch(/unsafe/);
    });

    it("should implement toString on trusted values", () => {
      const originalValue = "123";
      const wrappedValue = $sce.trustAsHtml(originalValue);
      expect($sce.getTrustedHtml(wrappedValue)).toBe(originalValue);
      expect(wrappedValue.toString()).toBe(originalValue.toString());
    });
  });

  describe("replace $sceDelegate", () => {
    it("should override the default $sce.trustAs/valueOf/etc.", () => {
      window.angular = new Angular();
      createInjector([
        "ng",
        function ($provide) {
          $provide.value("$sceDelegate", {
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
        },
      ]).invoke((_$sce_) => {
        $sce = _$sce_;
      });

      expect($sce.trustAsJs("value")).toBe("wrapped:value");
      expect($sce.valueOf("value")).toBe("valueOf:value");
      expect($sce.getTrustedJs("value")).toBe("unwrapped:value");
      expect($sce.parseAsJs("name")({ name: "chirayu" })).toBe(
        "unwrapped:chirayu",
      );
    });
  });

  describe("$sce.parseAs", () => {
    window.angular = new Angular();
    beforeEach(function () {
      logs = [];
      createInjector([
        "ng",
        function ($exceptionHandlerProvider) {
          $exceptionHandlerProvider.handler = (err) => logs.push(err.message);
        },
      ]).invoke((_$sce_, _$rootScope_) => {
        $sce = _$sce_;
        $rootScope = _$rootScope_;
      });
      logs = [];
    });

    it("should parse constant literals as trusted", () => {
      expect($sce.parseAsJs("1")()).toBe(1);
      expect($sce.parseAsJs("1", $sce.ANY)()).toBe(1);
      expect($sce.parseAsJs("1", $sce.HTML)()).toBe(1);
      expect($sce.parseAsJs("1", "UNDEFINED")()).toBe(1);
      expect($sce.parseAsJs("true")()).toBe(true);
      expect($sce.parseAsJs("false")()).toBe(false);
      expect($sce.parseAsJs("null")()).toBe(null);
      expect($sce.parseAsJs("undefined")()).toBeUndefined();
      expect($sce.parseAsJs('"string"')()).toBe("string");
    });

    it("should NOT parse constant non-literals", () => {
      // Until there's a real world use case for this, we're disallowing
      // constant non-literals.  See $SceParseProvider.
      $sce.parseAsJs("1+1")();
      expect(logs[0]).toBeDefined();
    });

    it("should NOT return untrusted values from expression function", () => {
      const exprFn = $sce.parseAs($sce.HTML, "foo");
      exprFn({}, { foo: true });
      expect(logs[0]).toMatch(/unsafe/);
    });

    it("should NOT return trusted values of the wrong type from expression function", () => {
      const exprFn = $sce.parseAs($sce.HTML, "foo");
      exprFn({}, { foo: $sce.trustAs($sce.JS, "123") });
    });

    it("should return trusted values from expression function", () => {
      const exprFn = $sce.parseAs($sce.HTML, "foo");
      expect(exprFn({}, { foo: $sce.trustAs($sce.HTML, "trustedValue") })).toBe(
        "trustedValue",
      );
    });

    it("should support shorthand methods", () => {
      // Test shorthand parse methods.
      expect($sce.parseAsHtml("1")()).toBe(1);
      // Test short trustAs methods.
      expect($sce.trustAsAny).toBeUndefined();
      $sce.parseAsCss("foo")({}, { foo: $sce.trustAsHtml("1") });
      expect(logs[0]).toMatch(/unsafe/);
    });
  });

  describe("$sceDelegate resource url policies", () => {
    beforeEach(() => {
      logs = [];
      createInjector([
        "ng",
        ($sceDelegateProvider, $exceptionHandlerProvider) => {
          $exceptionHandlerProvider.handler = (err) => logs.push(err.message);
          sceDelegateProvider = $sceDelegateProvider;
        },
      ]).invoke((_$sce_) => {
        $sce = _$sce_;
      });
    });

    it('should default to "self" which allows relative urls', () => {
      expect($sce.getTrustedResourceUrl("foo/bar")).toEqual("foo/bar");
    });

    it("should reject everything when trusted resource URL list is empty", () => {
      sceDelegateProvider.trustedResourceUrlList([]);
      sceDelegateProvider.bannedResourceUrlList([]);
      $sce.getTrustedResourceUrl("#");
      expect(logs[0]).toMatch(/insecurl/);
    });

    it("should match against normalized urls", () => {
      sceDelegateProvider.trustedResourceUrlList([/^foo$/]);
      sceDelegateProvider.bannedResourceUrlList([]);
      $sce.getTrustedResourceUrl("foo");
      expect(logs[0]).toMatch(/insecurl/);
    });

    it("should not accept unknown matcher type", () => {
      expect(() => {
        sceDelegateProvider.trustedResourceUrlList([{}]);
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
        createInjector([
          "ng",
          ($sceDelegateProvider, $exceptionHandlerProvider) => {
            $exceptionHandlerProvider.handler = (err) => logs.push(err.message);
            sceDelegateProvider = $sceDelegateProvider;
          },
        ]).invoke((_$sce_) => {
          $sce = _$sce_;
        });
      });

      it("should support custom regex", () => {
        sceDelegateProvider.trustedResourceUrlList([
          /^http:\/\/example\.com\/.*/,
        ]);
        sceDelegateProvider.bannedResourceUrlList([]);
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
        sceDelegateProvider.trustedResourceUrlList([
          /https?:\/\/example\.com\/foo/,
        ]);
        sceDelegateProvider.bannedResourceUrlList([]);
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
        createInjector([
          "ng",
          ($sceDelegateProvider, $exceptionHandlerProvider) => {
            $exceptionHandlerProvider.handler = (err) => logs.push(err.message);
            sceDelegateProvider = $sceDelegateProvider;
          },
        ]).invoke((_$sce_) => {
          $sce = _$sce_;
        });
      });

      it("should support strings as matchers", () => {
        sceDelegateProvider.trustedResourceUrlList(["http://example.com/foo"]);
        sceDelegateProvider.bannedResourceUrlList([]);
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
        sceDelegateProvider.trustedResourceUrlList(["http://example.com/foo*"]);
        sceDelegateProvider.bannedResourceUrlList([]);
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
        sceDelegateProvider.trustedResourceUrlList([
          "http://example.com/foo**",
        ]);
        sceDelegateProvider.bannedResourceUrlList([]);
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
          sceDelegateProvider.trustedResourceUrlList(["http://***"]);
        }).toThrowError(/iwcard/);
      });
    });

    describe('"self" matcher', () => {
      beforeEach(() => {
        logs = [];
        createInjector([
          "ng",
          ($sceDelegateProvider, $exceptionHandlerProvider) => {
            $exceptionHandlerProvider.handler = (err) => logs.push(err.message);
            sceDelegateProvider = $sceDelegateProvider;
          },
        ]).invoke((_$sce_) => {
          $sce = _$sce_;
        });
      });

      it('should support the special string "self" in trusted resource URL list', () => {
        sceDelegateProvider.trustedResourceUrlList(["self"]);
        sceDelegateProvider.bannedResourceUrlList([]);
        expect($sce.getTrustedResourceUrl("foo")).toEqual("foo");
      });

      it('should support the special string "self" in baneed resource URL list', () => {
        sceDelegateProvider.trustedResourceUrlList([/.*/]);
        sceDelegateProvider.bannedResourceUrlList(["self"]);
        $sce.getTrustedResourceUrl("foo");
        expect(logs[0]).toMatch(/insecurl/);
      });

      describe("when the document base URL has changed", () => {
        beforeEach(() => {
          createInjector([
            "ng",
            ($sceDelegateProvider, $exceptionHandlerProvider) => {
              $exceptionHandlerProvider.handler = (err) =>
                logs.push(err.message);
              sceDelegateProvider = $sceDelegateProvider;
              sceDelegateProvider.trustedResourceUrlList(["self"]);
              sceDelegateProvider.bannedResourceUrlList([]);
            },
          ]).invoke((_$sce_) => {
            $sce = _$sce_;
          });
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
        sceDelegateProvider.trustedResourceUrlList(["self"]);
        sceDelegateProvider.bannedResourceUrlList(["self"]);
        $sce.getTrustedResourceUrl("foo");
        expect(logs[0]).toMatch(/insecurl/);
      });

      it("should support multiple items in both lists", () => {
        sceDelegateProvider.trustedResourceUrlList([
          /^http:\/\/example.com\/1$/,
          /^http:\/\/example.com\/2$/,
          /^http:\/\/example.com\/3$/,
          "self",
        ]);
        sceDelegateProvider.bannedResourceUrlList([
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

      it("should use the $$sanitizeUri", () => {
        const $$sanitizeUri = jasmine
          .createSpy("$$sanitizeUri")
          .and.returnValue("someSanitizedUrl");
        // module(($provide) => {
        //   $provide.value("$$sanitizeUri", $$sanitizeUri);
        // });
        () => {
          expect($sce.getTrustedMediaUrl("someUrl")).toEqual(
            "someSanitizedUrl",
          );
          expect($$sanitizeUri).toHaveBeenCalledOnceWith("someUrl", true);

          $$sanitizeUri.calls.reset();

          expect($sce.getTrustedUrl("someUrl")).toEqual("someSanitizedUrl");
          expect($$sanitizeUri).toHaveBeenCalledOnceWith("someUrl", false);
        };
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
