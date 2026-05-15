import angular_ts/injectable.{type Injectable}

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
