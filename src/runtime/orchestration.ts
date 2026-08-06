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

/**
 * Registers the optional machine and workflow services as an AngularTS module.
 *
 * Pass this registrar through `createAngular({ modules: [...] })` when a
 * custom runtime needs `$machine`, `$workflow`, or module-level `machine(...)`
 * and `workflow(...)` declarations.
 */
export const orchestrationModule: RuntimeModule = (angular) =>
  angular
    .module("ng.orchestration", [])
    .factory(_machine, createMachineService)
    .factory(_workflow, createWorkflowService)
    .factory(_workflowSupervisor, [
      _workflow,
      ($workflow: WorkflowService): WorkflowSupervisorService =>
        (config) =>
          createWorkflowSupervisor($workflow, config),
    ]);
