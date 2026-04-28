/** Removes the `ng-cloak` attribute during compilation so cloaked content can render. */
function ngCloakDirective() {
    return {
        compile(_, attr) {
            attr.$set("ngCloak", null);
        },
    };
}

export { ngCloakDirective };
