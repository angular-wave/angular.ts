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
import {
  getBlockNodes,
  removeElement,
  removeElementData,
} from "../../shared/dom.ts";
import {
  getArrayMutationMeta,
  type ArrayMutationMeta,
} from "../../core/scope/scope.ts";
import { $injectTokens } from "../../injection-tokens.ts";
import { NodeType } from "../../shared/node.ts";

const NG_REMOVED = "$$NG_REMOVED";

const ngRepeatMinErr = minErr("ngRepeat");

const VAR_OR_TUPLE_REGEX =
  /^(?:(\s*[$\w]+)|\(\s*([$\w]+)\s*,\s*([$\w]+)\s*\))$/;

ngRepeatDirective.$inject = [$injectTokens._animate];

type RepeatScope = ng.Scope &
  Record<string, any> & {
    $target: Record<string, any>;
  };

type RepeatClone = Node | Node[];

type RepeatBlock = {
  _id: any;
  _scope?: RepeatScope;
  _clone?: RepeatClone;
  _usesPositionLocals?: boolean;
};

type RepeatBlockMap = Record<string, RepeatBlock>;

export function ngRepeatDirective($animate: any): ng.Directive {
  const repeatPositionLocalKeys = [
    "$index",
    "$first",
    "$last",
    "$middle",
    "$odd",
    "$even",
  ];

  function scopeUsesRepeatPositionLocals(scope: RepeatScope): boolean {
    const watchers = scope.$handler._watchers;

    for (let i = 0; i < repeatPositionLocalKeys.length; i++) {
      if (watchers.has(repeatPositionLocalKeys[i])) {
        return true;
      }
    }

    return false;
  }

  function updateScope(
    scope: RepeatScope,
    index: number,
    valueIdentifier: string,
    value: any,
    keyIdentifier: string | undefined,
    key: any,
    arrayLength: number,
    updatePositionLocals = true,
  ) {
    if (scope[valueIdentifier] !== value) {
      scope[valueIdentifier] = value;
    }

    if (keyIdentifier) scope[keyIdentifier] = key;

    if (value) {
      scope.$target._hashKey = value._hashKey;
    }

    if (!updatePositionLocals) {
      return;
    }

    scope.$index = index;
    scope.$first = index === 0;
    scope.$last = index === arrayLength - 1;
    scope.$middle = !(scope.$first || scope.$last);
    scope.$odd = !(scope.$even = (index & 1) === 0);
  }

  function getBlockStart(block: RepeatBlock) {
    return Array.isArray(block._clone) ? block._clone[0] : block._clone;
  }

  function getBlockEnd(block: RepeatBlock) {
    return Array.isArray(block._clone)
      ? block._clone[block._clone.length - 1]
      : block._clone;
  }

  function normalizeCloneNodes(clone: unknown): RepeatClone {
    if (clone instanceof DocumentFragment) {
      return Array.from(clone.childNodes);
    }

    if (clone instanceof NodeList || Array.isArray(clone)) {
      return Array.from(clone);
    }

    return clone as Node;
  }

  function removeBlockNodes(nodes: Node[]): void {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      if (node.nodeType === Node.ELEMENT_NODE) {
        removeElement(node as Element);
      } else {
        removeElementData(node as Element & Record<string, any>);
        node.parentNode?.removeChild(node);
      }
    }
  }

  function trackByIdArrayFn(_$scope: RepeatScope, _key: any, value: any) {
    return hashKey(value);
  }

  function trackByIdObjFn(_$scope: RepeatScope, key: any) {
    return key;
  }

  function canSkipDomMoveChecks(
    mutationMeta: ArrayMutationMeta | undefined,
    blockOrder: RepeatBlock[],
  ): boolean {
    if (
      !mutationMeta ||
      mutationMeta._kind !== "splice" ||
      mutationMeta._insertCount !== 0 ||
      mutationMeta._deleteCount === 0
    ) {
      return false;
    }

    for (let index = 0; index < blockOrder.length; index++) {
      if (!blockOrder[index]._scope || !blockOrder[index]._clone) {
        return false;
      }
    }

    return true;
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
        /^\s*([\s\S]+?)\s+in\s+([\s\S]+?)(?:\s+as\s+([\s\S]+?))?\s*$/,
      );

      if (!match) {
        throw ngRepeatMinErr(
          "iexp",
          "Expected expression in form of '_item_ in _collection_' but got '{0}'.",
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

      const swap = callBackOnce(() => {
        if (isDefined($attr.lazy) && isDefined($attr.swap)) {
          document
            .querySelectorAll($attr.swap)
            .forEach((x) => removeElement(x));
        }
      });

      function ngRepeatLink(
        $scope: RepeatScope,
        $element: any,
        attr: ng.Attributes,
        _ctrl: unknown,
        $transclude?: any,
      ) {
        function insertNodesAfter(nodes: Node[], afterNode: Node): void {
          const { parentNode } = afterNode;

          if (!parentNode) return;

          const fragment = document.createDocumentFragment();

          for (let i = 0; i < nodes.length; i++) {
            fragment.appendChild(nodes[i]);
          }

          parentNode.insertBefore(fragment, afterNode.nextSibling);
        }

        let lastBlockMap: RepeatBlockMap = nullObject();

        let lastSeenArrayMutationVersion = 0;

        $scope.$watch(
          rhs,
          (collection: any) => {
            swap();
            let index = 0;

            let previousNode = $element;

            let nextNode: any;

            const nextBlockMap: Record<string, RepeatBlock | true> =
              nullObject();

            let key: any;

            let value: any;

            let trackById: any;

            let trackByIdFn:
              | ((scope: RepeatScope, key: any, value: any) => any)
              | undefined;

            let collectionKeys: any[] = [];

            let block: RepeatBlock;

            let elementsToRemove: any;

            if (aliasAs) {
              $scope[aliasAs] = collection;
            }

            if (isArrayLike(collection)) {
              collectionKeys = collection;
              trackByIdFn = trackByIdArrayFn;
            } else {
              trackByIdFn = trackByIdObjFn;
              collectionKeys = [];

              for (const itemKey in collection) {
                if (hasOwn(collection, itemKey) && itemKey.charAt(0) !== "$") {
                  collectionKeys.push(itemKey);
                }
              }
            }

            const collectionLength = collectionKeys.length;

            const nextBlockOrder: RepeatBlock[] = new Array(collectionLength);

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
                values(nextBlockOrder).forEach((x: RepeatBlock | undefined) => {
                  if (x && x._scope) lastBlockMap[x._id] = block;
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
                  _id: trackById,
                  _scope: undefined,
                  _clone: undefined,
                };
                nextBlockMap[trackById] = true;
              }
            }

            const mutationMeta = (() => {
              const nextMutationMeta = getArrayMutationMeta(collection);

              if (
                !nextMutationMeta ||
                nextMutationMeta._version <= lastSeenArrayMutationVersion ||
                nextMutationMeta._currentLength !== collectionLength
              ) {
                return undefined;
              }

              lastSeenArrayMutationVersion = nextMutationMeta._version;

              return nextMutationMeta;
            })();

            const canSkipDomMoveChecksForMutation = canSkipDomMoveChecks(
              mutationMeta,
              nextBlockOrder,
            );

            for (const blockKey in lastBlockMap) {
              block = lastBlockMap[blockKey];
              const blockNodes = getBlockNodes(
                Array.isArray(block._clone)
                  ? block._clone
                  : [block._clone as Node],
              );

              elementsToRemove = getBlockStart(block) as Element;

              if (hasAnimate && elementsToRemove) {
                $animate.leave(elementsToRemove);
              } else {
                block._scope?.$destroy();
                removeBlockNodes(blockNodes);
              }

              if (blockNodes.length && blockNodes[0].parentNode) {
                for (let i = 0, j = blockNodes.length; i < j; i++) {
                  (blockNodes[i] as Node & Record<string, any>)[NG_REMOVED] =
                    true;
                }
              }

              if (hasAnimate && elementsToRemove) {
                block._scope?.$destroy();
              }
            }

            for (index = 0; index < collectionLength; index++) {
              key =
                collection === collectionKeys ? index : collectionKeys[index];
              value = collection[key];
              block = nextBlockOrder[index];

              if (block._scope) {
                const shouldUpdatePositionLocals = !!block._usesPositionLocals;

                const existingClone = block._clone;

                if (!existingClone) {
                  continue;
                }

                if (!canSkipDomMoveChecksForMutation) {
                  const existingCloneNodes = Array.isArray(existingClone)
                    ? existingClone
                    : [existingClone];

                  nextNode = previousNode;

                  do {
                    nextNode = nextNode.nextSibling;
                  } while (nextNode && nextNode[NG_REMOVED]);

                  if (getBlockStart(block) !== nextNode) {
                    insertNodesAfter(
                      getBlockNodes(existingCloneNodes),
                      previousNode,
                    );
                  }
                }

                previousNode = getBlockEnd(block);

                if (
                  shouldUpdatePositionLocals ||
                  keyIdentifier ||
                  block._scope[valueIdentifier] !== value
                ) {
                  updateScope(
                    block._scope,
                    index,
                    valueIdentifier,
                    value,
                    keyIdentifier,
                    key,
                    collectionLength,
                    shouldUpdatePositionLocals,
                  );
                }
              } else {
                $transclude?.((clone: RepeatClone, scope: RepeatScope) => {
                  const normalizedClone = normalizeCloneNodes(clone);

                  const cloneNodes = Array.isArray(normalizedClone)
                    ? normalizedClone
                    : [normalizedClone];

                  block._scope = scope;
                  const endNode = cloneNodes[cloneNodes.length - 1];

                  if (
                    hasAnimate &&
                    cloneNodes[0].nodeType === NodeType._ELEMENT_NODE
                  ) {
                    $animate.enter(
                      cloneNodes[0] as Element,
                      null,
                      previousNode,
                    );
                  } else {
                    insertNodesAfter(cloneNodes, previousNode);
                  }

                  previousNode = endNode;
                  block._clone = normalizedClone;
                  nextBlockMap[block._id] = block;
                  updateScope(
                    block._scope,
                    index,
                    valueIdentifier,
                    value,
                    keyIdentifier,
                    key,
                    collectionLength,
                  );
                  block._usesPositionLocals = scopeUsesRepeatPositionLocals(
                    block._scope,
                  );
                });
              }
            }
            lastBlockMap = nextBlockMap as RepeatBlockMap;
          },
          isDefined(attr.lazy),
        );
      }

      return ngRepeatLink;
    },
  };
}
