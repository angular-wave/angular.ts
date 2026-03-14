import { Angular } from "../../angular.js";
import { dealoc } from "../../shared/dom.js";
import { wait } from "../../shared/test-utils.js";

describe("ngSwitch", () => {
  let $scope;
  let $compile;
  let element;

  beforeEach(() => {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    window.angular.module("test", []);
    let injector = window.angular.bootstrap(
      document.getElementById("app", ["test"]),
    );
    injector.invoke(($rootScope, _$compile_) => {
      $scope = $rootScope.$new();
      $compile = _$compile_;
    });
  });

  afterEach(() => {
    dealoc(element);
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

    $scope.$apply('mode = "a"');
    await wait();
    expect(element.children.length).toBe(2);

    $scope.$apply('mode = "b"');
    await wait();
    expect(element.children.length).toBe(1);

    $scope.$apply('mode = "a"');
    await wait();
    expect(element.children.length).toBe(2);

    $scope.$apply('mode = "b"');
    await wait();
    expect(element.children.length).toBe(1);
  });

  it("should handle changes to the switch value in a digest loop with multiple value matches", async () => {
    const scope = $scope.$new();
    scope.value = "foo";

    scope.$watch("value", () => {
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

    scope.$apply('value = "bar"');

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

      $scope.$apply('mode = "a"');
      await wait();
      expect(element.children.length).toBe(2);
      expect(element.textContent).toBe("Block1|Block2|");
      $scope.$apply('mode = "b"');
      await wait();
      expect(element.children.length).toBe(1);
      expect(element.textContent).toBe("Block1|");
      $scope.$apply('mode = "c"');
      await wait();
      expect(element.children.length).toBe(1);
      expect(element.textContent).toBe("Block3|");
    });

    it("should be possible to use a separator at the end of the value", async () => {
      element = $compile(
        '<div ng-switch="mode">' +
          '<p ng-switch-when="a|b|" ng-switch-when-separator="|">Block1|</p>' +
          '<p ng-switch-when="a">Block2|</p>' +
          "<p ng-switch-default>Block3|</div>" +
          "</div>",
      )($scope);

      $scope.$apply('mode = "a"');
      await wait();
      expect(element.children.length).toBe(2);
      expect(element.textContent).toBe("Block1|Block2|");
      $scope.$apply('mode = ""');
      await wait();
      expect(element.children.length).toBe(1);
      expect(element.textContent).toBe("Block1|");
      $scope.$apply('mode = "c"');
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

      $scope.$apply('mode = "a"');
      await wait();
      expect(element.children.length).toBe(2);
      expect(element.textContent).toBe("Block1|Block2|");
      $scope.$apply('mode = "b"');
      await wait();
      expect(element.children.length).toBe(1);
      expect(element.textContent).toBe("Block1|");
      $scope.$apply('mode = "c"');
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

      $scope.$apply('mode = "a"');
      await wait();
      expect(element.children.length).toBe(2);
      expect(element.textContent).toBe("Block1|Block2|");
      $scope.$apply('mode = "b|a"');
      await wait();
      expect(element.children.length).toBe(1);
      expect(element.textContent).toBe("Block1|");
      $scope.$apply('mode = "c"');
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

      $scope.$apply('mode = "a"');
      await wait();
      expect(element.children.length).toBe(2);
      expect(element.textContent).toBe("Block1|Block2|");
      $scope.$apply('mode = "b"');
      await wait();
      expect(element.children.length).toBe(1);
      expect(element.textContent).toBe("Block1|");
      $scope.$apply('mode = "c"');
      await wait();
      expect(element.children.length).toBe(1);
      expect(element.textContent).toBe("Block3|");
    });
  });
});

// describe("ngSwitch animation", () => {
//   let body;
//   let element;
//   let $rootElement;

//   function html(content) {
//     $rootElement.innerHTML = content;
//     element = $rootElement.children[0];
//     return element;
//   }

//   beforeEach(
//     module(
//       () =>
//         // we need to run animation on attached elements;
//         function (_$rootElement_) {
//           $rootElement = _$rootElement_;
//           body = (document.body);
//           body.append($rootElement);
//         },
//     ),
//   );

//   afterEach(() => {
//     dealoc(body);
//     dealoc(element);
//   });

//   describe("behavior", () => {
//     it("should destroy the previous leave animation if a new one takes place", () => {
//       module("ngAnimate");
//       module(($animateProvider) => {
//         $animateProvider.register(".long-leave", () => ({
//           leave(element, done) {
//             // do nothing at all
//           },
//         }));
//       });
//       () => {
//         // inejct $compile, $scope, $animate, $templateCache
//         let item;
//         const $scope = $rootScope.$new();
//         element = $compile(
//           html(
//             '<div ng-switch="inc">' +
//               '<div ng-switch-when="one">one</div>' +
//               '<div ng-switch-when="two">two</div>' +
//               "</div>",
//           ),
//         )($scope);

//         $scope.$apply('inc = "one"');

//         let destroyed;
//         const inner = element.children(0);
//         inner.on("$destroy", () => {
//           destroyed = true;
//         });

//         $scope.$apply('inc = "two"');

//         $scope.$apply('inc = "one"');

//         expect(destroyed).toBe(true);
//       };
//     });
//   });

//   describe("events", () => {
//     beforeEach(module("ngAnimateMock"));

//     it("should fire off the enter animation", inject((
//       $compile,
//       $rootScope,
//       $animate,
//     ) => {
//       let item;
//       const $scope = $rootScope.$new();
//       element = $compile(
//         html(
//           '<div ng-switch on="val">' +
//             '<div ng-switch-when="one">one</div>' +
//             '<div ng-switch-when="two">two</div>' +
//             '<div ng-switch-when="three">three</div>' +
//             "</div>",
//         ),
//       )($scope);

//       ; // re-enable the animations;
//       $scope.val = "one";
//       ;

//       item = $animate.queue.shift();
//       expect(item.event).toBe("enter");
//       expect(item.element.textContent).toBe("one");
//     }));

//     it("should fire off the leave animation", inject((
//       $compile,
//       $rootScope,
//       $animate,
//     ) => {
//       let item;
//       const $scope = $rootScope.$new();
//       element = $compile(
//         html(
//           '<div ng-switch on="val">' +
//             '<div ng-switch-when="one">one</div>' +
//             '<div ng-switch-when="two">two</div>' +
//             '<div ng-switch-when="three">three</div>' +
//             "</div>",
//         ),
//       )($scope);

//       ; // re-enable the animations;
//       $scope.val = "two";
//       ;

//       item = $animate.queue.shift();
//       expect(item.event).toBe("enter");
//       expect(item.element.textContent).toBe("two");

//       $scope.val = "three";
//       ;

//       item = $animate.queue.shift();
//       expect(item.event).toBe("leave");
//       expect(item.element.textContent).toBe("two");

//       item = $animate.queue.shift();
//       expect(item.event).toBe("enter");
//       expect(item.element.textContent).toBe("three");
//     }));

//     it("should work with svg elements when the svg container is transcluded", () => {
//       module(($compileProvider) => {
//         $compileProvider.directive("svgContainer", () => ({
//           template: "<svg ng-transclude></svg>",
//           replace: true,
//           transclude: true,
//         }));
//       });
//       inject(($compile, $rootScope) => {
//         element = $compile(
//           '<svg-container ng-switch="inc"><circle ng-switch-when="one"></circle>' +
//             "</svg-container>",
//         )($rootScope);
//         $rootScope.inc = "one";
//         await wait();

//         const circle = element.querySelectorAll("circle");
//         expect(circle[0].toString()).toMatch(/SVG/);
//       });
//     });
//   });
// });
