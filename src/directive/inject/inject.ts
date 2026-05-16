import { _attributes, _injector, _log } from "../../injection-tokens.ts";

ngInjectDirective.$inject = [_log, _injector, _attributes];

/**
 * Injects named services from `$injector` onto the current scope.
 */
export function ngInjectDirective(
  $log: ng.LogService,
  $injector: ng.InjectorService,
  $attributes: ng.AttributesService,
): ng.Directive {
  return {
    restrict: "A",
    link(scope: ng.Scope & Record<string, any>, element: Element): void {
      const expr = $attributes.read(element, "ngInject");

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
