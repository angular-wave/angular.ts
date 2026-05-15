import gleam/dynamic.{type Dynamic}

pub type JsValue =
  Dynamic

@external(javascript, "./ffi.mjs", "identity")
pub fn coerce(value: a) -> Dynamic

@external(javascript, "./ffi.mjs", "empty_object")
pub fn empty_object() -> Dynamic

@external(javascript, "./ffi.mjs", "set_property")
pub fn set_property(target: Dynamic, key: String, value: Dynamic) -> Dynamic

@external(javascript, "./ffi.mjs", "set_string")
pub fn set_string(target: Dynamic, key: String, value: String) -> Dynamic

@external(javascript, "./ffi.mjs", "set_bool")
pub fn set_bool(target: Dynamic, key: String, value: Bool) -> Dynamic

@external(javascript, "./ffi.mjs", "call_method1")
pub fn call_method1(target: Dynamic, method: String, arg1: Dynamic) -> Dynamic

@external(javascript, "./ffi.mjs", "call_method2")
pub fn call_method2(
  target: Dynamic,
  method: String,
  arg1: Dynamic,
  arg2: Dynamic,
) -> Dynamic

@external(javascript, "./ffi.mjs", "call_method3")
pub fn call_method3(
  target: Dynamic,
  method: String,
  arg1: Dynamic,
  arg2: Dynamic,
  arg3: Dynamic,
) -> Dynamic
