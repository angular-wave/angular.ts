import { angular } from './index.js';
export { AngularRuntime } from './angular-runtime.js';
export { coreProviders, registerCustomNgModule } from './runtime/custom-ng.js';
export { createAngularBare, createAngularCustom } from './runtime/index.js';

document.addEventListener("DOMContentLoaded", () => {
    angular.init(document);
}, {
    once: true,
});

export { angular };
