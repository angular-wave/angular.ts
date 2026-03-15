import { createElementFromHTML, dealoc } from "../shared/dom.ts";
import { Angular } from "../angular.ts";
import { isObject } from "../shared/utils.ts";
import { isFunction, wait } from "../shared/utils.ts";
import { createInjector } from "../core/di/injector.ts";

describe("$animate", () => {
  describe("with animation", () => {
    let element = document.getElementById("app");
    let $compile;
    let $rootElement;
    let $rootScope;
    let defaultModule;
    let injector;
    let $animate;

    beforeEach(() => {
      element = document.getElementById("app");
      dealoc(element);
      window.angular = new Angular();
      defaultModule = window.angular.module("defaultModule", ["ng"]);
      injector = window.angular.bootstrap(element, ["defaultModule"]);
      injector.invoke(
        (_$compile_, _$rootElement_, _$rootScope_, _$animate_) => {
          $compile = _$compile_;
          $rootScope = _$rootScope_;
          $rootElement = _$rootElement_;
          $animate = _$animate_;
        },
      );
    });

    afterEach(() => {
      $rootScope.$flushQueue();
      dealoc(document.getElementById("app"));
    });

    it("should add element at the start of enter animation", () => {
      const child = createElementFromHTML("<div></div>");
      expect(element.childNodes.length).toBe(0);
      element = $compile(element)($rootScope);
      $animate.enter(child, element);
      expect(element.childNodes.length).toBe(1);
    });

    it("should enter the element to the start of the parent container", () => {
      for (let i = 0; i < 5; i++) {
        element.append(createElementFromHTML(`<div>${i}</div>`));
      }
      const child = createElementFromHTML("<div>first</div>");
      element = $compile(element)($rootScope);
      $animate.enter(child, element);
      expect(element.textContent).toEqual("first01234");
    });

    it("should remove the element at the end of leave animation", async () => {
      const child = createElementFromHTML("<div>test</div>");
      element.append(child);
      element = $compile(element)($rootScope);
      expect(element.childNodes.length).toBe(1);
      $animate.leave(child);
      $rootScope.$flushQueue();
      expect(element.childNodes.length).toBe(0);
    });

    it("should reorder the move animation", () => {
      const child1 = createElementFromHTML("<div>1</div>");
      const child2 = createElementFromHTML("<div>2</div>");
      element.append(child1);
      element.append(child2);
      element = $compile(element)($rootScope);
      expect(element.textContent).toBe("12");
      $animate.move(child1, element, child2);
      expect(element.textContent).toBe("21");
    });

    it("should apply styles instantly to the element", async () => {
      element = $compile(element)($rootScope);
      $animate.animate(element, { color: "rgb(0, 0, 0)" });
      expect(element.style.color).toBe("rgb(0, 0, 0)");
      $rootScope.$flushQueue();

      $animate.animate(
        element,
        { color: "rgb(255, 0, 0)" },
        { color: "rgb(0, 255, 0)" },
      );
      $rootScope.$flushQueue();
      expect(element.style.color).toBe("rgb(0, 255, 0)");
    });

    it("should perform DOM operations (post-digest)", async () => {
      expect(element.classList.contains("ng-hide")).toBeFalse();
      $animate.addClass(element, "ng-hide");
      await wait(100);
      expect(element.classList.contains("ng-hide")).toBeTrue();
    });

    it("should run each method and return a promise", () => {
      const element = createElementFromHTML("<div></div>");
      const move = createElementFromHTML("<div></div>");
      const parent = document.body;
      parent.append(move);

      expect($animate.enter(element, parent).then).toBeDefined();
      expect($animate.move(element, move).then).toBeDefined();
      expect($animate.addClass(element, "on").then).toBeDefined();
      expect($animate.removeClass(element, "off").then).toBeDefined();
      expect($animate.setClass(element, "on", "off").then).toBeDefined();
      expect($animate.leave(element).then).toBeDefined();
    });

    it("should provide and `cancel` methods", () => {
      expect($animate.cancel({})).toBeUndefined();
    });

    it("should provide the `on` and `off` methods", () => {
      expect(isFunction($animate.on)).toBe(true);
      expect(isFunction($animate.off)).toBe(true);
    });

    it("should add and remove classes on SVG elements", () => {
      if (!window.SVGElement) return;
      const svg = createElementFromHTML("<svg><rect></rect></svg>");
      const rect = svg.firstElementChild;
      expect(rect.classList.contains("ng-hide")).toBeFalse();
      $animate.addClass(rect, "ng-hide");
      expect(rect.classList.contains("ng-hide")).toBeTrue();
      $animate.removeClass(rect, "ng-hide");
      expect(rect.classList.contains("ng-hide")).toBeFalse();
    });

    it("should throw error on wrong selector", () => {
      createInjector([
        "ng",
        ($animateProvider) => {
          expect(() => {
            $animateProvider.register("abc", null);
          }).toThrowError(/notcsel/);
        },
      ]);
    });

    it("should register the animation and be available for lookup", () => {
      let provider;
      createInjector([
        "ng",
        ($animateProvider) => {
          provider = $animateProvider;
        },
      ]);
      // by using hasOwnProperty we know for sure that the lookup object is an empty object
      // instead of inheriting properties from its original prototype.
      expect(provider._registeredAnimations.hasOwnProperty).toBeFalsy();

      provider.register(".filter", () => {
        /* empty */
      });
      expect(provider._registeredAnimations.filter).toBe(".filter-animation");
    });

    it("should apply and retain inline styles on the element that is animated", () => {
      const element = createElementFromHTML("<div></div>");
      const parent = createElementFromHTML("<div></div>");
      const other = createElementFromHTML("<div></div>");
      parent.append(other);

      $animate.enter(element, parent, null, {
        to: { color: "red" },
      });
      assertColor("red");

      $animate.move(element, null, other, {
        to: { color: "yellow" },
      });
      assertColor("yellow");

      $animate.addClass(element, "on", {
        to: { color: "green" },
      });
      assertColor("green");

      $animate.setClass(element, "off", "on", {
        to: { color: "black" },
      });
      assertColor("black");

      $animate.removeClass(element, "off", {
        to: { color: "blue" },
      });
      assertColor("blue");

      $animate.leave(element, {
        to: { color: "yellow" },
      });
      assertColor("yellow");

      function assertColor(color) {
        expect(element.style.color).toBe(color);
      }
    });

    it("should merge the from and to styles that are provided", () => {
      const element = createElementFromHTML("<div></div>");

      element.style.color = "red";
      $animate.addClass(element, "on", {
        from: { color: "green" },
        to: { borderColor: "purple" },
      });
      const { style } = element;
      expect(style.color).toBe("green");
      expect(style.borderColor).toBe("purple");
    });

    it("should avoid cancelling out add/remove when the element already contains the class", () => {
      const element = createElementFromHTML('<div class="ng-hide"></div>');

      $animate.addClass(element, "ng-hide");
      $animate.removeClass(element, "ng-hide");
      expect(element.classList.contains("ng-hide")).toBeFalse();
    });

    it("should avoid cancelling out remove/add if the element does not contain the class", () => {
      const element = createElementFromHTML("<div></div>");

      $animate.removeClass(element, "ng-hide");
      $animate.addClass(element, "ng-hide");
      expect(element.classList.contains("ng-hide")).toBeTrue();
    });

    ["enter", "move"].forEach((method) => {
      it('should accept an unwrapped "parent" element for the $prop event', () => {
        const element = createElementFromHTML("<div></div>");
        const parent = document.createElement("div");
        $rootElement.append(parent);

        $animate[method](element, parent);
        expect(element.parentNode).toBe(parent);
      });
    });

    ["enter", "move"].forEach((method) => {
      it('should accept an unwrapped "after" element for the $prop event', () => {
        const element = createElementFromHTML("<div></div>");
        const after = document.createElement("div");
        $rootElement.append(after);

        $animate[method](element, null, after);
        expect(element.previousSibling).toBe(after);
      });
    });

    [
      "enter",
      "move",
      "leave",
      "addClass",
      "removeClass",
      "setClass",
      "animate",
    ].forEach((event) => {
      it("$prop() should operate using a native DOM element", () => {
        const captureSpy = jasmine.createSpy();
        const dummy = document.getElementById("app");
        dealoc(dummy);
        window.angular = new Angular();
        defaultModule = window.angular
          .module("defaultModule", ["ng"])
          .value("$$animateQueue", {
            push: captureSpy,
          });
        injector = window.angular.bootstrap(dummy, ["defaultModule"]);
        injector.invoke(
          (_$compile_, _$rootElement_, _$rootScope_, _$animate_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
            $rootElement = _$rootElement_;
            $animate = _$animate_;
          },
        );

        element = createElementFromHTML("<div></div>");
        const parent2 = createElementFromHTML("<div></div>");
        const parent = $rootElement;
        parent.append(parent2);

        if (event !== "enter" && event !== "move") {
          parent.append(element);
        }

        let fn;
        const invalidOptions = function () {};

        switch (event) {
          case "enter":
          case "move":
            fn = function () {
              $animate[event](element, parent, parent2, invalidOptions);
            };
            break;

          case "addClass":
            fn = function () {
              $animate.addClass(element, "klass", invalidOptions);
            };
            break;

          case "removeClass":
            element.className = "klass";
            fn = function () {
              $animate.removeClass(element, "klass", invalidOptions);
            };
            break;

          case "setClass":
            element.className = "two";
            fn = function () {
              $animate.setClass(element, "one", "two", invalidOptions);
            };
            break;

          case "leave":
            fn = function () {
              $animate.leave(element, invalidOptions);
            };
            break;

          case "animate":
            const toStyles = { color: "red" };
            fn = function () {
              $animate.animate(element, {}, toStyles, "klass", invalidOptions);
            };
            break;
        }

        expect(() => {
          fn();
        }).not.toThrow();

        const optionsArg = captureSpy.calls.mostRecent().args[2];
        expect(optionsArg).not.toBe(invalidOptions);
        expect(isObject(optionsArg)).toBeTruthy();
      });
    });

    it("should not break postDigest for subsequent elements if addClass contains non-valid CSS class names", () => {
      const element1 = createElementFromHTML("<div></div>");
      const element2 = createElementFromHTML("<div></div>");

      $animate.enter(element1, $rootElement, null, { addClass: " " });
      $animate.enter(element2, $rootElement, null, { addClass: "valid-name" });
      $rootScope.$flushQueue();
      expect(element2.classList.contains("valid-name")).toBeTruthy();
    });

    it("should normalize the provided options input while queueing the animation", () => {
      const element = createElementFromHTML("<div></div>");
      const parent = $rootElement;

      const initialOptions = {
        from: { height: "50px" },
        to: { width: "50px" },
        addClass: "one",
        removeClass: "two",
      };

      const copiedOptions = structuredClone(initialOptions);
      expect(copiedOptions).toEqual(initialOptions);

      $animate.enter(element, parent, null, copiedOptions);
      expect(copiedOptions.from).toEqual(initialOptions.from);
      expect(copiedOptions.to).toEqual(initialOptions.to);
      expect(copiedOptions.addClass).toBe("one");
      expect(copiedOptions.removeClass).toBeUndefined();
      expect(copiedOptions._prepared).toBeTrue();
      expect(typeof copiedOptions.domOperation).toBe("function");
    });

    describe("CSS class DOM manipulation", () => {
      let element;

      afterEach(() => {
        dealoc(element);
      });

      it("should apply class manipulation consistently", () => {
        element = createElementFromHTML("<p>test</p>");

        $animate.addClass(element, "test-class1");
        expect(element.classList.contains("test-class1")).toBeTrue();

        $animate.removeClass(element, "test-class1");

        $animate.addClass(element, "test-class2");
        expect(element.classList.contains("test-class2")).toBeTrue();

        $animate.setClass(element, "test-class3", "test-class4");
        expect(element.classList.contains("test-class3")).toBeTrue();
        expect(element.classList.contains("test-class4")).toBeFalse();
        $rootScope.$flushQueue();

        expect(element.classList.contains("test-class1")).toBeFalse();
        expect(element.classList.contains("test-class4")).toBeFalse();
        expect(element.classList.contains("test-class2")).toBeTrue();
        expect(element.classList.contains("test-class3")).toBeTrue();
      });

      it("should defer class manipulation until postDigest when outside of digest", () => {
        element = createElementFromHTML('<p class="test-class4">test</p>');

        $animate.addClass(element, "test-class1");
        $animate.removeClass(element, "test-class1");
        $animate.addClass(element, "test-class2");
        $animate.setClass(element, "test-class3", "test-class4");
        $rootScope.$flushQueue();
        expect(element.classList.contains("test-class1")).toBeFalse();
        expect(element.classList.contains("test-class2")).toBeTrue();
        expect(element.classList.contains("test-class3")).toBeTrue();
      });

      it("should perform class manipulation in expected order at end of digest", () => {
        element = createElementFromHTML('<p class="test-class3">test</p>');

        $animate.addClass(element, "test-class1");
        $animate.addClass(element, "test-class2");
        $animate.removeClass(element, "test-class1");
        $animate.removeClass(element, "test-class3");
        $animate.addClass(element, "test-class3");
        $rootScope.$flushQueue();
        expect(element.classList.contains("test-class3")).toBeTrue();
      });

      it("should return a promise which is resolved on a different turn", () => {
        element = createElementFromHTML('<p class="test2">test</p>');

        $animate.addClass(element, "test1");
        $animate.removeClass(element, "test2");

        element = createElementFromHTML('<p class="test4">test</p>');

        $animate.addClass(element, "test3");
        $animate.removeClass(element, "test4");
        $rootScope.$flushQueue();

        expect(element.classList.contains("test3")).toBeTrue();
      });

      it("should apply class manipulation consistently for SVG", () => {
        if (!window.SVGElement) return;

        element = createElementFromHTML("<svg><g></g></svg>");
        const target = element.children[0];

        $animate.addClass(target, "test-class1");

        $animate.removeClass(target, "test-class1");

        $animate.addClass(target, "test-class2");
        expect(target.classList.contains("test-class2")).toBeTrue();

        $animate.setClass(target, "test-class3", "test-class4");
        expect(target.classList.contains("test-class3")).toBeTrue();
        expect(target.classList.contains("test-class4")).toBeFalse();
        $rootScope.$flushQueue();

        expect(target.classList.contains("test-class2")).toBeTrue();
      });

      it("should defer class manipulation until postDigest when outside of digest for SVG", () => {
        if (!window.SVGElement) return;

        element = createElementFromHTML(
          '<svg><g class="test-class4"></g></svg>',
        );
        const target = element.children[0];
        $animate.addClass(target, "test-class1");
        $animate.removeClass(target, "test-class1");
        $animate.addClass(target, "test-class2");
        $animate.setClass(target, "test-class3", "test-class4");
        $rootScope.$flushQueue();

        expect(target.classList.contains("test-class2")).toBeTrue();
        expect(target.classList.contains("test-class3")).toBeTrue();
      });

      it("should perform class manipulation in expected order at end of digest for SVG", () => {
        if (!window.SVGElement) return;
        element = createElementFromHTML(
          '<svg><g class="test-class3"></g></svg>',
        );
        const target = element.children[0];

        $animate.addClass(target, "test-class1");
        $animate.addClass(target, "test-class2");
        $animate.removeClass(target, "test-class1");
        $animate.removeClass(target, "test-class3");
        $animate.addClass(target, "test-class3");
        $rootScope.$flushQueue();
        expect(target.classList.contains("test-class3")).toBeTrue();
      });
    });
  });
});
