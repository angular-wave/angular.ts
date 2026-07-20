// @ts-check
/// <reference path="../@types/namespace.d.ts" />

/**
 * Exercises every public `ng.*` namespace type from a JavaScript project using
 * JSDoc type checking. This catches declaration emit regressions where the
 * namespace references a type that `stripInternal` removed from another
 * generated `.d.ts` file.
 *
 * @typedef {{
 *   Angular: ng.Angular,
 *   AnnotatedDirectiveFactory: ng.AnnotatedDirectiveFactory,
 *   ClassMap: ng.ClassMap,
 *   ClassValue: ng.ClassValue,
 *   Component: ng.Component,
 *   Controller: ng.Controller,
 *   Directive: ng.Directive<unknown>,
 *   DirectiveRestrict: ng.DirectiveRestrict,
 *   DirectiveFactory: ng.DirectiveFactory,
 *   NgModule: ng.NgModule,
 *   LinkFn: ng.LinkFn,
 *   Scope: ng.Scope,
 *   TranscludeFn: ng.TranscludeFn,
 *   AnchorScrollService: ng.AnchorScrollService,
 *   AnimateService: ng.AnimateService,
 *   AnimationHandle: ng.AnimationHandle,
 *   AnimationContext: ng.AnimationContext,
 *   AnimationLifecycleCallback: ng.AnimationLifecycleCallback,
 *   AriaService: ng.AriaService,
 *   CompileService: ng.CompileService,
 *   ControllerService: ng.ControllerService,
 *   CookieService: ng.CookieService,
 *   EventBusService: ng.EventBusService,
 *   ExceptionHandlerService: ng.ExceptionHandlerService,
 *   FilterFn: ng.FilterFn,
 *   FilterFactory: ng.FilterFactory,
 *   FilterService: ng.FilterService,
 *   EntryFilterItem: ng.EntryFilterItem,
 *   CurrencyFilterOptions: ng.CurrencyFilterOptions,
 *   HttpParamSerializerService: ng.HttpParamSerializerService,
 *   HttpService: ng.HttpService,
 *   InjectorService: ng.InjectorService,
 *   InterpolateService: ng.InterpolateService,
 *   LocationService: ng.LocationService,
 *   LogService: ng.LogService,
 *   MachineService: ng.MachineService,
 *   WorkflowService: ng.WorkflowService,
 *   ParseService: ng.ParseService,
 *   SceService: ng.SceService,
 *   SceDelegateService: ng.SceDelegateService,
 *   SseService: ng.SseService,
 *   SseConfig: ng.SseConfig,
 *   SseConnection: ng.SseConnection,
 *   RealtimeProtocolEventDetail: ng.RealtimeProtocolEventDetail<unknown, unknown>,
 *   RealtimeProtocolMessage: ng.RealtimeProtocolMessage,
 *   SwapMode: ng.SwapMode,
 *   TemplateCacheService: ng.TemplateCacheService,
 *   TemplateRequestService: ng.TemplateRequestService,
 *   TransitionsService: ng.TransitionsService,
 *   WorkerService: ng.WorkerService,
 *   AnnotatedFactory: ng.AnnotatedFactory<(...args: never[]) => unknown>,
 *   AnimationOptions: ng.AnimationOptions,
 *   AnimationPhase: ng.AnimationPhase,
 *   AnimationPreset: ng.AnimationPreset,
 *   AnimationPresetHandler: ng.AnimationPresetHandler,
 *   AnimationResult: ng.AnimationResult,
 *   AngularElementDefinition: ng.AngularElementDefinition,
 *   AngularElementModuleOptions: ng.AngularElementModuleOptions,
 *   AngularElementOptions: ng.AngularElementOptions<Record<string, unknown>>,
 *   ControllerConstructor: ng.ControllerConstructor,
 *   CookieOptions: ng.CookieOptions,
 *   CookieStoreOptions: ng.CookieStoreOptions,
 *   EntityClass: ng.EntityClass<unknown>,
 *   ErrorHandlingConfig: ng.ErrorHandlingConfig,
 *   Expression: ng.Expression,
 *   HttpMethod: ng.HttpMethod,
 *   HttpDefaults: ng.HttpDefaults,
 *   HttpResponse: ng.HttpResponse<unknown>,
 *   HttpResponseStatus: ng.HttpResponseStatus,
 *   Injectable: ng.Injectable<(...args: never[]) => unknown>,
 *   InterpolationFunction: ng.InterpolationFunction,
 *   ListenerFn: ng.ListenerFn,
 *   Machine: ng.Machine,
 *   MachineSendResult: ng.MachineSendResult,
 *   MachineSendStatus: ng.MachineSendStatus,
 *   MachineSnapshot: ng.MachineSnapshot,
 *   Workflow: ng.Workflow,
 *   WorkflowCommand: ng.WorkflowCommand,
 *   WorkflowCommandContext: ng.WorkflowCommandContext,
 *   WorkflowCommandDefinition: ng.WorkflowCommandDefinition,
 *   WorkflowResult: ng.WorkflowResult<{ file: string }>,
 *   WorkflowSnapshot: ng.WorkflowSnapshot,
 *   WorkflowSupervisor: ng.WorkflowSupervisor,
 *   WorkflowSupervisorConfig: ng.WorkflowSupervisorConfig,
 *   WorkflowSupervisorSnapshot: ng.WorkflowSupervisorSnapshot,
 *   NgModelController: ng.NgModelController,
 *   HttpRequestConfig: ng.HttpRequestConfig,
 *   HttpRequestOptions: ng.HttpRequestOptions,
 *   RestFactory: ng.RestFactory,
 *   RestBackend: ng.RestBackend,
 *   RestCacheStore: ng.RestCacheStore,
 *   RestCacheStrategy: ng.RestCacheStrategy,
 *   RestOptions: ng.RestOptions,
 *   RestRequest: ng.RestRequest,
 *   RestResponse: ng.RestResponse<unknown>,
 *   RestRevalidateEvent: ng.RestRevalidateEvent<unknown>,
 *   CachedRestBackendOptions: ng.CachedRestBackendOptions,
 *   RestService: ng.RestService<unknown, unknown>,
 *   ScopeEvent: ng.ScopeEvent,
 *   RouterModuleDeclaration: ng.RouterModuleDeclaration,
 *   StateDeclaration: ng.StateDeclaration,
 *   StatePolicyDeclaration: ng.StatePolicyDeclaration,
 *   RouteContract: ng.RouteContract,
 *   RouteMap: ng.RouteMap,
 *   RoutesOf: ng.RoutesOf<{ name: "admin" }>,
 *   ParamsOf: ng.ParamsOf<{ admin: { params: { id: string } } }, "admin">,
 *   ResolvesOf: ng.ResolvesOf<{ admin: { resolves: { user: { id: string } } } }, "admin">,
 *   RouterModule: ng.RouterModule<{ admin: {} }>,
 *   StateService: ng.StateService<{ admin: {} }>,
 *   StorageBackend: ng.StorageBackend,
 *   StorageType: ng.StorageType,
 *   ConnectionConfig: ng.ConnectionConfig,
 *   ConnectionEvent: ng.ConnectionEvent,
 *   StreamService: ng.StreamService,
 *   Transition: ng.Transition<{ admin: {} }, { to: "admin", from: "admin" }>,
 *   Validator: ng.Validator,
 *   ElementScopeOptions: ng.ElementScopeOptions,
 *   AppComponentOptions: ng.AppComponentOptions,
 *   ScopeElement: ng.ScopeElement,
 *   ScopeElementConstructor: ng.ScopeElementConstructor,
 *   WebComponentContext: ng.WebComponentContext,
 *   WebComponentInput: ng.WebComponentInput,
 *   WebComponentInputConfig: ng.WebComponentInputConfig,
 *   WebComponentInputs: ng.WebComponentInputs,
 *   WebComponentService: ng.WebComponentService,
 *   WebSocketConfig: ng.WebSocketConfig,
 *   WebSocketConnection: ng.WebSocketConnection,
 *   WebSocketService: ng.WebSocketService,
 *   WebTransportBufferInput: ng.WebTransportBufferInput,
 *   WebTransportConfig: ng.WebTransportConfig,
 *   WebTransportConnection: ng.WebTransportConnection,
 *   WebTransportDatagramEvent: ng.WebTransportDatagramEvent<unknown>,
 *   WebTransportReconnectEvent: ng.WebTransportReconnectEvent,
 *   WebTransportRetryDelay: ng.WebTransportRetryDelay,
 *   WebTransportService: ng.WebTransportService,
 *   WorkerConfig: ng.WorkerConfig,
 *   WorkerError: ng.WorkerError,
 *   WorkerErrorCode: ng.WorkerErrorCode,
 *   WorkerHandle: ng.WorkerHandle,
 *   WorkerModelMessage: ng.WorkerModelMessage,
 *   WorkerRequest: ng.WorkerRequest,
 *   WorkerRequestOptions: ng.WorkerRequestOptions,
 *   WorkerResponse: ng.WorkerResponse,
 *   WasmBinding: ng.WasmBinding,
 *   WasmBindingOptions: ng.WasmBindingOptions,
 *   WasmError: ng.WasmError,
 *   WasmErrorCode: ng.WasmErrorCode,
 *   WasmLoadOptions: ng.WasmLoadOptions,
 *   WasmResource: ng.WasmResource,
 *   WasmResourceStatus: ng.WasmResourceStatus,
 *   WasmService: ng.WasmService,
 *   WasmSource: ng.WasmSource,
 *   WasmTarget: ng.WasmTarget,
 * }} AngularTsNamespaceTypes
 */

/** @type {Partial<AngularTsNamespaceTypes>} */
export const namespaceTypes = Object.freeze({});

/** @type {ng.ClassMap} */
export const tileClasses = Object.freeze({
  placed: true,
  hit: false,
  miss: null,
  sunk: undefined,
});

/** @type {ng.ClassValue} */
export const tileClassValue = ["tile", tileClasses];

/**
 * @param {ng.Scope} $scope
 */
export function batchScopeUpdate($scope) {
  return $scope.$batch(() => {
    $scope.status = "playing";

    return $scope.status;
  });
}

/**
 * @typedef {{ data: { roomId: string }, events: { join: { roomId: string } }, state: "setup" | "waiting" }} SessionMachineContract
 */

/**
 * @param {ng.MachineService} $machine
 * @returns {ng.Machine<SessionMachineContract>}
 */
export function createSessionMachine($machine) {
  /** @type {ng.MachineConfig<SessionMachineContract>} */
  const config = {
    initial: "setup",
    data: {
      roomId: "",
    },
    states: {
      setup: {
        on: {
          join: {
            to: "waiting",
            /**
             * @param {{ data: { roomId: string }, payload: unknown }} context
             */
            update(context) {
              const payload = context.payload;

              if (
                typeof payload === "object" &&
                payload !== null &&
                "roomId" in payload &&
                typeof payload.roomId === "string"
              ) {
                context.data.roomId = payload.roomId;
              }
            },
          },
        },
      },
      waiting: {},
    },
    hooks: {
      enter: {
        /**
         * @param {{ data: { roomId: string }, to?: string }} context
         */
        waiting(context) {
          context.data.roomId = context.to || "waiting";
        },
      },
      /**
       * @param {{ machine: ng.Machine<SessionMachineContract>, from: "setup" | "waiting", to?: "setup" | "waiting" }} context
       */
      transition(context) {
        context.machine.matches(context.to || context.from);
      },
    },
  };
  /** @type {ng.Machine<SessionMachineContract>} */
  const machine = $machine(config);

  /** @type {ng.MachineSnapshot<SessionMachineContract>} */
  const snapshot = machine.snapshot();

  machine.restore(snapshot);

  return machine;
}

/**
 * @param {ng.NgModule} module
 * @returns {ng.NgModule}
 */
export function registerSessionMachine(module) {
  /** @type {any} */
  const config = {
    initial: "setup",
    data: {
      roomId: "",
    },
    states: {
      setup: {
        on: {
          join: {
            to: "waiting",
            /**
             * @param {{ data: { roomId: string }, payload: unknown }} context
             */
            update(context) {
              const payload = context.payload;

              if (
                typeof payload === "object" &&
                payload !== null &&
                "roomId" in payload &&
                typeof payload.roomId === "string"
              ) {
                context.data.roomId = payload.roomId;
              }
            },
          },
        },
      },
      waiting: {},
    },
  };

  return module.machine("sessionMachine", config);
}

/**
 * @param {ng.WorkflowService} $workflow
 * @returns {Promise<unknown>}
 */
export function createDocsWorkflow($workflow) {
  /** @type {any} */
  const config = {
    id: "docs-build",
    initial: "idle",
    data: {
      output: "",
    },
    commands: {
      build: {
        from: "idle",
        pending: "running",
        /**
         * @param {{ input: string }} context
         * @returns {{ file: string }}
         */
        execute(context) {
          return {
            file: context.input,
          };
        },
        success: {
          to: "complete",
          /** @param {{ data: { output: string }, output: { file: string } }} context */
          update(context) {
            context.data.output = context.output.file;
          },
        },
        failure: "failed",
      },
    },
  };
  /** @type {ng.Workflow<any>} */
  const workflow = $workflow(/** @type {any} */ (config));

  /** @type {ng.WorkflowSnapshot<any>} */
  const snapshot = workflow.snapshot();

  workflow.restore(snapshot);

  return workflow.run("build", "index.html");
}

/**
 * @param {ng.NgModule} module
 * @returns {ng.NgModule}
 */
export function registerDocsWorkflow(module) {
  /** @type {any} */
  const config = {
    id: "docs-build",
    initial: "idle",
    data: {
      output: "",
    },
    states: {
      idle: {},
    },
  };

  return module.workflow("docsWorkflow", config);
}
