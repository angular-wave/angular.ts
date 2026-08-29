package angular.ts

import scala.scalajs.js

extension (module: NgModule)
  def controller[A <: js.Object](
      name: String,
      model: Token[Model[A]],
  ): NgModule =
    module.controller(name, AngularTS.inject1(model)((value: Model[A]) => value))
