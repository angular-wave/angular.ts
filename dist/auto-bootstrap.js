import { ngAttrPrefixes } from './shared/utils.js';

const automaticRoots = new WeakSet();
/** Returns whether a root contains a declarative application marker. @internal */
function hasDeclarativeApp(root) {
    return ngAttrPrefixes.some((prefix) => {
        const name = `${prefix}app`;
        return ((root.nodeType === Node.ELEMENT_NODE &&
            root.hasAttribute(name)) ||
            root.querySelector(`[${name}]`) !== null);
    });
}
/** Returns whether the internal scanner owns this bootstrap call. @internal */
function isAutomaticBootstrapRoot(root) {
    return automaticRoots.has(root);
}
function bootstrapApp(angular, root, modules) {
    automaticRoots.add(root);
    try {
        angular.bootstrap(root, modules);
    }
    finally {
        automaticRoots.delete(root);
    }
}
/** Finds and bootstraps the declarative application roots in a document. @internal */
function autoBootstrap(angular, root) {
    const apps = [];
    for (const prefix of ngAttrPrefixes) {
        const name = `${prefix}app`;
        const candidates = root.nodeType === Node.ELEMENT_NODE &&
            root.hasAttribute(name)
            ? [root]
            : root.querySelectorAll(`[${name}]`);
        candidates.forEach((element) => {
            apps.push({ element, module: element.getAttribute(name) });
        });
    }
    apps.forEach((app, index) => {
        const modules = app.module ? [app.module] : [];
        if (index === 0) {
            bootstrapApp(angular, app.element, modules);
            return;
        }
        const Runtime = angular.constructor;
        const subapp = new Runtime(true);
        angular.subapps.push(subapp);
        bootstrapApp(subapp, app.element, modules);
    });
}
/** Schedules declarative application discovery for the default browser entry. @internal */
function scheduleAutoBootstrap(angular, root, runtimeWindow) {
    const bootstrap = () => {
        autoBootstrap(angular, root);
    };
    if (root.readyState === "loading") {
        root.addEventListener("DOMContentLoaded", bootstrap, { once: true });
        return;
    }
    runtimeWindow.setTimeout(bootstrap, 0);
}

export { autoBootstrap, hasDeclarativeApp, isAutomaticBootstrapRoot, scheduleAutoBootstrap };
