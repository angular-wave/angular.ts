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
import { createLazyAnimate } from "../../animations/lazy-animate.ts";
import { $injectTokens } from "../../injection-tokens.ts";
import { NodeType } from "../../shared/node.ts";

const NG_REMOVED = "$$NG_REMOVED";

const ngRepeatMinErr = minErr("ngRepeat");

const VAR_OR_TUPLE_REGEX =
  /^(?:(\s*[$\w]+)|\(\s*([$\w]+)\s*,\s*([$\w]+)\s*\))$/;

ngRepeatDirective.$inject = [$injectTokens._injector];

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

export function ngRepeatDirective($injector: ng.InjectorService): ng.Directive {
  const getAnimate = createLazyAnimate($injector);

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

    if (keyIdentifier && scope[keyIdentifier] !== key) {
      scope[keyIdentifier] = key;
    }

    if (value && scope.$target._hashKey !== value._hashKey) {
      scope.$target._hashKey = value._hashKey;
    }

    if (!updatePositionLocals) {
      return;
    }

    const isFirst = index === 0;

    const isLast = index === arrayLength - 1;

    const isEven = (index & 1) === 0;

    const isMiddle = !(isFirst || isLast);

    const isOdd = !isEven;

    if (scope.$index !== index) {
      scope.$index = index;
    }

    if (scope.$first !== isFirst) {
      scope.$first = isFirst;
    }

    if (scope.$last !== isLast) {
      scope.$last = isLast;
    }

    if (scope.$middle !== isMiddle) {
      scope.$middle = isMiddle;
    }

    if (scope.$even !== isEven) {
      scope.$even = isEven;
    }

    if (scope.$odd !== isOdd) {
      scope.$odd = isOdd;
    }
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

      if (node.nodeType === NodeType._ELEMENT_NODE) {
        removeElement(node as Element);
      } else {
        removeElementData(node as Element & Record<string, any>);
        node.parentNode?.removeChild(node);
      }
    }
  }

  function removeNodeRange(firstNode: Node, lastNode: Node): void {
    let node: Node | null = firstNode;

    const endNode = lastNode.nextSibling;

    while (node && node !== endNode) {
      const nextNode: Node | null = node.nextSibling;

      if (node.nodeType === NodeType._ELEMENT_NODE) {
        removeElement(node as Element);
      } else {
        removeElementData(node as Element & Record<string, any>);
        node.parentNode?.removeChild(node);
      }

      node = nextNode;
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

  function getSwapMutationIndices(
    mutationMeta: ArrayMutationMeta | undefined,
    lastBlockOrder: RepeatBlock[],
    nextBlockOrder: RepeatBlock[],
  ): [number, number] | undefined {
    if (!mutationMeta || mutationMeta._kind !== "swap") {
      return undefined;
    }

    const leftIndex = mutationMeta._swapFromIndex;

    const rightIndex = mutationMeta._swapToIndex;

    if (
      leftIndex < 0 ||
      rightIndex <= leftIndex ||
      rightIndex >= nextBlockOrder.length ||
      lastBlockOrder.length !== nextBlockOrder.length
    ) {
      return undefined;
    }

    for (let index = 0; index < nextBlockOrder.length; index++) {
      const block = nextBlockOrder[index];

      if (!block._scope || !block._clone) {
        return undefined;
      }

      if (index === leftIndex) {
        if (block !== lastBlockOrder[rightIndex]) {
          return undefined;
        }

        continue;
      }

      if (index === rightIndex) {
        if (block !== lastBlockOrder[leftIndex]) {
          return undefined;
        }

        continue;
      }

      if (block !== lastBlockOrder[index]) {
        return undefined;
      }
    }

    return [leftIndex, rightIndex];
  }

  function hasStableRetainedPrefix(
    retainedLength: number,
    lastBlockOrder: RepeatBlock[],
    nextBlockOrder: RepeatBlock[],
  ): boolean {
    if (
      retainedLength <= 0 ||
      retainedLength !== lastBlockOrder.length ||
      retainedLength >= nextBlockOrder.length
    ) {
      return false;
    }

    for (let index = 0; index < retainedLength; index++) {
      const block = nextBlockOrder[index];

      if (block !== lastBlockOrder[index] || !block._scope || !block._clone) {
        return false;
      }
    }

    return true;
  }

  function isPureAppendMutation(
    mutationMeta: ArrayMutationMeta | undefined,
    lastBlockOrder: RepeatBlock[],
    nextBlockOrder: RepeatBlock[],
  ): boolean {
    if (
      !mutationMeta ||
      mutationMeta._kind !== "splice" ||
      mutationMeta._deleteCount !== 0 ||
      mutationMeta._insertCount === 0
    ) {
      return false;
    }

    const retainedLength = mutationMeta._previousLength;

    if (mutationMeta._index !== retainedLength) {
      return false;
    }

    return hasStableRetainedPrefix(
      retainedLength,
      lastBlockOrder,
      nextBlockOrder,
    );
  }

  function getPureTailDeleteRetainedLength(
    mutationMeta: ArrayMutationMeta | undefined,
    lastBlockOrder: RepeatBlock[],
    nextBlockOrder: RepeatBlock[],
  ): number | undefined {
    if (
      !mutationMeta ||
      mutationMeta._kind !== "splice" ||
      mutationMeta._insertCount !== 0 ||
      mutationMeta._deleteCount === 0 ||
      !mutationMeta._tailDeletes
    ) {
      return undefined;
    }

    const retainedLength = mutationMeta._currentLength;

    if (
      retainedLength <= 0 ||
      retainedLength !== nextBlockOrder.length ||
      mutationMeta._previousLength !== lastBlockOrder.length
    ) {
      return undefined;
    }

    for (let index = 0; index < retainedLength; index++) {
      const block = nextBlockOrder[index];

      if (block !== lastBlockOrder[index] || !block._scope || !block._clone) {
        return undefined;
      }
    }

    return retainedLength;
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
        let previousNode: any;

        function insertNodesAfter(nodes: Node[], afterNode: Node): void {
          const { parentNode } = afterNode;

          if (!parentNode) return;

          if (nodes.length === 1) {
            parentNode.insertBefore(nodes[0], afterNode.nextSibling);

            return;
          }

          const fragment = document.createDocumentFragment();

          for (let i = 0; i < nodes.length; i++) {
            fragment.appendChild(nodes[i]);
          }

          parentNode.insertBefore(fragment, afterNode.nextSibling);
        }

        function moveSwappedBlocks(
          leftIndex: number,
          rightIndex: number,
        ): boolean {
          const firstBlock = lastBlockOrder[leftIndex];

          const secondBlock = lastBlockOrder[rightIndex];

          if (!firstBlock?._clone || !secondBlock?._clone) {
            return false;
          }

          const firstStart = getBlockStart(firstBlock);

          const firstEnd = getBlockEnd(firstBlock);

          const secondStart = getBlockStart(secondBlock);

          const secondEnd = getBlockEnd(secondBlock);

          if (!firstStart || !firstEnd || !secondStart || !secondEnd) {
            return false;
          }

          const anchorBeforeFirst = firstStart.previousSibling;

          if (!anchorBeforeFirst) {
            return false;
          }

          const firstCloneNodes = Array.isArray(firstBlock._clone)
            ? firstBlock._clone
            : [firstBlock._clone];

          const secondCloneNodes = Array.isArray(secondBlock._clone)
            ? secondBlock._clone
            : [secondBlock._clone];

          const firstNodes = getBlockNodes(firstCloneNodes);

          const secondNodes = getBlockNodes(secondCloneNodes);

          if (firstEnd.nextSibling === secondStart) {
            insertNodesAfter(secondNodes, anchorBeforeFirst);

            return true;
          }

          const anchorBeforeSecond = secondStart.previousSibling;

          if (!anchorBeforeSecond) {
            return false;
          }

          insertNodesAfter(secondNodes, anchorBeforeFirst);
          insertNodesAfter(firstNodes, anchorBeforeSecond);

          return true;
        }

        let lastBlockMap: RepeatBlockMap = nullObject();

        let lastBlockOrder: RepeatBlock[] = [];

        let lastSeenArrayMutationVersion = 0;

        $scope.$watch(
          rhs,
          (collection: any) => {
            swap();
            let index = 0;

            previousNode = $element;

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

            const isIndexKeyedCollection = collection === collectionKeys;

            const nextBlockOrder: RepeatBlock[] = new Array(collectionLength);

            let hasRetainedBlocks = false;

            let hasStableAppendRetainedPrefix =
              !hasAnimate &&
              lastBlockOrder.length > 0 &&
              lastBlockOrder.length < collectionLength;

            for (index = 0; index < collectionLength; index++) {
              key = isIndexKeyedCollection ? index : collectionKeys[index];
              value = collection[key];
              trackById = trackByIdFn($scope, key, value);

              if (lastBlockMap[trackById]) {
                block = lastBlockMap[trackById];
                delete lastBlockMap[trackById];
                nextBlockMap[trackById] = block;
                nextBlockOrder[index] = block;
                hasRetainedBlocks = true;

                if (
                  hasStableAppendRetainedPrefix &&
                  index < lastBlockOrder.length &&
                  (block !== lastBlockOrder[index] ||
                    !block._scope ||
                    !block._clone)
                ) {
                  hasStableAppendRetainedPrefix = false;
                }
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
                if (
                  hasStableAppendRetainedPrefix &&
                  index < lastBlockOrder.length
                ) {
                  hasStableAppendRetainedPrefix = false;
                }

                nextBlockOrder[index] = {
                  _id: trackById,
                  _scope: undefined,
                  _clone: undefined,
                };
                nextBlockMap[trackById] = true;
              }
            }

            let mutationMeta = getArrayMutationMeta(collection);

            if (
              !mutationMeta ||
              mutationMeta._version <= lastSeenArrayMutationVersion ||
              mutationMeta._currentLength !== collectionLength
            ) {
              mutationMeta = undefined;
            } else {
              lastSeenArrayMutationVersion = mutationMeta._version;
            }

            const swapMutationIndices = !hasAnimate
              ? getSwapMutationIndices(
                  mutationMeta,
                  lastBlockOrder,
                  nextBlockOrder,
                )
              : undefined;

            const didApplySwapDomMove =
              !!swapMutationIndices &&
              moveSwappedBlocks(swapMutationIndices[0], swapMutationIndices[1]);

            const canSkipDomMoveChecksForAppend =
              !hasAnimate &&
              (isPureAppendMutation(
                mutationMeta,
                lastBlockOrder,
                nextBlockOrder,
              ) ||
                hasStableAppendRetainedPrefix);

            const canSkipDomMoveChecksForMutation =
              didApplySwapDomMove ||
              canSkipDomMoveChecks(mutationMeta, nextBlockOrder) ||
              canSkipDomMoveChecksForAppend;

            const tailDeleteRetainedLength = !hasAnimate
              ? getPureTailDeleteRetainedLength(
                  mutationMeta,
                  lastBlockOrder,
                  nextBlockOrder,
                )
              : undefined;

            if (
              !hasAnimate &&
              collectionLength === 0 &&
              lastBlockOrder.length > 0
            ) {
              const firstBlock = lastBlockOrder[0];

              const lastBlock = lastBlockOrder[lastBlockOrder.length - 1];

              const firstNode = firstBlock && getBlockStart(firstBlock);

              const lastNode = lastBlock && getBlockEnd(lastBlock);

              if (firstNode && lastNode) {
                for (let i = 0; i < lastBlockOrder.length; i++) {
                  lastBlockOrder[i]._scope?.$destroy();
                }

                removeNodeRange(firstNode, lastNode);
                lastBlockMap = nextBlockMap as RepeatBlockMap;
                lastBlockOrder = nextBlockOrder;

                return;
              }
            }

            if (
              !hasAnimate &&
              tailDeleteRetainedLength !== undefined &&
              lastBlockOrder.length > tailDeleteRetainedLength
            ) {
              const firstRemovedBlock =
                lastBlockOrder[tailDeleteRetainedLength];

              const lastRemovedBlock =
                lastBlockOrder[lastBlockOrder.length - 1];

              const firstRemovedNode =
                firstRemovedBlock && getBlockStart(firstRemovedBlock);

              const lastRemovedNode =
                lastRemovedBlock && getBlockEnd(lastRemovedBlock);

              if (firstRemovedNode && lastRemovedNode) {
                for (
                  let removedIndex = tailDeleteRetainedLength;
                  removedIndex < lastBlockOrder.length;
                  removedIndex++
                ) {
                  lastBlockOrder[removedIndex]._scope?.$destroy();
                }

                removeNodeRange(firstRemovedNode, lastRemovedNode);

                const retainedLastIndex = tailDeleteRetainedLength - 1;

                const retainedLastBlock = nextBlockOrder[retainedLastIndex];

                if (
                  retainedLastBlock?._scope &&
                  retainedLastBlock._usesPositionLocals
                ) {
                  key = isIndexKeyedCollection
                    ? retainedLastIndex
                    : collectionKeys[retainedLastIndex];
                  value = collection[key];
                  updateScope(
                    retainedLastBlock._scope,
                    retainedLastIndex,
                    valueIdentifier,
                    value,
                    keyIdentifier,
                    key,
                    collectionLength,
                    true,
                  );
                }

                lastBlockMap = nextBlockMap as RepeatBlockMap;
                lastBlockOrder = nextBlockOrder;

                return;
              }
            }

            if (
              !hasAnimate &&
              collectionLength > 0 &&
              lastBlockOrder.length > 0 &&
              !hasRetainedBlocks
            ) {
              const firstBlock = lastBlockOrder[0];

              const lastBlock = lastBlockOrder[lastBlockOrder.length - 1];

              const firstNode = firstBlock && getBlockStart(firstBlock);

              const lastNode = lastBlock && getBlockEnd(lastBlock);

              if (firstNode && lastNode) {
                for (let i = 0; i < lastBlockOrder.length; i++) {
                  lastBlockOrder[i]._scope?.$destroy();
                }

                removeNodeRange(firstNode, lastNode);
                lastBlockMap = nullObject();
                lastBlockOrder = [];
              }
            }

            for (const blockKey in lastBlockMap) {
              block = lastBlockMap[blockKey];
              const blockNodes = getBlockNodes(
                Array.isArray(block._clone)
                  ? block._clone
                  : [block._clone as Node],
              );

              elementsToRemove = getBlockStart(block) as Element;

              if (hasAnimate && elementsToRemove) {
                getAnimate().leave(elementsToRemove);
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

            let startIndex = 0;

            if (canSkipDomMoveChecksForAppend && lastBlockOrder.length > 0) {
              const retainedLastIndex = lastBlockOrder.length - 1;

              const retainedLastBlock = nextBlockOrder[retainedLastIndex];

              const retainedLastNode =
                retainedLastBlock && getBlockEnd(retainedLastBlock);

              if (retainedLastNode) {
                previousNode = retainedLastNode;
                startIndex = lastBlockOrder.length;

                if (
                  retainedLastBlock._scope &&
                  retainedLastBlock._usesPositionLocals
                ) {
                  key = isIndexKeyedCollection
                    ? retainedLastIndex
                    : collectionKeys[retainedLastIndex];
                  value = collection[key];
                  updateScope(
                    retainedLastBlock._scope,
                    retainedLastIndex,
                    valueIdentifier,
                    value,
                    keyIdentifier,
                    key,
                    collectionLength,
                    true,
                  );
                }
              }
            }

            for (index = startIndex; index < collectionLength; index++) {
              key = isIndexKeyedCollection ? index : collectionKeys[index];
              value = collection[key];
              block = nextBlockOrder[index];

              if (block._scope) {
                const shouldUpdatePositionLocals = !!block._usesPositionLocals;

                const shouldUpdateKeyLocal =
                  !!keyIdentifier && block._scope[keyIdentifier] !== key;

                const shouldUpdateValueLocal =
                  block._scope[valueIdentifier] !== value;

                const existingClone = block._clone;

                if (!existingClone) {
                  continue;
                }

                const isExistingCloneArray = Array.isArray(existingClone);

                const blockStart = isExistingCloneArray
                  ? existingClone[0]
                  : existingClone;

                const blockEnd = isExistingCloneArray
                  ? existingClone[existingClone.length - 1]
                  : existingClone;

                if (!canSkipDomMoveChecksForMutation) {
                  nextNode = previousNode.nextSibling;

                  if (blockStart !== nextNode) {
                    while (nextNode && nextNode[NG_REMOVED]) {
                      nextNode = nextNode.nextSibling;
                    }

                    if (blockStart !== nextNode) {
                      const existingCloneNodes = isExistingCloneArray
                        ? existingClone
                        : [existingClone];

                      insertNodesAfter(
                        getBlockNodes(existingCloneNodes),
                        previousNode,
                      );
                    }
                  }
                }

                previousNode = blockEnd;

                if (
                  shouldUpdatePositionLocals ||
                  shouldUpdateKeyLocal ||
                  shouldUpdateValueLocal
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
                    getAnimate().enter(
                      cloneNodes[0] as Element,
                      null,
                      previousNode,
                    );
                    previousNode = endNode;
                  } else {
                    insertNodesAfter(cloneNodes, previousNode);
                    previousNode = endNode;
                  }

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
                });

                if (block._scope) {
                  block._usesPositionLocals = scopeUsesRepeatPositionLocals(
                    block._scope,
                  );
                }
              }
            }

            lastBlockMap = nextBlockMap as RepeatBlockMap;
            lastBlockOrder = nextBlockOrder;
          },
          isDefined(attr.lazy),
        );
      }

      return ngRepeatLink;
    },
  };
}
