use std::marker::PhantomData;

use crate::{UnsafeValue, WasmScopeReference};

/// Rust callback shape for AngularTS scope watchers.
pub type ListenerFn<T = (), O = ()> = fn(new_value: T, original_target: O);

/// Rust representation of an AngularTS scope event.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ScopeEvent {
    target_scope: Option<WasmScopeReference>,
    current_scope: Option<WasmScopeReference>,
    name: String,
    stopped: bool,
    default_prevented: bool,
}

impl ScopeEvent {
    /// Creates a scope event with the supplied event name.
    pub fn new(name: impl Into<String>) -> Self {
        Self {
            target_scope: None,
            current_scope: None,
            name: name.into(),
            stopped: false,
            default_prevented: false,
        }
    }

    /// Sets the target scope reference.
    pub fn with_target_scope(mut self, scope: impl Into<WasmScopeReference>) -> Self {
        self.target_scope = Some(scope.into());
        self
    }

    /// Sets the current scope reference.
    pub fn with_current_scope(mut self, scope: impl Into<WasmScopeReference>) -> Self {
        self.current_scope = Some(scope.into());
        self
    }

    /// Returns the target scope reference, when available.
    pub fn target_scope(&self) -> Option<&WasmScopeReference> {
        self.target_scope.as_ref()
    }

    /// Returns the current scope reference, when available.
    pub fn current_scope(&self) -> Option<&WasmScopeReference> {
        self.current_scope.as_ref()
    }

    /// Returns the event name.
    pub fn name(&self) -> &str {
        &self.name
    }

    /// Stops event propagation.
    pub fn stop_propagation(&mut self) {
        self.stopped = true;
    }

    /// Prevents the event default action.
    pub fn prevent_default(&mut self) {
        self.default_prevented = true;
    }

    /// Returns whether propagation has been stopped.
    pub const fn stopped(&self) -> bool {
        self.stopped
    }

    /// Returns whether the default action has been prevented.
    pub const fn default_prevented(&self) -> bool {
        self.default_prevented
    }
}

/// Invocation event detail used by AngularTS runtime callbacks.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InvocationDetail {
    expr: String,
}

impl InvocationDetail {
    /// Creates an invocation detail for an AngularTS expression.
    pub fn new(expr: impl Into<String>) -> Self {
        Self { expr: expr.into() }
    }

    /// Returns the invoked AngularTS expression.
    pub fn expr(&self) -> &str {
        &self.expr
    }
}

/// Typed wrapper for AngularTS scope state.
#[derive(Debug, Clone, Copy)]
pub struct Scope<TState> {
    _marker: PhantomData<fn() -> TState>,
}

/// Typed reference to a named path on an AngularTS scope.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ScopePath<TValue> {
    name: &'static str,
    _marker: PhantomData<fn() -> TValue>,
}

impl<TValue> ScopePath<TValue> {
    /// Creates a typed path marker for a scope property.
    pub const fn new(name: &'static str) -> Self {
        Self {
            name,
            _marker: PhantomData,
        }
    }

    /// Returns the AngularTS scope path name.
    pub const fn name(&self) -> &'static str {
        self.name
    }
}

impl<TState> Scope<TState> {
    /// Creates a typed wrapper for AngularTS scope state.
    pub const fn new() -> Self {
        Self {
            _marker: PhantomData,
        }
    }

    /// Creates a typed marker for a property path on this scope.
    pub const fn path<TValue>(&self, name: &'static str) -> ScopePath<TValue> {
        ScopePath::new(name)
    }

    /// Explicit unsafe escape hatch for dynamic scope writes.
    pub const fn unsafe_set(&self, name: &'static str) -> UnsafeValue {
        UnsafeValue::new(name)
    }
}

impl<TState> Default for Scope<TState> {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scope_event_tracks_propagation_flags() {
        let mut event = ScopeEvent::new("saved")
            .with_target_scope(10)
            .with_current_scope("todoList:main");

        assert_eq!(event.name(), "saved");
        assert_eq!(
            event.target_scope().and_then(WasmScopeReference::handle),
            Some(10)
        );
        assert_eq!(
            event.current_scope().and_then(WasmScopeReference::name),
            Some("todoList:main")
        );
        assert!(!event.stopped());
        assert!(!event.default_prevented());

        event.stop_propagation();
        event.prevent_default();

        assert!(event.stopped());
        assert!(event.default_prevented());
    }

    #[test]
    fn invocation_detail_exposes_expression() {
        let detail = InvocationDetail::new("ctrl.save()");

        assert_eq!(detail.expr(), "ctrl.save()");
    }

    #[test]
    fn typed_scope_creates_typed_paths() {
        struct TodoState;

        let scope = Scope::<TodoState>::new();
        let title: ScopePath<String> = scope.path("title");

        assert_eq!(title.name(), "title");
        assert_eq!(scope.unsafe_set("legacy").name(), "legacy");
    }
}
