use std::marker::PhantomData;

use crate::UnsafeValue;

/// Typed wrapper for AngularTS scope state.
#[derive(Debug, Clone, Copy)]
pub struct Scope<TState> {
    _marker: PhantomData<fn() -> TState>,
}

impl<TState> Scope<TState> {
    pub const fn new() -> Self {
        Self {
            _marker: PhantomData,
        }
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
