import { _machine, _workflow, _workflowSupervisor } from '../injection-tokens.js';
import { createMachineService } from '../services/machine/machine.js';
import { createWorkflowService, createWorkflowSupervisor } from '../services/workflow/workflow.js';
import { memoizeRuntimeModule } from './custom-ng.js';

/** Registers reactive state-machine declarations and the `$machine` service. */
const machineModule = memoizeRuntimeModule((angular) => angular
    .createModule("ng.machine", [])
    .factory(_machine, createMachineService));
/** Registers workflow declarations, execution, and supervision. */
const workflowModule = memoizeRuntimeModule((angular) => angular
    .createModule("ng.workflow", [])
    .factory(_workflow, createWorkflowService)
    .factory(_workflowSupervisor, [
    _workflow,
    ($workflow) => (config) => createWorkflowSupervisor($workflow, config),
]));
/**
 * Registers the optional machine and workflow services as an AngularTS module.
 *
 * Pass this registrar through `createAngular({ modules: [...] })` when a
 * custom runtime needs `$machine`, `$workflow`, or module-level `machine(...)`
 * and `workflow(...)` declarations.
 */
const orchestrationModule = memoizeRuntimeModule((angular) => angular.createModule("ng.orchestration", [
    machineModule(angular).name,
    workflowModule(angular).name,
]));

export { machineModule, orchestrationModule, workflowModule };
