/**
 * @returns {ng.Directive}
 */
export function ngNonBindableDirective() {
  return {
    terminal: true,
    priority: 1000,
  };
}
