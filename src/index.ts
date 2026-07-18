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
  Policy,
  PolicyContext,
  PolicyDecision,
} from "./core/policy/policy.ts";
import type {
  Machine,
  MachineContract,
  MachineConfig,
  MachineService,
  MachineSendResult,
  MachineSendStatus,
  MachineSnapshot,
} from "./services/machine/machine.ts";
import type {
  Workflow,
  WorkflowContract,
  WorkflowCommand,
  WorkflowCommandContract,
  WorkflowCommandContext,
  WorkflowCommandDefinition,
  WorkflowResult,
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
export { defineWorkflow } from "./services/workflow/workflow.ts";

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
  MachineContract,
  MachineConfig,
  MachineService,
  MachineSendResult,
  MachineSendStatus,
  MachineSnapshot,
  Policy,
  PolicyContext,
  PolicyDecision,
  ProviderRegistration,
  ServiceRegistration,
  ServiceRegistrations,
  Workflow,
  WorkflowContract,
  WorkflowCommand,
  WorkflowCommandContract,
  WorkflowCommandContext,
  WorkflowCommandDefinition,
  WorkflowResult,
  WorkflowService,
  WorkflowSnapshot,
  WorkflowSupervisor,
  WorkflowSupervisorConfig,
  WorkflowSupervisorSnapshot,
};
