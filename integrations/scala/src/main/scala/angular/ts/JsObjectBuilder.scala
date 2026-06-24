package angular.ts

import scala.scalajs.js

private[ts] object JsObjectBuilder:
  def apply(fields: (String, js.Any)*): js.Object =
    val result = js.Dynamic.literal()

    fields.foreach { case (name, value) =>
      if !js.isUndefined(value) then result.updateDynamic(name)(value)
    }

    result.asInstanceOf[js.Object]

  def stringMap(values: Map[String, String]): js.UndefOr[js.Object] =
    if values.isEmpty then js.undefined
    else
      val result = js.Dynamic.literal()

      values.foreach { case (name, value) =>
        result.updateDynamic(name)(value)
      }

      result.asInstanceOf[js.Object]
