import { isArray, isFunction, isObject } from "../shared/utils.js";
import {
  applyAnimationClassesFactory,
  applyAnimationStyles,
  prepareAnimationOptions,
} from "./shared.js";
import { $injectTokens, provider } from "../injection-tokens.js";
import { AnimateRunner } from "./runner/animate-runner.js";

AnimateJsProvider.$inject = provider([$injectTokens._animate]);

export function AnimateJsProvider($animateProvider) {
  this.$get = [
    $injectTokens._injector,
    /**
     * @param {ng.InjectorService} $injector
     * @returns {import("./interface.ts").AnimateJsFn}
     */
    ($injector) => {
      const applyAnimationClasses = applyAnimationClassesFactory();

      /**
       *
       */
      return function animateJs(element, event, classes, options) {
        // Optional arguments
        if (arguments.length === 3 && isObject(classes)) {
          options = /** @type {Object} */ (classes);
          classes = null;
        }

        options = prepareAnimationOptions(options);

        if (!classes) {
          classes = element.getAttribute("class") || "";

          if (options.addClass) classes += ` ${options.addClass}`;

          if (options.removeClass) classes += ` ${options.removeClass}`;
        }

        const classesToAdd = options.addClass;

        const classesToRemove = options.removeClass;

        // Lookup animation objects
        const animations = lookupAnimations(classes);

        let before, after;

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
            before = packageAnimations(element, options, animations, beforeFn, {
              add: classesToAdd,
              remove: classesToRemove,
            });
          }
          after = packageAnimations(element, options, animations, afterFn, {
            add: classesToAdd,
            remove: classesToRemove,
          });
        }

        if (!before && !after) return undefined;

        function applyOptions() {
          options.domOperation();
          applyAnimationClasses(element, options);
        }

        function close() {
          applyOptions();
          applyAnimationStyles(element, options);
        }

        let runner;

        return {
          _willAnimate: true,

          start() {
            if (runner) return runner;

            runner = new AnimateRunner({
              end: () => onComplete(true),
              cancel: () => onComplete(false),
            });

            // Run before animations
            if (before) before(runner.done.bind(runner));
            else applyOptions();

            // Run after animations
            if (after) after(runner.done.bind(runner));

            function onComplete(success) {
              close();
              runner.complete(success);
            }

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

        // ---- helpers ----
        function lookupAnimations(classList) {
          classList = isArray(classList) ? classList : classList.split(" ");
          const matches = [];

          const flagMap = {};

          for (let i = 0; i < classList.length; i++) {
            const klass = classList[i];

            const animationFactory =
              $animateProvider._registeredAnimations[klass];

            if (animationFactory && !flagMap[klass]) {
              matches.push($injector.get(animationFactory));
              flagMap[klass] = true;
            }
          }

          return matches;
        }

        function packageAnimations(
          elementParam,
          optionsParam,
          animationsParam,
          fnName,
          classNames,
        ) {
          const operations = [];

          animationsParam.forEach((ani) => {
            const animationFn = ani[fnName];

            if (!animationFn) return;

            operations.push((done) => {
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
