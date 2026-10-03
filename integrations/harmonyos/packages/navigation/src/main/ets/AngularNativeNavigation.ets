import { url } from "@kit.ArkTS";
import { common } from "@kit.AbilityKit";
import {
  AngularNativeDestination,
  AngularNativeWeb,
  HarmonySystemCapabilities,
} from "@angular-wave/angular-native-harmony-core";
import { HarmonyDestinationPlatform } from "./HarmonyDestinationPlatform.ts";
import { HarmonyNavigation } from "./HarmonyNavigation.ts";
import type { NavigationEntry } from "./HarmonyNavigation.ts";
import {
  HarmonyNavigationCapabilities,
} from "./HarmonyNavigationCapabilities.ts";
import type {
  HarmonyNavigationInvoker,
} from "./HarmonyNavigationCapabilities.ts";
import {
  HarmonyNavPathPlatform,
  navigationEntry,
} from "./HarmonyNavPathPlatform.ts";
import { openHarmonyExternalLocation } from "./HarmonyExternalNavigation.ets";

const DESTINATION_NAME = "angular-native";

interface AngularNativePathParameter {
  readonly entry: NavigationEntry;
}

interface AngularNativePathInfo {
  readonly name: string;
  readonly param: AngularNativePathParameter;
}

class NavigationReference implements HarmonyNavigationInvoker {
  private navigation: HarmonyNavigation | undefined;

  attach(navigation: HarmonyNavigation): void {
    this.navigation = navigation;
  }

  invoke(
    method: string,
    parameters: Readonly<Record<string, ESObject>> | null,
  ): Promise<ESObject> {
    if (this.navigation === undefined) {
      return Promise.reject(new Error("HarmonyOS navigation is not ready"));
    }
    return this.navigation.invoke(method, parameters);
  }
}

export class AngularNativeNavigationController {
  readonly stack: NavPathStack = new NavPathStack();
  readonly navigation: HarmonyNavigation;

  private readonly context: common.UIAbilityContext;
  private readonly rootLocation: string;
  private readonly reference = new NavigationReference();
  private readonly destinations: HarmonyDestinationPlatform<AngularNativeDestination>;

  constructor(context: common.UIAbilityContext, initialLocation: string) {
    this.context = context;
    this.rootLocation = safeApplicationLocation(initialLocation);
    const root: NavigationEntry = {
      id: "root",
      location: this.rootLocation,
      modal: false,
      transition: "none",
      state: {},
    };
    const rootDestination = this.createDestination(root);
    const pathPlatform = new HarmonyNavPathPlatform(
      this.stack,
      (location) => openHarmonyExternalLocation(this.context, location),
      DESTINATION_NAME,
    );
    this.destinations = new HarmonyDestinationPlatform(
      root,
      rootDestination,
      pathPlatform,
      (entry) => this.createDestination(entry),
    );
    this.navigation = new HarmonyNavigation(
      this.destinations,
      (data) => this.emitNavigationChange(data),
    );
    this.reference.attach(this.navigation);
    this.navigation.restore([root]);
    const rootPath: AngularNativePathInfo = {
      name: DESTINATION_NAME,
      param: { entry: root },
    };
    this.stack.pushPath(rootPath, false);
  }

  destination(entry: NavigationEntry): AngularNativeDestination {
    return this.destinations.resolve(entry.id);
  }

  back(): boolean {
    if (this.destinations.entries.length === 1) return false;
    void this.navigation.invoke("pop", {});
    return true;
  }

  close(): void {
    this.navigation.close();
    this.destinations.close();
  }

  private createDestination(entry: NavigationEntry): AngularNativeDestination {
    const location = new url.URL(entry.location, this.rootLocation).href;
    const system = new HarmonySystemCapabilities(this.context, location);
    return new AngularNativeDestination(
      location,
      new HarmonyNavigationCapabilities(system, this.reference),
    );
  }

  private emitNavigationChange(data: Readonly<Record<string, ESObject>>): void {
    const destination = this.destination(this.destinations.current);
    destination.web.host.emitEvent("navigation", "change", data);
  }
}

@Component
struct AngularNativeNavDestination {
  @Require @Prop controller: AngularNativeNavigationController;
  @Require @Prop entry: NavigationEntry;

  build() {
    NavDestination() {
      AngularNativeWeb({
        destination: this.controller.destination(this.entry).web,
        nativeSurface: this.controller.destination(this.entry).nativeSurface,
      });
    }
    .hideTitleBar(true)
    .mode(this.entry.modal ? NavDestinationMode.DIALOG : NavDestinationMode.STANDARD)
    .onBackPressed(() => this.controller.back());
  }
}

@Component
export struct AngularNativeNavigation {
  @Require @Prop initialLocation: string;

  private controller: AngularNativeNavigationController | undefined;

  aboutToAppear(): void {
    this.controller = new AngularNativeNavigationController(
      this.getUIContext().getHostContext() as common.UIAbilityContext,
      this.initialLocation,
    );
  }

  aboutToDisappear(): void {
    this.controller?.close();
  }

  @Builder
  destinationBuilder(_name: string, parameters: object) {
    if (this.controller !== undefined) {
      AngularNativeNavDestination({
        controller: this.controller,
        entry: navigationEntry(parameters),
      });
    }
  }

  build() {
    if (this.controller !== undefined) {
      Navigation(this.controller.stack) {}
        .mode(NavigationMode.Stack)
        .hideTitleBar(true)
        .navDestination(this.destinationBuilder);
    }
  }
}

function safeApplicationLocation(value: string): string {
  const location = new url.URL(value);
  if (!["http:", "https:", "resource:"].includes(location.protocol)) {
    throw new TypeError("AngularTS Native requires an HTTP, HTTPS, or resource location");
  }
  return location.href;
}
