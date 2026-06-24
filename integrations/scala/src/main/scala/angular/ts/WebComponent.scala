package angular.ts

import org.scalajs.dom
import scala.scalajs.js
import scala.scalajs.js.annotation.*

final case class WebComponentInput(
    attribute: js.UndefOr[String] = js.undefined,
    default: js.UndefOr[js.Any] = js.undefined,
    reflect: js.UndefOr[Boolean] = js.undefined,
    inputType: js.UndefOr[js.Function] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "attribute" -> attribute,
      "default" -> default,
      "reflect" -> reflect,
      "type" -> inputType,
    )

type WebComponentInputConfig = WebComponentInput
type WebComponentInputs = js.Dictionary[WebComponentInput | js.Function]

@js.native
trait WebComponentContext[T <: js.Object] extends js.Object:
  val host: dom.HTMLElement = js.native
  val scope: Scope & T = js.native
  val injector: InjectorService = js.native
  val root: dom.Element | dom.ShadowRoot = js.native
  val shadowRoot: js.UndefOr[dom.ShadowRoot] = js.native
  def dispatch(
      eventType: String,
      detail: js.UndefOr[js.Any] = js.undefined,
      init: js.UndefOr[dom.CustomEventInit] = js.undefined,
  ): Boolean = js.native

@js.native
@JSGlobal("angular.ScopeElement")
abstract class ScopeElement[T <: js.Object] extends dom.HTMLElement:
  val scope: Scope & T = js.native
  val injector: InjectorService = js.native
  val root: dom.Element | dom.ShadowRoot = js.native
  def dispatch(
      eventType: String,
      detail: js.UndefOr[js.Any] = js.undefined,
      init: js.UndefOr[dom.CustomEventInit] = js.undefined,
  ): Boolean = js.native
  def connected(): js.UndefOr[js.Function0[Unit]] = js.native
  def disconnected(): Unit = js.native
  def attributeChanged(
      name: String,
      oldValue: String | Null,
      newValue: String | Null,
  ): Unit = js.native

type ScopeElementConstructor[T <: js.Object] = js.Function
type CustomElementConstructor = js.Function

final case class AngularElementModuleOptions(
    name: js.UndefOr[String] = js.undefined,
    requires: js.UndefOr[js.Array[String]] = js.undefined,
    configure: js.UndefOr[js.Function2[NgModule, Angular, Unit]] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "name" -> name,
      "requires" -> requires,
      "configure" -> configure,
    )

final case class AngularElementOptions[T <: js.Object](
    component: AppComponentOptions[T],
    ngModule: js.UndefOr[js.Object] = js.undefined,
    elementModule: js.UndefOr[AngularElementModuleOptions] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "component" -> component.toJS,
      "ngModule" -> ngModule,
      "elementModule" -> elementModule.map(_.toJS),
    )

@js.native
trait AngularElementDefinition extends js.Object:
  val angular: Angular = js.native
  val ngModule: NgModule = js.native
  val elementModule: NgModule = js.native
  val injector: InjectorService = js.native
  val element: CustomElementConstructor = js.native
  val name: String = js.native

final case class ElementScopeOptions(
    parentScope: js.UndefOr[Scope] = js.undefined,
    isolate: js.UndefOr[Boolean] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "parentScope" -> parentScope,
      "isolate" -> isolate,
    )

@js.native
trait WebComponentService extends js.Object:
  def defineAppComponent[T <: js.Object](
      name: String,
      options: js.Object,
  ): CustomElementConstructor = js.native
  def defineElement[T <: js.Object](
      name: String,
      elementClass: ScopeElementConstructor[T],
  ): CustomElementConstructor = js.native
  def createElementScope[T <: js.Object](
      host: dom.HTMLElement,
  ): Scope & T = js.native
  def createElementScope[T <: js.Object](
      host: dom.HTMLElement,
      initialState: T,
  ): Scope & T = js.native
  def createElementScope[T <: js.Object](
      host: dom.HTMLElement,
      initialState: T,
      options: js.Object,
  ): Scope & T = js.native

object WebComponentService:
  extension (service: WebComponentService)
    def defineAppComponent[T <: js.Object](
        name: String,
        options: AppComponentOptions[T],
    ): CustomElementConstructor =
      service.defineAppComponent(name, options.toJS)

    def createElementScope[T <: js.Object](
        host: dom.HTMLElement,
        initialState: T,
        options: ElementScopeOptions,
    ): Scope & T =
      service.createElementScope(host, initialState, options.toJS)

final case class AppComponentOptions[T <: js.Object](
    template: js.UndefOr[String] = js.undefined,
    shadow: js.UndefOr[Boolean] = js.undefined,
    scope: js.UndefOr[T] = js.undefined,
    inputs: Map[String, WebComponentInput] = Map.empty,
    isolate: js.UndefOr[Boolean] = js.undefined,
    connected: js.UndefOr[js.Function1[WebComponentContext[T], js.Any]] =
      js.undefined,
    disconnected: js.UndefOr[js.Function1[WebComponentContext[T], Unit]] =
      js.undefined,
    attributeChanged:
        js.UndefOr[
          js.Function4[
            String,
            String | Null,
            String | Null,
            WebComponentContext[T],
            Unit,
          ],
        ] = js.undefined,
):
  private[ts] def toJS: js.Object =
    val inputObject =
      if inputs.isEmpty then js.undefined
      else
        val result = js.Dynamic.literal()

        inputs.foreach { case (name, input) =>
          result.updateDynamic(name)(input.toJS)
        }

        result.asInstanceOf[js.Object]

    JsObjectBuilder(
      "template" -> template,
      "shadow" -> shadow,
      "scope" -> scope,
      "inputs" -> inputObject,
      "isolate" -> isolate,
      "connected" -> connected,
      "disconnected" -> disconnected,
      "attributeChanged" -> attributeChanged,
    )
