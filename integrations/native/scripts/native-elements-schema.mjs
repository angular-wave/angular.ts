const categories = new Set([
  "action",
  "collection",
  "display",
  "input",
  "layout",
  "media",
  "navigation",
  "overlay",
]);
const maturities = new Set(["experimental", "preview", "stable"]);
const stateOwnership = new Set(["none", "element", "destination"]);
const transientOverlays = new Set(["menu", "snackbar", "tooltip"]);
const propertyTypes = new Set([
  "BOOLEAN",
  "COLOR",
  "FLOAT",
  "INTEGER",
  "JSON",
  "STRING",
  "STRING_LIST",
]);

export function validateNativeElementCatalog(catalog) {
  if (catalog?.schemaVersion !== 3) {
    throw new Error("native-elements.json requires schemaVersion 3");
  }
  if (!Array.isArray(catalog.elements) || catalog.elements.length === 0) {
    throw new Error("native-elements.json must contain at least one element");
  }

  const names = new Set();
  const identifiers = new Map();
  for (const element of catalog.elements) {
    validateElement(element, names);
    for (const wireName of elementWireNames(element)) {
      const identifier = wireIdentifier(wireName);
      const existing = identifiers.get(identifier);
      if (existing !== undefined && existing !== wireName) {
        throw new Error(
          `Native wire names ${existing} and ${wireName} generate the same identifier`,
        );
      }
      identifiers.set(identifier, wireName);
    }
  }
}

function validateElement(element, names) {
  if (
    !Array.isArray(element.aliases) ||
    !Array.isArray(element.properties) ||
    !Array.isArray(element.methods) ||
    !Array.isArray(element.events)
  ) {
    throw new Error(`Incomplete native element declaration: ${element.name}`);
  }
  if (!categories.has(element.category)) {
    throw new Error(`Invalid category for native element ${element.name}`);
  }
  if (typeof element.artifact !== "string" || !/^[a-z][a-z0-9-]*$/.test(element.artifact)) {
    throw new Error(`Invalid artifact for native element ${element.name}`);
  }
  if (!maturities.has(element.maturity)) {
    throw new Error(`Invalid maturity for native element ${element.name}`);
  }
  if (!Number.isSafeInteger(element.minSdk) || element.minSdk < 1) {
    throw new Error(`Invalid minSdk for native element ${element.name}`);
  }
  if (!stateOwnership.has(element.stateOwnership)) {
    throw new Error(`Invalid state ownership for native element ${element.name}`);
  }
  if (transientOverlays.has(element.name) && element.stateOwnership !== "none") {
    throw new Error(`Transient native element ${element.name} cannot restore open state`);
  }
  if (
    !element.accessibility ||
    typeof element.accessibility.role !== "string" ||
    typeof element.accessibility.labelProperty !== "string" ||
    typeof element.accessibility.required !== "boolean"
  ) {
    throw new Error(`Incomplete accessibility metadata for ${element.name}`);
  }

  for (const key of [element.name, ...element.aliases]) {
    validateName(key, "native element");
    if (names.has(key)) throw new Error(`Duplicate native element name: ${key}`);
    names.add(key);
  }

  const properties = new Set();
  for (const property of element.properties) {
    if (!property || !propertyTypes.has(property.type)) {
      throw new Error(`Invalid property in native element ${element.name}`);
    }
    validateMember(property.name);
    addMember(properties, property.name, element.name);
    if (property.required === true && property.nullable === true) {
      throw new Error(`Required property cannot be nullable: ${element.name}.${property.name}`);
    }
    if (property.required !== undefined && typeof property.required !== "boolean") {
      throw new Error(`Invalid required flag: ${element.name}.${property.name}`);
    }
    if (property.nullable !== undefined && typeof property.nullable !== "boolean") {
      throw new Error(`Invalid nullable flag: ${element.name}.${property.name}`);
    }
    if (Object.hasOwn(property, "default")) {
      validateDefault(property, element.name);
    }
  }
  const methods = new Set();
  for (const method of element.methods) {
    validateOperation(method, "method", element.name);
    addMember(methods, method.name, element.name);
  }
  const events = new Set();
  for (const event of element.events) {
    validateOperation(event, "event", element.name);
    addMember(events, event.name, element.name);
  }
  if (!element.properties.some(({ name }) => name === element.accessibility.labelProperty)) {
    throw new Error(`Unknown accessibility label property for ${element.name}`);
  }
}

function validateDefault(property, elementName) {
  const value = property.default;
  const valid = value === null
    ? property.nullable === true
    : property.type === "BOOLEAN"
      ? typeof value === "boolean"
      : property.type === "FLOAT"
        ? typeof value === "number" && Number.isFinite(value)
        : property.type === "INTEGER"
          ? Number.isSafeInteger(value)
          : property.type === "STRING_LIST"
            ? Array.isArray(value) && value.every((item) => typeof item === "string")
            : property.type === "JSON"
              ? value !== undefined
              : typeof value === "string";
  if (!valid) {
    throw new Error(`Invalid default value: ${elementName}.${property.name}`);
  }
}

function validateOperation(operation, kind, elementName) {
  if (!operation || typeof operation !== "object") {
    throw new Error(`Invalid ${kind} in native element ${elementName}`);
  }
  validateMember(operation.name);
  for (const field of kind === "method" ? ["parameters", "result"] : ["payload"]) {
    if (operation[field] !== undefined && !propertyTypes.has(operation[field])) {
      throw new Error(`Invalid ${kind} ${field}: ${elementName}.${operation.name}`);
    }
  }
}

export function wireIdentifier(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replaceAll("-", "_")
    .toUpperCase();
}

export function elementWireNames(element) {
  return [
    element.name,
    ...element.aliases,
    ...element.properties.map(({ name }) => name),
    ...element.methods.map(({ name }) => name),
    ...element.events.map(({ name }) => name),
  ];
}

function validateName(value, label) {
  if (typeof value !== "string" || !/^[a-z][a-z0-9-]*$/.test(value)) {
    throw new Error(`Invalid ${label} name: ${String(value)}`);
  }
}

function validateMember(value) {
  if (typeof value !== "string" || !/^[A-Za-z][A-Za-z0-9]*$/.test(value)) {
    throw new Error(`Invalid native element member: ${String(value)}`);
  }
}

function addMember(members, value, element) {
  if (members.has(value)) throw new Error(`Duplicate member: ${element}.${value}`);
  members.add(value);
}
