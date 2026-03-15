import { minErr } from "../../shared/utils.ts";
import { emptyElement, startingTag } from "../../shared/dom.ts";
import { NodeType } from "../../shared/node.ts";
import { $injectTokens } from "../../injection-tokens.ts";
import type {
  CloneAttachFn,
  TranscludeFn,
  TranscludedNodes,
} from "../../core/compile/interface.ts";

const ngTranscludeMinErr = minErr("ngTransclude");

ngTranscludeDirective.$inject = [$injectTokens._compile];

export function ngTranscludeDirective($compile: ng.CompileService) {
  return {
    compile: function ngTranscludeCompile(tElement: Element) {
      const fallbackLinkFn = $compile(tElement.childNodes);

      emptyElement(tElement);

      function ngTranscludePostLink(
        $scope: ng.Scope,
        $element: Element,
        $attrs: ng.Attributes,
        _controller: unknown,
        $transclude?: TranscludeFn,
      ) {
        if (!$transclude) {
          throw ngTranscludeMinErr(
            "orphan",
            "Illegal use of ngTransclude directive in the template! " +
              "No parent directive that requires a transclusion found. " +
              "Element: {0}",
            startingTag($element),
          );
        }

        if ($attrs.ngTransclude === $attrs.$attr.ngTransclude) {
          $attrs.ngTransclude = "";
        }
        const slotName = $attrs.ngTransclude || $attrs.ngTranscludeSlot;

        $transclude(ngTranscludeCloneAttachFn, null, slotName);

        if (slotName && !$transclude.isSlotFilled?.(slotName)) {
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
              lastNode &&
              "addEventListener" in lastNode &&
              typeof lastNode.addEventListener === "function"
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
            normalizeNodes(clone).forEach((node) => $element.append(node));
          }) as CloneAttachFn);
        }

        function normalizeNodes(node?: TranscludedNodes): Node[] {
          if (!node) {
            return [];
          }

          return node instanceof NodeList || Array.isArray(node)
            ? Array.from(node)
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
