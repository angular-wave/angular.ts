import { _attributes } from '../../injection-tokens.js';

ngCloakDirective.$inject = [_attributes];
/** Removes the `ng-cloak` attribute during compilation so cloaked content can render. */
function ngCloakDirective($attributes) {
    return {
        compile(element) {
            $attributes.set(element, "ngCloak", null);
            return undefined;
        },
    };
}

export { ngCloakDirective };
