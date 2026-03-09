import type {
  AnimationOptions,
  Animator,
} from "./interface.ts";
import type { AnimationDetails } from "./animation.ts";
import type { AnimateCssService } from "./css/animate-css.ts";
import { $injectTokens } from "../injection-tokens.ts";
import { NodeType } from "../shared/node.ts";
import { isString } from "../shared/utils.ts";

import { AnimateRunner } from "./runner/animate-runner.ts";
import { concatWithSpace } from "./shared.ts";

const NG_ANIMATE_SHIM_CLASS_NAME = "ng-animate-shim";

const NG_ANIMATE_ANCHOR_CLASS_NAME = "ng-anchor";

const NG_OUT_ANCHOR_CLASS_NAME = "ng-anchor-out";

const NG_IN_ANCHOR_CLASS_NAME = "ng-anchor-in";

AnimateCssDriverProvider.$inject = ["$$animationProvider"];

interface AnimationProviderShape {
  _drivers: string[];
}

/**
 * Registers the CSS animation driver with the animation provider.
 */
export function AnimateCssDriverProvider(
  this: { $get?: unknown },
  $$animationProvider: AnimationProviderShape,
): void {
  $$animationProvider._drivers.push($injectTokens._animateCssDriver);

  /**
   * Returns whether an element is attached inside a document fragment.
   */
  function isDocumentFragment(node: Element): boolean {
    return node.parentNode?.nodeType === NodeType._DOCUMENT_FRAGMENT_NODE;
  }

  /**
   * Creates the runtime CSS animation driver factory.
   */
  this.$get = [
    $injectTokens._animateCss,
    $injectTokens._rootElement,
    /**
     * Builds animation runners backed by `$animateCss`.
     */
    function (
      $animateCss: AnimateCssService,
      $rootElement: HTMLElement,
    ): (
      animationDetails: AnimationDetails,
    ) => Animator | { start(): AnimateRunner } | undefined | null {
      const bodyNode = document.body;

      const rootNode = $rootElement;

      const rootBodyElement =
        // this is to avoid using something that exists outside of the body
        // we also special case the doc fragment case because our unit test code
        // appends the $rootElement to the body after the app has been bootstrapped
        isDocumentFragment(rootNode) || bodyNode.contains(rootNode)
          ? rootNode
          : bodyNode;

      return function initDriverFn(
        animationDetails: AnimationDetails,
      ): Animator | { start(): AnimateRunner } | undefined | null {
        return animationDetails.from && animationDetails.to
          ? prepareFromToAnchorAnimation(
              animationDetails.from,
              animationDetails.to,
              animationDetails.anchors || [],
            )
          : prepareRegularAnimation(animationDetails);
      };

      /**
       * Prepares the anchor animation that bridges one leaving element to one entering element.
       */
      function prepareAnchoredAnimation(
        outAnchor: HTMLElement,
        inAnchor: HTMLElement,
      ): { start(): AnimateRunner } | null {
        const clone = outAnchor.cloneNode(true) as HTMLElement;

        const startingClasses = filterCssClasses(clone.getAttribute("class"));

        outAnchor.classList.add(NG_ANIMATE_SHIM_CLASS_NAME);
        inAnchor.classList.add(NG_ANIMATE_SHIM_CLASS_NAME);

        clone.classList.add(NG_ANIMATE_ANCHOR_CLASS_NAME);

        rootBodyElement.append(clone);

        let animatorIn: Animator | null = null;

        const animatorOut = prepareOutAnimation();

        // the user may not end up using the `out` animation and
        // only making use of the `in` animation or vice-versa.
        // In either case we should allow this and not assume the
        // animation is over unless both animations are not used.
        if (!animatorOut) {
          animatorIn = prepareInAnimation();

          if (!animatorIn) {
            end();

            return null;
          }
        }

        const startingAnimator = animatorOut || animatorIn;

        if (!startingAnimator) {
          end();

          return null;
        }

        return {
          start() {
            const runner = new AnimateRunner({
              end: endFn,
              cancel: endFn,
            });

            let currentAnimation: AnimateRunner | null =
              startingAnimator.start();

            currentAnimation?.done(() => {
              currentAnimation = null;

              if (!animatorIn) {
                animatorIn = prepareInAnimation();

                if (animatorIn) {
                  currentAnimation = animatorIn.start();
                  currentAnimation?.done(() => {
                    currentAnimation = null;
                    end();
                    runner.complete();
                  });

                  return currentAnimation;
                }
              }
              // in the event that there is no `in` animation
              end();
              runner.complete();

              return undefined;
            });

            return runner;

            function endFn() {
              if (currentAnimation) {
                currentAnimation.end();
              }
            }
          },
        };

        /**
         * Captures the current position and size of an anchor element.
         */
        function calculateAnchorStyles(
          anchor: HTMLElement,
        ): Record<"width" | "height" | "top" | "left", string> {
          const styles = {} as Record<
            "width" | "height" | "top" | "left",
            string
          >;

          const coords = anchor.getBoundingClientRect();

          // we iterate directly since safari messes up and doesn't return
          // all the keys for the coords object when iterated
          const keys: Array<"width" | "height" | "top" | "left"> = [
            "width",
            "height",
            "top",
            "left",
          ];

          keys.forEach((key) => {
            let value = coords[key];

            switch (key) {
              case "top":
                value += bodyNode.scrollTop;
                break;
              case "left":
                value += bodyNode.scrollLeft;
                break;
            }
            styles[key] = `${Math.floor(value)}px`;
          });

          return styles;
        }

        function prepareOutAnimation(): Animator | null {
          const animator = $animateCss(clone, {
            addClass: NG_OUT_ANCHOR_CLASS_NAME,
            delay: true,
            from: calculateAnchorStyles(outAnchor),
          } as unknown as AnimationOptions);

          // read the comment within `prepareRegularAnimation` to understand
          // why this check is necessary
          return animator._willAnimate ? animator : null;
        }

        function prepareInAnimation(): Animator | null {
          const endingClasses = filterCssClasses(
            inAnchor.getAttribute("class"),
          );

          const toAdd = getUniqueValues(endingClasses, startingClasses);

          const toRemove = getUniqueValues(startingClasses, endingClasses);

          const animator = $animateCss(clone, {
            to: calculateAnchorStyles(inAnchor),
            addClass: `${NG_IN_ANCHOR_CLASS_NAME} ${toAdd}`,
            removeClass: `${NG_OUT_ANCHOR_CLASS_NAME} ${toRemove}`,
            delay: true,
          } as unknown as AnimationOptions);

          // read the comment within `prepareRegularAnimation` to understand
          // why this check is necessary
          return animator._willAnimate ? animator : null;
        }

        function end() {
          clone.remove();
          outAnchor.classList.remove(NG_ANIMATE_SHIM_CLASS_NAME);
          inAnchor.classList.remove(NG_ANIMATE_SHIM_CLASS_NAME);
        }
      }

      /**
       * Prepares a paired anchor animation between leaving and entering elements.
       */
      function prepareFromToAnchorAnimation(
        from: AnimationDetails,
        to: AnimationDetails,
        anchors: NonNullable<AnimationDetails["anchors"]>,
      ): { start(): AnimateRunner } | undefined {
        const fromAnimation = prepareRegularAnimation(from);

        const toAnimation = prepareRegularAnimation(to);

        const anchorAnimations: Array<{ start(): AnimateRunner }> = [];

        anchors.forEach((anchor: { out: HTMLElement; in: HTMLElement }) => {
          const outElement = anchor.out;

          const inElement = anchor.in;

          const animator = prepareAnchoredAnimation(outElement, inElement);

          if (animator) {
            anchorAnimations.push(animator);
          }
        });

        // no point in doing anything when there are no elements to animate
        if (!fromAnimation && !toAnimation && anchorAnimations.length === 0)
          return undefined;

        return {
          start() {
            const animationRunners: AnimateRunner[] = [];

            if (fromAnimation) {
              animationRunners.push(fromAnimation.start());
            }

            if (toAnimation) {
              animationRunners.push(toAnimation.start());
            }

            anchorAnimations.forEach((animation) => {
              animationRunners.push(animation.start());
            });

            const runner = new AnimateRunner({
              end: endFn,
              cancel: endFn, // CSS-driven animations cannot be cancelled, only ended
            });

            AnimateRunner._all(animationRunners, (status) => {
              runner.complete(status);
            });

            return runner;

            function endFn() {
              animationRunners.forEach((runnerItem) => {
                runnerItem.end();
              });
            }
          },
        };
      }

      /**
       * Prepares a normal CSS animation for one element.
       */
      function prepareRegularAnimation(
        animationDetails: AnimationDetails,
      ): Animator | null {
        const options = animationDetails.options || ({} as AnimationOptions);

        if (animationDetails.structural) {
          options.event = animationDetails.event;
          options.structural = true;
          options.applyClassesEarly = true;

          // we special case the leave animation since we want to ensure that
          // the element is removed as soon as the animation is over. Otherwise
          // a flicker might appear or the element may not be removed at all
          if (animationDetails.event === "leave") {
            options.onDone = options.domOperation;
          }
        }

        // We assign the preparationClasses as the actual animation event since
        // the internals of $animateCss will just suffix the event token values
        // with `-active` to trigger the animation.
        if (options.preparationClasses) {
          options.event = concatWithSpace(
            String(options.event ?? ""),
            options.preparationClasses,
          );
        }

        const animator = $animateCss(animationDetails.element, options);

        // the driver lookup code inside of $$animation attempts to spawn a
        // driver one by one until a driver returns a._willAnimate animator object.
        // $animateCss will always return an object, however, it will pass in
        // a flag as a hint as to whether an animation was detected or not

        return animator._willAnimate ? animator : null;
      }
    },
  ];
}

/**
 * Removes Angular animation bookkeeping classes from a class string.
 */
function filterCssClasses(classes: string | null): string {
  // remove all the `ng-` stuff
  return classes ? classes.replace(/\bng-\S+\b/g, "") : "";
}

/**
 * Returns the values present in `a` but not in `b`.
 */
function getUniqueValues(a: string | string[], b: string | string[]): string {
  const aList = isString(a) ? a.split(" ") : a;
  const bList = isString(b) ? b.split(" ") : b;

  return aList.filter((val: string) => bList.indexOf(val) === -1).join(" ");
}
