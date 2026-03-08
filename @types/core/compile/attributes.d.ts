import { directiveNormalize } from "../../shared/utils.js";
import type { NodeRef } from "../../shared/noderef.ts";
type ObserverList = Array<(value?: unknown) => void> & {
  _inter?: boolean;
  _scope?: ng.Scope;
};
type ObserverMap = Record<string, ObserverList>;
export declare class Attributes {
  static $nonscope: boolean;
  /**
   * Creates an Attributes instance.
   *
   * There are two construction modes:
   *
   * 1. **Fresh instance** (no `attributesToCopy`):
   *    - Used when compiling a DOM element for the first time.
   *    - Initializes a new `$attr` map to track normalized -> DOM attribute names.
   *
   * 2. **Clone instance** (`attributesToCopy` provided):
   *    - Used when cloning attributes for directive linking / child scopes.
   *    - Performs a shallow copy of all properties from the source Attributes object,
   *      including `$attr`, normalized attribute values, and internal fields
   *      (e.g. `_observers`).
   *    - `$attr` is intentionally **not reinitialized** in this case, because the
   *      source object already contains the correct normalized -> DOM attribute mapping.
   *
   * @param {ng.AnimateService} $animate
   * @param {ng.ExceptionHandlerService} $exceptionHandler
   * @param {ng.SceService} $sce
   * @param {import("../../shared/noderef.ts").NodeRef} [nodeRef]
   * @param {Object & Record<string, any>} [attributesToCopy]
   */
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
  /** @ignore @returns {Node|Element} */
  _element(): Node | Element;
  /**
   * Converts an attribute name (e.g. dash/colon/underscore-delimited string, optionally prefixed with `x-` or
   * `data-`) to its normalized, camelCase form.
   *
   * Also there is special case for Moz prefix starting with upper case letter.
   *
   * For further information check out the guide on {@link guide/directive#matching-directives Matching Directives}
   *
   * @param {string} name Name to normalize
   */
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
