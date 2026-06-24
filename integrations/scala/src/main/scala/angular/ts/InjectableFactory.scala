package angular.ts

import scala.scalajs.js
import scala.scalajs.js.JSConverters.*

final case class InjectableFactory[A] private[ts] (
    tokens: Seq[String],
    raw: js.Function,
):
  private[ts] def annotated: js.Function =
    raw.asInstanceOf[js.Dynamic].updateDynamic("$inject")(tokens.toJSArray)
    raw
