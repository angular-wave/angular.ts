package angular.ts

import org.scalajs.dom.HTMLElement
import scala.scalajs.js
import scala.scalajs.js.JSConverters.*

@js.native
trait ProgrammaticViewContext[+Controller, +Required] extends js.Object:
  val controller: js.UndefOr[Controller] = js.native

  val required: js.UndefOr[Required] = js.native

  val scope: Scope = js.native

  val host: HTMLElement = js.native

  val transclude: js.Function = js.native

  val onDestroy: js.Function1[js.Function0[Unit], js.Function0[Unit]] = js.native

type ProgrammaticView[Controller, Required] =
  js.Function1[ProgrammaticViewContext[Controller, Required], js.Any]

final class ProgrammaticTags private[ts] (private val raw: js.Dynamic):
  def namespace(namespaceUri: String): ProgrammaticTags =
    ProgrammaticTags(
      RuntimeReflect
        .invoke(raw.asInstanceOf[js.Function], js.undefined, js.Array(namespaceUri))
        .asInstanceOf[js.Dynamic],
    )

  def tag(
      name: String,
      properties: Map[String, js.Any] = Map.empty,
      children: js.Any*,
  ): org.scalajs.dom.Element =
    val arguments = js.Array[js.Any](properties.toJSDictionary)
    arguments.push(children*)

    RuntimeReflect
      .invoke(raw.selectDynamic(name).asInstanceOf[js.Function], js.undefined, arguments)
      .asInstanceOf[org.scalajs.dom.Element]

final class ProgrammaticViewApi private[ts] (private val raw: js.Dynamic):
  def event(
      listener: js.Function1[org.scalajs.dom.Event, Unit],
      options: js.Any = js.undefined,
  ): js.Function1[org.scalajs.dom.Event, Unit] =
    RuntimeReflect
      .invoke(raw.event.asInstanceOf[js.Function], js.undefined, js.Array(listener, options))
      .asInstanceOf[js.Function1[org.scalajs.dom.Event, Unit]]

  def attrs(values: Map[String, js.Any]): js.Dynamic =
    RuntimeReflect
      .invoke(raw.attrs.asInstanceOf[js.Function], js.undefined, js.Array(values.toJSDictionary))
      .asInstanceOf[js.Dynamic]

  def props(values: Map[String, js.Any]): js.Dynamic =
    RuntimeReflect
      .invoke(raw.props.asInstanceOf[js.Function], js.undefined, js.Array(values.toJSDictionary))
      .asInstanceOf[js.Dynamic]

  def each[T](
      read: js.Function0[js.Array[T]],
      key: js.Function1[T, js.Any],
      render: js.Function1[js.Function0[T], js.Any],
  ): js.Function0[js.Any] =
    RuntimeReflect
      .invoke(raw.each.asInstanceOf[js.Function], js.undefined, js.Array(read, key, render))
      .asInstanceOf[js.Function0[js.Any]]

  def tag(
      name: String,
      properties: Map[String, js.Any] = Map.empty,
      children: js.Any*,
  ): org.scalajs.dom.Element =
    val arguments = js.Array[js.Any](name, properties.toJSDictionary)
    arguments.push(children*)
    RuntimeReflect
      .invoke(raw.tag.asInstanceOf[js.Function], js.undefined, arguments)
      .asInstanceOf[org.scalajs.dom.Element]

  def tagNS(
      namespaceUri: String,
      name: String,
      properties: Map[String, js.Any] = Map.empty,
      children: js.Any*,
  ): org.scalajs.dom.Element =
    val arguments = js.Array[js.Any](namespaceUri, name, properties.toJSDictionary)
    arguments.push(children*)
    RuntimeReflect
      .invoke(raw.tagNS.asInstanceOf[js.Function], js.undefined, arguments)
      .asInstanceOf[org.scalajs.dom.Element]
