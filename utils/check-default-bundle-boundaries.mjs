import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const defaultUmdBundles = [
  "dist/angular-ts.umd.js",
  "dist/angular-ts.umd.min.js",
];
const wasmBundle = "dist/runtime/wasm.js";
const wasmDirectiveBundle = "dist/directive/wasm/wasm.js";
const wasmServiceBundle = "dist/services/wasm/wasm.js";
const wasmImplementationMarkers = [
  "ng-wasm cannot publish",
  "WebAssembly module does not export the AngularTS reactive ABI",
  "Cannot bind a disposed WebAssembly resource",
];
const canvasImplementationMarker = "ng-canvas requires a renderer expression.";

for (const file of defaultUmdBundles) {
  const source = readFileSync(resolve(file), "utf8");
  const marker = wasmImplementationMarkers.find((value) =>
    source.includes(value),
  );

  if (marker) {
    throw new Error(
      `${file} includes opt-in WebAssembly integration code (${marker}).`,
    );
  }
  if (source.includes(canvasImplementationMarker)) {
    throw new Error(`${file} includes opt-in native canvas integration code.`);
  }
}

const optInSource = readFileSync(resolve(wasmBundle), "utf8");
const directiveSource = readFileSync(resolve(wasmDirectiveBundle), "utf8");
const serviceSource = readFileSync(resolve(wasmServiceBundle), "utf8");

if (
  !optInSource.includes("../directive/wasm/wasm.js") ||
  !optInSource.includes("../services/wasm/wasm.js")
) {
  throw new Error(
    `${wasmBundle} does not compose the opt-in WASM integration.`,
  );
}

if (!directiveSource.includes(wasmImplementationMarkers[0])) {
  throw new Error(`${wasmDirectiveBundle} is missing the ng-wasm directive.`);
}

for (const marker of wasmImplementationMarkers.slice(1)) {
  if (!serviceSource.includes(marker)) {
    throw new Error(
      `${wasmServiceBundle} is missing expected marker: ${marker}`,
    );
  }
}

const canvasModule = readFileSync(resolve("dist/runtime/canvas.js"), "utf8");
const canvasDirective = readFileSync(
  resolve("dist/directive/canvas/canvas.js"),
  "utf8",
);
if (
  !canvasModule.includes("../directive/canvas/canvas.js") ||
  !canvasDirective.includes(canvasImplementationMarker)
) {
  throw new Error("The opt-in canvas module is missing its native directive.");
}

console.log(
  "Default UMD bundles exclude WASM and native canvas integration code; both opt-in modules are available.",
);
