import { _compile } from '../../injection-tokens.js';
import { isFunction, isInstanceOf, arrayFrom, isArray, createErrorFactory } from '../../shared/utils.js';
import { emptyElement, startingTag, getDirectiveAttr } from '../../shared/dom.js';
import { NodeType } from '../../shared/node.js';

const ngTranscludeError = createErrorFactory("ngTransclude");
ngTranscludeDirective.$inject = [_compile];
function ngTranscludeDirective($compile) {
    return {
        compile: function ngTranscludeCompile(tElement) {
            const fallbackLinkFn = $compile(tElement.childNodes);
            emptyElement(tElement);
            function ngTranscludePostLink($scope, $element, $attrs, _controller, $transclude) {
                if (!$transclude) {
                    throw ngTranscludeError("orphan", "Illegal use of ngTransclude directive in the template! " +
                        "No parent directive that requires a transclusion found. " +
                        "Element: {0}", startingTag($element));
                }
                let transcludeName = getDirectiveAttr($element, $attrs, "ngTransclude");
                const transcludeSlot = getDirectiveAttr($element, $attrs, "ngTranscludeSlot");
                if (transcludeName === $attrs.$attr.ngTransclude) {
                    transcludeName = "";
                }
                const slotNameValue = typeof transcludeName === "string" && transcludeName.length > 0
                    ? transcludeName
                    : transcludeSlot;
                const slotName = typeof slotNameValue === "string" ? slotNameValue : undefined;
                $transclude(ngTranscludeCloneAttachFn, null, slotName);
                if (slotName && $transclude.isSlotFilled?.(slotName) === false) {
                    useFallbackContent();
                }
                function ngTranscludeCloneAttachFn(clone, transcludedScope) {
                    const nodes = normalizeNodes(clone);
                    if (hasRenderableContent(nodes)) {
                        const destroyScope = () => {
                            transcludedScope?.$destroy();
                        };
                        const lastNode = nodes[nodes.length - 1];
                        if (transcludedScope &&
                            "addEventListener" in lastNode &&
                            isFunction(lastNode.addEventListener.bind(lastNode))) {
                            lastNode.addEventListener("$destroy", destroyScope, {
                                once: true,
                            });
                        }
                        nodes.forEach((node) => {
                            $element.append(node);
                        });
                    }
                    else {
                        useFallbackContent();
                        transcludedScope?.$destroy();
                    }
                }
                function useFallbackContent() {
                    fallbackLinkFn($scope, ((clone) => {
                        normalizeNodes(clone).forEach((node) => {
                            $element.append(node);
                        });
                    }));
                }
                function normalizeNodes(node) {
                    if (!node) {
                        return [];
                    }
                    if (isInstanceOf(node, DocumentFragment)) {
                        return arrayFrom(node.childNodes);
                    }
                    return isInstanceOf(node, NodeList) || isArray(node)
                        ? arrayFrom(node)
                        : [node];
                }
                function hasRenderableContent(nodes) {
                    for (const currentNode of nodes) {
                        if (currentNode.nodeType !== NodeType._TEXT_NODE ||
                            currentNode.nodeValue?.trim()) {
                            return true;
                        }
                    }
                    return false;
                }
            }
            return ngTranscludePostLink;
        },
    };
}

export { ngTranscludeDirective };
