import { angular } from './index.js';
export { AngularRuntime } from './angular-runtime.js';
export { MachineProvider, defineMachine } from './services/machine/machine.js';
export { WorkflowProvider, defineCommand, defineWorkflow } from './services/workflow/workflow.js';
export { afterRender, queueAfterRender } from './core/render/after-render.js';
export { coreProviders, registerCustomNgModule } from './runtime/custom-ng.js';
export { createAngularBare, createAngularCustom } from './runtime/index.js';

document.addEventListener("DOMContentLoaded", () => {
    angular.init(document);
}, {
    once: true,
});

export { angular };
