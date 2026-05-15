import angular_ts/unsafe
import gleam/dynamic.{type Dynamic}

pub type StorageType {
  Local
  Session
  Cookie
  Custom
}

pub opaque type StorageBackend {
  StorageBackend(handle: Dynamic)
}

pub fn storage_type_name(storage_type: StorageType) -> String {
  case storage_type {
    Local -> "local"
    Session -> "session"
    Cookie -> "cookie"
    Custom -> "custom"
  }
}

pub fn unsafe_backend(handle: Dynamic) -> StorageBackend {
  StorageBackend(handle)
}

pub fn backend_handle(backend: StorageBackend) -> Dynamic {
  let StorageBackend(handle) = backend
  handle
}

pub fn to_js_storage_type(storage_type: StorageType) -> Dynamic {
  unsafe.coerce(storage_type_name(storage_type))
}
