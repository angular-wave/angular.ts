// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../angular.ts";
import { createInjector } from "./di/injector.ts";
import {
  dealoc,
  getNormalizedAttr,
  getNormalizedAttrName,
} from "../shared/dom.ts";
import { wait } from "../shared/test-utils.ts";

describe("ngProp*", () => {
  let $compile, $rootScope, compileRegistry;

  let logs = [];

  beforeEach(() => {
    dealoc(document.getElementById("app"));
    logs = [];
    window.angular = new Angular();
    compileRegistry = window.angular._composition.compileRegistry;
    window.angular
      .createModule("myModule", ["ng"])
      .decorator("$exceptionHandler", function () {
        return (exception) => {
          logs.push(exception);
        };
      });

    const injector = window.angular.bootstrap(document.getElementById("app"), [
      "myModule",
    ]);

    $compile = injector.get("$compile");
    $rootScope = injector.get("$rootScope");
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
    let snapshot;

    compileRegistry.directive("attrExposer", () => ({
      link($scope, $element) {
        snapshot = {
          title: getNormalizedAttr($element, "title"),
          titleAttr: getNormalizedAttrName($element, "title"),
          ngPropTitle: getNormalizedAttr($element, "ngPropTitle"),
          ngPropTitleAttr: getNormalizedAttrName($element, "ngPropTitle"),
          superTitle: getNormalizedAttr($element, "superTitle"),
          superTitleAttr: getNormalizedAttrName($element, "superTitle"),
          ngPropSuperTitle: getNormalizedAttr($element, "ngPropSuperTitle"),
          ngPropSuperTitleAttr: getNormalizedAttrName(
            $element,
            "ngPropSuperTitle",
          ),
          myCamelTitle: getNormalizedAttr($element, "myCamelTitle"),
          myCamelTitleAttr: getNormalizedAttrName($element, "myCamelTitle"),
          ngPropMyCamelTitle: getNormalizedAttr($element, "ngPropMyCamelTitle"),
          ngPropMyCamelTitleAttr: getNormalizedAttrName(
            $element,
            "ngPropMyCamelTitle",
          ),
        };
      },
    }));
    $compile(
      '<div attr-exposer ng-prop-title="12" ng-prop-super-title="34" ng-prop-my-camel-title="56">',
    )($rootScope);
    await wait();
    expect(snapshot.title).toBe("12");
    expect(snapshot.titleAttr).toBe("title");
    expect(snapshot.ngPropTitle).toBe("12");
    expect(snapshot.ngPropTitleAttr).toBe("ng-prop-title");

    expect(snapshot.superTitle).toBeUndefined();
    expect(snapshot.superTitleAttr).toBeUndefined();
    expect(snapshot.ngPropSuperTitle).toBe("34");
    expect(snapshot.ngPropSuperTitleAttr).toBe("ng-prop-super-title");

    expect(snapshot.myCamelTitle).toBeUndefined();
    expect(snapshot.myCamelTitleAttr).toBeUndefined();
    expect(snapshot.ngPropMyCamelTitle).toBe("56");
    expect(snapshot.ngPropMyCamelTitleAttr).toBe("ng-prop-my-camel-title");
  });

  it("should not conflict with (ng-attr-)attribute mappings of the same name", () => {
    let snapshot;

    compileRegistry.directive("attrExposer", () => ({
      link($scope, $element) {
        snapshot = {
          title: getNormalizedAttr($element, "title"),
          titleAttr: getNormalizedAttrName($element, "title"),
          ngPropTitleAttr: getNormalizedAttrName($element, "ngPropTitle"),
        };
      },
    }));

    $compile(
      '<div attr-exposer ng-prop-title="42" ng-attr-title="foo" title="bar">',
    )($rootScope);
    expect(snapshot.title).toBe("foo");
    expect(snapshot.titleAttr).toBe("title");
    expect(snapshot.ngPropTitleAttr).toBe("ng-prop-title");
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
    compileRegistry.directive("propLog", () => ({
      compile($element, snapshot) {
        logs.push(`compile=${$element.myName}`);

        return {
          pre($scope, $element) {
            logs.push(`preLinkP0=${$element.myName}`);
            $rootScope.name = "pre0";
          },
          post($scope, $element) {
            logs.push(`postLink=${$element.myName}`);
            $rootScope.name = "post0";
          },
        };
      },
    }));

    compileRegistry.directive("propLogHighPriority", () => ({
      priority: 101,
      compile() {
        return {
          pre($scope, $element) {
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
    it("should sanitize plain values through SCE", async () => {
      app.innerHTML = '<img ng-prop-src="testUrl"></img>';

      $compile(app)($rootScope);
      $rootScope.testUrl = "someUrl";

      await wait();

      expect(app.querySelector("img").src).toMatch(/^http:\/\/.*\/someUrl$/);
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

    it("should sanitize plain values through SCE", async () => {
      app.innerHTML = '<a ng-prop-href="testUrl"></a>';
      $compile(app)($rootScope);
      $rootScope.testUrl = "someUrl";
      await wait();
      expect(app.querySelector("a").href).toMatch(/^http:\/\/.*\/someUrl$/);

      app.innerHTML = '<a ng-prop-href="testUrl"></a>';
      $compile(app)($rootScope);
      await wait();
      expect(app.querySelector("a").href).toMatch(/^http:\/\/.*\/someUrl$/);
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
      createInjector(["myModule"]).invoke([
        "$compile",
        "$rootScope",

        (_$compile_, _$rootScope_) => {
          $compile = _$compile_;
          $rootScope = _$rootScope_;
        },
      ]);
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
  });

  describe("base[href]", () => {
    it("rejects external resource URLs", async () => {
      app.innerHTML = '<base ng-prop-href="testUrl">';
      $compile(app)($rootScope);
      $rootScope.testUrl = "https://external.example/";
      await wait();
      expect(logs[0]).toMatch(/insecurl/);
    });
    beforeEach(() => {
      createInjector(["myModule"]).invoke([
        "$compile",
        "$rootScope",

        (_$compile_, _$rootScope_) => {
          $compile = _$compile_;
          $rootScope = _$rootScope_;
        },
      ]);
    });
  });

  describe("form[action]", () => {
    beforeEach(() => {
      createInjector(["myModule"]).invoke([
        "$compile",
        "$rootScope",

        (_$compile_, _$rootScope_) => {
          $compile = _$compile_;
          $rootScope = _$rootScope_;
        },
      ]);
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
  });

  describe("link[href]", () => {
    beforeEach(() => {
      createInjector(["myModule"]).invoke([
        "$compile",
        "$rootScope",

        (_$compile_, _$rootScope_) => {
          $compile = _$compile_;
          $rootScope = _$rootScope_;
        },
      ]);
    });

    it("should reject invalid RESOURCE_URLs", async () => {
      const element = $compile(
        '<link ng-prop-href="testUrl" rel="stylesheet" />',
      )($rootScope);

      $rootScope.testUrl = "https://evil.example.org/css.css";
      await wait();
      expect(logs[0]).toMatch(/insecurl/);
    });
  });

  describe("*[style]", () => {
    it("should set style for plain string values", async () => {
      const element = $compile('<div ng-prop-style="style"></div>')($rootScope);

      $rootScope.style = "margin-left: 10px";
      await wait();
      expect(element.style["margin-left"]).toEqual("10px");
    });
  });
});
