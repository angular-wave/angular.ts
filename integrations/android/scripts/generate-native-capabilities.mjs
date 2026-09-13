#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "prettier";
import { validateNativeCapabilityCatalog } from "./native-capabilities-schema.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const sourcePath = resolve(root, "integrations/android/native-capabilities.json");
const outputs = [
  { path: resolve(root, "integrations/android/navigation-fragments/src/main/java/io/github/angularwave/android/navigation/bridge/NativeCapabilityCatalog.kt"), render: renderAndroid },
  { path: resolve(root, "integrations/kotlin/src/jsMain/kotlin/angular/ts/NativeCapabilities.kt"), render: renderKotlin },
  { path: resolve(root, "src/runtime/native-capabilities.ts"), render: renderTypeScript },
  { path: resolve(root, "integrations/wasm/rust/crates/angular-ts/src/native_capabilities.rs"), render: renderRust },
  { path: resolve(root, "integrations/wasm/go/native_capabilities.go"), render: renderGo },
  { path: resolve(root, "integrations/android/NATIVE_CAPABILITIES.md"), render: renderDocumentation },
];
const check = process.argv.includes("--check");
const catalog = JSON.parse(await readFile(sourcePath, "utf8"));
validateNativeCapabilityCatalog(catalog);

let stale = false;
for (const output of outputs) {
  const rendered = output.render(catalog.capabilities);
  const expected = output.path.endsWith(".ts") ? await format(rendered, { filepath: output.path }) : rendered;
  if (check) {
    const actual = await readFile(output.path, "utf8").catch(() => "");
    if (actual !== expected) {
      console.error(`${output.path} is out of date.`);
      stale = true;
    }
  } else {
    await writeFile(output.path, expected);
  }
}
if (stale) {
  console.error("Run make -C integrations/android generate-native-capabilities.");
  process.exitCode = 1;
}

function identifier(value) {
  return value.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join("");
}

function constant(value) {
  return value.replaceAll("-", "_").replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();
}

function renderAndroid(capabilities) {
  const wires = [...new Set(capabilities.flatMap((capability) => [capability.name, ...capability.methods.map(({ name }) => name), ...capability.events.map(({ name }) => name)]))]
    .sort().map((name) => `        const val ${constant(name)} = "${name}"`).join("\n");
  const entries = capabilities.map((capability) => `        NativeCapabilityCatalogEntry(
            name = Wire.${constant(capability.name)},
            artifact = "${capability.artifact}",
            availability = NativeCapabilityAvailability.${capability.availability.toUpperCase()},
            threading = NativeCapabilityThreading.${capability.threading.toUpperCase()},
            lifecycle = NativeCapabilityLifecycle.${capability.lifecycle.toUpperCase()},
            errorProtocol = "${capability.errorProtocol}",
            minSdk = ${capability.minSdk},
            permission = ${capability.permission === null ? "null" : `"${capability.permission}"`},
            methods =${renderAndroidSet(capability.methods)},
            events =${renderAndroidSet(capability.events)},
        ),`).join("\n").replace(/^/gm, "    ");
  return `// Generated code. Do not edit directly.
// Source: integrations/android/scripts/generate-native-capabilities.mjs.
package io.github.angularwave.android.navigation.bridge

enum class NativeCapabilityAvailability {
    DEVICE,
    OPTIONAL,
    REQUIRED,
}

enum class NativeCapabilityThreading(val value: String) {
    MAIN("main")
}

enum class NativeCapabilityLifecycle(val value: String) {
    DESTINATION("destination")
}

internal data class NativeCapabilityCatalogEntry(
    val name: String,
    val artifact: String,
    val availability: NativeCapabilityAvailability,
    val threading: NativeCapabilityThreading,
    val lifecycle: NativeCapabilityLifecycle,
    val errorProtocol: String,
    val minSdk: Int,
    val permission: String?,
    val methods: Set<String>,
    val events: Set<String>,
)

/** Native capability names and operations shared with AngularTS integrations. */
object NativeCapabilityCatalog {
    object Wire {
${wires}
    }

    internal val all: List<NativeCapabilityCatalogEntry> =
        listOf(
${entries}
        )

    internal val builtIns: LinkedHashMap<String, Set<String>> =
        all.filter { it.artifact == "navigation" }
            .associateTo(linkedMapOf()) { it.name to it.methods }

    fun methods(name: String): Set<String> =
        requireNotNull(all.find { it.name == name }) {
                "Unknown generated native capability: $name"
            }
            .methods
}
`;
}

function renderAndroidSet(values) {
  const members = values.map(({ name }) => `Wire.${constant(name)}`);
  const compact = `linkedSetOf(${members.join(", ")})`;
  if (`                methods = ${compact},`.length <= 100) return ` ${compact}`;
  return `
                linkedSetOf(
${members.map((member) => `                    ${member},`).join("\n")}
                )`;
}

function renderKotlin(capabilities) {
  const entries = capabilities.map((capability) => `    public object ${identifier(capability.name)} {
        public const val name: String = "${capability.name}"
        public const val artifact: String = "${capability.artifact}"
        public const val availability: String = "${capability.availability}"
        public const val threading: String = "${capability.threading}"
        public const val lifecycle: String = "${capability.lifecycle}"
        public const val errorProtocol: String = "${capability.errorProtocol}"
        public const val minSdk: Int = ${capability.minSdk}
        public val permission: String? = ${capability.permission === null ? "null" : `"${capability.permission}"`}

        public object Methods {
${capability.methods.map(({ name }) => `            public const val ${identifier(name).replace(/^./, (char) => char.toLowerCase())}: String = "${name}"`).join("\n")}
        }

        public object Events {
${capability.events.map(({ name }) => `            public const val ${identifier(name).replace(/^./, (char) => char.toLowerCase())}: String = "${name}"`).join("\n")}
        }
    }`).join("\n\n");
  return `// Generated by integrations/android/scripts/generate-native-capabilities.mjs.
// Do not edit directly.
package angular.ts

/** Native capability names and operations supported by Angular Native. */
public object NativeCapabilities {
${entries}
}
`;
}

function renderTypeScript(capabilities) {
  const value = Object.fromEntries(capabilities.map((capability) => [capability.name, capability]));
  const methods = capabilities.map((capability) => `  readonly "${capability.name}": {
${capability.methods.map((method) => `    readonly "${method.name}": { readonly parameters: ${typescriptType(method.parameters)}; readonly result: ${typescriptType(method.result)} };`).join("\n")}
  };`).join("\n");
  const events = capabilities.map((capability) => capability.events.length === 0
    ? `  readonly "${capability.name}": Readonly<Record<never, never>>;`
    : `  readonly "${capability.name}": {\n${capability.events.map((event) => `    readonly "${event.name}": ${typescriptType(event.payload)};`).join("\n")}\n  };`).join("\n");
  return `// Generated by integrations/android/scripts/generate-native-capabilities.mjs.
// Do not edit directly.

import type {
  NativeBiometricStatus,
  NativeCameraCaptureResult,
  NativeCameraStatus,
  NativeClipboardContent,
  NativeClipboardWriteParameters,
  NativeClipboardWriteResult,
  NativeConnectivityStatus,
  NativeCredentialClearResult,
  NativeCredentialCreatePasskeyParameters,
  NativeCredentialCreatePasskeyResult,
  NativeCredentialCreatePasswordParameters,
  NativeCredentialCreatePasswordResult,
  NativeCredentialGetParameters,
  NativeCredentialResult,
  NativeCredentialStatus,
  NativeFileOpenParameters,
  NativeFileOpenResult,
  NativeFileStatus,
  NativeFileUploadParameters,
  NativeFileUploadProgress,
  NativeFileUploadResult,
  NativeGeolocationPosition,
  NativeGeolocationStatus,
  NativeHapticParameters,
  NativeHapticResult,
  NativeIntentParameters,
  NativeLifecycleStatus,
  NativeMediaLoadParameters,
  NativeMediaSeekParameters,
  NativeMediaStatus,
  NativeNavigationChange,
  NativeNavigationPopResult,
  NativeNavigationRouteParameters,
  NativeNavigationRouteResult,
  NativeNavigationStatus,
  NativeNotificationStatus,
  NativeOpenResult,
  NativePermissionParameters,
  NativePermissionStatus,
  NativePlatformStatus,
  NativeShareParameters,
  NativeWindowStatus,
} from "./native-capability-contracts.ts";

export const nativeCapabilities = ${JSON.stringify(value, null, 2)} as const;
export interface NativeCapabilityMethodMap {
${methods}
}
export interface NativeCapabilityEventMap {
${events}
}
export type NativeCapabilityName = keyof NativeCapabilityMethodMap;
export type NativeCapabilityMethodName<Name extends NativeCapabilityName> = keyof NativeCapabilityMethodMap[Name];
export type NativeCapabilityMethodContract<Name extends NativeCapabilityName, Method extends NativeCapabilityMethodName<Name>> = NativeCapabilityMethodMap[Name][Method];
export type NativeCapabilityParameters<Name extends NativeCapabilityName, Method extends NativeCapabilityMethodName<Name>> = NativeCapabilityMethodContract<Name, Method> extends { readonly parameters: infer Parameters } ? Parameters : never;
export type NativeCapabilityResult<Name extends NativeCapabilityName, Method extends NativeCapabilityMethodName<Name>> = NativeCapabilityMethodContract<Name, Method> extends { readonly result: infer Result } ? Result : never;
export type NativeCapabilityEventName<Name extends NativeCapabilityName> = keyof NativeCapabilityEventMap[Name];
export type NativeCapabilityEventPayload<Name extends NativeCapabilityName, Event extends NativeCapabilityEventName<Name>> = NativeCapabilityEventMap[Name][Event];
`;
}

function renderDocumentation(capabilities) {
  const rows = capabilities.map((capability) => `| \`${capability.name}\` | \`${capability.artifact}\` | ${capability.availability} | ${capability.threading} | ${capability.lifecycle} | \`${capability.errorProtocol}\` | ${capability.permission ? `\`${capability.permission}\`` : "none"} | ${capability.methods.map(({ name }) => `\`${name}\``).join(", ")} | ${capability.events.map(({ name }) => `\`${name}\``).join(", ") || "none"} |`).join("\n");
  return `# Native Capability Catalog

This file is generated from \`native-capabilities.json\`. Edit the catalog and run
\`make -C integrations/android generate-native-capabilities\`.

| Capability | Artifact | Availability | Thread | Lifecycle | Errors | Permission | Methods | Events |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${rows}
`;
}

function renderRust(capabilities) {
  const variants = capabilities.map((capability) => `    ${identifier(capability.name)},`).join("\n");
  const names = capabilities.map((capability) => `            Self::${identifier(capability.name)} => "${capability.name}",`).join("\n");
  const methodSets = capabilities.map((capability) => {
    const prefix = `            Self::${identifier(capability.name)} => `;
    return `${prefix}${rustSlice(capability.methods.map(({ name }) => name), "            ", prefix.length, 100)},`;
  }).join("\n");
  const eventSets = capabilities.map((capability) => {
    const prefix = `            Self::${identifier(capability.name)} => `;
    return `${prefix}${rustSlice(capability.events.map(({ name }) => name), "            ", prefix.length, 100)},`;
  }).join("\n");
  const modules = capabilities.map((capability) => {
    const members = [
      `    pub const NAME: &str = "${capability.name}";`,
      ...capability.methods.map(({ name }) => `    pub const ${constant(name)}: &str = "${name}";`),
      ...capability.events.map(({ name }) => `    pub const EVENT_${constant(name)}: &str = "${name}";`),
    ].join("\n");
    return `pub mod ${capability.name.replaceAll("-", "_")} {\n${members}\n}`;
  }).join("\n\n");
  const descriptors = capabilities.map((capability) => `    NativeCapabilityDescriptor {
        name: NativeCapabilityName::${identifier(capability.name)},
        artifact: "${capability.artifact}",
        availability: "${capability.availability}",
        threading: "${capability.threading}",
        lifecycle: "${capability.lifecycle}",
        error_protocol: "${capability.errorProtocol}",
        min_sdk: ${capability.minSdk},
        permission: ${capability.permission === null ? "None" : `Some("${capability.permission}")`},
        methods: ${rustSlice(capability.methods.map(({ name }) => name), "        ", 17)},
        events: ${rustSlice(capability.events.map(({ name }) => name), "        ", 16)},
    },`).join("\n");
  return `// Generated by integrations/android/scripts/generate-native-capabilities.mjs.
// Do not edit directly.

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum NativeCapabilityName {
${variants}
}

impl NativeCapabilityName {
    pub const fn as_str(self) -> &'static str {
        match self {
${names}
        }
    }

    pub const fn methods(self) -> &'static [&'static str] {
        match self {
${methodSets}
        }
    }

    pub const fn events(self) -> &'static [&'static str] {
        match self {
${eventSets}
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct NativeCapabilityDescriptor {
    pub name: NativeCapabilityName,
    pub artifact: &'static str,
    pub availability: &'static str,
    pub threading: &'static str,
    pub lifecycle: &'static str,
    pub error_protocol: &'static str,
    pub min_sdk: u32,
    pub permission: Option<&'static str>,
    pub methods: &'static [&'static str],
    pub events: &'static [&'static str],
}

${modules}

pub const NATIVE_CAPABILITIES: &[NativeCapabilityDescriptor] = &[
${descriptors}
];
`;
}

function renderGo(capabilities) {
  const constantNames = capabilities.map((capability) => `NativeCapability${identifier(capability.name)}`);
  const constantWidth = Math.max(...constantNames.map(({ length }) => length));
  const constants = capabilities.map((capability, index) => `\t${constantNames[index].padEnd(constantWidth)} NativeCapabilityName = "${capability.name}"`).join("\n");
  const descriptors = capabilities.map((capability) => `\t{
\t\tName: NativeCapability${identifier(capability.name)}, Artifact: "${capability.artifact}", Availability: "${capability.availability}", Threading: "${capability.threading}", Lifecycle: "${capability.lifecycle}", ErrorProtocol: "${capability.errorProtocol}", MinSDK: ${capability.minSdk}, Permission: "${capability.permission ?? ""}",
\t\tMethods: []string{${capability.methods.map(({ name }) => `"${name}"`).join(", ")}}, Events: []string{${capability.events.map(({ name }) => `"${name}"`).join(", ")}},
\t},`).join("\n");
  return `// Code generated by integrations/android/scripts/generate-native-capabilities.mjs. DO NOT EDIT.

package angularwasm

// NativeCapabilityName is a capability target accepted by Angular Native.
type NativeCapabilityName string

const (
${constants}
)

// NativeCapabilityDescriptor describes one generated Angular Native target.
type NativeCapabilityDescriptor struct {
\tName         NativeCapabilityName
\tArtifact     string
\tAvailability string
\tThreading     string
\tLifecycle     string
\tErrorProtocol string
\tMinSDK       int
\tPermission   string
\tMethods      []string
\tEvents       []string
}

// NativeCapabilityCatalog contains every built-in and optional native target.
var NativeCapabilityCatalog = []NativeCapabilityDescriptor{
${descriptors}
}

// Methods returns the operations generated for this target.
func (name NativeCapabilityName) Methods() []string {
\tfor _, capability := range NativeCapabilityCatalog {
\t\tif capability.Name == name {
\t\t\treturn capability.Methods
\t\t}
\t}
\treturn nil
}
`;
}

function typescriptType(type) {
  if (type === "BOOLEAN") return "boolean";
  if (type === "BIOMETRIC_STATUS") return "NativeBiometricStatus";
  if (type === "CAMERA_CAPTURE_RESULT") return "NativeCameraCaptureResult";
  if (type === "CAMERA_STATUS") return "NativeCameraStatus";
  if (type === "CLIPBOARD_CONTENT") return "NativeClipboardContent";
  if (type === "CLIPBOARD_WRITE_PARAMETERS") return "NativeClipboardWriteParameters";
  if (type === "CLIPBOARD_WRITE_RESULT") return "NativeClipboardWriteResult";
  if (type === "CONNECTIVITY_STATUS") return "NativeConnectivityStatus";
  if (type === "CREDENTIAL_CLEAR_RESULT") return "NativeCredentialClearResult";
  if (type === "CREDENTIAL_CREATE_PASSKEY_PARAMETERS") return "NativeCredentialCreatePasskeyParameters";
  if (type === "CREDENTIAL_CREATE_PASSKEY_RESULT") return "NativeCredentialCreatePasskeyResult";
  if (type === "CREDENTIAL_CREATE_PASSWORD_PARAMETERS") return "NativeCredentialCreatePasswordParameters";
  if (type === "CREDENTIAL_CREATE_PASSWORD_RESULT") return "NativeCredentialCreatePasswordResult";
  if (type === "CREDENTIAL_GET_PARAMETERS") return "NativeCredentialGetParameters";
  if (type === "CREDENTIAL_RESULT") return "NativeCredentialResult";
  if (type === "CREDENTIAL_STATUS") return "NativeCredentialStatus";
  if (type === "FILE_OPEN_PARAMETERS") return "NativeFileOpenParameters";
  if (type === "FILE_OPEN_RESULT") return "NativeFileOpenResult";
  if (type === "FILE_STATUS") return "NativeFileStatus";
  if (type === "FILE_UPLOAD_PARAMETERS") return "NativeFileUploadParameters";
  if (type === "FILE_UPLOAD_PROGRESS") return "NativeFileUploadProgress";
  if (type === "FILE_UPLOAD_RESULT") return "NativeFileUploadResult";
  if (type === "GEOLOCATION_POSITION") return "NativeGeolocationPosition";
  if (type === "GEOLOCATION_STATUS") return "NativeGeolocationStatus";
  if (type === "HAPTIC_PARAMETERS") return "NativeHapticParameters";
  if (type === "HAPTIC_RESULT") return "NativeHapticResult";
  if (type === "INTENT_PARAMETERS") return "NativeIntentParameters";
  if (type === "LIFECYCLE_STATUS") return "NativeLifecycleStatus";
  if (type === "MEDIA_LOAD_PARAMETERS") return "NativeMediaLoadParameters";
  if (type === "MEDIA_SEEK_PARAMETERS") return "NativeMediaSeekParameters";
  if (type === "MEDIA_STATUS") return "NativeMediaStatus";
  if (type === "NAVIGATION_CHANGE") return "NativeNavigationChange";
  if (type === "NAVIGATION_POP_RESULT") return "NativeNavigationPopResult";
  if (type === "NAVIGATION_ROUTE_PARAMETERS") return "NativeNavigationRouteParameters";
  if (type === "NAVIGATION_ROUTE_RESULT") return "NativeNavigationRouteResult";
  if (type === "NAVIGATION_STATUS") return "NativeNavigationStatus";
  if (type === "NOTIFICATION_STATUS") return "NativeNotificationStatus";
  if (type === "OPEN_RESULT") return "NativeOpenResult";
  if (type === "PERMISSION_PARAMETERS") return "NativePermissionParameters";
  if (type === "PERMISSION_STATUS") return "NativePermissionStatus";
  if (type === "PLATFORM_STATUS") return "NativePlatformStatus";
  if (type === "SHARE_PARAMETERS") return "NativeShareParameters";
  if (type === "STRING") return "string";
  if (type === "VOID") return "undefined";
  if (type === "WINDOW_STATUS") return "NativeWindowStatus";
  return "unknown";
}

function rustSlice(values, indent, prefixLength, arrayWidth = 63) {
  const compact = `&[${values.map((value) => `"${value}"`).join(", ")}]`;
  const hasLongValue = values.some(({ length }) => length >= 15);
  if (!hasLongValue && compact.length <= arrayWidth && prefixLength + compact.length <= 100)
    return compact;
  return `&[\n${values.map((value) => `${indent}    "${value}",`).join("\n")}\n${indent}]`;
}
