import type { RuntimeModule } from "../angular-runtime.ts";
import {
  _machine,
  _workflow,
  _workflowSupervisor,
} from "../injection-tokens.ts";
import { createMachineService } from "../services/machine/machine.ts";
import {
  createWorkflowService,
  createWorkflowSupervisor,
  type WorkflowService,
  type WorkflowSupervisorService,
} from "../services/workflow/workflow.ts";
import { memoizeRuntimeModule } from "./custom-ng.ts";

/** Registers reactive state-machine declarations and the `$machine` service. */
export const machineModule: RuntimeModule = memoizeRuntimeModule((angular) =>
  angular
    .createModule("ng.machine", [])
    .factory(_machine, createMachineService),
);

/** Registers workflow declarations, execution, and supervision. */
export const workflowModule: RuntimeModule = memoizeRuntimeModule((angular) =>
  angular
    .createModule("ng.workflow", [])
    .factory(_workflow, createWorkflowService)
    .factory(_workflowSupervisor, [
      _workflow,
      ($workflow: WorkflowService): WorkflowSupervisorService =>
        (config) =>
          createWorkflowSupervisor($workflow, config),
    ]),
);

/**
 * Registers the optional machine and workflow services as an AngularTS module.
 *
 * Pass this registrar through `createAngular({ modules: [...] })` when a
 * custom runtime needs `$machine`, `$workflow`, or module-level `machine(...)`
 * and `workflow(...)` declarations.
 */
export const orchestrationModule: RuntimeModule = memoizeRuntimeModule(
  (angular) =>
    angular.createModule("ng.orchestration", [
      machineModule(angular).name,
      workflowModule(angular).name,
    ]),
);
