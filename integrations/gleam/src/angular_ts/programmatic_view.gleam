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

pub opaque type Tags {
  Tags(namespace_uri: String)
}

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

pub fn element(context: Context(controller, required)) -> Dynamic {
  unsafe.get_property(context.handle, "element")
}

pub fn transclude(context: Context(controller, required)) -> Dynamic {
  unsafe.get_property(context.handle, "transclude")
}

pub fn tags() -> Tags {
  Tags("")
}

pub fn namespace(_tags: Tags, namespace_uri: String) -> Tags {
  Tags(namespace_uri)
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

pub fn tag(
  tags: Tags,
  name: String,
  properties: List(Property),
  children: List(Dynamic),
) -> Dynamic {
  programmatic_tag(tags.namespace_uri, name, properties, children)
}

@external(javascript, "./ffi.mjs", "programmatic_tag")
fn programmatic_tag(
  namespace_uri: String,
  name: String,
  properties: List(Property),
  children: List(Dynamic),
) -> Dynamic
