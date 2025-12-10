import { isArray, isFunction, isObject } from "../shared/utils.js";
import {
  applyAnimationClassesFactory,
  applyAnimationStyles,
  prepareAnimationOptions,
} from "./shared.js";
import { $injectTokens, provider } from "../injection-tokens.js";
import { AnimateRunner } from "./runner/animate-runner.js";

// TODO: use caching here to speed things up for detection
// TODO: add documentation

AnimateJsProvider.$inject = provider([$injectTokens._animate]);
/**
 * @param {ng.AnimateProvider} $animateProvider
 */
export function AnimateJsProvider($animateProvider) {
  this.$get = [
    $injectTokens._injector,
    /**
     *
     * @param {ng.InjectorService} $injector
     * @returns
     */
    function ($injector) {
      const applyAnimationClasses = applyAnimationClassesFactory();

      // $animateJs(element, 'enter');
      return function (element, event, classes, options) {
        let animationClosed = false;

        // the `classes` argument is optional and if it is not used
        // then the classes will be resolved from the element's className
        // property as well as options.addClass/options.removeClass.
        if (arguments.length === 3 && isObject(classes)) {
          options = classes;
          classes = null;
        }

        options = prepareAnimationOptions(options);

        if (!classes) {
          classes = element.getAttribute("class") || "";

          if (options.addClass) {
            classes += ` ${options.addClass}`;
          }

          if (options.removeClass) {
            classes += ` ${options.removeClass}`;
          }
        }

        const classesToAdd = options.addClass;

        const classesToRemove = options.removeClass;

        // the lookupAnimations function returns a series of animation objects that are
        // matched up with one or more of the CSS classes. These animation objects are
        // defined via the module.animation factory function. If nothing is detected then
        // we don't return anything which then makes $animation query the next driver.
        const animations = lookupAnimations(classes);

        let before;

        let after;

        if (animations.length) {
          let afterFn;

          let beforeFn;

          if (event === "leave") {
            beforeFn = "leave";
            afterFn = "afterLeave"; // TODO(matsko): get rid of this
          } else {
            beforeFn = `before${event.charAt(0).toUpperCase()}${event.substring(1)}`;
            afterFn = event;
          }

          if (event !== "enter" && event !== "move") {
            before = packageAnimations(
              element,
              event,
              options,
              animations,
              beforeFn,
            );
          }
          after = packageAnimations(
            element,
            event,
            options,
            animations,
            afterFn,
          );
        }

        // no matching animations
        if (!before && !after) return undefined;

        function applyOptions() {
          options.domOperation();
          applyAnimationClasses(element, options);
        }

        function close() {
          animationClosed = true;
          applyOptions();
          applyAnimationStyles(element, options);
        }

        let runner;

        return {
          $$willAnimate: true,
          end() {
            if (runner) {
              runner.end();
            } else {
              close();
              runner = new AnimateRunner();
              runner.complete(true);
            }

            return runner;
          },
          start() {
            if (runner) {
              return runner;
            }

            runner = new AnimateRunner();
            /** @type {(cancelled?: boolean) => void} */
            let closeActiveAnimations;

            const chain = [];

            if (before) {
              const runnerBefore = new AnimateRunner({
                end(fn) {
                  // call the before animation function, then mark runner done
                  const endFn =
                    before(fn) ||
                    (() => {
                      /* empty */
                    });

                  endFn();
                },
                cancel() {
                  (
                    before(true) ||
                    (() => {
                      /* empty */
                    })
                  )();
                },
              });

              chain.push(runnerBefore);
            }

            if (chain.length) {
              const runnerApplyOptions = new AnimateRunner({
                end(fn) {
                  applyOptions();
                  fn(true);
                },
                cancel() {
                  applyOptions();
                },
              });

              chain.push(runnerApplyOptions);
            } else {
              applyOptions();
            }

            if (after) {
              const runnerAfter = new AnimateRunner({
                end(fn) {
                  const endFn =
                    after(fn) ||
                    (() => {
                      /* empty */
                    });

                  endFn();
                },
                cancel() {
                  (
                    after(true) ||
                    (() => {
                      /* empty */
                    })
                  )();
                },
              });

              chain.push(runnerAfter);
            }

            // finally, set host for overall runner
            runner.setHost({
              end() {
                endAnimations();
              },
              cancel() {
                endAnimations(true);
              },
            });

            AnimateRunner._chain(chain, onComplete);

            return runner;

            function onComplete(success) {
              close();
              runner.complete(success);
            }

            function endAnimations(cancelled) {
              if (!animationClosed) {
                (
                  closeActiveAnimations ||
                  (() => {
                    /* empty */
                  })
                )(cancelled);
                onComplete(cancelled);
              }
            }
          },
        };

        function executeAnimationFn(
          fn,
          elemParam,
          eventParam,
          optionsParam,
          onDone,
        ) {
          let args;

          switch (eventParam) {
            case "animate":
              args = [elemParam, optionsParam.from, optionsParam.to, onDone];
              break;

            case "setClass":
              args = [elemParam, classesToAdd, classesToRemove, onDone];
              break;

            case "addClass":
              args = [elemParam, classesToAdd, onDone];
              break;

            case "removeClass":
              args = [elemParam, classesToRemove, onDone];
              break;

            default:
              args = [elemParam, onDone];
              break;
          }

          args.push(optionsParam);

          let value = fn.apply(fn, args);

          if (value) {
            if (isFunction(value.start)) {
              value = value.start();
            }

            if (value instanceof AnimateRunner) {
              value.done(onDone);
            } else if (isFunction(value)) {
              // optional onEnd / onCancel callback
              return value;
            }
          }

          return () => {
            /* empty */
          };
        }

        function groupEventedAnimations(
          elemParam,
          eventParam,
          optionsParam,
          animationsParam,
          fnName,
        ) {
          const operations = [];

          animationsParam.forEach((ani) => {
            const animation = ani[fnName];

            if (!animation) return;

            // note that all of these animations will run in parallel
            operations.push(() => {
              const newRunner = new AnimateRunner({
                end() {
                  onAnimationComplete();
                },
                cancel() {
                  onAnimationComplete(true);
                },
              });

              const endProgressCb = executeAnimationFn(
                animation,
                elemParam,
                eventParam,
                optionsParam,
                (result) => {
                  const cancelled = result === false;

                  onAnimationComplete(cancelled);
                },
              );

              let resolved = false;

              const onAnimationComplete = function (rejected) {
                if (!resolved) {
                  resolved = true;
                  (
                    endProgressCb ||
                    (() => {
                      /* empty */
                    })
                  )(rejected);
                  newRunner.complete(!rejected);
                }
              };

              return newRunner;
            });
          });

          return operations;
        }

        function packageAnimations(
          elementParam,
          eventParam,
          optionsParam,
          animationsParam,
          fnName,
        ) {
          let operations = groupEventedAnimations(
            elementParam,
            eventParam,
            optionsParam,
            animationsParam,
            fnName,
          );

          if (operations.length === 0) {
            let a;

            let b;

            if (fnName === "beforeSetClass") {
              a = groupEventedAnimations(
                elementParam,
                "removeClass",
                optionsParam,
                animationsParam,
                "beforeRemoveClass",
              );
              b = groupEventedAnimations(
                elementParam,
                "addClass",
                optionsParam,
                animationsParam,
                "beforeAddClass",
              );
            } else if (fnName === "setClass") {
              a = groupEventedAnimations(
                elementParam,
                "removeClass",
                optionsParam,
                animationsParam,
                "removeClass",
              );
              b = groupEventedAnimations(
                elementParam,
                "addClass",
                optionsParam,
                animationsParam,
                "addClass",
              );
            }

            if (a) {
              operations = operations.concat(a);
            }

            if (b) {
              operations = operations.concat(b);
            }
          }

          if (operations.length === 0) return undefined;

          // TODO(matsko): add documentation
          return function startAnimation(callback) {
            const runners = [];

            if (operations.length) {
              operations.forEach((animateFn) => {
                runners.push(animateFn());
              });
            }

            if (runners.length) {
              AnimateRunner._all(runners, callback);
            } else {
              callback();
            }

            return function endFn(reject) {
              runners.forEach((i) => {
                if (reject) {
                  i.cancel();
                } else {
                  i.end();
                }
              });
            };
          };
        }
      };

      function lookupAnimations(classes) {
        classes = isArray(classes) ? classes : classes.split(" ");
        const matches = [];

        const flagMap = {};

        for (let i = 0; i < classes.length; i++) {
          const klass = classes[i];

          const animationFactory =
            $animateProvider.$$registeredAnimations[klass];

          if (animationFactory && !flagMap[klass]) {
            matches.push($injector.get(animationFactory));
            flagMap[klass] = true;
          }
        }

        return matches;
      }
    },
  ];
}
