import { url } from "@kit.ArkTS";
import { webview } from "@kit.ArkWeb";
import type { NativeBridgeHandler } from "../bridge/NativeBridgeDispatcher.ts";
import {
  AngularNativeWebHost,
} from "./AngularNativeWebHost.ts";
import type { NativeWebRuntime } from "./AngularNativeWebHost.ts";
import { createHarmonySessionToken } from "./HarmonySessionToken.ets";
import { NativeElementContractRegistry } from "../components/NativeElementContractRegistry.ts";

interface WebPermissionEntry {
  readonly scheme: string;
  readonly host: string;
  readonly port: string;
  readonly path: string;
}

interface WebMethodPermission {
  readonly methodName: string;
  readonly urlPermissionList: Array<WebPermissionEntry>;
}

interface JavaScriptProxyPermission {
  readonly urlPermissionList: Array<WebPermissionEntry>;
  readonly methodList: Array<WebMethodPermission>;
}

interface WebProxyPermission {
  readonly javascriptProxyPermission: JavaScriptProxyPermission;
}

class ArkWebRuntime implements NativeWebRuntime {
  private readonly controller: webview.WebviewController;
  currentLocation: string | null;

  constructor(
    controller: webview.WebviewController,
    location: string,
  ) {
    this.controller = controller;
    this.currentLocation = location;
  }

  setLocation(location: string): void {
    this.currentLocation = location;
  }

  async runJavaScript(source: string): Promise<void> {
    await this.controller.runJavaScript(source);
  }
}

export class AngularNativeJavaScriptProxy {
  private readonly host: AngularNativeWebHost;
  constructor(host: AngularNativeWebHost) {
    this.host = host;}

  receive(message: string): void {
    this.host.receive(message);
  }
}

export class ArkWebDestination {
  readonly location: string;
  readonly source: string | Resource;
  readonly controller: webview.WebviewController = new webview.WebviewController();
  readonly host: AngularNativeWebHost;
  readonly proxy: AngularNativeJavaScriptProxy;
  readonly permission: string;

  private readonly runtime: ArkWebRuntime;
  private readonly routeDecision: (location: string) => boolean;

  constructor(
    location: string,
    handlers: Readonly<Record<string, NativeBridgeHandler>>,
    elements: NativeElementContractRegistry = new NativeElementContractRegistry(),
    source: string | Resource = location,
    routeDecision: (location: string) => boolean = () => false,
  ) {
    this.location = location;
    this.source = source;
    this.routeDecision = routeDecision;
    this.runtime = new ArkWebRuntime(this.controller, location);
    this.host = new AngularNativeWebHost(
      location,
      this.runtime,
      handlers,
      createHarmonySessionToken(),
      elements,
    );
    this.proxy = new AngularNativeJavaScriptProxy(this.host);
    this.permission = proxyPermission(location);
  }

  intercept(location: string): boolean {
    return this.routeDecision(location);
  }

  pageStarted(location: string): void {
    this.runtime.setLocation(location);
    this.host.pageStarted();
  }

  async pageReady(location: string): Promise<void> {
    this.runtime.setLocation(location);
    await this.host.pageReady();
  }

  close(): void {
    this.host.close();
    this.controller.deleteJavaScriptRegister("AngularNative");
  }
}

function proxyPermission(location: string): string {
  const value = new url.URL(location);
  const entry: WebPermissionEntry = {
    scheme: value.protocol.slice(0, -1),
    host: value.hostname,
    port: value.port,
    path: "",
  };
  const permission: WebProxyPermission = {
    javascriptProxyPermission: {
      urlPermissionList: [entry],
      methodList: [{ methodName: "receive", urlPermissionList: [entry] }],
    },
  };
  return JSON.stringify(permission);
}
