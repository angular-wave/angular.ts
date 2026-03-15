import type { AnimationOptions } from "./interface.ts";
import type { AnimateQueueService } from "./queue/animate-queue.ts";
import type { QueuePhase } from "./queue/animate-queue.ts";
import {
  extend,
  hasAnimate,
  isFunction,
  isInstanceOf,
  isObject,
  mergeClasses,
  minErr,
  nullObject,
} from "../shared/utils.ts";
import { animatedomInsert, domInsert, removeElement } from "../shared/dom.ts";
import { NG_ANIMATE_CLASSNAME } from "./shared.js";
import { $injectTokens } from "../injection-tokens.ts";
import type { AnimateRunner } from "./runner/animate-runner.ts";

const $animateMinErr = minErr("$animate");

/**
 * Data payload delivered to animation event callbacks (`AnimateService.on`).
 *
 * This is intentionally a small subset of animation information: it tells listeners
 * which classes are being added/removed and which style maps are being applied.
 *
 * Values may be `null` when not applicable.
 */
export interface AnimationEventData {
  addClass?: string | null;
  removeClass?: string | null;
  from?: Record<string, any> | null;
  to?: Record<string, any> | null;
}

/**
 * Public-facing animation orchestration API.
 *
 * This is the service used by higher-level code to:
 * - register lifecycle callbacks (`on`/`off`)
 * - issue animations (`enter`, `leave`, `addClass`, `animate`, ...)
 * - control global/element-level enabling
 * - cancel running work
 *
 * The service returns {@link AnimateRunner} instances for all animation requests.
 */
export interface AnimateService {
  /**
   * Register an animation callback for a given event name on a container.
   *
   * Callbacks fire for matching descendant elements during queue execution phases.
   */
  on(
    event: string,
    container: Element,
    callback?: (
      element: Element,
      phase: QueuePhase,
      data: AnimationEventData,
    ) => void,
  ): void;

  /**
   * Remove a previously registered callback.
   *
   * If only `event` is provided, removes all callbacks for that event.
   * If `container` and/or `callback` are provided, filters removals accordingly.
   */
  off(event: string, container?: Element, callback?: Function): void;

  /**
   * Pin an element to a host parent for animation ancestry checks.
   *
   * This is used when the DOM parent relationship is not the effective "animation host"
   * relationship (e.g. transclusion/moves).
   */
  pin(element: Element, parentElement: Element): void;

  /**
   * Enable/disable animations globally or for a specific element.
   *
   * - Called with no args: returns global enabled state.
   * - Called with element: returns enabled state for that element.
   * - Called with element + boolean: sets enabled state for that element.
   */
  enabled(element?: Element, enabled?: boolean): boolean;

  /**
   * Cancel a running animation by runner.
   */
  cancel(runner: AnimateRunner): void;

  /**
   * Structural animation: insert `element` into the DOM.
   */
  enter(
    element: Element,
    parent?: Element | null,
    after?: Element,
    options?: AnimationOptions,
  ): AnimateRunner;

  /**
   * Structural animation: move `element` within the DOM.
   */
  move(
    element: Element,
    parent: Element | null,
    after?: Element,
    options?: AnimationOptions,
  ): AnimateRunner;

  /**
   * Structural animation: remove `element` from the DOM.
   */
  leave(element: Element, options?: AnimationOptions): AnimateRunner;

  /**
   * Class-based animation: add classes to `element`.
   */
  addClass(
    element: Element,
    className: string,
    options?: AnimationOptions,
  ): AnimateRunner;

  /**
   * Class-based animation: remove classes from `element`.
   */
  removeClass(
    element: Element,
    className: string,
    options?: AnimationOptions,
  ): AnimateRunner;

  /**
   * Class-based animation: add and remove classes as a single atomic operation.
   */
  setClass(
    element: Element,
    add: string,
    remove: string,
    options?: AnimationOptions,
  ): AnimateRunner;

  /**
   * Inline-style animation: animate from `from` styles to `to` styles.
   *
   * `className` may be applied during the animation to help CSS-based drivers.
   */
  animate(
    element: Element,
    from: Record<string, string | number>,
    to: Record<string, string | number>,
    className?: string,
    options?: AnimationOptions,
  ): AnimateRunner;
}

interface AnimateProviderInstance {
  _registeredAnimations: Record<string, string>;
  register: (
    name: string,
    factory: import("../interface.ts").Injectable<any>,
  ) => void;
  customFilter: (filterFn?: Function) => Function | null;
  classNameFilter: (expression?: RegExp) => RegExp | null;
  $get: [string, ($$animateQueue: AnimateQueueService) => AnimateService];
}

// if any other type of options value besides an Object value is
// passed into the $animate.method() animation then this helper code
// will be run which will ignore it. While this patch is not the
// greatest solution to this, a lot of existing plugins depend on
// $animate to either call the callback (< 1.2) or return a promise
// that can be changed. This helper function ensures that the options
// are wiped clean incase a callback function is provided.
/**
 * Normalizes animation options so non-object inputs become an empty options bag.
 */
function prepareAnimateOptions(options?: AnimationOptions): AnimationOptions {
  return isObject(options) ? options : ({} as AnimationOptions);
}

AnimateProvider.$inject = [$injectTokens._provide];

/** @param $provide */
export function AnimateProvider(
  this: AnimateProviderInstance,
  $provide: ng.ProvideService,
): void {
  const provider = this;

  let classNameFilter: RegExp | null = null;

  let customFilter: Function | null = null;

  this._registeredAnimations = nullObject();

  /**
   * Registers a new injectable animation factory function. The factory function produces the
   * animation object which contains callback functions for each event that is expected to be
   * animated.
   *
   *   * `eventFn`: `function(element, ... , doneFunction, options)`
   *   The element to animate, the `doneFunction` and the options fed into the animation. Depending
   *   on the type of animation additional arguments will be injected into the animation function. The
   *   list below explains the function signatures for the different animation methods:
   *
   *   - setClass: function(element, addedClasses, removedClasses, doneFunction, options)
   *   - addClass: function(element, addedClasses, doneFunction, options)
   *   - removeClass: function(element, removedClasses, doneFunction, options)
   *   - enter, leave, move: function(element, doneFunction, options)
   *   - animate: function(element, fromStyles, toStyles, doneFunction, options)
   *
   *   Make sure to trigger the `doneFunction` once the animation is fully complete.
   *
   * ```js
   *   return {
   *     //enter, leave, move signature
   *     eventFn : function(element, done, options) {
   *       //code to run the animation
   *       //once complete, then run done()
   *       return function endFunction(wasCancelled) {
   *         //code to cancel the animation
   *       }
   *     }
   *   }
   * ```
   *
   * @param name The name of the animation (this is what the class-based CSS value will be compared to).
   * @param factory The factory function that will be executed to return the animation
   *                           object.
   */
  this.register = function (
    name: string,
    factory: import("../interface.ts").Injectable<any>,
  ): void {
    if (name && name.charAt(0) !== ".") {
      throw $animateMinErr(
        "notcsel",
        "Expecting class selector starting with '.' got '{0}'.",
        name,
      );
    }

    const key = `${name}-animation`;

    provider._registeredAnimations[name.substring(1)] = key;
    $provide.factory(key, factory);
  };

  /**
   * Sets and/or returns the custom filter function that is used to "filter" animations, i.e.
   * determine if an animation is allowed or not. When no filter is specified (the default), no
   * animation will be blocked. Setting the `customFilter` value will only allow animations for
   * which the filter function's return value is truthy.
   *
   * This allows to easily create arbitrarily complex rules for filtering animations, such as
   * allowing specific events only, or enabling animations on specific subtrees of the DOM, etc.
   * Filtering animations can also boost performance for low-powered devices, as well as
   * applications containing a lot of structural operations.
   *
   * <div class="alert alert-success">
   *   **Best Practice:**
   *   Keep the filtering function as lean as possible, because it will be called for each DOM
   *   action (e.g. insertion, removal, class change) performed by "animation-aware" directives.
   *   See {@link guide/animations#which-directives-support-animations- here} for a list of built-in
   *   directives that support animations.
   *   Performing computationally expensive or time-consuming operations on each call of the
   *   filtering function can make your animations sluggish.
   * </div>
   *
   * **Note:** If present, `customFilter` will be checked before
   * {@link $animateProvider#classNameFilter classNameFilter}.
   *
   * @param filterFn - The filter function which will be used to filter all animations.
   *   If a falsy value is returned, no animation will be performed. The function will be called
   *   with the following arguments:
   *   - **node** `{Element}` - The DOM element to be animated.
   *   - **event** `{String}` - The name of the animation event (e.g. `enter`, `leave`, `addClass`
   *     etc).
   *   - **options** `{Object}` - A collection of options/styles used for the animation.
   * @returns The current filter function or `null` if there is none set.
   */
  this.customFilter = function (filterFn?: Function): Function | null {
    if (arguments.length === 1) {
      customFilter = isFunction(filterFn) ? filterFn : null;
    }

    return customFilter;
  };

  /**
   * Sets and/or returns the CSS class regular expression that is checked when performing
   * an animation. Upon bootstrap the classNameFilter value is not set at all and will
   * therefore enable $animate to attempt to perform an animation on any element that is triggered.
   * When setting the `classNameFilter` value, animations will only be performed on elements
   * that successfully match the filter expression. This in turn can boost performance
   * for low-powered devices as well as applications containing a lot of structural operations.
   *
   * **Note:** If present, `classNameFilter` will be checked after
   * {@link $animateProvider#customFilter customFilter}. If `customFilter` is present and returns
   * false, `classNameFilter` will not be checked.
   *
   * @param expression The className expression which will be checked against all animations
   * @returns The current CSS className expression value. If null then there is no expression value
   */
  this.classNameFilter = function (expression?: RegExp): RegExp | null {
    if (arguments.length === 1) {
      classNameFilter = expression instanceof RegExp ? expression : null;

      if (classNameFilter) {
        const reservedRegex = new RegExp(
          `[(\\s|\\/)]${NG_ANIMATE_CLASSNAME}[(\\s|\\/)]`,
        );

        if (reservedRegex.test(classNameFilter.toString())) {
          classNameFilter = null;
          throw $animateMinErr(
            "nongcls",
            '$animateProvider.classNameFilter(regex) prohibits accepting a regex value which matches/contains the "{0}" CSS class.',
            NG_ANIMATE_CLASSNAME,
          );
        }
      }
    }

    return classNameFilter;
  };

  this.$get = [
    $injectTokens._animateQueue,
    /**
     * Creates the runtime `$animate` service facade.
     */
    function ($$animateQueue: AnimateQueueService): AnimateService {
      /**
       * The $animate service exposes a series of DOM utility methods that provide support
       * for animation hooks. The default behavior is the application of DOM operations, however,
       * when an animation is detected (and animations are enabled), $animate will do the heavy lifting
       * to ensure that animation runs with the triggered DOM operation.
       *
       * By default $animate doesn't trigger any animations. This is because the `ngAnimate` module isn't
       * included and only when it is active then the animation hooks that `$animate` triggers will be
       * functional. Once active then all structural `ng-` directives will trigger animations as they perform
       * their DOM-related operations (enter, leave and move). Other directives such as `ngClass`,
       * `ngShow`, `ngHide` and `ngMessages` also provide support for animations.
       *
       * It is recommended that the`$animate` service is always used when executing DOM-related procedures within directives.
       */
      return {
        /**
         *
         * Sets up an event listener to fire whenever the animation event (enter, leave, move, etc...)
         *    has fired on the given element or among any of its children. Once the listener is fired, the provided callback
         *    is fired with the following params:
         *
         * ```js
         * $animate.on('enter', container,
         *    function callback(element, phase) {
         *      // cool we detected an enter animation within the container
         *    }
         * );
         * ```
         *
         * <div class="alert alert-warning">
         * **Note**: Generally, the events that are fired correspond 1:1 to `$animate` method names,
         * e.g. {@link ng.$animate#addClass addClass()} will fire `addClass`, and {@link ng.ngClass}
         * will fire `addClass` if classes are added, and `removeClass` if classes are removed.
         * However, there are two exceptions:
         *
         * <ul>
         *   <li>if both an {@link ng.$animate#addClass addClass()} and a
         *   {@link ng.$animate#removeClass removeClass()} action are performed during the same
         *   animation, the event fired will be `setClass`. This is true even for `ngClass`.</li>
         *   <li>an {@link ng.$animate#animate animate()} call that adds and removes classes will fire
         *   the `setClass` event, but if it either removes or adds classes,
         *   it will fire `animate` instead.</li>
         * </ul>
         *
         * </div>
         *
         * @param event the animation event that will be captured (e.g. enter, leave, move, addClass, removeClass, etc...)
         * @param container the container element that will capture each of the animation events that are fired on itself
         *     as well as among its children
         * @param callback the callback function that will be fired when the listener is triggered.
         *
         * The arguments present in the callback function are:
         * * `element` - The captured DOM element that the animation was fired on.
         * * `phase` - The phase of the animation. The two possible phases are **start** (when the animation starts) and **close** (when it ends).
         * * `data` - an object with these properties:
         *     * addClass - `{string|null}` - space-separated CSS classes to add to the element
         *     * removeClass - `{string|null}` - space-separated CSS classes to remove from the element
         *     * from - `{Object|null}` - CSS properties & values at the beginning of the animation
         *     * to - `{Object|null}` - CSS properties & values at the end of the animation
         *
         * Note that the callback does not trigger a scope digest. Wrap your call into a
         * {@link $rootScope.Scope#$apply scope.$apply} to propagate changes to the scope.
         */
        on: $$animateQueue.on,

        /**
         * Deregisters an event listener based on the event which has been associated with the provided element. This method
         * can be used in three different ways depending on the arguments:
         *
         * ```js
         * // remove all the animation event listeners listening for `enter`
         * $animate.off('enter');
         *
         * // remove listeners for all animation events from the container element
         * $animate.off(container);
         *
         * // remove all the animation event listeners listening for `enter` on the given element and its children
         * $animate.off('enter', container);
         *
         * // remove the event listener function provided by `callback` that is set
         * // to listen for `enter` on the given `container` as well as its children
         * $animate.off('enter', container, callback);
         * ```
         *
         * @param event|container the animation event (e.g. enter, leave, move,
         * addClass, removeClass, etc...), or the container element. If it is the element, all other
         * arguments are ignored.
         * @param container the container element the event listener was placed on
         * @param callback the callback function that was registered as the listener
         */
        off: $$animateQueue.off,

        /**
         *  Associates the provided element with a host parent element to allow the element to be animated even if it exists
         *  outside of the DOM structure of the AngularTS application. By doing so, any animation triggered via `$animate` can be issued on the
         *  element despite being outside the realm of the application or within another application. Say for example if the application
         *  was bootstrapped on an element that is somewhere inside of the `<body>` tag, but we wanted to allow for an element to be situated
         *  as a direct child of `document.body`, then this can be achieved by pinning the element via `$animate.pin(element)`. Keep in mind
         *  that calling `$animate.pin(element, parentElement)` will not actually insert into the DOM anywhere; it will just create the association.
         *
         *  Note that this feature is only active when the `ngAnimate` module is used.
         *
         * @param element the external element that will be pinned
         * @param parentElement the host parent element that will be associated with the external element
         */
        pin: $$animateQueue.pin,

        /**
         * Used to get and set whether animations are enabled or not on the entire application or on an element and its children. This
         * function can be called in four ways:
         *
         * ```js
         * // returns true or false
         * $animate.enabled();
         *
         * // changes the enabled state for all animations
         * $animate.enabled(false);
         * $animate.enabled(true);
         *
         * // returns true or false if animations are enabled for an element
         * $animate.enabled(element);
         *
         * // changes the enabled state for an element and its children
         * $animate.enabled(element, true);
         * $animate.enabled(element, false);
         * ```
         *
         * @param element the element that will be considered for checking/setting the enabled state
         * @param enabled whether or not the animations will be enabled for the element
         *
         * @returns whether or not animations are enabled
         */
        enabled: (element?: Element, enabled?: boolean): boolean => {
          if (enabled !== undefined) {
            return hasAnimate(element as Element);
          } else {
            (element as Element).setAttribute("animate", `${enabled}`);
          }

          return true;
        },

        /**
         * Cancels the provided animation and applies the end state of the animation.
         * Note that this does not cancel the underlying operation, e.g. the setting of classes or
         * adding the element to the DOM.
         *
         * @param runner An animation runner returned by an $animate function.
         */
        cancel(
          runner: import("./runner/animate-runner.ts").AnimateRunner,
        ): void {
          if (runner.cancel) {
            runner.cancel();
          }
        },

        /**
         * Inserts the element into the DOM either after the `after` element (if provided) or
         * as the first child within the `parent` element and then triggers an animation.
         * A promise is returned that will be resolved during the next digest once the animation
         * has completed.
         *
         * @param element - the element which will be inserted into the DOM
         * @param parent - the parent element which will append the element as a child (so long as the after element is not present)
         * @param [after] - after the sibling element after which the element will be appended
         * @param [options] - an optional collection of options/styles that will be applied to the element.
         * @returns the animation runner
         */
        enter(
          element: Element,
          parent?: Element | null,
          after?: ChildNode | null,
          options?: AnimationOptions,
        ) {
          parent = parent || (after && after.parentElement);

          if (
            isInstanceOf(element, HTMLElement) &&
            isInstanceOf(parent, HTMLElement)
          ) {
            animatedomInsert(element, parent, after);
          } else {
            domInsert(element, parent as Element, after);
          }

          return $$animateQueue.push(
            element,
            "enter",
            prepareAnimateOptions(options),
          );
        },

        /**
         * Inserts (moves) the element into its new position in the DOM either after
         * the `after` element (if provided) or as the first child within the `parent` element
         * and then triggers an animation. A promise is returned that will be resolved
         * during the next digest once the animation has completed.
         *
         * @param element - the element which will be inserted into the DOM
         * @param parent - the parent element which will append the element as a child (so long as the after element is not present)
         * @param after - after the sibling element after which the element will be appended
         * @param [options] - an optional collection of options/styles that will be applied to the element.
         * @returns the animation runner
         */
        move(
          element: Element,
          parent: Element | null,
          after: Element,
          options?: AnimationOptions,
        ) {
          parent = parent || after.parentElement;

          if (
            isInstanceOf(element, HTMLElement) &&
            isInstanceOf(parent, HTMLElement)
          ) {
            animatedomInsert(element, parent, after);
          } else {
            domInsert(element, parent as Element, after);
          }

          return $$animateQueue.push(
            element,
            "move",
            prepareAnimateOptions(options),
          );
        },

        /**
         * Triggers an animation and then removes the element from the DOM.
         * When the function is called a promise is returned that will be resolved during the next
         * digest once the animation has completed.
         *
         * @param element the element which will be removed from the DOM
         * @param [options] an optional collection of options/styles that will be applied to the element.
         * @returns the animation runner
         */
        leave(element: Element, options?: AnimationOptions) {
          return $$animateQueue.push(
            element,
            "leave",
            prepareAnimateOptions(options),
            () => {
              removeElement(element);
            },
          );
        },

        /**
         * Triggers an addClass animation surrounding the addition of the provided CSS class(es). Upon
         * execution, the addClass operation will only be handled after the next digest and it will not trigger an
         * animation if element already contains the CSS class or if the class is removed at a later step.
         * Note that class-based animations are treated differently compared to structural animations
         * (like enter, move and leave) since the CSS classes may be added/removed at different points
         * depending if CSS or JavaScript animations are used.
         *
         * @param element the element which the CSS classes will be applied to
         * @param className the CSS class(es) that will be added (multiple classes are separated via spaces)
         * @param [options] an optional collection of options/styles that will be applied to the element.
         * @returns The animation runner.
         */
        addClass(
          element: Element,
          className: string,
          options?: AnimationOptions,
        ) {
          options = prepareAnimateOptions(options);
          options.addClass = mergeClasses(options.addClass, className);

          return $$animateQueue.push(element, "addClass", options);
        },

        /**
         * Triggers a removeClass animation surrounding the removal of the provided CSS class(es). Upon
         * execution, the removeClass operation will only be handled after the next digest and it will not trigger an
         * animation if element does not contain the CSS class or if the class is added at a later step.
         * Note that class-based animations are treated differently compared to structural animations
         * (like enter, move and leave) since the CSS classes may be added/removed at different points
         * depending if CSS or JavaScript animations are used.
         *
         * @param element the element which the CSS classes will be applied to
         * @param className the CSS class(es) that will be removed (multiple classes are separated via spaces)
         * @param [options] an optional collection of options/styles that will be applied to the element.
         * @returns The animation runner.
         */
        removeClass(
          element: Element,
          className: string,
          options?: AnimationOptions,
        ) {
          options = prepareAnimateOptions(options);
          options.removeClass = mergeClasses(options.removeClass, className);

          return $$animateQueue.push(element, "removeClass", options);
        },

        /**
         * Performs both the addition and removal of a CSS classes on an element and (during the process)
         * triggers an animation surrounding the class addition/removal. Much like `$animate.addClass` and
         * `$animate.removeClass`, `setClass` will only evaluate the classes being added/removed once a digest has
         * passed. Note that class-based animations are treated differently compared to structural animations
         * (like enter, move and leave) since the CSS classes may be added/removed at different points
         * depending if CSS or JavaScript animations are used.
         *
         * @param element the element which the CSS classes will be applied to
         * @param add the CSS class(es) that will be added (multiple classes are separated via spaces)
         * @param remove the CSS class(es) that will be removed (multiple classes are separated via spaces)
         * @param [options] an optional collection of options/styles that will be applied to the element.
         *
         * @returns the animation runner
         */
        setClass(
          element: Element,
          add: string,
          remove: string,
          options?: AnimationOptions,
        ) {
          options = prepareAnimateOptions(options);
          options.addClass = mergeClasses(options.addClass, add);
          options.removeClass = mergeClasses(options.removeClass, remove);

          return $$animateQueue.push(element, "setClass", options);
        },

        /**
         * Performs an inline animation on the element which applies the provided to and from CSS styles to the element.
         * If any detected CSS transition, keyframe or JavaScript matches the provided className value, then the animation will take
         * on the provided styles. For example, if a transition animation is set for the given className, then the provided `from` and
         * `to` styles will be applied alongside the given transition. If the CSS style provided in `from` does not have a corresponding
         * style in `to`, the style in `from` is applied immediately, and no animation is run.
         * If a JavaScript animation is detected then the provided styles will be given in as function parameters into the `animate`
         * method (or as part of the `options` parameter):
         *
         * ```js
         * ngModule.animation('.my-inline-animation', function() {
         *   return {
         *     animate : function(element, from, to, done, options) {
         *       //animation
         *       done();
         *     }
         *   }
         * });
         * ```
         *
         * @param element the element which will be animated
         * @param from the initial CSS styles for the animation
         * @param to the final CSS styles for the animation
         * @param className an optional CSS class name to apply for the animation
         * @param options an optional collection of options/styles that will be applied to the element.
         * @returns the animation runner
         */
        animate(
          element: Element,
          from: Record<string, string | number>,
          to: Record<string, string | number>,
          className?: string,
          options?: AnimationOptions,
        ) {
          options = prepareAnimateOptions(options);
          options.from = options.from
            ? (extend(options.from, from) as Record<string, string | number>)
            : from;
          options.to = options.to
            ? (extend(options.to, to) as Record<string, string | number>)
            : to;

          className = className || "ng-inline-animate";
          options.tempClasses = mergeClasses(options.tempClasses, className);

          return $$animateQueue.push(element, "animate", options);
        },
      };
    },
  ];
}
