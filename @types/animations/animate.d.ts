/** @param {ng.ProvideService} $provide */
export function AnimateProvider($provide: ng.ProvideService): void;
export class AnimateProvider {
  /** @param {ng.ProvideService} $provide */
  constructor($provide: ng.ProvideService);
  $$registeredAnimations: any;
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
   * @param {string} name The name of the animation (this is what the class-based CSS value will be compared to).
   * @param {import("../interface.ts").Injectable<any>} factory The factory function that will be executed to return the animation
   *                           object.
   */
  register: (
    name: string,
    factory: import("../interface.ts").Injectable<any>,
  ) => void;
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
   * @param {Function=} filterFn - The filter function which will be used to filter all animations.
   *   If a falsy value is returned, no animation will be performed. The function will be called
   *   with the following arguments:
   *   - **node** `{Element}` - The DOM element to be animated.
   *   - **event** `{String}` - The name of the animation event (e.g. `enter`, `leave`, `addClass`
   *     etc).
   *   - **options** `{Object}` - A collection of options/styles used for the animation.
   * @return {Function} The current filter function or `null` if there is none set.
   */
  customFilter: (filterFn?: Function | undefined, ...args: any[]) => Function;
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
   * @param {RegExp=} expression The className expression which will be checked against all animations
   * @return {RegExp} The current CSS className expression value. If null then there is no expression value
   */
  classNameFilter: (expression?: RegExp | undefined, ...args: any[]) => RegExp;
  $get: (
    | string
    | ((
        $$animateQueue: import("./queue/interface.ts").AnimateQueueService,
      ) => ng.AnimateService)
  )[];
}
export namespace AnimateProvider {
  let $inject: string[];
}
