import type {
  AngularRuntime,
  AngularRuntimeConstructorInput,
} from "./angular-runtime.ts";
import { ngAttrPrefixes } from "./shared/utils.ts";

interface AppElement {
  element: HTMLElement;
  module: string | null;
}

const automaticRoots = new WeakSet<HTMLElement | HTMLDocument>();

/** Returns whether a root contains a declarative application marker. @internal */
export function hasDeclarativeApp(root: HTMLElement | HTMLDocument): boolean {
  return ngAttrPrefixes.some((prefix) => {
    const name = `${prefix}app`;
    return (
      (root.nodeType === Node.ELEMENT_NODE &&
        (root as HTMLElement).hasAttribute(name)) ||
      root.querySelector(`[${name}]`) !== null
    );
  });
}

/** Returns whether the internal scanner owns this bootstrap call. @internal */
export function isAutomaticBootstrapRoot(
  root: HTMLElement | HTMLDocument,
): boolean {
  return automaticRoots.has(root);
}

function bootstrapApp(
  angular: AngularRuntime,
  root: HTMLElement,
  modules: string[],
): void {
  automaticRoots.add(root);
  try {
    angular.bootstrap(root, modules);
  } finally {
    automaticRoots.delete(root);
  }
}

/** Finds and bootstraps the declarative application roots in a document. @internal */
export function autoBootstrap(
  angular: AngularRuntime,
  root: HTMLElement | HTMLDocument,
): void {
  const apps: AppElement[] = [];

  for (const prefix of ngAttrPrefixes) {
    const name = `${prefix}app`;
    const candidates =
      root.nodeType === Node.ELEMENT_NODE &&
      (root as HTMLElement).hasAttribute(name)
        ? [root as HTMLElement]
        : root.querySelectorAll<HTMLElement>(`[${name}]`);

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

    const Runtime = angular.constructor as new (
      options: AngularRuntimeConstructorInput,
    ) => AngularRuntime;
    const subapp = new Runtime(true);
    angular.subapps.push(subapp);
    bootstrapApp(subapp, app.element, modules);
  });
}

/** Schedules declarative application discovery for the default browser entry. @internal */
export function scheduleAutoBootstrap(
  angular: AngularRuntime,
  root: HTMLDocument,
  runtimeWindow: Window,
): void {
  const bootstrap = (): void => {
    autoBootstrap(angular, root);
  };

  if (root.readyState === "loading") {
    root.addEventListener("DOMContentLoaded", bootstrap, { once: true });
    return;
  }

  runtimeWindow.setTimeout(bootstrap, 0);
}
