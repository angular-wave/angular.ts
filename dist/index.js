import { Angular } from './angular.js';

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
document.addEventListener("DOMContentLoaded", () => angular.init(document), {
    once: true,
});

export { angular };
