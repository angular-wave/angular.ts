import angular_ts/bootstrap
import angular_ts/cookie
import angular_ts/filters
import angular_ts/http
import angular_ts/injectable as injectable_module
import angular_ts/module
import angular_ts/namespace
import angular_ts/runtime
import angular_ts/storage
import angular_ts/token as token_module

pub type Element =
  namespace.RootElementService

pub type Injector =
  namespace.InjectorService

pub type BootstrapConfig =
  bootstrap.BootstrapConfig

pub type NgModule =
  module.NgModule

pub type Token(value) =
  token_module.Token(value)

pub type Injectable(value) =
  injectable_module.Injectable(value)

pub type HttpMethod =
  http.HttpMethod

pub type RequestConfig =
  http.RequestConfig

pub type RequestShortcutConfig =
  http.RequestShortcutConfig

pub type CookieOptions =
  cookie.CookieOptions

pub type CookieStoreOptions =
  cookie.CookieStoreOptions

pub type StorageBackend =
  storage.StorageBackend

pub type StorageType =
  storage.StorageType

pub type DateFilterFormat =
  filters.DateFilterFormat

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

pub fn bootstrap(
  root: Element,
  modules: List(String),
  config: BootstrapConfig,
) -> Injector {
  runtime.bootstrap(root, modules, config)
}

pub fn bootstrap_body(app: NgModule) -> Injector {
  runtime.bootstrap_body([module.name(app)], bootstrap.default_config())
}
