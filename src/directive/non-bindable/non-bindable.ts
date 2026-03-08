export function ngNonBindableDirective(): ng.Directive {
  return {
    terminal: true,
    priority: 1000,
  };
}
