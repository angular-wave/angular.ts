import { setNormalizedAttr } from '../../shared/dom.js';

/** Removes the `ng-cloak` attribute during compilation so cloaked content can render. */
function ngCloakDirective() {
    return {
        compile(element) {
            setNormalizedAttr(element, "ngCloak", null);
            return undefined;
        },
    };
}

export { ngCloakDirective };
