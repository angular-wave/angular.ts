import { _machine, _workflow } from '../injection-tokens.js';
import { createMachineService } from '../services/machine/machine.js';
import { createWorkflowService } from '../services/workflow/workflow.js';

/**
 * Registers the optional machine and workflow services as an AngularTS module.
 *
 * Pass this registrar through `createAngular({ modules: [...] })` when a
 * custom runtime needs `$machine`, `$workflow`, or module-level `machine(...)`
 * and `workflow(...)` declarations.
 */
const orchestrationModule = (angular) => angular
    .module("ng.orchestration", [])
    .factory(_machine, createMachineService)
    .factory(_workflow, createWorkflowService);

export { orchestrationModule };
