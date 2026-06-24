package angular.ts

import org.scalajs.dom
import scala.scalajs.js
import scala.scalajs.js.annotation.*

@js.native
@JSGlobal("angular")
private[ts] object RuntimeAngular extends js.Object:
  def module(name: String): RuntimeNgModule = js.native
  def module(name: String, requires: js.Array[String]): RuntimeNgModule =
    js.native
  def bootstrap(element: dom.Element, modules: js.Array[String]): RuntimeInjector =
    js.native
  def bootstrap(
      element: dom.Element,
      modules: js.Array[String],
      config: js.Object,
  ): RuntimeInjector = js.native

@js.native
private[ts] trait RuntimeNgModule extends js.Object:
  val name: String = js.native
  def value(name: String, value: js.Any): RuntimeNgModule = js.native
  def factory(name: String, factory: js.Function): RuntimeNgModule = js.native
  def service(name: String, service: js.Function): RuntimeNgModule = js.native
  def controller(name: String, controller: js.Function): RuntimeNgModule =
    js.native
  def config(config: js.Object): RuntimeNgModule = js.native
  def component(name: String, options: js.Object): RuntimeNgModule = js.native
  def directive(name: String, factory: js.Function): RuntimeNgModule = js.native
  def animation(name: String, animationFactory: js.Any): RuntimeNgModule =
    js.native
  def appComponent(name: String, options: js.Object): RuntimeNgModule = js.native
  def webComponent(name: String, elementClass: js.Function): RuntimeNgModule =
    js.native
  def model(name: String, initial: js.Any): RuntimeNgModule = js.native
  def machine(name: String, config: js.Any): RuntimeNgModule = js.native
  def workflow(name: String, config: js.Any): RuntimeNgModule = js.native
  def workflowSupervisor(name: String, config: js.Any): RuntimeNgModule =
    js.native
  def store(
      name: String,
      creator: js.Any,
      storageType: String,
      config: js.UndefOr[js.Object],
  ): RuntimeNgModule = js.native
  def serviceWorker(
      name: String,
      scriptUrl: js.Any,
      config: js.Object,
  ): RuntimeNgModule = js.native
  def wasm(
      name: String,
      src: String,
      imports: js.Any,
      opts: js.Any,
  ): RuntimeNgModule = js.native
  def rest(
      name: String,
      url: String,
      entityClass: js.UndefOr[js.Function],
      options: js.Object,
  ): RuntimeNgModule = js.native
  def state(definition: js.Object): RuntimeNgModule = js.native
  def router(definition: js.Object): RuntimeNgModule = js.native
  def lazyState(prefix: String, loader: js.Function): RuntimeNgModule = js.native

@js.native
trait InjectorService extends js.Object:
  def get(name: String): js.Any = js.native

@js.native
private[ts] trait RuntimeInjector extends InjectorService
