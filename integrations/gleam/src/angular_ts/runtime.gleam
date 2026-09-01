import angular_ts/module.{type NgModule}
import angular_ts/namespace
import gleam/dynamic.{type Dynamic}

pub type Element =
  Dynamic

pub type Injector =
  namespace.InjectorService(Dynamic)

pub fn create_module(name: String) -> NgModule {
  create_module_with_requires(name, [])
}

pub fn create_module_with_requires(
  name: String,
  requires: List(String),
) -> NgModule {
  module.from_handle(name, angular_create_module(name, requires))
}

pub fn get_module(name: String) -> NgModule {
  module.from_handle(name, angular_get_module(name))
}

pub fn bootstrap(root: Element, modules: List(String)) -> Injector {
  angular_bootstrap(root, modules)
}

pub fn bootstrap_body(modules: List(String)) -> Injector {
  bootstrap(document_body(), modules)
}

@external(javascript, "./ffi.mjs", "angular_create_module")
fn angular_create_module(name: String, requires: List(String)) -> Dynamic

@external(javascript, "./ffi.mjs", "angular_get_module")
fn angular_get_module(name: String) -> Dynamic

@external(javascript, "./ffi.mjs", "angular_bootstrap")
fn angular_bootstrap(root: Element, modules: List(String)) -> Injector

@external(javascript, "./ffi.mjs", "document_body")
fn document_body() -> Element
