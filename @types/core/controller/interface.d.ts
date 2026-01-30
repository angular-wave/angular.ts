import { ControllerConstructor, Injectable } from "../../interface.ts";
/**
 * The minimal local definitions required by $controller(ctrl, locals) calls.
 */
export interface ControllerLocals {
  $scope: ng.Scope;
  $element: Element;
}
export type ControllerService = (
  expression: ControllerExpression,
  locals?: ControllerLocals,
  later?: boolean,
  ident?: string,
) => any | (() => any);
export type ControllerExpression = string | Injectable<ControllerConstructor>;
