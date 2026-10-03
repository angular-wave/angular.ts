import { url, util } from "@kit.ArkTS";
import {
  AbilityLifecycleCallback,
  UIAbility,
  abilityAccessCtrl,
  common,
} from "@kit.AbilityKit";
import type { Permissions } from "@ohos.abilityAccessCtrl";
import {
  deviceInfo,
  pasteboard,
  request,
} from "@kit.BasicServicesKit";
import { window } from "@kit.ArkUI";
import { camera, cameraPicker } from "@kit.CameraKit";
import { fileIo, picker } from "@kit.CoreFileKit";
import { resourceManager } from "@kit.LocalizationKit";
import { geoLocationManager } from "@kit.LocationKit";
import { connection } from "@kit.NetworkKit";
import { notificationManager } from "@kit.NotificationKit";
import { vibrator } from "@kit.SensorServiceKit";
import { userAuth } from "@kit.UserAuthenticationKit";
import { NativeBridgeFailure } from "../bridge/NativeBridgeDispatcher.ts";
import type { NativeBridgeInvocationContext } from "../bridge/NativeBridgeDispatcher.ts";
import type { HarmonyCapabilityPlatform } from "./HarmonyCapabilities.ts";
import {
  connectivityStatus,
  fileStatus,
  geolocationPosition,
  lifecycleStatus,
  permissionStatus,
  windowStatus,
} from "./HarmonyCapabilityContracts.ts";

type CapabilityEmitter = (
  event: string,
  data: Readonly<Record<string, ESObject>>,
) => void;

interface SelectedFile {
  readonly uri: string;
  readonly name: string | null;
  readonly size: number | null;
  readonly type: string | null;
  readonly persisted: boolean;
}

interface SelectedFiles {
  readonly files: Array<SelectedFile>;
}

interface UploadProgress {
  readonly uploadId: string;
  readonly sent: number;
  readonly total: number | null;
}

class UploadHeaders {
  Accept: string = "application/json";
}

class DestinationLifecycleCallback extends AbilityLifecycleCallback {
  private readonly context: common.UIAbilityContext;
  private readonly update: (state: "foreground" | "background" | "inactive") => void;
  constructor(
    context: common.UIAbilityContext,
    update: (state: "foreground" | "background" | "inactive") => void,
  ) {
    super();
    this.context = context;
    this.update = update;}

  onAbilityCreate(_ability: UIAbility): void {}
  onWindowStageCreate(_ability: UIAbility, _stage: window.WindowStage): void {}
  onWindowStageActive(ability: UIAbility, _stage: window.WindowStage): void { this.match(ability, "foreground"); }
  onWindowStageInactive(ability: UIAbility, _stage: window.WindowStage): void { this.match(ability, "inactive"); }
  onWindowStageDestroy(_ability: UIAbility, _stage: window.WindowStage): void {}
  onAbilityDestroy(ability: UIAbility): void { this.match(ability, "inactive"); }
  onAbilityForeground(ability: UIAbility): void { this.match(ability, "foreground"); }
  onAbilityBackground(ability: UIAbility): void { this.match(ability, "background"); }
  onAbilityContinue(_ability: UIAbility): void {}

  private match(ability: UIAbility, state: "foreground" | "background" | "inactive"): void {
    if (ability.context === this.context) this.update(state);
  }
}

export class HarmonySystemCapabilities implements HarmonyCapabilityPlatform {
  private readonly context: common.UIAbilityContext;
  private readonly origin: url.URL;
  private readonly networkConnections = new Set<connection.NetConnection>();
  private lifecycleState: "foreground" | "background" | "inactive" = "foreground";
  private lifecycleEmitter: CapabilityEmitter | undefined;
  private lifecycleCallbackId: number | undefined;
  private windowInstance: window.Window | undefined;
  private windowListener: ((size: window.Size) => void) | undefined;

  constructor(context: common.UIAbilityContext, applicationLocation: string) {
    this.context = context;
    this.origin = new url.URL(applicationLocation);
  }

  call(
    target: string,
    method: string,
    parameters: Readonly<Record<string, ESObject>>,
    context: NativeBridgeInvocationContext,
    emit: CapabilityEmitter,
  ): ESObject | Promise<ESObject> {
    switch (target) {
      case "platform": return this.platform(method);
      case "permissions": return this.permissions(method, parameters);
      case "clipboard": return this.clipboard(method, parameters);
      case "sharing": return this.share(method, parameters);
      case "intents": return this.intent(method, parameters);
      case "haptics": return this.haptics(method, parameters);
      case "connectivity": return this.connectivity(method, emit, context);
      case "lifecycle": return this.lifecycle(method, emit);
      case "notifications": return this.notifications(method);
      case "geolocation": return this.geolocation(method, parameters);
      case "biometrics": return this.biometrics(method);
      case "camera": return this.camera(method);
      case "files": return this.files(method, parameters, context, emit);
      case "window": return this.window(method, emit);
      default:
        throw new NativeBridgeFailure("unavailable", `HarmonyOS capability provider is unavailable: ${target}`);
    }
  }

  closeTarget(target: string): void {
    if (target === "connectivity") {
      for (const value of this.networkConnections) value.unregister(() => undefined);
      this.networkConnections.clear();
    } else if (target === "lifecycle") {
      this.lifecycleEmitter = undefined;
      if (this.lifecycleCallbackId !== undefined) {
        void this.context.getApplicationContext().off("abilityLifecycle", this.lifecycleCallbackId);
        this.lifecycleCallbackId = undefined;
      }
    } else if (target === "window") {
      if (this.windowInstance !== undefined && this.windowListener !== undefined) {
        this.windowInstance.off("windowSizeChange", this.windowListener);
      }
      this.windowInstance = undefined;
      this.windowListener = undefined;
    }
  }

  setLifecycleState(state: "foreground" | "background" | "inactive"): void {
    if (this.lifecycleState === state) return;
    this.lifecycleState = state;
    this.lifecycleEmitter?.("change", lifecycleStatus(state));
  }

  private platform(method: string): ESObject {
    requireMethod(method, "status", "platform");
    return {
      platform: "harmonyos",
      sdk: deviceInfo.sdkApiVersion,
      package: this.context.applicationInfo.name,
      darkMode: this.context.resourceManager.getConfigurationSync().colorMode === resourceManager.ColorMode.DARK,
    };
  }

  private async permissions(
    method: string,
    parameters: Readonly<Record<string, ESObject>>,
  ): Promise<ESObject> {
    const permission = requiredString(parameters, "permission") as Permissions;
    const manager = abilityAccessCtrl.createAtManager();
    if (method === "status") {
      const status = await manager.checkAccessToken(
        this.context.applicationInfo.accessTokenId,
        permission,
      );
      return permissionStatus(permission, status === abilityAccessCtrl.GrantStatus.PERMISSION_GRANTED);
    }
    requireMethod(method, "request", "permissions");
    const result = await manager.requestPermissionsFromUser(this.context, [permission]);
    return permissionStatus(permission, result.authResults[0] === abilityAccessCtrl.GrantStatus.PERMISSION_GRANTED);
  }

  private async clipboard(
    method: string,
    parameters: Readonly<Record<string, ESObject>>,
  ): Promise<ESObject> {
    const board = pasteboard.getSystemPasteboard();
    if (method === "read") {
      if (!(await board.hasData())) return { text: null };
      return { text: (await board.getData()).getPrimaryText() };
    }
    requireMethod(method, "write", "clipboard");
    const text = requiredString(parameters, "text");
    await board.setData(pasteboard.createData(pasteboard.MIMETYPE_TEXT_PLAIN, text));
    return { written: true };
  }

  private async share(
    method: string,
    parameters: Readonly<Record<string, ESObject>>,
  ): Promise<ESObject> {
    requireMethod(method, "share", "sharing");
    const text = requiredString(parameters, "text");
    await this.context.startAbility({
      action: "ohos.want.action.sendData",
      type: "text/plain",
      parameters: { "ability.params.stream": text },
    });
    return { opened: true };
  }

  private async intent(
    method: string,
    parameters: Readonly<Record<string, ESObject>>,
  ): Promise<ESObject> {
    requireMethod(method, "open", "intents");
    const uri = safeExternalUri(requiredString(parameters, "url"));
    await this.context.startAbility({ action: "ohos.want.action.viewData", uri });
    return { opened: true, uri };
  }

  private async haptics(
    method: string,
    parameters: Readonly<Record<string, ESObject>>,
  ): Promise<ESObject> {
    requireMethod(method, "perform", "haptics");
    const style = optionalString(parameters, "style", "click");
    const duration = style === "longPress" ? 60 : style === "keyboard" ? 12 : 30;
    if (!["click", "keyboard", "longPress"].includes(style)) {
      throw new NativeBridgeFailure("invalid_params", "haptics style is invalid");
    }
    await vibrator.startVibration(
      { type: "time", duration },
      { usage: "touch" },
    );
    return { performed: true };
  }

  private async connectivity(
    method: string,
    emit: CapabilityEmitter,
    context: NativeBridgeInvocationContext,
  ): Promise<ESObject> {
    if (method === "status") return this.networkStatus();
    if (method === "unwatch") {
      this.closeTarget("connectivity");
      return this.networkStatus();
    }
    requireMethod(method, "watch", "connectivity");
    const value = connection.createNetConnection();
    const changed = (): void => {
      void this.networkStatus().then((status) => emit("change", status));
    };
    value.on("netAvailable", changed);
    value.on("netLost", changed);
    await new Promise<void>((resolve, reject) => value.register((error) => error ? reject(error) : resolve()));
    this.networkConnections.add(value);
    context.onCancel(() => {
      value.unregister(() => undefined);
      this.networkConnections.delete(value);
    });
    return this.networkStatus();
  }

  private async networkStatus(): Promise<Readonly<Record<string, ESObject>>> {
    try {
      await connection.getDefaultNet();
      return connectivityStatus(true, true, false);
    } catch {
      return connectivityStatus(false);
    }
  }

  private lifecycle(method: string, emit: CapabilityEmitter): ESObject {
    if (method === "status") return lifecycleStatus(this.lifecycleState);
    if (method === "watch") {
      this.lifecycleEmitter = emit;
      if (this.lifecycleCallbackId === undefined) {
        this.lifecycleCallbackId = this.context.getApplicationContext().on(
          "abilityLifecycle",
          new DestinationLifecycleCallback(this.context, (state) => this.setLifecycleState(state)),
        );
      }
      return lifecycleStatus(this.lifecycleState);
    }
    requireMethod(method, "unwatch", "lifecycle");
    this.lifecycleEmitter = undefined;
    this.closeTarget("lifecycle");
    return lifecycleStatus(this.lifecycleState);
  }

  private async window(method: string, emit: CapabilityEmitter): Promise<ESObject> {
    if (method !== "status" && method !== "watch") {
      if (method !== "unwatch") {
        throw new NativeBridgeFailure("unknown_method", `Unsupported window method: ${method}`);
      }
    }
    const value = await window.getLastWindow(this.context);
    const properties = value.getWindowProperties();
    if (method === "unwatch") {
      this.closeTarget("window");
    } else if (method === "watch") {
      this.closeTarget("window");
      const listener = (size: window.Size): void => {
        emit("change", windowStatus(size.width, size.height));
      };
      value.on("windowSizeChange", listener);
      this.windowInstance = value;
      this.windowListener = listener;
    }
    return windowStatus(properties.windowRect.width, properties.windowRect.height);
  }

  private async notifications(method: string): Promise<ESObject> {
    if (method === "status") {
      return {
        available: true,
        granted: await notificationManager.isNotificationEnabled(),
        permission: null,
      };
    }
    requireMethod(method, "open-settings", "notifications");
    await notificationManager.openNotificationSettings(this.context);
    return { opened: true };
  }

  private async geolocation(
    method: string,
    parameters: Readonly<Record<string, ESObject>>,
  ): Promise<ESObject> {
    if (method === "status") {
      const permission: Permissions = "ohos.permission.LOCATION";
      const status = await abilityAccessCtrl.createAtManager().checkAccessToken(
        this.context.applicationInfo.accessTokenId,
        permission,
      );
      const granted = status === abilityAccessCtrl.GrantStatus.PERMISSION_GRANTED;
      return {
        available: geoLocationManager.isLocationEnabled(),
        granted,
        accuracy: granted ? "fine" : null,
        permission,
      };
    }
    requireMethod(method, "current", "geolocation");
    const location = await geoLocationManager.getCurrentLocation({
      priority: geoLocationManager.LocationRequestPriority.FIRST_FIX,
      scenario: geoLocationManager.LocationRequestScenario.UNSET,
      maxAccuracy: optionalNumber(parameters, "maximumAge", 0, 0),
    });
    return geolocationPosition({
      latitude: location.latitude,
      longitude: location.longitude,
      altitude: location.altitude,
      accuracy: location.accuracy,
      speed: location.speed,
      heading: location.direction,
      timestamp: location.timeStamp,
    });
  }

  private biometrics(method: string): ESObject {
    requireMethod(method, "status", "biometrics");
    let fingerprint = false;
    let face = false;
    try {
      userAuth.getAvailableStatus(
        userAuth.UserAuthType.FINGERPRINT,
        userAuth.AuthTrustLevel.ATL1,
      );
      fingerprint = true;
    } catch {}
    try {
      userAuth.getAvailableStatus(
        userAuth.UserAuthType.FACE,
        userAuth.AuthTrustLevel.ATL1,
      );
      face = true;
    } catch {}
    const enrolled = fingerprint || face;
    return { available: enrolled, enrolled, permission: null };
  }

  private async camera(method: string): Promise<ESObject> {
    if (method === "status") {
      const permission: Permissions = "ohos.permission.CAMERA";
      const status = await abilityAccessCtrl.createAtManager().checkAccessToken(
        this.context.applicationInfo.accessTokenId,
        permission,
      );
      return {
        available: true,
        granted: status === abilityAccessCtrl.GrantStatus.PERMISSION_GRANTED,
        permission,
      };
    }
    requireMethod(method, "capture", "camera");
    const result = await cameraPicker.pick(this.context, [cameraPicker.PickerMediaType.PHOTO], {
      cameraPosition: camera.CameraPosition.CAMERA_POSITION_BACK,
    });
    const details = await fileIo.stat(result.resultUri);
    return {
      uri: result.resultUri,
      name: fileName(result.resultUri) ?? "capture.jpg",
      size: details.size,
      type: "image/jpeg",
    };
  }

  private async files(
    method: string,
    parameters: Readonly<Record<string, ESObject>>,
    invocation: NativeBridgeInvocationContext,
    emit: CapabilityEmitter,
  ): Promise<ESObject> {
    if (method === "status") return fileStatus(true);
    if (method === "upload") {
      return this.upload(parameters, invocation, emit);
    }
    requireMethod(method, "open", "files");
    const documentPicker = new picker.DocumentViewPicker(this.context);
    const uris = await documentPicker.select({
      maxSelectNumber: optionalNumber(parameters, "maximum", 1, 1, 100),
    });
    const files: Array<SelectedFile> = uris.map((uri): SelectedFile => ({
        uri,
        name: fileName(uri),
        size: null,
        type: null,
        persisted: false,
      }));
    const selection: SelectedFiles = { files };
    return selection;
  }

  private async upload(
    parameters: Readonly<Record<string, ESObject>>,
    invocation: NativeBridgeInvocationContext,
    emit: CapabilityEmitter,
  ): Promise<ESObject> {
    const uri = safeFileUri(requiredString(parameters, "uri"));
    const url = this.sameOriginUrl(requiredString(parameters, "url"));
    const field = optionalName(parameters, "field", "file");
    const name = safeFileName(optionalString(parameters, "name", fileName(uri) ?? "upload"));
    const type = safeMimeType(optionalString(parameters, "type", "application/octet-stream"));
    const uploadId = optionalString(parameters, "uploadId", invocation.requestId);
    const headers = stringRecord(parameters.headers, "headers", 64);
    const data = stringRecord(parameters.fields, "fields", 64);
    const header = new UploadHeaders();
    for (const entry of Object.entries(headers)) {
      const headerName = entry[0];
      const headerValue = entry[1];
      if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/u.test(headerName) ||
        ["connection", "content-length", "content-type", "cookie", "host"].includes(headerName.toLowerCase())) {
        throw new NativeBridgeFailure("invalid_params", `files.upload header is not allowed: ${headerName}`);
      }
      if (headerValue.length > 8192 || /[\r\n]/u.test(headerValue)) {
        throw new NativeBridgeFailure("invalid_params", `files.upload header value is invalid: ${headerName}`);
      }
      Reflect.set(header, headerName, headerValue);
    }
    const files: Array<request.File> = [{ filename: name, name: field, uri, type }];
    const formData: Array<request.RequestData> = Object.entries(data).map((entry): request.RequestData => {
      const fieldName = entry[0];
      const value = entry[1];
      if (!/^[A-Za-z][A-Za-z0-9_.-]{0,63}$/u.test(fieldName) || utf8Length(value) > 65536) {
        throw new NativeBridgeFailure("invalid_params", `files.upload field is invalid: ${fieldName}`);
      }
      return { name: fieldName, value };
    });
    const config: request.UploadConfig = {
      url,
      header,
      method: "POST",
      files,
      data: formData,
    };
    const task = await request.uploadFile(this.context, config);
    invocation.onCancel(() => { void task.delete(); });
    task.on("progress", (sent: number, total: number) => {
      const progress: UploadProgress = { uploadId, sent, total: total >= 0 ? total : null };
      emit("progress", progress as Readonly<Record<string, ESObject>>);
    });
    const states = await new Promise<Array<request.TaskState>>((resolve, reject) => {
      task.on("complete", resolve);
      task.on("fail", (value) => reject(new NativeBridgeFailure(
        "unavailable",
        `File upload failed with HTTP ${value[0]?.responseCode ?? "unknown"}`,
      )));
    });
    const state = states[0];
    if (state === undefined || state.responseCode < 200 || state.responseCode > 299) {
      throw new NativeBridgeFailure("unavailable", "File upload failed");
    }
    return {
      status: state.responseCode,
      body: parseResponse(state.message),
      name,
      type,
    };
  }

  private sameOriginUrl(value: string): string {
    let target: url.URL;
    try {
      target = new url.URL(value, this.origin);
    } catch {
      throw new NativeBridgeFailure("unauthorized", "files.upload only permits the current application origin");
    }
    if (target.protocol !== this.origin.protocol ||
      target.hostname !== this.origin.hostname ||
      effectivePort(target) !== effectivePort(this.origin) ||
      target.username !== "" || target.password !== "" || target.hash !== "") {
      throw new NativeBridgeFailure("unauthorized", "files.upload only permits the current application origin");
    }
    return target.href;
  }
}

function requireMethod(actual: string, expected: string, target: string): void {
  if (actual !== expected) {
    throw new NativeBridgeFailure("unknown_method", `Unsupported ${target} method: ${actual}`);
  }
}

function requiredString(value: Readonly<Record<string, ESObject>>, property: string): string {
  const candidate: ESObject = Reflect.get(value, property);
  if (typeof candidate !== "string" || candidate.length === 0) {
    throw new NativeBridgeFailure("invalid_params", `${property} must be a non-empty string`);
  }
  return candidate;
}

function optionalNumber(
  value: Readonly<Record<string, ESObject>>,
  property: string,
  fallback: number,
  minimum: number,
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  const candidate: ESObject = Reflect.get(value, property);
  if (candidate === undefined) return fallback;
  if (typeof candidate !== "number" || !Number.isFinite(candidate)) {
    throw new NativeBridgeFailure("invalid_params", `${property} must be finite`);
  }
  return Math.min(maximum, Math.max(minimum, candidate));
}

function safeExternalUri(value: string): string {
  const scheme = value.slice(0, value.indexOf(":"));
  if (!["https", "http", "mailto", "tel", "geo"].includes(scheme)) {
    throw new NativeBridgeFailure("unauthorized", `External URI scheme is not allowed: ${scheme}`);
  }
  return value;
}

function optionalString(
  value: Readonly<Record<string, ESObject>>,
  property: string,
  fallback: string,
): string {
  const candidate: ESObject = Reflect.get(value, property);
  if (candidate === undefined) return fallback;
  if (typeof candidate !== "string") {
    throw new NativeBridgeFailure("invalid_params", `${property} must be a string`);
  }
  return candidate;
}

function optionalName(
  value: Readonly<Record<string, ESObject>>,
  property: string,
  fallback: string,
): string {
  const candidate = optionalString(value, property, fallback);
  if (!/^[A-Za-z][A-Za-z0-9_.-]{0,63}$/u.test(candidate)) {
    throw new NativeBridgeFailure("invalid_params", `${property} is invalid`);
  }
  return candidate;
}

function stringRecord(value: ESObject, property: string, maximum: number): Record<string, string> {
  if (value === undefined) return {};
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new NativeBridgeFailure("invalid_params", `${property} must be an object`);
  }
  const result: Record<string, string> = {};
  const keys = Reflect.ownKeys(value);
  if (keys.length > maximum) {
    throw new NativeBridgeFailure("invalid_params", `${property} accepts at most ${maximum} entries`);
  }
  for (const key of keys) {
    if (typeof key !== "string") continue;
    const name = key;
    const candidate: ESObject = Reflect.get(value, name);
    if (typeof candidate !== "string") {
      throw new NativeBridgeFailure("invalid_params", `${property}.${name} must be a string`);
    }
    Reflect.set(result, name, candidate);
  }
  return result;
}

function safeFileUri(value: string): string {
  let parsed: url.URL;
  try {
    parsed = new url.URL(value);
  } catch {
    throw new NativeBridgeFailure("invalid_params", "files.upload requires a safe picker URI");
  }
  if (parsed.protocol !== "file:" && parsed.protocol !== "datashare:") {
    throw new NativeBridgeFailure("invalid_params", "files.upload requires a safe picker URI");
  }
  return value;
}

function safeFileName(value: string): string {
  const parts = value.split("/");
  const result = parts[parts.length - 1]?.replace(/[^A-Za-z0-9._ -]/gu, "_").slice(0, 160) ?? "";
  return result || "upload";
}

function fileName(value: string): string | null {
  const parts = value.split("/");
  const result = decodeURIComponent(parts[parts.length - 1] ?? "");
  return result || null;
}

function safeMimeType(value: string): string {
  if (!/^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/u.test(value)) {
    throw new NativeBridgeFailure("invalid_params", "files.upload params.type is invalid");
  }
  return value;
}

function effectivePort(value: url.URL): string {
  if (value.port) return value.port;
  return value.protocol === "https:" ? "443" : "80";
}

function parseResponse(value: string): ESObject {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function utf8Length(value: string): number {
  return new util.TextEncoder().encodeInto(value).byteLength;
}
