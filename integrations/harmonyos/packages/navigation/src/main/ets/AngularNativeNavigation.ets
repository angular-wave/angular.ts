import { url } from "@kit.ArkTS";
import { common } from "@kit.AbilityKit";
import {
  AngularNativeDestination,
  AngularNativeWeb,
  HarmonySystemCapabilities,
} from "@angular-wave/angular-native-harmony-core";
import type {
  ArkUISameLayerControllerFactory,
  AngularNativeDestinationOptions,
} from "@angular-wave/angular-native-harmony-core";
import { HarmonyDestinationPlatform } from "./HarmonyDestinationPlatform.ts";
import { HarmonyNavigation } from "./HarmonyNavigation.ts";
import type { NavigationEntry } from "./HarmonyNavigation.ts";
import type { NavigationTransition } from "./HarmonyNavigation.ts";
import {
  navigationMotionDuration,
  navigationMotionFrame,
} from "./HarmonyNavigationMotion.ts";
import type {
  NavigationMotionFrame,
  NavigationMotionRole,
} from "./HarmonyNavigationMotion.ts";
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

interface NavigationMotionTarget {
  apply(frame: NavigationMotionFrame): void;
}

type NavigationMotionSink = (frame: NavigationMotionFrame) => void;

class NavigationMotionTargetReference implements NavigationMotionTarget {
  private readonly sink: NavigationMotionSink;

  constructor(sink: NavigationMotionSink) {
    this.sink = sink;
  }

  apply(frame: NavigationMotionFrame): void {
    this.sink(frame);
  }
}

interface ResolvedNavigationMotion {
  readonly duration: number;
  readonly forward: boolean;
  readonly from: NavigationMotionTarget;
  readonly to: NavigationMotionTarget;
  readonly transition: NavigationTransition;
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
  private readonly nativeControllerFactory: ArkUISameLayerControllerFactory | undefined;
  private readonly reference = new NavigationReference();
  private readonly destinations: HarmonyDestinationPlatform<AngularNativeDestination>;
  private readonly motionTargets: Map<string, NavigationMotionTarget> = new Map();

  constructor(
    context: common.UIAbilityContext,
    initialLocation: string,
    nativeControllerFactory?: ArkUISameLayerControllerFactory,
  ) {
    this.context = context;
    this.rootLocation = safeApplicationLocation(initialLocation);
    this.nativeControllerFactory = nativeControllerFactory;
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

  registerMotionTarget(id: string, target: NavigationMotionTarget): void {
    this.motionTargets.set(id, target);
  }

  unregisterMotionTarget(id: string, target: NavigationMotionTarget): void {
    if (this.motionTargets.get(id) === target) this.motionTargets.delete(id);
  }

  resolveMotion(
    from: NavContentInfo,
    to: NavContentInfo,
    operation: NavigationOperation,
  ): ResolvedNavigationMotion | undefined {
    if (from.navDestinationId === undefined || to.navDestinationId === undefined) return undefined;
    const fromTarget = this.motionTargets.get(from.navDestinationId);
    const toTarget = this.motionTargets.get(to.navDestinationId);
    if (fromTarget === undefined || toTarget === undefined) return undefined;
    const forward = operation !== NavigationOperation.POP;
    const entry = navigationEntry(forward ? to.param : from.param);
    const duration = navigationMotionDuration(entry.transition);
    if (duration === 0) return undefined;
    return {
      duration,
      forward,
      from: fromTarget,
      to: toTarget,
      transition: entry.transition,
    };
  }

  close(): void {
    this.navigation.close();
    this.destinations.close();
  }

  private createDestination(entry: NavigationEntry): AngularNativeDestination {
    const location = new url.URL(entry.location, this.rootLocation).href;
    const system = new HarmonySystemCapabilities(this.context, location);
    const options: AngularNativeDestinationOptions = {
      nativeControllerFactory: this.nativeControllerFactory,
    };
    return new AngularNativeDestination(
      location,
      new HarmonyNavigationCapabilities(system, this.reference),
      options,
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

  @State opacityValue: number = 1;
  @State rotationY: number = 0;
  @State scaleValue: number = 1;
  @State translateX: string = "0%";
  @State translateY: string = "0%";

  private destinationId: string = "";
  private readonly motionTarget: NavigationMotionTarget =
    new NavigationMotionTargetReference(
      (frame: NavigationMotionFrame): void => this.applyMotion(frame),
    );

  private applyMotion(frame: NavigationMotionFrame): void {
    this.opacityValue = frame.opacity;
    this.rotationY = frame.rotationY;
    this.scaleValue = frame.scale;
    this.translateX = frame.translateX;
    this.translateY = frame.translateY;
  }

  build() {
    NavDestination() {
      AngularNativeWeb({
        destination: this.controller.destination(this.entry).web,
        nativeSurface: this.controller.destination(this.entry).nativeSurface,
      });
    }
    .hideTitleBar(true)
    .mode(this.entry.modal ? NavDestinationMode.DIALOG : NavDestinationMode.STANDARD)
    .opacity(this.opacityValue)
    .translate({ x: this.translateX, y: this.translateY })
    .scale({ x: this.scaleValue, y: this.scaleValue })
    .rotate({ y: 1, angle: this.rotationY, perspective: 800 })
    .onReady((context: NavDestinationContext) => {
      if (context.navDestinationId !== undefined) {
        this.destinationId = context.navDestinationId;
        this.controller.registerMotionTarget(this.destinationId, this.motionTarget);
      }
    })
    .onDisAppear(() => {
      if (this.destinationId.length > 0) {
        this.controller.unregisterMotionTarget(this.destinationId, this.motionTarget);
      }
    })
    .onBackPressed(() => this.controller.back());
  }
}

@Component
export struct AngularNativeNavigation {
  @Require @Prop initialLocation: string;
  @Prop nativeControllerFactory: ArkUISameLayerControllerFactory | undefined = undefined;

  private controller: AngularNativeNavigationController | undefined;

  aboutToAppear(): void {
    this.controller = new AngularNativeNavigationController(
      this.getUIContext().getHostContext() as common.UIAbilityContext,
      this.initialLocation,
      this.nativeControllerFactory,
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

  private customTransition(
    from: NavContentInfo,
    to: NavContentInfo,
    operation: NavigationOperation,
  ): NavigationAnimatedTransition | undefined {
    const motion = this.controller?.resolveMotion(from, to, operation);
    if (motion === undefined) return undefined;
    return {
      timeout: motion.duration + 100,
      transition: (proxy: NavigationTransitionProxy): void => {
        this.applyMotionStage(motion, "start");
        this.getUIContext().animateTo({
          duration: motion.duration,
          curve: Curve.EaseInOut,
          onFinish: (): void => proxy.finishTransition(),
        }, () => this.applyMotionStage(motion, "end"));
      },
    };
  }

  private applyMotionStage(
    motion: ResolvedNavigationMotion,
    stage: "start" | "end",
  ): void {
    this.applyMotionTarget(motion.from, motion, "exit", stage);
    this.applyMotionTarget(motion.to, motion, "enter", stage);
  }

  private applyMotionTarget(
    target: NavigationMotionTarget,
    motion: ResolvedNavigationMotion,
    role: NavigationMotionRole,
    stage: "start" | "end",
  ): void {
    target.apply(navigationMotionFrame(
      motion.transition,
      role,
      motion.forward,
      stage,
    ));
  }

  build() {
    if (this.controller !== undefined) {
      Navigation(this.controller.stack) {}
        .mode(NavigationMode.Stack)
        .hideTitleBar(true)
        .navDestination(this.destinationBuilder)
        .customNavContentTransition((
          from: NavContentInfo,
          to: NavContentInfo,
          operation: NavigationOperation,
        ) => this.customTransition(from, to, operation));
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
