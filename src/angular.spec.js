import {
  encodeUriQuery,
  encodeUriSegment,
  equals,
  extend,
  fromJson,
  getNodeName,
  hashKey,
  isArrayLike,
  isDate,
  isDefined,
  isElement,
  isError,
  isRegExp,
  isWindow,
  lowercase,
  nextUid,
  parseKeyValue,
  shallowCopy,
  snakeCase,
  toJson,
  toKeyValue,
  uppercase,
} from "./shared/utils.js";
import { createElementFromHTML, dealoc, startingTag } from "./shared/dom.js";
import { Angular } from "./angular.js";
import { createInjector } from "./core/di/injector.js";
import { wait } from "./shared/test-utils.js";
import { NgModule } from "./core/di/ng-module/ng-module.js";

describe("angular", () => {
  let element, document, module, injector, $rootScope, $compile, angular;

  beforeEach(() => {
    angular = new Angular();
    module = angular.module("defaultModule", ["ng"]);
    injector = createInjector(["ng", "defaultModule"]);
    $rootScope = injector.get("$rootScope");
    $compile = injector.get("$compile");
  });

  beforeEach(() => {
    document = window.document;
  });

  afterEach(() => {
    dealoc(element);
  });

  describe("case", () => {
    it("should change case", () => {
      expect(lowercase("ABC90")).toEqual("abc90");
      expect(uppercase("abc90")).toEqual("ABC90");
    });

    it("should change case of non-ASCII letters", () => {
      expect(lowercase("Ω")).toEqual("ω");
      expect(uppercase("ω")).toEqual("Ω");
    });
  });

  describe("extend", () => {
    it("should not copy the private $$hashKey", () => {
      let src;
      let dst;
      src = {};
      dst = {};
      hashKey(src);
      dst = extend(dst, src);
      expect(hashKey(dst)).not.toEqual(hashKey(src));
    });

    it("should copy the properties of the source object onto the destination object", () => {
      let destination;
      let source;
      destination = {};
      source = { foo: true };
      destination = extend(destination, source);
      expect(isDefined(destination.foo)).toBe(true);
    });

    it("ISSUE #4751 - should copy the length property of an object source to the destination object", () => {
      let destination;
      let source;
      destination = {};
      source = { radius: 30, length: 0 };
      destination = extend(destination, source);
      expect(isDefined(destination.length)).toBe(true);
      expect(isDefined(destination.radius)).toBe(true);
    });

    it("should retain the previous $$hashKey", () => {
      let src;
      let dst;
      let h;
      src = {};
      dst = {};
      h = hashKey(dst);
      hashKey(src);
      dst = extend(dst, src);
      // make sure we don't copy the key
      expect(hashKey(dst)).not.toEqual(hashKey(src));
      // make sure we retain the old key
      expect(hashKey(dst)).toEqual(h);
    });

    it("should work when extending with itself", () => {
      let src;
      let dst;
      let h;
      dst = src = {};
      h = hashKey(dst);
      dst = extend(dst, src);
      // make sure we retain the old key
      expect(hashKey(dst)).toEqual(h);
    });

    it("should copy dates by reference", () => {
      const src = { date: new Date() };
      const dst = {};

      extend(dst, src);

      expect(dst.date).toBe(src.date);
    });

    it("should copy elements by reference", () => {
      const src = {
        element: document.createElement("div"),
        jqObject: createElementFromHTML(
          "<p><span>s1</span><span>s2</span></p>",
        ).querySelectorAll("span"),
      };
      const dst = {};

      extend(dst, src);

      expect(dst.element).toBe(src.element);
      expect(dst.jqObject).toBe(src.jqObject);
    });
  });

  describe("shallow copy", () => {
    it("should make a copy", () => {
      const original = { key: {} };
      const copy = shallowCopy(original);
      expect(copy).toEqual(original);
      expect(copy.key).toBe(original.key);
    });

    it('should omit "$$"-prefixed properties', () => {
      const original = { $$some: true, $$: true };
      const clone = {};

      expect(shallowCopy(original, clone)).toBe(clone);
      expect(clone.$$some).toBeUndefined();
      expect(clone.$$).toBeUndefined();
    });

    it('should copy "$"-prefixed properties from copy', () => {
      const original = { $some: true };
      const clone = {};

      expect(shallowCopy(original, clone)).toBe(clone);
      expect(clone.$some).toBe(original.$some);
    });

    it("should handle arrays", () => {
      const original = [{}, 1];
      const clone = [];

      const aCopy = shallowCopy(original);
      expect(aCopy).not.toBe(original);
      expect(aCopy).toEqual(original);
      expect(aCopy[0]).toBe(original[0]);

      expect(shallowCopy(original, clone)).toBe(clone);
      expect(clone).toEqual(original);
    });

    it("should handle primitives", () => {
      expect(shallowCopy("test")).toBe("test");
      expect(shallowCopy(3)).toBe(3);
      expect(shallowCopy(true)).toBe(true);
    });
  });

  describe("elementHTML", () => {
    it("should dump element", () => {
      expect(
        startingTag('<div attr="123">something<span></span></div>'),
      ).toEqual('<div attr="123">');
    });
  });

  describe("equals", () => {
    it("should return true if same object", () => {
      const o = {};
      expect(equals(o, o)).toEqual(true);
      expect(equals(o, {})).toEqual(true);
      expect(equals(1, "1")).toEqual(false);
      expect(equals(1, "2")).toEqual(false);
    });

    it("should recurse into object", () => {
      expect(equals({}, {})).toEqual(true);
      expect(equals({ name: "misko" }, { name: "misko" })).toEqual(true);
      expect(equals({ name: "misko", age: 1 }, { name: "misko" })).toEqual(
        false,
      );
      expect(equals({ name: "misko" }, { name: "misko", age: 1 })).toEqual(
        false,
      );
      expect(equals({ name: "misko" }, { name: "adam" })).toEqual(false);
      expect(equals(["misko"], ["misko"])).toEqual(true);
      expect(equals(["misko"], ["adam"])).toEqual(false);
      expect(equals(["misko"], ["misko", "adam"])).toEqual(false);
    });

    it("should ignore undefined member variables during comparison", () => {
      const obj1 = { name: "misko" };
      const obj2 = { name: "misko", undefinedvar: undefined };

      expect(equals(obj1, obj2)).toBe(true);
      expect(equals(obj2, obj1)).toBe(true);
    });

    it("should ignore $ member variables", () => {
      expect(
        equals({ name: "misko", $id: 1 }, { name: "misko", $id: 2 }),
      ).toEqual(true);
      expect(equals({ name: "misko" }, { name: "misko", $id: 2 })).toEqual(
        true,
      );
      expect(equals({ name: "misko", $id: 1 }, { name: "misko" })).toEqual(
        true,
      );
    });

    it("should ignore functions", () => {
      expect(equals({ func() {} }, { bar() {} })).toEqual(true);
    });

    it("should work well with nulls", () => {
      expect(equals(null, "123")).toBe(false);
      expect(equals("123", null)).toBe(false);

      const obj = { foo: "bar" };
      expect(equals(null, obj)).toBe(false);
      expect(equals(obj, null)).toBe(false);

      expect(equals(null, null)).toBe(true);
    });

    it("should work well with undefined", () => {
      expect(equals(undefined, "123")).toBe(false);
      expect(equals("123", undefined)).toBe(false);

      const obj = { foo: "bar" };
      expect(equals(undefined, obj)).toBe(false);
      expect(equals(obj, undefined)).toBe(false);

      expect(equals(undefined, undefined)).toBe(true);
    });

    it("should treat two NaNs as equal", () => {
      expect(equals(NaN, NaN)).toBe(true);
    });

    it("should compare Scope instances only by identity", () => {
      const scope1 = $rootScope.$new();
      const scope2 = $rootScope.$new();

      expect(equals(scope1, scope1)).toBe(true);
      expect(equals(scope1, scope2)).toBe(false);
      expect(equals($rootScope, scope1)).toBe(false);
      expect(equals(undefined, scope1)).toBe(false);
    });

    it("should compare Window instances only by identity", () => {
      expect(equals(window, window)).toBe(true);
      expect(equals(window, window.document)).toBe(false);
      expect(equals(window, undefined)).toBe(false);
    });

    it("should compare dates", () => {
      expect(equals(new Date(0), new Date(0))).toBe(true);
      expect(equals(new Date(0), new Date(1))).toBe(false);
      expect(equals(new Date(0), 0)).toBe(false);
      expect(equals(0, new Date(0))).toBe(false);

      expect(equals(new Date(undefined), new Date(undefined))).toBe(true);
      expect(equals(new Date(undefined), new Date(0))).toBe(false);
      expect(equals(new Date(undefined), new Date(null))).toBe(false);
      expect(equals(new Date(undefined), new Date("wrong"))).toBe(true);
      expect(equals(new Date(), /abc/)).toBe(false);
    });

    it("should correctly test for keys that are present on Object.prototype", () => {
      expect(equals({}, { hasOwnProperty: 1 })).toBe(false);
      expect(equals({}, { toString: null })).toBe(false);
    });

    it("should compare regular expressions", () => {
      expect(equals(/abc/, /abc/)).toBe(true);
      expect(equals(/abc/i, new RegExp("abc", "i"))).toBe(true);
      expect(equals(new RegExp("abc", "i"), new RegExp("abc", "i"))).toBe(true);
      expect(equals(new RegExp("abc", "i"), new RegExp("abc"))).toBe(false);
      expect(equals(/abc/i, /abc/)).toBe(false);
      expect(equals(/abc/, /def/)).toBe(false);
      expect(equals(/^abc/, /abc/)).toBe(false);
      expect(equals(/^abc/, "/^abc/")).toBe(false);
      expect(equals(/abc/, new Date())).toBe(false);
    });

    it("should return false when comparing an object and an array", () => {
      expect(equals({}, [])).toBe(false);
      expect(equals([], {})).toBe(false);
    });

    it("should return false when comparing an object and a RegExp", () => {
      expect(equals({}, /abc/)).toBe(false);
      expect(equals({}, new RegExp("abc", "i"))).toBe(false);
    });

    it("should return false when comparing an object and a Date", () => {
      expect(equals({}, new Date())).toBe(false);
    });

    it("should safely compare objects with no prototype parent", () => {
      const o1 = extend(Object.create(null), {
        a: 1,
        b: 2,
        c: 3,
      });
      const o2 = extend(Object.create(null), {
        a: 1,
        b: 2,
        c: 3,
      });
      expect(equals(o1, o2)).toBe(true);
      o2.c = 2;
      expect(equals(o1, o2)).toBe(false);
    });

    it("should safely compare objects which shadow Object.prototype.hasOwnProperty", () => {
      const o1 = {
        hasOwnProperty: true,
        a: 1,
        b: 2,
        c: 3,
      };
      const o2 = {
        hasOwnProperty: true,
        a: 1,
        b: 2,
        c: 3,
      };
      expect(equals(o1, o2)).toBe(true);
      o1.hasOwnProperty = function () {};
      expect(equals(o1, o2)).toBe(false);
    });
  });

  describe("parseKeyValue", () => {
    it("should parse a string into key-value pairs", () => {
      expect(parseKeyValue("")).toEqual({});
      expect(parseKeyValue("simple=pair")).toEqual({ simple: "pair" });
      expect(parseKeyValue("first=1&second=2")).toEqual({
        first: "1",
        second: "2",
      });
      expect(parseKeyValue("escaped%20key=escaped%20value")).toEqual({
        "escaped key": "escaped value",
      });
      expect(parseKeyValue("emptyKey=")).toEqual({ emptyKey: "" });
      expect(parseKeyValue("flag1&key=value&flag2")).toEqual({
        flag1: true,
        key: "value",
        flag2: true,
      });
    });
    it("should ignore key values that are not valid URI components", () => {
      expect(() => {
        parseKeyValue("%");
      }).not.toThrow();
      expect(parseKeyValue("%")).toEqual({});
      expect(parseKeyValue("invalid=%")).toEqual({ invalid: undefined });
      expect(parseKeyValue("invalid=%&valid=good")).toEqual({
        invalid: undefined,
        valid: "good",
      });
    });
    it("should parse a string into key-value pairs with duplicates grouped in an array", () => {
      expect(parseKeyValue("")).toEqual({});
      expect(parseKeyValue("duplicate=pair")).toEqual({ duplicate: "pair" });
      expect(parseKeyValue("first=1&first=2")).toEqual({ first: ["1", "2"] });
      expect(
        parseKeyValue(
          "escaped%20key=escaped%20value&&escaped%20key=escaped%20value2",
        ),
      ).toEqual({ "escaped key": ["escaped value", "escaped value2"] });
      expect(parseKeyValue("flag1&key=value&flag1")).toEqual({
        flag1: [true, true],
        key: "value",
      });
      expect(parseKeyValue("flag1&flag1=value&flag1=value2&flag1")).toEqual({
        flag1: [true, "value", "value2", true],
      });
    });

    it("should ignore properties higher in the prototype chain", () => {
      expect(parseKeyValue("toString=123")).toEqual({
        toString: "123",
      });
    });

    it("should ignore badly escaped = characters", () => {
      expect(parseKeyValue("test=a=b")).toEqual({
        test: "a=b",
      });
    });
  });

  describe("toKeyValue", () => {
    it("should serialize key-value pairs into string", () => {
      expect(toKeyValue({})).toEqual("");
      expect(toKeyValue({ simple: "pair" })).toEqual("simple=pair");
      expect(toKeyValue({ first: "1", second: "2" })).toEqual(
        "first=1&second=2",
      );
      expect(toKeyValue({ "escaped key": "escaped value" })).toEqual(
        "escaped%20key=escaped%20value",
      );
      expect(toKeyValue({ emptyKey: "" })).toEqual("emptyKey=");
    });

    it("should serialize true values into flags", () => {
      expect(toKeyValue({ flag1: true, key: "value", flag2: true })).toEqual(
        "flag1&key=value&flag2",
      );
    });

    it("should serialize duplicates into duplicate param strings", () => {
      expect(toKeyValue({ key: [323, "value", true] })).toEqual(
        "key=323&key=value&key",
      );
      expect(toKeyValue({ key: [323, "value", true, 1234] })).toEqual(
        "key=323&key=value&key&key=1234",
      );
    });
  });

  describe("isArrayLike", () => {
    it("should return false if passed a number", () => {
      expect(isArrayLike(10)).toBe(false);
    });

    it("should return true if passed an array", () => {
      expect(isArrayLike([1, 2, 3, 4])).toBe(true);
    });

    it("should return true if passed an object", () => {
      expect(isArrayLike({ 0: "test", 1: "bob", 2: "tree", length: 3 })).toBe(
        true,
      );
    });

    it("should return true if passed arguments object", () => {
      function test(a, b, c) {
        expect(isArrayLike(arguments)).toBe(true);
      }
      test(1, 2, 3);
    });

    it("should return true if passed a nodelist", () => {
      const nodes1 = document.body.childNodes;
      expect(isArrayLike(nodes1)).toBe(true);

      const nodes2 = document.getElementsByTagName("nonExistingTagName");
      expect(isArrayLike(nodes2)).toBe(true);
    });

    it("should return false for objects with `length` but no matching indexable items", () => {
      const obj1 = {
        a: "a",
        b: "b",
        length: 10,
      };
      expect(isArrayLike(obj1)).toBe(false);

      const obj2 = {
        length: 0,
      };
      expect(isArrayLike(obj2)).toBe(false);
    });

    it("should return true for empty instances of an Array subclass", () => {
      function ArrayLike() {}
      ArrayLike.prototype = Array.prototype;

      const arrLike = new ArrayLike();
      expect(arrLike.length).toBe(0);
      expect(isArrayLike(arrLike)).toBe(true);

      arrLike.push(1, 2, 3);
      expect(arrLike.length).toBe(3);
      expect(isArrayLike(arrLike)).toBe(true);
    });
  });

  describe("encodeUriSegment", () => {
    it("should correctly encode uri segment and not encode chars defined as pchar set in rfc3986", () => {
      // don't encode alphanum
      expect(encodeUriSegment("asdf1234asdf")).toEqual("asdf1234asdf");

      // don't encode unreserved'
      expect(encodeUriSegment("-_.!~*'(); -_.!~*'();")).toEqual(
        "-_.!~*'();%20-_.!~*'();",
      );

      // don't encode the rest of pchar'
      expect(encodeUriSegment(":@&=+$, :@&=+$,")).toEqual(":@&=+$,%20:@&=+$,");

      // encode '/' and ' ''
      expect(encodeUriSegment("/; /;")).toEqual("%2F;%20%2F;");
    });
  });

  describe("encodeUriQuery", () => {
    it("should correctly encode uri query and not encode chars defined as pchar set in rfc3986", () => {
      // don't encode alphanum
      expect(encodeUriQuery("asdf1234asdf")).toEqual("asdf1234asdf");

      // don't encode unreserved
      expect(encodeUriQuery("-_.!~*'() -_.!~*'()")).toEqual(
        "-_.!~*'()+-_.!~*'()",
      );

      // don't encode the rest of pchar
      expect(encodeUriQuery(":@$, :@$,")).toEqual(":@$,+:@$,");

      // encode '&', ';', '=', '+', and '#'
      expect(encodeUriQuery("&;=+# &;=+#")).toEqual(
        "%26;%3D%2B%23+%26;%3D%2B%23",
      );

      // encode ' ' as '+'
      expect(encodeUriQuery("  ")).toEqual("++");

      // encode ' ' as '%20' when a flag is used
      expect(encodeUriQuery("  ", true)).toEqual("%20%20");

      // do not encode `null` as '+' when flag is used
      expect(encodeUriQuery("null", true)).toEqual("null");

      // do not encode `null` with no flag
      expect(encodeUriQuery("null")).toEqual("null");
    });
  });

  describe("angular.init", () => {
    let bootstrapSpy;
    let element;

    beforeEach(() => {
      element = {
        hasAttribute(name) {
          return !!element[name];
        },

        querySelector(arg) {
          return element.querySelector[arg] || null;
        },

        getAttribute(name) {
          return element[name];
        },
      };
      bootstrapSpy = spyOn(window.angular, "bootstrap").and.callThrough();
    });

    it("should do nothing when not found", () => {
      window.angular.init(element);
      expect(bootstrapSpy).not.toHaveBeenCalled();
    });

    it("should look for ngApp directive as attr", () => {
      window.angular.module("ABC", []);
      const appElement = createElementFromHTML('<div ng-app="ABC"></div>');

      window.angular.init(appElement);
      expect(bootstrapSpy).toHaveBeenCalled();
    });

    it("should look for ngApp directive using querySelectorAll", () => {
      window.angular.module("ABC", []);
      element.querySelector["[ng-app]"] = createElementFromHTML(
        '<div ng-app="ABC"></div>',
      );
      window.angular.init(element);
      expect(bootstrapSpy).toHaveBeenCalled();
    });

    it("should bootstrap anonymously", () => {
      element.querySelector["[ng-app]"] =
        createElementFromHTML("<div ng-app></div>");
      window.angular.init(element);
      expect(bootstrapSpy).toHaveBeenCalled();
    });

    it("should bootstrap if the annotation is on the root element", () => {
      const appElement = createElementFromHTML('<div ng-app=""></div>');
      window.angular.init(appElement);
      expect(bootstrapSpy).toHaveBeenCalled();
    });

    it("should complain if app module cannot be found", () => {
      const appElement = createElementFromHTML(
        '<div ng-app="doesntexist"></div>',
      );
      expect(() => {
        window.angular.init(appElement);
      }).toThrowError(/modulerr/);
    });

    it("should complain if an element has already been bootstrapped", () => {
      const element = createElementFromHTML("<div>bootstrap me!</div>");
      angular.bootstrap(element);

      expect(() => {
        angular.bootstrap(element);
      }).toThrowError(/btstrpd/);

      dealoc(element);
    });

    it("should complain if manually bootstrapping a document whose <html> element has already been bootstrapped", () => {
      angular.bootstrap(document.getElementsByTagName("html")[0]);
      expect(() => {
        angular.bootstrap(document);
      }).toThrowError(/btstrpd/);

      dealoc(document);
    });

    it("should bootstrap in strict mode when ng-strict-di attribute is specified", () => {
      const appElement = createElementFromHTML(
        '<div ng-app="" ng-strict-di></div>',
      );
      const root = createElementFromHTML("<div></div>");
      root.append(appElement);

      window.angular.init(root);
      expect(bootstrapSpy).toHaveBeenCalled();
      expect(bootstrapSpy.calls.mostRecent().args[2].strictDi).toBe(true);

      const injector = angular.getInjector(appElement);
      function testFactory($rootScope) {}
      expect(() => {
        injector.instantiate(testFactory);
      }).toThrowError(/strictdi/);

      dealoc(appElement);
    });
  });

  describe("AngularTS service", () => {
    it("should override services", () => {
      injector = createInjector([
        function ($provide) {
          $provide.value("fake", "old");
          $provide.value("fake", "new");
        },
      ]);
      expect(injector.get("fake")).toEqual("new");
    });

    it("should inject dependencies specified by $inject and ignore function argument name", () => {
      expect(
        angular
          .injector([
            function ($provide) {
              $provide.factory("svc1", () => "svc1");
              $provide.factory("svc2", [
                "svc1",
                function (s) {
                  return `svc2-${s}`;
                },
              ]);
            },
          ])
          .get("svc2"),
      ).toEqual("svc2-svc1");
    });
  });

  describe("isDate", () => {
    it("should return true for Date object", () => {
      expect(isDate(new Date())).toBe(true);
    });

    it("should return false for non Date objects", () => {
      expect(isDate([])).toBe(false);
      expect(isDate("")).toBe(false);
      expect(isDate(23)).toBe(false);
      expect(isDate({})).toBe(false);
    });
  });

  describe("isError", () => {
    function testErrorFromDifferentContext(createError) {
      const iframe = document.createElement("iframe");
      document.getElementById("app").appendChild(iframe);
      try {
        const error = createError(iframe.contentWindow);
        expect(isError(error)).toBe(true);
      } finally {
        iframe.parentElement.removeChild(iframe);
      }
    }

    it("should not assume objects are errors", () => {
      const fakeError = { message: "A fake error", stack: "no stack here" };
      expect(isError(fakeError)).toBe(false);
    });

    it("should detect simple error instances", () => {
      expect(isError(new Error())).toBe(true);
    });

    it("should detect errors from another context", () => {
      testErrorFromDifferentContext((win) => new win.Error());
    });

    it("should detect DOMException errors from another context", () => {
      testErrorFromDifferentContext((win) => {
        try {
          win.document.querySelectorAll("");
        } catch (e) {
          return e;
        }
      });
    });
  });

  describe("isRegExp", () => {
    it("should return true for RegExp object", () => {
      expect(isRegExp(/^foobar$/)).toBe(true);
      expect(isRegExp(new RegExp("^foobar$/"))).toBe(true);
    });

    it("should return false for non RegExp objects", () => {
      expect(isRegExp([])).toBe(false);
      expect(isRegExp("")).toBe(false);
      expect(isRegExp(23)).toBe(false);
      expect(isRegExp({})).toBe(false);
      expect(isRegExp(new Date())).toBe(false);
    });
  });

  describe("isWindow", () => {
    it("should return true for the Window object", () => {
      expect(isWindow(window)).toBe(true);
    });

    it("should return false for any object that is not a Window", () => {
      expect(isWindow([])).toBe(false);
      expect(isWindow("")).toBeFalsy();
      expect(isWindow(23)).toBe(false);
      expect(isWindow({})).toBe(false);
      expect(isWindow(new Date())).toBe(false);
      expect(isWindow(document)).toBe(false);
    });
  });

  describe("compile", () => {
    it("should link to existing node and create scope", async () => {
      const template = createElementFromHTML(
        '<div>{{greeting = "hello world"}}</div>',
      );
      element = $compile(template)($rootScope);
      await wait();

      expect(template.innerHTML).toEqual("hello world");
      expect($rootScope.greeting).toEqual("hello world");
    });

    it("should link to existing node and given scope", async () => {
      const template = createElementFromHTML(
        '<div>{{greeting = "hello world"}}</div>',
      );
      element = $compile(template)($rootScope);
      await wait();
      expect(template.textContent).toEqual("hello world");
    });

    it("should link to new node and given scope", async () => {
      const template = createElementFromHTML(
        '<div>{{greeting = "hello world"}}</div>',
      );

      const compile = $compile(template);
      let templateClone = template.cloneNode(true);

      element = compile($rootScope, (clone) => {
        templateClone = clone;
      });
      await wait();
      expect(template.textContent).toEqual('{{greeting = "hello world"}}');
      expect(element.textContent).toEqual("hello world");
      expect(element).toEqual(templateClone);
      expect($rootScope.greeting).toEqual("hello world");
    });

    it("should link to cloned node and create scope", async () => {
      const template = createElementFromHTML(
        '<div>{{greeting = "hello world"}}</div>',
      );
      element = $compile(template)($rootScope, () => {});
      await wait();
      expect(template.textContent).toEqual('{{greeting = "hello world"}}');
      expect(element.textContent).toEqual("hello world");
      expect($rootScope.greeting).toEqual("hello world");
    });
  });

  describe("getNodeName", () => {
    it('should correctly detect node name with "namespace" when xmlns is defined', () => {
      const div = createElementFromHTML(
        '<div xmlns:ngtest="http://angularjs.org/">' +
          '<ngtest:foo ngtest:attr="bar"></ngtest:foo>' +
          "</div>",
      );
      expect(getNodeName(div.childNodes[0])).toBe("ngtest:foo");
      expect(div.childNodes[0].getAttribute("ngtest:attr")).toBe("bar");
    });

    it('should correctly detect node name with "namespace" when xmlns is NOT defined', () => {
      const div = createElementFromHTML(
        '<div xmlns:ngtest="http://angularjs.org/">' +
          '<ngtest:foo ngtest:attr="bar"></ng-test>' +
          "</div>",
      );
      expect(getNodeName(div.childNodes[0])).toBe("ngtest:foo");
      expect(div.childNodes[0].getAttribute("ngtest:attr")).toBe("bar");
    });

    it("should return undefined for elements without the .nodeName property", () => {
      // some elements, like SVGElementInstance don't have .nodeName property
      expect(getNodeName({})).toBeUndefined();
    });
  });

  describe("nextUid()", () => {
    it("should return new id per call", () => {
      const seen = {};
      let count = 100;

      while (count--) {
        const current = nextUid();
        expect(typeof current).toBe("number");
        expect(seen[current]).toBeFalsy();
        seen[current] = true;
      }
    });
  });

  describe("bootstrap", () => {
    let module, injector, $rootScope, $compile, angular;

    beforeEach(() => {
      angular = new Angular();
      module = angular.module("defaultModule", ["ng"]);
      injector = createInjector(["defaultModule"]);
      $rootScope = injector.get("$rootScope");
      $compile = injector.get("$compile");
    });

    it("should bootstrap app", () => {
      const element = createElementFromHTML("<div>{{1+2}}</div>");
      const injector = angular.bootstrap(element);
      expect(injector).toBeDefined();
      expect(angular.getInjector(element)).toBe(injector);
      // dealoc(element);
    });

    it("should complain if app module can't be found", () => {
      const element = createElementFromHTML("<div>{{1+2}}</div>");

      expect(() => {
        angular.bootstrap(element, ["doesntexist"]);
      }).toThrowError(/modulerr/);

      expect(element.innerHTML).toBe("{{1+2}}");
      dealoc(element);
    });
  });

  describe("startingElementHtml", () => {
    it("should show starting element tag only", () => {
      expect(startingTag('<ng-abc x="2A"><div>text</div></ng-abc>')).toBe(
        '<ng-abc x="2A">',
      );
    });
  });

  describe("startingTag", () => {
    it("should allow passing in Nodes instead of Elements", () => {
      const txtNode = document.createTextNode("some text");
      expect(startingTag(txtNode)).toBe("some text");
    });
  });

  describe("snakeCase", () => {
    it("should convert to snakeCase", () => {
      expect(snakeCase("ABC")).toEqual("a_b_c");
      expect(snakeCase("alanBobCharles")).toEqual("alan_bob_charles");
    });

    it("should allow separator to be overridden", () => {
      expect(snakeCase("ABC", "&")).toEqual("a&b&c");
      expect(snakeCase("alanBobCharles", "&")).toEqual("alan&bob&charles");
    });
  });

  describe("fromJson", () => {
    it("should delegate to JSON.parse", () => {
      const spy = spyOn(JSON, "parse").and.callThrough();

      expect(fromJson("{}")).toEqual({});
      expect(spy).toHaveBeenCalled();
    });
  });

  describe("toJson", () => {
    it("should delegate to JSON.stringify", () => {
      const spy = spyOn(JSON, "stringify").and.callThrough();

      expect(toJson({})).toEqual("{}");
      expect(spy).toHaveBeenCalled();
    });

    it("should format objects pretty", () => {
      expect(toJson({ a: 1, b: 2 }, true)).toBe('{\n  "a": 1,\n  "b": 2\n}');
      expect(toJson({ a: { b: 2 } }, true)).toBe(
        '{\n  "a": {\n    "b": 2\n  }\n}',
      );
      expect(toJson({ a: 1, b: 2 }, false)).toBe('{"a":1,"b":2}');
      expect(toJson({ a: 1, b: 2 }, 0)).toBe('{"a":1,"b":2}');
      expect(toJson({ a: 1, b: 2 }, 1)).toBe('{\n "a": 1,\n "b": 2\n}');
      expect(toJson({ a: 1, b: 2 }, {})).toBe('{\n  "a": 1,\n  "b": 2\n}');
    });

    it("should not serialize properties starting with $$", () => {
      expect(toJson({ $$some: "value" }, false)).toEqual("{}");
    });

    it("should serialize properties starting with $", () => {
      expect(toJson({ $few: "v" }, false)).toEqual('{"$few":"v"}');
    });

    it("should not serialize scope instances", () => {
      expect(toJson({ key: $rootScope })).toEqual('{"key":"$SCOPE"}');
    });

    it("should serialize undefined as undefined", () => {
      expect(toJson(undefined)).toEqual(undefined);
    });
  });

  describe("isElement", () => {
    it("should return a boolean value", () => {
      const element = $compile("<p>Hello, world!</p>")($rootScope);
      const body = document.body;
      const expected = [
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
        true,
      ];
      const tests = [
        null,
        undefined,
        "string",
        1001,
        {},
        0,
        false,
        body,
        element,
      ];
      Object.entries(tests).forEach(([idx, value]) => {
        const result = isElement(value);
        expect(typeof result).toEqual("boolean");
        expect(result).toEqual(expected[idx]);
      });
    });

    // Issue #4805
    it("should return false for objects resembling a Backbone Collection", () => {
      // Backbone stuff is sort of hard to mock, if you have a better way of doing this,
      // please fix this.
      const fakeBackboneCollection = {
        children: [{}, {}, {}],
        find() {},
        on() {},
        off() {},
        bind() {},
      };
      expect(isElement(fakeBackboneCollection)).toBe(false);
    });

    it("should return false for arrays with node-like properties", () => {
      const array = [1, 2, 3];
      array.on = true;
      expect(isElement(array)).toBe(false);
    });
  });
});

describe("module loader", () => {
  let angular;
  beforeEach(() => {
    angular = new Angular();
  });

  it("allows registering a module", () => {
    const myModule = angular.module("myModule", []);
    expect(myModule).toBeDefined();
    expect(myModule.name).toEqual("myModule");
  });

  it("allows getting a module", () => {
    const myModule = angular.module("myModule", []);
    const gotModule = angular.module("myModule");
    expect(gotModule).toBeDefined();
    expect(gotModule).toBe(myModule);
  });

  it("allows recreating a module", () => {
    angular.module("myModule", []);
    const gotModule = angular.module("myModule");
    const myModule2 = angular.module("myModule", []);
    const gotModule2 = angular.module("myModule");
    expect(myModule2).toBeDefined();
    expect(myModule2).toBe(gotModule2);
    expect(myModule2).not.toBe(gotModule);
  });

  it("allows creates an instance on NgModule", () => {
    angular.module("myModule", []);
    const gotModule = angular.module("myModule");
    expect(gotModule).toBeInstanceOf(NgModule);
  });

  it("throws when trying to get a nonexistent module", () => {
    expect(() => {
      angular.module("nonexistent");
    }).toThrow();
  });

  it("does not allow a module to be called hasOwnProperty", () => {
    expect(() => {
      angular.module("hasOwnProperty", []);
    }).toThrow();
  });

  it("attaches the requires array to the registered module", () => {
    const myModule = angular.module("myModule", ["myOtherModule"]);
    expect(myModule.requires).toEqual(["myOtherModule"]);
  });

  it("replaces a module when registered with same name again", () => {
    const myModule = angular.module("myModule", []);
    const myNewModule = angular.module("myModule", []);
    expect(myNewModule).not.toBe(myModule);
  });

  it("should record calls", () => {
    const otherModule = angular.module("other", []);
    otherModule.config("otherInit");

    const myModule = angular.module("my", ["other"], "config");

    expect(
      myModule
        .decorator("dk", "dv")
        .provider("sk", "sv")
        .factory("fk", "fv")
        .service("a", "aa")
        .value("k", "v")
        .filter("f", "ff")
        .directive("d", "dd")
        .component("c", "cc")
        .controller("ctrl", "ccc")
        .config("init2")
        .constant("abc", 123)
        .run("runBlock"),
    ).toBe(myModule);

    expect(myModule.requires).toEqual(["other"]);
    expect(myModule.invokeQueue).toEqual([
      ["$provide", "constant", jasmine.objectContaining(["abc", 123])],
      ["$provide", "provider", jasmine.objectContaining(["sk", "sv"])],
      ["$provide", "factory", jasmine.objectContaining(["fk", "fv"])],
      ["$provide", "service", jasmine.objectContaining(["a", "aa"])],
      ["$provide", "value", jasmine.objectContaining(["k", "v"])],
      ["$filterProvider", "register", jasmine.objectContaining(["f", "ff"])],
      ["$compileProvider", "directive", jasmine.objectContaining(["d", "dd"])],
      ["$compileProvider", "component", jasmine.objectContaining(["c", "cc"])],
      [
        "$controllerProvider",
        "register",
        jasmine.objectContaining(["ctrl", "ccc"]),
      ],
    ]);
    expect(myModule.configBlocks).toEqual([
      ["$injector", "invoke", jasmine.objectContaining(["config"])],
      ["$provide", "decorator", jasmine.objectContaining(["dk", "dv"])],
      ["$injector", "invoke", jasmine.objectContaining(["init2"])],
    ]);
    expect(myModule.runBlocks).toEqual(["runBlock"]);
  });

  it("should not throw error when `module.decorator` is declared before provider that it decorates", () => {
    angular
      .module("theModule", [])
      .decorator("theProvider", ($delegate) => $delegate)
      .factory("theProvider", () => ({}));

    expect(() => {
      createInjector(["theModule"]);
    }).not.toThrow();
  });

  it("should run decorators in order of declaration, even when mixed with provider.decorator", () => {
    let log = "";

    angular
      .module("theModule", [])
      .factory("theProvider", () => ({ api: "provider" }))
      .decorator("theProvider", ($delegate) => {
        $delegate.api += "-first";
        return $delegate;
      })
      .config(($provide) => {
        $provide.decorator("theProvider", ($delegate) => {
          $delegate.api += "-second";
          return $delegate;
        });
      })
      .decorator("theProvider", ($delegate) => {
        $delegate.api += "-third";
        return $delegate;
      })
      .run((theProvider) => {
        log = theProvider.api;
      });

    createInjector(["theModule"]);
    expect(log).toBe("provider-first-second-third");
  });

  it("should decorate the last declared provider if multiple have been declared", () => {
    let log = "";

    angular
      .module("theModule", [])
      .factory("theProvider", () => ({
        api: "firstProvider",
      }))
      .decorator("theProvider", ($delegate) => {
        $delegate.api += "-decorator";
        return $delegate;
      })
      .factory("theProvider", () => ({
        api: "secondProvider",
      }))
      .run((theProvider) => {
        log = theProvider.api;
      });

    createInjector(["theModule"]);
    expect(log).toBe("secondProvider-decorator");
  });

  it("should allow module redefinition", () => {
    expect(angular.module("a", [])).not.toBe(angular.module("a", []));
  });

  it("should complain of no module", () => {
    expect(() => {
      angular.module("dontExist");
    }).toThrow();
  });

  it('should complain if a module is called "hasOwnProperty', () => {
    expect(() => {
      angular.module("hasOwnProperty", []);
    }).toThrow();
  });
});
