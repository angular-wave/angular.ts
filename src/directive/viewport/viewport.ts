import { _parse } from "../../injection-tokens.ts";
import { arrayFrom } from "../../shared/utils.ts";
import { getNormalizedAttr, hasNormalizedAttr } from "../../shared/dom.ts";

const DEFAULT_THRESHOLD = 0.1;

interface ViewportLocals {
  $entry: IntersectionObserverEntry;
  $entries: IntersectionObserverEntry[];
}

function parseThreshold(value: string | undefined): number | number[] {
  if (!value) {
    return DEFAULT_THRESHOLD;
  }

  const thresholds = value
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((part) => !Number.isNaN(part));

  if (thresholds.length === 0) {
    throw new Error(`Invalid ng-viewport threshold '${value}'`);
  }

  thresholds.forEach((threshold) => {
    if (threshold < 0 || threshold > 1) {
      throw new Error(
        `Invalid ng-viewport threshold '${value}'. Threshold values must be between 0 and 1.`,
      );
    }
  });

  return thresholds.length === 1 ? thresholds[0] : thresholds;
}

ngViewportDirective.$inject = [_parse];

/** Evaluates expressions when an element enters or leaves the viewport. */
export function ngViewportDirective($parse: ng.ParseService): ng.Directive {
  return {
    restrict: "A",
    link(scope: ng.Scope, element: HTMLElement): void {
      const enterExpr = getNormalizedAttr(element, "onEnter");

      const leaveExpr = getNormalizedAttr(element, "onLeave");

      const once = hasNormalizedAttr(element, "viewportOnce");

      const threshold = parseThreshold(
        getNormalizedAttr(element, "viewportThreshold"),
      );

      const rootMargin = getNormalizedAttr(element, "viewportMargin") ?? "0px";

      const enterFn = enterExpr ? $parse(enterExpr) : undefined;

      const leaveFn = leaveExpr ? $parse(leaveExpr) : undefined;

      let completed = false;

      const observer = new IntersectionObserver(
        (entries: IntersectionObserverEntry[]) => {
          entries.forEach((entry) => {
            if (completed) {
              return;
            }

            const locals: ViewportLocals = {
              $entry: entry,
              $entries: entries,
            };

            if (entry.isIntersecting) {
              enterFn?.(scope, locals);

              if (once) {
                completed = true;
                observer.disconnect();
              }
            } else {
              leaveFn?.(scope, locals);
            }
          });
        },
        {
          root: null, // viewport
          rootMargin,
          threshold,
        },
      );

      observer.observe(element);

      // Clean up when the element is removed from DOM
      const parent = element.parentNode;

      let mutationObserver: MutationObserver | undefined;

      if (parent) {
        mutationObserver = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            arrayFrom(mutation.removedNodes).forEach((removedNode: Node) => {
              if (removedNode === element) {
                observer.disconnect();

                if (mutationObserver) {
                  mutationObserver.disconnect();
                }
              }
            });
          }
        });
        mutationObserver.observe(parent, { childList: true });
      }

      scope.$on("$destroy", () => {
        observer.disconnect();

        if (mutationObserver) mutationObserver.disconnect();
      });
    },
  };
}
