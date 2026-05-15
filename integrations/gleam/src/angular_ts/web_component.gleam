import angular_ts/unsafe
import gleam/dynamic.{type Dynamic}
import gleam/list
import gleam/option.{type Option, None, Some}

pub opaque type WebComponent(scope) {
  WebComponent(
    template: Option(String),
    shadow: Bool,
    isolate: Bool,
    inputs: List(InputEntry),
  )
}

pub opaque type Input {
  Input(value: Dynamic)
}

pub type InputEntry {
  InputEntry(name: String, input: Input)
}

pub fn new(template: String) -> WebComponent(scope) {
  WebComponent(
    template: Some(template),
    shadow: False,
    isolate: False,
    inputs: [],
  )
}

pub fn empty() -> WebComponent(scope) {
  WebComponent(template: None, shadow: False, isolate: False, inputs: [])
}

pub fn shadow(
  web_component: WebComponent(scope),
  enabled: Bool,
) -> WebComponent(scope) {
  WebComponent(..web_component, shadow: enabled)
}

pub fn isolate(
  web_component: WebComponent(scope),
  enabled: Bool,
) -> WebComponent(scope) {
  WebComponent(..web_component, isolate: enabled)
}

pub fn input(
  web_component: WebComponent(scope),
  name: String,
  input: Input,
) -> WebComponent(scope) {
  WebComponent(..web_component, inputs: [
    InputEntry(name, input),
    ..web_component.inputs
  ])
}

pub fn input_string() -> Input {
  Input(string_constructor())
}

pub fn input_number() -> Input {
  Input(number_constructor())
}

pub fn input_bool() -> Input {
  Input(boolean_constructor())
}

pub fn to_js_object(web_component: WebComponent(scope)) -> Dynamic {
  let object = unsafe.empty_object()

  case web_component.template {
    Some(template) -> unsafe.set_string(object, "template", template)
    None -> object
  }

  case web_component.shadow {
    True -> unsafe.set_bool(object, "shadow", True)
    False -> object
  }

  case web_component.isolate {
    True -> unsafe.set_bool(object, "isolate", True)
    False -> object
  }

  case web_component.inputs {
    [] -> object
    inputs -> unsafe.set_property(object, "inputs", inputs_to_js(inputs))
  }
}

fn inputs_to_js(inputs: List(InputEntry)) -> Dynamic {
  list.fold(inputs, unsafe.empty_object(), fn(object, entry) {
    let InputEntry(name, Input(value)) = entry
    unsafe.set_property(object, name, value)
  })
}

@external(javascript, "./ffi.mjs", "string_constructor")
fn string_constructor() -> Dynamic

@external(javascript, "./ffi.mjs", "number_constructor")
fn number_constructor() -> Dynamic

@external(javascript, "./ffi.mjs", "boolean_constructor")
fn boolean_constructor() -> Dynamic
