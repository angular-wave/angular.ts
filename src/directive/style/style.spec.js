import { Angular } from "../../angular.js";
import { createInjector } from "../../core/di/injector.js";
import { createElementFromHTML, dealoc } from "../../shared/dom.js";
import { wait } from "../../shared/test-utils.js";

describe("ng-style", () => {
  let $scope;
  let $compile;
  let element;

  beforeEach(() => {
    window.angular = new Angular();
    window.angular.module("myModule", ["ng"]);
    const injector = createInjector(["myModule"]).invoke(
      ($rootScope, _$compile_) => {
        $scope = $rootScope.$new();
        $compile = _$compile_;
      },
    );
  });

  afterEach(() => {
    dealoc(element);
  });

  it("should set", async () => {
    element = $compile("<div ng-style=\"{height: '40px'}\"></div>")($scope);
    await wait();
    expect(element.style.height).toEqual("40px");
  });

  it("should silently ignore undefined style", async () => {
    element = $compile('<div ng-style="myStyle"></div>')($scope);
    await wait();
    expect(element.classList.contains("ng-exception")).toBeFalsy();
  });

  it("should not deep watch objects", async () => {
    element = $compile('<div ng-style="{height: heightObj}"></div>')($scope);
    expect(parseInt(element.style.height + 0, 10)).toEqual(0); // height could be '' or '0px'
    $scope.heightObj = {
      toString() {
        return "40px";
      },
    };
    await wait();
    expect(element.style.height).toBe("40px");

    element.style.height = "10px";
    $scope.heightObj.otherProp = 123;
    expect(element.style.height).toBe("10px");
  });

  it("should support binding for object literals", async () => {
    element = $compile('<div ng-style="{height: heightStr}"></div>')($scope);
    expect(parseInt(element.style.height + 0, 10)).toEqual(0); // height could be '' or '0px'
    $scope.$apply('heightStr = "40px"');
    await wait();
    expect(element.style.height).toBe("40px");

    $scope.$apply('heightStr = "100px"');
    await wait();
    expect(element.style.height).toBe("100px");
  });

  describe("preserving styles set before and after compilation", () => {
    let scope;
    let preCompStyle;
    let preCompVal;
    let postCompStyle;
    let postCompVal;
    let element;

    beforeEach(async () => {
      preCompStyle = "width";
      preCompVal = "300px";
      postCompStyle = "height";
      postCompVal = "100px";
      element = createElementFromHTML('<div ng-style="styleObj"></div>');
      element.style[preCompStyle] = preCompVal;
      element.style.setProperty("background", "red");
      document.body.append(element);
      $compile(element)($scope);
      await wait();
      scope = $scope;
      scope.styleObj = { "margin-top": "44px" };
      await wait();
      element.style[postCompStyle] = postCompVal;
    });

    afterEach(() => {
      element.remove();
    });

    it("should not mess up stuff after compilation", async () => {
      element.style.margin = "44px";
      await wait();
      expect(element.style[preCompStyle]).toBe(preCompVal);
      expect(element.style["margin-top"]).toBe("44px");
      expect(element.style[postCompStyle]).toBe(postCompVal);
    });

    it("should not mess up stuff after $apply with no model changes", async () => {
      element.style["padding-top"] = "33px";
      await wait();
      await wait();

      expect(element.style[preCompStyle]).toBe(preCompVal);
      expect(element.style["margin-top"]).toBe("44px");
      expect(element.style[postCompStyle]).toBe(postCompVal);
      expect(element.style["padding-top"]).toBe("33px");
    });

    it("should not mess up stuff after $apply with non-colliding model changes", async () => {
      scope.styleObj = { "padding-top": "99px" };
      await wait();
      await wait();

      expect(element.style[preCompStyle]).toBe(preCompVal);
      expect(element.style["margin-top"]).not.toBe("44px");
      expect(element.style["padding-top"]).toBe("99px");
      expect(element.style[postCompStyle]).toBe(postCompVal);
    });

    it("should overwrite original styles after a colliding model change", async () => {
      scope.styleObj = { height: "99px", width: "88px" };
      await wait();

      expect(element.style[preCompStyle]).toBe("88px");
      expect(element.style[postCompStyle]).toBe("99px");

      scope.styleObj = {};
      await wait();

      expect(element.style[preCompStyle]).not.toBe("88px");
      expect(element.style[postCompStyle]).not.toBe("99px");
    });

    it("should clear style when the new model is null", async () => {
      scope.styleObj = { height: "99px", width: "88px" };
      await wait();
      expect(element.style[preCompStyle]).toBe("88px");
      expect(element.style[postCompStyle]).toBe("99px");
      scope.styleObj = null;
      await wait();
      expect(element.style[preCompStyle]).not.toBe("88px");
      expect(element.style[postCompStyle]).not.toBe("99px");
    });

    it("should clear style when the value is undefined or null", async () => {
      scope.styleObj = { height: "99px", width: "88px" };
      await wait(10);
      expect(element.style[preCompStyle]).toBe("88px");
      expect(element.style[postCompStyle]).toBe("99px");
      scope.styleObj = { height: undefined, width: null };
      await wait(10);
      expect(element.style[preCompStyle]).not.toBe("88px");
      expect(element.style[postCompStyle]).not.toBe("99px");
    });

    it("should clear style when the value is false", async () => {
      scope.styleObj = { height: "99px", width: "88px" };
      await wait();
      expect(element.style[preCompStyle]).toBe("88px");
      expect(element.style[postCompStyle]).toBe("99px");
      scope.styleObj = { height: false, width: false };
      await wait();
      expect(element.style[preCompStyle]).not.toBe("88px");
      expect(element.style[postCompStyle]).not.toBe("99px");
    });

    it("should set style when the value is zero", async () => {
      scope.styleObj = { height: "99px", width: "88px" };
      await wait();
      expect(element.style[preCompStyle]).toBe("88px");
      expect(element.style[postCompStyle]).toBe("99px");
      scope.styleObj = { height: 0, width: 0 };
      await wait();
      expect(element.style[preCompStyle]).toBe("0px");
      expect(element.style[postCompStyle]).toBe("0px");
    });
  });
});
