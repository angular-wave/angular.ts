//! Strict Rust/Wasm facade for authoring AngularTS applications.
//!
//! This crate is an early scaffold. It defines the public facade shape that the
//! procedural macros and generated JavaScript bridge will target.

pub mod component;
pub mod injector;
pub mod module;
pub mod scope;
pub mod services;
pub mod token;
#[cfg(target_arch = "wasm32")]
pub mod wasm;
pub mod wasm_types;

pub use angular_ts_macros::{angular_module, component, on_destroy, on_init, service, wasm_bridge};
pub use component::{ComponentController, ComponentMetadata, InjectionMetadata, TemplateSource};
pub use injector::{InjectionError, Injector, ServiceRef, UnsafeValue};
pub use module::{
    module_manifest_json, Controller, Factory, NgModule, Registration, RegistrationKind, Value,
};
pub use scope::{InvocationDetail, ListenerFn, ScopeEvent};
pub use scope::{Scope, ScopePath};
#[cfg(not(target_arch = "wasm32"))]
pub use services::MemoryStorageBackend;
pub use services::{
    ConnectionConfig, ConnectionEvent, CookieOptions, CookieSameSite, CookieService,
    CookieStoreOptions, EventBusListener, EventBusService, ExceptionHandlerService, HttpMethod,
    HttpRequestConfig, HttpRequestOptions, HttpResponse, HttpResponseStatus, HttpService,
    LogService, Machine, MachineEventMap, MachineEventTransitionConfig,
    MachineEventTransitionContext, MachineEventTransitionGuard, MachineEventTransitionHook,
    MachineEventTransitionUpdate, MachineHooks, MachineService, MachineSnapshot, MachineState,
    MachineStateConfig, MachineStateDefinition, MachineStateHooks, MachineStateMap,
    MachineStateTransitionMap, RealtimeProtocolEventDetail, RealtimeProtocolMessage, RestBackend,
    RestFactory, RestOptions, RestRequest, RestResponse, RestService, RootScopeService, Service,
    SseConfig, SseConnection, SseService, StateDeclaration, StateRegistryService,
    StateResolveArray, StateResolveObject, StateService, StorageBackend, StorageType, SwapMode,
    TemplateCacheService, TemplateRequestService, Transition, WebSocketConfig, WebSocketConnection,
    WebSocketService, WorkerConfig, WorkerCredentials, WorkerError, WorkerErrorCode, WorkerHandle,
    WorkerModelMessage, WorkerRequest, WorkerRequestOptions, WorkerResponse, WorkerService,
    WorkerStatus, WorkerType,
};
#[cfg(target_arch = "wasm32")]
pub use services::{HttpServiceExt, TemplateRequestServiceExt};
pub use token::{token, Token};
#[cfg(target_arch = "wasm32")]
pub use wasm::{WasmScope, Watch};
pub use wasm_types::{
    AbiError, BinaryField, Field, ScopeUpdate, WasmError, WasmScopeReference, WatchOptions,
    WriteOptions,
};
