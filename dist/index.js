import { Angular } from './angular.js';
import './services/rest/rest.js';
export { WasmScope, WasmScopeAbi } from './services/wasm/wasm.js';
export { HttpRestBackend } from './services/rest/http-rest-backend.js';

/**
 * Default browser entry point.
 *
 * It creates the shared `angular` singleton and bootstraps discovered apps
 * once the DOM is ready.
 */
const angular = new Angular();
/**
 * Auto-bootstrap the document once the browser DOM is ready.
 */
document.addEventListener("DOMContentLoaded", () => {
    angular.init(document);
}, {
    once: true,
});

export { angular };
