//! Portable Rust types for typed AngularTS scope authoring from Wasm.
//!
//! The field, update, and options types do not require a browser or `wasm32`
//! target. Runtime calls live in `wasm.rs`.

use std::{fmt, marker::PhantomData};

/// A typed path in an AngularTS model or scope.
///
/// Generated contracts expose fields as constants, so the value type travels
/// with the path through reads, writes, deletes, and observers.
#[derive(Debug, PartialEq, Eq, Hash)]
pub struct Field<T> {
    path: &'static str,
    marker: PhantomData<fn() -> T>,
}

impl<T> Field<T> {
    /// Creates a typed field for one stable scope path.
    pub const fn new(path: &'static str) -> Self {
        Self {
            path,
            marker: PhantomData,
        }
    }

    /// Returns the underlying AngularTS scope path.
    pub const fn path(self) -> &'static str {
        self.path
    }
}

impl<T> Clone for Field<T> {
    fn clone(&self) -> Self {
        *self
    }
}

impl<T> Copy for Field<T> {}

/// A byte-array path in an AngularTS model or scope.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct BinaryField {
    path: &'static str,
    optional: bool,
}

impl BinaryField {
    /// Creates a required binary field.
    pub const fn new(path: &'static str) -> Self {
        Self {
            path,
            optional: false,
        }
    }

    /// Creates an optional binary field.
    pub const fn optional(path: &'static str) -> Self {
        Self {
            path,
            optional: true,
        }
    }

    /// Returns the underlying AngularTS scope path.
    pub const fn path(self) -> &'static str {
        self.path
    }

    /// Returns whether the contract permits the field to be absent.
    pub const fn is_optional(self) -> bool {
        self.optional
    }
}

/// Machine-readable error reported by the AngularTS Wasm ABI.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AbiError {
    /// The ABI has been disposed.
    Disposed,
    /// A scope, watch, or buffer handle is invalid.
    InvalidHandle,
    /// A guest pointer or memory range is invalid.
    InvalidPointer,
    /// A payload length is invalid or exceeds its limit.
    InvalidLength,
    /// A JSON payload could not be decoded.
    InvalidJson,
    /// A scope path is unsafe.
    UnsafePath,
    /// A host resource limit was exceeded.
    LimitExceeded,
    /// A transaction or write-options payload is invalid.
    InvalidTransaction,
    /// A value is not supported by the requested operation.
    UnsupportedValue,
    /// The host operation failed.
    OperationFailed,
    /// A newer host returned an error code unknown to this crate.
    Unknown(u32),
}

impl AbiError {
    /// Converts the numeric ABI error code into a Rust value.
    pub const fn from_code(code: u32) -> Option<Self> {
        match code {
            0 => None,
            1 => Some(Self::Disposed),
            2 => Some(Self::InvalidHandle),
            3 => Some(Self::InvalidPointer),
            4 => Some(Self::InvalidLength),
            5 => Some(Self::InvalidJson),
            6 => Some(Self::UnsafePath),
            7 => Some(Self::LimitExceeded),
            8 => Some(Self::InvalidTransaction),
            9 => Some(Self::UnsupportedValue),
            10 => Some(Self::OperationFailed),
            code => Some(Self::Unknown(code)),
        }
    }

    /// Returns the numeric ABI error code.
    pub const fn code(self) -> u32 {
        match self {
            Self::Disposed => 1,
            Self::InvalidHandle => 2,
            Self::InvalidPointer => 3,
            Self::InvalidLength => 4,
            Self::InvalidJson => 5,
            Self::UnsafePath => 6,
            Self::LimitExceeded => 7,
            Self::InvalidTransaction => 8,
            Self::UnsupportedValue => 9,
            Self::OperationFailed => 10,
            Self::Unknown(code) => code,
        }
    }
}

/// Failure returned by the ergonomic Rust scope API.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum WasmError {
    /// The wrapper does not target a live host scope.
    InvalidScope,
    /// No bound AngularTS scope has the requested stable name.
    ScopeNotFound(String),
    /// The supplied scope path is empty.
    InvalidPath,
    /// The host ABI rejected the operation.
    Abi(AbiError),
    /// Rust could not serialize a value for the host.
    Encode(String),
    /// Rust could not deserialize a host value.
    Decode(String),
}

impl fmt::Display for WasmError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidScope => formatter.write_str("invalid AngularTS Wasm scope"),
            Self::ScopeNotFound(name) => {
                write!(formatter, "AngularTS Wasm scope '{name}' is not bound")
            }
            Self::InvalidPath => formatter.write_str("AngularTS Wasm scope path cannot be empty"),
            Self::Abi(error) => write!(formatter, "AngularTS Wasm ABI error {}", error.code()),
            Self::Encode(message) => {
                write!(formatter, "could not encode Wasm scope value: {message}")
            }
            Self::Decode(message) => {
                write!(formatter, "could not decode Wasm scope value: {message}")
            }
        }
    }
}

impl std::error::Error for WasmError {}

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
pub struct ScopeUpdate<T> {
    scope: WasmScopeReference,
    path: String,
    value: Option<T>,
    origin: Option<String>,
}

impl<T> ScopeUpdate<T> {
    /// Creates an update for a scope reference, changed path, and current value.
    pub fn new(scope: impl Into<WasmScopeReference>, path: impl Into<String>, value: T) -> Self {
        Self {
            scope: scope.into(),
            path: path.into(),
            value: Some(value),
            origin: None,
        }
    }

    /// Creates a deletion update with no current value.
    pub fn deletion(scope: impl Into<WasmScopeReference>, path: impl Into<String>) -> Self {
        Self {
            scope: scope.into(),
            path: path.into(),
            value: None,
            origin: None,
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
    pub const fn value(&self) -> Option<&T> {
        self.value.as_ref()
    }

    /// Returns whether this update removed the path.
    pub const fn deleted(&self) -> bool {
        self.value.is_none()
    }

    /// Returns the stable source identifier supplied by the writer.
    pub fn origin(&self) -> Option<&str> {
        self.origin.as_deref()
    }

    /// Attaches the writer's stable source identifier.
    pub fn with_origin(mut self, origin: Option<String>) -> Self {
        self.origin = origin;
        self
    }

    /// Consumes the update and returns its value.
    pub fn into_value(self) -> Option<T> {
        self.value
    }

    /// Maps the update value while preserving the scope reference and path.
    pub fn map<U>(self, mapper: impl FnOnce(T) -> U) -> ScopeUpdate<U> {
        ScopeUpdate {
            scope: self.scope,
            path: self.path,
            value: self.value.map(mapper),
            origin: self.origin,
        }
    }

    /// Fallibly maps a set value while preserving deletion and metadata.
    pub fn try_map<U, E>(
        self,
        mapper: impl FnOnce(T) -> Result<U, E>,
    ) -> Result<ScopeUpdate<U>, E> {
        Ok(ScopeUpdate {
            scope: self.scope,
            path: self.path,
            value: match self.value {
                Some(value) => Some(mapper(value)?),
                None => None,
            },
            origin: self.origin,
        })
    }
}

/// Options for registering one scope watch.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct WatchOptions {
    initial: bool,
}

impl WatchOptions {
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

/// Origin and echo behavior for one scope write.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct WriteOptions {
    origin: Option<String>,
    echo: Option<bool>,
}

impl WriteOptions {
    /// Creates write options with host defaults.
    pub const fn new() -> Self {
        Self {
            origin: None,
            echo: None,
        }
    }

    /// Returns the stable source identifier used to prevent synchronization loops.
    pub fn origin(&self) -> Option<&str> {
        self.origin.as_deref()
    }

    /// Returns the explicit echo behavior, when supplied.
    pub const fn echo(&self) -> Option<bool> {
        self.echo
    }

    /// Sets the stable source identifier.
    pub fn with_origin(mut self, origin: impl Into<String>) -> Self {
        self.origin = Some(origin.into());
        self
    }

    /// Sets whether guest observers receive this write.
    pub const fn with_echo(mut self, echo: bool) -> Self {
        self.echo = Some(echo);
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
        assert!(!WasmScopeReference::from_handle(0).is_valid());
        assert!(!WasmScopeReference::from_name("").is_valid());
    }

    #[test]
    fn wasm_scope_update_preserves_scope_path_and_value() {
        let update = ScopeUpdate::new(
            WasmScopeReference::from_handle_and_name(3, "counter"),
            "count",
            10,
        );

        assert_eq!(update.scope_handle(), Some(3));
        assert_eq!(update.scope_name(), Some("counter"));
        assert_eq!(update.path(), "count");
        assert_eq!(update.value(), Some(&10));
        let update = update
            .with_origin(Some("socket".to_string()))
            .map(|count| count + 1);
        assert_eq!(update.value(), Some(&11));
        assert!(!update.deleted());
        assert_eq!(update.origin(), Some("socket"));

        let deleted = ScopeUpdate::<i32>::deletion(3, "count")
            .try_map::<String, ()>(|count| Ok(count.to_string()))
            .unwrap();
        assert!(deleted.deleted());
        assert_eq!(deleted.value(), None);
    }

    #[test]
    fn watch_options_are_builder_friendly() {
        let watch = WatchOptions::new().with_initial(true);
        assert!(watch.initial());

        let write = WriteOptions::new().with_origin("physics").with_echo(false);
        assert_eq!(write.origin(), Some("physics"));
        assert_eq!(write.echo(), Some(false));
    }

    #[test]
    fn typed_fields_carry_paths_and_binary_optionality() {
        const COUNT: Field<u32> = Field::new("count");
        const FRAME: BinaryField = BinaryField::optional("frame");

        assert_eq!(COUNT.path(), "count");
        assert_eq!(FRAME.path(), "frame");
        assert!(FRAME.is_optional());
    }

    #[test]
    fn abi_errors_round_trip_known_and_future_codes() {
        for code in 1..=10 {
            assert_eq!(AbiError::from_code(code).map(AbiError::code), Some(code));
        }
        assert_eq!(AbiError::from_code(0), None);
        assert_eq!(AbiError::from_code(77), Some(AbiError::Unknown(77)));
        assert_eq!(
            WasmError::ScopeNotFound("player:main".to_string()).to_string(),
            "AngularTS Wasm scope 'player:main' is not bound"
        );
    }
}
