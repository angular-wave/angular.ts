use js_sys::JSON;
use std::{cell::RefCell, collections::HashMap};
use wasm_bindgen::prelude::*;

use crate::{WasmScopeReference, WasmScopeUpdate, WasmScopeWatchOptions};

type ScopeWatchCallback = Box<dyn FnMut(WasmScopeUpdate<JsValue>)>;

thread_local! {
    static SCOPE_WATCH_CALLBACKS: RefCell<HashMap<(u32, String), ScopeWatchCallback>> =
        RefCell::new(HashMap::new());
    static SCOPE_WATCH_PATHS: RefCell<HashMap<u32, (u32, String)>> = RefCell::new(HashMap::new());
    static SCOPE_WATCH_REFERENCES: RefCell<HashMap<(u32, String), WasmScopeReference>> =
        RefCell::new(HashMap::new());
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
    pub fn named(name: String, prefix: String) -> Self {
        Self {
            reference: WasmScopeReference::from_name(name),
            prefix,
        }
    }
}

impl WasmScope {
    /// Returns the numeric host scope handle.
    pub fn handle(&self) -> u32 {
        self.reference.handle().unwrap_or_default()
    }

    /// Returns the stable scope name, when this wrapper targets one.
    pub fn name(&self) -> Option<String> {
        self.reference.name().map(ToString::to_string)
    }

    /// Gets a property by name from the host AngularTS `WasmScope` ABI.
    pub fn get(&self, path: &str) -> JsValue {
        if !self.reference.is_valid() || path.is_empty() {
            return JsValue::UNDEFINED;
        }

        let path = self.scope_path(path);
        let path_bytes = path.as_bytes();
        let buffer_handle = self.with_reference_buffer(|reference| match reference.name() {
            Some(name) if reference.handle().unwrap_or_default() == 0 => {
                let name_bytes = name.as_bytes();

                unsafe {
                    abi_scope_get_named(
                        name_bytes.as_ptr() as u32,
                        name_bytes.len() as u32,
                        path_bytes.as_ptr() as u32,
                        path_bytes.len() as u32,
                    )
                }
            }
            _ => unsafe {
                abi_scope_get(
                    reference.handle().unwrap_or_default(),
                    path_bytes.as_ptr() as u32,
                    path_bytes.len() as u32,
                )
            },
        });

        if buffer_handle == 0 {
            return JsValue::UNDEFINED;
        }

        let ptr = unsafe { abi_buffer_ptr(buffer_handle) };
        let len = unsafe { abi_buffer_len(buffer_handle) };
        let value = read_abi_json(ptr, len).unwrap_or(JsValue::NULL);

        unsafe {
            abi_buffer_free(buffer_handle);
        }

        value
    }

    /// Sets a property by name through the host AngularTS `WasmScope` ABI.
    pub fn set(&self, path: &str, value: JsValue) {
        if !self.reference.is_valid() || path.is_empty() {
            return;
        }

        let path = self.scope_path(path);
        let path_bytes = path.as_bytes();
        let json = stringify_abi_json(&value);
        let json_bytes = json.as_bytes();

        self.with_reference_status(|reference| match reference.name() {
            Some(name) if reference.handle().unwrap_or_default() == 0 => {
                let name_bytes = name.as_bytes();

                unsafe {
                    abi_scope_set_named(
                        name_bytes.as_ptr() as u32,
                        name_bytes.len() as u32,
                        path_bytes.as_ptr() as u32,
                        path_bytes.len() as u32,
                        json_bytes.as_ptr() as u32,
                        json_bytes.len() as u32,
                    )
                }
            }
            _ => unsafe {
                abi_scope_set(
                    reference.handle().unwrap_or_default(),
                    path_bytes.as_ptr() as u32,
                    path_bytes.len() as u32,
                    json_bytes.as_ptr() as u32,
                    json_bytes.len() as u32,
                )
            },
        });
    }

    /// Deletes a property by name through the host AngularTS `WasmScope` ABI.
    pub fn delete(&self, path: &str) {
        if !self.reference.is_valid() || path.is_empty() {
            return;
        }

        let path = self.scope_path(path);
        let path_bytes = path.as_bytes();

        self.with_reference_status(|reference| match reference.name() {
            Some(name) if reference.handle().unwrap_or_default() == 0 => {
                let name_bytes = name.as_bytes();

                unsafe {
                    abi_scope_delete_named(
                        name_bytes.as_ptr() as u32,
                        name_bytes.len() as u32,
                        path_bytes.as_ptr() as u32,
                        path_bytes.len() as u32,
                    )
                }
            }
            _ => unsafe {
                abi_scope_delete(
                    reference.handle().unwrap_or_default(),
                    path_bytes.as_ptr() as u32,
                    path_bytes.len() as u32,
                )
            },
        });
    }

    /// Flushes queued AngularTS scope callbacks for the wrapped scope.
    pub fn flush(&self) {
        if !self.reference.is_valid() {
            return;
        }

        self.with_reference_status(|reference| match reference.name() {
            Some(name) if reference.handle().unwrap_or_default() == 0 => {
                let name_bytes = name.as_bytes();

                unsafe {
                    abi_scope_flush_named(name_bytes.as_ptr() as u32, name_bytes.len() as u32)
                }
            }
            _ => unsafe { abi_scope_flush(reference.handle().unwrap_or_default()) },
        });
    }

    /// Registers a host AngularTS watch that calls `ng_scope_on_update`.
    pub fn watch(&self, path: &str) -> u32 {
        self.watch_with_options(path, WasmScopeWatchOptions::new())
    }

    /// Registers a host AngularTS watch with explicit watch options.
    pub fn watch_with_options(&self, path: &str, _options: WasmScopeWatchOptions) -> u32 {
        if !self.reference.is_valid() || path.is_empty() {
            return 0;
        }

        let path = self.scope_path(path);
        let path_bytes = path.as_bytes();

        let watch_handle = self.with_reference_status(|reference| match reference.name() {
            Some(name) if reference.handle().unwrap_or_default() == 0 => {
                let name_bytes = name.as_bytes();

                unsafe {
                    abi_scope_watch_named(
                        name_bytes.as_ptr() as u32,
                        name_bytes.len() as u32,
                        path_bytes.as_ptr() as u32,
                        path_bytes.len() as u32,
                    )
                }
            }
            _ => unsafe {
                abi_scope_watch(
                    reference.handle().unwrap_or_default(),
                    path_bytes.as_ptr() as u32,
                    path_bytes.len() as u32,
                )
            },
        });

        watch_handle
    }

    /// Registers a watched path and routes its updates to a Rust callback.
    pub fn watch_with<F>(&self, path: &str, mut callback: F) -> u32
    where
        F: FnMut(JsValue) + 'static,
    {
        self.watch_update_with(path, WasmScopeWatchOptions::new(), move |update| {
            callback(update.into_value());
        })
    }

    /// Registers a watched path and routes full update payloads to a Rust callback.
    pub fn watch_update_with<F>(
        &self,
        path: &str,
        options: WasmScopeWatchOptions,
        callback: F,
    ) -> u32
    where
        F: FnMut(WasmScopeUpdate<JsValue>) + 'static,
    {
        if !self.reference.is_valid() || path.is_empty() {
            return 0;
        }

        let scope_path = self.scope_path(path);
        let watch_handle = self.watch_with_options(path, options);

        if watch_handle == 0 {
            return 0;
        }

        let resolved_handle = self.resolved_handle();
        let route = (resolved_handle, scope_path.clone());
        let reference = self.reference.with_resolved_handle(resolved_handle);

        SCOPE_WATCH_CALLBACKS.with(|callbacks| {
            callbacks
                .borrow_mut()
                .insert(route.clone(), Box::new(callback));
        });
        SCOPE_WATCH_PATHS.with(|paths| {
            paths.borrow_mut().insert(watch_handle, route.clone());
        });
        SCOPE_WATCH_REFERENCES.with(|references| {
            references
                .borrow_mut()
                .insert(route.clone(), reference.clone());
        });

        if options.initial() {
            let value = self.get(path);
            let update = WasmScopeUpdate::new(reference, scope_path, value);

            SCOPE_WATCH_CALLBACKS.with(|callbacks| {
                if let Some(callback) = callbacks.borrow_mut().get_mut(&route) {
                    callback(update);
                }
            });
        }

        watch_handle
    }

    /// Removes a host AngularTS watch previously registered by `watch`.
    pub fn unwatch(&self, watch_handle: u32) {
        if watch_handle == 0 {
            return;
        }

        let route = SCOPE_WATCH_PATHS.with(|paths| paths.borrow_mut().remove(&watch_handle));

        if let Some(route) = route {
            SCOPE_WATCH_CALLBACKS.with(|callbacks| {
                callbacks.borrow_mut().remove(&route);
            });
            SCOPE_WATCH_REFERENCES.with(|references| {
                references.borrow_mut().remove(&route);
            });
        }

        unsafe {
            abi_scope_unwatch(watch_handle);
        }
    }

    /// Unbinds this scope reference from the host ABI without destroying the scope.
    pub fn unbind(&self) {
        if !self.reference.is_valid() {
            return;
        }

        self.with_reference_status(|reference| match reference.name() {
            Some(name) if reference.handle().unwrap_or_default() == 0 => {
                let name_bytes = name.as_bytes();

                unsafe {
                    abi_scope_unbind_named(name_bytes.as_ptr() as u32, name_bytes.len() as u32)
                }
            }
            _ => unsafe { abi_scope_unbind(reference.handle().unwrap_or_default()) },
        });
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
        if let Some(handle) = self.reference.handle() {
            if handle != 0 {
                return handle;
            }
        }

        self.reference
            .name()
            .map(resolve_scope_name)
            .unwrap_or_default()
    }

    fn with_reference_buffer(&self, call: impl FnOnce(&WasmScopeReference) -> u32) -> u32 {
        call(&self.reference)
    }

    fn with_reference_status(&self, call: impl FnOnce(&WasmScopeReference) -> u32) -> u32 {
        call(&self.reference)
    }
}

#[link(wasm_import_module = "angular_ts")]
extern "C" {
    #[link_name = "scope_resolve"]
    fn abi_scope_resolve(name_ptr: u32, name_len: u32) -> u32;
    #[link_name = "scope_get"]
    fn abi_scope_get(scope_handle: u32, path_ptr: u32, path_len: u32) -> u32;
    #[link_name = "scope_get_named"]
    fn abi_scope_get_named(name_ptr: u32, name_len: u32, path_ptr: u32, path_len: u32) -> u32;
    #[link_name = "scope_set"]
    fn abi_scope_set(
        scope_handle: u32,
        path_ptr: u32,
        path_len: u32,
        value_ptr: u32,
        value_len: u32,
    ) -> u32;
    #[link_name = "scope_set_named"]
    fn abi_scope_set_named(
        name_ptr: u32,
        name_len: u32,
        path_ptr: u32,
        path_len: u32,
        value_ptr: u32,
        value_len: u32,
    ) -> u32;
    #[link_name = "scope_delete"]
    fn abi_scope_delete(scope_handle: u32, path_ptr: u32, path_len: u32) -> u32;
    #[link_name = "scope_delete_named"]
    fn abi_scope_delete_named(name_ptr: u32, name_len: u32, path_ptr: u32, path_len: u32) -> u32;
    #[link_name = "scope_flush"]
    fn abi_scope_flush(scope_handle: u32) -> u32;
    #[link_name = "scope_flush_named"]
    fn abi_scope_flush_named(name_ptr: u32, name_len: u32) -> u32;
    #[link_name = "scope_watch"]
    fn abi_scope_watch(scope_handle: u32, path_ptr: u32, path_len: u32) -> u32;
    #[link_name = "scope_watch_named"]
    fn abi_scope_watch_named(name_ptr: u32, name_len: u32, path_ptr: u32, path_len: u32) -> u32;
    #[link_name = "scope_unwatch"]
    fn abi_scope_unwatch(watch_handle: u32) -> u32;
    #[link_name = "scope_unbind"]
    fn abi_scope_unbind(scope_handle: u32) -> u32;
    #[link_name = "scope_unbind_named"]
    fn abi_scope_unbind_named(name_ptr: u32, name_len: u32) -> u32;
    #[link_name = "buffer_ptr"]
    fn abi_buffer_ptr(buffer_handle: u32) -> u32;
    #[link_name = "buffer_len"]
    fn abi_buffer_len(buffer_handle: u32) -> u32;
    #[link_name = "buffer_free"]
    fn abi_buffer_free(buffer_handle: u32);
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
#[no_mangle]
pub unsafe extern "C" fn ng_abi_free(ptr: *mut u8, size: usize) {
    if ptr.is_null() {
        return;
    }

    drop(Vec::from_raw_parts(ptr, 0, size.max(1)));
}

/// Dispatches host AngularTS watched scope updates to registered Rust callbacks.
#[no_mangle]
pub extern "C" fn ng_scope_on_update(
    scope_handle: u32,
    path_ptr: u32,
    path_len: u32,
    value_ptr: u32,
    value_len: u32,
) {
    let path = read_abi_string(path_ptr, path_len);
    let value = read_abi_json(value_ptr, value_len).unwrap_or(JsValue::NULL);
    let route = (scope_handle, path);
    let reference = SCOPE_WATCH_REFERENCES.with(|references| {
        references
            .borrow()
            .get(&route)
            .cloned()
            .unwrap_or_else(|| WasmScopeReference::from_handle(scope_handle))
    });
    let update = WasmScopeUpdate::new(reference, route.1.clone(), value);

    SCOPE_WATCH_CALLBACKS.with(|callbacks| {
        if let Some(callback) = callbacks.borrow_mut().get_mut(&route) {
            callback(update);
        }
    });
}

/// Parses a JSON payload from an AngularTS ABI UTF-8 byte range.
pub fn read_abi_json(ptr: u32, len: u32) -> Result<JsValue, JsValue> {
    if ptr == 0 && len == 0 {
        return Ok(JsValue::NULL);
    }

    JSON::parse(&read_abi_string(ptr, len))
}

/// Reads an AngularTS ABI UTF-8 byte range into a Rust string.
pub fn read_abi_string(ptr: u32, len: u32) -> String {
    if ptr == 0 && len == 0 {
        return String::new();
    }

    let bytes = unsafe { std::slice::from_raw_parts(ptr as *const u8, len as usize) };

    std::str::from_utf8(bytes).unwrap_or_default().to_string()
}

fn stringify_abi_json(value: &JsValue) -> String {
    JSON::stringify(value)
        .ok()
        .and_then(|json| json.as_string())
        .unwrap_or_else(|| "null".to_string())
}

fn resolve_scope_name(name: &str) -> u32 {
    if name.is_empty() {
        return 0;
    }

    let name_bytes = name.as_bytes();

    unsafe { abi_scope_resolve(name_bytes.as_ptr() as u32, name_bytes.len() as u32) }
}
