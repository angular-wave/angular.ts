import { isDefined, hasAnimate } from "../../shared/utils.ts";
import { $injectTokens as $t } from "../../injection-tokens.ts";
import type { Attributes } from "../../core/compile/attributes.ts";

ngIncludeDirective.$inject = [
  $t._templateRequest,
  $t._anchorScroll,
  $t._animate,
  $t._exceptionHandler,
];

/**
 * Loads external template content, transcludes it, and swaps it into the DOM.
 */
export function ngIncludeDirective(
  $templateRequest: ng.TemplateRequestService,
  $anchorScroll: ng.AnchorScrollService,
  $animate: ng.AnimateService,
  $exceptionHandler: ng.ExceptionHandlerService,
): ng.Directive {
  return {
    priority: 400,
    terminal: true,
    transclude: "element",
    controller: () => {
      /* empty */
    },
    compile(_element: Element, attr: Attributes & Record<string, string>) {
      const srcExp = attr.ngInclude || attr.src;

      const onloadExp = attr.onload || "";

      const autoScrollExp = attr.autoscroll;

      return (
        scope: ng.Scope & Record<string, any>,
        $element: Element,
        _$attr: Attributes,
        ctrl: { template: string | null },
        $transclude?: ng.TranscludeFn,
      ): void => {
        if (!$transclude) {
          return;
        }

        function maybeScroll() {
          if (
            isDefined(autoScrollExp) &&
            (!autoScrollExp || scope.$eval(autoScrollExp))
          ) {
            $anchorScroll();
          }
        }

        let changeCounter = 0;

        let currentScope: ng.Scope | null;

        let previousElement: HTMLElement | null;

        let currentElement: HTMLElement | null;

        const cleanupLastIncludeContent = () => {
          if (previousElement) {
            previousElement.remove();
            previousElement = null;
          }

          if (currentScope) {
            currentScope.$destroy();
            currentScope = null;
          }

          if (currentElement) {
            if (hasAnimate(currentElement)) {
              $animate.leave(currentElement).done((response: boolean) => {
                if (response !== false) previousElement = null;
              });
            } else {
              currentElement.remove();
            }

            previousElement = currentElement;
            currentElement = null;
          }
        };

        scope.$watch(srcExp, async (src: string | null | undefined) => {
          const afterAnimation = function (response: boolean) {
            response !== false && maybeScroll();
          };

          const thisChangeId = ++changeCounter;

          if (src) {
            scope.$emit("$includeContentRequested", src);
            $templateRequest(src)
              .then((response) => {
                if (scope._destroyed) return;

                if (thisChangeId !== changeCounter) return;
                const newScope = scope.$new();

                ctrl.template = response;

                // Note: This will also link all children of ng-include that were contained in the original
                // html. If that content contains controllers, ... they could pollute/change the scope.
                // However, using ng-include on an element with additional content does not make sense...
                // Note: We can't remove them in the cloneAttchFn of $transclude as that
                // function is called before linking the content, which would apply child
                // directives to non existing elements.
                const clone = $transclude(newScope, (cloneParam) => {
                  cleanupLastIncludeContent();

                  if (hasAnimate(cloneParam as HTMLElement)) {
                    $animate
                      .enter(cloneParam as HTMLElement, null, $element)
                      .done(afterAnimation);
                  } else {
                    $element.after(cloneParam as HTMLElement);
                    maybeScroll();
                  }
                }) as HTMLElement;

                currentScope = newScope;
                currentElement = clone;
                currentScope!.$emit("$includeContentLoaded", src);
                scope.$eval(onloadExp);
              })
              .catch((err: unknown) => {
                if (scope._destroyed) return;

                if (thisChangeId === changeCounter) {
                  cleanupLastIncludeContent();
                  scope.$emit("$includeContentError", src);
                }
                $exceptionHandler(
                  err instanceof Error ? err : new Error(String(err)),
                );
              });
          } else {
            cleanupLastIncludeContent();
            ctrl.template = null;
          }
        });
      };
    },
  };
}

// This directive is called during the $transclude call of the first `ngInclude` directive.
// It will replace and compile the content of the element with the loaded template.
// We need this directive so that the element content is already filled when
// the link function of another directive on the same element as ngInclude
// is called.
ngIncludeFillContentDirective.$inject = [$t._compile];

/**
 * Fills the `ngInclude` element with the resolved template content and compiles it.
 */
export function ngIncludeFillContentDirective(
  $compile: ng.CompileService,
): ng.Directive {
  return {
    priority: -400,
    require: "ngInclude",
    link(
      scope: ng.Scope,
      $element: HTMLElement,
      _$attr: Attributes,
      ctrl: { template: string | null },
    ): void {
      $element.innerHTML = ctrl.template || "";
      $compile($element.childNodes)(scope);
    },
  };
}
