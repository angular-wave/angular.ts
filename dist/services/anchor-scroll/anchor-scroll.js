import { isInstanceOf, isString, isNumber, getNodeName, isFunction } from '../../shared/utils.js';
import { urlResolve } from '../../shared/url-utils/url-utils.js';

/** @internal */
function createAnchorScrollRuntimeState() {
    return {
        autoScrollingEnabled: true,
        destroyed: false,
        instances: new Set(),
    };
}
/** @internal */
function applyAnchorScrollConfiguration(state, config) {
    if (state.destroyed) {
        throw new Error("Anchor-scroll runtime has already been disposed.");
    }
    if (config.autoScrolling === undefined)
        return;
    const enabled = config.autoScrolling;
    state.autoScrollingEnabled = enabled;
    state.instances.forEach((instance) => {
        instance.setAutoScrolling(enabled);
    });
}
/** @internal */
function createAnchorScrollService(state, $location, $rootScope, runtimeDocument, runtimeWindow) {
    if (state.destroyed) {
        throw new Error("Anchor-scroll runtime has already been disposed.");
    }
    let destroyed = false;
    let removeLocationListener;
    let removeDestroyListener;
    const pendingLoadListeners = new Set();
    function getFirstAnchor(list) {
        for (let i = 0; i < list.length; i++) {
            const element = list[i];
            if (getNodeName(element) === "a") {
                return element;
            }
        }
        return undefined;
    }
    function getYOffset() {
        let offset = scroll.yOffset;
        if (isFunction(offset)) {
            offset = offset();
        }
        else if (isInstanceOf(offset, runtimeWindow.Element)) {
            const style = runtimeWindow.getComputedStyle(offset);
            offset =
                style.position === "fixed" ? offset.getBoundingClientRect().bottom : 0;
        }
        else if (!isNumber(offset)) {
            offset = 0;
        }
        return offset;
    }
    function scrollTo(element) {
        if (!element) {
            runtimeWindow.scrollTo(0, 0);
            return;
        }
        const rect = element.getBoundingClientRect();
        element.scrollIntoView();
        const offset = getYOffset();
        if (offset)
            runtimeWindow.scrollBy(0, rect.top - offset);
    }
    const scroll = (hashOrElement) => {
        if (isInstanceOf(hashOrElement, runtimeWindow.HTMLElement)) {
            scrollTo(hashOrElement);
            return;
        }
        const hash = isString(hashOrElement)
            ? hashOrElement
            : isNumber(hashOrElement)
                ? hashOrElement.toString()
                : $location.getHash();
        let element;
        if (!hash) {
            scrollTo();
        }
        else if ((element = runtimeDocument.getElementById(hash) ?? undefined)) {
            scrollTo(element);
        }
        else if ((element = getFirstAnchor(runtimeDocument.getElementsByName(hash)))) {
            scrollTo(element);
        }
        else if (hash === "top") {
            scrollTo();
        }
    };
    function clearPendingLoadListeners() {
        pendingLoadListeners.forEach((listener) => {
            runtimeWindow.removeEventListener("load", listener);
        });
        pendingLoadListeners.clear();
    }
    function scheduleScroll(hash) {
        if (runtimeDocument.readyState === "complete") {
            runtimeWindow.queueMicrotask(() => {
                if (!destroyed)
                    scroll(hash);
            });
            return;
        }
        const listener = () => {
            pendingLoadListeners.delete(listener);
            if (!destroyed)
                scroll(hash);
        };
        pendingLoadListeners.add(listener);
        runtimeWindow.addEventListener("load", listener, { once: true });
    }
    const instance = {
        setAutoScrolling(enabled) {
            removeLocationListener?.();
            removeLocationListener = undefined;
            clearPendingLoadListeners();
            if (!enabled || destroyed)
                return;
            removeLocationListener = $rootScope.$on("$locationChangeSuccess", (_event, newValue, oldValue) => {
                const newUrl = urlResolve(newValue);
                const oldUrl = urlResolve(oldValue);
                if (newUrl.hash === oldUrl.hash && newUrl.hash === "")
                    return;
                scheduleScroll(newUrl.hash);
            });
        },
        destroy() {
            if (destroyed)
                return;
            destroyed = true;
            removeLocationListener?.();
            removeLocationListener = undefined;
            removeDestroyListener?.();
            removeDestroyListener = undefined;
            clearPendingLoadListeners();
            state.instances.delete(instance);
        },
    };
    state.instances.add(instance);
    instance.setAutoScrolling(state.autoScrollingEnabled);
    removeDestroyListener = $rootScope.$on("$destroy", () => {
        instance.destroy();
    });
    return scroll;
}
/** @internal */
function destroyAnchorScrollRuntimeState(state) {
    if (state.destroyed)
        return;
    state.destroyed = true;
    [...state.instances].forEach((instance) => {
        instance.destroy();
    });
}

export { applyAnchorScrollConfiguration, createAnchorScrollRuntimeState, createAnchorScrollService, destroyAnchorScrollRuntimeState };
