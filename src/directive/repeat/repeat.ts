import {
  callBackOnce,
  hasOwn,
  hashKey,
  isArrayLike,
  isDefined,
  minErr,
  nullObject,
  values,
} from "../../shared/utils.ts";
import { getBlockNodes, removeElement } from "../../shared/dom.ts";
import { $injectTokens } from "../../injection-tokens.ts";
import type { RepeatScope } from "./interface.ts";

const NG_REMOVED = "$$NG_REMOVED";

const ngRepeatMinErr = minErr("ngRepeat");

type RepeatValue = any;
type RepeatKey = string | number;
type RepeatClone = Array<Node> & {
  remove: () => void;
  parentNode?: Node | null;
  [index: number]: Node & Record<string, any>;
};
type RepeatBlock = {
  id: string;
  scope?: RepeatScope;
  clone?: RepeatClone;
};

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

ngRepeatDirective.$inject = [$injectTokens._animate];

/**
 * @param {ng.AnimateService}  $animate
 * @returns {ng.Directive}
 */
export function ngRepeatDirective(
  $animate: ng.AnimateService,
): ng.Directive<any> {
  function updateScope(
    scope: RepeatScope & Record<string, any>,
    index: number,
    valueIdentifier: string,
    value: RepeatValue,
    keyIdentifier: string | undefined,
    key: RepeatKey,
    arrayLength: number,
  ): void {
    if (scope[valueIdentifier] !== value) {
      scope[valueIdentifier] = value;
    }

    if (keyIdentifier) scope[keyIdentifier] = key;

    if (value) {
      scope.$target._hashKey = value._hashKey;
    }
    scope.$index = index;
    scope.$first = index === 0;
    scope.$last = index === arrayLength - 1;
    scope.$middle = !(scope.$first || scope.$last);
    scope.$odd = !(scope.$even = (index & 1) === 0);
  }

  function getBlockStart(block: RepeatBlock): Node | undefined {
    return block.clone?.[0];
  }

  function getBlockEnd(block: RepeatBlock): Node | undefined {
    return block.clone?.[block.clone.length - 1];
  }

  function trackByIdArrayFn(
    _$scope: ng.Scope,
    _key: RepeatKey,
    value: RepeatValue,
  ): string {
    return hashKey(value);
  }

  function trackByIdObjFn(_$scope: ng.Scope, key: RepeatKey): string {
    return String(key);
  }

  return {
    restrict: "A",
    transclude: "element",
    priority: 1000,
    terminal: true,
    compile(_$element: Element, $attr: ng.Attributes) {
      const expression = $attr.ngRepeat;

      const hasAnimate = !!$attr.animate;

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

      let trackByIdExpFn:
        | ((scope: ng.Scope, key: RepeatKey, value: RepeatValue) => string)
        | undefined;

      const swap = callBackOnce(() => {
        if (isDefined($attr.lazy) && isDefined($attr.swap)) {
          document
            .querySelectorAll($attr.swap)
            .forEach((x) => removeElement(x));
        }
      });

      function ngRepeatLink(
        $scope: RepeatScope & Record<string, any>,
        $element: Element,
        attr: ng.Attributes,
        _ctrl: unknown,
        $transclude: ng.TranscludeFn,
      ): void {
        let lastBlockMap: Record<string, RepeatBlock> = nullObject();

        $scope.$watch(
          rhs,
          (collection: any) => {
            swap();
            let index: number;
            let previousNode: Node | Element = $element;
            let nextNode: Node | Element | null | undefined;
            const nextBlockMap: Record<string, RepeatBlock | true> =
              nullObject();
            let key: RepeatKey;
            let value: RepeatValue;
            let trackById: string;
            let trackByIdFn: (
              scope: ng.Scope,
              key: RepeatKey,
              value: RepeatValue,
            ) => string;
            let collectionKeys: any[] | RepeatKey[];
            let block: RepeatBlock;
            let elementsToRemove: RepeatClone;

            if (aliasAs) {
              $scope[aliasAs] = collection;
            }

            if (isArrayLike(collection)) {
              collectionKeys = collection;
              trackByIdFn = trackByIdExpFn || trackByIdArrayFn;
            } else {
              trackByIdFn = trackByIdExpFn || trackByIdObjFn;
              collectionKeys = [];

              for (const itemKey in collection) {
                if (hasOwn(collection, itemKey) && itemKey.charAt(0) !== "$") {
                  collectionKeys.push(itemKey);
                }
              }
            }

            const collectionLength = collectionKeys.length;

            const nextBlockOrder = new Array(collectionLength);

            for (index = 0; index < collectionLength; index++) {
              key =
                collection === collectionKeys ? index : collectionKeys[index];
              value = collection[key];
              trackById = trackByIdFn($scope, key, value);

              if (lastBlockMap[trackById]) {
                block = lastBlockMap[trackById];
                delete lastBlockMap[trackById];
                nextBlockMap[trackById] = block;
                nextBlockOrder[index] = block;
              } else if (nextBlockMap[trackById]) {
                values(nextBlockOrder).forEach((x) => {
                  if (x && x.scope) lastBlockMap[x.id] = x as RepeatBlock;
                });
                throw ngRepeatMinErr(
                  "dupes",
                  "Duplicates keys in a repeater are not allowed. Repeater: {0}, Duplicate key: {1} for value: {2}",
                  expression,
                  trackById,
                  value,
                );
              } else {
                nextBlockOrder[index] = {
                  id: trackById,
                  scope: undefined,
                  clone: undefined,
                };
                nextBlockMap[trackById] = true;
              }
            }

            for (const blockKey in lastBlockMap) {
              block = lastBlockMap[blockKey];
              elementsToRemove = block.clone as RepeatClone;

              if (hasAnimate) {
                $animate.leave(elementsToRemove as any);
              } else {
                elementsToRemove.remove();
              }

              if (elementsToRemove.parentNode) {
                for (let i = 0, j = elementsToRemove.length; i < j; i++) {
                  elementsToRemove[i][NG_REMOVED] = true;
                }
              }
              block.scope?.$destroy();
            }

            for (index = 0; index < collectionLength; index++) {
              key =
                collection === collectionKeys ? index : collectionKeys[index];
              value = collection[key];
              block = nextBlockOrder[index];

              if (block.scope) {
                nextNode = previousNode;

                do {
                  nextNode = nextNode.nextSibling;
                } while (
                  nextNode &&
                  (nextNode as Record<string, any>)[NG_REMOVED]
                );

                if (getBlockStart(block) !== nextNode) {
                  $animate.move(
                    getBlockNodes(block.clone as unknown as Node[]) as any,
                    null,
                    previousNode as any,
                  );
                }
                previousNode = getBlockEnd(block) as Node;
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
                $transclude((clone, scope) => {
                  block.scope = scope as RepeatScope;
                  const repeatClone = clone as unknown as RepeatClone;
                  const endNode = repeatClone[repeatClone.length - 1] as Node;

                  if (hasAnimate) {
                    $animate.enter(
                      repeatClone as any,
                      null,
                      previousNode as any,
                    );
                  } else {
                    (previousNode as any).after(repeatClone);
                  }

                  previousNode = endNode;
                  block.clone = repeatClone;
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
                });
              }
            }
            lastBlockMap = nextBlockMap as Record<string, RepeatBlock>;
          },
          isDefined(attr.lazy),
        );
      }

      return ngRepeatLink as unknown as import("../../interface.ts").DirectiveLinkFn<any>;
    },
  };
}
