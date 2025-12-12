import { $injectTokens as $t } from "../../injection-tokens.js";

export class ViewScrollProvider {
  constructor() {
    this.enabled = false;
  }

  useAnchorScroll() {
    this.enabled = true;
  }

  $get = [
    $t._anchorScroll,
    /**
     * @param {ng.AnchorScrollObject} $anchorScroll
     * @returns {ng.ViewScrollService}
     */
    ($anchorScroll) => {
      if (this.enabled) {
        return $anchorScroll;
      }

      return async function ($element) {
        return setTimeout(() => {
          $element.scrollIntoView(false);
        }, 0);
      };
    },
  ];
}
