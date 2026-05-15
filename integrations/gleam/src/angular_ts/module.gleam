import angular_ts/component.{type Component}
import angular_ts/directive.{type Directive}
import angular_ts/injectable.{type Injectable}
import angular_ts/token.{type Token}
import angular_ts/unsafe as js
import angular_ts/web_component.{type WebComponent}
import gleam/dynamic.{type Dynamic}

pub opaque type NgModule {
  NgModule(name: String, handle: Dynamic)
}

pub fn from_handle(name: String, handle: Dynamic) -> NgModule {
  NgModule(name, handle)
}

pub fn name(module: NgModule) -> String {
  module.name
}

pub fn handle(module: NgModule) -> Dynamic {
  module.handle
}

pub fn value(
  ng_module: NgModule,
  token: Token(value),
  registered_value: value,
) -> NgModule {
  js.call_method2(
    ng_module.handle,
    "value",
    js.coerce(token.name(token)),
    js.coerce(registered_value),
  )
  ng_module
}

pub fn constant(
  ng_module: NgModule,
  token: Token(value),
  registered_value: value,
) -> NgModule {
  js.call_method2(
    ng_module.handle,
    "constant",
    js.coerce(token.name(token)),
    js.coerce(registered_value),
  )
  ng_module
}

pub fn config(ng_module: NgModule, block: Injectable(value)) -> NgModule {
  js.call_method1(
    ng_module.handle,
    "config",
    injectable.to_annotated_array(block),
  )
  ng_module
}

pub fn run(ng_module: NgModule, block: Injectable(value)) -> NgModule {
  js.call_method1(ng_module.handle, "run", injectable.to_annotated_array(block))
  ng_module
}

pub fn service(
  ng_module: NgModule,
  token: Token(service),
  service: Injectable(service),
) -> NgModule {
  js.call_method2(
    ng_module.handle,
    "service",
    js.coerce(token.name(token)),
    injectable.to_annotated_array(service),
  )
  ng_module
}

pub fn factory(
  ng_module: NgModule,
  token: Token(value),
  factory: Injectable(value),
) -> NgModule {
  js.call_method2(
    ng_module.handle,
    "factory",
    js.coerce(token.name(token)),
    injectable.to_annotated_array(factory),
  )
  ng_module
}

pub fn provider(
  ng_module: NgModule,
  token: Token(value),
  provider: Injectable(value),
) -> NgModule {
  js.call_method2(
    ng_module.handle,
    "provider",
    js.coerce(token.name(token)),
    injectable.to_annotated_array(provider),
  )
  ng_module
}

pub fn decorator(
  ng_module: NgModule,
  token: Token(value),
  decorator: Injectable(value),
) -> NgModule {
  js.call_method2(
    ng_module.handle,
    "decorator",
    js.coerce(token.name(token)),
    injectable.to_annotated_array(decorator),
  )
  ng_module
}

pub fn controller(
  ng_module: NgModule,
  name: String,
  controller: Injectable(controller),
) -> NgModule {
  js.call_method2(
    ng_module.handle,
    "controller",
    js.coerce(name),
    injectable.to_annotated_array(controller),
  )
  ng_module
}

pub fn directive(
  ng_module: NgModule,
  name: String,
  definition: Directive(scope, controller),
) -> NgModule {
  js.call_method2(
    ng_module.handle,
    "directive",
    js.coerce(name),
    injectable.to_annotated_array(directive.factory(definition)),
  )
  ng_module
}

pub fn component(
  ng_module: NgModule,
  name: String,
  definition: Component(controller),
) -> NgModule {
  js.call_method2(
    ng_module.handle,
    "component",
    js.coerce(name),
    component.to_js_object(definition),
  )
  ng_module
}

pub fn animation(
  ng_module: NgModule,
  name: String,
  factory: Injectable(value),
) -> NgModule {
  js.call_method2(
    ng_module.handle,
    "animation",
    js.coerce(name),
    injectable.to_annotated_array(factory),
  )
  ng_module
}

pub fn filter(
  ng_module: NgModule,
  name: String,
  factory: Injectable(value),
) -> NgModule {
  js.call_method2(
    ng_module.handle,
    "filter",
    js.coerce(name),
    injectable.to_annotated_array(factory),
  )
  ng_module
}

pub fn web_component(
  ng_module: NgModule,
  name: String,
  definition: WebComponent(scope),
) -> NgModule {
  js.call_method2(
    ng_module.handle,
    "webComponent",
    js.coerce(name),
    web_component.to_js_object(definition),
  )
  ng_module
}

pub fn topic(
  ng_module: NgModule,
  token: Token(value),
  topic: String,
) -> NgModule {
  js.call_method2(
    ng_module.handle,
    "topic",
    js.coerce(token.name(token)),
    js.coerce(topic),
  )
  ng_module
}
