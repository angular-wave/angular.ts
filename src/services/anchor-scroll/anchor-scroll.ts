import { _location, _rootScope } from "../../injection-tokens.ts";
import {
  getNodeName,
  isFunction,
  isInstanceOf,
  isNumber,
  isString,
} from "../../shared/utils.ts";
import { urlResolve } from "../../shared/url-utils/url-utils.ts";

export interface AnchorScrollService {
  /**
   * Invoke anchor scrolling.
   */
  (hashOrElement?: string | number | HTMLElement): void;

  /**
   * Vertical scroll offset.
   * Can be a number, a function returning a number,
   * or an Element whose offsetTop will be used.
   */
  yOffset?: number | (() => number) | Element;
}

export class AnchorScrollProvider {
  autoScrollingEnabled: boolean;

  constructor() {
    this.autoScrollingEnabled = true;
  }

  $get = [
    _location,
    _rootScope,
    /** Creates the runtime anchor-scroll service. */
    ($location: ng.LocationService, $rootScope: ng.Scope) => {
      // Helper function to get first anchor from a NodeList
      // (using `Array#some()` instead of `angular#forEach()` since it's more performant
      //  and working in all supported browsers.)
      /** Returns the first anchor element from a queried node list. */
      function getFirstAnchor(
        list: NodeListOf<HTMLElement>,
      ): HTMLAnchorElement | undefined {
        for (let i = 0; i < list.length; i++) {
          const el = list[i];

          if (getNodeName(el) === "a") {
            return el as HTMLAnchorElement;
          }
        }

        return undefined;
      }

      function getYOffset(): number {
        // Figure out a better way to configure this other than bolting on a property onto a function
        let offset = scroll.yOffset;

        if (isFunction(offset)) {
          offset = offset();
        } else if (isInstanceOf(offset, Element)) {
          const style = window.getComputedStyle(offset);

          if (style.position !== "fixed") {
            offset = 0;
          } else {
            offset = offset.getBoundingClientRect().bottom;
          }
        } else if (!isNumber(offset)) {
          offset = 0;
        }

        return offset;
      }

      /** Scrolls to a specific element or to the top of the page. */
      function scrollTo(elem?: HTMLElement): void {
        if (elem) {
          const rect = elem.getBoundingClientRect();

          elem.scrollIntoView();

          const offset = getYOffset();

          if (offset) {
            // `offset` is how many pixels we want the element to appear below the top of the viewport.
            //
            // `scrollIntoView()` does not always align the element at the top (e.g. near the bottom
            // of the page). Therefore, we measure the element’s actual position after scrolling and
            // only adjust by the difference needed to reach the desired offset.
            window.scrollBy(0, rect.top - offset);
          }
        } else {
          window.scrollTo(0, 0);
        }
      }

      const scroll: ng.AnchorScrollService = (hashOrElement) => {
        // Direct element scrolling
        if (isInstanceOf(hashOrElement, HTMLElement)) {
          scrollTo(hashOrElement);

          return;
        }
        // Allow numeric hashes
        const hash = isString(hashOrElement)
          ? hashOrElement
          : isNumber(hashOrElement)
            ? hashOrElement.toString()
            : $location.getHash();

        let elm;

        // empty hash, scroll to the top of the page
        if (!hash) {
          scrollTo();
        }
        // element with given id
        else if ((elm = document.getElementById(hash))) scrollTo(elm);
        // first anchor with given name :-D
        else if ((elm = getFirstAnchor(document.getElementsByName(hash))))
          scrollTo(elm);
        // no element and hash === 'top', scroll to the top of the page
        else if (hash === "top") scrollTo();
      };

      // does not scroll when user clicks on anchor link that is currently on
      // (no url change, no $location.getHash() change), browser native does scroll
      if (this.autoScrollingEnabled) {
        $rootScope.$on(
          "$locationChangeSuccess",
          (_e: ng.ScopeEvent, newVal: string, oldVal: string) => {
            const newUrl = urlResolve(newVal);

            const ordUrl = urlResolve(oldVal);

            if (newUrl.hash === ordUrl.hash && newUrl.hash === "") return;

            const action = () => {
              scroll(newUrl.hash);
            };

            if (document.readyState === "complete") {
              // Force the action to be run async for consistent behavior
              // from the action's point of view
              // i.e. it will definitely run after the current event stack.
              queueMicrotask(() => {
                action();
              });
            } else {
              window.addEventListener("load", () => {
                action();
              });
            }
          },
        );
      }

      return scroll;
    },
  ];
}
