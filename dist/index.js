import { Angular } from './angular.js';
export { createAngularBare, createAngularCustom } from './runtime/index.js';
export { AngularRuntime } from './angular-runtime.js';
export { coreProviders, registerCustomNgModule } from './runtime/custom-ng.js';

/**
 * Default browser entry point.
 */
const angular = new Angular();

export { angular };
