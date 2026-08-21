import angular_ts/injectable.{type Injectable}
import angular_ts/programmatic_view
import angular_ts/unsafe
import gleam/dynamic.{type Dynamic}

pub opaque type Directive(scope, controller) {
  Directive(factory: Injectable(controller))
}

pub fn new(factory: Injectable(controller)) -> Directive(scope, controller) {
  Directive(factory)
}

pub fn factory(
  directive: Directive(scope, controller),
) -> Injectable(controller) {
  directive.factory
}

pub fn with_view(
  directive: Directive(scope, controller),
  view: programmatic_view.View(controller, Dynamic),
) -> Directive(scope, controller) {
  let wrapped_view = fn(context) {
    view(programmatic_view.from_dynamic(context))
  }
  let wrapped =
    unsafe.wrap_factory_property(
      injectable.factory(directive.factory),
      "view",
      unsafe.coerce(wrapped_view),
    )

  Directive(injectable.unsafe(injectable.tokens(directive.factory), wrapped))
}
