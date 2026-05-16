import { _attributes, _compile } from "../../injection-tokens.ts";
import {
  arrayFrom,
  isArray,
  isFunction,
  isInstanceOf,
  createErrorFactory,
} from "../../shared/utils.ts";
import { emptyElement, startingTag } from "../../shared/dom.ts";
import { NodeType } from "../../shared/node.ts";
import type {
  CloneAttachFn,
  TranscludeFn,
  TranscludedNodes,
} from "../../core/compile/compile.ts";

const ngTranscludeError = createErrorFactory("ngTransclude");

ngTranscludeDirective.$inject = [_compile, _attributes];

export function ngTranscludeDirective(
  $compile: ng.CompileService,
  $attributes: ng.AttributesService,
): ng.Directive {
  return {
    compile: function ngTranscludeCompile(tElement: Element) {
      const fallbackLinkFn = $compile(tElement.childNodes);

      emptyElement(tElement);

      function ngTranscludePostLink(
        $scope: ng.Scope,
        $element: Element,
        _attrs: ng.Attributes,
        _controller: unknown,
        $transclude?: TranscludeFn,
      ) {
        if (!$transclude) {
          throw ngTranscludeError(
            "orphan",
            "Illegal use of ngTransclude directive in the template! " +
              "No parent directive that requires a transclusion found. " +
              "Element: {0}",
            startingTag($element),
          );
        }

        let transcludeName = $attributes.read($element, "ngTransclude");

        const transcludeSlot = $attributes.read($element, "ngTranscludeSlot");

        if (
          transcludeName === $attributes.originalName($element, "ngTransclude")
        ) {
          transcludeName = "";
        }

        const slotNameValue =
          typeof transcludeName === "string" && transcludeName.length > 0
            ? transcludeName
            : transcludeSlot;

        const slotName =
          typeof slotNameValue === "string" ? slotNameValue : undefined;

        $transclude(ngTranscludeCloneAttachFn, null, slotName);

        if (slotName && $transclude.isSlotFilled?.(slotName) === false) {
          useFallbackContent();
        }

        function ngTranscludeCloneAttachFn(
          clone?: TranscludedNodes,
          transcludedScope?: ng.Scope | null,
        ) {
          const nodes = normalizeNodes(clone);

          if (hasRenderableContent(nodes)) {
            const destroyScope = () => {
              transcludedScope?.$destroy();
            };

            const lastNode = nodes[nodes.length - 1];

            if (
              transcludedScope &&
              "addEventListener" in lastNode &&
              isFunction(lastNode.addEventListener.bind(lastNode))
            ) {
              lastNode.addEventListener("$destroy", destroyScope, {
                once: true,
              });
            }

            nodes.forEach((node) => {
              $element.append(node);
            });
          } else {
            useFallbackContent();
            transcludedScope?.$destroy();
          }
        }

        function useFallbackContent() {
          fallbackLinkFn($scope, ((clone?: TranscludedNodes) => {
            normalizeNodes(clone).forEach((node) => {
              $element.append(node);
            });
          }) as CloneAttachFn);
        }

        function normalizeNodes(node?: TranscludedNodes): Node[] {
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

        function hasRenderableContent(nodes: Node[]) {
          for (const currentNode of nodes) {
            if (
              currentNode.nodeType !== NodeType._TEXT_NODE ||
              currentNode.nodeValue?.trim()
            ) {
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
