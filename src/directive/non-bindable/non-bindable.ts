/** Prevents AngularTS from compiling or binding the contents of the element. */
export function ngNonBindableDirective(): ng.Directive {
  return {
    terminal: true,
    priority: 1000,
  };
}
