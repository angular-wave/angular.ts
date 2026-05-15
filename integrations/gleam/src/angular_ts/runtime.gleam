import angular_ts/bootstrap.{type BootstrapConfig}
import angular_ts/module.{type NgModule}
import angular_ts/namespace
import gleam/dynamic.{type Dynamic}

pub type Element =
  namespace.RootElementService

pub type Injector =
  namespace.InjectorService

pub fn module(name: String) -> NgModule {
  module_with_requires(name, [])
}

pub fn module_with_requires(name: String, requires: List(String)) -> NgModule {
  module.from_handle(name, angular_module(name, requires))
}

pub fn bootstrap(
  root: Element,
  modules: List(String),
  config: BootstrapConfig,
) -> Injector {
  angular_bootstrap(root, modules, bootstrap.to_js_object(config))
}

pub fn bootstrap_body(
  modules: List(String),
  config: BootstrapConfig,
) -> Injector {
  bootstrap(document_body(), modules, config)
}

@external(javascript, "./ffi.mjs", "angular_module")
fn angular_module(name: String, requires: List(String)) -> Dynamic

@external(javascript, "./ffi.mjs", "angular_bootstrap")
fn angular_bootstrap(
  root: Element,
  modules: List(String),
  config: Dynamic,
) -> Injector

@external(javascript, "./ffi.mjs", "document_body")
fn document_body() -> Element
