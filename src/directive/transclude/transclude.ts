// @ts-nocheck

import { minErr } from "../../shared/utils.js";
import { emptyElement, startingTag } from "../../shared/dom.js";
import { NodeType } from "../../shared/node.ts";
import { $injectTokens } from "../../injection-tokens.js";

const ngTranscludeMinErr = minErr("ngTransclude");

ngTranscludeDirective.$inject = [$injectTokens._compile];

export function ngTranscludeDirective($compile) {
  return {
    compile: function ngTranscludeCompile(tElement) {
      const fallbackLinkFn = $compile(tElement.childNodes);

      emptyElement(tElement);

      function ngTranscludePostLink(
        $scope,
        $element,
        $attrs,
        _controller,
        $transclude,
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

        if (slotName && !$transclude.isSlotFilled(slotName)) {
          useFallbackContent();
        }

        function ngTranscludeCloneAttachFn(clone, transcludedScope) {
          if (notWhitespace(clone)) {
            if (clone instanceof NodeList) {
              Array.from(clone).forEach((el) => {
                $element.append(el);
              });
            } else {
              $element.append(clone);
            }
          } else {
            useFallbackContent();
            transcludedScope.$destroy();
          }
        }

        function useFallbackContent() {
          fallbackLinkFn($scope, (clone) => {
            $element.append(clone);
          });
        }

        function notWhitespace(node) {
          if (node instanceof Array) {
            return false;
          } else if (
            node.nodeType !== NodeType._TEXT_NODE ||
            node.nodeValue.trim()
          ) {
            return true;
          }

          return false;
        }
      }

      return ngTranscludePostLink;
    },
  };
}
