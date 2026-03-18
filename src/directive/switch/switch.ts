import { $injectTokens } from "../../injection-tokens.ts";
import { domInsert } from "../../shared/dom.ts";
import { hasAnimate, values } from "../../shared/utils.ts";
import type { Attributes } from "../../core/compile/attributes.ts";

type NgSwitchBlock = {
  _clone: Node;
  _comment: Comment;
};

class NgSwitchController {
  _cases: Record<string, { transclude: ng.TranscludeFn; element: Element }[]>;

  constructor() {
    this._cases = {};
  }
}

ngSwitchDirective.$inject = [$injectTokens._animate];

/** Switches between transcluded case blocks and animates block entry/exit. */
export function ngSwitchDirective(
  $animate: ng.AnimateService,
): ng.Directive<NgSwitchController> {
  return {
    require: "ngSwitch",

    // asks for $scope to fool the BC controller module
    controller: NgSwitchController,
    link(
      scope: ng.Scope,
      _element: Element,
      attr: Attributes & Record<string, string>,
      ngSwitchController: NgSwitchController,
    ): void {
      const watchExpr = attr.ngSwitch || attr.on;

      let selectedTranscludes:
        | { transclude: ng.TranscludeFn; element: Element }[]
        | undefined = [];

      const selectedElements: NgSwitchBlock[] = [];

      const previousLeaveAnimations: ng.AnimateRunner[] = [];

      const selectedScopes: ng.Scope[] = [];

      const spliceFactory = function (array: unknown[], index: number) {
        return function (response: boolean) {
          if (response !== false) array.splice(index, 1);
        };
      };

      scope.$watch(watchExpr, (value: any) => {
        let i;

        let ii;

        let runner;

        // Start with the last, in case the array is modified during the loop
        while (previousLeaveAnimations.length) {
          $animate.cancel(previousLeaveAnimations.pop() as ng.AnimateRunner);
        }

        for (i = 0, ii = selectedScopes.length; i < ii; ++i) {
          const selected = selectedElements[i]._clone as HTMLElement;

          selectedScopes[i].$destroy();

          if (hasAnimate(selected)) {
            runner = previousLeaveAnimations[i] = $animate.leave(selected);

            runner.done(spliceFactory(previousLeaveAnimations, i));
          } else {
            selected.remove();
          }
        }

        selectedElements.length = 0;
        selectedScopes.length = 0;

        if (
          (selectedTranscludes =
            ngSwitchController._cases[`!${value}`] ||
            ngSwitchController._cases["?"])
        ) {
          values(selectedTranscludes).forEach(
            (selectedTransclude: {
              transclude: ng.TranscludeFn;
              element: Element;
            }) => {
              selectedTransclude.transclude(
                (caseElementParam, selectedScopeParam) => {
                  const caseElement = caseElementParam as HTMLElement;

                  const selectedScope = selectedScopeParam as ng.Scope;

                  selectedScopes.push(selectedScope);
                  const anchor = selectedTransclude.element;

                  const block = {
                    _clone: caseElement,
                    _comment: document.createComment(""),
                  };

                  selectedElements.push(block);

                  if (hasAnimate(caseElement)) {
                    const { parentElement } = anchor;

                    if (!parentElement) {
                      return;
                    }

                    if (runner) {
                      requestAnimationFrame(() => {
                        $animate.enter(caseElement, parentElement, anchor);
                      });
                    } else {
                      $animate.enter(caseElement, parentElement, anchor);
                    }
                  } else {
                    const { parentElement } = anchor;

                    if (!parentElement) {
                      return;
                    }

                    domInsert(caseElement, parentElement, anchor);
                  }
                },
              );
            },
          );
        }
      });
    },
  };
}

export function ngSwitchWhenDirective(): ng.Directive {
  return {
    transclude: "element",
    terminal: true,
    priority: 1200,
    require: "^ngSwitch",
    link(
      scope: ng.Scope,
      element: Element,
      attrs: Attributes & Record<string, string>,
      ctrl: NgSwitchController,
      $transclude?: ng.TranscludeFn,
    ): void {
      if (!$transclude) {
        return;
      }

      attrs.ngSwitchWhen
        .split(attrs.ngSwitchWhenSeparator)
        .sort()
        .filter(
          // Filter duplicate cases
          (elementParam: string, index: number, array: string[]) =>
            array[index - 1] !== elementParam,
        )
        .forEach((whenCase: string) => {
          ctrl._cases[`!${whenCase}`] = ctrl._cases[`!${whenCase}`] || [];
          ctrl._cases[`!${whenCase}`].push({
            transclude: $transclude,
            element,
          });
        });
    },
  };
}

export function ngSwitchDefaultDirective(): ng.Directive {
  return {
    transclude: "element",
    terminal: true,
    priority: 1200,
    require: "^ngSwitch",
    link(
      _scope: ng.Scope,
      element: Element,
      _attr: Attributes,
      ctrl: NgSwitchController,
      $transclude?: ng.TranscludeFn,
    ): void {
      if (!$transclude) {
        return;
      }

      ctrl._cases["?"] = ctrl._cases["?"] || [];
      ctrl._cases["?"].push({
        transclude: $transclude,
        element,
      });
    },
  };
}
