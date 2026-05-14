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

pub use angular_ts_macros::{angular_module, component, on_destroy, on_init, service};
pub use component::{ComponentController, ComponentMetadata, InjectionMetadata, TemplateSource};
pub use injector::{InjectionError, Injector, ServiceRef, UnsafeValue};
pub use module::{NgModule, Registration, RegistrationKind};
pub use scope::Scope;
pub use services::{
    EventBusService, ExceptionHandlerService, HttpService, LogService, PubSubService,
    RootScopeService, Service,
};
pub use token::{token, Token};
