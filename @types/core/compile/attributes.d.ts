import { directiveNormalize } from "../../shared/utils.js";
import type { NodeRef } from "../../shared/noderef.ts";
type ObserverList = Array<(value?: unknown) => void> & {
  _inter?: boolean;
  _scope?: ng.Scope;
};
type ObserverMap = Record<string, ObserverList>;
export declare class Attributes {
  static $nonscope: boolean;
  _animate: ng.AnimateService;
  _exceptionHandler: ng.ExceptionHandlerService;
  _sce: ng.SceService;
  $attr: Record<string, string>;
  _nodeRef: NodeRef | undefined;
  _observers: ObserverMap | undefined;
  [key: string]: any;
  constructor(
    $animate: ng.AnimateService,
    $exceptionHandler: ng.ExceptionHandlerService,
    $sce: ng.SceService,
    nodeRef?: NodeRef,
    attributesToCopy?: Record<string, any>,
  );
  _element(): Node | Element;
  $normalize: typeof directiveNormalize;
  $addClass(classVal: string): void;
  $removeClass(classVal: string): void;
  $updateClass(newClasses: string, oldClasses: string): void;
  $set(
    key: string,
    value: string | boolean | null,
    writeAttr?: boolean,
    attrName?: string,
  ): void;
  $observe<T>(key: string, fn: (value?: T) => any): Function;
  setSpecialAttr(
    element: Element,
    attrName: string,
    value: string | null,
  ): void;
  sanitizeSrcset(value: unknown, invokeType: string): unknown;
}
export {};
