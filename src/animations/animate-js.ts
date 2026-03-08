import type {
  AnimationOptions,
  Animator,
  AnimateJsFn,
  AnimateJsRunner,
} from "./interface.ts";
import { isArray, isFunction, isObject } from "../shared/utils.ts";
import {
  applyAnimationClasses,
  applyAnimationStyles,
  prepareAnimationOptions,
} from "./shared.ts";
import { $injectTokens } from "../injection-tokens.ts";
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
 * @param {import("./animate.ts").AnimateProvider} $animateProvider
 */
export function AnimateJsProvider(
  this: { $get?: unknown },
  $animateProvider: AnimateProviderShape,
): void {
  this.$get = [
    $injectTokens._injector,
    /**
     * @param {ng.InjectorService} $injector
     * @returns {import("./interface.ts").AnimateJsFn}
     */
    ($injector: ng.InjectorService): AnimateJsFn => {
      /**
       * @param {HTMLElement} element
       * @param {string} event
       * @param {string | string[] | null | undefined} classes
       * @param {ng.AnimationOptions | undefined} options
       * @returns {import("./interface.ts").Animator | undefined}
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

        /**
         * @type {((done: () => void) => void) | undefined}
         */
        let before: JsAnimationOperation | undefined;

        /**
         * @type {((done: () => void) => void) | undefined}
         */
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

        /** @type {ng.AnimateRunner} */
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
             * @param {boolean | undefined} success
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
         * @param {string | string[]} classList
         */
        function lookupAnimations(
          classList: string | string[],
        ): JsAnimationHandlerMap[] {
          const normalized = isArray(classList)
            ? classList
            : classList.split(" ");

          const matches: JsAnimationHandlerMap[] = [];

          /** @type {Record<string, boolean>} */
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
         * @param {HTMLElement} elementParam
         * @param {ng.AnimationOptions} optionsParam
         * @param {Array<Record<string, any>>} animationsParam
         * @param {string} fnName
         * @param {{ add?: string; remove?: string; }} classNames
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
           * @param {() => void} done
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
