import type { AnimationOptions, Animator } from "./interface.ts";
import {
  deleteCacheData,
  getCacheData,
  removeElementData,
  setCacheData,
} from "../shared/dom.ts";
import { isArray, mergeClasses, values } from "../shared/utils.ts";
import {
  NG_ANIMATE_CLASSNAME,
  PREPARE_CLASS_SUFFIX,
  applyAnimationClasses,
  applyAnimationStyles,
  prepareAnimationOptions,
} from "./shared.ts";
import { $injectTokens as $t } from "../injection-tokens.ts";
import { AnimateRunner } from "./runner/animate-runner.ts";
import { animateCache } from "./cache/animate-cache.ts";
import { rafScheduler } from "./raf/raf-scheduler.ts";

const RUNNER_STORAGE_KEY = "$$animationRunner";

const PREPARE_CLASSES_KEY = "$$animatePrepareClasses";

/**
 * Built-in animation method names used by the queue and drivers.
 *
 * These correspond to the public API methods on {@link AnimateService} that are
 * class-based or structural.
 */
export type AnimationMethod =
  | "enter"
  | "leave"
  | "move"
  | "addClass"
  | "setClass"
  | "removeClass";

/**
 * Concrete animation description passed into drivers.
 *
 * `AnimationDetails` is a normalized execution plan:
 * - includes the target element
 * - the resolved event name
 * - whether it is structural
 * - normalized options
 * - optional anchor pairs for shared-element transitions
 */
export interface AnimationDetails {
  from?: AnimationDetails;
  to?: AnimationDetails;
  anchors?: Array<{ out: HTMLElement; in: HTMLElement }>;
  element: HTMLElement;
  event: AnimationMethod | string;
  classes?: string | null;
  structural: boolean;
  options: AnimationOptions;
}

/**
 * Low-level animation executor used by the animation queue.
 *
 * This is the "engine" entry point: given a concrete element, an event name,
 * and normalized options, it starts an animation and returns an {@link AnimateRunner}
 * that represents the running work.
 *
 * Notes:
 * - `event` is intentionally `string` to support custom/internal events beyond the
 *   built-in set (e.g. driver-specific events).
 * - Callers typically pass normalized {@link AnimationOptions}.
 */
export type AnimationService = (
  element: HTMLElement,
  event: string,
  options?: AnimationOptions,
) => AnimateRunner;

/**
 * Internal entry used for parent-to-child sorting before scheduling with RAF.
 *
 * The queue sorts animation start functions by DOM ancestry to ensure:
 * - parent preparation classes are applied before children start
 * - child animations don't observe incorrect computed styles
 */
export interface SortedAnimationEntry {
  /** DOM node used to compute parent/child relationships (often the same as `element`). */
  domNode: Node;

  /** The element being animated. */
  element: Element;

  /** Function that triggers the animation start for this element. */
  fn: () => void;

  /** Children entries in the sort graph. */
  children: SortedAnimationEntry[];

  /** Internal marker to avoid processing nodes multiple times. */
  processed?: boolean;
}

/**
 * Internal queue entry representing an animation that will be driven.
 *
 * Extends {@link AnimationDetails} with lifecycle hooks used by the queue:
 * - `beforeStart()` applies preparation classes/styles before driver detection
 * - `close()` finalizes the animation state and resolves/rejects the runner
 */
export type AnimationEntry = AnimationDetails & {
  beforeStart: () => void;
  close: (reject?: boolean) => void;
};

/**
 * Reference to a structural animation participating in an anchor (shared element) pair.
 *
 * Stores the index into the current animation list and the anchor element node.
 */
export interface AnchorRef {
  animationID: number;
  element: Element;
}

/**
 * Pairing information for anchor animations.
 *
 * During grouping, an anchor key may map to:
 * - `from`: the leaving element
 * - `to`: the entering element
 *
 * If either side is missing, the animation falls back to non-anchor behavior.
 */
export interface AnchorRefEntry {
  from?: AnchorRef;
  to?: AnchorRef;
}

/**
 * Normalized animation factory signature used by the animation subsystem.
 *
 * Unlike {@link AnimateJsFn}, this always returns an {@link Animator} (never `undefined`),
 * typically because it represents the selected driver pipeline.
 */
export type AnimateFn = (
  element: HTMLElement,
  event: string,
  classes?: string | null,
  options?: AnimationOptions,
) => Animator;

export class AnimationProvider {
  $get: [
    string,
    string,
    (
      rootScope: ng.RootScopeService,
      injector: ng.InjectorService,
    ) => AnimationService,
  ];

  /** @internal */
  _drivers = [];

  constructor() {
    this.$get = [
      $t._rootScope,
      $t._injector,
      /** Creates the runtime animation service. */
      ($rootScope: ng.RootScopeService, $injector: ng.InjectorService) => {
        return this._createAnimationService(
          $rootScope,
          $injector,
          this._drivers,
        );
      },
    ];
  }

  /** Builds the animation runtime around the configured driver chain. */
  /** @internal */
  _createAnimationService(
    $rootScope: ng.RootScopeService,
    $injector: ng.InjectorService,
    drivers: string[],
  ): AnimationService {
    const NG_ANIMATE_REF_ATTR = "ng-animate-ref";

    const animationQueue: AnimationEntry[] = [];

    /** Retrieves the active runner associated with an element, if any. */
    const getRunner = (element: Element): AnimateRunner | undefined => {
      return getCacheData(element, RUNNER_STORAGE_KEY) as
        | AnimateRunner
        | undefined;
    };

    /** Sorts animations by DOM depth so parent/child ordering is stable. */
    const sortAnimations = (
      animations: SortedAnimationEntry[],
    ): SortedAnimationEntry[][] => {
      const tree: Partial<SortedAnimationEntry> = {
        children: [],
      };

      let i;

      const lookup = new Map<Node, SortedAnimationEntry>();

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

      return flatten(tree as SortedAnimationEntry);

      /** Places a node under its nearest queued parent entry. */
      function processNode(entry: SortedAnimationEntry): SortedAnimationEntry {
        if (entry.processed) return entry;
        entry.processed = true;

        const elementNode = entry.domNode;

        let { parentNode } = elementNode;

        lookup.set(elementNode, entry);

        let parentEntry: SortedAnimationEntry | undefined;

        while (parentNode) {
          parentEntry = lookup.get(parentNode);

          if (parentEntry) {
            if (!parentEntry.processed) {
              parentEntry = processNode(parentEntry);
            }
            break;
          }

          ({ parentNode } = parentNode);
        }

        (parentEntry || tree).children!.push(entry);

        return entry;
      }

      /** Flattens the animation tree into depth-based execution rows. */
      function flatten(
        theeParam: SortedAnimationEntry,
      ): SortedAnimationEntry[][] {
        const result: SortedAnimationEntry[][] = [];

        const queue: SortedAnimationEntry[] = [];

        for (i = 0; i < theeParam.children.length; i++) {
          queue.push(theeParam.children[i]);
        }

        let remainingLevelEntries = queue.length;

        let nextLevelEntries = 0;

        let row: SortedAnimationEntry[] = [];

        for (let j = 0; j < queue.length; j++) {
          const entry = queue[j];

          if (remainingLevelEntries <= 0) {
            remainingLevelEntries = nextLevelEntries;
            nextLevelEntries = 0;
            result.push(row);
            row = [];
          }
          row.push(entry);
          entry.children.forEach((childEntry: SortedAnimationEntry) => {
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

    /** Queues an animation request and returns the runner managing it. */
    return (
      elementParam: HTMLElement,
      event: string,
      optionsParam?: AnimationOptions,
    ): AnimateRunner => {
      const options = prepareAnimationOptions(
        optionsParam,
      ) as AnimationOptions & {
        domOperation: () => void;
      };

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
        const animations: AnimationEntry[] = [];

        animationQueue.forEach((entry) => {
          if (getRunner(entry.element)) {
            animations.push(entry);
          } else {
            entry.close();
          }
        });

        animationQueue.length = 0;

        const groupedAnimations = groupAnimations(animations);

        const toBeSortedAnimations: SortedAnimationEntry[] = [];

        groupedAnimations.forEach((animationEntry) => {
          const fromElement = animationEntry.from
            ? animationEntry.from.element
            : animationEntry.element;

          let { addClass: extraClasses } = options;

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
              let startAnimationFn: (() => AnimateRunner) | undefined;

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

                animationRunner.done((status: boolean) => {
                  closeFn(!status);
                });
                updateAnimationRunners(animationEntry, animationRunner);
              }
            },
            children: [],
          });
        });

        const finalAnimations = sortAnimations(toBeSortedAnimations);

        const flatFinalAnimations: Array<() => void> = [];

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

      /** Collects anchor-ref nodes for a structural animation subtree. */
      function getAnchorNodes(node: HTMLElement): Element[] {
        const SELECTOR = `[${NG_ANIMATE_REF_ATTR}]`;

        const items = node.hasAttribute(NG_ANIMATE_REF_ATTR)
          ? [node]
          : node.querySelectorAll(SELECTOR);

        const anchors: Element[] = [];

        items.forEach((nodeItem: Element) => {
          const attr = nodeItem.getAttribute(NG_ANIMATE_REF_ATTR);

          if (attr && attr.length) {
            anchors.push(nodeItem);
          }
        });

        return anchors;
      }

      /** Groups paired anchor-ref animations into a single animation entry. */
      function groupAnimations(animations: AnimationEntry[]): AnimationEntry[] {
        const preparedAnimations: AnimationEntry[] = [];

        const refLookup: Record<string, AnchorRefEntry> = {};

        animations.forEach((animation: AnimationEntry, index: number) => {
          const { element, event: animationEvent } = animation;

          const node = element;

          const enterOrMove = ["enter", "move"].indexOf(animationEvent) >= 0;

          const anchorNodes = animation.structural ? getAnchorNodes(node) : [];

          if (anchorNodes.length) {
            const direction = enterOrMove ? "to" : "from";

            anchorNodes.forEach((anchor: Element) => {
              const key = anchor.getAttribute(NG_ANIMATE_REF_ATTR);

              if (!key) return;

              refLookup[key] = refLookup[key] || ({} as AnchorRefEntry);
              refLookup[key][direction] = {
                animationID: index,
                element: anchor,
              };
            });
          } else {
            preparedAnimations.push(animation);
          }
        });

        const usedIndicesLookup: Record<string, boolean> = {};

        const anchorGroups: Record<string, AnimationEntry> = {};

        values(refLookup).forEach((operations: AnchorRefEntry) => {
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
              element: from.element as HTMLElement,
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
            } as AnimationEntry);

            if ((group.classes || "").length) {
              preparedAnimations.push(group);
            } else {
              preparedAnimations.push(fromAnimation);
              preparedAnimations.push(toAnimation);
            }
          }

          const group = anchorGroups[lookupKey];

          if (group?.anchors) {
            group.anchors.push({
              out: from.element as HTMLElement,
              in: to.element as HTMLElement,
            });
          }
        });

        return preparedAnimations;
      }

      /** Normalizes class input into a space-delimited string. */
      function normalizeClassValue(
        value: string | string[] | null | undefined,
      ): string {
        if (isArray(value)) return value.join(" ");

        return value || "";
      }

      /** Returns the shared non-`ng-` CSS classes between two class sets. */
      function cssClassesIntersection(
        a: string | string[] | null | undefined,
        b: string | string[] | null | undefined,
      ): string {
        a = normalizeClassValue(a).split(" ");
        b = normalizeClassValue(b).split(" ");
        const matches: string[] = [];

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

      /** Selects the first animation driver willing to handle a request. */
      function invokeFirstDriver(
        animationDetails: AnimationDetails,
      ): Animator | undefined {
        for (let i = drivers.length - 1; i >= 0; i--) {
          const driverName = drivers[i];

          const factory = $injector.get(driverName) as (
            details: AnimationDetails,
          ) => Animator | undefined;

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

      /** Rebinds any existing element runners to a newly created host runner. */
      function updateAnimationRunners(
        animation: AnimationEntry,
        newRunner: AnimateRunner,
      ): void {
        if (animation.from && animation.to) {
          update(animation.from.element);
          update(animation.to.element);
        } else {
          update(animation.element);
        }

        /** Updates the host runner associated with a single element. */
        function update(el: Element): void {
          getRunner(el)?.setHost(newRunner);
        }
      }

      function handleDestroyedElement() {
        (event !== "leave" || !options._domOperationFired) &&
          getRunner(elementParam)?.end();
      }

      /** Finalizes the animation and applies DOM/class/style cleanup. */
      function close(rejected?: boolean) {
        deleteCacheData(elementParam, RUNNER_STORAGE_KEY);

        applyAnimationClasses(elementParam, options);
        applyAnimationStyles(elementParam, options);
        options.domOperation?.();

        if (tempClasses) {
          const classList = isArray(tempClasses)
            ? tempClasses
            : tempClasses.split(" ");

          classList.forEach((cls) => elementParam.classList.remove(cls));
        }

        runner.complete(!rejected);
      }
    };
  }
}
