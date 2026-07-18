import { createRouterViewControllerInvocationLocals } from "./invocation-context.ts";

describe("router view controller invocation context", () => {
  it("combines route resolves with the public scope and element locals", () => {
    const scope = {} as ng.Scope;
    const element = document.createElement("ng-view");

    expect(
      createRouterViewControllerInvocationLocals(
        { user: { id: 42 } },
        scope,
        element,
      ),
    ).toEqual({
      user: { id: 42 },
      $scope: scope,
      $element: element,
    });
  });

  it("reserves $scope and $element for framework controller locals", () => {
    const scope = {} as ng.Scope;
    const element = document.createElement("ng-view");

    expect(
      createRouterViewControllerInvocationLocals(
        { $scope: "resolve scope", $element: "resolve element" },
        scope,
        element,
      ),
    ).toEqual({
      $scope: scope,
      $element: element,
    });
  });
});
