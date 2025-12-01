import {
  minErr,
  hashKey,
  isArrayLike,
  hasOwn,
  isDefined,
  callBackOnce,
} from "../../shared/utils.js";
import { getBlockNodes, removeElement } from "../../shared/dom.js";
import { $injectTokens } from "../../injection-tokens.js";

const NG_REMOVED = "$$NG_REMOVED";
const ngRepeatMinErr = minErr("ngRepeat");

/**
 * Regular expression to match either:
 * 1. A single variable name (optionally preceded by whitespace), e.g. "foo", "   $bar"
 * 2. A pair of variable names inside parentheses separated by a comma (with optional whitespace), e.g. "(x, y)", "($foo, _bar123)"
 *
 * Capturing groups:
 * - Group 1: The single variable name (if present)
 * - Group 2: The first variable in the tuple (if present)
 * - Group 3: The second variable in the tuple (if present)
 *
 * Examples:
 *  - Matches: "foo", "   $var", "(x, y)", "($a, $b)"
 *  - Does NOT match: "x,y", "(x)", "(x y)", ""
 *
 * @constant {RegExp}
 */
const VAR_OR_TUPLE_REGEX =
  /^(?:(\s*[$\w]+)|\(\s*([$\w]+)\s*,\s*([$\w]+)\s*\))$/;

ngRepeatDirective.$inject = [$injectTokens.$animate];

/**
 * TODO // Add type for animate service
 * @param {*}  $animate
 * @returns {import("../../interface.ts").Directive}
 */
export function ngRepeatDirective($animate) {
  function updateScope(
    scope,
    index,
    valueIdentifier,
    value,
    keyIdentifier,
    key,
    arrayLength,
  ) {
    // TODO(perf): generate setters to shave off ~40ms or 1-1.5%
    if (scope[valueIdentifier] !== value) {
      scope[valueIdentifier] = value;
    }

    if (keyIdentifier) scope[keyIdentifier] = key;
    if (value) {
      scope.$target.$$hashKey = value.$$hashKey;
    }
    scope.$index = index;
    scope.$first = index === 0;
    scope.$last = index === arrayLength - 1;
    scope.$middle = !(scope.$first || scope.$last);
    scope.$odd = !(scope.$even = (index & 1) === 0);
  }

  function getBlockStart(block) {
    return block.clone;
  }

  function getBlockEnd(block) {
    return block.clone;
  }

  function trackByIdArrayFn(_$scope, _key, value) {
    return hashKey(value);
  }

  function trackByIdObjFn(_$scope, key) {
    return key;
  }

  return {
    restrict: "A",
    transclude: "element",
    priority: 1000,
    terminal: true,
    compile: (_$element, $attr) => {
      const expression = $attr["ngRepeat"];
      const hasAnimate = !!$attr["animate"];

      let match = expression.match(
        /^\s*([\s\S]+?)\s+in\s+([\s\S]+?)(?:\s+as\s+([\s\S]+?))?(?:\s+track\s+by\s+([\s\S]+?))?\s*$/,
      );

      if (!match) {
        throw ngRepeatMinErr(
          "iexp",
          "Expected expression in form of '_item_ in _collection_[ track by _id_]' but got '{0}'.",
          expression,
        );
      }

      const lhs = match[1];
      const rhs = match[2];
      const aliasAs = match[3];

      match = lhs.match(VAR_OR_TUPLE_REGEX);

      if (!match) {
        throw ngRepeatMinErr(
          "iidexp",
          "'_item_' in '_item_ in _collection_' should be an identifier or '(_key_, _value_)' expression, but got '{0}'.",
          lhs,
        );
      }
      const valueIdentifier = match[3] || match[1];
      const keyIdentifier = match[2];

      if (
        aliasAs &&
        (!/^[$a-zA-Z_][$a-zA-Z0-9_]*$/.test(aliasAs) ||
          /^(null|undefined|this|\$index|\$first|\$middle|\$last|\$even|\$odd|\$parent|\$root|\$id)$/.test(
            aliasAs,
          ))
      ) {
        throw ngRepeatMinErr(
          "badident",
          "alias '{0}' is invalid --- must be a valid JS identifier which is not a reserved name.",
          aliasAs,
        );
      }

      let trackByIdExpFn;

      const swap = callBackOnce(() => {
        if (isDefined($attr["lazy"]) && isDefined($attr["swap"])) {
          document
            .querySelectorAll($attr["swap"])
            .forEach((x) => removeElement(x));
        }
      });

      return function ngRepeatLink($scope, $element, $attr, ctrl, $transclude) {
        // Store a list of elements from previous run. This is a hash where key is the item from the
        // iterator, and the value is objects with following properties.
        //   - scope: bound scope
        //   - clone: previous element.
        //   - index: position
        //
        // We are using no-proto object so that we don't need to guard against inherited props via
        // hasOwnProperty.
        let lastBlockMap = Object.create(null);
        // watch props
        $scope.$watch(
          rhs,
          (collection) => {
            swap();
            let index,
              length,
              previousNode = $element, // node that cloned nodes should be inserted after
              // initialized to the comment node anchor
              nextNode;
            const // Same as lastBlockMap but it has the current state. It will become the
              // lastBlockMap on the next iteration.
              nextBlockMap = Object.create(null);
            let collectionLength,
              key,
              value, // key/value of iteration
              trackById,
              trackByIdFn,
              collectionKeys,
              block, // last object information {scope, element, id}
              nextBlockOrder,
              elementsToRemove;

            if (aliasAs) {
              $scope[aliasAs] = collection;
            }

            if (isArrayLike(collection)) {
              collectionKeys = collection;
              trackByIdFn = trackByIdExpFn || trackByIdArrayFn;
            } else {
              trackByIdFn = trackByIdExpFn || trackByIdObjFn;
              // if object, extract keys, in enumeration order, unsorted
              collectionKeys = [];
              for (const itemKey in collection) {
                if (hasOwn(collection, itemKey) && itemKey.charAt(0) !== "$") {
                  collectionKeys.push(itemKey);
                }
              }
            }

            collectionLength = collectionKeys.length;
            nextBlockOrder = new Array(collectionLength);

            // locate existing items
            for (index = 0; index < collectionLength; index++) {
              key =
                collection === collectionKeys ? index : collectionKeys[index];
              value = collection[key];
              trackById = trackByIdFn($scope, key, value);
              if (lastBlockMap[trackById]) {
                // found previously seen block
                block = lastBlockMap[trackById];
                delete lastBlockMap[trackById];
                nextBlockMap[trackById] = block;
                nextBlockOrder[index] = block;
              } else if (nextBlockMap[trackById]) {
                // if collision detected. restore lastBlockMap and throw an error
                Object.values(nextBlockOrder).forEach((block) => {
                  if (block && block.scope) lastBlockMap[block.id] = block;
                });
                throw ngRepeatMinErr(
                  "dupes",
                  "Duplicates keys in a repeater are not allowed. Repeater: {0}, Duplicate key: {1} for value: {2}",
                  expression,
                  trackById,
                  value,
                );
              } else {
                // new never before seen block
                nextBlockOrder[index] = {
                  id: trackById,
                  scope: undefined,
                  clone: undefined,
                };
                nextBlockMap[trackById] = true;
              }
            }

            // remove leftover items
            for (let blockKey in lastBlockMap) {
              block = lastBlockMap[blockKey];
              elementsToRemove = block.clone;
              if (hasAnimate) {
                $animate.leave(elementsToRemove);
              } else {
                elementsToRemove.remove();
              }
              if (elementsToRemove.parentNode) {
                // if the element was not removed yet because of pending animation, mark it as deleted
                // so that we can ignore it later
                for (
                  index = 0, length = elementsToRemove.length;
                  index < length;
                  index++
                ) {
                  elementsToRemove[index][NG_REMOVED] = true;
                }
              }
              block.scope.$destroy();
            }

            for (index = 0; index < collectionLength; index++) {
              key =
                collection === collectionKeys ? index : collectionKeys[index];
              value = collection[key];
              block = nextBlockOrder[index];

              if (block.scope) {
                // if we have already seen this object, then we need to reuse the
                // associated scope/element

                nextNode = previousNode;

                // skip nodes that are already pending removal via leave animation
                do {
                  nextNode = nextNode.nextSibling;
                } while (nextNode && nextNode[NG_REMOVED]);

                if (getBlockStart(block) !== nextNode) {
                  // existing item which got moved
                  $animate.move(getBlockNodes(block.clone), null, previousNode);
                }
                previousNode = getBlockEnd(block);
                updateScope(
                  block.scope,
                  index,
                  valueIdentifier,
                  value,
                  keyIdentifier,
                  key,
                  collectionLength,
                );
              } else {
                // new item which we don't know about
                $transclude(
                  /**
                   * Clone attach function
                   * @param {Array<NodeList>} clone
                   * @param {ng.Scope} scope
                   */

                  (clone, scope) => {
                    block.scope = scope;
                    const endNode = clone;
                    if (hasAnimate) {
                      $animate.enter(clone, null, previousNode);
                    } else {
                      // @ts-ignore
                      previousNode.after(clone);
                    }

                    // @ts-ignore
                    previousNode = endNode;
                    // Note: We only need the first/last node of the cloned nodes.
                    // However, we need to keep the reference to the dom wrapper as it might be changed later
                    // by a directive with templateUrl when its template arrives.
                    block.clone = clone;
                    nextBlockMap[block.id] = block;
                    updateScope(
                      block.scope,
                      index,
                      valueIdentifier,
                      value,
                      keyIdentifier,
                      key,
                      collectionLength,
                    );
                  },
                );
              }
            }
            lastBlockMap = nextBlockMap;
          },
          isDefined($attr["lazy"]),
        );
      };
    },
  };
}
