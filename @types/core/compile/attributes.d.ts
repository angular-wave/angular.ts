/**
 * @extends {Record<string, any>}
 */
export class Attributes {
  static $nonscope: boolean;
  /**
   * Creates an Attributes instance.
   *
   * There are two construction modes:
   *
   * 1. **Fresh instance** (no `attributesToCopy`):
   *    - Used when compiling a DOM element for the first time.
   *    - Initializes a new `$attr` map to track normalized → DOM attribute names.
   *
   * 2. **Clone instance** (`attributesToCopy` provided):
   *    - Used when cloning attributes for directive linking / child scopes.
   *    - Performs a shallow copy of all properties from the source Attributes object,
   *      including `$attr`, normalized attribute values, and internal fields
   *      (e.g. `$$observers`).
   *    - `$attr` is intentionally **not reinitialized** in this case, because the
   *      source object already contains the correct normalized → DOM attribute mapping.
   *
   * @param {ng.AnimateService} $animate
   * @param {ng.ExceptionHandlerService} $exceptionHandler
   * @param {*} $sce
   * @param {import("../../shared/noderef.js").NodeRef} [nodeRef]
   * @param {Object} [attributesToCopy]
   */
  constructor(
    $animate: ng.AnimateService,
    $exceptionHandler: ng.ExceptionHandlerService,
    $sce: any,
    nodeRef?: import("../../shared/noderef.js").NodeRef,
    attributesToCopy?: any,
  );
  _$animate: import("../../animations/interface.ts").AnimateService;
  _$exceptionHandler: import("../../services/exception/interface.ts").ExceptionHandler;
  _$sce: any;
  /**
   * A map of DOM element attribute names to the normalized name. This is needed
   * to do reverse lookup from normalized name back to actual name.
   */
  $attr: {};
  /** @type {import("../../shared/noderef.js").NodeRef} */
  _nodeRef: import("../../shared/noderef.js").NodeRef;
  /** @type {Node|Element} */
  get $$element(): Node | Element;
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
  /**
   * Adds the CSS class value specified by the classVal parameter to the element. If animations
   * are enabled then an animation will be triggered for the class addition.
   *
   * @param {string} classVal The className value that will be added to the element
   */
  $addClass(classVal: string): void;
  /**
   * Removes the CSS class value specified by the classVal parameter from the element. If
   * animations are enabled then an animation will be triggered for the class removal.
   *
   * @param {string} classVal The className value that will be removed from the element
   */
  $removeClass(classVal: string): void;
  /**
   * Adds and removes the appropriate CSS class values to the element based on the difference
   * between the new and old CSS class values (specified as newClasses and oldClasses).
   *
   * @param {string} newClasses The current CSS className value
   * @param {string} oldClasses The former CSS className value
   */
  $updateClass(newClasses: string, oldClasses: string): void;
  /**
   * Set a normalized attribute on the element in a way such that all directives
   * can share the attribute. This function properly handles boolean attributes.
   * @param {string} key Normalized key. (ie ngAttribute)
   * @param {string|boolean|null} value The value to set. If `null` attribute will be deleted.
   * @param {boolean=} writeAttr If false, does not write the value to DOM element attribute.
   *     Defaults to true.
   * @param {string=} attrName Optional none normalized name. Defaults to key.
   */
  $set(
    key: string,
    value: string | boolean | null,
    writeAttr?: boolean | undefined,
    attrName?: string | undefined,
  ): void;
  /**
     * @template T
     * Observes an interpolated attribute.
     *
     * The observer function will be invoked once during the next `$digest` following
     * compilation. The observer is then invoked whenever the interpolated value
     * changes.
     *
     * @param {string} key Normalized key. (ie ngAttribute) .
     * @param {(value?: T) => any} fn Function that will be called whenever
              the interpolated value of the attribute changes.
    *        See the {@link guide/interpolation#how-text-and-attribute-bindings-work Interpolation
    *        guide} for more info.
    * @returns {Function} Returns a deregistration function for this observer.
    */
  $observe<T>(key: string, fn: (value?: T) => any): Function;
  $$observers: any;
  setSpecialAttr(element: any, attrName: any, value: any): void;
  /**
   *
   * @param {unknown} value
   * @param {string} invokeType
   * @returns {unknown}
   */
  sanitizeSrcset(value: unknown, invokeType: string): unknown;
  srcset: unknown;
}
import { directiveNormalize } from "../../shared/utils.js";
