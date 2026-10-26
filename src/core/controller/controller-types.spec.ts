import type { ControllerService } from "./controller.ts";

// Compile-time contracts; runtime behavior is covered by controller.spec.ts.
function checkControllerTypes(
  service: ControllerService,
  scope: ng.Scope,
  element: Node,
) {
  const Controller = (): undefined => undefined;

  service(Controller);
  service(Controller, {});
  service(Controller, { answer: 42 });
  service(Controller, { $scope: {} });
  service(Controller, { $element: element });
  service(Controller, { $scope: scope, $element: element, answer: 42 });

  const initialize = service(Controller, undefined, true);
  const instance: object = initialize();
  const pending: object = initialize._instance;
  void instance;
  void pending;

  // @ts-expect-error Controller locals require an object when a scope is supplied.
  service(Controller, { $scope: 42 });
  // @ts-expect-error Controller element locals require a DOM node.
  service(Controller, { $element: "div" });
  // @ts-expect-error Deferred initializers have no arbitrary members.
  initialize.nonexistent;
  // @ts-expect-error Deferred initialization returns an object, not a primitive.
  const primitive: number = initialize();
  void primitive;

  const immediate = service(Controller);
  // @ts-expect-error Immediate dynamic controller results require narrowing.
  immediate();
  const maybeDeferred = service(Controller, undefined, Math.random() > 0.5);
  // @ts-expect-error A boolean flag does not guarantee deferred initialization.
  maybeDeferred();
}

void checkControllerTypes;
