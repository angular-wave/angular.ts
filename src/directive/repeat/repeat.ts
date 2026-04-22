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
  id: any;
  scope?: RepeatScope;
  clone?: RepeatClone;
};

type RepeatBlockMap = Record<string, RepeatBlock>;

export function ngRepeatDirective($animate: any): ng.Directive {
  function updateScope(
    scope: RepeatScope,
    index: number,
    valueIdentifier: string,
    value: any,
    keyIdentifier: string | undefined,
    key: any,
    arrayLength: number,
  ) {
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

  function getBlockStart(block: RepeatBlock) {
    return Array.isArray(block.clone) ? block.clone[0] : block.clone;
  }

  function getBlockEnd(block: RepeatBlock) {
    return Array.isArray(block.clone)
      ? block.clone[block.clone.length - 1]
      : block.clone;
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
                  if (x && x.scope) lastBlockMap[x.id] = block;
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
              const blockNodes = getBlockNodes(
                Array.isArray(block.clone)
                  ? block.clone
                  : [block.clone as Node],
              );

              elementsToRemove = getBlockStart(block) as Element;

              if (hasAnimate && elementsToRemove) {
                $animate.leave(elementsToRemove);
              } else {
                block.scope?.$destroy();
                removeBlockNodes(blockNodes);
              }

              if (blockNodes.length && blockNodes[0].parentNode) {
                for (let i = 0, j = blockNodes.length; i < j; i++) {
                  (blockNodes[i] as Node & Record<string, any>)[NG_REMOVED] =
                    true;
                }
              }

              if (hasAnimate && elementsToRemove) {
                block.scope?.$destroy();
              }
            }

            for (index = 0; index < collectionLength; index++) {
              key =
                collection === collectionKeys ? index : collectionKeys[index];
              value = collection[key];
              block = nextBlockOrder[index];

              if (block.scope) {
                const existingClone = block.clone;

                if (!existingClone) {
                  continue;
                }

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
                $transclude?.((clone: RepeatClone, scope: RepeatScope) => {
                  const normalizedClone = normalizeCloneNodes(clone);

                  const cloneNodes = Array.isArray(normalizedClone)
                    ? normalizedClone
                    : [normalizedClone];

                  block.scope = scope;
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
                  block.clone = normalizedClone;
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
            lastBlockMap = nextBlockMap as RepeatBlockMap;
          },
          isDefined(attr.lazy),
        );
      }

      return ngRepeatLink;
    },
  };
}
