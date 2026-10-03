import { nativeCapabilities } from "../generated/NativeCapabilityCatalog.ts";
import {
  NativeBridgeDispatcher,
} from "../bridge/NativeBridgeDispatcher.ts";
import type {
  NativeBridgeHandler,
  NativeBridgeReply,
} from "../bridge/NativeBridgeDispatcher.ts";
import {
  NATIVE_BRIDGE_MAX_MESSAGE_BYTES,
  NATIVE_BRIDGE_PROTOCOL_VERSION,
} from "../bridge/NativeBridgeProtocol.ts";
import { NativeBridgeSecurity } from "../bridge/NativeBridgeSecurity.ts";
import { NativeElementContractRegistry } from "../components/NativeElementContractRegistry.ts";

export interface NativeWebRuntime {
  readonly currentLocation: string | null;
  runJavaScript(source: string): Promise<void>;
}

export interface AngularNativeEnvironment {
  readonly platform: "harmonyos";
  readonly location: string;
  readonly session: string;
  readonly protocolVersion: 1;
  readonly maxMessageBytes: number;
  readonly capabilities: Readonly<Record<string, readonly string[]>>;
  readonly elements: readonly string[];
  readonly cssVariables: Readonly<Record<string, string>>;
}

export interface AngularNativeEvent {
  readonly protocol: 1;
  readonly target: string;
  readonly event: string;
  readonly data?: unknown;
}

export class AngularNativeWebHost {
  readonly environment: AngularNativeEnvironment;

  private readonly dispatcher: NativeBridgeDispatcher;
  private readonly runtime: NativeWebRuntime;
  private readonly queuedMessages: Array<NativeBridgeReply | AngularNativeEvent> = [];
  private ready = false;
  private closed = false;

  constructor(
    destinationLocation: string,
    runtime: NativeWebRuntime,
    handlers: Readonly<Record<string, NativeBridgeHandler>>,
    sessionToken: string,
    elements: NativeElementContractRegistry = new NativeElementContractRegistry(),
  ) {
    this.runtime = runtime;
    this.environment = createEnvironment(
      destinationLocation,
      sessionToken,
      elements.names(),
    );
    this.dispatcher = new NativeBridgeDispatcher(
      new NativeBridgeSecurity(destinationLocation, sessionToken),
      handlers,
      (reply) => this._emitReply(reply),
      elements,
    );
  }

  receive(message: string): void {
    if (this.closed) return;
    this.dispatcher.receive(message, this.runtime.currentLocation);
  }

  pageStarted(): void {
    if (!this.closed) this.ready = false;
  }

  async pageReady(): Promise<void> {
    if (this.closed) return;
    await this.runtime.runJavaScript(environmentScript(this.environment));
    if (this.closed) return;
    this.ready = true;
    const messages = this.queuedMessages.splice(0);
    for (const message of messages) {
      await this.runtime.runJavaScript(messageScript(message));
    }
  }

  emitEvent(target: string, event: string, data?: unknown): void {
    if (this.closed) return;
    this._emitMessage({
      protocol: NATIVE_BRIDGE_PROTOCOL_VERSION,
      target,
      event,
      ...(data === undefined ? {} : { data }),
    });
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.ready = false;
    this.queuedMessages.length = 0;
    this.dispatcher.close();
  }

  /** @internal */

  private _emitReply(reply: NativeBridgeReply): void {
    this._emitMessage(reply);
  }

  /** @internal */

  private _emitMessage(message: NativeBridgeReply | AngularNativeEvent): void {
    if (this.closed) return;
    if (!this.ready) {
      this.queuedMessages.push(message);
      return;
    }
    void this.runtime.runJavaScript(messageScript(message));
  }
}

function createEnvironment(
  location: string,
  session: string,
  elementNames: readonly string[],
): AngularNativeEnvironment {
  const capabilities: Record<string, readonly string[]> = {
    component: ["mount", "update", "invoke", "unmount"],
  };
  for (const capability of Object.values(nativeCapabilities)) {
    capabilities[capability.name] = capability.methods.map((method) => method.name);
  }
  return {
    platform: "harmonyos",
    location,
    session,
    protocolVersion: NATIVE_BRIDGE_PROTOCOL_VERSION,
    maxMessageBytes: NATIVE_BRIDGE_MAX_MESSAGE_BYTES,
    capabilities,
    elements: elementNames,
    cssVariables: {
      "--native-platform": "harmonyos",
      "--native-safe-area-top": "0px",
      "--native-safe-area-bottom": "0px",
    },
  };
}

function environmentScript(environment: AngularNativeEnvironment): string {
  return `(function(environment){var root=document.documentElement;if(!root)return;root.classList.remove("platform-web");root.classList.add("platform-harmonyos","native-shell");Object.keys(environment.cssVariables).forEach(function(name){root.style.setProperty(name,environment.cssVariables[name]);});window.angularNativeEnvironment=environment;window.dispatchEvent(new CustomEvent("ng:native:environment",{detail:environment}));})(${JSON.stringify(environment)});`;
}

function messageScript(message: NativeBridgeReply | AngularNativeEvent): string {
  return `window.angularNative&&window.angularNative.receive(${JSON.stringify(message)});`;
}
