import { Angular } from './angular.js';
export { createAngular } from './runtime/index.js';
export { afterRender, queueAfterRender } from './core/render/after-render.js';
export { defineWorkflow } from './services/workflow/workflow.js';
export { AngularRuntime } from './angular-runtime.js';

/**
 * Default browser entry point.
 */
const angular = new Angular();

export { angular };
