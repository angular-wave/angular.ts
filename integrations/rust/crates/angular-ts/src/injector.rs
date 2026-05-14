use crate::Token;

/// Typed reference to a service that will be resolved by generated glue.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ServiceRef<T> {
    token: Token<T>,
}

impl<T> ServiceRef<T> {
    pub const fn token(&self) -> Token<T> {
        self.token
    }
}

/// Placeholder injector facade.
#[derive(Debug, Default, Clone, Copy)]
pub struct Injector;

impl Injector {
    /// Produces a typed service reference for generated bridge code.
    pub const fn resolve<T>(&self, token: Token<T>) -> ServiceRef<T> {
        ServiceRef { token }
    }

    /// Explicit unsafe escape hatch for legacy or third-party services.
    pub const fn get_untyped(&self, name: &'static str) -> UnsafeValue {
        UnsafeValue::new(name)
    }
}

/// Explicitly untyped JavaScript boundary value.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct UnsafeValue {
    name: &'static str,
}

impl UnsafeValue {
    pub const fn new(name: &'static str) -> Self {
        Self { name }
    }

    pub const fn name(&self) -> &'static str {
        self.name
    }
}

/// Injection error placeholder for future runtime diagnostics.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InjectionError {
    message: String,
}

impl InjectionError {
    pub fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }

    pub fn message(&self) -> &str {
        &self.message
    }
}
