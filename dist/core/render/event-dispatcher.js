import { registerScopeEventCleanup, registerScopeDelegatedEventCleanup } from '../scope/scope.js';

const DELEGATED_EVENT_TYPE = Symbol();
const DELEGATED_EVENT_LISTENER = Symbol();
const DELEGATED_EVENT_LISTENERS = Symbol();
const DELEGATED_EVENT_DOCUMENT = Symbol();
const delegatedEvents = new WeakSet();
const delegatedEventTypes = new Set([
    "change",
    "click",
    "copy",
    "cut",
    "dblclick",
    "input",
    "keydown",
    "keyup",
    "mousedown",
    "mousemove",
    "mouseout",
    "mouseover",
    "mouseup",
    "paste",
    "pointerdown",
    "pointermove",
    "pointerout",
    "pointerover",
    "pointerup",
    "touchend",
    "touchmove",
    "touchstart",
]);
const delegatedRootEvents = new WeakMap();
/** Returns whether an event type can use element-to-root delegation. */
function canDelegateEvent(type) {
    return delegatedEventTypes.has(type);
}
function dispatchDelegatedEvent(event) {
    if (delegatedEvents.has(event))
        return;
    delegatedEvents.add(event);
    const path = event.composedPath();
    for (let i = 0, l = path.length; i < l; i++) {
        const target = path[i];
        if (!(target instanceof Element))
            continue;
        const delegatedTarget = target;
        const listener = delegatedTarget[DELEGATED_EVENT_TYPE] === event.type
            ? delegatedTarget[DELEGATED_EVENT_LISTENER]
            : delegatedTarget[DELEGATED_EVENT_LISTENERS]?.get(event.type);
        if (listener)
            listener.call(target, event);
        // cancelBubble is the only observable signal that stopPropagation() was called.
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        if (event.cancelBubble || !event.bubbles)
            return;
    }
}
function addDelegatedRootEventListener(root, type) {
    const eventTypes = delegatedRootEvents.get(root);
    if (eventTypes === type ||
        (eventTypes instanceof Set && eventTypes.has(type))) {
        return;
    }
    if (eventTypes === undefined) {
        delegatedRootEvents.set(root, type);
        root.addEventListener(type, dispatchDelegatedEvent);
        return;
    }
    if (typeof eventTypes === "string") {
        delegatedRootEvents.set(root, new Set([eventTypes, type]));
    }
    else {
        eventTypes.add(type);
    }
    root.addEventListener(type, dispatchDelegatedEvent);
}
function addDelegatedEventListener(target, type, listener) {
    const primaryType = target[DELEGATED_EVENT_TYPE];
    if (primaryType === undefined || primaryType === type) {
        target[DELEGATED_EVENT_TYPE] = type;
        target[DELEGATED_EVENT_LISTENER] = listener;
    }
    else {
        let listeners = target[DELEGATED_EVENT_LISTENERS];
        if (!listeners) {
            listeners = new Map();
            const primaryListener = target[DELEGATED_EVENT_LISTENER];
            if (primaryListener)
                listeners.set(primaryType, primaryListener);
            target[DELEGATED_EVENT_LISTENERS] = listeners;
        }
        listeners.set(type, listener);
    }
    const document = target.ownerDocument;
    const root = target.getRootNode();
    if (root !== document) {
        addDelegatedRootEventListener(root, type);
    }
    if (listener[DELEGATED_EVENT_DOCUMENT] === document)
        return;
    addDelegatedRootEventListener(document, type);
    listener[DELEGATED_EVENT_DOCUMENT] = document;
}
/** Registers a delegated element event whose eligibility was resolved at compile time. */
function addScopeDelegatedEventListener(scope, target, type, listener) {
    addDelegatedEventListener(target, type, listener);
    // Linked nodes can later move into a shadow root or another document.
    const linkedDocument = target.ownerDocument;
    const directListener = (event) => {
        if (!event.bubbles ||
            !target.isConnected ||
            target.ownerDocument !== linkedDocument ||
            target.getRootNode() instanceof ShadowRoot) {
            dispatchDelegatedEvent(event);
        }
    };
    target.addEventListener(type, directListener);
    registerScopeEventCleanup(scope, target, type, directListener);
    registerScopeDelegatedEventCleanup(scope, target);
}
function addScopeEventListener(scope, target, type, listener, options) {
    if (options === undefined &&
        target instanceof Element &&
        typeof listener === "function" &&
        canDelegateEvent(type)) {
        addScopeDelegatedEventListener(scope, target, type, listener);
        return;
    }
    if (options === undefined) {
        target.addEventListener(type, listener);
    }
    else {
        target.addEventListener(type, listener, options);
    }
    registerScopeEventCleanup(scope, target, type, listener, options);
}

export { addScopeDelegatedEventListener, addScopeEventListener, canDelegateEvent };
