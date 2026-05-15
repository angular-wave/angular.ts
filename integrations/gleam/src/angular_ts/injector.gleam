import angular_ts/namespace
import angular_ts/token.{type Token}
import angular_ts/unsafe
import gleam/dynamic.{type Dynamic}

pub type Injector =
  namespace.InjectorService

pub fn get(injector: Injector, token: Token(value)) -> Dynamic {
  unsafe.call_method1(
    unsafe.coerce(injector),
    "get",
    unsafe.coerce(token.name(token)),
  )
}
