import angular_ts/cookie
import angular_ts/filters
import angular_ts/http
import angular_ts/injectable as injectable_module
import angular_ts/module
import angular_ts/namespace
import angular_ts/runtime
import angular_ts/storage
import angular_ts/token as token_module
import angular_ts/wasm
import angular_ts/worker
import gleam/dynamic.{type Dynamic}

pub type Element =
  runtime.Element

pub type Injector =
  namespace.InjectorService(Dynamic)

pub type NgModule =
  module.NgModule

pub type Token(value) =
  token_module.Token(value)

pub type Injectable(value) =
  injectable_module.Injectable(value)

pub type HttpMethod =
  http.HttpMethod

pub type HttpRequestConfig =
  http.HttpRequestConfig

pub type HttpRequestOptions =
  http.HttpRequestOptions

pub type CookieOptions =
  cookie.CookieOptions

pub type CookieStoreOptions =
  cookie.CookieStoreOptions

pub type StorageBackend =
  storage.StorageBackend

pub type StorageType =
  storage.StorageType

pub type DateFilterOptions =
  filters.DateFilterOptions

pub type NumberFilterOptions =
  filters.NumberFilterOptions

pub type CurrencyFilterOptions =
  filters.CurrencyFilterOptions

pub type RelativeTimeFilterOptions =
  filters.RelativeTimeFilterOptions

pub type EntryFilterItem(key, value) =
  filters.EntryFilterItem(key, value)

pub type WasmBinding =
  wasm.WasmBinding

pub type WasmBindingOptions =
  wasm.WasmBindingOptions

pub type WasmError =
  wasm.WasmError

pub type WasmErrorCode =
  wasm.WasmErrorCode

pub type WasmLoadOptions =
  wasm.WasmLoadOptions

pub type WasmResource =
  wasm.WasmResource

pub type WasmResourceStatus =
  wasm.WasmResourceStatus

pub type WasmService =
  wasm.WasmService

pub type WasmSource =
  wasm.WasmSource

pub type WasmTarget =
  wasm.WasmTarget

pub type WorkerConfig(receive) =
  worker.WorkerConfig(receive)

pub type WorkerHandle(send, receive) =
  worker.WorkerHandle(send, receive)

pub type WorkerError =
  worker.WorkerError

pub type WorkerErrorCode =
  worker.WorkerErrorCode

pub type WorkerStatus =
  worker.WorkerStatus

pub type WorkerRequest(payload) =
  worker.WorkerRequest(payload)

pub type WorkerResponse(result) =
  worker.WorkerResponse(result)

pub type WorkerModelMessage(model) =
  worker.WorkerModelMessage(model)

pub type WorkerRequestOptions =
  worker.WorkerRequestOptions

pub type WorkerService =
  worker.WorkerService

pub fn token(name: String) -> Token(value) {
  token_module.new(name)
}

pub fn inject0(factory: fn() -> value) -> Injectable(value) {
  injectable_module.inject0(factory)
}

pub fn inject1(
  token_a: Token(a),
  factory: fn(a) -> value,
) -> Injectable(value) {
  injectable_module.inject1(token_a, factory)
}

pub fn inject2(
  token_a: Token(a),
  token_b: Token(b),
  factory: fn(a, b) -> value,
) -> Injectable(value) {
  injectable_module.inject2(token_a, token_b, factory)
}

pub fn module(name: String) -> NgModule {
  runtime.module(name)
}

pub fn module_with_requires(name: String, requires: List(String)) -> NgModule {
  runtime.module_with_requires(name, requires)
}

pub fn bootstrap(root: Element, modules: List(String)) -> Injector {
  runtime.bootstrap(root, modules)
}

pub fn bootstrap_body(app: NgModule) -> Injector {
  runtime.bootstrap_body([module.name(app)])
}
