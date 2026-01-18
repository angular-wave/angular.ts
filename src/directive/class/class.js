import { getCacheData, setCacheData } from "../../shared/dom.js";
import {
  hasAnimate,
  isArray,
  isObject,
  isString,
  keys,
  nullObject,
} from "../../shared/utils.js";

/**
 * @param {string} name
 * @param {boolean|number} selector
 * @returns {ng.DirectiveFactory}
 */
function classDirective(name, selector) {
  name = `ngClass${name}`;

  /**
   * @returns {ng.Directive}
   */
  return function () {
    return {
      /**
       * @param {ng.Scope} scope
       * @param {HTMLElement} element
       * @param {ng.Attributes} attr
       */
      link(scope, element, attr) {
        /** @type {Record<string, number>} */
        let classCounts = getCacheData(element, "$classCounts");

        // `ngClassOdd/ngClassEven` use `$index & 1` values (0/1). Plain `ngClass` uses `true`.
        /** @type {number | boolean} */
        let oldModulo = true;

        /** @type {string} */
        let oldClassString = "";

        if (!classCounts) {
          // Use Object.create(null) to prevent assumptions involving Object.prototype keys.
          classCounts = /** @type {Record<string, number>} */ (nullObject());
          setCacheData(element, "$classCounts", classCounts);
        }

        // Cache once; `hasAnimate(element)` should be stable for this directive instance.
        const animate = hasAnimate(element);

        if (name !== "ngClass") {
          scope.$watch("$index", () => {
            ngClassIndexWatchAction(scope.$index & 1);
          });
        }

        scope.$watch(attr[name], (val) => {
          ngClassWatchAction(toClassString(val));
        });

        /**
         * @param {string} classString
         */
        function addClasses(classString) {
          const toAdd = digestClassCounts(split(classString), 1);

          if (!toAdd.length) return;

          if (animate) {
            attr.$addClass(toAdd.join(" "));
          } else {
            scope.$postUpdate(() => {
              element.classList.add(...toAdd);
            });
          }
        }

        /**
         * @param {string} classString
         */
        function removeClasses(classString) {
          const toRemove = digestClassCounts(split(classString), -1);

          if (!toRemove.length) return;

          if (animate) {
            attr.$removeClass(toRemove.join(" "));
          } else {
            scope.$postUpdate(() => {
              element.classList.remove(...toRemove);
            });
          }
        }

        /**
         * @param {string} oldClassStringParam
         * @param {string} newClassStringParam
         */
        function updateClasses(oldClassStringParam, newClassStringParam) {
          const oldClassArray = split(oldClassStringParam);

          const newClassArray = split(newClassStringParam);

          const toRemoveArray = arrayDifference(oldClassArray, newClassArray);

          const toAddArray = arrayDifference(newClassArray, oldClassArray);

          const toRemove = digestClassCounts(toRemoveArray, -1);

          const toAdd = digestClassCounts(toAddArray, 1);

          if (animate) {
            if (toAdd.length) attr.$addClass(toAdd.join(" "));

            if (toRemove.length) attr.$removeClass(toRemove.join(" "));
          } else {
            if (toAdd.length) element.classList.add(...toAdd);

            if (toRemove.length) element.classList.remove(...toRemove);
          }
        }

        /**
         * Updates reference-counts for classes and returns the classes that should be
         * applied/removed for this operation.
         *
         * @param {string[]} classArray
         * @param {number} count
         * @returns {string[]}
         */
        function digestClassCounts(classArray, count) {
          /** @type {string[]} */
          const classesToUpdate = [];

          for (let i = 0; i < classArray.length; i++) {
            const className = classArray[i];

            if (!className) continue;

            // Only decrement if we have a count, otherwise we can go negative and
            // remove classes that were never added.
            if (count > 0 || classCounts[className]) {
              const next = (classCounts[className] || 0) + count;

              classCounts[className] = next;

              // When adding: push when transitioning 0 -> 1.
              // When removing: push when transitioning 1 -> 0.
              if (next === (count > 0 ? 1 : 0)) {
                classesToUpdate.push(className);
              }
            }
          }

          return classesToUpdate;
        }

        /**
         * @param {number | boolean} newModulo
         */
        function ngClassIndexWatchAction(newModulo) {
          // Runs before `ngClassWatchAction()`: it adds/removes `oldClassString`.
          if (newModulo === selector) {
            addClasses(oldClassString);
          } else {
            removeClasses(oldClassString);
          }

          oldModulo = newModulo;
        }

        /**
         * @param {string} newClassString
         */
        function ngClassWatchAction(newClassString) {
          if (oldModulo === selector) {
            updateClasses(oldClassString, newClassString);
          }

          oldClassString = newClassString;
        }
      },
    };
  };
}

// Helpers

/**
 * Returns all items from `tokens1` that are not present in `tokens2`.
 *
 * @param {string[]} tokens1
 * @param {string[]} tokens2
 * @returns {string[]}
 */
export function arrayDifference(tokens1, tokens2) {
  if (!tokens1 || !tokens1.length) return [];

  if (!tokens2 || !tokens2.length) return tokens1;

  const set2 = new Set(tokens2);

  /** @type {string[]} */
  const out = [];

  for (let i = 0; i < tokens1.length; i++) {
    const t = tokens1[i];

    if (!set2.has(t)) out.push(t);
  }

  return out;
}

/**
 * Split a class string into tokens.
 *
 * - Trims leading/trailing whitespace
 * - Collapses any whitespace runs (space/tab/newline) into token boundaries
 *
 * @param {string} classString
 * @return {string[]}
 */
export function split(classString) {
  if (!classString) return [];
  const trimmed = classString.trim();

  return trimmed ? trimmed.split(/\s+/) : [];
}

/**
 * Convert an `ngClass` expression value into a space-delimited class string.
 *
 * Supports:
 * - string: returned as-is
 * - array: flattened and joined with spaces (falsy items are ignored)
 * - object: keys with truthy values are included
 * - other primitives: stringified
 *
 * @param {unknown} classValue
 * @returns {string}
 */
export function toClassString(classValue) {
  if (!classValue) return "";

  if (isArray(classValue)) {
    // Recursively stringify and omit empty results.
    return classValue.map(toClassString).filter(Boolean).join(" ");
  }

  if (isObject(classValue)) {
    const valueMap = /** @type {Record<string, any>} */ (classValue);

    const ks = keys(valueMap);

    let out = "";

    for (let i = 0; i < ks.length; i++) {
      const k = ks[i];

      if (valueMap[k]) out += (out ? " " : "") + k;
    }

    return out;
  }

  if (isString(classValue)) {
    return classValue;
  }

  return String(classValue);
}

export const ngClassDirective = classDirective("", true);
export const ngClassOddDirective = classDirective("Odd", 0);
export const ngClassEvenDirective = classDirective("Even", 1);
