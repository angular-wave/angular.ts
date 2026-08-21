export function addScopeEventListener(
  scope: ng.Scope,
  target: EventTarget,
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
): void {
  if (options === undefined) {
    target.addEventListener(type, listener);
  } else {
    target.addEventListener(type, listener, options);
  }

  scope.on("$destroy", (): void => {
    if (options === undefined) {
      target.removeEventListener(type, listener);
    } else {
      target.removeEventListener(type, listener, options);
    }
  });
}
