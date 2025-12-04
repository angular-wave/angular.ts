import { $injectTokens as $t } from "../../injection-tokens.js";

ngInjectDirective.$inject = [$t.$log, $t.$injector];

/**
 * @param {ng.LogService} $log
 * @param {ng.InjectorService} $injector
 * @returns {ng.Directive}
 */
export function ngInjectDirective($log, $injector) {
  return {
    restrict: "A",
    link(scope, _element, attrs) {
      const expr = attrs.ngInject;

      if (!expr) return;
      const tokens = expr
        .split(";")
        .map((x) => x.trim())
        .filter(Boolean);

      for (const name of tokens) {
        if ($injector.has(name)) {
          scope[name] = $injector.get(name);
        } else {
          $log.warn(`Injectable ${name} not found in $injector`);
        }
      }
    },
  };
}
