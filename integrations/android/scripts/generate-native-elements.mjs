#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "prettier";
import {
  elementWireNames,
  validateNativeElementCatalog,
  wireIdentifier,
} from "./native-elements-schema.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const sourcePath = resolve(root, "integrations/android/native-elements.json");
const outputs = [
  {
    path: resolve(
      root,
      "integrations/android/navigation-fragments/src/main/java/io/github/angularwave/android/navigation/elements/NativeElementCatalog.kt",
    ),
    render: renderAndroid,
  },
  {
    path: resolve(
      root,
      "integrations/kotlin/src/jsMain/kotlin/angular/ts/NativeElements.kt",
    ),
    render: renderKotlinJs,
  },
  {
    path: resolve(root, "src/runtime/native-elements.ts"),
    render: renderTypeScript,
  },
  {
    path: resolve(root, "integrations/android/NATIVE_ELEMENTS.md"),
    render: renderDocumentation,
  },
];

const check = process.argv.includes("--check");
const catalog = JSON.parse(await readFile(sourcePath, "utf8"));
validateNativeElementCatalog(catalog);

let stale = false;
for (const output of outputs) {
  const rendered = output.render(catalog.elements);
  const expected = output.path.endsWith(".ts")
    ? await format(rendered, { filepath: output.path })
    : rendered;
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
  console.error("Run make -C integrations/android generate-native-elements.");
  process.exitCode = 1;
}

function identifier(value) {
  return value
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

function quoted(values) {
  return values.map((value) => `\"${value}\"`).join(", ");
}

function renderAndroid(elements) {
  const propertyGroups = new Map();
  for (const property of elements.flatMap((element) => element.properties)) {
    const key = JSON.stringify(property);
    const group = propertyGroups.get(key) ?? { property, count: 0 };
    group.count += 1;
    propertyGroups.set(key, group);
  }
  const usedSharedPropertyNames = new Set();
  const sharedProperties = new Map(
    [...propertyGroups.entries()]
      .filter(([, group]) => group.count > 1)
      .sort(([, left], [, right]) => left.property.name.localeCompare(right.property.name))
      .map(([key, group]) => {
        const baseName = `shared${identifier(group.property.name)}`;
        let name = baseName;
        let suffix = 2;
        while (usedSharedPropertyNames.has(name)) name = `${baseName}${suffix++}`;
        usedSharedPropertyNames.add(name);
        return [key, { name, property: group.property }];
      }),
  );
  const sharedPropertyDeclarations = [...sharedProperties.values()]
    .map(({ name, property }) => {
      const lines = renderAndroidProperty(property).trimEnd().replace(/,$/, "").split("\n");
      const indentation = Math.min(
        ...lines.filter(Boolean).map((line) => line.match(/^ */)[0].length),
      );
      const definition = lines.map((line) => line.slice(indentation)).join("\n");
      return `    private val ${name} =\n${definition.replace(/^/gm, "        ")}`;
    })
    .join("\n\n");
  const wires = [...new Set(elements.flatMap(elementWireNames))]
    .sort()
    .map((name) => `        const val ${wireIdentifier(name)} = \"${name}\"`)
    .join("\n");
  const entries = elements
    .map(
      (element) => `        NativeElementCatalogEntry(
            name = Wire.${wireIdentifier(element.name)},
            artifact = "${element.artifact}",
            aliases = setOf(${element.aliases.map((alias) => `Wire.${wireIdentifier(alias)}`).join(", ")}),
            properties =
                listOf(
${element.properties
  .map((property) => {
    const shared = sharedProperties.get(JSON.stringify(property));
    return shared ? `                    ${shared.name},` : renderAndroidProperty(property);
  })
  .join("\n")}
                ),
${renderAndroidSet(
  "events",
  element.events.map(({ name }) => `Wire.${wireIdentifier(name)}`),
)}
${renderAndroidSet(
  "methods",
  element.methods.map(({ name }) => `Wire.${wireIdentifier(name)}`),
)}
            category = NativeElementCategory.${element.category.toUpperCase()},
            maturity = NativeElementMaturity.${element.maturity.toUpperCase()},
            minSdk = ${element.minSdk},
            stateOwnership = NativeElementStateOwnership.${element.stateOwnership.toUpperCase()},
            accessibility =
                NativeElementAccessibility(
                    role = \"${element.accessibility.role}\",
                    labelProperty = \"${element.accessibility.labelProperty}\",
                    required = ${element.accessibility.required},
                ),
        ),`,
    )
    .join("\n")
    .replace(/^/gm, "    ");
  const factories = elements
    .map((element) => {
      const signature = `    fun ${lowerIdentifier(element.name)}(factory: NativeElementFactory): NativeElementDefinition =`;
      const invocation = `definition(Wire.${wireIdentifier(element.name)}, factory)`;
      return `\n${signature} ${invocation}`.length <= 100
        ? `\n${signature} ${invocation}`
        : `\n${signature}\n        ${invocation}`;
    })
    .join("\n");

  return `// Generated code. Do not edit directly.
// Source: integrations/android/scripts/generate-native-elements.mjs.
package io.github.angularwave.android.navigation.elements

internal class NativeElementCatalogEntry(
    @JvmField val name: String,
    @JvmField val artifact: String,
    @JvmField val aliases: Set<String>,
    @JvmField val properties: List<NativePropertyDefinition>,
    @JvmField val events: Set<String>,
    @JvmField val methods: Set<String>,
    @JvmField val category: NativeElementCategory,
    @JvmField val maturity: NativeElementMaturity,
    @JvmField val minSdk: Int,
    @JvmField val stateOwnership: NativeElementStateOwnership,
    @JvmField val accessibility: NativeElementAccessibility,
)

object NativeElementCatalog {
    object Wire {
${wires}
    }

${sharedPropertyDeclarations}

    internal val all: List<NativeElementCatalogEntry> =
        listOf(
${entries}
        )

    internal val builtIns: List<NativeElementCatalogEntry> = all.filter {
        it.artifact == "navigation"
    }

    fun definition(name: String, factory: NativeElementFactory): NativeElementDefinition {
        val entry =
            requireNotNull(all.find { it.name == name }) {
                "Unknown generated native element: $name"
            }
        return NativeElementDefinition(
            name = entry.name,
            aliases = entry.aliases,
            properties = entry.properties,
            events = entry.events,
            methods = entry.methods,
            category = entry.category,
            maturity = entry.maturity,
            minSdk = entry.minSdk,
            stateOwnership = entry.stateOwnership,
            accessibility = entry.accessibility,
            factory = factory,
        )
    }
${factories}
}
`;
}

function renderAndroidSet(name, values) {
  const value = `setOf(${values.join(", ")})`;
  const line = `            ${name} = ${value},`;
  if (line.length + 4 <= 100) return line;
  return `            ${name} =
                setOf(
${values.map((entry) => `                    ${entry},`).join("\n")}
                ),`;
}

function renderKotlinJs(elements) {
  const objects = elements
    .map((element) => {
      const properties = element.properties
        .map((property) => `        public const val ${property.name}: String = \"${property.name}\"`)
        .join("\n");
      const events = element.events
        .map(({ name }) => `        public const val ${name}: String = \"${name}\"`)
        .join("\n");
      const methods = element.methods
        .map(({ name }) => `        public const val ${name}: String = \"${name}\"`)
        .join("\n");
      const parameters = element.properties
        .map((property) => `            ${property.name}: ${kotlinType(property.type)} = null`)
        .join(",\n");
      const assignments = element.properties
        .map(
          (property) =>
            `            if (${property.name} != null) values[Properties.${property.name}] = ${property.name}`,
        )
        .join("\n");
      return `    public object ${identifier(element.name)} {
        public const val name: String = \"${element.name}\"
        public val aliases: Set<String> = setOf(${quoted(element.aliases)})
        public const val category: String = \"${element.category}\"
        public const val maturity: String = \"${element.maturity}\"
        public const val minSdk: Int = ${element.minSdk}
        public const val stateOwnership: String = \"${element.stateOwnership}\"

        public object Properties {
${properties}
        }

        public object Events {
${events}
        }

        public object Methods {
${methods}
        }

        public fun properties(
${parameters},
        ): dynamic {
            val values = js(\"({})\")
${assignments}
            return values
        }
    }`;
    })
    .join("\n\n");

  const names = elements.map((element) => `${identifier(element.name)}.name`).join(", ");
  return `// Generated by integrations/android/scripts/generate-native-elements.mjs.
// Do not edit directly.
package angular.ts

/** Native Android elements supported by the Angular Native bridge. */
public object NativeElements {
${objects}

    public val names: Set<String> = setOf(${names})
}
`;
}

function renderTypeScript(elements) {
  const value = Object.fromEntries(
    elements.map((element) => [
      element.name,
      {
        name: element.name,
        aliases: element.aliases,
        category: element.category,
        maturity: element.maturity,
        minSdk: element.minSdk,
        stateOwnership: element.stateOwnership,
        accessibility: element.accessibility,
        properties: Object.fromEntries(
          element.properties.map((property) => [property.name, property]),
        ),
        methods: Object.fromEntries(element.methods.map((method) => [method.name, method])),
        events: Object.fromEntries(element.events.map((event) => [event.name, event])),
      },
    ]),
  );

  const propertyMap = elements
    .map(
      (element) => `  readonly \"${element.name}\": {\n${element.properties
        .map((property) => `    readonly ${property.name}${property.required === true ? "" : "?"}: ${typescriptType(property)};`)
        .join("\n")}\n  };`,
    )
    .join("\n");
  const eventMap = elements
    .map(
      (element) => element.events.length === 0
        ? `  readonly \"${element.name}\": Readonly<Record<never, never>>;`
        : `  readonly \"${element.name}\": {\n${element.events
          .map((event) => `    readonly ${event.name}: ${typescriptOperationType(event.payload)};`)
          .join("\n")}\n  };`,
    )
    .join("\n");
  const methodMap = elements
    .map(
      (element) => element.methods.length === 0
        ? `  readonly \"${element.name}\": Readonly<Record<never, never>>;`
        : `  readonly \"${element.name}\": {\n${element.methods
          .map((method) => `    readonly ${method.name}: { readonly parameters: ${typescriptOperationType(method.parameters)}; readonly result: ${typescriptOperationType(method.result)} };`)
          .join("\n")}\n  };`,
    )
    .join("\n");

  return `// Generated by integrations/android/scripts/generate-native-elements.mjs.\n// Do not edit directly.\n\nexport const nativeElements = ${JSON.stringify(value, null, 2)} as const;\n\nexport type NativeElementName = keyof typeof nativeElements;\n\nexport interface NativeElementPropertiesMap {\n${propertyMap}\n}\n\nexport interface NativeElementEventMap {\n${eventMap}\n}\n\nexport interface NativeElementMethodMap {\n${methodMap}\n}\n\nexport type NativeElementProperties<Name extends NativeElementName> = NativeElementPropertiesMap[Name];\nexport type NativeElementEventName<Name extends NativeElementName> = keyof NativeElementEventMap[Name];\nexport type NativeElementEventPayload<Name extends NativeElementName, Event extends NativeElementEventName<Name>> = NativeElementEventMap[Name][Event];\nexport type NativeElementMethodName<Name extends NativeElementName> = keyof NativeElementMethodMap[Name];\nexport type NativeElementMethodContract<Name extends NativeElementName, Method extends NativeElementMethodName<Name>> = NativeElementMethodMap[Name][Method];\n`;
}

function renderDocumentation(elements) {
  const sections = elements
    .map((element) => {
      const properties = element.properties
        .map(
          (property) =>
            `| \`${property.name}\` | \`${property.type.toLowerCase()}\` | ${property.required === true ? "yes" : "no"} | ${Object.hasOwn(property, "default") ? `\`${String(property.default)}\`` : "none"} |`,
        )
        .join("\n");
      const events = element.events.length > 0
        ? element.events.map(({ name }) => `\`${name}\``).join(", ")
        : "None.";
      const methods = element.methods.length > 0
        ? element.methods.map(({ name }) => `\`${name}\``).join(", ")
        : "None.";
      return `## \`${element.name}\`

Category: \`${element.category}\`. Maturity: \`${element.maturity}\`. Minimum SDK:
\`${element.minSdk}\`. State ownership: \`${element.stateOwnership}\`.

Aliases: ${element.aliases.map((alias) => `\`${alias}\``).join(", ") || "None."}

| Property | Type | Required | Default |
| --- | --- | --- | --- |
${properties}

Methods: ${methods}

Events: ${events}

Accessibility role: \`${element.accessibility.role}\`; label property:
\`${element.accessibility.labelProperty}\`.`;
    })
    .join("\n\n");

  return `# Native Element Catalog

This file is generated from \`native-elements.json\`. Edit the catalog and run
\`make -C integrations/android generate-native-elements\`.

${sections}
`;
}

function kotlinType(type) {
  switch (type) {
    case "BOOLEAN":
      return "Boolean?";
    case "FLOAT":
      return "Double?";
    case "INTEGER":
      return "Int?";
    case "JSON":
    case "STRING_LIST":
      return "dynamic";
    default:
      return "String?";
  }
}

function typescriptType(property) {
  const base = typescriptOperationType(property.type);
  return property.nullable === true && base !== "unknown" ? `${base} | null` : base;
}

function typescriptOperationType(type) {
  switch (type) {
    case "BOOLEAN":
      return "boolean";
    case "COLOR":
    case "STRING":
      return "string";
    case "FLOAT":
    case "INTEGER":
      return "number";
    case "STRING_LIST":
      return "readonly string[]";
    default:
      return "unknown";
  }
}

function lowerIdentifier(value) {
  const valueIdentifier = identifier(value);

  return valueIdentifier[0].toLowerCase() + valueIdentifier.slice(1);
}

function renderAndroidProperty(property) {
  const options = [];
  if (property.required === true) options.push("required = true");
  if (property.nullable === true) options.push("nullable = true");
  if (Object.hasOwn(property, "default")) {
    options.push(`defaultValue = ${kotlinLiteral(property.default)}`);
  }
  const argumentsList = [
    `Wire.${wireIdentifier(property.name)}`,
    `NativePropertyType.${property.type}`,
    ...options,
  ]
    .map((argument) => `                        ${argument},`)
    .join("\n");

  return `                    NativePropertyDefinition(
${argumentsList}
                    ),`;
}

function kotlinLiteral(value) {
  if (typeof value === "string") return `\"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}\"`;
  return String(value);
}
