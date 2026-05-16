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

pub fn set(scope: Scope(state), path: String, value: value) -> Scope(state) {
  js.call_method2(scope.handle, "set", js.coerce(path), js.coerce(value))
  scope
}
