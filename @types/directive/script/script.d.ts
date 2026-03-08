/**
 * Captures inline `text/ng-template` script contents into `$templateCache`.
 *
 * @param {ng.TemplateCacheService} $templateCache
 */
export declare function scriptDirective(
  $templateCache: ng.TemplateCacheService,
): ng.Directive;
export declare namespace scriptDirective {
  var $inject: "$templateCache"[];
}
