import { nativeCapabilities } from "../generated/NativeCapabilityCatalog.ts";
import {
  NativeElementContractRegistry,
} from "../components/NativeElementContractRegistry.ts";
import type {
  NativeElementContract,
  NativeElementPropertyType,
} from "../components/NativeElementContractRegistry.ts";
import {
  NATIVE_BRIDGE_PROTOCOL_VERSION,
  parseNativeBridgeRequest,
} from "./NativeBridgeProtocol.ts";
import type {
  NativeBridgeErrorCode,
  NativeBridgeRequest,
} from "./NativeBridgeProtocol.ts";
import { NativeBridgeSecurity } from "./NativeBridgeSecurity.ts";

type NativeParameters = Readonly<Record<string, unknown>> | null;

export interface NativeBridgeInvocationContext {
  readonly requestId: string;
  readonly cancelled: boolean;
  onCancel(action: () => void): void;
}

export interface NativeBridgeHandler {
  invoke(
    method: string,
    parameters: NativeParameters,
    context: NativeBridgeInvocationContext,
  ): unknown | Promise<unknown>;
  close?(): void;
}

export interface NativeBridgeError {
  readonly code: NativeBridgeErrorCode;
  readonly message: string;
}

export interface NativeBridgeReply {
  readonly protocol: 1;
  readonly id: string;
  readonly ok: boolean;
  readonly result?: unknown;
  readonly error?: NativeBridgeError;
}

export class NativeBridgeFailure extends Error {
  readonly code: NativeBridgeErrorCode;

  constructor(code: NativeBridgeErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export class NativeBridgeDispatcher {
  private readonly active = new Map<string, PendingRequest>();
  private readonly componentNames = new Map<string, string>();
  private readonly security: NativeBridgeSecurity;
  private readonly handlers: Readonly<Record<string, NativeBridgeHandler>>;
  private readonly reply: (reply: NativeBridgeReply) => void;
  private readonly elements: NativeElementContractRegistry;
  private closed = false;

  constructor(
    security: NativeBridgeSecurity,
    handlers: Readonly<Record<string, NativeBridgeHandler>>,
    reply: (reply: NativeBridgeReply) => void,
    elements: NativeElementContractRegistry = new NativeElementContractRegistry(),
  ) {
    this.security = security;
    this.handlers = handlers;
    this.reply = reply;
    this.elements = elements;
  }

  receive(message: string | null | undefined, currentLocation: string | null | undefined): void {
    const parsed = parseNativeBridgeRequest(message);
    if (parsed.ok === false) {
      if (parsed.id !== null) this.emitError(parsed.id, parsed.code, parsed.message);
      return;
    }

    const request = parsed.request;
    if (this.closed) {
      this.emitError(request.id, "interrupted", "Native destination was removed");
      return;
    }
    if (this.active.has(request.id)) {
      this.emitError(request.id, "invalid_message", "Native request id is already active");
      return;
    }
    if (!this.security.accepts(request.session, currentLocation)) {
      this.emitError(request.id, "unauthorized", "Native session or origin is invalid");
      return;
    }
    if (request.target === "bridge") {
      this.handleBridgeRequest(request);
      return;
    }

    const validation = this.validate(request);
    if (validation !== null) {
      this.emitError(request.id, validation.code, validation.message);
      return;
    }
    const handler = this.handlers[request.target];
    if (handler === undefined) {
      this.emitError(request.id, "unavailable", `Native target is unavailable: ${request.target}`);
      return;
    }

    const pending = new PendingRequest(request.id, (reply) => {
      this.active.delete(request.id);
      this.reply(reply);
    });
    this.active.set(request.id, pending);

    Promise.resolve()
      .then(() => handler.invoke(request.method, request.params, pending.context))
      .then((result) => {
        if (!pending.completed) {
          this.commitComponentState(request);
          pending.succeed(result);
        }
      })
      .catch((error: unknown) => {
        if (pending.completed) return;
        if (isNativeBridgeFailure(error)) {
          pending.fail(error.code, error.message);
        } else {
          pending.fail("internal", "Native operation failed");
        }
      });
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    for (const pending of [...this.active.values()]) {
      pending.cancel("interrupted", "Native destination was removed");
    }
    this.componentNames.clear();
    for (const handler of new Set(Object.values(this.handlers))) handler.close?.();
  }

  private handleBridgeRequest(request: NativeBridgeRequest): void {
    if (request.method !== "cancel") {
      this.emitError(request.id, "unknown_method", `Unsupported bridge method: ${request.method}`);
      return;
    }
    const requestId = stringProperty(request.params, "id");
    if (requestId === null) {
      this.emitError(request.id, "invalid_params", "bridge.cancel requires params.id");
      return;
    }
    const cancelled = this.active.get(requestId);
    cancelled?.cancel("cancelled", "Native request was cancelled");
    this.emitSuccess(request.id, { id: requestId, cancelled: cancelled !== undefined });
  }

  private validate(request: NativeBridgeRequest): NativeBridgeError | null {
    if (request.target === "component") return this.validateComponent(request);
    const capability = nativeCapabilities[request.target as keyof typeof nativeCapabilities];
    if (capability === undefined) {
      return { code: "unknown_target", message: `Unsupported native target: ${request.target}` };
    }
    if (!capability.methods.some((method) => method.name === request.method)) {
      return {
        code: "unknown_method",
        message: `Unsupported ${request.target} method: ${request.method}`,
      };
    }
    return null;
  }

  private validateComponent(request: NativeBridgeRequest): NativeBridgeError | null {
    if (!["mount", "update", "invoke", "unmount"].includes(request.method)) {
      return { code: "unknown_method", message: `Unsupported component method: ${request.method}` };
    }
    const id = stringProperty(request.params, "id");
    if (id === null) {
      return { code: "invalid_params", message: "component calls require params.id" };
    }
    if (request.method === "unmount") return null;

    const requestedName = stringProperty(request.params, "name");
    const name = requestedName ?? this.componentNames.get(id) ?? null;
    if (request.method === "mount" && name === null) {
      return { code: "invalid_params", message: "component.mount requires params.name" };
    }
    if (request.method !== "mount" && !this.componentNames.has(id)) {
      return { code: "unknown_instance", message: `Unknown native component instance: ${id}` };
    }
    const elementName = name as string;
    if (!this.elements.has(elementName)) {
      return { code: "unknown_element", message: `Unknown native element: ${elementName}` };
    }
    if (this.componentNames.has(id) && this.componentNames.get(id) !== elementName) {
      return { code: "invalid_params", message: `Native component ${id} cannot change type` };
    }

    const element = this.elements.get(elementName) as NativeElementContract;
    if (request.method === "invoke") {
      const method = stringProperty(request.params, "method");
      if (method === null) {
        return { code: "invalid_params", message: "component.invoke requires params.method" };
      }
      if (!element.methods.some((entry) => entry.name === method)) {
        return { code: "unknown_method", message: `Unsupported ${elementName} method: ${method}` };
      }
      return null;
    }

    const properties = recordProperty(request.params, "props");
    if (properties === null) return null;
    return validateNativeProperties(
      this.elements,
      elementName,
      properties,
      request.method === "mount",
    );
  }

  private commitComponentState(request: NativeBridgeRequest): void {
    if (request.target !== "component") return;
    const id = stringProperty(request.params, "id") as string;
    if (request.method === "mount") {
      this.componentNames.set(id, stringProperty(request.params, "name") as string);
    } else if (request.method === "unmount") {
      this.componentNames.delete(id);
    }
  }

  private emitSuccess(id: string, result: unknown): void {
    this.reply({ protocol: NATIVE_BRIDGE_PROTOCOL_VERSION, id, ok: true, result });
  }

  private emitError(id: string, code: NativeBridgeErrorCode, message: string): void {
    this.reply({ protocol: NATIVE_BRIDGE_PROTOCOL_VERSION, id, ok: false, error: { code, message } });
  }
}

function isNativeBridgeFailure(error: unknown): error is NativeBridgeFailure {
  if (error instanceof NativeBridgeFailure) return true;
  if (!(error instanceof Error) || !("code" in error)) return false;
  return [
    "invalid_message",
    "unauthorized",
    "unknown_target",
    "unknown_method",
    "invalid_params",
    "unavailable",
    "cancelled",
    "interrupted",
    "unknown_element",
    "unknown_instance",
    "internal",
  ].includes(String(error.code));
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

class PendingRequest {
  readonly context: NativeBridgeInvocationContext;
  completed = false;
  private readonly cancellationActions: Array<() => void> = [];
  private readonly id: string;
  private readonly finish: (reply: NativeBridgeReply) => void;

  constructor(
    id: string,
    finish: (reply: NativeBridgeReply) => void,
  ) {
    this.id = id;
    this.finish = finish;
    const pending = this;
    this.context = {
      requestId: id,
      get cancelled(): boolean {
        return pending.completed;
      },
      onCancel(action: () => void): void {
        if (!pending.completed) pending.cancellationActions.push(action);
      },
    };
  }

  succeed(result: unknown): void {
    this.complete({ protocol: NATIVE_BRIDGE_PROTOCOL_VERSION, id: this.id, ok: true, result });
  }

  fail(code: NativeBridgeErrorCode, message: string): void {
    this.complete({
      protocol: NATIVE_BRIDGE_PROTOCOL_VERSION,
      id: this.id,
      ok: false,
      error: { code, message },
    });
  }

  cancel(code: "cancelled" | "interrupted", message: string): void {
    for (const action of this.cancellationActions.splice(0)) action();
    this.fail(code, message);
  }

  private complete(reply: NativeBridgeReply): void {
    this.completed = true;
    this.cancellationActions.length = 0;
    this.finish(reply);
  }
}

function stringProperty(parameters: NativeParameters, name: string): string | null {
  const value = parameters?.[name];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function recordProperty(
  parameters: NativeParameters,
  name: string,
): Readonly<Record<string, unknown>> | null {
  const value = parameters?.[name];
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : null;
}

function validPropertyValue(
  definition: { readonly type: NativeElementPropertyType; readonly nullable?: boolean },
  value: unknown,
): boolean {
  if (value === null) return definition.nullable === true;
  switch (definition.type) {
    case "BOOLEAN":
      return typeof value === "boolean";
    case "FLOAT":
      return typeof value === "number" && Number.isFinite(value);
    case "INTEGER":
      return typeof value === "number" && Number.isInteger(value);
    case "COLOR":
    case "STRING":
      return typeof value === "string";
    case "STRING_LIST":
      return Array.isArray(value) && value.every((entry) => typeof entry === "string");
    case "JSON":
      return true;
  }
}

interface NativePropertyDefinition {
  readonly name: string;
  readonly type: NativeElementPropertyType;
  readonly nullable?: boolean;
  readonly required?: boolean;
}

interface PendingElementValidation {
  readonly name: string;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly requireRequired: boolean;
  readonly depth: number;
}

function validateNativeProperties(
  elements: NativeElementContractRegistry,
  rootName: string,
  rootProperties: Readonly<Record<string, unknown>>,
  requireRequired: boolean,
): NativeBridgeError | null {
  const pending: PendingElementValidation[] = [{
    name: rootName,
    properties: rootProperties,
    requireRequired,
    depth: 0,
  }];
  let count = 0;
  while (pending.length > 0) {
    const current = pending.pop() as PendingElementValidation;
    count++;
    if (count > 2048 || current.depth > 64) {
      return { code: "invalid_property", message: "Native component tree exceeds its limit" };
    }
    const element = elements.get(current.name) as NativeElementContract;
    const definitions = new Map<string, NativePropertyDefinition>(
      element.properties.map((property) => [property.name, property]),
    );
    for (const [property, value] of Object.entries(current.properties)) {
      if (property === "style" && isRecord(value)) continue;
      const definition = definitions.get(property);
      if (definition === undefined || !validPropertyValue(definition, value)) {
        return {
          code: "invalid_property",
          message: `Invalid ${current.name} property: ${property}`,
        };
      }
      if (property !== "children") continue;
      if (!Array.isArray(value)) {
        return { code: "invalid_property", message: `Invalid ${current.name} children` };
      }
      for (const child of value) {
        if (!isRecord(child)) {
          return { code: "invalid_property", message: `Invalid ${current.name} child` };
        }
        const childName = child.name;
        const childKey = child.key;
        const childProperties = child.props;
        if (
          typeof childName !== "string" ||
          !elements.has(childName) ||
          typeof childKey !== "string" ||
          childKey.length === 0 ||
          !isRecord(childProperties)
        ) {
          return { code: "invalid_property", message: `Invalid ${current.name} child descriptor` };
        }
        pending.push({
          name: childName,
          properties: childProperties,
          requireRequired: true,
          depth: current.depth + 1,
        });
      }
    }
    if (current.requireRequired) {
      for (const definition of definitions.values()) {
        if (
          definition.required === true &&
          !(definition.name in current.properties)
        ) {
          return {
            code: "invalid_property",
            message: `Missing required ${current.name} property: ${definition.name}`,
          };
        }
      }
    }
  }
  return null;
}
