import { Angular } from './angular.js';
export { createAngularBare, createAngularCustom } from './runtime/index.js';
export { afterRender, queueAfterRender } from './core/render/after-render.js';
export { MachineProvider, defineMachine } from './services/machine/machine.js';
export { WorkflowProvider, defineCommand, defineWorkflow } from './services/workflow/workflow.js';
export { AngularRuntime } from './angular-runtime.js';
export { coreProviders, registerCustomNgModule } from './runtime/custom-ng.js';

/**
 * Default browser entry point.
 */
const angular = new Angular();

export { angular };
