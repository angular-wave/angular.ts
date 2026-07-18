/** @internal */
export interface ComponentTemplateInvocationLocals {
  $element: HTMLElement;
}

/** @internal */
export function createComponentTemplateInvocationLocals(
  element: HTMLElement,
): ComponentTemplateInvocationLocals {
  return { $element: element };
}
