use crate::{ComponentController, Service};

/// AngularTS module facade used by Rust-authored applications.
#[derive(Debug, Clone)]
pub struct NgModule {
    name: &'static str,
    registrations: Vec<Registration>,
}

impl NgModule {
    /// Creates a module metadata collector.
    pub fn new(name: &'static str) -> Self {
        Self {
            name,
            registrations: Vec::new(),
        }
    }

    /// Returns the AngularTS module name.
    pub const fn name(&self) -> &'static str {
        self.name
    }

    /// Returns the registrations collected for generated glue.
    pub fn registrations(&self) -> &[Registration] {
        &self.registrations
    }

    /// Registers a Rust service type.
    pub fn service<T: Service + 'static>(&mut self) -> &mut Self {
        self.push(
            RegistrationKind::Service,
            T::TOKEN_NAME,
            T::EXPORT_NAME,
            std::any::type_name::<T>(),
        )
    }

    /// Registers a Rust factory type.
    pub fn factory<T: 'static>(&mut self) -> &mut Self {
        self.push(
            RegistrationKind::Factory,
            std::any::type_name::<T>(),
            std::any::type_name::<T>(),
            std::any::type_name::<T>(),
        )
    }

    /// Registers a Rust value type.
    pub fn value<T: 'static>(&mut self) -> &mut Self {
        self.push(
            RegistrationKind::Value,
            std::any::type_name::<T>(),
            std::any::type_name::<T>(),
            std::any::type_name::<T>(),
        )
    }

    /// Registers a Rust component controller type.
    pub fn component<T: ComponentController + 'static>(&mut self) -> &mut Self {
        self.push(
            RegistrationKind::Component,
            T::NAME,
            T::EXPORT_NAME,
            std::any::type_name::<T>(),
        )
    }

    fn push(
        &mut self,
        kind: RegistrationKind,
        angular_name: &'static str,
        export_name: &'static str,
        rust_type: &'static str,
    ) -> &mut Self {
        self.registrations.push(Registration {
            kind,
            angular_name,
            export_name,
            rust_type,
        });
        self
    }
}

/// Registration captured for generated AngularTS glue.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Registration {
    pub kind: RegistrationKind,
    pub angular_name: &'static str,
    pub export_name: &'static str,
    pub rust_type: &'static str,
}

/// AngularTS registration kind.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RegistrationKind {
    Service,
    Factory,
    Value,
    Component,
}
