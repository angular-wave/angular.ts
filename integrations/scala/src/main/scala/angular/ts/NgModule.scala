package angular.ts

import scala.scalajs.js
import scala.scalajs.js.JSConverters.*

final class NgModule private[ts] (private[ts] val raw: RuntimeNgModule):
  def name: String = raw.name

  def value[A](token: Token[A], value: A): NgModule =
    raw.value(token.name, value.asInstanceOf[js.Any])
    this

  def factory[A](token: Token[A], factory: InjectableFactory[A]): NgModule =
    raw.factory(token.name, factory.annotated)
    this

  def service[A](token: Token[A], service: InjectableFactory[A]): NgModule =
    raw.service(token.name, service.annotated)
    this

  def controller[A](
      name: String,
      controller: InjectableFactory[A],
  ): NgModule =
    raw.controller(name, controller.annotated)
    this

  def config(config: AngularConfig): NgModule =
    raw.config(config.toJS)
    this

  def component[A](name: String, component: Component[A]): NgModule =
    raw.component(name, component.toJS)
    this

  def directive(name: String, directive: Directive): NgModule =
    raw.directive(name, directive.factory)
    this

  def animation(name: String, preset: AnimationPreset): NgModule =
    raw.animation(name, preset.toJS)
    this

  def animation(
      name: String,
      factory: InjectableFactory[AnimationPreset],
  ): NgModule =
    raw.animation(name, factory.annotated)
    this

  def appComponent[T <: js.Object](
      name: String,
      options: AppComponentOptions[T],
  ): NgModule =
    raw.appComponent(name, options.toJS)
    this

  def webComponent[T <: js.Object](
      name: String,
      elementClass: ScopeElementConstructor[T],
  ): NgModule =
    raw.webComponent(name, elementClass)
    this

  def model[A <: js.Object](
      token: Token[Model[A]],
      initial: A,
  ): NgModule =
    raw.model(token.name, initial)
    this

  def model[A <: js.Object](
      token: Token[Model[A]],
      factory: () => A,
  ): NgModule =
    raw.model(
      token.name,
      (() => factory().asInstanceOf[js.Any]).asInstanceOf[js.Function],
    )
    this

  def model[A <: js.Object](
      token: Token[Model[A]],
      factory: InjectableFactory[A],
  ): NgModule =
    raw.model(token.name, factory.annotated)
    this

  def machine[TData <: js.Object, TEvents <: js.Object](
      token: Token[Machine[TData, TEvents]],
      config: MachineStateConfig[TData, TEvents],
  ): NgModule =
    raw.machine(token.name, config.toJS)
    this

  def machine[TData <: js.Object, TEvents <: js.Object](
      token: Token[Machine[TData, TEvents]],
      factory: InjectableFactory[MachineStateConfig[TData, TEvents]],
  ): NgModule =
    raw.machine(token.name, factory.annotated)
    this

  def workflow[
      TData <: js.Object,
      TCommands <: js.Object,
  ](
      token: Token[Workflow[TData, TCommands]],
      config: WorkflowConfig[TData, TCommands],
  ): NgModule =
    raw.workflow(token.name, config.toJS)
    this

  def workflow[
      TData <: js.Object,
      TCommands <: js.Object,
  ](
      token: Token[Workflow[TData, TCommands]],
      factory: InjectableFactory[WorkflowConfig[TData, TCommands]],
  ): NgModule =
    raw.workflow(token.name, factory.annotated)
    this

  def workflowSupervisor[TWorkflows <: js.Object](
      token: Token[WorkflowSupervisor[TWorkflows]],
      config: WorkflowSupervisorConfig[TWorkflows],
  ): NgModule =
    raw.workflowSupervisor(token.name, config.toJS)
    this

  def workflowSupervisor[TWorkflows <: js.Object](
      token: Token[WorkflowSupervisor[TWorkflows]],
      factory: InjectableFactory[WorkflowSupervisorConfig[TWorkflows]],
  ): NgModule =
    raw.workflowSupervisor(token.name, factory.annotated)
    this

  def store[A <: js.Object](
      token: Token[A],
      value: A,
      storageType: StorageType,
      config: js.UndefOr[PersistentStoreConfig] = js.undefined,
  ): NgModule =
    raw.store(token.name, value, storageType.value, config.map(_.toJS))
    this

  def store[A](
      token: Token[A],
      factory: InjectableFactory[A],
      storageType: StorageType,
      config: js.UndefOr[PersistentStoreConfig],
  ): NgModule =
    raw.store(token.name, factory.annotated, storageType.value, config.map(_.toJS))
    this

  def serviceWorker(
      token: Token[ServiceWorkerService],
      scriptUrl: String,
      config: ServiceWorkerConfig = ServiceWorkerConfig(),
  ): NgModule =
    raw.serviceWorker(token.name, scriptUrl, config.toJS)
    this

  def serviceWorker(
      token: Token[ServiceWorkerService],
      scriptUrl: org.scalajs.dom.URL,
      config: ServiceWorkerConfig,
  ): NgModule =
    raw.serviceWorker(token.name, scriptUrl, config.toJS)
    this

  def wasm(
      token: Token[WasmResource],
      config: WasmLoadOptions,
  ): NgModule =
    raw.wasm(token.name, config.toJS)
    this

  def rest[A, ID](
      token: Token[RestService[A, ID]],
      url: String,
      entityClass: js.UndefOr[EntityClass[A]] = js.undefined,
      options: RestOptions = RestOptions(),
  ): NgModule =
    raw.rest(token.name, url, entityClass, options.toJS)
    this

  def router(declaration: RouterModuleDeclaration): NgModule =
    raw.router(declaration.toJS)
    this

  def router(declarations: Seq[RouterModuleDeclaration]): NgModule =
    raw.router(declarations.map(_.toJS).toJSArray)
    this

  def lazyState(prefix: String, loader: LazyStateLoader): NgModule =
    val runtimeLoader: js.Function2[TargetState, js.UndefOr[InjectorService], js.Any] =
      (target, injector) =>
        NgModule.normalizeLazyStateLoadResult(
          loader(target, injector),
        )

    raw.lazyState(prefix, runtimeLoader)
    this

object NgModule:
  private[ts] def apply(raw: RuntimeNgModule): NgModule = new NgModule(raw)

  private[ts] def normalizeLazyStateLoadResult(value: Any): js.Any =
    if js.isUndefined(value) then js.undefined
    else if isPromiseLike(value) then
      value
        .asInstanceOf[js.Dynamic]
        .applyDynamic("then")(
          (resolved: js.Any) => normalizeLazyStateLoadResult(resolved),
        )
    else
      value match
        case state: StateDeclaration => state.toJS
        case states: js.Array[?] =>
          states.map {
            case state: StateDeclaration => state.toJS
            case other => other.asInstanceOf[js.Any]
          }
        case other => other.asInstanceOf[js.Any]

  private def isPromiseLike(value: Any): Boolean =
    value != null &&
      !js.isUndefined(value) &&
      js.typeOf(value.asInstanceOf[js.Dynamic].selectDynamic("then")) == "function"
