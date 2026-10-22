// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import { wait, waitUntil } from "../../shared/test-utils.ts";

describe("ngSwitch", () => {
  let $scope;

  let $compile;

  let element;

  beforeEach(() => {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    window.angular.createModule("test", []);
    const injector = window.angular.bootstrap(
      document.getElementById("app", ["test"]),
    );

    injector.invoke([
      "$rootScope",
      "$compile",
      ($rootScope, _$compile_) => {
        $scope = $rootScope.new();
        $compile = _$compile_;
      },
    ]);
  });

  afterEach(() => {
    dealoc(element);
  });

  it("preserves SVG namespaces when a transcluded container switches cases", async () => {
    element = document.createElement("div");
    element.innerHTML =
      '<svg svg-container><g ng-switch="shape">' +
      '<circle ng-switch-when="circle" r="5"></circle>' +
      '<rect ng-switch-when="rect" width="10" height="10"></rect>' +
      "</g></svg>";
    const angular = new Angular();

    angular.createModule("svgSwitch", []).directive("svgContainer", () => ({
      template: "<svg ng-transclude></svg>",
      replace: true,
      transclude: true,
    }));
    const injector = angular.bootstrap(element, ["svgSwitch"]);
    const scope = injector.get("$rootScope");

    try {
      scope.shape = "circle";
      await wait();
      expect(element.querySelector("circle").namespaceURI).toBe(
        "http://www.w3.org/2000/svg",
      );
      expect(element.querySelector("rect")).toBeNull();

      scope.shape = "rect";
      await wait();
      expect(element.querySelector("rect").namespaceURI).toBe(
        "http://www.w3.org/2000/svg",
      );
      expect(element.querySelector("circle")).toBeNull();
    } finally {
      angular._composition.destroy();
    }
  });

  it("should switch on value change", async () => {
    element = $compile(
      '<div ng-switch="select">' +
        '<div ng-switch-when="1">first:{{name}}</div>' +
        '<div ng-switch-when="2">second:{{name}}</div>' +
        '<div ng-switch-when="true">true:{{name}}</div>' +
        "</div>",
    )($scope);
    expect(element.innerHTML).toEqual("<!----><!----><!---->");
    $scope.select = 1;
    await wait();
    expect(element.textContent).toEqual("first:");
    $scope.name = "shyam";
    await wait();
    expect(element.textContent).toEqual("first:shyam");
    $scope.select = undefined;
    await wait();
    expect(element.textContent).toEqual("");
    $scope.select = 2;
    await wait();
    expect(element.textContent).toEqual("second:shyam");
    $scope.name = "misko";
    await wait();
    expect(element.textContent).toEqual("second:misko");
    $scope.select = true;
    await wait();
    expect(element.textContent).toEqual("true:misko");
  });

  it("should read data-ng-switch and data-ng-switch-when from host elements", async () => {
    element = $compile(
      '<div data-ng-switch="select">' +
        '<div data-ng-switch-when="1">first</div>' +
        '<div data-ng-switch-when="2">second</div>' +
        "</div>",
    )($scope);

    $scope.select = 1;
    await wait();
    expect(element.textContent).toEqual("first");

    $scope.select = 2;
    await wait();
    expect(element.textContent).toEqual("second");
  });

  it("should use the default case when the switch expression is missing", async () => {
    element = $compile(
      "<ng-switch>" +
        '<div ng-switch-when="1">first</div>' +
        "<div ng-switch-default>default</div>" +
        "</ng-switch>",
    )($scope);

    await wait();

    expect(element.textContent).toEqual("default");
  });

  it("should show all switch-whens that match the current value", async () => {
    element = $compile(
      '<ul ng-switch="select">' +
        '<li ng-switch-when="1">first:{{name}}</li>' +
        '<li ng-switch-when="1">, first too:{{name}}</li>' +
        '<li ng-switch-when="2">second:{{name}}</li>' +
        '<li ng-switch-when="true">true:{{name}}</li>' +
        "</ul>",
    )($scope);
    expect(element.innerHTML).toEqual("<!----><!----><!----><!---->");
    $scope.select = 1;
    await wait();
    expect(element.textContent).toEqual("first:, first too:");
    $scope.name = "shyam";
    await wait();
    expect(element.textContent).toEqual("first:shyam, first too:shyam");

    $scope.select = 2;
    await wait();
    expect(element.textContent).toEqual("second:shyam");
    $scope.name = "misko";
    await wait();
    expect(element.textContent).toEqual("second:misko");

    $scope.select = true;
    await wait();
    expect(element.textContent).toEqual("true:misko");
  });

  it("should switch on switch-when-default", async () => {
    element = $compile(
      '<ng-switch on="select">' +
        '<div ng-switch-when="1">one</div>' +
        "<div ng-switch-default>other</div>" +
        "</ng-switch>",
    )($scope);
    await wait();
    expect(element.textContent).toEqual("other");
    $scope.select = 1;
    await wait();
    expect(element.textContent).toEqual("one");
  });

  it("should show all switch-when-default", async () => {
    element = $compile(
      '<ul ng-switch="select">' +
        '<li ng-switch-when="1">one</li>' +
        "<li ng-switch-default>other</li>" +
        "<li ng-switch-default>, other too</li>" +
        "</ul>",
    )($scope);
    await wait();
    expect(element.textContent).toEqual("other, other too");
    $scope.select = 1;
    await wait();
    expect(element.textContent).toEqual("one");
  });

  it("should always display the elements that do not match a switch", async () => {
    element = $compile(
      '<ul ng-switch="select">' +
        "<li>always </li>" +
        '<li ng-switch-when="1">one </li>' +
        '<li ng-switch-when="2">two </li>' +
        "<li ng-switch-default>other, </li>" +
        "<li ng-switch-default>other too </li>" +
        "</ul>",
    )($scope);
    await wait();
    expect(element.textContent).toEqual("always other, other too ");
    $scope.select = 1;
    await wait();
    expect(element.textContent).toEqual("always one ");
  });

  it(
    "should display the elements that do not have ngSwitchWhen nor " +
      "ngSwitchDefault at the position specified in the template, when the " +
      "first and last elements in the ngSwitch body do not have a ngSwitch* " +
      "directive",
    async () => {
      element = $compile(
        '<ul ng-switch="select">' +
          "<li>1</li>" +
          '<li ng-switch-when="1">2</li>' +
          "<li>3</li>" +
          '<li ng-switch-when="2">4</li>' +
          "<li ng-switch-default>5</li>" +
          "<li>6</li>" +
          "<li ng-switch-default>7</li>" +
          "<li>8</li>" +
          "</ul>",
      )($scope);
      await wait();
      expect(element.textContent).toEqual("135678");
      $scope.select = 1;
      await wait();
      expect(element.textContent).toEqual("12368");
    },
  );

  it(
    "should display the elements that do not have ngSwitchWhen nor " +
      "ngSwitchDefault at the position specified in the template when the " +
      "first and last elements in the ngSwitch have a ngSwitch* directive",
    async () => {
      element = $compile(
        '<ul ng-switch="select">' +
          '<li ng-switch-when="1">2</li>' +
          "<li>3</li>" +
          '<li ng-switch-when="2">4</li>' +
          "<li ng-switch-default>5</li>" +
          "<li>6</li>" +
          "<li ng-switch-default>7</li>" +
          "</ul>",
      )($scope);
      await wait();
      expect(element.textContent).toEqual("3567");
      $scope.select = 1;
      await wait();
      expect(element.textContent).toEqual("236");
    },
  );

  it("should properly support case labels with different numbers of transclude fns", async () => {
    element = $compile(
      '<div ng-switch="mode">' +
        '<p ng-switch-when="a">Block1</p>' +
        '<p ng-switch-when="a">Block2</p>' +
        '<a href ng-switch-when="b">a</a>' +
        "</div>",
    )($scope);

    $scope.mode = "a";
    await wait();
    expect(element.children.length).toBe(2);

    $scope.mode = "b";
    await wait();
    expect(element.children.length).toBe(1);

    $scope.mode = "a";
    await wait();
    expect(element.children.length).toBe(2);

    $scope.mode = "b";
    await wait();
    expect(element.children.length).toBe(1);
  });

  it("should defer switch DOM scheduling while retention is paused", async () => {
    let trackSwitchFrames = false;
    let switchFrameCalls = 0;

    spyOn(window, "requestAnimationFrame").and.callFake(
      (callback: () => void): number => {
        if (trackSwitchFrames) {
          switchFrameCalls += 1;
        }

        setTimeout(() => callback(0));

        return 999;
      },
    );

    trackSwitchFrames = true;

    element = $compile(
      '<div ng-switch="mode">' +
        '<div ng-switch-when="one" animate>one</div>' +
        '<div ng-switch-when="two" animate>two</div>' +
        '<div ng-switch-when="three" animate>three</div>' +
        "</div>",
    )($scope);

    $scope.mode = "one";
    await waitUntil(
      () => element.textContent === "one",
      1000,
      "Timed out waiting for initial switch case",
    );
    expect(element.textContent).toBe("one");
    const callsAfterOne = switchFrameCalls;

    $scope.mode = "two";
    await waitUntil(
      () => element.textContent === "two",
      1000,
      "Timed out waiting for active switch case",
    );

    expect(switchFrameCalls).toBeGreaterThan(callsAfterOne);
    const callsDuringActiveSwitch = switchFrameCalls;

    $scope.broadcast("$viewRetentionPause", {
      _pause: "schedulers",
    });
    trackSwitchFrames = false;

    $scope.mode = "three";
    await wait();

    expect(switchFrameCalls).toBe(callsDuringActiveSwitch);
    expect(element.textContent).toBe("two");

    $scope.broadcast("$viewRetentionResume", {
      _pause: "background",
    });
    await wait();

    expect(element.textContent).toBe("two");

    $scope.broadcast("$viewRetentionResume", {
      _pause: "schedulers",
    });
    trackSwitchFrames = true;
    await waitUntil(
      () => element.textContent === "three",
      1000,
      "Timed out waiting for resumed switch case",
    );

    expect(element.textContent).toBe("three");
  });

  it("does not defer switch scheduling for unrelated retention mode", async () => {
    element = $compile(
      '<div ng-switch="mode">' +
        '<div ng-switch-when="one" animate>one</div>' +
        '<div ng-switch-when="two" animate>two</div>' +
        "</div>",
    )($scope);

    $scope.mode = "one";
    await waitUntil(
      () => element.textContent === "one",
      1000,
      "Timed out waiting for first switch case",
    );
    expect(element.textContent).toBe("one");

    $scope.mode = "two";
    await waitUntil(
      () => element.textContent === "two",
      1000,
      "Timed out waiting for second switch case",
    );

    $scope.broadcast("$viewRetentionPause", { _pause: "background" });
    $scope.mode = "one";
    await waitUntil(
      () => element.textContent === "one",
      1000,
      "Timed out waiting for background-retained switch case",
    );

    expect(element.textContent).toBe("one");
  });

  it("should handle changes to the switch value in a digest loop with multiple value matches", async () => {
    const scope = $scope.new();

    scope.value = "foo";

    scope.watch("value", () => {
      if (scope.value === "bar") {
        Promise.resolve().then(() => {
          scope.value = "baz";
        });
      }
    });

    element = $compile(
      '<div ng-switch="value">' +
        '<div ng-switch-when="foo">FOO 1</div>' +
        '<div ng-switch-when="foo">FOO 2</div>' +
        '<div ng-switch-when="bar">BAR</div>' +
        '<div ng-switch-when="baz">BAZ</div>' +
        "</div>",
    )(scope);

    await wait();
    expect(element.textContent).toBe("FOO 1FOO 2");

    scope.value = "bar";

    await wait();
    expect(element.textContent).toBe("BAZ");
  });

  describe("ngSwitchWhen separator", () => {
    it("should be possible to define a separator", async () => {
      element = $compile(
        '<div ng-switch="mode">' +
          '<p ng-switch-when="a|b" ng-switch-when-separator="|">Block1|</p>' +
          '<p ng-switch-when="a">Block2|</p>' +
          "<p ng-switch-default>Block3|</div>" +
          "</div>",
      )($scope);

      $scope.mode = "a";
      await wait();
      expect(element.children.length).toBe(2);
      expect(element.textContent).toBe("Block1|Block2|");
      $scope.mode = "b";
      await wait();
      expect(element.children.length).toBe(1);
      expect(element.textContent).toBe("Block1|");
      $scope.mode = "c";
      await wait();
      expect(element.children.length).toBe(1);
      expect(element.textContent).toBe("Block3|");
    });

    it("should read data-ng-switch-when-separator from the host element", async () => {
      element = $compile(
        '<div ng-switch="mode">' +
          '<p data-ng-switch-when="a|b" data-ng-switch-when-separator="|">Block1|</p>' +
          "<p ng-switch-default>Block2|</p>" +
          "</div>",
      )($scope);

      $scope.mode = "b";
      await wait();

      expect(element.textContent).toBe("Block1|");
    });

    it("should be possible to use a separator at the end of the value", async () => {
      element = $compile(
        '<div ng-switch="mode">' +
          '<p ng-switch-when="a|b|" ng-switch-when-separator="|">Block1|</p>' +
          '<p ng-switch-when="a">Block2|</p>' +
          "<p ng-switch-default>Block3|</div>" +
          "</div>",
      )($scope);

      $scope.mode = "a";
      await wait();
      expect(element.children.length).toBe(2);
      expect(element.textContent).toBe("Block1|Block2|");
      $scope.mode = "";
      await wait();
      expect(element.children.length).toBe(1);
      expect(element.textContent).toBe("Block1|");
      $scope.mode = "c";
      await wait();
      expect(element.children.length).toBe(1);
      expect(element.textContent).toBe("Block3|");
    });

    it("should be possible to use the empty string as a separator", async () => {
      element = $compile(
        '<div ng-switch="mode">' +
          '<p ng-switch-when="ab" ng-switch-when-separator="">Block1|</p>' +
          '<p ng-switch-when="a">Block2|</p>' +
          "<p ng-switch-default>Block3|</div>" +
          "</div>",
      )($scope);

      $scope.mode = "a";
      await wait();
      expect(element.children.length).toBe(2);
      expect(element.textContent).toBe("Block1|Block2|");
      $scope.mode = "b";
      await wait();
      expect(element.children.length).toBe(1);
      expect(element.textContent).toBe("Block1|");
      $scope.mode = "c";
      await wait();
      expect(element.children.length).toBe(1);
      expect(element.textContent).toBe("Block3|");
    });

    it("should be possible to use separators that are multiple characters long", async () => {
      element = $compile(
        '<div ng-switch="mode">' +
          '<p ng-switch-when="a||b|a" ng-switch-when-separator="||">Block1|</p>' +
          '<p ng-switch-when="a">Block2|</p>' +
          "<p ng-switch-default>Block3|</div>" +
          "</div>",
      )($scope);

      $scope.mode = "a";
      await wait();
      expect(element.children.length).toBe(2);
      expect(element.textContent).toBe("Block1|Block2|");
      $scope.mode = "b|a";
      await wait();
      expect(element.children.length).toBe(1);
      expect(element.textContent).toBe("Block1|");
      $scope.mode = "c";
      await wait();
      expect(element.children.length).toBe(1);
      expect(element.textContent).toBe("Block3|");
    });

    it("should ignore multiple appearances of the same item", async () => {
      element = $compile(
        '<div ng-switch="mode">' +
          '<p ng-switch-when="a|b|a" ng-switch-when-separator="|">Block1|</p>' +
          '<p ng-switch-when="a">Block2|</p>' +
          "<p ng-switch-default>Block3|</div>" +
          "</div>",
      )($scope);

      $scope.mode = "a";
      await wait();
      expect(element.children.length).toBe(2);
      expect(element.textContent).toBe("Block1|Block2|");
      $scope.mode = "b";
      await wait();
      expect(element.children.length).toBe(1);
      expect(element.textContent).toBe("Block1|");
      $scope.mode = "c";
      await wait();
      expect(element.children.length).toBe(1);
      expect(element.textContent).toBe("Block3|");
    });
  });
});
