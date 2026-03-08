// @ts-nocheck
import { minErr } from "../../shared/utils.js";
import { emptyElement, startingTag } from "../../shared/dom.ts";
import { NodeType } from "../../shared/node.ts";
import { $injectTokens } from "../../injection-tokens.ts";

/**
 * Directive that marks the insertion point for the transcluded DOM of the nearest parent directive that uses transclusion.
 *
 * You can specify that you want to insert a named transclusion slot, instead of the default slot, by providing the slot name
 * as the value of the `ng-transclude` or `ng-transclude-slot` attribute.
 *
 * If the transcluded content is not empty (i.e. contains one or more DOM nodes, including whitespace text nodes), any existing
 * content of this element will be removed before the transcluded content is inserted.
 * If the transcluded content is empty (or only whitespace), the existing content is left intact. This lets you provide fallback
 * content in the case that no transcluded content is provided.
 *
 * @element ANY
 *
 * @param {string} ngTransclude|ngTranscludeSlot the name of the slot to insert at this point. If this is not provided, is empty
 *                                               or its value is the same as the name of the attribute then the default slot is used.
 */
const ngTranscludeMinErr = minErr("ngTransclude");

ngTranscludeDirective.$inject = [$injectTokens._compile];
export function ngTranscludeDirective(
  $compile: ng.CompileService,
): ng.Directive {
  return {
    compile: function ngTranscludeCompile(tElement: Element) {
      // Remove and cache any original content to act as a fallback
      const fallbackLinkFn = $compile(tElement.childNodes);

      emptyElement(tElement);

      /**
       *
       * @param {ng.Scope} $scope
       * @param {Element} $element
       * @param {ng.Attributes} $attrs
       * @param {*} _controller
       * @param {*} $transclude
       */
      function ngTranscludePostLink(
        $scope: ng.Scope,
        $element: Element,
        $attrs: import("../../core/compile/attributes.ts").Attributes &
          Record<string, string>,
        _controller,
        $transclude?: ng.TranscludeFn,
      ): void {
        if (!$transclude) {
          throw ngTranscludeMinErr(
            "orphan",
            "Illegal use of ngTransclude directive in the template! " +
              "No parent directive that requires a transclusion found. " +
              "Element: {0}",
            startingTag($element),
          );
        }

        // If the attribute is of the form: `ng-transclude="ng-transclude"` then treat it like the default
        if ($attrs.ngTransclude === $attrs.$attr.ngTransclude) {
          $attrs.ngTransclude = "";
        }
        const slotName = $attrs.ngTransclude || $attrs.ngTranscludeSlot;

        // If the slot is required and no transclusion content is provided then this call will throw an error
        $transclude(ngTranscludeCloneAttachFn, null, slotName);

        // If the slot is optional and no transclusion content is provided then use the fallback content
        if (slotName && !$transclude.isSlotFilled(slotName)) {
          useFallbackContent();
        }

        /**
         * @param {NodeList | Node} clone
         * @param {ng.Scope} transcludedScope
         */
        function ngTranscludeCloneAttachFn(
          clone,
          transcludedScope: ng.Scope,
        ): void {
          if (notWhitespace(clone)) {
            if (clone instanceof NodeList) {
              Array.from(clone).forEach((el) => {
                $element.append(el);
              });
            } else {
              $element.append(/** @type {Node} */ clone);
            }
          } else {
            useFallbackContent();
            // There is nothing linked against the transcluded scope since no content was available,
            // so it should be safe to clean up the generated scope.
            transcludedScope.$destroy();
          }
        }

        function useFallbackContent() {
          // Since this is the fallback content rather than the transcluded content,
          // we link against the scope of this directive rather than the transcluded scope
          fallbackLinkFn($scope, (clone) => {
            $element.append(clone as Node);
          });
        }

        /**
         * @param {Node | NodeList} node
         */
        function notWhitespace(node: Node | NodeList): boolean {
          if (node instanceof Array) {
            return false;
          } else if (
            /** @type {Node} */ node.nodeType !== NodeType._TEXT_NODE ||
            /** @type {String} */ node/** @type {Node} */ .nodeValue
              .trim()
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
