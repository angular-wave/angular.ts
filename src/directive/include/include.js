import { isDefined, hasAnimate } from "../../shared/utils.js";
import { $injectTokens as $t } from "../../injection-tokens.js";

ngIncludeDirective.$inject = [
  $t._templateRequest,
  $t._anchorScroll,
  $t._animate,
  $t._exceptionHandler,
];

/**
 *
 * @param {ng.TemplateRequestService} $templateRequest
 * @param {ng.AnchorScrollService} $anchorScroll
 * @param {ng.AnimateService} $animate
 * @param {ng.ExceptionHandlerService} $exceptionHandler
 * @returns {ng.Directive}
 */
export function ngIncludeDirective(
  $templateRequest,
  $anchorScroll,
  $animate,
  $exceptionHandler,
) {
  return {
    priority: 400,
    terminal: true,
    transclude: "element",
    controller: () => {
      /* empty */
    },
    compile(_element, attr) {
      const srcExp = attr.ngInclude || attr.src;

      const onloadExp = attr.onload || "";

      const autoScrollExp = attr.autoscroll;

      return (scope, $element, _$attr, ctrl, $transclude) => {
        function maybeScroll() {
          if (
            isDefined(autoScrollExp) &&
            (!autoScrollExp || scope.$eval(autoScrollExp))
          ) {
            $anchorScroll();
          }
        }

        let changeCounter = 0;

        let currentScope;

        let previousElement;

        let currentElement;

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
              $animate.leave(currentElement).done((response) => {
                if (response !== false) previousElement = null;
              });
            } else {
              currentElement.remove();
            }

            previousElement = currentElement;
            currentElement = null;
          }
        };

        scope.$watch(srcExp, async (src) => {
          const afterAnimation = function (response) {
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

                  if (hasAnimate(cloneParam)) {
                    $animate
                      .enter(cloneParam, null, $element)
                      .done(afterAnimation);
                  } else {
                    $element.after(cloneParam);
                    maybeScroll();
                  }
                });

                currentScope = newScope;
                currentElement = clone;
                currentScope.$emit("$includeContentLoaded", src);
                scope.$eval(onloadExp);
              })
              .catch((err) => {
                if (scope._destroyed) return;

                if (thisChangeId === changeCounter) {
                  cleanupLastIncludeContent();
                  scope.$emit("$includeContentError", src);
                }
                $exceptionHandler(new Error(err));
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
 * @param {ng.CompileService} $compile
 * @returns {ng.Directive}
 */
export function ngIncludeFillContentDirective($compile) {
  return {
    priority: -400,
    require: "ngInclude",
    link(scope, $element, _$attr, ctrl) {
      $element.innerHTML = ctrl.template;
      $compile($element.childNodes)(scope);
    },
  };
}
