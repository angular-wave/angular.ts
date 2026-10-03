#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const harmonyRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const nativeRoot = resolve(harmonyRoot, "../native");
const outputs = [
  resolve(harmonyRoot, "entry/src/main/resources/rawfile/kitchen-sink.html"),
  resolve(harmonyRoot, "samples/kitchen-sink/entry/src/main/resources/rawfile/kitchen-sink.html"),
];

const htmlEscape = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll('"', "&quot;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

const kebabCase = (value) => value.replace(
  /[A-Z]/gu,
  (letter) => `-${letter.toLowerCase()}`,
);

const titleCase = (value) => value
  .split("-")
  .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
  .join(" ");

function sampleValue(element, property) {
  const title = titleCase(element.name);
  const named = {
    actionText: "Retry",
    contentDescription: `${title} example`,
    errorColor: "#ead8d2",
    label: `${title} example`,
    loadingText: "Loading",
    message: `${title} message`,
    placeholder: `Enter ${title.toLowerCase()}`,
    placeholderColor: "#e9e2d7",
    src: "./kitchen-sink.svg",
    text: title,
    title,
  };
  if (Object.hasOwn(named, property.name)) return named[property.name];
  if (property.default !== undefined) return property.default;
  if (property.type === "BOOLEAN") return false;
  if (property.type === "COLOR") return "#b83a24";
  if (property.type === "FLOAT" || property.type === "INTEGER") return 0;
  if (property.type === "JSON") {
    if (property.name === "items") return [{ key: "one", label: "One" }];
    if (property.name === "markers") {
      return [{ id: "one", latitude: 56.9496, longitude: 24.1052, title: "Riga" }];
    }
    return {};
  }
  if (property.type === "STRING_LIST") return ["image/*"];
  return property.name === "selectedKey" ? "one" : `${element.name}-${property.name}`;
}

function attributeValue(value) {
  return htmlEscape(typeof value === "string" ? value : JSON.stringify(value));
}

function childMarkup(element) {
  if (["bottom-bar", "navigation-rail", "radio-group", "tabs"].includes(element.name)) {
    return '<button key="one">One</button><button key="two">Two</button>';
  }
  if ([
    "app-bar",
    "box",
    "card",
    "column",
    "drawer",
    "grid",
    "list",
    "list-item",
    "pager",
    "pull-to-refresh",
    "row",
    "scaffold",
    "scroll",
    "surface",
    "swipe-action",
  ].includes(element.name)) {
    return `<ng-native-text text="${titleCase(element.name)} child"></ng-native-text>`;
  }
  return "";
}

export function renderElement(element) {
  const properties = element.properties.map((property) =>
    `${kebabCase(property.name)}="${attributeValue(sampleValue(element, property))}"`
  );
  const events = element.events.map((event) =>
    `on-${kebabCase(event.name)}="sink.record('${element.name}.${event.name}', $data)"`
  );
  const attributes = [
    `id="sink-${element.name}"`,
    `key="sink-${element.name}"`,
    ...properties,
    ...events,
  ].join("\n          ");
  const propertyRows = element.properties.map((property) =>
    `<code data-property="${property.name}">${property.name}: ${property.type}</code>`
  ).join("\n          ");
  const eventRows = element.events.map((event) =>
    `<code data-event="${event.name}">${event.name}</code>`
  ).join("\n          ");
  const methodRows = element.methods.map((method) =>
    `<code data-method="${method.name}">${method.name}()</code>`
  ).join("\n          ");
  return `
      <section class="component" data-element="${element.name}">
        <h2>${titleCase(element.name)}</h2>
        <ng-native-${element.name}
          ${attributes}
        >${childMarkup(element)}</ng-native-${element.name}>
        <div class="contract">
          ${propertyRows}
          ${eventRows}
          ${methodRows}
        </div>
      </section>`;
}

function renderCapability(capability) {
  const methods = capability.methods.map((method) =>
    `<li data-method="${method.name}"><code>${method.name}(${method.parameters === "VOID" ? "" : method.parameters})</code></li>`
  ).join("\n            ");
  const events = capability.events.map((event) =>
    `<li data-event="${event.name}"><code>${event.name}</code></li>`
  ).join("\n            ");
  const status = capability.methods.find((method) =>
    method.name === "status" && method.parameters === "VOID"
  );
  const button = status
    ? `<ng-native-button text="Check ${titleCase(capability.name)}" on-click="sink.call('${capability.name}', 'status')"></ng-native-button>`
    : "";
  return `
        <article class="capability" data-capability="${capability.name}">
          <h3>${titleCase(capability.name)}</h3>
          ${button}
          <ul>${methods}${events}</ul>
        </article>`;
}

export function renderKitchenSink(elements, capabilities) {
  const categories = new Map();
  for (const element of elements) {
    const entries = categories.get(element.category) ?? [];
    entries.push(renderElement(element));
    categories.set(element.category, entries);
  }
  const elementSections = [...categories].map(([category, entries]) => `
    <section class="category" data-category="${category}">
      <h1>${titleCase(category)}</h1>${entries.join("")}
    </section>`).join("");
  return `<!doctype html>
<html lang="en" class="platform-web">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#f7f2e8" />
    <title>AngularTS Native kitchen sink</title>
    <style>
      :root { color: #20201d; background: #f7f2e8; font: 16px "Avenir Next", Avenir, sans-serif; }
      [ng-cloak] { display: none !important; }
      body { margin: 0; }
      header { padding: 24px; background: #fffdf8; border-bottom: 1px solid #d8d0c2; }
      header h1 { margin: 0; color: #b83a24; font: 700 2rem Georgia, serif; }
      header p { margin-bottom: 0; color: #6f6b63; }
      main { display: grid; gap: 24px; padding: 24px; }
      .category { display: grid; gap: 16px; }
      .category > h1 { margin: 0; font: 700 1.5rem Georgia, serif; }
      .component, .capability { padding: 16px; background: #fffdf8; border: 1px solid #d8d0c2; border-radius: 12px; }
      .component h2, .capability h3 { margin-top: 0; }
      .contract { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
      .contract code { padding: 3px 6px; background: #eee9e0; border-radius: 999px; font-size: .75rem; }
      [data-element] > ng-native-text-field,
      [data-element] > ng-native-search-field,
      [data-element] > ng-native-image,
      [data-element] > ng-native-map,
      [data-element] > ng-native-list,
      [data-element] > ng-native-grid,
      [data-element] > ng-native-scroll,
      [data-element] > ng-native-scaffold { display: block; min-height: 180px; }
      [data-element] > :is(ng-native-row, ng-native-column, ng-native-box, ng-native-surface, ng-native-card) { display: block; min-height: 80px; }
      [data-element] > :is(ng-native-text, ng-native-button, ng-native-checkbox, ng-native-switch, ng-native-slider, ng-native-chip, ng-native-progress) { display: block; min-height: 56px; }
      .capabilities { display: grid; gap: 16px; }
      .result { position: sticky; bottom: 0; padding: 12px 24px; color: #fffaf2; background: #20201d; }
      @media (min-width: 800px) { main { grid-template-columns: repeat(2, minmax(0, 1fr)); } .capabilities { grid-column: 1 / -1; grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    </style>
  </head>
  <body ng-app="harmonyKitchenSink" ng-controller="KitchenSinkController as sink" ng-cloak>
    <header>
      <h1>AngularTS Native kitchen sink</h1>
      <p>Every generated native contract is visible here. Interact with a control to inspect its latest event.</p>
    </header>
    <main>${elementSections}
      <section class="capabilities">
        <h1>Capabilities</h1>${capabilities.map(renderCapability).join("")}
      </section>
    </main>
    <output class="result">{{ sink.result }}</output>
    <script type="module">
      import { angular } from "./dist/angular-ts.esm.js";
      import { nativeModule } from "./dist/runtime/native.js";

      nativeModule(angular);

      class KitchenSinkController {
        static $inject = ["$native"];

        constructor(native) {
          this.native = native;
          this.result = "Ready";
        }

        record(name, data) {
          this.result = name + ": " + JSON.stringify(data ?? null);
        }

        async call(target, method) {
          try {
            this.record(target + "." + method, await this.native.call(target, method));
          } catch (error) {
            this.record(target + "." + method, { error: error.message });
          }
        }
      }

      angular.createModule("harmonyKitchenSink", ["ng.native"])
        .controller("KitchenSinkController", KitchenSinkController);
    </script>
  </body>
</html>
`;
}

async function loadCatalogs() {
  const [elementsSource, capabilitiesSource] = await Promise.all([
    readFile(resolve(nativeRoot, "native-elements.json"), "utf8"),
    readFile(resolve(nativeRoot, "native-capabilities.json"), "utf8"),
  ]);
  return {
    elements: JSON.parse(elementsSource).elements,
    capabilities: JSON.parse(capabilitiesSource).capabilities,
  };
}

async function main() {
  const catalogs = await loadCatalogs();
  const generated = renderKitchenSink(catalogs.elements, catalogs.capabilities);
  if (process.argv.includes("--check")) {
    for (const output of outputs) {
      const current = await readFile(output, "utf8").catch(() => "");
      if (current !== generated) {
        throw new Error("HarmonyOS kitchen sink is stale. Run make -C integrations/harmonyos generate.");
      }
    }
    console.log("HarmonyOS sample assets are current.");
    return;
  }
  for (const output of outputs) {
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, generated);
  }
  console.log("Generated HarmonyOS kitchen sink.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
