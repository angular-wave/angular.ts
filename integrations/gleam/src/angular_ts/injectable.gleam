import angular_ts/token.{type Token}
import angular_ts/unsafe as js
import gleam/dynamic.{type Dynamic}

pub opaque type Injectable(result) {
  Injectable(tokens: List(String), factory: Dynamic)
}

pub fn tokens(injectable: Injectable(result)) -> List(String) {
  injectable.tokens
}

pub fn factory(injectable: Injectable(result)) -> Dynamic {
  injectable.factory
}

pub fn to_annotated_array(injectable: Injectable(result)) -> Dynamic {
  annotated_array(injectable.tokens, injectable.factory)
}

pub fn inject0(factory: fn() -> result) -> Injectable(result) {
  Injectable(tokens: [], factory: js.coerce(factory))
}

pub fn inject1(
  token_a: Token(a),
  factory: fn(a) -> result,
) -> Injectable(result) {
  Injectable(tokens: [token.name(token_a)], factory: js.coerce(factory))
}

pub fn inject2(
  token_a: Token(a),
  token_b: Token(b),
  factory: fn(a, b) -> result,
) -> Injectable(result) {
  Injectable(
    tokens: [token.name(token_a), token.name(token_b)],
    factory: js.coerce(factory),
  )
}

pub fn unsafe(tokens: List(String), factory: Dynamic) -> Injectable(result) {
  Injectable(tokens: tokens, factory: factory)
}

@external(javascript, "./ffi.mjs", "annotated_array")
fn annotated_array(tokens: List(String), factory: Dynamic) -> Dynamic
