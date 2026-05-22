import { directiveNormalize } from '../../shared/utils.js';

/**
 * Observes one normalized attribute name on one element without using the
 * framework-wide internal attribute observer registry.
 */
function observeNormalizedAttribute(scope, element, normalizedName, callback) {
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
    let deregisterDestroy = scope.$on("$destroy", deregister);
    function deregister() {
        observer.disconnect();
        deregisterDestroy?.();
        deregisterDestroy = undefined;
    }
    return deregister;
}

export { observeNormalizedAttribute };
