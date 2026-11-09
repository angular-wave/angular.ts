import angular_ts/unsafe as js
import gleam/dynamic.{type Dynamic}

pub opaque type Scope(state) {
  Scope(handle: Dynamic)
}

pub fn unsafe(handle: Dynamic) -> Scope(state) {
  Scope(handle)
}

pub fn handle(scope: Scope(state)) -> Dynamic {
  scope.handle
}

/// Views the live scope proxy as its declared state type, without copying it.
pub fn state(scope: Scope(state)) -> state {
  js.from_dynamic(scope.handle)
}

/// Assigns one named property through the scope proxy. The key is not a path.
/// Replace an immutable record with an updated record to notify its observers.
pub fn set(scope: Scope(state), key: String, value: value) -> Scope(state) {
  js.set_property(scope.handle, key, js.coerce(value))
  scope
}
