import type { RuntimeModule } from "../angular-runtime.ts";
import { _machine, _workflow } from "../injection-tokens.ts";
import { createMachineService } from "../services/machine/machine.ts";
import { createWorkflowService } from "../services/workflow/workflow.ts";

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
    .factory(_workflow, [_machine, createWorkflowService]);
