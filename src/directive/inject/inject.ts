import { $injectTokens as $t } from "../../injection-tokens.ts";
import type { Attributes } from "../../core/compile/attributes.ts";

ngInjectDirective.$inject = [$t._log, $t._injector];

/**
 * Injects named services from `$injector` onto the current scope.
 */
export function ngInjectDirective(
  $log: ng.LogService,
  $injector: ng.InjectorService,
): ng.Directive {
  return {
    restrict: "A",
    link(
      scope: ng.Scope & Record<string, any>,
      _element: Element,
      attrs: Attributes,
    ): void {
      const attrMap = attrs as Attributes & Record<string, string>;

      const expr = attrMap.ngInject;

      if (!expr) return;
      const tokens = expr
        .split(";")
        .map((x: string) => x.trim())
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
