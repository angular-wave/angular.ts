import {
  deleteCacheData,
  getCacheData,
  removeElementData,
  setCacheData,
} from "../shared/dom.js";
import { mergeClasses, values } from "../shared/utils.js";
import {
  NG_ANIMATE_CLASSNAME,
  PREPARE_CLASS_SUFFIX,
  applyAnimationClasses,
  applyAnimationStyles,
  prepareAnimationOptions,
} from "./shared.js";
import { $injectTokens as $t } from "../injection-tokens.js";
import { AnimateRunner } from "./runner/animate-runner.js";
import { animateCache } from "./cache/animate-cache.js";
import { rafScheduler } from "./raf/raf-scheduler.js";

/** @typedef {import("./interface.ts").SortedAnimationEntry} SortedAnimationEntry */
/** @typedef {import("./interface.ts").AnimationOptions} AnimationOptions */
/** @typedef {import("./interface.ts").AnimationDetails} AnimationDetails */
/** @typedef {import("./interface.ts").AnimationEntry} AnimationEntry */
/** @typedef {import("./interface.ts").AnchorRef} AnchorRef */
/** @typedef {import("./interface.ts").AnchorRefEntry} AnchorRefEntry */

const RUNNER_STORAGE_KEY = "$$animationRunner";

const PREPARE_CLASSES_KEY = "$$animatePrepareClasses";

export class AnimationProvider {
  /**
   * @type {string[]}
   */
  _drivers = [];

  constructor() {
    this.$get = [
      $t._rootScope,
      $t._injector,
      /**
       * @param {ng.RootScopeService} $rootScope
       * @param {ng.InjectorService} $injector
       * @return {import("./interface.ts").AnimationService}
       */
      ($rootScope, $injector) => {
        return this.#createAnimationService(
          $rootScope,
          $injector,
          this._drivers,
        );
      },
    ];
  }

  /**
   * @param {ng.RootScopeService} $rootScope
   * @param {ng.InjectorService} $injector
   * @param {string[]} drivers
   * @returns {import("./interface.ts").AnimationService}
   */
  #createAnimationService($rootScope, $injector, drivers) {
    const NG_ANIMATE_REF_ATTR = "ng-animate-ref";

    /** @type {AnimationEntry[]} */
    const animationQueue = [];

    /**
     * @param {Element} element
     */
    const getRunner = (element) => {
      return getCacheData(element, RUNNER_STORAGE_KEY);
    };

    /**
     * @param {SortedAnimationEntry[]} animations
     */
    const sortAnimations = (animations) => {
      const tree = /** @type {Partial<SortedAnimationEntry>} */ ({
        children: [],
      });

      let i;

      const lookup = new Map();

      // this is done first beforehand so that the map
      // is filled with a list of the elements that will be animated

      for (i = 0; i < animations.length; i++) {
        const animation = animations[i];

        lookup.set(
          animation.domNode,
          (animations[i] = {
            domNode: animation.domNode,
            element: animation.element,
            fn: animation.fn,
            children: [],
          }),
        );
      }

      for (i = 0; i < animations.length; i++) {
        processNode(animations[i]);
      }

      return flatten(/** @type {SortedAnimationEntry} */ (tree));

      /**
       * @param {SortedAnimationEntry} entry
       */
      function processNode(entry) {
        if (entry.processed) return entry;
        entry.processed = true;

        const elementNode = entry.domNode;

        let { parentNode } = elementNode;

        lookup.set(elementNode, entry);

        let parentEntry;

        while (parentNode) {
          parentEntry = lookup.get(parentNode);

          if (parentEntry) {
            if (!parentEntry.processed) {
              parentEntry = processNode(parentEntry);
            }
            break;
          }
          // eslint-disable-next-line prefer-destructuring
          parentNode = parentNode.parentNode;
        }

        (parentEntry || tree).children.push(entry);

        return entry;
      }

      /**
       * @param {SortedAnimationEntry} theeParam
       */
      function flatten(theeParam) {
        const result = [];

        const queue = [];

        for (i = 0; i < theeParam.children.length; i++) {
          queue.push(theeParam.children[i]);
        }

        let remainingLevelEntries = queue.length;

        let nextLevelEntries = 0;

        let row = [];

        for (let j = 0; j < queue.length; j++) {
          const entry = queue[j];

          if (remainingLevelEntries <= 0) {
            remainingLevelEntries = nextLevelEntries;
            nextLevelEntries = 0;
            result.push(row);
            row = [];
          }
          row.push(entry);
          entry.children.forEach((childEntry) => {
            nextLevelEntries++;
            queue.push(childEntry);
          });
          remainingLevelEntries--;
        }

        if (row.length) {
          result.push(row);
        }

        return result;
      }
    };

    /**
     * @param {HTMLElement} elementParam
     * @param {string} event
     * @param {AnimationOptions | undefined} optionsParam
     * @returns {AnimateRunner}
     */
    return (elementParam, event, optionsParam) => {
      /** @type {AnimationOptions & { domOperation: () => void }} */
      const options =
        /** @type {AnimationOptions & { domOperation: () => void }} */ (
          prepareAnimationOptions(optionsParam)
        );

      const isStructural = ["enter", "move", "leave"].indexOf(event) >= 0;

      const runner = new AnimateRunner({
        end() {
          close();
        },
        cancel() {
          close(true);
        },
      });

      if (!drivers.length) {
        close();

        return runner;
      }

      let classes = mergeClasses(
        elementParam.getAttribute("class"),
        mergeClasses(options.addClass, options.removeClass),
      );

      let { tempClasses } = options;

      if (tempClasses) {
        classes += ` ${tempClasses}`;
        options.tempClasses = undefined;
      }

      if (isStructural) {
        setCacheData(
          elementParam,
          PREPARE_CLASSES_KEY,
          `ng-${event}${PREPARE_CLASS_SUFFIX}`,
        );
      }

      setCacheData(elementParam, RUNNER_STORAGE_KEY, runner);

      animationQueue.push({
        element: elementParam,
        classes,
        event,
        structural: isStructural,
        options,
        beforeStart,
        close,
      });

      elementParam.addEventListener("$destroy", handleDestroyedElement);

      if (animationQueue.length > 1) return runner;

      $rootScope.$postUpdate(() => {
        /** @type {AnimationEntry[]} */
        const animations = [];

        animationQueue.forEach((entry) => {
          if (getRunner(/** @type {HTMLElement} */ (entry.element))) {
            animations.push(entry);
          } else {
            /** @type {(reject?: boolean | undefined) => void} */ (
              entry.close
            )();
          }
        });

        animationQueue.length = 0;

        const groupedAnimations = groupAnimations(animations);

        /** @type {SortedAnimationEntry[]} */
        const toBeSortedAnimations = [];

        groupedAnimations.forEach((animationEntry) => {
          const fromElement = animationEntry.from
            ? animationEntry.from.element
            : animationEntry.element;

          let extraClasses = options.addClass;

          extraClasses =
            (extraClasses ? `${extraClasses} ` : "") + NG_ANIMATE_CLASSNAME;
          const cacheKey = animateCache._cacheKey(
            fromElement,
            animationEntry.event,
            extraClasses,
            options.removeClass,
          );

          toBeSortedAnimations.push({
            element: fromElement,
            domNode: fromElement,
            fn: function triggerAnimationStart() {
              let startAnimationFn;

              const closeFn = animationEntry.close;

              if (
                animateCache._containsCachedAnimationWithoutDuration(cacheKey)
              ) {
                closeFn();

                return;
              }

              animationEntry.beforeStart();

              const targetElement =
                animationEntry.anchors &&
                animationEntry.from &&
                animationEntry.to
                  ? animationEntry.from.element || animationEntry.to.element
                  : animationEntry.element;

              if (getRunner(targetElement)) {
                const operation = invokeFirstDriver(animationEntry);

                if (operation) {
                  startAnimationFn = operation.start;
                }
              }

              if (!startAnimationFn) {
                closeFn();
              } else {
                const animationRunner = startAnimationFn();

                animationRunner.done((/** @type {any} */ status) => {
                  closeFn(!status);
                });
                updateAnimationRunners(animationEntry, animationRunner);
              }
            },
            children: [],
          });
        });

        const finalAnimations = sortAnimations(toBeSortedAnimations);

        /** @type {Array<() => void>} */
        const flatFinalAnimations = [];

        for (let i = 0; i < finalAnimations.length; i++) {
          const innerArray = finalAnimations[i];

          for (let j = 0; j < innerArray.length; j++) {
            const entry = innerArray[j];

            const { element } = entry;

            flatFinalAnimations.push(entry.fn);

            if (i === 0) {
              removeElementData(element, PREPARE_CLASSES_KEY);
              continue;
            }

            const prepareClassName = getCacheData(element, PREPARE_CLASSES_KEY);

            if (prepareClassName) {
              element.classList.add(prepareClassName);
            }
          }
        }

        rafScheduler._schedule(flatFinalAnimations);
      });

      return runner;

      /**
       * @param {HTMLElement} node
       */
      function getAnchorNodes(node) {
        const SELECTOR = `[${NG_ANIMATE_REF_ATTR}]`;

        const items = node.hasAttribute(NG_ANIMATE_REF_ATTR)
          ? [node]
          : node.querySelectorAll(SELECTOR);

        /**
         * @type {(Element | HTMLElement)[]}
         */
        const anchors = [];

        items.forEach((nodeItem) => {
          const attr = nodeItem.getAttribute(NG_ANIMATE_REF_ATTR);

          if (attr && attr.length) {
            anchors.push(nodeItem);
          }
        });

        return anchors;
      }

      /**
       * @param {AnimationEntry[]} animations
       * @returns {AnimationEntry[]}
       */
      function groupAnimations(animations) {
        /** @type {AnimationEntry[]} */
        const preparedAnimations = [];

        /** @type {Record<string, AnchorRefEntry>} */
        const refLookup = {};

        animations.forEach((animation, index) => {
          // eslint-disable-next-line no-shadow
          const { element, event } = animation;

          const node = element;

          const enterOrMove = ["enter", "move"].indexOf(event) >= 0;

          const anchorNodes = animation.structural ? getAnchorNodes(node) : [];

          if (anchorNodes.length) {
            const direction = enterOrMove ? "to" : "from";

            anchorNodes.forEach((anchor) => {
              const key = anchor.getAttribute(NG_ANIMATE_REF_ATTR);

              if (!key) return;

              refLookup[key] = refLookup[key] || {};
              refLookup[key][direction] = {
                animationID: index,
                element: anchor,
              };
            });
          } else {
            preparedAnimations.push(animation);
          }
        });

        /** @type {Record<string, boolean>} */
        const usedIndicesLookup = {};

        /** @type {Record<string, AnimationEntry>} */
        const anchorGroups = {};

        values(refLookup).forEach((operations) => {
          const { from, to } = operations;

          if (!from || !to) {
            const index = from
              ? from.animationID
              : to
                ? to.animationID
                : undefined;

            if (index === undefined) return;

            const indexKey = index.toString();

            if (!usedIndicesLookup[indexKey]) {
              usedIndicesLookup[indexKey] = true;
              preparedAnimations.push(animations[index]);
            }

            return;
          }

          const fromAnimation = animations[from.animationID];

          const toAnimation = animations[to.animationID];

          const lookupKey = from.animationID.toString();

          if (!anchorGroups[lookupKey]) {
            const group = (anchorGroups[lookupKey] = {
              structural: true,
              element: /** @type {HTMLElement} */ (from.element),
              event: fromAnimation.event,
              options: fromAnimation.options,
              beforeStart() {
                fromAnimation.beforeStart();
                toAnimation.beforeStart();
              },
              close() {
                fromAnimation.close();
                toAnimation.close();
              },
              classes: cssClassesIntersection(
                fromAnimation.classes,
                toAnimation.classes,
              ),
              from: fromAnimation,
              to: toAnimation,
              anchors: [], // TODO(matsko): change to reference nodes
            });

            if (group.classes.length) {
              preparedAnimations.push(group);
            } else {
              preparedAnimations.push(fromAnimation);
              preparedAnimations.push(toAnimation);
            }
          }

          const group = anchorGroups[lookupKey];

          if (group?.anchors) {
            group.anchors.push({
              out: /** @type {HTMLElement} */ (from.element),
              in: /** @type {HTMLElement} */ (to.element),
            });
          }
        });

        return preparedAnimations;
      }

      /**
       * @param {string | string[] | null | undefined} value
       * @returns {string}
       */
      function normalizeClassValue(value) {
        if (Array.isArray(value)) return value.join(" ");

        return value || "";
      }

      /**
       * @param {string | string[] | null | undefined} a
       * @param {string | string[] | null | undefined} b
       * @returns {string}
       */
      function cssClassesIntersection(a, b) {
        a = normalizeClassValue(a).split(" ");
        b = normalizeClassValue(b).split(" ");
        const matches = [];

        for (let i = 0; i < a.length; i++) {
          const aa = a[i];

          if (aa.substring(0, 3) === "ng-") continue;

          for (let j = 0; j < b.length; j++) {
            if (aa === b[j]) {
              matches.push(aa);
              break;
            }
          }
        }

        return matches.join(" ");
      }

      /**
       * @param {import("./interface.ts").AnimationDetails} animationDetails
       */
      function invokeFirstDriver(animationDetails) {
        for (let i = drivers.length - 1; i >= 0; i--) {
          const driverName = drivers[i];

          const factory = $injector.get(driverName);

          const driver = factory(animationDetails);

          if (driver) {
            return driver;
          }
        }

        return undefined;
      }

      function beforeStart() {
        tempClasses =
          (tempClasses ? `${tempClasses} ` : "") + NG_ANIMATE_CLASSNAME;
        elementParam.className += ` ${tempClasses}`;
        let prepareClassName = getCacheData(elementParam, PREPARE_CLASSES_KEY);

        if (prepareClassName) {
          elementParam.classList.remove(prepareClassName);
          prepareClassName = null;
        }
      }

      /**
       * @param {*} animation
       * @param {*} newRunner
       */
      function updateAnimationRunners(animation, newRunner) {
        if (animation.from && animation.to) {
          update(animation.from.element);
          update(animation.to.element);
        } else {
          update(animation.element);
        }

        /**
         * @param {Element} el
         */
        function update(el) {
          getRunner(el).setHost(newRunner);
        }
      }

      function handleDestroyedElement() {
        (event !== "leave" || !options._domOperationFired) &&
          getRunner(elementParam)?.end();
      }

      /**
       * @param {boolean | undefined} [rejected]
       */
      function close(rejected) {
        deleteCacheData(elementParam, RUNNER_STORAGE_KEY);

        applyAnimationClasses(elementParam, options);
        applyAnimationStyles(elementParam, options);
        options.domOperation();

        if (tempClasses) {
          const classList = Array.isArray(tempClasses)
            ? tempClasses
            : tempClasses.split(" ");

          classList.forEach((/** @type {string} */ cls) =>
            elementParam.classList.remove(cls),
          );
        }

        runner.complete(!rejected);
      }
    };
  }
}
