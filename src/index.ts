import { Angular } from "./angular.ts";

/**
 * Default browser entry point.
 *
 * It creates the shared `angular` singleton and bootstraps discovered apps
 * once the DOM is ready.
 */
export const angular = new Angular();

export { HttpRestBackend } from "./services/rest/rest.ts";
export { WasmScope, WasmScopeAbi } from "./services/wasm/wasm.ts";
export type {
  CachedRestBackendOptions,
  RestBackend,
  RestCacheStore,
  RestCacheStrategy,
  RestOptions,
  RestRequest,
  RestResponse,
  RestRevalidateEvent,
} from "./services/rest/rest.ts";
export type {
  WasmAbiExports,
  WasmScopeAbiImportObject,
  WasmScopeAbiImports,
  WasmScopeBindingOptions,
  WasmScopeOptions,
  WasmScopeReference,
  WasmScopeUpdate,
  WasmScopeWatchOptions,
} from "./services/wasm/wasm.ts";

/**
 * Auto-bootstrap the document once the browser DOM is ready.
 */
document.addEventListener(
  "DOMContentLoaded",
  () => {
    angular.init(document);
  },
  {
    once: true,
  },
);
