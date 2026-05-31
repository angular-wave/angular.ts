import { Angular } from "./angular.ts";
import type {
  AngularRuntimeConstructorInput,
  AngularRuntimeOptions,
  BuiltinNgModuleRegistrar,
} from "./angular-runtime.ts";
import type {
  CustomAngularRuntimeOptions,
  CustomNgModuleOptions,
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
  MachineEventMap,
  MachineHooks,
  MachineMode,
  MachineModeHooks,
  MachineNoEvents,
  MachineService,
  MachineSnapshot,
  MachineTransition,
  MachineTransitionContext,
  MachineTransitionHook,
  MachineTransitionMap,
  MachineTransitionResult,
} from "./services/machine/machine.ts";
import type {
  Workflow,
  WorkflowCommand,
  WorkflowCommandContext,
  WorkflowCommandMap,
  WorkflowCommandOptions,
  WorkflowConcurrencyPolicy,
  WorkflowCommandResult,
  WorkflowConfig,
  WorkflowDiagnostic,
  WorkflowHistoryEntry,
  WorkflowMode,
  WorkflowNoCommands,
  WorkflowService,
  WorkflowSnapshot,
  WorkflowSnapshotMigration,
  WorkflowStatus,
} from "./services/workflow/workflow.ts";

/**
 * Default browser entry point.
 */
export const angular = new Angular();

export {
  AngularRuntime,
  createAngularBare,
  createAngularCustom,
  coreProviders,
  registerCustomNgModule,
} from "./runtime/index.ts";
export { afterRender, queueAfterRender } from "./core/render/after-render.ts";
export { defineMachine, MachineProvider } from "./services/machine/machine.ts";
export {
  defineCommand,
  defineWorkflow,
  WorkflowProvider,
} from "./services/workflow/workflow.ts";

export type {
  AfterRenderCallback,
  AfterRenderOptions,
  AngularRuntimeConstructorInput,
  AngularRuntimeOptions,
  BuiltinNgModuleRegistrar,
  CustomAngularRuntimeOptions,
  CustomNgModuleOptions,
  DirectiveRegistration,
  DirectiveRegistrations,
  FilterRegistration,
  FilterRegistrations,
  Machine,
  MachineConfig,
  MachineEventMap,
  MachineHooks,
  MachineMode,
  MachineModeHooks,
  MachineNoEvents,
  MachineService,
  MachineSnapshot,
  MachineTransition,
  MachineTransitionContext,
  MachineTransitionHook,
  MachineTransitionMap,
  MachineTransitionResult,
  ProviderRegistration,
  ServiceRegistration,
  ServiceRegistrations,
  Workflow,
  WorkflowCommand,
  WorkflowCommandContext,
  WorkflowCommandMap,
  WorkflowCommandOptions,
  WorkflowConcurrencyPolicy,
  WorkflowCommandResult,
  WorkflowConfig,
  WorkflowDiagnostic,
  WorkflowHistoryEntry,
  WorkflowMode,
  WorkflowNoCommands,
  WorkflowService,
  WorkflowSnapshot,
  WorkflowSnapshotMigration,
  WorkflowStatus,
};
