import {
  getNodeName,
  isFunction,
  isInstanceOf,
  isNumber,
  isString,
} from "../../shared/utils.ts";
import { urlResolve } from "../../shared/url-utils/url-utils.ts";

export interface AnchorScrollService {
  /**
   * Invoke anchor scrolling.
   */
  (hashOrElement?: string | number | HTMLElement): void;

  /**
   * Vertical scroll offset.
   * Can be a number, a function returning a number,
   * or an Element whose offsetTop will be used.
   */
  yOffset?: number | (() => number) | Element;
}

/**
 * Declarative configuration accepted by
 * `NgModule.config({ $anchorScroll: ... })`.
 */
export interface AnchorScrollConfig {
  /**
   * Whether `$anchorScroll` automatically reacts to URL hash changes.
   */
  autoScrolling?: boolean;
}

type AnchorScrollWindow = Window &
  Pick<typeof globalThis, "Element" | "HTMLElement">;

interface AnchorScrollInstance {
  destroy(): void;
  setAutoScrolling(enabled: boolean): void;
}

/** @internal */
export interface AnchorScrollRuntimeState {
  autoScrollingEnabled: boolean;
  destroyed: boolean;
  readonly instances: Set<AnchorScrollInstance>;
}

/** @internal */
export function createAnchorScrollRuntimeState(): AnchorScrollRuntimeState {
  return {
    autoScrollingEnabled: true,
    destroyed: false,
    instances: new Set(),
  };
}

/** @internal */
export function applyAnchorScrollConfiguration(
  state: AnchorScrollRuntimeState,
  config: AnchorScrollConfig,
): void {
  if (state.destroyed) {
    throw new Error("Anchor-scroll runtime has already been disposed.");
  }

  if (config.autoScrolling === undefined) return;

  const enabled = config.autoScrolling;

  state.autoScrollingEnabled = enabled;
  state.instances.forEach((instance) => {
    instance.setAutoScrolling(enabled);
  });
}

/** @internal */
export function createAnchorScrollService(
  state: AnchorScrollRuntimeState,
  $location: ng.LocationService,
  $rootScope: ng.Scope,
  runtimeDocument: Document,
  runtimeWindow: AnchorScrollWindow,
): AnchorScrollService {
  if (state.destroyed) {
    throw new Error("Anchor-scroll runtime has already been disposed.");
  }

  let destroyed = false;
  let removeLocationListener: (() => void) | undefined;
  let removeDestroyListener: (() => void) | undefined;
  const pendingLoadListeners = new Set<EventListener>();

  function getFirstAnchor(
    list: NodeListOf<HTMLElement>,
  ): HTMLAnchorElement | undefined {
    for (let i = 0; i < list.length; i++) {
      const element = list[i];

      if (getNodeName(element) === "a") {
        return element as HTMLAnchorElement;
      }
    }

    return undefined;
  }

  function getYOffset(): number {
    let offset = scroll.yOffset;

    if (isFunction(offset)) {
      offset = offset();
    } else if (isInstanceOf(offset, runtimeWindow.Element)) {
      const style = runtimeWindow.getComputedStyle(offset);

      offset =
        style.position === "fixed" ? offset.getBoundingClientRect().bottom : 0;
    } else if (!isNumber(offset)) {
      offset = 0;
    }

    return offset;
  }

  function scrollTo(element?: HTMLElement): void {
    if (!element) {
      runtimeWindow.scrollTo(0, 0);

      return;
    }

    const rect = element.getBoundingClientRect();

    element.scrollIntoView();

    const offset = getYOffset();

    if (offset) runtimeWindow.scrollBy(0, rect.top - offset);
  }

  const scroll: AnchorScrollService = (hashOrElement) => {
    if (isInstanceOf(hashOrElement, runtimeWindow.HTMLElement)) {
      scrollTo(hashOrElement);

      return;
    }

    const hash = isString(hashOrElement)
      ? hashOrElement
      : isNumber(hashOrElement)
        ? hashOrElement.toString()
        : $location.getHash();

    let element: HTMLElement | undefined;

    if (!hash) {
      scrollTo();
    } else if ((element = runtimeDocument.getElementById(hash) ?? undefined)) {
      scrollTo(element);
    } else if (
      (element = getFirstAnchor(runtimeDocument.getElementsByName(hash)))
    ) {
      scrollTo(element);
    } else if (hash === "top") {
      scrollTo();
    }
  };

  function clearPendingLoadListeners(): void {
    pendingLoadListeners.forEach((listener) => {
      runtimeWindow.removeEventListener("load", listener);
    });
    pendingLoadListeners.clear();
  }

  function scheduleScroll(hash: string): void {
    if (runtimeDocument.readyState === "complete") {
      runtimeWindow.queueMicrotask(() => {
        if (!destroyed) scroll(hash);
      });

      return;
    }

    const listener: EventListener = () => {
      pendingLoadListeners.delete(listener);

      if (!destroyed) scroll(hash);
    };

    pendingLoadListeners.add(listener);
    runtimeWindow.addEventListener("load", listener, { once: true });
  }

  const instance: AnchorScrollInstance = {
    setAutoScrolling(enabled) {
      removeLocationListener?.();
      removeLocationListener = undefined;
      clearPendingLoadListeners();

      if (!enabled || destroyed) return;

      removeLocationListener = $rootScope.$on(
        "$locationChangeSuccess",
        (_event: ng.ScopeEvent, newValue: string, oldValue: string) => {
          const newUrl = urlResolve(newValue);
          const oldUrl = urlResolve(oldValue);

          if (newUrl.hash === oldUrl.hash && newUrl.hash === "") return;

          scheduleScroll(newUrl.hash);
        },
      );
    },
    destroy() {
      if (destroyed) return;

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
export function destroyAnchorScrollRuntimeState(
  state: AnchorScrollRuntimeState,
): void {
  if (state.destroyed) return;

  state.destroyed = true;
  [...state.instances].forEach((instance) => {
    instance.destroy();
  });
}
