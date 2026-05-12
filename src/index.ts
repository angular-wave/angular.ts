import { Angular } from "./angular.ts";

type NativeBridgeWindow = Window & {
  AngularNative?: {
    receive(message: string): void;
  };
  angularNative?: {
    receive(message: string | object): void;
  };
};

let nativeNavigationId = 0;

function createNativeNavigationCall(location: string, action: string): string {
  return JSON.stringify({
    id: `angular-native-navigation-${Date.now()}-${nativeNavigationId++}`,
    target: "navigation",
    method: "visit",
    params: {
      url: location,
      action,
    },
  });
}

function dispatchNativeNavigation(
  location: string,
  action = "advance",
): boolean {
  const nativeWindow = window as NativeBridgeWindow;
  const payload = createNativeNavigationCall(location, action);
  const adapter =
    nativeWindow.AngularNative?.receive ?? nativeWindow.angularNative?.receive;

  if (!adapter) {
    return false;
  }

  adapter(payload);
  return true;
}

function shouldInterceptAnchorClick(
  event: MouseEvent,
  anchor: HTMLAnchorElement,
) {
  if (event.defaultPrevented) return false;
  if (event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }
  if (anchor.hasAttribute("download")) return false;
  if (anchor.getAttribute("target")) return false;
  if (anchor.hasAttribute("data-native-ignore")) return false;

  return true;
}

function normalizeNavigationHref(href: string): string | null {
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  if (
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:")
  ) {
    return null;
  }

  const url = new URL(trimmed, window.location.href);
  const current = new URL(window.location.href);

  if (url.origin !== current.origin) return null;
  if (
    url.pathname === current.pathname &&
    url.search === current.search &&
    url.hash
  ) {
    return null;
  }

  return url.toString();
}

function installNativeLinkInterception(): void {
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const anchor = event.target.closest("a[href]") as HTMLAnchorElement | null;

    if (!anchor || !shouldInterceptAnchorClick(event, anchor)) return;

    const action = anchor.getAttribute("data-native-action") || "advance";
    const location = normalizeNavigationHref(anchor.getAttribute("href") || "");

    if (!location) return;

    event.preventDefault();

    if (!dispatchNativeNavigation(location, action)) {
      window.location.assign(location);
    }
  });
}

/**
 * Default browser entry point.
 *
 * It creates the shared `angular` singleton and bootstraps discovered apps
 * once the DOM is ready.
 */
export const angular = new Angular();

export { HttpRestBackend } from "./services/rest/rest.ts";
export type {
  CachedRestBackendOptions,
  RestBackend,
  RestCacheStore,
  RestCacheStrategy,
  RestOptions,
  RestRequest,
  RestResponse,
  RestRevalidateEvent,
} from "./services/rest/rest.ts";

/**
 * Auto-bootstrap the document once the browser DOM is ready.
 */
document.addEventListener("DOMContentLoaded", () => {
  installNativeLinkInterception();
  angular.init(document);
});
