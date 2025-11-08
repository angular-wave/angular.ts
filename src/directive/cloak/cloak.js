/**
 * @returns {ng.Directive}
 */
export function ngCloakDirective() {
  return {
    compile(_, attr) {
      attr.$set("ngCloak", undefined);
    },
  };
}
