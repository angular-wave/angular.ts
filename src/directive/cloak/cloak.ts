/** Removes the `ng-cloak` attribute during compilation so cloaked content can render. */
export function ngCloakDirective(): ng.Directive {
  return {
    compile(
      _: Element,
      attr: import("../../core/compile/attributes.ts").Attributes,
    ): void {
      attr.$set("ngCloak", null);
    },
  };
}
