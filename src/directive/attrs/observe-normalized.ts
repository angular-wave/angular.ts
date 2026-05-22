import { directiveNormalize } from "../../shared/utils.ts";

/**
 * Observes one normalized attribute name on one element without using the
 * framework-wide internal attribute observer registry.
 */
export function observeNormalizedAttribute(
  scope: ng.Scope,
  element: Element,
  normalizedName: string,
  callback: () => void,
): () => void {
  const expectedName = directiveNormalize(normalizedName);

  const observer = new MutationObserver((mutations) => {
    for (let i = 0; i < mutations.length; i++) {
      const attributeName = mutations[i].attributeName;

      if (attributeName && directiveNormalize(attributeName) === expectedName) {
        callback();
      }
    }
  });

  observer.observe(element, { attributes: true });

  let deregisterDestroy: (() => void) | undefined = scope.$on(
    "$destroy",
    deregister,
  );

  function deregister(): void {
    observer.disconnect();
    deregisterDestroy?.();
    deregisterDestroy = undefined;
  }

  return deregister;
}
