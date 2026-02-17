import { isArray, isFunction, isObject } from "../shared/utils.js";
import {
  applyAnimationClasses,
  applyAnimationStyles,
  prepareAnimationOptions,
} from "./shared.js";
import { $injectTokens, provider } from "../injection-tokens.js";
import { AnimateRunner } from "./runner/animate-runner.js";

AnimateJsProvider.$inject = provider([$injectTokens._animate]);

/**
 * @param {import("./animate.js").AnimateProvider} $animateProvider
 */
export function AnimateJsProvider($animateProvider) {
  this.$get = [
    $injectTokens._injector,
    /**
     * @param {ng.InjectorService} $injector
     * @returns {import("./interface.ts").AnimateJsFn}
     */
    ($injector) => {
      /**
       * @param {HTMLElement} element
       * @param {string} event
       * @param {string | string[] | null | undefined} classes
       * @param {ng.AnimationOptions | undefined} options
       * @returns {import("./interface.ts").Animator | undefined}
       */
      return function (element, event, classes, options) {
        // Optional arguments
        if (arguments.length === 3 && !isArray(classes) && isObject(classes)) {
          options = /** @type {ng.AnimationOptions} */ (classes);
          classes = null;
        }

        /** @type {ng.AnimationOptions} */
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
        let before;

        /**
         * @type {((done: () => void) => void) | undefined}
         */
        let after;

        if (animations.length) {
          let beforeFn, afterFn;

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
        let runner;

        return /** @type {import("./interface.ts").AnimateJsRunner} */ ({
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
            function finish(success) {
              if (finished) return;
              finished = true;
              close();
              runner.complete(success);
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
        });

        // ---- helpers ----
        /**
         * @param {string | string[]} classList
         */
        function lookupAnimations(classList) {
          const normalized = isArray(classList)
            ? classList
            : /** @type {string[]} */ (classList.split(" "));

          /** @type {Array<Record<string, any>>} */
          const matches = [];

          /** @type {Record<string, boolean>} */
          const flagMap = {};

          for (let i = 0; i < normalized.length; i++) {
            const klass = normalized[i];

            const animationFactory =
              $animateProvider._registeredAnimations[klass];

            if (animationFactory && !flagMap[klass]) {
              matches.push($injector.get(animationFactory));
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
          elementParam,
          optionsParam,
          animationsParam,
          fnName,
          classNames,
        ) {
          /** @type {Array<(done: () => void) => void>} */
          const operations = [];

          animationsParam.forEach((ani) => {
            const animationFn = ani[fnName];

            if (!animationFn) return;

            operations.push((done) => {
              if (isFunction(animationFn)) {
                /** @type {any[]} */
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
          return (done) => {
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
