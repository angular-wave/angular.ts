import angular_ts/scope
import angular_ts/unsafe
import gleam/dynamic.{type Dynamic}

pub opaque type Context(controller, required) {
  Context(handle: Dynamic)
}

pub type View(controller, required) =
  fn(Context(controller, required)) -> Dynamic

pub type Property =
  #(String, Dynamic)

pub fn from_dynamic(handle: Dynamic) -> Context(controller, required) {
  Context(handle)
}

pub fn controller(context: Context(controller, required)) -> controller {
  context.handle
  |> unsafe.get_property("controller")
  |> unsafe.from_dynamic
}

pub fn required(context: Context(controller, required)) -> required {
  context.handle
  |> unsafe.get_property("required")
  |> unsafe.from_dynamic
}

pub fn scope(context: Context(controller, required)) -> scope.Scope(state) {
  context.handle
  |> unsafe.get_property("scope")
  |> scope.unsafe
}

pub fn host(context: Context(controller, required)) -> Dynamic {
  unsafe.get_property(context.handle, "host")
}

pub fn transclude(context: Context(controller, required)) -> Dynamic {
  unsafe.get_property(context.handle, "transclude")
}

pub fn on_destroy(
  context: Context(controller, required),
  cleanup: fn() -> Nil,
) -> Dynamic {
  unsafe.call_method1(context.handle, "onDestroy", unsafe.coerce(cleanup))
}

pub fn property(name: String, value: value) -> Property {
  #(name, unsafe.coerce(value))
}

pub fn child(value: value) -> Dynamic {
  unsafe.coerce(value)
}

pub fn reactive(read: fn() -> value) -> Dynamic {
  unsafe.coerce(read)
}

pub fn event(listener: fn(Dynamic) -> Nil) -> Dynamic {
  programmatic_event(listener)
}

pub fn event_with_options(
  listener: fn(Dynamic) -> Nil,
  options: options,
) -> Dynamic {
  programmatic_event_with_options(listener, unsafe.coerce(options))
}

pub fn attrs(properties: List(Property)) -> Dynamic {
  programmatic_attrs(properties)
}

pub fn props(properties: List(Property)) -> Dynamic {
  programmatic_props(properties)
}

pub fn each(
  read: fn() -> List(item),
  key: fn(item) -> key,
  render: fn(fn() -> item) -> Dynamic,
) -> Dynamic {
  programmatic_each(read, key, render)
}

pub fn tag(
  name: String,
  properties: List(Property),
  children: List(Dynamic),
) -> Dynamic {
  programmatic_view_tag(name, properties, children)
}

pub fn tag_ns(
  namespace_uri: String,
  name: String,
  properties: List(Property),
  children: List(Dynamic),
) -> Dynamic {
  programmatic_view_tag_ns(namespace_uri, name, properties, children)
}

@external(javascript, "./ffi.mjs", "programmatic_event")
fn programmatic_event(listener: fn(Dynamic) -> Nil) -> Dynamic

@external(javascript, "./ffi.mjs", "programmatic_event_with_options")
fn programmatic_event_with_options(
  listener: fn(Dynamic) -> Nil,
  options: Dynamic,
) -> Dynamic

@external(javascript, "./ffi.mjs", "programmatic_attrs")
fn programmatic_attrs(properties: List(Property)) -> Dynamic

@external(javascript, "./ffi.mjs", "programmatic_props")
fn programmatic_props(properties: List(Property)) -> Dynamic

@external(javascript, "./ffi.mjs", "programmatic_each")
fn programmatic_each(
  read: fn() -> List(item),
  key: fn(item) -> key,
  render: fn(fn() -> item) -> Dynamic,
) -> Dynamic

@external(javascript, "./ffi.mjs", "programmatic_view_tag")
fn programmatic_view_tag(
  name: String,
  properties: List(Property),
  children: List(Dynamic),
) -> Dynamic

@external(javascript, "./ffi.mjs", "programmatic_view_tag_ns")
fn programmatic_view_tag_ns(
  namespace_uri: String,
  name: String,
  properties: List(Property),
  children: List(Dynamic),
) -> Dynamic
