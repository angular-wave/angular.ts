import { getCacheData, setCacheData } from "../../shared/dom.ts";
import {
  hasOwn,
  hasAnimate,
  isArray,
  isObject,
  nullObject,
  isString,
} from "../../shared/utils.ts";
import type { Attributes } from "../../core/compile/attributes.ts";

/** Creates the `ngClass` directive. */
export function classDirective(): ng.Directive {
  return {
    link(
      scope: ng.Scope,
      element: HTMLElement,
      attr: Attributes & Record<string, string>,
    ): void {
      let classCounts = getCacheData(element, "$classCounts") as
        | Record<string, number>
        | undefined;

      let oldClassString = "";

      if (!classCounts) {
        // Use a null-prototype map to avoid Object.prototype key assumptions.
        classCounts = nullObject() as Record<string, number>;
        setCacheData(element, "$classCounts", classCounts);
      }

      const counts = classCounts;

      // Cache once; `hasAnimate(element)` should be stable for this directive instance.
      const animate = hasAnimate(element);

      scope.$watch(attr.ngClass, (val) => {
        ngClassWatchAction(toClassString(val));
      });

      /** Applies the net class change between two class strings. */
      function updateClasses(
        oldClassStringParam: string,
        newClassStringParam: string,
      ): void {
        if (oldClassStringParam === newClassStringParam) {
          return;
        }

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
       */
      function digestClassCounts(
        classArray: string[],
        count: number,
      ): string[] {
        const classesToUpdate = [];

        for (let i = 0; i < classArray.length; i++) {
          const className = classArray[i];

          if (!className) continue;

          // Only decrement if we have a count, otherwise we can go negative and
          // remove classes that were never added.
          if (count > 0 || counts[className]) {
            const next = (counts[className] || 0) + count;

            counts[className] = next;

            // When adding: push when transitioning 0 -> 1.
            // When removing: push when transitioning 1 -> 0.
            if (next === (count > 0 ? 1 : 0)) {
              classesToUpdate.push(className);
            }
          }
        }

        return classesToUpdate;
      }

      /** Reacts to the watched class expression changing. */
      function ngClassWatchAction(newClassString: string): void {
        updateClasses(oldClassString, newClassString);

        oldClassString = newClassString;
      }
    },
  };
}

// Helpers

/**
 * Returns all items from `tokens1` that are not present in `tokens2`.
 */
export function arrayDifference(
  tokens1: string[],
  tokens2: string[],
): string[] {
  if (!tokens1 || !tokens1.length) return [];

  if (!tokens2 || !tokens2.length) return tokens1;

  if (tokens2.length === 1) {
    const token = tokens2[0];

    const out = [];

    for (let i = 0; i < tokens1.length; i++) {
      const x = tokens1[i];

      if (x !== token) out.push(x);
    }

    return out;
  }

  if (tokens1.length === 1) {
    const token = tokens1[0];

    for (let i = 0; i < tokens2.length; i++) {
      if (tokens2[i] === token) return [];
    }

    return tokens1;
  }

  const set2 = new Set(tokens2);

  const out = [];

  for (let i = 0; i < tokens1.length; i++) {
    const x = tokens1[i];

    if (!set2.has(x)) out.push(x);
  }

  return out;
}

/**
 * Split a class string into tokens.
 *
 * - Trims leading/trailing whitespace
 * - Collapses any whitespace runs (space/tab/newline) into token boundaries
 */
export function split(classString: string): string[] {
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
 */
export function toClassString(classValue: unknown): string {
  if (!classValue) return "";

  if (isArray(classValue)) {
    let out = "";

    for (let i = 0; i < classValue.length; i++) {
      const classString = toClassString(classValue[i]);

      if (classString) out += (out ? " " : "") + classString;
    }

    return out;
  }

  if (isObject(classValue)) {
    const valueMap = classValue as Record<string, any>;

    let out = "";

    for (const k in valueMap) {
      if (!hasOwn(valueMap, k)) continue;

      if (valueMap[k]) out += (out ? " " : "") + k;
    }

    return out;
  }

  if (isString(classValue)) {
    return classValue;
  }

  return String(classValue);
}
