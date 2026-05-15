//! Portable Rust types for the AngularTS Wasm scope ABI.
//!
//! These types mirror the public `ng` namespace Wasm scope declarations without
//! requiring a browser or `wasm32` target. Runtime calls live in `wasm.rs`.

/// Logical reference to one AngularTS `WasmScope`.
///
/// The language-neutral ABI accepts either a numeric host handle or a stable
/// scope name. A reference may carry both when a named scope has also been
/// resolved to a host handle.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WasmScopeReference {
    handle: Option<u32>,
    name: Option<String>,
}

impl WasmScopeReference {
    /// Creates a reference from a numeric host scope handle.
    pub const fn from_handle(handle: u32) -> Self {
        Self {
            handle: Some(handle),
            name: None,
        }
    }

    /// Creates a reference from a stable AngularTS scope name.
    pub fn from_name(name: impl Into<String>) -> Self {
        Self {
            handle: None,
            name: Some(name.into()),
        }
    }

    /// Creates a reference with both the host handle and stable scope name.
    pub fn from_handle_and_name(handle: u32, name: impl Into<String>) -> Self {
        Self {
            handle: Some(handle),
            name: Some(name.into()),
        }
    }

    /// Returns the numeric host scope handle, when the reference has one.
    pub const fn handle(&self) -> Option<u32> {
        self.handle
    }

    /// Returns the stable scope name, when the reference has one.
    pub fn name(&self) -> Option<&str> {
        self.name.as_deref()
    }

    /// Returns `true` when this reference can target a scope through the ABI.
    pub fn is_valid(&self) -> bool {
        self.handle.unwrap_or_default() != 0
            || self.name.as_deref().is_some_and(|name| !name.is_empty())
    }

    /// Returns a copy of this reference with the supplied resolved handle.
    pub fn with_resolved_handle(&self, handle: u32) -> Self {
        Self {
            handle: Some(handle),
            name: self.name.clone(),
        }
    }
}

impl From<u32> for WasmScopeReference {
    fn from(handle: u32) -> Self {
        Self::from_handle(handle)
    }
}

impl From<String> for WasmScopeReference {
    fn from(name: String) -> Self {
        Self::from_name(name)
    }
}

impl From<&str> for WasmScopeReference {
    fn from(name: &str) -> Self {
        Self::from_name(name)
    }
}

/// Scope update delivered from AngularTS to a Wasm client callback.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WasmScopeUpdate<T> {
    scope: WasmScopeReference,
    path: String,
    value: T,
}

impl<T> WasmScopeUpdate<T> {
    /// Creates an update for a scope reference, changed path, and current value.
    pub fn new(scope: impl Into<WasmScopeReference>, path: impl Into<String>, value: T) -> Self {
        Self {
            scope: scope.into(),
            path: path.into(),
            value,
        }
    }

    /// Creates an update for a numeric host scope handle.
    pub fn from_handle(handle: u32, path: impl Into<String>, value: T) -> Self {
        Self::new(WasmScopeReference::from_handle(handle), path, value)
    }

    /// Creates an update for a stable AngularTS scope name.
    pub fn from_name(name: impl Into<String>, path: impl Into<String>, value: T) -> Self {
        Self::new(WasmScopeReference::from_name(name), path, value)
    }

    /// Returns the scope reference that produced this update.
    pub const fn scope(&self) -> &WasmScopeReference {
        &self.scope
    }

    /// Returns the host scope handle, when the update has one.
    pub const fn scope_handle(&self) -> Option<u32> {
        self.scope.handle()
    }

    /// Returns the stable scope name, when the update has one.
    pub fn scope_name(&self) -> Option<&str> {
        self.scope.name()
    }

    /// Returns the changed scope path.
    pub fn path(&self) -> &str {
        &self.path
    }

    /// Returns the current value at the changed scope path.
    pub const fn value(&self) -> &T {
        &self.value
    }

    /// Consumes the update and returns its value.
    pub fn into_value(self) -> T {
        self.value
    }

    /// Maps the update value while preserving the scope reference and path.
    pub fn map<U>(self, mapper: impl FnOnce(T) -> U) -> WasmScopeUpdate<U> {
        WasmScopeUpdate {
            scope: self.scope,
            path: self.path,
            value: mapper(self.value),
        }
    }
}

/// Options for registering one scope watch.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct WasmScopeWatchOptions {
    initial: bool,
}

impl WasmScopeWatchOptions {
    /// Creates watch options with default behavior.
    pub const fn new() -> Self {
        Self { initial: false }
    }

    /// Returns whether the current value should be emitted immediately.
    pub const fn initial(&self) -> bool {
        self.initial
    }

    /// Sets whether the current value should be emitted immediately.
    pub const fn with_initial(mut self, initial: bool) -> Self {
        self.initial = initial;
        self
    }
}

/// Options for binding an AngularTS scope to Wasm lifecycle callbacks.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct WasmScopeBindingOptions {
    name: Option<String>,
    watch: Vec<String>,
    initial: bool,
}

impl WasmScopeBindingOptions {
    /// Creates binding options with default behavior.
    pub fn new() -> Self {
        Self::default()
    }

    /// Returns the stable scope name override.
    pub fn name(&self) -> Option<&str> {
        self.name.as_deref()
    }

    /// Returns watched paths that should emit scope update callbacks.
    pub fn watch(&self) -> &[String] {
        &self.watch
    }

    /// Returns whether watched paths should emit their current values on bind.
    pub const fn initial(&self) -> bool {
        self.initial
    }

    /// Sets a stable scope name override.
    pub fn with_name(mut self, name: impl Into<String>) -> Self {
        self.name = Some(name.into());
        self
    }

    /// Adds a watched scope path.
    pub fn with_watch(mut self, path: impl Into<String>) -> Self {
        self.watch.push(path.into());
        self
    }

    /// Replaces the watched scope paths.
    pub fn with_watches<I, S>(mut self, paths: I) -> Self
    where
        I: IntoIterator<Item = S>,
        S: Into<String>,
    {
        self.watch = paths.into_iter().map(Into::into).collect();
        self
    }

    /// Sets whether watched paths should emit their current values on bind.
    pub const fn with_initial(mut self, initial: bool) -> Self {
        self.initial = initial;
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wasm_scope_reference_supports_handles_and_names() {
        let handle = WasmScopeReference::from_handle(42);
        let name = WasmScopeReference::from_name("todoList:main");
        let both = WasmScopeReference::from_handle_and_name(7, "todoList:item");

        assert_eq!(handle.handle(), Some(42));
        assert_eq!(handle.name(), None);
        assert!(handle.is_valid());
        assert_eq!(name.handle(), None);
        assert_eq!(name.name(), Some("todoList:main"));
        assert!(name.is_valid());
        assert_eq!(both.handle(), Some(7));
        assert_eq!(both.name(), Some("todoList:item"));
    }

    #[test]
    fn wasm_scope_update_preserves_scope_path_and_value() {
        let update = WasmScopeUpdate::new(
            WasmScopeReference::from_handle_and_name(3, "counter"),
            "count",
            10,
        );

        assert_eq!(update.scope_handle(), Some(3));
        assert_eq!(update.scope_name(), Some("counter"));
        assert_eq!(update.path(), "count");
        assert_eq!(update.value(), &10);
        assert_eq!(update.map(|count| count + 1).into_value(), 11);
    }

    #[test]
    fn wasm_scope_options_are_builder_friendly() {
        let watch = WasmScopeWatchOptions::new().with_initial(true);
        let binding = WasmScopeBindingOptions::new()
            .with_name("todoList:main")
            .with_watch("title")
            .with_watches(["items", "remainingCount"])
            .with_initial(true);

        assert!(watch.initial());
        assert_eq!(binding.name(), Some("todoList:main"));
        assert_eq!(
            binding.watch(),
            &["items".to_string(), "remainingCount".to_string()]
        );
        assert!(binding.initial());
    }
}
