import type { ResolveInvocationLocals } from "../resolve/resolve-context.ts";

/** @internal */
export type RouterViewControllerInvocationLocals = ResolveInvocationLocals & {
  $scope: ng.Scope;
  $element: HTMLElement;
};

/** @internal */
export function createRouterViewControllerInvocationLocals(
  resolves: ResolveInvocationLocals | undefined,
  scope: ng.Scope,
  element: HTMLElement,
): RouterViewControllerInvocationLocals {
  return { ...resolves, $scope: scope, $element: element };
}
