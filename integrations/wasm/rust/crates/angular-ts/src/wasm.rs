use js_sys::{Array, Object, Reflect, JSON};
use serde::{de::DeserializeOwned, Serialize};
use std::{cell::RefCell, collections::HashMap};
use wasm_bindgen::prelude::*;

use crate::{
    AbiError, BinaryField, Field, ScopeUpdate, WasmError, WasmScopeReference, WatchOptions,
    WriteOptions,
};

type ScopeWatchCallback = Box<dyn FnMut(ScopeUpdate<JsValue>)>;

#[derive(Debug, Clone)]
struct WatchRegistration {
    scope_handle: u32,
    host_path: String,
    local_path: String,
    reference: WasmScopeReference,
}

thread_local! {
    static SCOPE_WATCH_CALLBACKS: RefCell<HashMap<u32, ScopeWatchCallback>> =
        RefCell::new(HashMap::new());
    static SCOPE_WATCH_REGISTRATIONS: RefCell<HashMap<u32, WatchRegistration>> =
        RefCell::new(HashMap::new());
}

/// A host watch owned by Rust.
///
/// Dropping the value unregisters the watch and its callback. Keep it alive for
/// as long as updates should be delivered.
#[must_use = "dropping a Watch immediately unregisters it"]
#[derive(Debug)]
pub struct Watch {
    handle: Option<u32>,
}

impl Watch {
    fn new(handle: u32) -> Self {
        Self {
            handle: Some(handle),
        }
    }

    /// Returns the underlying ABI watch handle.
    pub fn handle(&self) -> Option<u32> {
        self.handle
    }

    /// Unregisters this watch before it goes out of scope.
    pub fn cancel(&mut self) -> Result<(), WasmError> {
        let Some(handle) = self.handle.take() else {
            return Ok(());
        };

        unregister_watch(handle)
    }
}

impl Drop for Watch {
    fn drop(&mut self) {
        let _ = self.cancel();
    }
}

/// A typed atomic set/delete transaction for one AngularTS scope.
pub struct Transaction<'scope> {
    scope: &'scope WasmScope,
    set: Object,
    deleted: Array,
    options: WriteOptions,
}

impl<'scope> Transaction<'scope> {
    fn new(scope: &'scope WasmScope) -> Self {
        Self {
            scope,
            set: Object::new(),
            deleted: Array::new(),
            options: WriteOptions::new(),
        }
    }

    /// Adds one typed assignment to this transaction.
    pub fn set<T>(self, field: Field<T>, value: T) -> Result<Self, WasmError>
    where
        T: Serialize,
    {
        self.scope.validate_path(field.path())?;
        let value = serde_wasm_bindgen::to_value(&value)
            .map_err(|error| WasmError::Encode(error.to_string()))?;
        Reflect::set(
            &self.set,
            &JsValue::from_str(&self.scope.scope_path(field.path())),
            &value,
        )
        .map_err(|error| WasmError::Encode(format_js_error(error)))?;

        Ok(self)
    }

    /// Adds one typed deletion to this transaction.
    pub fn delete<T>(self, field: Field<T>) -> Result<Self, WasmError> {
        self.scope.validate_path(field.path())?;
        self.deleted
            .push(&JsValue::from_str(&self.scope.scope_path(field.path())));

        Ok(self)
    }

    /// Tags every change with a stable synchronization origin.
    pub fn origin(mut self, origin: impl Into<String>) -> Self {
        self.options = self.options.with_origin(origin);
        self
    }

    /// Controls whether guest observers receive this transaction.
    pub fn echo(mut self, echo: bool) -> Self {
        self.options = self.options.with_echo(echo);
        self
    }

    /// Applies all queued changes atomically.
    pub fn commit(self) -> Result<(), WasmError> {
        if Object::keys(&self.set).length() == 0 && self.deleted.length() == 0 {
            return Err(WasmError::Abi(AbiError::InvalidTransaction));
        }

        let transaction = Object::new();

        if Object::keys(&self.set).length() != 0 {
            Reflect::set(&transaction, &JsValue::from_str("set"), &self.set)
                .map_err(|error| WasmError::Encode(format_js_error(error)))?;
        }
        if self.deleted.length() != 0 {
            Reflect::set(&transaction, &JsValue::from_str("delete"), &self.deleted)
                .map_err(|error| WasmError::Encode(format_js_error(error)))?;
        }
        apply_write_options(&transaction, &self.options)?;

        let transaction = JsValue::from(transaction);
        self.scope.apply_json(&stringify_abi_json(&transaction)?)
    }
}

/// Rust facade for a host-owned AngularTS `WasmScope` ABI handle.
#[wasm_bindgen]
#[derive(Debug)]
pub struct WasmScope {
    reference: WasmScopeReference,
    prefix: String,
}

impl Default for WasmScope {
    fn default() -> Self {
        Self {
            reference: WasmScopeReference::from_handle(0),
            prefix: String::new(),
        }
    }
}

#[wasm_bindgen]
impl WasmScope {
    /// Creates a Rust wrapper for one host-owned AngularTS scope handle.
    #[wasm_bindgen(constructor)]
    pub fn new(handle: u32, prefix: String) -> Self {
        Self {
            reference: WasmScopeReference::from_handle(handle),
            prefix,
        }
    }

    /// Creates a Rust wrapper for one stable AngularTS scope name.
    #[wasm_bindgen(js_name = named)]
    pub fn named(name: String, prefix: String) -> Result<WasmScope, JsValue> {
        Self::resolve(name, prefix).map_err(|error| JsValue::from_str(&error.to_string()))
    }
}

impl WasmScope {
    /// Resolves a stable AngularTS scope name into a checked Rust wrapper.
    pub fn resolve(name: impl Into<String>, prefix: impl Into<String>) -> Result<Self, WasmError> {
        let name = name.into();
        if name.is_empty() {
            return Err(WasmError::InvalidScope);
        }

        let handle = resolve_scope_name(&name);
        if handle == 0 {
            return Err(match current_abi_error() {
                Some(error) => WasmError::Abi(error),
                None => WasmError::ScopeNotFound(name),
            });
        }

        Ok(Self {
            reference: WasmScopeReference::from_handle_and_name(handle, name),
            prefix: prefix.into(),
        })
    }

    /// Returns the numeric host scope handle.
    pub fn handle(&self) -> u32 {
        self.reference.handle().unwrap_or_default()
    }

    /// Returns the stable scope name, when this wrapper targets one.
    pub fn name(&self) -> Option<&str> {
        self.reference.name()
    }

    /// Starts one typed atomic set/delete transaction.
    pub fn update(&self) -> Transaction<'_> {
        Transaction::new(self)
    }

    /// Reads and validates a generated typed field.
    pub fn get<T>(&self, field: Field<T>) -> Result<T, WasmError>
    where
        T: DeserializeOwned,
    {
        serde_wasm_bindgen::from_value(self.get_raw(field.path())?)
            .map_err(|error| WasmError::Decode(error.to_string()))
    }

    fn get_raw(&self, path: &str) -> Result<JsValue, WasmError> {
        self.validate_path(path)?;

        let path = self.scope_path(path);
        let path_bytes = path.as_bytes();
        let buffer_handle = unsafe {
            abi_scope_get(
                self.handle(),
                path_bytes.as_ptr() as u32,
                path_bytes.len() as u32,
            )
        };

        if buffer_handle == 0 {
            return Err(last_abi_error());
        }

        let ptr = unsafe { abi_buffer_ptr(buffer_handle) };
        let len = unsafe { abi_buffer_len(buffer_handle) };
        let value = read_abi_json(ptr, len);

        unsafe {
            abi_buffer_free(buffer_handle);
        }

        value.map_err(|error| WasmError::Decode(format_js_error(error)))
    }

    /// Serializes and writes a generated typed field.
    pub fn set<T>(&self, field: Field<T>, value: T) -> Result<(), WasmError>
    where
        T: Serialize,
    {
        let value = serde_wasm_bindgen::to_value(&value)
            .map_err(|error| WasmError::Encode(error.to_string()))?;

        self.set_raw(field.path(), value)
    }

    /// Serializes and writes a generated typed field with synchronization options.
    pub fn set_with<T>(
        &self,
        field: Field<T>,
        value: T,
        options: WriteOptions,
    ) -> Result<(), WasmError>
    where
        T: Serialize,
    {
        let mut transaction = self.update().set(field, value)?;
        transaction.options = options;
        transaction.commit()
    }

    fn set_raw(&self, path: &str, value: JsValue) -> Result<(), WasmError> {
        self.validate_path(path)?;

        let path = self.scope_path(path);
        let path_bytes = path.as_bytes();
        let json = stringify_abi_json(&value)?;
        let json_bytes = json.as_bytes();

        let status = unsafe {
            abi_scope_set(
                self.handle(),
                path_bytes.as_ptr() as u32,
                path_bytes.len() as u32,
                json_bytes.as_ptr() as u32,
                json_bytes.len() as u32,
            )
        };

        status_result(status)
    }

    fn apply_json(&self, transaction_json: &str) -> Result<(), WasmError> {
        if !self.is_resolved() {
            return Err(WasmError::InvalidScope);
        }
        if transaction_json.is_empty() {
            return Err(WasmError::Abi(AbiError::InvalidTransaction));
        }

        let bytes = transaction_json.as_bytes();
        let status =
            unsafe { abi_scope_apply(self.handle(), bytes.as_ptr() as u32, bytes.len() as u32) };

        status_result(status)
    }

    /// Reads one generated binary field through the ABI's byte channel.
    pub fn get_binary(&self, field: BinaryField) -> Result<Vec<u8>, WasmError> {
        self.get_binary_raw(field.path())
    }

    fn get_binary_raw(&self, path: &str) -> Result<Vec<u8>, WasmError> {
        self.validate_path(path)?;

        let path = self.scope_path(path);
        let bytes = path.as_bytes();
        let buffer_handle = unsafe {
            abi_scope_get_binary(self.handle(), bytes.as_ptr() as u32, bytes.len() as u32)
        };

        if buffer_handle == 0 {
            return Err(last_abi_error());
        }

        let ptr = unsafe { abi_buffer_ptr(buffer_handle) };
        let len = unsafe { abi_buffer_len(buffer_handle) };
        let value = unsafe { std::slice::from_raw_parts(ptr as *const u8, len as usize) }.to_vec();

        unsafe { abi_buffer_free(buffer_handle) };

        Ok(value)
    }

    /// Writes one generated binary field.
    pub fn set_binary(&self, field: BinaryField, value: &[u8]) -> Result<(), WasmError> {
        self.set_binary_with(field, value, WriteOptions::new())
    }

    /// Writes one generated binary field with synchronization options.
    pub fn set_binary_with(
        &self,
        field: BinaryField,
        value: &[u8],
        options: WriteOptions,
    ) -> Result<(), WasmError> {
        self.set_binary_raw(field.path(), value, options)
    }

    fn set_binary_raw(
        &self,
        path: &str,
        value: &[u8],
        options: WriteOptions,
    ) -> Result<(), WasmError> {
        self.validate_path(path)?;

        let path = self.scope_path(path);
        let path_bytes = path.as_bytes();
        let options = encode_write_options(&options)?;
        let options_bytes = options.as_bytes();

        let status = unsafe {
            abi_scope_set_binary(
                self.handle(),
                path_bytes.as_ptr() as u32,
                path_bytes.len() as u32,
                value.as_ptr() as u32,
                value.len() as u32,
                options_bytes.as_ptr() as u32,
                options_bytes.len() as u32,
            )
        };

        status_result(status)
    }

    /// Deletes a property by name through the host AngularTS `WasmScope` ABI.
    pub fn delete<T>(&self, field: Field<T>) -> Result<(), WasmError> {
        self.delete_raw(field.path())
    }

    /// Deletes a typed field with synchronization options.
    pub fn delete_with<T>(&self, field: Field<T>, options: WriteOptions) -> Result<(), WasmError> {
        let mut transaction = self.update().delete(field)?;
        transaction.options = options;
        transaction.commit()
    }

    fn delete_raw(&self, path: &str) -> Result<(), WasmError> {
        self.validate_path(path)?;

        let path = self.scope_path(path);
        let path_bytes = path.as_bytes();

        let status = unsafe {
            abi_scope_delete(
                self.handle(),
                path_bytes.as_ptr() as u32,
                path_bytes.len() as u32,
            )
        };

        status_result(status)
    }

    /// Runs queued Wasm scope bridge callbacks for the wrapped scope.
    pub fn sync(&self) -> Result<(), WasmError> {
        if !self.is_resolved() {
            return Err(WasmError::InvalidScope);
        }

        let status = unsafe { abi_scope_sync(self.handle()) };

        status_result(status)
    }

    /// Observes one generated typed field.
    ///
    /// The callback receives `None` for deletions and a decoding error when the
    /// host value violates the generated contract.
    pub fn observe<T, F>(&self, field: Field<T>, callback: F) -> Result<Watch, WasmError>
    where
        T: DeserializeOwned + 'static,
        F: FnMut(Result<ScopeUpdate<T>, WasmError>) + 'static,
    {
        self.observe_with(field, WatchOptions::new(), callback)
    }

    /// Observes one generated typed field with explicit watch options.
    pub fn observe_with<T, F>(
        &self,
        field: Field<T>,
        options: WatchOptions,
        mut callback: F,
    ) -> Result<Watch, WasmError>
    where
        T: DeserializeOwned + 'static,
        F: FnMut(Result<ScopeUpdate<T>, WasmError>) + 'static,
    {
        self.observe_raw(field.path(), options, move |update| {
            callback(update.try_map(|value| {
                serde_wasm_bindgen::from_value(value)
                    .map_err(|error| WasmError::Decode(error.to_string()))
            }));
        })
    }

    fn observe_raw<F>(
        &self,
        path: &str,
        options: WatchOptions,
        callback: F,
    ) -> Result<Watch, WasmError>
    where
        F: FnMut(ScopeUpdate<JsValue>) + 'static,
    {
        self.validate_path(path)?;

        let scope_path = self.scope_path(path);
        let path_bytes = scope_path.as_bytes();
        let watch_handle = unsafe {
            abi_scope_watch(
                self.handle(),
                path_bytes.as_ptr() as u32,
                path_bytes.len() as u32,
            )
        };

        if watch_handle == 0 {
            return Err(last_abi_error());
        }

        let resolved_handle = self.resolved_handle();
        let reference = self.reference.with_resolved_handle(resolved_handle);

        SCOPE_WATCH_CALLBACKS.with(|callbacks| {
            callbacks
                .borrow_mut()
                .insert(watch_handle, Box::new(callback));
        });
        SCOPE_WATCH_REGISTRATIONS.with(|registrations| {
            registrations.borrow_mut().insert(
                watch_handle,
                WatchRegistration {
                    scope_handle: resolved_handle,
                    host_path: scope_path,
                    local_path: path.to_string(),
                    reference: reference.clone(),
                },
            );
        });

        if options.initial() {
            let value = match self.get_raw(path) {
                Ok(value) => value,
                Err(error) => {
                    let _ = unregister_watch(watch_handle);
                    return Err(error);
                }
            };
            invoke_watch_callback(
                watch_handle,
                ScopeUpdate::new(reference, path.to_string(), value),
            );
        }

        Ok(Watch::new(watch_handle))
    }

    /// Unbinds this scope reference from the host ABI without destroying the scope.
    pub fn unbind(&self) -> Result<(), WasmError> {
        if !self.is_resolved() {
            return Err(WasmError::InvalidScope);
        }

        let status = unsafe { abi_scope_unbind(self.handle()) };

        status_result(status)
    }

    /// Converts a fully qualified scope path into this wrapper's local path.
    pub fn local_path(&self, path: &str) -> String {
        if self.prefix.is_empty() {
            return path.to_string();
        }

        let prefix = format!("{}.", self.prefix);

        path.strip_prefix(&prefix).unwrap_or(path).to_string()
    }

    fn scope_path(&self, path: &str) -> String {
        if self.prefix.is_empty() {
            path.to_string()
        } else {
            format!("{}.{}", self.prefix, path)
        }
    }

    fn resolved_handle(&self) -> u32 {
        self.reference.handle().unwrap_or_default()
    }

    fn is_resolved(&self) -> bool {
        self.handle() != 0
    }

    fn validate_path(&self, path: &str) -> Result<(), WasmError> {
        if !self.is_resolved() {
            return Err(WasmError::InvalidScope);
        }
        if path.is_empty() {
            return Err(WasmError::InvalidPath);
        }

        Ok(())
    }
}

#[link(wasm_import_module = "angular_ts")]
extern "C" {
    #[link_name = "scope_resolve"]
    fn abi_scope_resolve(name_ptr: u32, name_len: u32) -> u32;
    #[link_name = "scope_get"]
    fn abi_scope_get(scope_handle: u32, path_ptr: u32, path_len: u32) -> u32;
    #[link_name = "scope_set"]
    fn abi_scope_set(
        scope_handle: u32,
        path_ptr: u32,
        path_len: u32,
        value_ptr: u32,
        value_len: u32,
    ) -> u32;
    #[link_name = "scope_apply"]
    fn abi_scope_apply(scope_handle: u32, transaction_ptr: u32, transaction_len: u32) -> u32;
    #[link_name = "scope_get_binary"]
    fn abi_scope_get_binary(scope_handle: u32, path_ptr: u32, path_len: u32) -> u32;
    #[link_name = "scope_set_binary"]
    fn abi_scope_set_binary(
        scope_handle: u32,
        path_ptr: u32,
        path_len: u32,
        value_ptr: u32,
        value_len: u32,
        options_ptr: u32,
        options_len: u32,
    ) -> u32;
    #[link_name = "scope_delete"]
    fn abi_scope_delete(scope_handle: u32, path_ptr: u32, path_len: u32) -> u32;
    #[link_name = "scope_sync"]
    fn abi_scope_sync(scope_handle: u32) -> u32;
    #[link_name = "scope_watch"]
    fn abi_scope_watch(scope_handle: u32, path_ptr: u32, path_len: u32) -> u32;
    #[link_name = "scope_unwatch"]
    fn abi_scope_unwatch(watch_handle: u32) -> u32;
    #[link_name = "scope_unbind"]
    fn abi_scope_unbind(scope_handle: u32) -> u32;
    #[link_name = "buffer_ptr"]
    fn abi_buffer_ptr(buffer_handle: u32) -> u32;
    #[link_name = "buffer_len"]
    fn abi_buffer_len(buffer_handle: u32) -> u32;
    #[link_name = "buffer_free"]
    fn abi_buffer_free(buffer_handle: u32);
    #[link_name = "error_code"]
    fn abi_error_code() -> u32;
}

/// AngularTS reactive ABI version implemented by this guest facade.
#[no_mangle]
pub extern "C" fn ng_abi_version() -> u32 {
    3
}

/// Allocates guest memory for AngularTS ABI callbacks and result buffers.
#[no_mangle]
pub extern "C" fn ng_abi_alloc(size: usize) -> *mut u8 {
    let mut buffer = Vec::<u8>::with_capacity(size.max(1));
    let ptr = buffer.as_mut_ptr();

    std::mem::forget(buffer);

    ptr
}

/// Releases memory previously allocated by `ng_abi_alloc`.
///
/// # Safety
///
/// `ptr` must have been returned by `ng_abi_alloc(size)` and must not have
/// already been released. `size` must match the allocation request.
#[no_mangle]
pub unsafe extern "C" fn ng_abi_free(ptr: *mut u8, size: usize) {
    if ptr.is_null() {
        return;
    }

    drop(Vec::from_raw_parts(ptr, 0, size.max(1)));
}

/// Dispatches one host AngularTS watched transaction to registered Rust callbacks.
#[no_mangle]
pub extern "C" fn ng_scope_on_transaction(
    scope_handle: u32,
    transaction_ptr: u32,
    transaction_len: u32,
) {
    let Ok(transaction) = read_abi_json(transaction_ptr, transaction_len) else {
        return;
    };
    let origin = Reflect::get(&transaction, &JsValue::from_str("origin"))
        .ok()
        .and_then(|value| value.as_string());
    let set = Reflect::get(&transaction, &JsValue::from_str("set")).unwrap_or(JsValue::NULL);

    if set.is_object() {
        for key in Object::keys(&set.clone().unchecked_into::<Object>()).iter() {
            let Some(path) = key.as_string() else {
                continue;
            };
            let value = Reflect::get(&set, &key).unwrap_or(JsValue::NULL);

            dispatch_scope_update(scope_handle, path, Some(value), origin.clone());
        }
    }

    let deleted = Reflect::get(&transaction, &JsValue::from_str("delete")).unwrap_or(JsValue::NULL);
    if Array::is_array(&deleted) {
        for path in Array::from(&deleted)
            .iter()
            .filter_map(|value| value.as_string())
        {
            dispatch_scope_update(scope_handle, path, None, origin.clone());
        }
    }
}

fn dispatch_scope_update(
    scope_handle: u32,
    path: String,
    value: Option<JsValue>,
    origin: Option<String>,
) {
    let registrations = SCOPE_WATCH_REGISTRATIONS.with(|registrations| {
        registrations
            .borrow()
            .iter()
            .filter_map(|(handle, registration)| {
                (registration.scope_handle == scope_handle && registration.host_path == path)
                    .then_some((*handle, registration.clone()))
            })
            .collect::<Vec<_>>()
    });

    for (watch_handle, registration) in registrations {
        let update = match value.clone() {
            Some(value) => ScopeUpdate::new(registration.reference, registration.local_path, value),
            None => ScopeUpdate::deletion(registration.reference, registration.local_path),
        }
        .with_origin(origin.clone());

        invoke_watch_callback(watch_handle, update);
    }
}

fn invoke_watch_callback(watch_handle: u32, update: ScopeUpdate<JsValue>) {
    let callback =
        SCOPE_WATCH_CALLBACKS.with(|callbacks| callbacks.borrow_mut().remove(&watch_handle));

    let Some(mut callback) = callback else {
        return;
    };

    callback(update);

    let still_registered = SCOPE_WATCH_REGISTRATIONS
        .with(|registrations| registrations.borrow().contains_key(&watch_handle));
    if still_registered {
        SCOPE_WATCH_CALLBACKS.with(|callbacks| {
            callbacks.borrow_mut().insert(watch_handle, callback);
        });
    }
}

fn unregister_watch(watch_handle: u32) -> Result<(), WasmError> {
    SCOPE_WATCH_REGISTRATIONS.with(|registrations| {
        registrations.borrow_mut().remove(&watch_handle);
    });
    SCOPE_WATCH_CALLBACKS.with(|callbacks| {
        callbacks.borrow_mut().remove(&watch_handle);
    });

    let status = unsafe { abi_scope_unwatch(watch_handle) };

    status_result(status)
}

fn read_abi_json(ptr: u32, len: u32) -> Result<JsValue, JsValue> {
    if ptr == 0 && len == 0 {
        return Ok(JsValue::NULL);
    }

    JSON::parse(&read_abi_string(ptr, len))
}

fn read_abi_string(ptr: u32, len: u32) -> String {
    if ptr == 0 && len == 0 {
        return String::new();
    }

    let bytes = unsafe { std::slice::from_raw_parts(ptr as *const u8, len as usize) };

    std::str::from_utf8(bytes).unwrap_or_default().to_string()
}

fn stringify_abi_json(value: &JsValue) -> Result<String, WasmError> {
    JSON::stringify(value)
        .map_err(|error| WasmError::Encode(format_js_error(error)))?
        .as_string()
        .ok_or_else(|| WasmError::Encode("value is not JSON serializable".to_string()))
}

fn encode_write_options(options: &WriteOptions) -> Result<String, WasmError> {
    if options.origin().is_none() && options.echo().is_none() {
        return Ok(String::new());
    }

    let value = Object::new();
    apply_write_options(&value, options)?;
    stringify_abi_json(&value.into())
}

fn apply_write_options(target: &Object, options: &WriteOptions) -> Result<(), WasmError> {
    if let Some(origin) = options.origin() {
        Reflect::set(
            target,
            &JsValue::from_str("origin"),
            &JsValue::from_str(origin),
        )
        .map_err(|error| WasmError::Encode(format_js_error(error)))?;
    }
    if let Some(echo) = options.echo() {
        Reflect::set(
            target,
            &JsValue::from_str("echo"),
            &JsValue::from_bool(echo),
        )
        .map_err(|error| WasmError::Encode(format_js_error(error)))?;
    }

    Ok(())
}

fn resolve_scope_name(name: &str) -> u32 {
    if name.is_empty() {
        return 0;
    }

    let name_bytes = name.as_bytes();

    unsafe { abi_scope_resolve(name_bytes.as_ptr() as u32, name_bytes.len() as u32) }
}

fn status_result(status: u32) -> Result<(), WasmError> {
    if status != 0 {
        Ok(())
    } else {
        Err(last_abi_error())
    }
}

fn last_abi_error() -> WasmError {
    WasmError::Abi(current_abi_error().unwrap_or(AbiError::OperationFailed))
}

fn current_abi_error() -> Option<AbiError> {
    AbiError::from_code(unsafe { abi_error_code() })
}

fn format_js_error(error: JsValue) -> String {
    error.as_string().unwrap_or_else(|| format!("{error:?}"))
}
