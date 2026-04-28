import { _injector } from '../../injection-tokens.js';
import { minErr, isArrayLike, hasOwn, values, nullObject, isArray, isDefined, callBackOnce, isInstanceOf, arrayFrom, hashKey } from '../../shared/utils.js';
import { getBlockNodes, removeElement, removeElementData, createDocumentFragment } from '../../shared/dom.js';
import { getArrayMutationMeta } from '../../core/scope/scope.js';
import { createLazyAnimate } from '../../animations/lazy-animate.js';
import { NodeType } from '../../shared/node.js';

const NG_REMOVED = "$$NG_REMOVED";
const ngRepeatMinErr = minErr("ngRepeat");
const VAR_OR_TUPLE_REGEX = /^(?:(\s*[$\w]+)|\(\s*([$\w]+)\s*,\s*([$\w]+)\s*\))$/;
ngRepeatDirective.$inject = [_injector];
function ngRepeatDirective($injector) {
    const getAnimate = createLazyAnimate($injector);
    const repeatPositionLocalKeys = [
        "$index",
        "$first",
        "$last",
        "$middle",
        "$odd",
        "$even",
    ];
    function scopeUsesRepeatPositionLocals(scope) {
        const watchers = scope.$handler._watchers;
        for (let i = 0; i < repeatPositionLocalKeys.length; i++) {
            if (watchers.has(repeatPositionLocalKeys[i])) {
                return true;
            }
        }
        return false;
    }
    function updateScope(scope, index, valueIdentifier, value, keyIdentifier, key, arrayLength, updatePositionLocals = true) {
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
    function getBlockStart(block) {
        return isArray(block._clone) ? block._clone[0] : block._clone;
    }
    function getBlockEnd(block) {
        return isArray(block._clone)
            ? block._clone[block._clone.length - 1]
            : block._clone;
    }
    function normalizeCloneNodes(clone) {
        if (isInstanceOf(clone, DocumentFragment)) {
            return arrayFrom(clone.childNodes);
        }
        if (isInstanceOf(clone, NodeList) || isArray(clone)) {
            return arrayFrom(clone);
        }
        return clone;
    }
    function removeBlockNodes(nodes) {
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (node.nodeType === NodeType._ELEMENT_NODE) {
                removeElement(node);
            }
            else {
                removeElementData(node);
                node.parentNode?.removeChild(node);
            }
        }
    }
    function removeNodeRange(firstNode, lastNode) {
        let node = firstNode;
        const endNode = lastNode.nextSibling;
        while (node && node !== endNode) {
            const nextNode = node.nextSibling;
            if (node.nodeType === NodeType._ELEMENT_NODE) {
                removeElement(node);
            }
            else {
                removeElementData(node);
                node.parentNode?.removeChild(node);
            }
            node = nextNode;
        }
    }
    function removeNodeRangeFast(firstNode, lastNode) {
        const parent = firstNode.parentNode;
        if (!parent || lastNode.parentNode !== parent) {
            removeNodeRange(firstNode, lastNode);
            return;
        }
        const range = document.createRange();
        range.setStartBefore(firstNode);
        range.setEndAfter(lastNode);
        const removedNodes = range.extractContents();
        const descendants = removedNodes.querySelectorAll("*");
        for (let i = 0; i < descendants.length; i++) {
            removeElementData(descendants[i]);
        }
        let node = removedNodes.firstChild;
        while (node) {
            removeElementData(node);
            node = node.nextSibling;
        }
        range.detach();
    }
    function trackByIdArrayFn(_$scope, _key, value) {
        return hashKey(value);
    }
    function trackByIdObjFn(_$scope, key) {
        return key;
    }
    function canSkipDomMoveChecks(mutationMeta, blockOrder) {
        if (!mutationMeta ||
            mutationMeta._kind !== "splice" ||
            mutationMeta._insertCount !== 0 ||
            mutationMeta._deleteCount === 0) {
            return false;
        }
        for (let index = 0; index < blockOrder.length; index++) {
            if (!blockOrder[index]._scope || !blockOrder[index]._clone) {
                return false;
            }
        }
        return true;
    }
    function getSwapMutationIndices(mutationMeta, lastBlockOrder, nextBlockOrder) {
        if (!mutationMeta || mutationMeta._kind !== "swap") {
            return undefined;
        }
        const leftIndex = mutationMeta._swapFromIndex;
        const rightIndex = mutationMeta._swapToIndex;
        if (leftIndex < 0 ||
            rightIndex <= leftIndex ||
            rightIndex >= nextBlockOrder.length ||
            lastBlockOrder.length !== nextBlockOrder.length) {
            return undefined;
        }
        const leftBlock = nextBlockOrder[leftIndex];
        const rightBlock = nextBlockOrder[rightIndex];
        if (!leftBlock?._scope ||
            !leftBlock._clone ||
            !rightBlock?._scope ||
            !rightBlock._clone ||
            leftBlock !== lastBlockOrder[rightIndex] ||
            rightBlock !== lastBlockOrder[leftIndex]) {
            return undefined;
        }
        return [leftIndex, rightIndex];
    }
    function hasStableRetainedPrefix(retainedLength, lastBlockOrder, nextBlockOrder) {
        if (retainedLength <= 0 ||
            retainedLength !== lastBlockOrder.length ||
            retainedLength >= nextBlockOrder.length) {
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
    function isPureAppendMutation(mutationMeta, lastBlockOrder, nextBlockOrder) {
        if (!mutationMeta ||
            mutationMeta._kind !== "splice" ||
            mutationMeta._deleteCount !== 0 ||
            mutationMeta._insertCount === 0) {
            return false;
        }
        const retainedLength = mutationMeta._previousLength;
        if (mutationMeta._index !== retainedLength) {
            return false;
        }
        return hasStableRetainedPrefix(retainedLength, lastBlockOrder, nextBlockOrder);
    }
    function getPureTailDeleteRetainedLength(mutationMeta, lastBlockOrder, nextBlockOrder) {
        if (!mutationMeta ||
            mutationMeta._kind !== "splice" ||
            mutationMeta._insertCount !== 0 ||
            mutationMeta._deleteCount === 0 ||
            !mutationMeta._tailDeletes) {
            return undefined;
        }
        const retainedLength = mutationMeta._currentLength;
        if (retainedLength <= 0 ||
            retainedLength !== nextBlockOrder.length ||
            mutationMeta._previousLength !== lastBlockOrder.length) {
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
        compile(_$element, $attr) {
            const expression = $attr.ngRepeat;
            const hasAnimate = !!$attr.animate;
            let match = expression.match(/^\s*([\s\S]+?)\s+in\s+([\s\S]+?)(?:\s+as\s+([\s\S]+?))?\s*$/);
            if (!match) {
                throw ngRepeatMinErr("iexp", "Expected expression in form of '_item_ in _collection_' but got '{0}'.", expression);
            }
            const lhs = match[1];
            const rhs = match[2];
            const aliasAs = match[3];
            match = lhs.match(VAR_OR_TUPLE_REGEX);
            if (!match) {
                throw ngRepeatMinErr("iidexp", "'_item_' in '_item_ in _collection_' should be an identifier or '(_key_, _value_)' expression, but got '{0}'.", lhs);
            }
            const valueIdentifier = match[3] || match[1];
            const keyIdentifier = match[2];
            if (aliasAs &&
                (!/^[$a-zA-Z_][$a-zA-Z0-9_]*$/.test(aliasAs) ||
                    /^(null|undefined|this|\$index|\$first|\$middle|\$last|\$even|\$odd|\$parent|\$root|\$id)$/.test(aliasAs))) {
                throw ngRepeatMinErr("badident", "alias '{0}' is invalid --- must be a valid JS identifier which is not a reserved name.", aliasAs);
            }
            const swap = callBackOnce(() => {
                if (isDefined($attr.lazy) && isDefined($attr.swap)) {
                    document
                        .querySelectorAll($attr.swap)
                        .forEach((x) => removeElement(x));
                }
            });
            function ngRepeatLink($scope, $element, attr, _ctrl, $transclude) {
                let previousNode;
                function insertNodesAfter(nodes, afterNode) {
                    const { parentNode } = afterNode;
                    if (!parentNode)
                        return;
                    if (nodes.length === 1) {
                        parentNode.insertBefore(nodes[0], afterNode.nextSibling);
                        return;
                    }
                    const fragment = createDocumentFragment();
                    for (let i = 0; i < nodes.length; i++) {
                        fragment.appendChild(nodes[i]);
                    }
                    parentNode.insertBefore(fragment, afterNode.nextSibling);
                }
                function moveSwappedBlocks(leftIndex, rightIndex) {
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
                    const firstCloneNodes = isArray(firstBlock._clone)
                        ? firstBlock._clone
                        : [firstBlock._clone];
                    const secondCloneNodes = isArray(secondBlock._clone)
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
                let lastBlockMap = nullObject();
                let lastBlockOrder = [];
                let lastSeenArrayMutationVersion = 0;
                $scope.$watch(rhs, (collection) => {
                    swap();
                    let index = 0;
                    previousNode = $element;
                    let nextNode;
                    const nextBlockMap = nullObject();
                    let key;
                    let value;
                    let trackById;
                    let trackByIdFn;
                    let collectionKeys = [];
                    let block;
                    let elementsToRemove;
                    if (aliasAs) {
                        $scope[aliasAs] = collection;
                    }
                    if (isArrayLike(collection)) {
                        collectionKeys = collection;
                        trackByIdFn = trackByIdArrayFn;
                    }
                    else {
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
                    const nextBlockOrder = new Array(collectionLength);
                    let hasRetainedBlocks = false;
                    let hasStableAppendRetainedPrefix = !hasAnimate &&
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
                            if (hasStableAppendRetainedPrefix &&
                                index < lastBlockOrder.length &&
                                (block !== lastBlockOrder[index] ||
                                    !block._scope ||
                                    !block._clone)) {
                                hasStableAppendRetainedPrefix = false;
                            }
                        }
                        else if (nextBlockMap[trackById]) {
                            values(nextBlockOrder).forEach((x) => {
                                if (x && x._scope)
                                    lastBlockMap[x._id] = block;
                            });
                            throw ngRepeatMinErr("dupes", "Duplicates keys in a repeater are not allowed. Repeater: {0}, Duplicate key: {1} for value: {2}", expression, trackById, value);
                        }
                        else {
                            if (hasStableAppendRetainedPrefix &&
                                index < lastBlockOrder.length) {
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
                    if (!mutationMeta ||
                        mutationMeta._version <= lastSeenArrayMutationVersion ||
                        mutationMeta._currentLength !== collectionLength) {
                        mutationMeta = undefined;
                    }
                    else {
                        lastSeenArrayMutationVersion = mutationMeta._version;
                    }
                    const swapMutationIndices = !hasAnimate
                        ? getSwapMutationIndices(mutationMeta, lastBlockOrder, nextBlockOrder)
                        : undefined;
                    const didApplySwapDomMove = !!swapMutationIndices &&
                        moveSwappedBlocks(swapMutationIndices[0], swapMutationIndices[1]);
                    const canSkipDomMoveChecksForAppend = !hasAnimate &&
                        (isPureAppendMutation(mutationMeta, lastBlockOrder, nextBlockOrder) ||
                            hasStableAppendRetainedPrefix);
                    const canSkipDomMoveChecksForMutation = didApplySwapDomMove ||
                        canSkipDomMoveChecks(mutationMeta, nextBlockOrder) ||
                        canSkipDomMoveChecksForAppend;
                    const tailDeleteRetainedLength = !hasAnimate
                        ? getPureTailDeleteRetainedLength(mutationMeta, lastBlockOrder, nextBlockOrder)
                        : undefined;
                    if (!hasAnimate &&
                        collectionLength === 0 &&
                        lastBlockOrder.length > 0) {
                        const firstBlock = lastBlockOrder[0];
                        const lastBlock = lastBlockOrder[lastBlockOrder.length - 1];
                        const firstNode = firstBlock && getBlockStart(firstBlock);
                        const lastNode = lastBlock && getBlockEnd(lastBlock);
                        if (firstNode && lastNode) {
                            for (let i = 0; i < lastBlockOrder.length; i++) {
                                lastBlockOrder[i]._scope?.$destroy();
                            }
                            removeNodeRangeFast(firstNode, lastNode);
                            lastBlockMap = nextBlockMap;
                            lastBlockOrder = nextBlockOrder;
                            return;
                        }
                    }
                    if (!hasAnimate &&
                        tailDeleteRetainedLength !== undefined &&
                        lastBlockOrder.length > tailDeleteRetainedLength) {
                        const firstRemovedBlock = lastBlockOrder[tailDeleteRetainedLength];
                        const lastRemovedBlock = lastBlockOrder[lastBlockOrder.length - 1];
                        const firstRemovedNode = firstRemovedBlock && getBlockStart(firstRemovedBlock);
                        const lastRemovedNode = lastRemovedBlock && getBlockEnd(lastRemovedBlock);
                        if (firstRemovedNode && lastRemovedNode) {
                            for (let removedIndex = tailDeleteRetainedLength; removedIndex < lastBlockOrder.length; removedIndex++) {
                                lastBlockOrder[removedIndex]._scope?.$destroy();
                            }
                            removeNodeRangeFast(firstRemovedNode, lastRemovedNode);
                            const retainedLastIndex = tailDeleteRetainedLength - 1;
                            const retainedLastBlock = nextBlockOrder[retainedLastIndex];
                            if (retainedLastBlock?._scope &&
                                retainedLastBlock._usesPositionLocals) {
                                key = isIndexKeyedCollection
                                    ? retainedLastIndex
                                    : collectionKeys[retainedLastIndex];
                                value = collection[key];
                                updateScope(retainedLastBlock._scope, retainedLastIndex, valueIdentifier, value, keyIdentifier, key, collectionLength, true);
                            }
                            lastBlockMap = nextBlockMap;
                            lastBlockOrder = nextBlockOrder;
                            return;
                        }
                    }
                    if (!hasAnimate &&
                        collectionLength > 0 &&
                        lastBlockOrder.length > 0 &&
                        !hasRetainedBlocks) {
                        const firstBlock = lastBlockOrder[0];
                        const lastBlock = lastBlockOrder[lastBlockOrder.length - 1];
                        const firstNode = firstBlock && getBlockStart(firstBlock);
                        const lastNode = lastBlock && getBlockEnd(lastBlock);
                        if (firstNode && lastNode) {
                            for (let i = 0; i < lastBlockOrder.length; i++) {
                                lastBlockOrder[i]._scope?.$destroy();
                            }
                            removeNodeRangeFast(firstNode, lastNode);
                            lastBlockMap = nullObject();
                            lastBlockOrder = [];
                        }
                    }
                    for (const blockKey in lastBlockMap) {
                        block = lastBlockMap[blockKey];
                        const blockNodes = getBlockNodes(isArray(block._clone) ? block._clone : [block._clone]);
                        elementsToRemove = getBlockStart(block);
                        if (hasAnimate && elementsToRemove) {
                            getAnimate().leave(elementsToRemove);
                        }
                        else {
                            block._scope?.$destroy();
                            removeBlockNodes(blockNodes);
                        }
                        if (blockNodes.length && blockNodes[0].parentNode) {
                            for (let i = 0, j = blockNodes.length; i < j; i++) {
                                blockNodes[i][NG_REMOVED] =
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
                        const retainedLastNode = retainedLastBlock && getBlockEnd(retainedLastBlock);
                        if (retainedLastNode) {
                            previousNode = retainedLastNode;
                            startIndex = lastBlockOrder.length;
                            if (retainedLastBlock._scope &&
                                retainedLastBlock._usesPositionLocals) {
                                key = isIndexKeyedCollection
                                    ? retainedLastIndex
                                    : collectionKeys[retainedLastIndex];
                                value = collection[key];
                                updateScope(retainedLastBlock._scope, retainedLastIndex, valueIdentifier, value, keyIdentifier, key, collectionLength, true);
                            }
                        }
                    }
                    for (index = startIndex; index < collectionLength; index++) {
                        key = isIndexKeyedCollection ? index : collectionKeys[index];
                        value = collection[key];
                        block = nextBlockOrder[index];
                        if (block._scope) {
                            const shouldUpdatePositionLocals = !!block._usesPositionLocals;
                            const shouldUpdateKeyLocal = !!keyIdentifier && block._scope[keyIdentifier] !== key;
                            const shouldUpdateValueLocal = block._scope[valueIdentifier] !== value;
                            const existingClone = block._clone;
                            if (!existingClone) {
                                continue;
                            }
                            const isExistingCloneArray = isArray(existingClone);
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
                                        insertNodesAfter(getBlockNodes(existingCloneNodes), previousNode);
                                    }
                                }
                            }
                            previousNode = blockEnd;
                            if (shouldUpdatePositionLocals ||
                                shouldUpdateKeyLocal ||
                                shouldUpdateValueLocal) {
                                updateScope(block._scope, index, valueIdentifier, value, keyIdentifier, key, collectionLength, shouldUpdatePositionLocals);
                            }
                        }
                        else {
                            $transclude?.((clone, scope) => {
                                const normalizedClone = normalizeCloneNodes(clone);
                                const cloneNodes = isArray(normalizedClone)
                                    ? normalizedClone
                                    : [normalizedClone];
                                block._scope = scope;
                                const endNode = cloneNodes[cloneNodes.length - 1];
                                if (hasAnimate &&
                                    cloneNodes[0].nodeType === NodeType._ELEMENT_NODE) {
                                    getAnimate().enter(cloneNodes[0], null, previousNode);
                                    previousNode = endNode;
                                }
                                else {
                                    insertNodesAfter(cloneNodes, previousNode);
                                    previousNode = endNode;
                                }
                                block._clone = normalizedClone;
                                nextBlockMap[block._id] = block;
                                updateScope(block._scope, index, valueIdentifier, value, keyIdentifier, key, collectionLength);
                            });
                            if (block._scope) {
                                block._usesPositionLocals = scopeUsesRepeatPositionLocals(block._scope);
                            }
                        }
                    }
                    lastBlockMap = nextBlockMap;
                    lastBlockOrder = nextBlockOrder;
                }, isDefined(attr.lazy));
            }
            return ngRepeatLink;
        },
    };
}

export { ngRepeatDirective };
