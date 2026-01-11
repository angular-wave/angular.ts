import {
  getNodeName,
  isFunction,
  isNumber,
  isString,
} from "../../shared/utils.js";
import { $injectTokens as $t } from "../../injection-tokens.js";
import { urlResolve } from "../../shared/url-utils/url-utils.js";

export class AnchorScrollProvider {
  constructor() {
    this.autoScrollingEnabled = true;
  }

  $get = [
    $t._location,
    $t._rootScope,
    /**
     *
     * @param {ng.LocationService} $location
     * @param {ng.Scope} $rootScope
     * @returns {ng.AnchorScrollService}
     */
    ($location, $rootScope) => {
      // Helper function to get first anchor from a NodeList
      // (using `Array#some()` instead of `angular#forEach()` since it's more performant
      //  and working in all supported browsers.)
      /**
       * @param {NodeListOf<HTMLElement>} list
       * @returns {HTMLAnchorElement | undefined}
       */
      function getFirstAnchor(list) {
        for (let i = 0; i < list.length; i++) {
          const el = list[i];

          if (getNodeName(el) === "a") {
            return /** @type {HTMLAnchorElement} */ (el);
          }
        }

        return undefined;
      }

      function getYOffset() {
        // Figure out a better way to configure this other than bolting on a property onto a function
        let offset = scroll.yOffset;

        if (isFunction(offset)) {
          offset = /** @type {Function} */ (offset)();
        } else if (offset instanceof Element) {
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

      /**
       * @param {HTMLElement} [elem]
       */
      function scrollTo(elem) {
        if (elem) {
          const rect = elem.getBoundingClientRect();

          elem.scrollIntoView();

          const offset = /** @type {number} */ (getYOffset());

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

      /** @type {ng.AnchorScrollService} */
      const scroll = (hash) => {
        // Allow numeric hashes
        hash = isString(hash)
          ? hash
          : isNumber(hash)
            ? hash.toString()
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
          /** @param {ng.ScopeEvent} _e  @param {string} newVal @param {string} oldVal */ (
            _e,
            newVal,
            oldVal,
          ) => {
            const newUrl = urlResolve(newVal);

            const ordUrl = urlResolve(oldVal);

            if (newUrl.hash === ordUrl.hash && newUrl.hash === "") return;

            const action = () => scroll(newUrl.hash);

            if (document.readyState === "complete") {
              // Force the action to be run async for consistent behavior
              // from the action's point of view
              // i.e. it will definitely not be in a $apply
              queueMicrotask(() => action());
            } else {
              window.addEventListener("load", () => action());
            }
          },
        );
      }

      return scroll;
    },
  ];
}
