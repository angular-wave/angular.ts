// @ts-nocheck

import {
  getOrSetCacheData,
  extractElementNode,
  setCacheData,
} from "../../shared/dom.ts";
import {
  extend,
  isArray,
  isDefined,
  isObject,
  isString,
  isUndefined,
  nullObject,
} from "../../shared/utils.js";
import {
  NG_ANIMATE_CHILDREN_DATA,
  applyAnimationClasses,
  applyAnimationStyles,
  applyGeneratedPreparationClasses,
  clearGeneratedClasses,
  mergeAnimationDetails,
  prepareAnimationOptions,
  stripCommentsFromElement,
} from "../shared.ts";
import { $injectTokens as $t } from "../../injection-tokens.js";
import { AnimateRunner } from "../runner/animate-runner.ts";
import { NodeType } from "../../shared/node.ts";

export type QueuePhase = string;
export type QueueAnimationData = Record<string, any>;
export type AnimateQueueService = any;

const NG_ANIMATE_ATTR_NAME = "data-ng-animate";

const NG_ANIMATE_PIN_DATA = "$ngAnimatePin";

AnimateQueueProvider.$inject = [$t._animateProvider];

/** @typedef {import("../interface.ts").AnimationOptions} AnimationOptions */

/**
 * @param {any} $animateProvider
 * @constructor
 */
export function AnimateQueueProvider($animateProvider) {
  const PRE_DIGEST_STATE = 1;

  const RUNNING_STATE = 2;

  const ONE_SPACE = " ";

  /** @type {Record<string, any>} */
  const rules = (this.rules = {
    skip: [],
    cancel: [],
    join: [],
  });

  /**
   * @param {AnimationOptions} options
   * @return {QueueAnimationData}
   */
  function getEventData(options) {
    return {
      addClass: options.addClass,
      removeClass: options.removeClass,
      from: options.from,
      to: options.to,
    };
  }

  /**
   * @param {string} classString
   * @return {Record<string, string>}
   */
  function makeTruthyCssClassMap(classString) {
    const keys = classString.split(ONE_SPACE);

    const map = nullObject();

    keys.forEach((key) => {
      map[key] = true;
    });

    return map;
  }

  /**
   * @param {string} newClassString
   * @param {string} currentClassString
   */
  function hasMatchingClasses(newClassString, currentClassString) {
    if (newClassString && currentClassString) {
      const currentClassMap = makeTruthyCssClassMap(currentClassString);

      return newClassString
        .split(ONE_SPACE)
        .some((className) => currentClassMap[className]);
    }

    return undefined;
  }

  /**
   * @param {string} ruleType
   * @param {AnimationOptions} currentAnimation
   * @param {any} previousAnimation
   */
  function isAllowed(ruleType, currentAnimation, previousAnimation) {
    return rules[ruleType].some(
      (/** @type {(arg0: AnimationOptions, arg1: any) => any} */ fn) =>
        fn(currentAnimation, previousAnimation),
    );
  }

  /**
   * @param {AnimationOptions} animation
   * @param {boolean | undefined} [and]
   */
  function hasAnimationClasses(animation, and) {
    const a = (animation.addClass || "").length > 0;

    const b = (animation.removeClass || "").length > 0;

    return and ? a && b : a || b;
  }

  rules.join.push(
    (/** @type {AnimationOptions} */ newAnimation) =>
      !newAnimation.structural && hasAnimationClasses(newAnimation),
  );

  rules.skip.push(
    (/** @type {AnimationOptions} */ newAnimation) =>
      !newAnimation.structural && !hasAnimationClasses(newAnimation),
  );

  rules.skip.push(
    (
      /** @type {AnimationOptions} */ newAnimation,
      /** @type {AnimationOptions} */ currentAnimation,
    ) => currentAnimation.event === "leave" && newAnimation.structural,
  );

  rules.skip.push(
    (
      /** @type {AnimationOptions} */ newAnimation,
      /** @type {AnimationOptions} */ currentAnimation,
    ) =>
      currentAnimation.structural &&
      currentAnimation.state === RUNNING_STATE &&
      !newAnimation.structural,
  );

  rules.cancel.push(
    (
      /** @type {AnimationOptions} */ newAnimation,
      /** @type {AnimationOptions} */ currentAnimation,
    ) => currentAnimation.structural && newAnimation.structural,
  );

  rules.cancel.push(
    (
      /** @type {AnimationOptions} */ newAnimation,
      /** @type {AnimationOptions} */ currentAnimation,
    ) => currentAnimation.state === RUNNING_STATE && newAnimation.structural,
  );

  rules.cancel.push(
    (
      /** @type {AnimationOptions} */ newAnimation,
      /** @type {AnimationOptions} */ currentAnimation,
    ) => {
      if (currentAnimation.structural) return false;

      const nA = newAnimation.addClass;
      const nR = newAnimation.removeClass;
      const cA = currentAnimation.addClass;
      const cR = currentAnimation.removeClass;

      if (
        (isUndefined(nA) && isUndefined(nR)) ||
        (isUndefined(cA) && isUndefined(cR))
      ) {
        return false;
      }

      return (
        hasMatchingClasses(
          /** @type {string} */ nA,
          /** @type {string} */ cR,
        ) ||
        hasMatchingClasses(/** @type {string} */ nR, /** @type {string} */ cA)
      );
    },
  );

  this.$get = [
    $t._rootScope,
    $t._injector,
    $t._animation,
    /**
     * @param {ng.RootScopeService} $rootScope
     * @param {ng.InjectorService} $injector
     * @param {any} $$animation
     * @returns {AnimateQueueService}
     */
    function ($rootScope, $injector, $$animation) {
      const activeAnimationsLookup = new Map();
      const disabledElementsLookup = new Map();

      function postDigestTaskFactory() {
        let postDigestCalled = false;

        return function (/** @type {() => void} */ fn) {
          if (postDigestCalled) {
            fn();
          } else {
            $rootScope.$postUpdate(() => {
              postDigestCalled = true;
              fn();
            });
          }
        };
      }

      /** @type {Record<string, any>} */
      const callbackRegistry = nullObject();

      const customFilter = $animateProvider.customFilter();
      const classNameFilter = $animateProvider.classNameFilter();

      const returnTrue = function () {
        return true;
      };

      const isAnimatableByFilter = customFilter || returnTrue;

      const isAnimatableClassName = !classNameFilter
        ? returnTrue
        : function (
            /** @type {HTMLElement} */ node,
            /** @type {AnimationOptions} */ options,
          ) {
            const className = [
              node.getAttribute("class"),
              options.addClass,
              options.removeClass,
            ].join(" ");

            return classNameFilter.test(className);
          };

      /**
       * @param {HTMLElement} element
       * @param {AnimationOptions} animation
       */
      function normalizeAnimationDetails(element, animation) {
        return mergeAnimationDetails(element, animation, {});
      }

      /**
       * @param {Node | null} targetParentNode
       * @param {Node} targetNode
       * @param {string} event
       * @returns {Function[]}
       */
      function findCallbacks(targetParentNode, targetNode, event) {
        const matches = [];

        const entries = callbackRegistry[event];

        if (entries) {
          entries.forEach((entry) => {
            if (entry.node.contains(targetNode)) {
              matches.push(entry.callback);
            } else if (
              event === "leave" &&
              targetParentNode &&
              entry.node.contains(targetParentNode)
            ) {
              matches.push(entry.callback);
            }
          });
        }

        return matches;
      }

      /**
       * @param {any[]} list
       * @param {Node | NodeList | undefined} matchContainer
       * @param {Function | undefined} [matchCallback]
       */
      function filterFromRegistry(list, matchContainer, matchCallback) {
        const containerNode = matchContainer
          ? extractElementNode(matchContainer)
          : undefined;

        return list.filter((entry) => {
          const isMatch =
            entry.node === containerNode &&
            (!matchCallback || entry.callback === matchCallback);

          return !isMatch;
        });
      }

      /**
       * @param {string} phase
       * @param {Element} node
       */
      function cleanupEventListeners(phase, node) {
        if (phase === "close" && !node.parentNode) {
          $animate.off(node);
        }
      }

      /** @type {AnimateQueueService} */
      const $animate = {
        on(event, container, callback) {
          const node = extractElementNode(container);

          if (!node || !(node instanceof Element) || !callback) return;

          callbackRegistry[event] = callbackRegistry[event] || [];
          callbackRegistry[event].push({
            node,
            callback,
          });

          container.addEventListener("$destroy", () => {
            const animationDetails = activeAnimationsLookup.get(node);

            if (!animationDetails) {
              $animate.off(event, container, callback);
            }
          });
        },

        off(event, container, callback) {
          if (arguments.length === 1 && !isString(arguments[0])) {
            container = arguments[0];

            for (const eventType in callbackRegistry) {
              callbackRegistry[eventType] = filterFromRegistry(
                callbackRegistry[eventType] || [],
                container,
              );
            }

            return;
          }

          if (!isString(event)) return;

          const entries = callbackRegistry[event];

          if (!entries) return;

          callbackRegistry[event] =
            arguments.length === 1
              ? null
              : filterFromRegistry(entries, container, callback);
        },

        pin(element, parentElement) {
          setCacheData(element, NG_ANIMATE_PIN_DATA, parentElement);
        },

        push(element, event, options, domOperation) {
          options = options || {};
          options.domOperation = domOperation;

          return queueAnimation(element, event, options);
        },
      };

      return $animate;

      /**
       * @param {Element | Element[]} originalElement
       * @param {string} event
       * @param {*} initialOptions
       * @returns {AnimateRunner}
       */
      function queueAnimation(originalElement, event, initialOptions) {
        let options = initialOptions;

        let element = isArray(originalElement)
          ? originalElement.filter((x) => x.nodeName !== "#comment")[0]
          : originalElement;

        const node = element;
        const parentNode = node && node.parentNode;

        options = prepareAnimationOptions(options);

        const runner = new AnimateRunner();
        const runInNextPostDigestOrNow = postDigestTaskFactory();

        if (isArray(options.addClass)) {
          options.addClass = options.addClass.join(" ");
        }

        if (options.addClass && !isString(options.addClass)) {
          options.addClass = null;
        }

        if (isArray(options.removeClass)) {
          options.removeClass = options.removeClass.join(" ");
        }

        if (options.removeClass && !isString(options.removeClass)) {
          options.removeClass = null;
        }

        if (options.from && !isObject(options.from)) {
          options.from = null;
        }

        if (options.to && !isObject(options.to)) {
          options.to = null;
        }

        if (
          !node ||
          !isAnimatableByFilter(node, event, initialOptions) ||
          !isAnimatableClassName(node, options)
        ) {
          close();
          return runner;
        }

        const isStructural = ["enter", "move", "leave"].indexOf(event) >= 0;

        let skipAnimations =
          document.hidden || disabledElementsLookup.get(node);

        const existingAnimation =
          (!skipAnimations && activeAnimationsLookup.get(node)) || {};

        const hasExistingAnimation = !!existingAnimation.state;

        if (
          !skipAnimations &&
          (!hasExistingAnimation ||
            existingAnimation.state !== PRE_DIGEST_STATE)
        ) {
          skipAnimations = !areAnimationsAllowed(node, parentNode);
        }

        if (skipAnimations) {
          if (document.hidden) {
            notifyProgress(runner, event, "start", getEventData(options));
          }

          close();

          if (document.hidden) {
            notifyProgress(runner, event, "close", getEventData(options));
          }

          return runner;
        }

        if (isStructural) {
          closeChildAnimations(node);
        }

        /** @type {AnimationOptions} */
        const newAnimation = {
          structural: isStructural,
          element,
          event,
          addClass: options.addClass,
          removeClass: options.removeClass,
          close,
          options,
          runner,
        };

        if (hasExistingAnimation) {
          const skipAnimationFlag = isAllowed(
            "skip",
            newAnimation,
            existingAnimation,
          );

          if (skipAnimationFlag) {
            if (existingAnimation.state === RUNNING_STATE) {
              close();
              return runner;
            }

            mergeAnimationDetails(element, existingAnimation, newAnimation);
            return existingAnimation.runner;
          }

          const cancelAnimationFlag = isAllowed(
            "cancel",
            newAnimation,
            existingAnimation,
          );

          if (cancelAnimationFlag) {
            if (existingAnimation.state === RUNNING_STATE) {
              existingAnimation.runner.end();
            } else if (existingAnimation.structural) {
              existingAnimation.close();
            } else {
              mergeAnimationDetails(element, existingAnimation, newAnimation);
              return existingAnimation.runner;
            }
          } else {
            const joinAnimationFlag = isAllowed(
              "join",
              newAnimation,
              existingAnimation,
            );

            if (joinAnimationFlag) {
              if (existingAnimation.state === RUNNING_STATE) {
                normalizeAnimationDetails(element, newAnimation);
              } else {
                applyGeneratedPreparationClasses(
                  element,
                  isStructural ? event : null,
                  options,
                );

                event = newAnimation.event = existingAnimation.event;
                options = mergeAnimationDetails(
                  element,
                  existingAnimation,
                  newAnimation,
                );

                return existingAnimation.runner;
              }
            }
          }
        } else {
          normalizeAnimationDetails(element, newAnimation);
        }

        let isValidAnimation = newAnimation.structural;

        if (!isValidAnimation) {
          isValidAnimation =
            (newAnimation.event === "animate" &&
              Object.keys(newAnimation.options?.to || {}).length > 0) ||
            hasAnimationClasses(newAnimation);
        }

        if (!isValidAnimation) {
          close();
          clearElementAnimationState(node);
          return runner;
        }

        const counter = (existingAnimation.counter || 0) + 1;
        newAnimation.counter = counter;

        markElementAnimationState(node, PRE_DIGEST_STATE, newAnimation);
        $rootScope.$postUpdate(() => {
          element = stripCommentsFromElement(originalElement);

          let animationDetails = activeAnimationsLookup.get(node);
          const animationCancelled = !animationDetails;

          animationDetails = animationDetails || {};

          const parentElement = element.parentElement || null;
          const isCurrentAnimationValid =
            parentElement &&
            (animationDetails.event === "animate" ||
              animationDetails.structural ||
              hasAnimationClasses(animationDetails));

          if (
            animationCancelled ||
            animationDetails.counter !== counter ||
            !isCurrentAnimationValid
          ) {
            if (animationCancelled) {
              applyAnimationClasses(element, options);
              applyAnimationStyles(element, options);
            }

            if (
              animationCancelled ||
              (isStructural && animationDetails.event !== event)
            ) {
              options.domOperation();
              runner.end();
            }

            if (!isCurrentAnimationValid) {
              clearElementAnimationState(node);
            }

            return;
          }

          event =
            !animationDetails.structural &&
            hasAnimationClasses(animationDetails, true)
              ? "setClass"
              : animationDetails.event;

          markElementAnimationState(node, RUNNING_STATE);
          const realRunner = $$animation(
            element,
            event,
            animationDetails.options,
          );

          runner.setHost(realRunner);
          notifyProgress(runner, event, "start", getEventData(options));

          realRunner.done((status) => {
            close(!status);

            if (activeAnimationsLookup.get(node)?.counter === counter) {
              clearElementAnimationState(node);
            }

            notifyProgress(runner, event, "close", getEventData(options));
          });
        });

        setTimeout($rootScope.$flushQueue, 0);

        return runner;

        /**
         * @param {AnimateRunner} runnerParam
         * @param {string} eventParam
         * @param {string} phase
         * @param {QueueAnimationData} data
         */
        function notifyProgress(runnerParam, eventParam, phase, data) {
          runInNextPostDigestOrNow(() => {
            const callbacks = findCallbacks(parentNode, node, eventParam);

            if (callbacks.length) {
              callbacks.forEach((callback) => {
                callback(element, phase, data);
              });
              cleanupEventListeners(phase, node);
            } else {
              cleanupEventListeners(phase, node);
            }
          });

          runnerParam.progress(eventParam, phase, data);
        }

        /**
         * @param {boolean | undefined} [reject]
         */
        function close(reject) {
          clearGeneratedClasses(element, options);
          applyAnimationClasses(element, options);
          applyAnimationStyles(element, options);
          options.domOperation();
          runner.complete(!reject);
        }
      }

      /**
       * @param {Element | ParentNode} node
       */
      function closeChildAnimations(node) {
        const children = node.querySelectorAll(`[${NG_ANIMATE_ATTR_NAME}]`);

        children.forEach((child) => {
          const state = parseInt(child.getAttribute(NG_ANIMATE_ATTR_NAME), 10);
          const animationDetails = activeAnimationsLookup.get(child);

          if (animationDetails) {
            switch (state) {
              case RUNNING_STATE:
                animationDetails.runner.end();
                activeAnimationsLookup.delete(child);
                break;
              case PRE_DIGEST_STATE:
                activeAnimationsLookup.delete(child);
                break;
            }
          }
        });
      }

      /**
       * @param {Element} node
       */
      function clearElementAnimationState(node) {
        node.removeAttribute(NG_ANIMATE_ATTR_NAME);
        activeAnimationsLookup.delete(node);
      }

      /**
       * @param {Element} node
       * @param {Element} parentNode
       */
      function areAnimationsAllowed(node, parentNode) {
        const bodyNode = document.body;
        const rootNode = $injector.get("$rootElement");

        let bodyNodeDetected = node === bodyNode || node.nodeName === "HTML";
        let rootNodeDetected = node === rootNode;
        let parentAnimationDetected = false;
        let elementDisabled = disabledElementsLookup.get(node);
        let animateChildren;
        let parentHost = getOrSetCacheData(node, NG_ANIMATE_PIN_DATA);

        if (parentHost) {
          parentNode = parentHost;
        }

        while (parentNode) {
          if (!rootNodeDetected) {
            rootNodeDetected = parentNode === rootNode;
          }

          if (parentNode.nodeType !== NodeType._ELEMENT_NODE) {
            break;
          }

          const details = activeAnimationsLookup.get(parentNode) || {};

          if (!parentAnimationDetected) {
            const parentNodeDisabled = disabledElementsLookup.get(parentNode);

            if (parentNodeDisabled === true && elementDisabled !== false) {
              elementDisabled = true;
              break;
            } else if (parentNodeDisabled === false) {
              elementDisabled = false;
            }

            parentAnimationDetected = details.structural;
          }

          if (isUndefined(animateChildren) || animateChildren === true) {
            const value = getOrSetCacheData(
              parentNode,
              NG_ANIMATE_CHILDREN_DATA,
            );

            if (isDefined(value)) {
              animateChildren = value;
            }
          }

          if (parentAnimationDetected && animateChildren === false) break;

          if (!bodyNodeDetected) {
            bodyNodeDetected = parentNode === bodyNode;
          }

          if (bodyNodeDetected && rootNodeDetected) {
            break;
          }

          if (!rootNodeDetected) {
            parentHost = getOrSetCacheData(parentNode, NG_ANIMATE_PIN_DATA);

            if (parentHost) {
              parentNode = parentHost;
              continue;
            }
          }

          parentNode = parentNode.parentNode;
        }

        const allowAnimation =
          (!parentAnimationDetected || animateChildren) &&
          elementDisabled !== true;

        return allowAnimation && rootNodeDetected && bodyNodeDetected;
      }

      /**
       * @param {Element} node
       * @param {number} state
       * @param {AnimationOptions} [details]
       */
      function markElementAnimationState(node, state, details) {
        details = details || {};
        details.state = state;

        node.setAttribute(NG_ANIMATE_ATTR_NAME, state.toString());

        const oldValue = activeAnimationsLookup.get(node);
        const newValue = oldValue ? extend(oldValue, details) : details;

        activeAnimationsLookup.set(node, newValue);
      }
    },
  ];
}
