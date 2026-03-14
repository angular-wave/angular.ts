import { $injectTokens } from "../../injection-tokens.js";
import { domInsert } from "../../shared/dom.js";
import { hasAnimate, values } from "../../shared/utils.js";

/**
 * @typedef {object} NgSwitchBlock
 * @property {Node} _clone
 * @property {Comment} _comment
 */

class NgSwitchController {
  constructor() {
    /** @type {Record<string, { transclude: ng.TranscludeFn; element: Element;}[]>} */
    this._cases = {};
  }
}

ngSwitchDirective.$inject = [$injectTokens._animate];

/**
 * @param {ng.AnimateService} $animate
 * @returns {ng.Directive<NgSwitchController>}
 */
export function ngSwitchDirective($animate) {
  return {
    require: "ngSwitch",

    // asks for $scope to fool the BC controller module
    controller: NgSwitchController,
    link(scope, _element, attr, ngSwitchController) {
      const watchExpr = attr.ngSwitch || attr.on;

      let selectedTranscludes = [];

      /**
       * @type {NgSwitchBlock[]}
       */
      const selectedElements = [];

      /**
       * @type {ng.AnimateRunner[]}
       */
      const previousLeaveAnimations = [];

      /**
       * @type {any[]}
       */
      const selectedScopes = [];

      const spliceFactory = function (
        /** @type {any[]} */ array,
        /** @type {number} */ index,
      ) {
        return function (/** @type {boolean} */ response) {
          if (response !== false) array.splice(index, 1);
        };
      };

      scope.$watch(watchExpr, (value) => {
        let i;

        let ii;

        let runner;

        // Start with the last, in case the array is modified during the loop
        while (previousLeaveAnimations.length) {
          $animate.cancel(
            /** @type {import("../../docs.js").AnimateRunner} */ (
              previousLeaveAnimations.pop()
            ),
          );
        }

        for (i = 0, ii = selectedScopes.length; i < ii; ++i) {
          const selected = selectedElements[i]._clone;

          selectedScopes[i].$destroy();

          if (hasAnimate(selected)) {
            runner = previousLeaveAnimations[i] = $animate.leave(
              /** @type {HTMLElement} */ (selected),
            );

            runner.done(spliceFactory(previousLeaveAnimations, i));
          } else {
            /** @type {HTMLElement} */ (selected).remove();
          }
        }

        selectedElements.length = 0;
        selectedScopes.length = 0;

        if (
          (selectedTranscludes =
            ngSwitchController._cases[`!${value}`] ||
            ngSwitchController._cases["?"])
        ) {
          values(selectedTranscludes).forEach((selectedTransclude) => {
            selectedTransclude.transclude(
              (
                /** @type{HTMLElement} */ caseElement,
                /** @type {ng.Scope} */ selectedScope,
              ) => {
                selectedScopes.push(selectedScope);
                const anchor = selectedTransclude.element;

                /** @type {NgSwitchBlock} */
                const block = {
                  _clone: /** @type {Node} */ (caseElement),
                  _comment: document.createComment(""),
                };

                selectedElements.push(block);

                if (hasAnimate(/** @type {Node} */ (caseElement))) {
                  if (runner) {
                    requestAnimationFrame(() => {
                      $animate.enter(
                        /** @type {HTMLElement} */ (caseElement),
                        anchor.parentElement,
                        anchor,
                      );
                    });
                  } else {
                    $animate.enter(
                      /** @type {HTMLElement} */ (caseElement),
                      anchor.parentElement,
                      anchor,
                    );
                  }
                } else {
                  domInsert(
                    /** @type {HTMLElement} */ (caseElement),
                    /** @type {HTMLElement} */ (anchor.parentElement),
                    anchor,
                  );
                }
              },
            );
          });
        }
      });
    },
  };
}

/**
 * @returns {ng.Directive<NgSwitchController>}
 */
export function ngSwitchWhenDirective() {
  return {
    transclude: "element",
    terminal: true,
    priority: 1200,
    require: "^ngSwitch",
    link(scope, element, attrs, ctrl, $transclude) {
      attrs.ngSwitchWhen
        .split(attrs.ngSwitchWhenSeparator)
        .sort()
        .filter(
          // Filter duplicate cases
          (elementParam, index, array) => array[index - 1] !== elementParam,
        )
        .forEach((whenCase) => {
          ctrl._cases[`!${whenCase}`] = ctrl._cases[`!${whenCase}`] || [];
          ctrl._cases[`!${whenCase}`].push({
            transclude: /** @type {ng.TranscludeFn} */ ($transclude),
            element,
          });
        });
    },
  };
}

/**
 * @returns {ng.Directive<NgSwitchController>}
 */
export function ngSwitchDefaultDirective() {
  return {
    transclude: "element",
    terminal: true,
    priority: 1200,
    require: "^ngSwitch",
    link(_scope, element, _attr, ctrl, $transclude) {
      ctrl._cases["?"] = ctrl._cases["?"] || [];
      ctrl._cases["?"].push({
        transclude: /** @type {ng.TranscludeFn} */ ($transclude),
        element,
      });
    },
  };
}
