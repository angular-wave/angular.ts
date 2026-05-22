import { getBooleanAttrName, hasNormalizedAttr } from "../../shared/dom.ts";
import {
  createLazyAnimate,
  type LazyAnimate,
} from "../../animations/lazy-animate.ts";
import { updateClass as updateAnimatedClass } from "../../animations/class-mutation.ts";
import { setInternalAttribute } from "../../services/attributes/attributes.ts";
import {
  directiveNormalize,
  hasOwn,
  keys,
  nullObject,
  snakeCase,
} from "../../shared/utils.ts";
import { ALIASED_ATTR } from "../../shared/constants.ts";

const lazyAnimateByInjector = new WeakMap<ng.InjectorService, LazyAnimate>();

function getLazyAnimate($injector: ng.InjectorService): LazyAnimate {
  let getAnimate = lazyAnimateByInjector.get($injector);

  if (!getAnimate) {
    getAnimate = createLazyAnimate($injector);
    lazyAnimateByInjector.set($injector, getAnimate);
  }

  return getAnimate;
}

/** @internal */
export type CompileAttributeValue = string | boolean | null | undefined;

/** @internal */
export class CompileAttributeState {
  static $nonscope = true;

  /**
   * Creates compiler-owned attribute metadata.
   *
   * There are two construction modes:
   *
   * 1. **Fresh instance** (no `stateToCopy`):
   *    - Used when compiling a DOM element for the first time.
   *    - Initializes a map from normalized names to DOM attribute names.
   *
   * 2. **Clone instance** (`stateToCopy` provided):
   *    - Used when cloning compile metadata for directive linking / child scopes.
   *    - Performs a shallow copy of normalized -> DOM name metadata.
   */

  /** @internal */
  _getAnimate: LazyAnimate;
  /** @internal */
  _exceptionHandler: ng.ExceptionHandlerService;
  _attributeNames: Record<string, string>;
  /** @internal */
  _originalAttributeNames: Record<string, string>;

  constructor(
    $injector: ng.InjectorService,
    $exceptionHandler: ng.ExceptionHandlerService,
    stateToCopy?: CompileAttributeState,
  ) {
    this._getAnimate = getLazyAnimate($injector);
    this._exceptionHandler = $exceptionHandler;
    this._attributeNames = {};
    this._originalAttributeNames = nullObject();

    if (stateToCopy) {
      const attrKeys = keys(stateToCopy._attributeNames);

      for (let i = 0, l = attrKeys.length; i < l; i++) {
        const key = attrKeys[i];

        this._attributeNames[key] = stateToCopy._attributeNames[key];
      }

      const sourceKeys = keys(stateToCopy._originalAttributeNames);

      for (let i = 0, l = sourceKeys.length; i < l; i++) {
        const key = sourceKeys[i];

        this._originalAttributeNames[key] =
          stateToCopy._originalAttributeNames[key];
      }
    }
  }

  /**
   * Converts an attribute name (e.g. dash/colon/underscore-delimited string, optionally prefixed with `data-`) to its
   * normalized, camelCase form.
   *
   * Also there is special case for Moz prefix starting with upper case letter.
   *
   * Normalization follows the directive matching rules used by `$compile`.
   *
   * @param name Name to normalize
   */
  $normalize = directiveNormalize;
}

/** @internal */
export function updateCompileAttributeClass(
  attrs: CompileAttributeState,
  node: Node | Element,
  newClasses: string,
  oldClasses: string,
): void {
  if (newClasses === oldClasses) {
    return;
  }

  updateAnimatedClass(node, newClasses, oldClasses, attrs._getAnimate);
}

/** @internal */
export function setCompileAttributeValue(
  attrs: CompileAttributeState,
  node: Node | Element,
  key: string,
  value: CompileAttributeValue,
  writeAttr?: boolean,
  attrName?: string,
): void {
  const booleanKey = getBooleanAttrName(node as Element, key);

  const aliasedKey = hasOwn(ALIASED_ATTR, key) ? ALIASED_ATTR[key] : undefined;

  let observer = key;

  if (booleanKey) {
    (node as unknown as Record<string, unknown>)[key] = value;
    attrName = booleanKey;
  } else if (aliasedKey) {
    recordCompileAttribute(attrs, aliasedKey, aliasedKey);
    observer = aliasedKey;
  }

  if (attrName) {
    attrs._attributeNames[key] = attrName;
  } else {
    attrName = attrs._attributeNames[key];

    if (!attrName) {
      attrs._attributeNames[key] = attrName = snakeCase(key, "-");
    }
  }

  recordCompileAttribute(attrs, key, attrName);

  setInternalAttribute(node, observer, value, {
    writeAttr,
    attrName,
  });
}

/** @internal */
export function recordCompileAttribute(
  attrs: CompileAttributeState,
  key: string,
  attrName: string,
  sourceAttrName = attrName,
  overwrite = true,
): void {
  if (overwrite || !hasOwn(attrs._attributeNames, key)) {
    attrs._attributeNames[key] = attrName;
    attrs._originalAttributeNames[key] = sourceAttrName;
  }
}

/** @internal */
export function hasCompileAttribute(
  attrs: CompileAttributeState,
  node: Node | Element | null | undefined,
  key: string,
): boolean {
  if (
    hasOwn(attrs._attributeNames, key) ||
    hasOwn(attrs._originalAttributeNames, key)
  ) {
    return true;
  }

  return hasNormalizedAttr(node, key);
}

/** @internal */
export function listCompileAttributes(attrs: CompileAttributeState): string[] {
  const names = new Set<string>(keys(attrs._attributeNames));

  keys(attrs._originalAttributeNames).forEach((key) => {
    names.add(key);
  });

  return Array.from(names);
}

/** @internal */
export function getCompileAttributeName(
  attrs: CompileAttributeState,
  key: string,
): string | undefined {
  return attrs._attributeNames[key];
}

/** @internal */
export function getCompileOriginalAttributeName(
  attrs: CompileAttributeState,
  key: string,
): string | undefined {
  return attrs._originalAttributeNames[key];
}
