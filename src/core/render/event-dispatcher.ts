import {
  registerScopeDelegatedEventCleanup,
  registerScopeEventCleanup,
} from "../scope/scope.ts";

const DELEGATED_EVENT_TYPE = Symbol();
const DELEGATED_EVENT_LISTENER = Symbol();
const DELEGATED_EVENT_LISTENERS = Symbol();
const DELEGATED_EVENT_DOCUMENT = Symbol();
const delegatedEvents = new WeakSet<Event>();

const directEventTypes = new Set([
  "abort",
  "blur",
  "error",
  "focus",
  "load",
  "mouseenter",
  "mouseleave",
  "scroll",
]);

const delegatedRootEvents = new WeakMap<EventTarget, string | Set<string>>();

type DelegatedEventTarget = Element & {
  [DELEGATED_EVENT_TYPE]?: string;
  [DELEGATED_EVENT_LISTENER]?: EventListener;
  [DELEGATED_EVENT_LISTENERS]?: Map<string, EventListener>;
};

type DelegatedEventListener = EventListener & {
  [DELEGATED_EVENT_DOCUMENT]?: Document;
};

/** Returns whether an event type can use element-to-root delegation. */
export function canDelegateEvent(type: string): boolean {
  return !directEventTypes.has(type);
}

function dispatchDelegatedEvent(event: Event): void {
  if (delegatedEvents.has(event)) return;
  delegatedEvents.add(event);

  const path = event.composedPath();

  for (let i = 0, l = path.length; i < l; i++) {
    const target = path[i];

    if (!(target instanceof Element)) continue;

    const delegatedTarget = target as DelegatedEventTarget;
    const listener =
      delegatedTarget[DELEGATED_EVENT_TYPE] === event.type
        ? delegatedTarget[DELEGATED_EVENT_LISTENER]
        : delegatedTarget[DELEGATED_EVENT_LISTENERS]?.get(event.type);

    if (listener) listener.call(target, event);
    // cancelBubble is the only observable signal that stopPropagation() was called.
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    if (event.cancelBubble) return;
  }
}

function addDelegatedRootEventListener(root: EventTarget, type: string): void {
  const eventTypes = delegatedRootEvents.get(root);

  if (
    eventTypes === type ||
    (eventTypes instanceof Set && eventTypes.has(type))
  ) {
    return;
  }

  if (eventTypes === undefined) {
    delegatedRootEvents.set(root, type);
    root.addEventListener(type, dispatchDelegatedEvent);

    return;
  }

  if (typeof eventTypes === "string") {
    delegatedRootEvents.set(root, new Set([eventTypes, type]));
  } else {
    eventTypes.add(type);
  }

  root.addEventListener(type, dispatchDelegatedEvent);
}

function addDelegatedEventListener(
  target: DelegatedEventTarget,
  type: string,
  listener: DelegatedEventListener,
): void {
  const primaryType = target[DELEGATED_EVENT_TYPE];

  if (primaryType === undefined || primaryType === type) {
    target[DELEGATED_EVENT_TYPE] = type;
    target[DELEGATED_EVENT_LISTENER] = listener;
  } else {
    let listeners = target[DELEGATED_EVENT_LISTENERS];

    if (!listeners) {
      listeners = new Map();
      const primaryListener = target[DELEGATED_EVENT_LISTENER];

      if (primaryListener) listeners.set(primaryType, primaryListener);
      target[DELEGATED_EVENT_LISTENERS] = listeners;
    }

    listeners.set(type, listener);
  }

  const document = target.ownerDocument;
  const root = target.getRootNode();

  if (root !== document) {
    addDelegatedRootEventListener(root, type);
  }

  if (listener[DELEGATED_EVENT_DOCUMENT] === document) return;

  addDelegatedRootEventListener(document, type);

  listener[DELEGATED_EVENT_DOCUMENT] = document;
}

/** Registers a delegated element event whose eligibility was resolved at compile time. */
export function addScopeDelegatedEventListener(
  scope: ng.Scope,
  target: Element,
  type: string,
  listener: EventListener,
): void {
  addDelegatedEventListener(target, type, listener);
  registerScopeDelegatedEventCleanup(scope, target);
}

export function addScopeEventListener(
  scope: ng.Scope,
  target: EventTarget,
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
): void {
  if (
    options === undefined &&
    target instanceof Element &&
    typeof listener === "function" &&
    canDelegateEvent(type)
  ) {
    addScopeDelegatedEventListener(scope, target, type, listener);

    return;
  }

  if (options === undefined) {
    target.addEventListener(type, listener);
  } else {
    target.addEventListener(type, listener, options);
  }

  registerScopeEventCleanup(scope, target, type, listener, options);
}
