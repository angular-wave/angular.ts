function addScopeEventListener(scope, target, type, listener, options) {
    if (options === undefined) {
        target.addEventListener(type, listener);
    }
    else {
        target.addEventListener(type, listener, options);
    }
    scope.on("$destroy", () => {
        if (options === undefined) {
            target.removeEventListener(type, listener);
        }
        else {
            target.removeEventListener(type, listener, options);
        }
    });
}

export { addScopeEventListener };
