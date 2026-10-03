import assert from "node:assert/strict";
import test from "node:test";
import { validateNativeCapabilityCatalog } from "./native-capabilities-schema.mjs";

const capability = {
  name: "scanner",
  artifact: "scanner",
  availability: "optional",
  threading: "main",
  lifecycle: "destination",
  errorProtocol: "native-bridge-v1",
  minSdk: 28,
  permission: null,
  methods: [{ name: "scan", mode: "async", parameters: "JSON", result: "STRING" }],
  events: [{ name: "change", payload: "JSON" }],
};
const supportedTypes = [
  "BIOMETRIC_STATUS",
  "CAMERA_STATUS",
  "BOOLEAN",
  "CLIPBOARD_CONTENT",
  "CLIPBOARD_WRITE_PARAMETERS",
  "CLIPBOARD_WRITE_RESULT",
  "CONNECTIVITY_STATUS",
  "CREDENTIAL_STATUS",
  "FILE_STATUS",
  "GEOLOCATION_POSITION",
  "GEOLOCATION_STATUS",
  "HAPTIC_PARAMETERS",
  "HAPTIC_RESULT",
  "INTENT_PARAMETERS",
  "JSON",
  "LIFECYCLE_STATUS",
  "MEDIA_STATUS",
  "NAVIGATION_CHANGE",
  "NAVIGATION_POP_RESULT",
  "NAVIGATION_ROUTE_PARAMETERS",
  "NAVIGATION_ROUTE_RESULT",
  "NAVIGATION_STATUS",
  "NOTIFICATION_STATUS",
  "OPEN_RESULT",
  "PERMISSION_PARAMETERS",
  "PERMISSION_STATUS",
  "PLATFORM_STATUS",
  "SHARE_PARAMETERS",
  "STRING",
  "VOID",
  "WINDOW_STATUS",
];

test("accepts a complete native capability catalog", () => {
  assert.doesNotThrow(() => validateNativeCapabilityCatalog({ schemaVersion: 2, capabilities: [capability] }));
});

test("accepts every supported method and event payload type", () => {
  for (const type of supportedTypes) {
    const candidate = {
      ...capability,
      methods: [{ name: "scan", mode: "async", parameters: type, result: type }],
      events: type === "VOID" ? [] : [{ name: "change", payload: type }],
    };
    assert.doesNotThrow(() =>
      validateNativeCapabilityCatalog({ schemaVersion: 2, capabilities: [candidate] }),
    );
  }
});

test("rejects stale, duplicate, incomplete, and open schemas", () => {
  assert.throws(() => validateNativeCapabilityCatalog({ schemaVersion: 1, capabilities: [capability] }));
  assert.throws(() => validateNativeCapabilityCatalog({ schemaVersion: 2, capabilities: [capability, capability] }));
  assert.throws(() => validateNativeCapabilityCatalog({ schemaVersion: 2, capabilities: [{ ...capability, methods: [] }] }));
  assert.throws(() => validateNativeCapabilityCatalog({ schemaVersion: 2, capabilities: [{ ...capability, extra: true }] }));
});

test("rejects invalid identifiers, metadata, methods, and events", () => {
  const invalid = [
    { ...capability, name: "Bad Target" },
    { ...capability, artifact: "Bad Artifact" },
    { ...capability, availability: "sometimes" },
    { ...capability, threading: "worker" },
    { ...capability, lifecycle: "application" },
    { ...capability, errorProtocol: "exceptions" },
    { ...capability, minSdk: 0 },
    { ...capability, permission: "" },
    { ...capability, methods: [{ name: "scan", mode: "later", parameters: "JSON", result: "STRING" }] },
    { ...capability, methods: [{ name: "scan", mode: "async", parameters: "UNKNOWN", result: "STRING" }] },
    { ...capability, events: [{ name: "change", payload: "VOID" }] },
  ];
  invalid.forEach((entry) => assert.throws(() => validateNativeCapabilityCatalog({ schemaVersion: 2, capabilities: [entry] })));
});
