import angular_ts/unsafe
import gleam/dynamic.{type Dynamic}
import gleam/list
import gleam/option.{type Option, None, Some}

pub opaque type AppComponent(scope) {
  AppComponent(
    template: Option(String),
    shadow: Bool,
    isolate: Bool,
    inputs: List(InputEntry),
  )
}

pub opaque type ScopeElement(scope) {
  ScopeElement(handle: Dynamic)
}

pub opaque type ScopeElementConstructor(scope) {
  ScopeElementConstructor(handle: Dynamic)
}

pub opaque type Input {
  Input(value: Dynamic)
}

pub type InputEntry {
  InputEntry(name: String, input: Input)
}

pub fn new(template: String) -> AppComponent(scope) {
  AppComponent(
    template: Some(template),
    shadow: False,
    isolate: False,
    inputs: [],
  )
}

pub fn empty() -> AppComponent(scope) {
  AppComponent(template: None, shadow: False, isolate: False, inputs: [])
}

pub fn shadow(
  app_component: AppComponent(scope),
  enabled: Bool,
) -> AppComponent(scope) {
  AppComponent(..app_component, shadow: enabled)
}

pub fn isolate(
  app_component: AppComponent(scope),
  enabled: Bool,
) -> AppComponent(scope) {
  AppComponent(..app_component, isolate: enabled)
}

pub fn input(
  app_component: AppComponent(scope),
  name: String,
  input: Input,
) -> AppComponent(scope) {
  AppComponent(..app_component, inputs: [
    InputEntry(name, input),
    ..app_component.inputs
  ])
}

pub fn scope_element(handle: Dynamic) -> ScopeElement(scope) {
  ScopeElement(handle)
}

pub fn scope_element_constructor(
  handle: Dynamic,
) -> ScopeElementConstructor(scope) {
  ScopeElementConstructor(handle)
}

pub fn scope_element_constructor_handle(
  constructor: ScopeElementConstructor(scope),
) -> Dynamic {
  let ScopeElementConstructor(handle) = constructor
  handle
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

pub fn to_js_object(app_component: AppComponent(scope)) -> Dynamic {
  let object = unsafe.empty_object()

  case app_component.template {
    Some(template) -> unsafe.set_string(object, "template", template)
    None -> object
  }

  case app_component.shadow {
    True -> unsafe.set_bool(object, "shadow", True)
    False -> object
  }

  case app_component.isolate {
    True -> unsafe.set_bool(object, "isolate", True)
    False -> object
  }

  case app_component.inputs {
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
