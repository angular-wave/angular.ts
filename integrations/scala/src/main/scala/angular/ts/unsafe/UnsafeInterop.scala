package angular.ts.unsafe

import angular.ts.{InjectableFactory, Token}
import scala.scalajs.js
import scala.scalajs.js.JSConverters.*

object UnsafeInterop:
  def token[A](name: String): Token[A] = Token(name)

  def inject[A](tokens: Seq[String], factory: js.Function): InjectableFactory[A] =
    InjectableFactory(tokens, factory)

  def literal(fields: (String, js.Any)*): js.Object =
    val result = js.Dynamic.literal()

    fields.foreach { case (name, value) =>
      result.updateDynamic(name)(value)
    }

    result.asInstanceOf[js.Object]
