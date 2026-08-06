export function addScopeEventListener(
  scope: ng.Scope,
  target: EventTarget,
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
): void {
  target.addEventListener(type, listener, options);

  scope.$on("$destroy", (): void => {
    target.removeEventListener(type, listener, options);
  });
}
