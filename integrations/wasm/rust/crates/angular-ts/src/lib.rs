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
    HttpResponse, HttpResponseStatus, HttpService, LogService, Machine, MachineConfig,
    MachineEventMap, MachineGuard, MachineHooks, MachineMode, MachineModeHooks, MachineProvider,
    MachineService, MachineSnapshot, MachineTransition, MachineTransitionContext,
    MachineTransitionDefinition, MachineTransitionDescriptor, MachineTransitionHook,
    MachineTransitionMap, MachineTransitionResult, PubSubService, RealtimeProtocolEventDetail,
    RealtimeProtocolMessage, RequestConfig, RequestShortcutConfig, RestBackend, RestDefinition,
    RestFactory, RestOptions, RestRequest, RestResponse, RestService, RootScopeService, Service,
    SseConfig, SseConnection, SseService, StateDeclaration, StateRegistryService,
    StateResolveArray, StateResolveObject, StateService, StorageBackend, StorageType, SwapModeType,
    TemplateCacheService, TemplateRequestService, Transition, WebSocketConfig, WebSocketConnection,
    WebSocketService,
};
#[cfg(target_arch = "wasm32")]
pub use services::{HttpServiceExt, TemplateRequestServiceExt};
pub use token::{token, Token};
#[cfg(target_arch = "wasm32")]
pub use wasm::{read_abi_json, read_abi_string, WasmScope};
pub use wasm_types::{
    WasmScopeBindingOptions, WasmScopeReference, WasmScopeUpdate, WasmScopeWatchOptions,
};
