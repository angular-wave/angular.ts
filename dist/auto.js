import { angular } from './index.js';
export { AngularRuntime } from './angular-runtime.js';
export { afterRender, queueAfterRender } from './core/render/after-render.js';
export { attrs, each, event, props, tag, tagNS, tags } from './core/compile/programmatic-view.js';
export { createAngular } from './runtime/index.js';
export { defineWorkflow } from './services/workflow/workflow.js';

document.addEventListener("DOMContentLoaded", () => {
    angular.init(document);
}, {
    once: true,
});

export { angular };
