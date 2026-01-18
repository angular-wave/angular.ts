import { ControllerConstructor, Injectable } from "../../interface.ts";
export type ControllerService = (
  expression: ControllerExpression,
  locals?: ControllerLocals,
  later?: boolean,
  ident?: string,
) => object | (() => object);
export type ControllerExpression = string | Injectable<ControllerConstructor>;
export type ControllerLocals = Record<string, any> & {
  $scope?: ng.Scope;
};
