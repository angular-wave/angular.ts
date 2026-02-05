/**
 * @param {ng.AnimateService} $animate
 * @returns {ng.Directive<NgSwitchController>}
 */
export function ngSwitchDirective(
  $animate: ng.AnimateService,
): ng.Directive<NgSwitchController>;
export namespace ngSwitchDirective {
  let $inject: string[];
}
/**
 * @returns {ng.Directive<NgSwitchController>}
 */
export function ngSwitchWhenDirective(): ng.Directive<NgSwitchController>;
/**
 * @returns {ng.Directive<NgSwitchController>}
 */
export function ngSwitchDefaultDirective(): ng.Directive<NgSwitchController>;
export type NgSwitchBlock = {
  _clone: Node;
  _comment: Comment;
};
/**
 * @typedef {object} NgSwitchBlock
 * @property {Node} _clone
 * @property {Comment} _comment
 */
declare class NgSwitchController {
  /** @type {Record<string, { transclude: ng.TranscludeFn; element: Element;}[]>} */
  _cases: Record<
    string,
    {
      transclude: ng.TranscludeFn;
      element: Element;
    }[]
  >;
}
export {};
