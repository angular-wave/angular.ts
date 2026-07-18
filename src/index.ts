import { Angular } from "./angular.ts";
import type {
  AngularRuntimeConstructorInput,
  AngularRuntimeOptions,
  RuntimeModule,
} from "./angular-runtime.ts";
import type {
  AngularComposition,
  DirectiveRegistration,
  DirectiveRegistrations,
  FilterRegistration,
  FilterRegistrations,
  ProviderRegistration,
  ServiceRegistration,
  ServiceRegistrations,
} from "./runtime/index.ts";
import type {
  AfterRenderCallback,
  AfterRenderOptions,
} from "./core/render/after-render.ts";
import type {
  Machine,
  MachineConfig,
  MachineService,
  MachineSendResult,
  MachineSendStatus,
  MachineSnapshot,
} from "./services/machine/machine.ts";
import type {
  Workflow,
  WorkflowCommand,
  WorkflowCommandContext,
  WorkflowCommandOptions,
  WorkflowCommandResult,
  WorkflowCommandStatus,
  WorkflowService,
  WorkflowSnapshot,
  WorkflowSupervisor,
  WorkflowSupervisorConfig,
  WorkflowSupervisorSnapshot,
} from "./services/workflow/workflow.ts";

/**
 * Default browser entry point.
 */
export const angular = new Angular();

export { AngularRuntime, createAngular } from "./runtime/index.ts";
export { afterRender, queueAfterRender } from "./core/render/after-render.ts";
export { defineMachine } from "./services/machine/machine.ts";
export { defineCommand, defineWorkflow } from "./services/workflow/workflow.ts";

export type {
  AfterRenderCallback,
  AfterRenderOptions,
  AngularRuntimeConstructorInput,
  AngularRuntimeOptions,
  RuntimeModule,
  AngularComposition,
  DirectiveRegistration,
  DirectiveRegistrations,
  FilterRegistration,
  FilterRegistrations,
  Machine,
  MachineConfig,
  MachineService,
  MachineSendResult,
  MachineSendStatus,
  MachineSnapshot,
  ProviderRegistration,
  ServiceRegistration,
  ServiceRegistrations,
  Workflow,
  WorkflowCommand,
  WorkflowCommandContext,
  WorkflowCommandOptions,
  WorkflowCommandResult,
  WorkflowCommandStatus,
  WorkflowService,
  WorkflowSnapshot,
  WorkflowSupervisor,
  WorkflowSupervisorConfig,
  WorkflowSupervisorSnapshot,
};
