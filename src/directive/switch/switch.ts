import { _injector } from "../../injection-tokens.ts";
import {
  createLazyAnimate,
  getAnimateForNode,
} from "../../animations/lazy-animate.ts";
import {
  domInsert,
  getNormalizedAttr,
  removeElement,
} from "../../shared/dom.ts";
import { assertDefined, values } from "../../shared/utils.ts";
import type { DirectiveAttributes } from "../../interface.ts";

interface NgSwitchBlock {
  /** @internal */
  _clone: Node;
  /** @internal */
  _comment: Comment;
}

class NgSwitchController {
  /** @internal */
  _cases: Partial<
    Record<string, { transclude: ng.TranscludeFn; element: Element }[]>
  >;

  constructor() {
    this._cases = {};
  }
}

ngSwitchDirective.$inject = [_injector];

function fallbackWhenEmpty(
  value: string | null | undefined,
  fallback: string,
): string {
  if (value) return value;

  return fallback;
}

/** Switches between transcluded case blocks and animates block entry/exit. */
export function ngSwitchDirective(
  $injector: ng.InjectorService,
): ng.Directive<NgSwitchController> {
  const getAnimate = createLazyAnimate($injector);

  return {
    require: "ngSwitch",

    // asks for $scope to fool the BC controller module
    controller: NgSwitchController,
    link(
      scope: ng.Scope,
      element: Element,
      ngSwitchController: NgSwitchController,
    ): void {
      const ngSwitchExpr = getNormalizedAttr(element, "ngSwitch");

      const watchExpr = fallbackWhenEmpty(
        ngSwitchExpr,
        getNormalizedAttr(element, "on") ?? "",
      );

      let selectedTranscludes:
        | { transclude: ng.TranscludeFn; element: Element }[]
        | undefined;

      const selectedElements: NgSwitchBlock[] = [];

      interface LeaveAnimation {
        element: Element;
        handle: ng.AnimationHandle;
      }

      const previousLeaveAnimations = new Set<LeaveAnimation>();

      const selectedScopes: ng.Scope[] = [];

      scope.$watch(watchExpr, (value: unknown) => {
        let i;

        let ii;

        let hasLeaveAnimation = false;

        // Start with the last, in case the array is modified during the loop
        const animate = previousLeaveAnimations.size ? getAnimate() : undefined;

        for (const previous of Array.from(previousLeaveAnimations)) {
          previousLeaveAnimations.delete(previous);
          animate?.cancel(previous.handle);
          removeElement(previous.element);
        }

        for (i = 0, ii = selectedScopes.length; i < ii; ++i) {
          const selected = selectedElements[i]._clone as HTMLElement;

          selectedScopes[i].$destroy();

          const leaveAnimate = getAnimateForNode(getAnimate, selected);

          if (leaveAnimate) {
            const handle = leaveAnimate.leave(selected);

            const leaveAnimation = {
              element: selected,
              handle,
            };

            hasLeaveAnimation = true;
            previousLeaveAnimations.add(leaveAnimation);

            handle.done((response) => {
              if (response) {
                previousLeaveAnimations.delete(leaveAnimation);
              }
            });
          } else {
            removeElement(selected);
          }
        }

        selectedElements.length = 0;
        selectedScopes.length = 0;

        if (
          (selectedTranscludes =
            ngSwitchController._cases[`!${String(value)}`] ??
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

                  const selectedScope = assertDefined(selectedScopeParam);

                  selectedScopes.push(selectedScope);
                  const anchor = selectedTransclude.element;

                  const block = {
                    _clone: caseElement,
                    _comment: document.createComment(""),
                  };

                  selectedElements.push(block);

                  const enterAnimate = getAnimateForNode(
                    getAnimate,
                    caseElement,
                  );

                  if (enterAnimate) {
                    const { parentElement } = anchor;

                    if (!parentElement) {
                      return;
                    }

                    if (hasLeaveAnimation) {
                      requestAnimationFrame(() => {
                        enterAnimate.enter(caseElement, parentElement, anchor);
                      });
                    } else {
                      enterAnimate.enter(caseElement, parentElement, anchor);
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
    compile(tElement: Element, tAttrs: DirectiveAttributes) {
      const when =
        getNormalizedAttr(tElement, "ngSwitchWhen") ??
        (tAttrs.ngSwitchWhen as string | undefined) ??
        "";

      const separator =
        getNormalizedAttr(tElement, "ngSwitchWhenSeparator") ??
        (tAttrs.ngSwitchWhenSeparator as string | undefined);

      return function ngSwitchWhenLink(
        _scope: ng.Scope,
        element: Element,
        ctrl: NgSwitchController,
        $transclude?: ng.TranscludeFn,
      ): void {
        if (!$transclude) {
          return;
        }

        (separator !== undefined ? when.split(separator) : [when])
          .sort()
          .filter(
            // Filter duplicate cases
            (elementParam: string, index: number, array: string[]) =>
              array[index - 1] !== elementParam,
          )
          .forEach((whenCase: string) => {
            (ctrl._cases[`!${whenCase}`] ??= []).push({
              transclude: $transclude,
              element,
            });
          });
      };
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
      ctrl: NgSwitchController,
      $transclude?: ng.TranscludeFn,
    ): void {
      if (!$transclude) {
        return;
      }

      (ctrl._cases["?"] ??= []).push({
        transclude: $transclude,
        element,
      });
    },
  };
}
