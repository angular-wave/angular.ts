import { Angular } from "../angular.js";
import { createInjector } from "./di/injector.ts";
import { dealoc } from "../shared/dom.js";
import { wait } from "../shared/test-utils.js";

describe("ngProp*", () => {
  let $compile, $rootScope, compileProvider, $sce;
  let logs = [];

  beforeEach(() => {
    dealoc(document.getElementById("app"));
    logs = [];
    window.angular = new Angular();
    window.angular
      .module("myModule", ["ng"])
      .decorator("$exceptionHandler", function () {
        return (exception) => {
          logs.push(exception);
        };
      });

    let injector = window.angular.bootstrap(document.getElementById("app"), [
      "myModule",
      function ($compileProvider) {
        compileProvider = $compileProvider;
      },
    ]);
    $compile = injector.get("$compile");
    $rootScope = injector.get("$rootScope");
    $sce = injector.get("$sce");
  });

  it("should bind boolean properties (input disabled)", async () => {
    const element = $compile(
      '<button ng-prop-disabled="isDisabled">Button</button>',
    )($rootScope);
    await wait();
    expect(element.disabled).toBe(false);
    $rootScope.isDisabled = true;
    await wait();
    expect(element.disabled).toBe(true);
    $rootScope.isDisabled = false;
    await wait();
    expect(element.disabled).toBe(false);
  });

  it("should bind boolean properties (input checked)", async () => {
    const element = $compile(
      '<input type="checkbox" ng-prop-checked="isChecked" />',
    )($rootScope);
    await wait();
    expect(element.checked).toBe(false);
    $rootScope.isChecked = true;
    await wait();
    expect(element.checked).toBe(true);
    $rootScope.isChecked = false;
    await wait();
    expect(element.checked).toBe(false);
  });

  it("should bind string properties (title)", async () => {
    const element = $compile('<span ng-prop-title="title" />')($rootScope);
    $rootScope.title = 123;
    await wait();
    expect(element.title).toBe("123");
    $rootScope.title = "foobar";
    await wait();
    expect(element.title).toBe("foobar");
  });

  it("should bind variable type properties", async () => {
    const element = $compile('<span ng-prop-asdf="asdf" />')($rootScope);
    $rootScope.asdf = 123;
    await wait();
    expect(element.asdf).toBe(123);
    $rootScope.asdf = "foobar";
    await wait();
    expect(element.asdf).toBe("foobar");
    $rootScope.asdf = true;
    await wait();
    expect(element.asdf).toBe(true);
  });

  it("should support falsy property values", async () => {
    const element = $compile('<span ng-prop-text="myText" />')($rootScope);
    // Initialize to truthy value
    $rootScope.myText = "abc";
    await wait();
    expect(element.text).toBe("abc");

    // Assert various falsey values get assigned to the property
    $rootScope.myText = "";
    await wait();
    expect(element.text).toBe("");
    $rootScope.myText = 0;
    await wait();
    expect(element.text).toBe(0);
    $rootScope.myText = false;
    await wait();
    expect(element.text).toBe(false);
    $rootScope.myText = undefined;
    await wait();
    expect(element.text).toBeUndefined();
    $rootScope.myText = null;
    await wait();
    expect(element.text).toBe(null);
  });

  it("should directly map special properties (class)", async () => {
    const element = $compile('<span ng-prop-class="myText" />')($rootScope);
    $rootScope.myText = "abc";
    await wait();
    expect(element.class).toBe("abc");
    expect(element).not.toHaveClass("abc");
  });

  it("should support mixed case using underscore-separated names", async () => {
    const element = $compile('<span ng-prop-a_bcd_e="value" />')($rootScope);
    $rootScope.value = 123;
    await wait();
    expect(element.aBcdE).toBe(123);
  });

  it("should work with different prefixes", async () => {
    $rootScope.name = "Misko";
    const element = $compile(
      '<span ng-prop-test="name" ng-Prop-test2="name" ng-Prop-test3="name"></span>',
    )($rootScope);
    await wait();
    expect(element.test).toBe("Misko");
    expect(element.test2).toBe("Misko");
    expect(element.test3).toBe("Misko");
  });

  it('should work with the "href" property', async () => {
    $rootScope.value = "test";
    const element = $compile("<a ng-prop-href=\"'test/' + value\"></a>")(
      $rootScope,
    );
    await wait();
    expect(element.href).toMatch(/test\/test$/);
  });

  it("should work if they are prefixed with x- or data- and different prefixes", async () => {
    $rootScope.name = "Misko";
    const element = $compile(
      '<span data-ng-prop-test2="name" ng-prop-test3="name" data-ng-prop-test4="name" ' +
        'ng-prop-test5="name" ng-prop-test6="name"></span>',
    )($rootScope);
    await wait();
    expect(element.test2).toBe("Misko");
    expect(element.test3).toBe("Misko");
    expect(element.test4).toBe("Misko");
    expect(element.test5).toBe("Misko");
    expect(element.test6).toBe("Misko");
  });

  it("should work independently of attributes with the same name", async () => {
    const element = $compile('<span ng-prop-asdf="asdf" asdf="foo" />')(
      $rootScope,
    );
    $rootScope.asdf = 123;
    await wait();
    expect(element.asdf).toBe(123);
    expect(element.getAttribute("asdf")).toBe("foo");
  });

  it("should work independently of (ng-)attributes with the same name", async () => {
    const element = $compile('<span ng-prop-asdf="asdf" ng-attr-asdf="foo" />')(
      $rootScope,
    );
    $rootScope.asdf = 123;
    await wait();
    expect(element.asdf).toBe(123);
    expect(element.getAttribute("asdf")).toBe("foo");
  });

  it("should use the full ng-prop-* attribute name in $attr mappings", async () => {
    let attrs;
    compileProvider.directive("attrExposer", () => ({
      link($scope, $element, $attrs) {
        attrs = $attrs;
      },
    }));
    $compile(
      '<div attr-exposer ng-prop-title="12" ng-prop-super-title="34" ng-prop-my-camel-title="56">',
    )($rootScope);
    await wait();
    expect(attrs.title).toBeUndefined();
    expect(attrs.$attr.title).toBeUndefined();
    expect(attrs.ngPropTitle).toBe("12");
    expect(attrs.$attr.ngPropTitle).toBe("ng-prop-title");

    expect(attrs.superTitle).toBeUndefined();
    expect(attrs.$attr.superTitle).toBeUndefined();
    expect(attrs.ngPropSuperTitle).toBe("34");
    expect(attrs.$attr.ngPropSuperTitle).toBe("ng-prop-super-title");

    expect(attrs.myCamelTitle).toBeUndefined();
    expect(attrs.$attr.myCamelTitle).toBeUndefined();
    expect(attrs.ngPropMyCamelTitle).toBe("56");
    expect(attrs.$attr.ngPropMyCamelTitle).toBe("ng-prop-my-camel-title");
  });

  it("should not conflict with (ng-attr-)attribute mappings of the same name", () => {
    let attrs;
    compileProvider.directive("attrExposer", () => ({
      link($scope, $element, $attrs) {
        attrs = $attrs;
      },
    }));

    $compile(
      '<div attr-exposer ng-prop-title="42" ng-attr-title="foo" title="bar">',
    )($rootScope);
    expect(attrs.title).toBe("foo");
    expect(attrs.$attr.title).toBe("title");
    expect(attrs.$attr.ngPropTitle).toBe("ng-prop-title");
  });

  it("should disallow property binding to onclick", () => {
    // All event prop bindings are disallowed.
    expect(() => {
      $compile('<button ng-prop-onclick="onClickJs"></button>');
    }).toThrowError(/nodomevents/);
    expect(() => {
      $compile('<button ng-prop-ONCLICK="onClickJs"></button>');
    }).toThrowError(/nodomevents/);
  });

  it("should process property bindings in pre-linking phase at priority 100", async () => {
    compileProvider.directive("propLog", () => ({
      compile($element, $attrs) {
        logs.push(`compile=${$element.myName}`);

        return {
          pre($scope, $element, $attrs) {
            logs.push(`preLinkP0=${$element.myName}`);
            $rootScope.name = "pre0";
          },
          post($scope, $element, $attrs) {
            logs.push(`postLink=${$element.myName}`);
            $rootScope.name = "post0";
          },
        };
      },
    }));

    compileProvider.directive("propLogHighPriority", () => ({
      priority: 101,
      compile() {
        return {
          pre($scope, $element, $attrs) {
            logs.push(`preLinkP101=${$element.myName}`);
            $rootScope.name = "pre101";
          },
        };
      },
    }));
    const element = $compile(
      '<div prop-log-high-priority prop-log ng-prop-my_name="name"></div>',
    )($rootScope);
    $rootScope.name = "loader";
    await wait();
    logs.push(`digest=${element.myName}`);
    expect(logs.join("; ")).toEqual(
      "compile=undefined; preLinkP101=undefined; preLinkP0=pre101; postLink=pre101; digest=loader",
    );
  });

  describe("img[src] sanitization", () => {
    it("should accept trusted values", async () => {
      const element = $compile('<img ng-prop-src="testUrl"></img>')($rootScope);
      // Some browsers complain if you try to write `javascript:` into an `img[src]`
      // So for the test use something different
      $rootScope.testUrl = $sce.trustAsMediaUrl("someuntrustedthing:foo();");
      await wait();
      expect(element.src).toEqual("someuntrustedthing:foo();");
    });

    it("should use $$sanitizeUri", async () => {
      const $$sanitizeUri = jasmine
        .createSpy("$$sanitizeUri")
        .and.returnValue("someSanitizedUrl");
      createInjector([
        "myModule",
        ($provide) => {
          $provide.value("$$sanitizeUri", $$sanitizeUri);
        },
      ]).invoke((_$compile_, _$rootScope_) => {
        $compile = _$compile_;
        $rootScope = _$rootScope_;
      });

      app.innerHTML = '<img ng-prop-src="testUrl"></img>';

      $compile(app)($rootScope);
      $rootScope.testUrl = "someUrl";

      await wait();

      expect(app.querySelector("img").src).toMatch(
        /^http:\/\/.*\/someSanitizedUrl$/,
      );
      expect($$sanitizeUri).toHaveBeenCalledWith($rootScope.testUrl, true);
    });

    it("should not use $$sanitizeUri with trusted values", async () => {
      const $$sanitizeUri = jasmine
        .createSpy("$$sanitizeUri")
        .and.throwError("Should not have been called");
      createInjector([
        "myModule",
        ($provide) => {
          $provide.value("$$sanitizeUri", $$sanitizeUri);
        },
      ]).invoke((_$compile_, _$rootScope_, _$sce_) => {
        $compile = _$compile_;
        $rootScope = _$rootScope_;
        $sce = _$sce_;
      });

      app.innerHTML = '<img ng-prop-src="testUrl"></img>';

      $compile(app)($rootScope);

      // Assigning javascript:foo to src makes at least IE9-11 complain, so use another
      // protocol name.
      $rootScope.testUrl = $sce.trustAsMediaUrl("untrusted:foo();");
      await wait();
      expect(app.querySelector("img").src).toBe("untrusted:foo();");
    });
  });

  describe("a[href] sanitization", () => {
    it("should NOT require trusted values for trusted URI values", () => {
      $rootScope.testUrl = "http://example.com/image.png"; // `http` is trusted
      let element = $compile('<a ng-prop-href="testUrl"></a>')($rootScope);
      expect(element.href).toEqual("http://example.com/image.png");

      element = $compile('<a ng-prop-href="testUrl"></a>')($rootScope);
      expect(element.href).toEqual("http://example.com/image.png");
    });

    it("should accept trusted values for non-trusted URI values", () => {
      $rootScope.testUrl = $sce.trustAsUrl("javascript:foo()"); // `javascript` is not trusted
      let element = $compile('<a ng-prop-href="testUrl"></a>')($rootScope);
      expect(element.href).toEqual("javascript:foo()");

      element = $compile('<a ng-prop-href="testUrl"></a>')($rootScope);
      expect(element.href).toEqual("javascript:foo()");
    });

    it("should sanitize non-trusted values", () => {
      $rootScope.testUrl = "javascript:foo()"; // `javascript` is not trusted
      let element = $compile('<a ng-prop-href="testUrl"></a>')($rootScope);
      expect(element.href).toEqual("unsafe:javascript:foo()");

      element = $compile('<a ng-prop-href="testUrl"></a>')($rootScope);
      expect(element.href).toEqual("unsafe:javascript:foo()");
    });

    it("should not sanitize href on elements other than anchor", async () => {
      const element = $compile('<div ng-prop-href="testUrl"></div>')(
        $rootScope,
      );
      $rootScope.testUrl = "javascript:doEvilStuff()";
      await wait();

      expect(element.href).toBe("javascript:doEvilStuff()");
    });

    it("should not sanitize properties other then those configured", async () => {
      const element = $compile('<a ng-prop-title="testUrl"></a>')($rootScope);
      $rootScope.testUrl = "javascript:doEvilStuff()";
      await wait();

      expect(element.title).toBe("javascript:doEvilStuff()");
    });

    it("should use $$sanitizeUri", async () => {
      const $$sanitizeUri = jasmine
        .createSpy("$$sanitizeUri")
        .and.returnValue("someSanitizedUrl");
      createInjector([
        "myModule",
        ($provide) => {
          $provide.value("$$sanitizeUri", $$sanitizeUri);
        },
      ]).invoke((_$compile_, _$rootScope_) => {
        $compile = _$compile_;
        $rootScope = _$rootScope_;
      });
      app.innerHTML = '<a ng-prop-href="testUrl"></a>';
      $compile(app)($rootScope);
      $rootScope.testUrl = "someUrl";
      await wait();
      expect(app.querySelector("a").href).toMatch(
        /^http:\/\/.*\/someSanitizedUrl$/,
      );
      expect($$sanitizeUri).toHaveBeenCalledWith($rootScope.testUrl, false);

      $$sanitizeUri.calls.reset();

      app.innerHTML = '<a ng-prop-href="testUrl"></a>';
      $compile(app)($rootScope);
      await wait();
      expect(app.querySelector("a").href).toMatch(
        /^http:\/\/.*\/someSanitizedUrl$/,
      );
      expect($$sanitizeUri).toHaveBeenCalledWith($rootScope.testUrl, false);
    });

    it("should not have endless digests when given arrays in concatenable context", () => {
      const element = $compile(
        '<foo ng-prop-href="testUrl"></foo><foo ng-prop-href="::testUrl"></foo>' +
          "<foo ng-prop-href=\"'http://example.com/' + testUrl\"></foo><foo ng-prop-href=\"::'http://example.com/' + testUrl\"></foo>",
      )($rootScope);
      $rootScope.testUrl = [1];
      $rootScope.testUrl = [];
      $rootScope.testUrl = { a: "b" };
      $rootScope.testUrl = {};
    });
  });

  describe("iframe[src]", () => {
    beforeEach(() => {
      createInjector(["myModule"]).invoke(
        (_$compile_, _$rootScope_, _$sce_) => {
          $compile = _$compile_;
          $rootScope = _$rootScope_;
          $sce = _$sce_;
        },
      );
    });

    it("should pass through src properties for the same domain", async () => {
      const element = $compile('<iframe ng-prop-src="testUrl"></iframe>')(
        $rootScope,
      );
      $rootScope.testUrl = "different_page";
      await wait();
      expect(element.src).toMatch(/different_page$/);
    });

    it("should clear out src properties for a different domain", async () => {
      const element = $compile('<iframe ng-prop-src="testUrl"></iframe>')(
        $rootScope,
      );
      $rootScope.testUrl = "http://a.different.domain.example.com";
      await wait();
      expect(logs[0]).toMatch(/insecurl/);
    });

    it("should clear out JS src properties", async () => {
      $compile('<iframe ng-prop-src="testUrl"></iframe>')($rootScope);
      $rootScope.testUrl = "javascript:alert(1);";
      await wait();
      expect(logs[0]).toMatch(/insecurl/);
    });

    it("should clear out non-resource_url src properties", async () => {
      $compile('<iframe ng-prop-src="testUrl"></iframe>')($rootScope);
      $rootScope.testUrl = $sce.trustAsUrl("javascript:doTrustedStuff()");
      await wait();
      expect(logs[0]).toMatch(/insecurl/);
    });

    it("should pass through $sce.trustAs() values in src properties", async () => {
      const element = $compile('<iframe ng-prop-src="testUrl"></iframe>')(
        $rootScope,
      );
      $rootScope.testUrl = $sce.trustAsResourceUrl(
        "javascript:doTrustedStuff()",
      );
      await wait();

      expect(element.src).toEqual("javascript:doTrustedStuff()");
    });
  });

  describe("base[href]", () => {
    beforeEach(() => {
      createInjector(["myModule"]).invoke(
        (_$compile_, _$rootScope_, _$sce_) => {
          $compile = _$compile_;
          $rootScope = _$rootScope_;
          $sce = _$sce_;
        },
      );
    });

    it("should be a RESOURCE_URL context", async () => {
      const element = $compile('<base ng-prop-href="testUrl"/>')($rootScope);

      $rootScope.testUrl = $sce.trustAsResourceUrl("https://example.com/");
      await wait();
      expect(element.href).toContain("https://example.com/");

      $rootScope.testUrl = "https://not.example.com/";
      await wait();
      expect(logs[0]).toMatch(/insecurl/);
    });
  });

  describe("form[action]", () => {
    beforeEach(() => {
      createInjector(["myModule"]).invoke(
        (_$compile_, _$rootScope_, _$sce_) => {
          $compile = _$compile_;
          $rootScope = _$rootScope_;
          $sce = _$sce_;
        },
      );
    });

    it("should pass through action property for the same domain", async () => {
      app.innerHTML = '<form ng-prop-action="testUrl"></form>';
      $compile(app)($rootScope);
      $rootScope.testUrl = "different_page";
      await wait();
      expect(app.querySelector("form").action).toMatch(/\/different_page$/);
    });

    it("should clear out action property for a different domain", async () => {
      const element = $compile('<form ng-prop-action="testUrl"></form>')(
        $rootScope,
      );
      $rootScope.testUrl = "http://a.different.domain.example.com";
      await wait();
      expect(logs[0]).toMatch(/insecurl/);
    });

    it("should clear out JS action property", async () => {
      const element = $compile('<form ng-prop-action="testUrl"></form>')(
        $rootScope,
      );
      $rootScope.testUrl = "javascript:alert(1);";
      await wait();
      expect(logs[0]).toMatch(/insecurl/);
    });

    it("should clear out non-resource_url action property", async () => {
      const element = $compile('<form ng-prop-action="testUrl"></form>')(
        $rootScope,
      );
      $rootScope.testUrl = $sce.trustAsUrl("javascript:doTrustedStuff()");
      await wait();
      expect(logs[0]).toMatch(/insecurl/);
    });

    it("should pass through $sce.trustAsResourceUrl() values in action property", async () => {
      const element = $compile('<form ng-prop-action="testUrl"></form>')(
        $rootScope,
      );
      $rootScope.testUrl = $sce.trustAsResourceUrl(
        "javascript:doTrustedStuff()",
      );
      await wait();

      expect(element.action).toEqual("javascript:doTrustedStuff()");
    });
  });

  describe("link[href]", () => {
    beforeEach(() => {
      createInjector(["myModule"]).invoke(
        (_$compile_, _$rootScope_, _$sce_) => {
          $compile = _$compile_;
          $rootScope = _$rootScope_;
          $sce = _$sce_;
        },
      );
    });

    it("should reject invalid RESOURCE_URLs", async () => {
      const element = $compile(
        '<link ng-prop-href="testUrl" rel="stylesheet" />',
      )($rootScope);
      $rootScope.testUrl = "https://evil.example.org/css.css";
      await wait();
      expect(logs[0]).toMatch(/insecurl/);
    });

    it("should accept valid RESOURCE_URLs", async () => {
      const element = $compile(
        '<link ng-prop-href="testUrl" rel="stylesheet" />',
      )($rootScope);

      $rootScope.testUrl = "./css1.css";
      await wait();
      expect(element.href).toContain("css1.css");

      $rootScope.testUrl = $sce.trustAsResourceUrl(
        "https://elsewhere.example.org/css2.css",
      );
      await wait();
      expect(element.href).toContain("https://elsewhere.example.org/css2.css");
    });
  });

  describe("*[innerHTML]", () => {
    describe("SCE disabled", () => {
      beforeEach(() => {
        dealoc(document.getElementById("app"));
        window.angular
          .bootstrap(document.getElementById("app"), [
            "myModule",
            ($sceProvider) => {
              $sceProvider.enabled(false);
            },
          ])
          .invoke((_$compile_, _$rootScope_, _$sce_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
            $sce = _$sce_;
          });
      });

      it("should set html", async () => {
        const element = $compile('<div ng-prop-inner_h_t_m_l="html"></div>')(
          $rootScope,
        );
        $rootScope.html = '<div onclick="">hello</div>';
        await wait();
        expect(element.innerHTML).toEqual('<div onclick="">hello</div>');
      });

      it("should update html", async () => {
        const element = $compile('<div ng-prop-inner_h_t_m_l="html"></div>')(
          $rootScope,
        );
        $rootScope.html = "hello";
        await wait();
        expect(element.innerHTML).toEqual("hello");
        $rootScope.html = "goodbye";
        await wait();
        expect(element.innerHTML).toEqual("goodbye");
      });
    });

    describe("SCE enabled", () => {
      beforeEach(() => {
        createInjector([
          "myModule",
          ($sceProvider) => {
            $sceProvider.enabled(true);
          },
        ]).invoke((_$compile_, _$rootScope_, _$sce_) => {
          $compile = _$compile_;
          $rootScope = _$rootScope_;
          $sce = _$sce_;
        });
      });

      it("should NOT set html for untrusted values", async () => {
        const element = $compile('<div ng-prop-inner_h_t_m_l="html"></div>')(
          $rootScope,
        );
        $rootScope.html = '<div onclick="">hello</div>';
        await wait();
        expect(logs[0]).toMatch(/unsafe/);
      });

      it("should NOT set html for wrongly typed values", async () => {
        const element = $compile('<div ng-prop-inner_h_t_m_l="html"></div>')(
          $rootScope,
        );
        $rootScope.html = $sce.trustAsCss('<div onclick="">hello</div>');
        await wait();
        expect(logs[0]).toMatch(/unsafe/);
      });

      it("should set html for trusted values", async () => {
        const element = $compile('<div ng-prop-inner_h_t_m_l="html"></div>')(
          $rootScope,
        );
        $rootScope.html = $sce.trustAsHtml('<div onclick="">hello</div>');
        await wait();
        expect(element.innerHTML).toEqual('<div onclick="">hello</div>');
      });

      it("should update html", async () => {
        const element = $compile('<div ng-prop-inner_h_t_m_l="html"></div>')(
          $rootScope,
        );
        $rootScope.html = $sce.trustAsHtml("hello");
        await wait();
        expect(element.innerHTML).toEqual("hello");
        $rootScope.html = $sce.trustAsHtml("goodbye");
        await wait();
        expect(element.innerHTML).toEqual("goodbye");
      });

      it("should not cause infinite recursion for trustAsHtml object watches", async () => {
        // Ref: https://github.com/angular/angular.js/issues/3932
        // If the binding is a function that creates a new value on every call via trustAs, we'll
        // trigger an infinite digest if we don't take care of it.
        const element = $compile(
          '<div ng-prop-inner_h_t_m_l="getHtml()"></div>',
        )($rootScope);
        $rootScope.getHtml = function () {
          return $sce.trustAsHtml('<div onclick="">hello</div>');
        };
        await wait();
        expect(element.innerHTML).toEqual('<div onclick="">hello</div>');
      });

      it("should handle custom $sce objects", async () => {
        function MySafeHtml(val) {
          this.val = val;
        }

        createInjector([
          "myModule",
          ($provide) => {
            $provide.decorator("$sce", ($delegate) => {
              $delegate.trustAsHtml = function (html) {
                return new MySafeHtml(html);
              };
              $delegate.getTrusted = function (type, mySafeHtml) {
                return mySafeHtml && mySafeHtml.val;
              };
              $delegate.valueOf = function (v) {
                return v instanceof MySafeHtml ? v.val : v;
              };
              return $delegate;
            });
          },
        ]).invoke((_$compile_, _$rootScope_, _$sce_) => {
          $compile = _$compile_;
          $rootScope = _$rootScope_;
          $sce = _$sce_;
        });

        // Ref: https://github.com/angular/angular.js/issues/14526
        // Previous code used toString for change detection, which fails for custom objects
        // that don't override toString.
        let html = "hello";
        $rootScope.getHtml = function () {
          return $sce.trustAsHtml(html);
        };
        const element = $compile(
          '<div ng-prop-inner_h_t_m_l="getHtml()"></div>',
        )($rootScope);
        await wait();

        expect(element.innerHTML).toEqual("hello");
      });
    });
  });

  describe("*[style]", () => {
    it("should NOT set style for untrusted values", async () => {
      $compile('<div ng-prop-style="style"></div>')($rootScope);
      $rootScope.style = "margin-left: 10px";
      await wait();
      expect(logs[0]).toMatch(/unsafe/);
    });

    it("should NOT set style for wrongly typed values", async () => {
      const element = $compile('<div ng-prop-style="style"></div>')($rootScope);
      $rootScope.style = $sce.trustAsHtml("margin-left: 10px");
      await wait();
      expect(logs[0]).toMatch(/unsafe/);
    });

    it("should set style for trusted values", async () => {
      const element = $compile('<div ng-prop-style="style"></div>')($rootScope);
      $rootScope.style = $sce.trustAsCss("margin-left: 10px");
      await wait();
      expect(element.style["margin-left"]).toEqual("10px");
    });
  });
});
