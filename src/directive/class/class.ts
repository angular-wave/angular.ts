import { getCacheData, setCacheData } from "../../shared/dom.ts";
import {
  hasAnimate,
  isArray,
  isObject,
  isString,
  keys,
  nullObject,
} from "../../shared/utils.js";

/** Creates the family of `ngClass*` directives. */
function classDirective(
  name: string,
  selector: boolean | number,
): ng.DirectiveFactory {
  name = `ngClass${name}`;

  /** Creates the concrete directive instance for the requested class mode. */
  return function (): ng.Directive {
    return {
      link(
        scope: ng.Scope,
        element: HTMLElement,
        attr: import("../../core/compile/attributes.ts").Attributes &
          Record<string, string>,
      ): void {
        let classCounts = getCacheData(element, "$classCounts") as
          | Record<string, number>
          | undefined;

        // `ngClassOdd/ngClassEven` use `$index & 1` values (0/1). Plain `ngClass` uses `true`.
        let oldModulo: number | boolean = true;

        let oldClassString = "";

        if (!classCounts) {
          // Use Object.create(null) to prevent assumptions involving Object.prototype keys.
          classCounts = nullObject() as Record<string, number>;
          setCacheData(element, "$classCounts", classCounts);
        }

        const counts = classCounts;

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

        /** Increments class reference counts and applies newly active classes. */
        function addClasses(classString: string): void {
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

        /** Decrements class reference counts and removes classes that reach zero. */
        function removeClasses(classString: string): void {
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

        /** Applies the net class change between two class strings. */
        function updateClasses(
          oldClassStringParam: string,
          newClassStringParam: string,
        ): void {
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

        /** Reacts to `$index` changes for `ngClassOdd` and `ngClassEven`. */
        function ngClassIndexWatchAction(newModulo: number | boolean): void {
          // Runs before `ngClassWatchAction()`: it adds/removes `oldClassString`.
          if (newModulo === selector) {
            addClasses(oldClassString);
          } else {
            removeClasses(oldClassString);
          }

          oldModulo = newModulo;
        }

        /** Reacts to the watched class expression changing. */
        function ngClassWatchAction(newClassString: string): void {
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
 */
export function arrayDifference(
  tokens1: string[],
  tokens2: string[],
): string[] {
  if (!tokens1 || !tokens1.length) return [];

  if (!tokens2 || !tokens2.length) return tokens1;

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
    // Recursively stringify and omit empty results.
    return classValue.map(toClassString).filter(Boolean).join(" ");
  }

  if (isObject(classValue)) {
    const valueMap = classValue as Record<string, any>;

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
