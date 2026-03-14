import type { AnimationOptions, Animator } from "./interface.ts";
import { isArray, isFunction, isObject } from "../shared/utils.js";
import {
  applyAnimationClasses,
  applyAnimationStyles,
  prepareAnimationOptions,
} from "./shared.ts";
import { $injectTokens } from "../injection-tokens.js";
import { AnimateRunner } from "./runner/animate-runner.ts";

AnimateJsProvider.$inject = [$injectTokens._animateProvider];

type JsAnimationOperation = (done: () => void) => void;

interface AnimateProviderShape {
  _registeredAnimations: Record<string, string>;
}

interface JsAnimationHandlerMap {
  [key: string]: ((...args: any[]) => unknown) | undefined;
}

/**
 * Signature for a JavaScript animation factory function.
 *
 * Given an element + event (+ optional classes/options), returns an {@link Animator}
 * handle when it intends to animate, or `undefined` when it cannot handle the request.
 */
export interface AnimateJsFn {
  (
    element: HTMLElement,
    event: string,
    classes?: string | null,
    options?: AnimationOptions,
  ): Animator | undefined;
}

/**
 * Driver return type for JS-based animations.
 *
 * Some JS drivers expose a "runner-like" object with explicit `start()` and
 * `end()` methods that return an {@link AnimateRunner}.
 */
export interface AnimateJsRunner {
  _willAnimate: true;
  start: () => AnimateRunner;
  end: () => AnimateRunner;
}

/**
 * Registers the JavaScript animation driver with the animation provider.
 */
export function AnimateJsProvider(
  this: { $get?: unknown },
  $animateProvider: AnimateProviderShape,
): void {
  this.$get = [
    $injectTokens._injector,
    /**
     * Creates the runtime JavaScript animation driver.
     */
    ($injector: ng.InjectorService): AnimateJsFn => {
      /**
       * Dispatches one animation request to the matching JS animation handlers.
       */
      return function (
        element: HTMLElement,
        event: string,
        classes?: string | string[] | null,
        options?: AnimationOptions,
      ): Animator | undefined {
        // Optional arguments
        if (arguments.length === 3 && !isArray(classes) && isObject(classes)) {
          options = classes as AnimationOptions;
          classes = null;
        }

        const animationOptions = prepareAnimationOptions(options);

        if (!classes) {
          classes = element.getAttribute("class") || "";

          if (animationOptions.addClass)
            classes += ` ${animationOptions.addClass}`;

          if (animationOptions.removeClass)
            classes += ` ${animationOptions.removeClass}`;
        }

        const classesToAdd = animationOptions.addClass;

        const classesToRemove = animationOptions.removeClass;

        // Lookup animation objects
        const animations = lookupAnimations(classes);

        let before: JsAnimationOperation | undefined;

        let after: JsAnimationOperation | undefined;

        if (animations.length) {
          let beforeFn: string;
          let afterFn: string;

          if (event === "leave") {
            beforeFn = "leave";
            afterFn = "afterLeave";
          } else {
            beforeFn = `before${event.charAt(0).toUpperCase()}${event.substring(1)}`;
            afterFn = event;
          }

          if (event !== "enter" && event !== "move") {
            before = packageAnimations(
              element,
              animationOptions,
              animations,
              beforeFn,
              {
                add: classesToAdd,
                remove: classesToRemove,
              },
            );
          }
          after = packageAnimations(
            element,
            animationOptions,
            animations,
            afterFn,
            {
              add: classesToAdd,
              remove: classesToRemove,
            },
          );
        }

        if (!before && !after) return undefined;

        function applyOptions() {
          animationOptions.domOperation?.();
          applyAnimationClasses(element, animationOptions);
        }

        function close() {
          applyOptions();
          applyAnimationStyles(element, animationOptions);
        }

        let runner: AnimateRunner | undefined;

        const animateJsRunner: AnimateJsRunner = {
          _willAnimate: true,

          start() {
            if (runner) return runner;

            runner = new AnimateRunner({
              end: () => finish(true),
              cancel: () => finish(false),
            });

            let finished = false;

            let remaining = (before ? 1 : 0) + (after ? 1 : 0);

            function partDone() {
              if (finished) return;

              if (--remaining === 0) finish(true);
            }

            /**
             * Finalizes the runner and applies any deferred DOM changes.
             */
            function finish(success?: boolean) {
              if (finished) return;
              finished = true;
              close();
              runner!.complete(success);
            }

            // Run before animations
            if (before) before(partDone);
            else applyOptions();

            // Run after animations
            if (after) after(partDone);

            // If neither before nor after exist, nothing will call partDone()
            if (remaining === 0) finish(true);

            return runner;
          },

          end() {
            if (runner) runner.end();
            else {
              close();
              runner = new AnimateRunner();
              runner.complete(true);
            }

            return runner;
          },
        };

        return animateJsRunner;

        // ---- helpers ----
        /**
         * Looks up registered JS animation handlers for a class list.
         */
        function lookupAnimations(
          classList: string | string[],
        ): JsAnimationHandlerMap[] {
          const normalized = isArray(classList)
            ? classList
            : classList.split(" ");

          const matches: JsAnimationHandlerMap[] = [];

          const flagMap: Record<string, boolean> = {};

          for (let i = 0; i < normalized.length; i++) {
            const klass = normalized[i];

            const animationFactory =
              $animateProvider._registeredAnimations[klass];

            if (animationFactory && !flagMap[klass]) {
              matches.push(
                $injector.get(animationFactory) as JsAnimationHandlerMap,
              );
              flagMap[klass] = true;
            }
          }

          return matches;
        }

        /**
         * Packages one phase of matching animation handlers into a runnable operation.
         */
        function packageAnimations(
          elementParam: HTMLElement,
          optionsParam: AnimationOptions,
          animationsParam: JsAnimationHandlerMap[],
          fnName: string,
          classNames: { add?: string; remove?: string },
        ): JsAnimationOperation | undefined {
          const operations: JsAnimationOperation[] = [];

          animationsParam.forEach((ani: JsAnimationHandlerMap) => {
            const animationFn = ani[fnName];

            if (!animationFn) return;

            operations.push((done: () => void) => {
              if (isFunction(animationFn)) {
                let args;

                switch (fnName) {
                  case "addClass":
                    args = [elementParam, classNames.add, done];
                    break;
                  case "removeClass":
                    args = [elementParam, classNames.remove, done];
                    break;
                  case "setClass":
                    args = [
                      elementParam,
                      classNames.add,
                      classNames.remove,
                      done,
                    ];
                    break;
                  case "animate":
                    args = [
                      elementParam,
                      optionsParam.from,
                      optionsParam.to,
                      done,
                    ];
                    break;
                  default:
                    args = [elementParam, done];
                }

                const value = animationFn.apply(ani, args);

                if (value instanceof AnimateRunner) value.done(done);
              } else done();
            });
          });

          if (!operations.length) return undefined;

          /**
           * Runs all packaged operations and signals completion once all are done.
           */
          return (done: () => void) => {
            let completed = 0;

            const total = operations.length;

            operations.forEach((op) => {
              op(() => {
                if (++completed === total && isFunction(done)) done();
              });
            });
          };
        }
      };
    },
  ];
}