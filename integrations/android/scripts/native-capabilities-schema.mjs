const identifier = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const types = new Set([
  "BIOMETRIC_STATUS",
  "CAMERA_STATUS",
  "CAMERA_CAPTURE_RESULT",
  "BOOLEAN",
  "CLIPBOARD_CONTENT",
  "CLIPBOARD_WRITE_PARAMETERS",
  "CLIPBOARD_WRITE_RESULT",
  "CONNECTIVITY_STATUS",
  "CREDENTIAL_STATUS",
  "CREDENTIAL_CLEAR_RESULT",
  "CREDENTIAL_CREATE_PASSKEY_PARAMETERS",
  "CREDENTIAL_CREATE_PASSKEY_RESULT",
  "CREDENTIAL_CREATE_PASSWORD_PARAMETERS",
  "CREDENTIAL_CREATE_PASSWORD_RESULT",
  "CREDENTIAL_GET_PARAMETERS",
  "CREDENTIAL_RESULT",
  "FILE_OPEN_PARAMETERS",
  "FILE_OPEN_RESULT",
  "FILE_STATUS",
  "FILE_UPLOAD_PARAMETERS",
  "FILE_UPLOAD_PROGRESS",
  "FILE_UPLOAD_RESULT",
  "GEOLOCATION_POSITION",
  "GEOLOCATION_STATUS",
  "HAPTIC_PARAMETERS",
  "HAPTIC_RESULT",
  "INTENT_PARAMETERS",
  "JSON",
  "LIFECYCLE_STATUS",
  "MEDIA_STATUS",
  "MEDIA_LOAD_PARAMETERS",
  "MEDIA_SEEK_PARAMETERS",
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
]);
const availability = new Set(["device", "optional", "required"]);
const errorProtocols = new Set(["native-bridge-v1"]);
const lifecycles = new Set(["destination"]);
const modes = new Set(["async", "sync"]);
const threading = new Set(["main"]);

export function validateNativeCapabilityCatalog(catalog) {
  assertObject(catalog, "catalog");
  assertKeys(catalog, ["capabilities", "schemaVersion"], "catalog");
  if (catalog.schemaVersion !== 2) throw new Error("Unsupported native capability schema");
  if (!Array.isArray(catalog.capabilities) || catalog.capabilities.length === 0) {
    throw new Error("Native capability catalog must not be empty");
  }

  const names = new Set();
  for (const capability of catalog.capabilities) {
    assertObject(capability, "capability");
    assertKeys(capability, ["artifact", "availability", "errorProtocol", "events", "lifecycle", "methods", "minSdk", "name", "permission", "threading"], `capability ${String(capability.name)}`);
    assertIdentifier(capability.name, "capability name");
    if (names.has(capability.name)) throw new Error(`Duplicate native capability: ${capability.name}`);
    names.add(capability.name);
    assertIdentifier(capability.artifact, "artifact");
    if (!availability.has(capability.availability)) throw new Error(`Invalid availability for ${capability.name}`);
    if (!threading.has(capability.threading)) throw new Error(`Invalid threading for ${capability.name}`);
    if (!lifecycles.has(capability.lifecycle)) throw new Error(`Invalid lifecycle for ${capability.name}`);
    if (!errorProtocols.has(capability.errorProtocol)) throw new Error(`Invalid error protocol for ${capability.name}`);
    if (!Number.isSafeInteger(capability.minSdk) || capability.minSdk < 1) throw new Error(`Invalid minSdk for ${capability.name}`);
    if (capability.permission !== null && (typeof capability.permission !== "string" || capability.permission.length === 0)) {
      throw new Error(`Invalid permission for ${capability.name}`);
    }
    validateMembers(capability.methods, capability.name, "method", ["mode", "name", "parameters", "result"], (method) => {
      if (!modes.has(method.mode)) throw new Error(`Invalid mode for ${capability.name}.${method.name}`);
      assertType(method.parameters, `${capability.name}.${method.name} parameters`);
      assertType(method.result, `${capability.name}.${method.name} result`);
    });
    validateMembers(capability.events, capability.name, "event", ["name", "payload"], (event) => {
      assertType(event.payload, `${capability.name}.${event.name} payload`);
      if (event.payload === "VOID") throw new Error(`Events require payload types: ${capability.name}.${event.name}`);
    }, true);
  }
}

function validateMembers(values, owner, kind, keys, validate, allowEmpty = false) {
  if (!Array.isArray(values) || (!allowEmpty && values.length === 0)) throw new Error(`${owner} must declare ${kind}s`);
  const names = new Set();
  for (const value of values) {
    assertObject(value, `${owner} ${kind}`);
    assertKeys(value, keys, `${owner} ${kind}`);
    assertIdentifier(value.name, `${owner} ${kind}`);
    if (names.has(value.name)) throw new Error(`Duplicate ${owner} ${kind}: ${value.name}`);
    names.add(value.name);
    validate(value);
  }
}

function assertType(value, label) {
  if (!types.has(value)) throw new Error(`Invalid ${label}`);
}

function assertIdentifier(value, label) {
  if (typeof value !== "string" || !identifier.test(value)) throw new Error(`Invalid ${label}`);
}

function assertObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
}

function assertKeys(value, expected, label) {
  const actual = Object.keys(value).sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== [...expected].sort()[index])) {
    throw new Error(`${label} has unknown or missing fields`);
  }
}
