package angular.ts

import org.scalajs.dom

import scala.concurrent.ExecutionContext.Implicits.global
import scala.scalajs.js
import scala.scalajs.js.JSConverters.*

class AngularTSSuite extends munit.FunSuite:
  test("typed tokens preserve their runtime names"):
    val token = AngularTS.token[String]("userName")
    assertEquals(token.name, "userName")

  test("built-in service tokens preserve AngularTS injectable names"):
    assertEquals(Tokens.anchorScroll.name, "$anchorScroll")
    assertEquals(Tokens.animate.name, "$animate")
    assertEquals(Tokens.aria.name, "$aria")
    assertEquals(Tokens.compile.name, "$compile")
    assertEquals(Tokens.controller.name, "$controller")
    assertEquals(Tokens.document.name, "$document")
    assertEquals(Tokens.element.name, "$element")
    assertEquals(Tokens.exceptionHandler.name, "$exceptionHandler")
    assertEquals(Tokens.filter.name, "$filter")
    assertEquals(Tokens.http.name, "$http")
    assertEquals(Tokens.httpParamSerializer.name, "$httpParamSerializer")
    assertEquals(Tokens.interpolate.name, "$interpolate")
    assertEquals(Tokens.parse.name, "$parse")
    assertEquals(Tokens.rootScope.name, "$rootScope")
    assertEquals(Tokens.rootElement.name, "$rootElement")
    assertEquals(Tokens.scope.name, "$scope")
    assertEquals(Tokens.templateCache.name, "$templateCache")
    assertEquals(Tokens.templateRequest.name, "$templateRequest")
    assertEquals(Tokens.window.name, "$window")
    assertEquals(Tokens.log.name, "$log")
    assertEquals(Tokens.location.name, "$location")
    assertEquals(Tokens.cookie.name, "$cookie")
    assertEquals(Tokens.eventBus.name, "$eventBus")
    assertEquals(Tokens.machine.name, "$machine")
    assertEquals(Tokens.rest.name, "$rest")
    assertEquals(Tokens.security.name, "$security")
    assertEquals(Tokens.serviceWorker.name, "$serviceWorker")
    assertEquals(Tokens.sce.name, "$sce")
    assertEquals(Tokens.sceDelegate.name, "$sceDelegate")
    assertEquals(Tokens.stream.name, "$stream")
    assertEquals(Tokens.sse.name, "$sse")
    assertEquals(Tokens.state.name, "$state")
    assertEquals(Tokens.transitions.name, "$transitions")
    assertEquals(Tokens.stateRegistry.name, "$stateRegistry")
    assertEquals(Tokens.wasm.name, "$wasm")
    assertEquals(Tokens.websocket.name, "$websocket")
    assertEquals(Tokens.webTransport.name, "$webTransport")
    assertEquals(Tokens.webComponent.name, "$webComponent")
    assertEquals(Tokens.worker.name, "$worker")
    assertEquals(Tokens.workflow.name, "$workflow")

  test("public service facades preserve runtime service shapes"):
    val angular: Angular = js.Dynamic.literal(version = "test").asInstanceOf[js.Object]
    val eventBus = js.Dynamic
      .literal(
        publish = (_: String, _: js.Any) => (),
        subscribe = (_: String, _: js.Function1[js.Any, Unit]) => () => (),
        isDisposed = () => false,
      )
      .asInstanceOf[EventBusService]

    assertEquals(
      angular.asInstanceOf[js.Dynamic].selectDynamic("version").asInstanceOf[String],
      "test",
    )
    assertEquals(eventBus.isDisposed(), false)

  test("inject helpers annotate JavaScript functions"):
    val token = AngularTS.token[String]("userName")
    val injectable = AngularTS.inject1(token)(identity)
    val annotated = injectable.annotated.asInstanceOf[js.Dynamic]

    assertEquals(annotated.selectDynamic("$inject").asInstanceOf[js.Array[String]].toSeq, Seq("userName"))

  test("higher arity inject helpers preserve token order"):
    val a = AngularTS.token[String]("a")
    val b = AngularTS.token[Int]("b")
    val c = AngularTS.token[Boolean]("c")
    val d = AngularTS.token[Double]("d")
    val e = AngularTS.token[String]("e")
    val f = AngularTS.token[String]("f")
    val injectable = AngularTS.inject6(a, b, c, d, e, f) {
      (aValue, bValue, cValue, dValue, eValue, fValue) =>
        s"$aValue-$bValue-$cValue-$dValue-$eValue-$fValue"
    }
    val annotated = injectable.annotated.asInstanceOf[js.Dynamic]

    assertEquals(
      annotated.selectDynamic("$inject").asInstanceOf[js.Array[String]].toSeq,
      Seq("a", "b", "c", "d", "e", "f"),
    )

  test("public factory and link aliases preserve callable runtime shapes"):
    val rawFactory: js.Function0[js.Object] = () => js.Dynamic.literal()
    val annotatedFactory: AnnotatedFactory[js.Function] =
      js.Array("dependency", rawFactory.asInstanceOf[js.Function])
    val directiveFactory: DirectiveFactoryFn = () => Directive()
    val annotatedDirectiveFactory: AnnotatedDirectiveFactory =
      js.Array("dependency", directiveFactory)
    val controllerConstructor: ControllerConstructor =
      js.Dynamic.global.Function.asInstanceOf[ControllerConstructor]
    val transcludeRaw
        : js.Function4[js.UndefOr[Scope], js.UndefOr[js.Any], js.UndefOr[js.Any], js.UndefOr[String], js.UndefOr[TranscludedNodes]] =
      (_: js.UndefOr[Scope], _: js.UndefOr[js.Any], _: js.UndefOr[js.Any], _: js.UndefOr[String]) =>
        js.undefined
    val linkRaw
        : js.Function3[Scope, js.UndefOr[CloneAttachFn], js.UndefOr[js.Object], org.scalajs.dom.Node] =
      (_: Scope, _: js.UndefOr[CloneAttachFn], _: js.UndefOr[js.Object]) =>
        js.Dynamic.literal().asInstanceOf[org.scalajs.dom.Node]
    val transclude = transcludeRaw.asInstanceOf[TranscludeFn]
    val link = linkRaw.asInstanceOf[LinkFn]

    assert(js.Array.isArray(annotatedFactory.asInstanceOf[js.Any]))
    assertEquals(annotatedFactory(0).asInstanceOf[String], "dependency")
    assertEquals(js.typeOf(directiveFactory), "function")
    assert(js.Array.isArray(annotatedDirectiveFactory.asInstanceOf[js.Any]))
    assertEquals(js.typeOf(controllerConstructor), "function")
    assertEquals(js.typeOf(transclude), "function")
    assertEquals(js.typeOf(link), "function")

  test("directive builder exposes a JavaScript factory"):
    val directive = Directive(restrict = DirectiveRestrict.Attribute)
    val definition = directive.factory().asInstanceOf[js.Dynamic]

    assertEquals(definition.selectDynamic("restrict").asInstanceOf[String], "A")

  test("directive builder emits pre/post lifecycle links"):
    val directive = Directive(
      prePostLink = DirectivePrePost(
        pre = (_: Scope, _: org.scalajs.dom.HTMLElement) => (),
        post = (_: Scope, _: org.scalajs.dom.HTMLElement) => (),
      ),
    )
    val definition = directive.factory().asInstanceOf[js.Dynamic]

    assert(definition.selectDynamic("link").selectDynamic("pre").isInstanceOf[js.Function])
    assert(definition.selectDynamic("link").selectDynamic("post").isInstanceOf[js.Function])

  test("component builder emits typed options"):
    val controller = AngularTS.inject0(() => js.Dynamic.literal(message = "ok"))
    val component = Component(
      template = "<p>{{$ctrl.message}}</p>",
      controller = controller,
      bindings = Map("name" -> "@"),
      require = Map("form" -> "^form"),
      controllerAs = "$ctrl",
    ).toJS.asInstanceOf[js.Dynamic]

    assertEquals(component.selectDynamic("template").asInstanceOf[String], "<p>{{$ctrl.message}}</p>")
    assertEquals(component.selectDynamic("controllerAs").asInstanceOf[String], "$ctrl")
    assertEquals(
      component.selectDynamic("bindings").selectDynamic("name").asInstanceOf[String],
      "@",
    )
    assertEquals(
      component.selectDynamic("require").selectDynamic("form").asInstanceOf[String],
      "^form",
    )

  test("app component builder emits typed options"):
    final class CardScope(val label: String) extends js.Object

    val options = AppComponentOptions[CardScope](
      template = "<p>{{label}}</p>",
      scope = new CardScope("Card"),
      inputs = Map(
        "label" -> WebComponentInput(attribute = "label", reflect = true),
      ),
      isolate = true,
    ).toJS.asInstanceOf[js.Dynamic]

    assertEquals(options.selectDynamic("template").asInstanceOf[String], "<p>{{label}}</p>")
    assertEquals(options.selectDynamic("isolate").asInstanceOf[Boolean], true)
    assertEquals(
      options.selectDynamic("scope").selectDynamic("label").asInstanceOf[String],
      "Card",
    )
    assertEquals(
      options
        .selectDynamic("inputs")
        .selectDynamic("label")
        .selectDynamic("attribute")
        .asInstanceOf[String],
      "label",
    )

  test("web component service facade accepts typed element scope options"):
    import WebComponentService.*

    final class ElementState(val count: Int) extends js.Object

    val options = ElementScopeOptions(
      isolate = true,
    ).toJS.asInstanceOf[js.Dynamic]
    val runtimeService = js.Dynamic.literal()
    var capturedAppOptions: js.Dynamic = js.Dynamic.literal()
    var capturedScopeOptions: js.Dynamic = js.Dynamic.literal()
    val defineAppComponentFn: js.Function2[String, js.Object, CustomElementConstructor] =
      (_: String, appOptions: js.Object) =>
        capturedAppOptions = appOptions.asInstanceOf[js.Dynamic]
        js.Dynamic.global.Function.asInstanceOf[CustomElementConstructor]
    val defineElementFn
        : js.Function2[
          String,
          ScopeElementConstructor[ElementState],
          CustomElementConstructor,
        ] =
      (_: String, _: ScopeElementConstructor[ElementState]) =>
        js.Dynamic.global.Function.asInstanceOf[CustomElementConstructor]
    val createElementScopeFn
        : js.Function3[org.scalajs.dom.HTMLElement, ElementState, js.Object, Scope & ElementState] =
      (_: org.scalajs.dom.HTMLElement, state: ElementState, scopeOptions: js.Object) =>
        capturedScopeOptions = scopeOptions.asInstanceOf[js.Dynamic]
        state.asInstanceOf[Scope & ElementState]
    runtimeService.updateDynamic("defineAppComponent")(defineAppComponentFn)
    runtimeService.updateDynamic("defineElement")(defineElementFn)
    runtimeService.updateDynamic("createElementScope")(createElementScopeFn)
    val service = runtimeService.asInstanceOf[WebComponentService]

    assertEquals(options.selectDynamic("isolate").asInstanceOf[Boolean], true)
    service.defineAppComponent(
      "counter-card",
      AppComponentOptions[ElementState](
        template = "<p>{{count}}</p>",
        scope = new ElementState(1),
      ),
    )
    val scope = service.createElementScope(
      js.Dynamic.literal().asInstanceOf[org.scalajs.dom.HTMLElement],
      new ElementState(2),
      ElementScopeOptions(isolate = true),
    )

    assertEquals(
      capturedAppOptions.selectDynamic("template").asInstanceOf[String],
      "<p>{{count}}</p>",
    )
    assertEquals(capturedScopeOptions.selectDynamic("isolate").asInstanceOf[Boolean], true)
    assertEquals(scope.count, 2)

  test("angular element options and definition facades preserve runtime metadata"):
    final class ElementState(val title: String) extends js.Object
    var configured = false
    val component = AppComponentOptions[ElementState](
      template = "<button>{{title}}</button>",
      scope = new ElementState("Launch"),
    )
    val elementModule = AngularElementModuleOptions(
      name = "shipElement",
      requires = js.Array("ng"),
      configure = (_: NgModule, _: Angular) => configured = true,
    )
    val options = AngularElementOptions(
      component = component,
      ngModule = js.Dynamic.literal(name = "ng").asInstanceOf[js.Object],
      elementModule = elementModule,
    ).toJS.asInstanceOf[js.Dynamic]
    val definition = js.Dynamic
      .literal(
        angular = js.Dynamic.literal(version = "test"),
        ngModule = null,
        elementModule = null,
        injector = js.Dynamic.literal(get = (_: String) => js.Dynamic.literal()),
        element = (() => ()).asInstanceOf[js.Function0[Unit]],
        name = "ship-panel",
      )
      .asInstanceOf[AngularElementDefinition]

    options
      .selectDynamic("elementModule")
      .selectDynamic("configure")
      .asInstanceOf[js.Function2[NgModule, Angular, Unit]](
        null.asInstanceOf[NgModule],
        null.asInstanceOf[Angular],
      )

    assertEquals(
      options.selectDynamic("component").selectDynamic("template").asInstanceOf[String],
      "<button>{{title}}</button>",
    )
    assertEquals(
      options.selectDynamic("elementModule").selectDynamic("name").asInstanceOf[String],
      "shipElement",
    )
    assertEquals(
      options
        .selectDynamic("elementModule")
        .selectDynamic("requires")
        .asInstanceOf[js.Array[String]]
        .toSeq,
      Seq("ng"),
    )
    assertEquals(configured, true)
    assertEquals(definition.name, "ship-panel")

  test("cookie options builder emits service option object"):
    val options = CookieOptions(
      path = "/",
      domain = "example.test",
      secure = true,
      sameSite = "Strict",
    ).toJS.asInstanceOf[js.Dynamic]

    assertEquals(options.selectDynamic("path").asInstanceOf[String], "/")
    assertEquals(options.selectDynamic("domain").asInstanceOf[String], "example.test")
    assertEquals(options.selectDynamic("secure").asInstanceOf[Boolean], true)
    assertEquals(options.selectDynamic("samesite").asInstanceOf[String], "Strict")

  test("cookie store options builder emits serializer and cookie options"):
    val options = CookieStoreOptions(
      serialize = (value: js.Any) => js.JSON.stringify(value),
      deserialize = (value: String) => js.JSON.parse(value),
      cookie = CookieOptions(path = "/store", sameSite = "Lax"),
    ).toJS.asInstanceOf[js.Dynamic]

    assertEquals(js.typeOf(options.selectDynamic("serialize")), "function")
    assertEquals(js.typeOf(options.selectDynamic("deserialize")), "function")
    assertEquals(
      options.selectDynamic("cookie").selectDynamic("path").asInstanceOf[String],
      "/store",
    )
    assertEquals(
      options.selectDynamic("cookie").selectDynamic("samesite").asInstanceOf[String],
      "Lax",
    )

  test("http request config builder emits request object"):
    val headers = js.Dictionary[js.Any]("Accept" -> "application/json")
    val params = js.Dictionary[js.Any]("page" -> 2)
    val config = HttpRequestConfig(
      method = HttpMethod.Get,
      url = "/api/users",
      headers = headers,
      params = params,
      responseType = "json",
      withCredentials = true,
    ).toJS.asInstanceOf[js.Dynamic]

    assertEquals(config.selectDynamic("method").asInstanceOf[String], "GET")
    assertEquals(config.selectDynamic("url").asInstanceOf[String], "/api/users")
    assertEquals(
      config.selectDynamic("headers").selectDynamic("Accept").asInstanceOf[String],
      "application/json",
    )
    assertEquals(config.selectDynamic("params").selectDynamic("page").asInstanceOf[Int], 2)
    assertEquals(config.selectDynamic("responseType").asInstanceOf[String], "json")
    assertEquals(config.selectDynamic("withCredentials").asInstanceOf[Boolean], true)

  test("http shortcut config builder emits request option object"):
    val config = HttpRequestOptions(
      headers = js.Dictionary[js.Any]("X-Test" -> "yes"),
      timeout = 2500.0,
    ).toJS.asInstanceOf[js.Dynamic]

    assertEquals(
      config.selectDynamic("headers").selectDynamic("X-Test").asInstanceOf[String],
      "yes",
    )
    assertEquals(config.selectDynamic("timeout").asInstanceOf[Double], 2500.0)

  test("filter entry item and currency options preserve runtime shapes"):
    val entry = EntryFilterItem("name", "Ada").asInstanceOf[js.Dynamic]
    val currencyOptions: CurrencyFilterOptions =
      js.Dynamic.literal(currency = "EUR").asInstanceOf[js.Object]

    assertEquals(entry.selectDynamic("key").asInstanceOf[String], "name")
    assertEquals(entry.selectDynamic("value").asInstanceOf[String], "Ada")
    assertEquals(
      currencyOptions.asInstanceOf[js.Dynamic].selectDynamic("currency").asInstanceOf[String],
      "EUR",
    )

  test("core callable service facades preserve runtime call shapes"):
    val scope = js.Dynamic.literal().asInstanceOf[Scope]
    val node = js.Dynamic.literal(nodeName = "DIV").asInstanceOf[org.scalajs.dom.Node]
    val locals = ControllerLocals(scope, node).asInstanceOf[js.Dynamic]
    val validator: Validator = (value: js.Any) =>
      value.asInstanceOf[String] == "ok"
    val serializer: HttpParamSerializerService =
      (params: js.UndefOr[js.Dictionary[js.Any]]) =>
        params.fold("")(values => s"page=${values("page")}")

    var linkedScope: js.UndefOr[Scope] = js.undefined
    val rawLink: js.Function3[
      Scope,
      js.UndefOr[CloneAttachFn],
      js.UndefOr[js.Object],
      org.scalajs.dom.Node,
    ] =
      (nextScope, _, _) =>
        linkedScope = nextScope
        node
    val linkFn = rawLink.asInstanceOf[LinkFn]
    val rawCompile: js.Function5[
      CompileNode,
      js.UndefOr[ChildTranscludeOrLinkFn | Null],
      js.UndefOr[Double],
      js.UndefOr[String],
      js.UndefOr[js.Object | Null],
      LinkFn,
    ] =
      (compileNode, _, _, _, _) =>
        assertEquals(compileNode.asInstanceOf[String], "<p>{{name}}</p>")
        linkFn
    val compile = rawCompile.asInstanceOf[CompileService]

    var controllerIdent = ""
    val rawController: js.Function4[
      ControllerExpression,
      js.UndefOr[ControllerLocals],
      js.UndefOr[Boolean],
      js.UndefOr[String],
      js.Any,
    ] =
      (expression, _, later, ident) =>
        assertEquals(expression.asInstanceOf[String], "DemoCtrl")
        assert(later.get)
        controllerIdent = ident.get
        js.Dynamic.literal()
    val controller = rawController.asInstanceOf[ControllerService]

    val rawParse: js.Function2[
      String,
      js.UndefOr[js.Function1[js.Any, js.Any]],
      CompiledExpression,
    ] =
      (expression, _) =>
        assertEquals(expression, "count + 1")
        val rawExpression: js.Function3[
          js.UndefOr[js.Any],
          js.UndefOr[js.Object],
          js.UndefOr[js.Any],
          js.Any,
        ] = (context, _, _) =>
          context
            .get
            .asInstanceOf[js.Dynamic]
            .selectDynamic("count")
            .asInstanceOf[Int] + 1
        rawExpression.asInstanceOf[CompiledExpression]
    val parse = rawParse.asInstanceOf[ParseService]

    assertEquals(locals.selectDynamic("$scope").asInstanceOf[Scope], scope)
    assertEquals(locals.selectDynamic("$element").asInstanceOf[org.scalajs.dom.Node], node)
    assert(validator("ok"))
    assertEquals(serializer(js.Dictionary[js.Any]("page" -> 2)), "page=2")
    val compiled = compile(
      "<p>{{name}}</p>",
      js.undefined,
      js.undefined,
      js.undefined,
      js.undefined,
    )
    assertEquals(compiled(scope, js.undefined, js.undefined), node)
    assertEquals(linkedScope.get, scope)
    controller("DemoCtrl", locals.asInstanceOf[ControllerLocals], true, "vm")
    assertEquals(controllerIdent, "vm")
    val expression = parse("count + 1", js.undefined)
    assertEquals(
      expression(js.Dynamic.literal(count = 41), js.undefined, js.undefined)
        .asInstanceOf[Int],
      42,
    )

  test("public utility aliases and ng model facade preserve runtime shapes"):
    val expression: Expression = "user.name"
    val classMap: ClassMap = js.Dictionary("active" -> true, "hidden" -> false)
    val classValue: ClassValue = js.Array("card", classMap)
    val listener: ListenerFn = (value, originalTarget) =>
      assertEquals(value.get.asInstanceOf[String], "next")
      assert(originalTarget.isDefined)
    val injectable: Injectable[String] =
      AngularTS.inject0(() => "value")

    val runtimeModel = js.Dynamic.literal(
      $viewValue = "draft",
      $modelValue = "saved",
      $validators = js.Dictionary.empty[ModelValidator],
      $asyncValidators = js.Dictionary.empty[AsyncModelValidator],
      $parsers = js.Array[ModelParser]((value: js.Any) => value),
      $formatters = js.Array[ModelFormatter]((value: js.Any) => value),
      $viewChangeListeners = js.Array[ModelViewChangeListener](() => ()),
      $untouched = true,
      $touched = false,
      $pristine = true,
      $dirty = false,
      $valid = true,
      $invalid = false,
      $validity = null,
      $validationMessage = "",
      $error = js.Dictionary.empty[Boolean],
      $name = "field",
      $target = js.Dynamic.literal(),
      $options = js.Dynamic.literal(),
    )
    var viewValue: js.Any = js.undefined
    var validity: js.UndefOr[(String, PublicValidationState)] = js.undefined
    runtimeModel.updateDynamic("$setViewValue") {
      (value: js.Any, _: js.UndefOr[String]) => viewValue = value
    }
    runtimeModel.updateDynamic("$setValidity") {
      (key: String, state: PublicValidationState) => validity = (key, state)
    }
    runtimeModel.updateDynamic("$isEmpty") {
      (value: js.Any) => value == null || value.asInstanceOf[String].isEmpty
    }
    runtimeModel.updateDynamic("$render") { () => () }
    runtimeModel.updateDynamic("$setNativeValidity") { (_: Boolean | Null) => () }
    runtimeModel.updateDynamic("$setCustomValidity") { (_: String) => () }
    runtimeModel.updateDynamic("$setPristine") { () => () }
    runtimeModel.updateDynamic("$setDirty") { () => () }
    runtimeModel.updateDynamic("$setUntouched") { () => () }
    runtimeModel.updateDynamic("$setTouched") { () => () }
    runtimeModel.updateDynamic("$rollbackViewValue") { () => () }
    runtimeModel.updateDynamic("$validate") { () => () }
    runtimeModel.updateDynamic("$commitViewValue") { () => () }
    runtimeModel.updateDynamic("$overrideModelOptions") { (_: js.Object) => () }
    runtimeModel.updateDynamic("$processModelValue") { () => () }
    val model = runtimeModel.asInstanceOf[NgModelController]

    listener("next", js.Dynamic.literal(id = 1).asInstanceOf[js.Object])
    assertEquals(expression, "user.name")
    assertEquals(classMap("active"), true)
    assert(classValue.asInstanceOf[js.Array[js.Any]].contains("card"))
    assertEquals(
      injectable.annotated.asInstanceOf[js.Function0[String]].apply(),
      "value",
    )
    assertEquals(model.$viewValue.asInstanceOf[String], "draft")
    assertEquals(model.$modelValue.asInstanceOf[String], "saved")
    assertEquals(model.$name.asInstanceOf[String], "field")
    assert(model.$isEmpty(""))
    model.$setViewValue("next", "input")
    model.$setValidity("required", false)
    assertEquals(viewValue.asInstanceOf[String], "next")
    assertEquals(validity.get._1, "required")
    assertEquals(validity.get._2.asInstanceOf[Boolean], false)

  test("animation option and preset builders emit runtime objects"):
    var started = false
    val frames = js.Array(
      js.Dynamic.literal(opacity = 0).asInstanceOf[js.Object],
      js.Dynamic.literal(opacity = 1).asInstanceOf[js.Object],
    )
    val options = AnimationOptions(
      animation = "fade",
      keyframes = frames,
      addClass = "is-entering",
      from = js.Dictionary[String | Double]("opacity" -> 0.0),
      to = js.Dictionary[String | Double]("opacity" -> 1.0),
      tempClasses = js.Array("ng-animating"),
      duration = 120.0,
      easing = "linear",
      fill = "both",
      onStart = (_: org.scalajs.dom.Element, _: AnimationContext) => started = true,
    ).toJS.asInstanceOf[js.Dynamic]
    val handler: AnimationPresetHandler =
      (_: org.scalajs.dom.Element, _: AnimationContext, _: AnimationOptions) => ()
    val preset = AnimationPreset(
      enter = frames,
      leave = handler,
      options = js.Dynamic.literal(duration = 80).asInstanceOf[js.Object],
    ).toJS.asInstanceOf[js.Dynamic]

    assertEquals(AnimationPhase.Enter.value, "enter")
    assertEquals(options.selectDynamic("animation").asInstanceOf[String], "fade")
    assertEquals(options.selectDynamic("duration").asInstanceOf[Double], 120.0)
    assertEquals(options.selectDynamic("easing").asInstanceOf[String], "linear")
    assertEquals(
      options.selectDynamic("tempClasses").asInstanceOf[js.Array[String]].toSeq,
      Seq("ng-animating"),
    )
    options
      .selectDynamic("onStart")
      .asInstanceOf[js.Function2[org.scalajs.dom.Element, AnimationContext, Unit]](
        js.Dynamic.literal().asInstanceOf[org.scalajs.dom.Element],
        js.Dynamic
          .literal(
            phase = "enter",
            signal = js.Dynamic.literal().asInstanceOf[org.scalajs.dom.AbortSignal],
          )
          .asInstanceOf[AnimationContext],
      )
    assertEquals(started, true)
    assertEquals(preset.selectDynamic("enter").asInstanceOf[js.Array[js.Object]], frames)
    assert(js.typeOf(preset.selectDynamic("leave")) == "function")
    assertEquals(
      preset.selectDynamic("options").selectDynamic("duration").asInstanceOf[Int],
      80,
    )

  test("animate service facade accepts typed options and preset builders"):
    val element = js.Dynamic.literal().asInstanceOf[org.scalajs.dom.Element]
    val handle = js.Dynamic
      .literal(
        controller = js.Dynamic.literal().asInstanceOf[org.scalajs.dom.AbortController],
        finished = js.Promise.resolve(()),
        done = (_: js.Function1[Boolean, Unit]) => (),
        cancel = () => (),
        finish = () => (),
        pause = () => (),
        play = () => (),
        complete = (_: js.UndefOr[Boolean]) => (),
      )
      .asInstanceOf[AnimationHandle]
    var definedPreset: js.Any = js.Dynamic.literal()
    var capturedOptions: js.Any = js.Dynamic.literal()
    var capturedClass = ""
    val service = js.Dynamic
      .literal(
        cancel = (_: js.UndefOr[AnimationHandle]) => (),
        define = (_: String, preset: js.Object) => definedPreset = preset,
        addClass =
          (_: org.scalajs.dom.Element, className: String, options: js.Object) =>
            capturedClass = className
            capturedOptions = options
            handle,
        leave = (_: org.scalajs.dom.Element, _: js.Object) => handle,
        transition = (_: js.Function0[Unit | js.Promise[Unit]]) =>
          js.Promise.resolve(()),
      )
      .asInstanceOf[AnimateService]

    service.define(
      "fade",
      AnimationPreset(
        enter = js.Array(js.Dynamic.literal(opacity = 1).asInstanceOf[js.Object]),
      ),
    )
    assertEquals(
      definedPreset
        .asInstanceOf[js.Dynamic]
        .selectDynamic("enter")
        .asInstanceOf[js.Array[js.Object]]
        .length,
      1,
    )
    assertEquals(
      service.addClass(
        element,
        "is-visible",
        AnimationOptions(duration = 250.0),
      ),
      handle,
    )
    assertEquals(service.leave(element, AnimationOptions(duration = 50.0)), handle)
    assertEquals(capturedClass, "is-visible")
    assertEquals(
      capturedOptions
        .asInstanceOf[js.Dynamic]
        .selectDynamic("duration")
        .asInstanceOf[Double],
      250.0,
    )

  test("event bus config builder emits event delivery policy callback"):
    val policy: EventDeliveryPolicy = (_: EventDeliveryPolicyContext) =>
      EventDeliveryDecisionType.Deliver.value
    val config = EventBusConfig(deliveryPolicy = policy).toJS.asInstanceOf[js.Dynamic]

    assertEquals(
      config
        .selectDynamic("deliveryPolicy")
        .asInstanceOf[js.Function1[EventDeliveryPolicyContext, String]]
        .apply(js.Dynamic.literal(topic = "ready").asInstanceOf[EventDeliveryPolicyContext]),
      "deliver",
    )

  test("sse config builder emits connection and transport options"):
    val config = SseConfig(
      withCredentials = true,
      params = js.Dictionary[js.Any]("room" -> "alpha"),
      connection = ConnectionConfig(
        retryDelay = 100.0,
        maxRetries = 3.0,
        eventTypes = js.Array("message", "ready"),
      ),
    ).toJS.asInstanceOf[js.Dynamic]

    assertEquals(config.selectDynamic("withCredentials").asInstanceOf[Boolean], true)
    assertEquals(config.selectDynamic("params").selectDynamic("room").asInstanceOf[String], "alpha")
    assertEquals(config.selectDynamic("retryDelay").asInstanceOf[Double], 100.0)
    assertEquals(config.selectDynamic("maxRetries").asInstanceOf[Double], 3.0)
    assertEquals(
      config.selectDynamic("eventTypes").asInstanceOf[js.Array[String]].toSeq,
      Seq("message", "ready"),
    )

  test("realtime protocol message and event detail builders emit wire shapes"):
    val source = js.Dynamic.literal().asInstanceOf[SseConnection]
    val message = RealtimeProtocolMessage(
      data = "fallback",
      html = "<p>ready</p>",
      target = "#status",
      swap = SwapMode.BeforeEnd,
    ).asInstanceOf[js.Dynamic]
    val detail = RealtimeProtocolEventDetail[String, SseConnection](
      data = "ready",
      source = source,
      url = "/events",
    ).asInstanceOf[js.Dynamic]
    assertEquals(message.selectDynamic("data").asInstanceOf[String], "fallback")
    assertEquals(message.selectDynamic("html").asInstanceOf[String], "<p>ready</p>")
    assertEquals(message.selectDynamic("target").asInstanceOf[String], "#status")
    assertEquals(message.selectDynamic("swap").asInstanceOf[String], "beforeend")
    assertEquals(detail.selectDynamic("data").asInstanceOf[String], "ready")
    assertEquals(detail.selectDynamic("source").asInstanceOf[SseConnection], source)
    assertEquals(detail.selectDynamic("url").asInstanceOf[String], "/events")
    assertEquals(SwapMode.Delete.value, "delete")

  test("websocket config builder emits protocols and protocol callback"):
    val callback =
      (_: RealtimeProtocolMessage, _: org.scalajs.dom.Event | org.scalajs.dom.MessageEvent) =>
        ()
    val config = WebSocketConfig(
      protocols = js.Array("chat"),
      onProtocolMessage = callback,
      connection = ConnectionConfig(heartbeatTimeout = 500.0),
    ).toJS.asInstanceOf[js.Dynamic]

    assertEquals(
      config.selectDynamic("protocols").asInstanceOf[js.Array[String]].toSeq,
      Seq("chat"),
    )
    assert(config.selectDynamic("onProtocolMessage").isInstanceOf[js.Function])
    assertEquals(config.selectDynamic("heartbeatTimeout").asInstanceOf[Double], 500.0)

  test("worker config builder emits lifecycle options"):
    val config = WorkerConfig(
      `type` = "classic",
      name = "decoder",
      credentials = "same-origin",
      restart = true,
      restartDelay = 250.0,
      maxRestarts = 4,
      decode = (value: js.Any) => value,
    ).toJS.asInstanceOf[js.Dynamic]

    assertEquals(config.selectDynamic("type").asInstanceOf[String], "classic")
    assertEquals(config.selectDynamic("name").asInstanceOf[String], "decoder")
    assertEquals(config.selectDynamic("credentials").asInstanceOf[String], "same-origin")
    assertEquals(config.selectDynamic("restart").asInstanceOf[Boolean], true)
    assertEquals(config.selectDynamic("restartDelay").asInstanceOf[Double], 250.0)
    assertEquals(config.selectDynamic("maxRestarts").asInstanceOf[Int], 4)
    assert(config.selectDynamic("decode").isInstanceOf[js.Function])

  test("stream option builders and service facade preserve runtime shapes"):
    val stream = js.Dynamic.literal(readable = true).asInstanceOf[ReadableByteStream]
    var chunk = ""
    var line = ""
    var valueLine = ""
    var parsedValue: js.Any = js.Dynamic.literal()
    var capturedTextOptions: js.Any = js.Dynamic.literal()
    var capturedLineOptions: js.Any = js.Dynamic.literal()
    var capturedJsonOptions: js.Any = js.Dynamic.literal()
    val textOptions = TextStreamReadOptions(
      encoding = "utf-8",
      onChunk = (next: String) => chunk = next,
    ).toJS.asInstanceOf[js.Dynamic]
    val lineOptions = LineStreamReadOptions(
      separator = "\n",
      onLine = (next: String) => line = next,
    ).toJS.asInstanceOf[js.Dynamic]
    val jsonOptions = JsonLineStreamReadOptions[js.Dynamic](
      ignoreEmpty = false,
      onValue = (value: js.Dynamic, source: String) =>
        parsedValue = value
        valueLine = source,
    ).toJS.asInstanceOf[js.Dynamic]
    val service = js.Dynamic
      .literal(
        isReadableStream = (_: js.Any) => true,
        consumeText = (_: ReadableByteStream, options: js.Object) =>
          capturedTextOptions = options
          js.Promise.resolve(()),
        readText = (_: ReadableByteStream, options: js.Object) =>
          capturedTextOptions = options
          js.Promise.resolve("hello"),
        readLines = (_: ReadableByteStream, options: js.Object) =>
          capturedLineOptions = options
          js.Promise.resolve(js.Array("a", "b")),
        consumeJsonLines = (_: ReadableByteStream, options: js.Object) =>
          capturedJsonOptions = options
          js.Promise.resolve(()),
        readJsonLines = (_: ReadableByteStream, options: js.Object) =>
          capturedJsonOptions = options
          js.Promise.resolve(js.Array(js.Dynamic.literal(id = 1))),
      )
      .asInstanceOf[StreamService]

    textOptions
      .selectDynamic("onChunk")
      .asInstanceOf[js.Function1[String, Unit]]("hello")
    lineOptions
      .selectDynamic("onLine")
      .asInstanceOf[js.Function1[String, Unit]]("first")
    jsonOptions
      .selectDynamic("onValue")
      .asInstanceOf[js.Function2[js.Dynamic, String, Unit]](
        js.Dynamic.literal(id = 1),
        """{"id":1}""",
      )

    assertEquals(chunk, "hello")
    assertEquals(line, "first")
    assertEquals(parsedValue.asInstanceOf[js.Dynamic].selectDynamic("id").asInstanceOf[Int], 1)
    assertEquals(valueLine, """{"id":1}""")
    assertEquals(service.isReadableStream(stream), true)
    service.consumeTextWithOptions(stream, TextStreamReadOptions(encoding = "utf-8"))
    service.readLinesWithOptions(stream, LineStreamReadOptions(separator = "\n"))
    service.readJsonLinesWithOptions[js.Dynamic](
      stream,
      JsonLineStreamReadOptions[js.Dynamic](ignoreEmpty = false),
    )
    assertEquals(
      capturedTextOptions.asInstanceOf[js.Dynamic].selectDynamic("encoding").asInstanceOf[String],
      "utf-8",
    )
    assertEquals(
      capturedLineOptions.asInstanceOf[js.Dynamic].selectDynamic("separator").asInstanceOf[String],
      "\n",
    )
    assertEquals(
      capturedJsonOptions.asInstanceOf[js.Dynamic].selectDynamic("ignoreEmpty").asInstanceOf[Boolean],
      false,
    )

  test("webtransport config builder emits transport and reconnect options"):
    val certValue = new js.typedarray.Uint8Array(1)
    val config = WebTransportConfig(
      allowPooling = true,
      congestionControl = WebTransportCongestionControl.LowLatency,
      requireUnreliable = false,
      serverCertificateHashes = js.Array(
        WebTransportCertificateHash(value = certValue),
      ),
      reconnect = true,
      retryDelay = 250.0,
      maxRetries = 4.0,
    ).toJS.asInstanceOf[js.Dynamic]

    assertEquals(config.selectDynamic("allowPooling").asInstanceOf[Boolean], true)
    assertEquals(config.selectDynamic("congestionControl").asInstanceOf[String], "low-latency")
    assertEquals(config.selectDynamic("requireUnreliable").asInstanceOf[Boolean], false)
    assertEquals(config.selectDynamic("reconnect").asInstanceOf[Boolean], true)
    assertEquals(config.selectDynamic("retryDelay").asInstanceOf[Double], 250.0)
    assertEquals(config.selectDynamic("maxRetries").asInstanceOf[Double], 4.0)
    assertEquals(
      config
        .selectDynamic("serverCertificateHashes")
        .asInstanceOf[js.Array[js.Dynamic]]
        .head
        .selectDynamic("algorithm")
        .asInstanceOf[String],
      "sha-256",
    )

  test("webtransport close info builder emits close object"):
    val closeInfo = WebTransportCloseInfo(
      closeCode = 1000,
      reason = "done",
    ).toJS.asInstanceOf[js.Dynamic]

    assertEquals(closeInfo.selectDynamic("closeCode").asInstanceOf[Int], 1000)
    assertEquals(closeInfo.selectDynamic("reason").asInstanceOf[String], "done")

  test("webtransport options and native transport facades expose browser session"):
    val certValue = new js.typedarray.Uint8Array(1)
    val options = WebTransportOptions(
      allowPooling = false,
      congestionControl = WebTransportCongestionControl.Throughput,
      requireUnreliable = true,
      serverCertificateHashes = js.Array(
        WebTransportCertificateHash(value = certValue),
      ),
    ).toJS.asInstanceOf[js.Dynamic]
    var nativeClosed = false
    val native = js.Dynamic
      .literal(
        ready = js.Promise.resolve(()),
        closed = js.Promise.resolve("closed"),
        datagrams = js.Dynamic.literal(
          readable = js.Dynamic.literal(),
          writable = js.Dynamic.literal(),
        ),
        close = () => nativeClosed = true,
        createBidirectionalStream = () => js.Promise.resolve(js.Dynamic.literal()),
        createUnidirectionalStream = () => js.Promise.resolve(js.Dynamic.literal()),
      )
      .asInstanceOf[NativeWebTransport]
    val connection = js.Dynamic
      .literal(
        ready = js.Promise.resolve(()),
        closed = js.Promise.resolve(()),
        transport = native,
      )
      .asInstanceOf[WebTransportConnection]

    assertEquals(options.selectDynamic("allowPooling").asInstanceOf[Boolean], false)
    assertEquals(options.selectDynamic("congestionControl").asInstanceOf[String], "throughput")
    assertEquals(options.selectDynamic("requireUnreliable").asInstanceOf[Boolean], true)
    assertEquals(
      options
        .selectDynamic("serverCertificateHashes")
        .asInstanceOf[js.Array[js.Dynamic]]
        .head
        .selectDynamic("value")
        .asInstanceOf[js.typedarray.Uint8Array],
      certValue,
    )
    assertEquals(connection.transport, native)
    native.close()
    assertEquals(nativeClosed, true)

  test("wasm option builders and ABI facades preserve runtime shapes"):
    val importsObject = js.Dynamic.literal(env = js.Dynamic.literal()).asInstanceOf[js.Object]
    val options = WasmLoadOptions("/game.wasm", importsObject).toJS.asInstanceOf[js.Dynamic]
    val resourceBindingOptions = WasmBindingOptions(
      name = "player",
      watch = js.Array("score", "health"),
      initial = true,
    ).toJS.asInstanceOf[js.Dynamic]
    val scopeOptions = WasmScopeOptions(name = "hud").toJS.asInstanceOf[js.Dynamic]
    val bindingOptions = WasmScopeBindingOptions(
      watch = js.Array("score", "health"),
      initial = true,
    ).toJS.asInstanceOf[js.Dynamic]
    val watchOptions = WasmScopeWatchOptions(initial = true).toJS.asInstanceOf[js.Dynamic]
    val update = WasmScopeUpdate(
      scopeHandle = 7,
      scopeName = "player",
      path = "score",
      value = 42,
    )
    val memoryBuffer = new js.typedarray.ArrayBuffer(8)
    val exports = js.Dynamic
      .literal(
        memory = js.Dynamic.literal(buffer = memoryBuffer),
        ng_abi_alloc = (_: Int) => 0,
        ng_abi_free = (_: Int, _: Int) => (),
      )
      .asInstanceOf[WasmAbiExports]
    assertEquals(options.selectDynamic("source").asInstanceOf[String], "/game.wasm")
    assertEquals(options.selectDynamic("imports").asInstanceOf[js.Object], importsObject)
    assertEquals(resourceBindingOptions.selectDynamic("name").asInstanceOf[String], "player")
    assertEquals(scopeOptions.selectDynamic("name").asInstanceOf[String], "hud")
    assertEquals(
      bindingOptions.selectDynamic("watch").asInstanceOf[js.Array[String]].toSeq,
      Seq("score", "health"),
    )
    assertEquals(bindingOptions.selectDynamic("initial").asInstanceOf[Boolean], true)
    assertEquals(watchOptions.selectDynamic("initial").asInstanceOf[Boolean], true)
    assertEquals(update.scopeHandle, 7)
    assertEquals(update.scopeName, "player")
    assertEquals(update.path, "score")
    assertEquals(update.value.asInstanceOf[Int], 42)
    assertEquals(exports.memory.buffer.byteLength, 8)

  test("wasm scope, ABI, and service facades expose typed helpers"):
    val angularScope = js.Dynamic
      .literal(
        $watch = (_: String, _: js.Function) => (() => ()).asInstanceOf[js.Function0[Unit]],
        $on = (_: String, _: js.Function) => (() => ()).asInstanceOf[js.Function0[Unit]],
        $destroy = () => (),
        $id = 1,
      )
      .asInstanceOf[Scope]
    var watchedPath = ""
    var boundWithOptions = false
    var serviceLoadOptions: js.Any = js.Dynamic.literal()
    var abiDisposed = false
    val imports = js.Dynamic
      .literal(
        angular_ts = js.Dynamic.literal(
          scope_resolve = (_: Int, _: Int) => 1,
          scope_get = (_: Int, _: Int, _: Int) => 2,
          scope_set = (_: Int, _: Int, _: Int, _: Int, _: Int) => 1,
          scope_delete = (_: Int, _: Int, _: Int) => 1,
          scope_sync = (_: Int) => 1,
          scope_watch = (_: Int, _: Int, _: Int) => 4,
          scope_unwatch = (_: Int) => 1,
          scope_unbind = (_: Int) => 1,
          buffer_ptr = (_: Int) => 8,
          buffer_len = (_: Int) => 13,
          buffer_free = (_: Int) => (),
        ),
      )
      .asInstanceOf[WasmScopeAbiImportObject]
    lazy val wasmScope: WasmScope = js.Dynamic
      .literal(
        handle = 1,
        name = "player",
        disposed = false,
        get = (_: String) => "value",
        set = (_: String, _: js.Any) => true,
        delete = (_: String) => true,
        sync = () => (),
        onSync = (_: js.Function0[Unit]) => (() => ()).asInstanceOf[js.Function0[Unit]],
        watch = (path: String, _: js.Function1[WasmScopeUpdate, Unit], _: js.Object) =>
          watchedPath = path
          (() => ()).asInstanceOf[js.Function0[Unit]],
        bind = (_: js.Object) =>
          boundWithOptions = true
          (() => ()).asInstanceOf[js.Function0[Unit]],
        dispose = () => (),
      )
      .asInstanceOf[WasmScope]
    lazy val abi: WasmScopeAbi = js.Dynamic
      .literal(
        imports = imports,
        attach = (_: WasmAbiExports) => (),
        createScope = (_: Scope, _: js.Object) => wasmScope,
        getScope = (_: js.Any) => wasmScope,
        disposed = false,
        dispose = () => abiDisposed = true,
      )
      .asInstanceOf[WasmScopeAbi]
    val binding = js.Dynamic
      .literal(
        name = "player",
        target = angularScope,
        disposed = false,
        dispose = () => (),
      )
      .asInstanceOf[WasmBinding]
    val resource = js.Dynamic
      .literal(
        source = "demo.wasm",
        status = "ready",
        ready = js.Promise.resolve[js.Any](js.Dynamic.literal()),
        instance = js.Dynamic.literal(),
        module = js.Dynamic.literal(),
        exports = js.Dynamic.literal(answer = 42),
        disposed = false,
        bind = (_: Scope, _: js.Object) => js.Promise.resolve(binding),
        dispose = () => (),
      )
      .asInstanceOf[WasmResource]
    val service = js.Dynamic
      .literal(
        load = (options: js.Object) =>
          serviceLoadOptions = options
          resource,
      )
      .asInstanceOf[WasmService]

    assertEquals(imports.angular_ts.scope_resolve(0, 0), 1)
    assertEquals(abi.disposed, false)
    assertEquals(abi.createScope(angularScope, WasmScopeOptions(name = "player")), wasmScope)
    assertEquals(abi.getScope(1).get, wasmScope)
    assertEquals(wasmScope.get("name").asInstanceOf[String], "value")
    assertEquals(wasmScope.set("name", "next"), true)
    wasmScope.watch(
      "score",
      (_: WasmScopeUpdate) => (),
      WasmScopeWatchOptions(initial = true),
    )
    wasmScope.bind(
      WasmScopeBindingOptions(watch = js.Array("score"), initial = true),
    )
    val loaded = service.load(WasmLoadOptions("demo.wasm"))
    loaded.bind(angularScope, WasmBindingOptions(name = "player"))
    abi.dispose()
    assertEquals(watchedPath, "score")
    assertEquals(boundWithOptions, true)
    assertEquals(abiDisposed, true)
    assertEquals(
      serviceLoadOptions.asInstanceOf[js.Dynamic].selectDynamic("source").asInstanceOf[String],
      "demo.wasm",
    )

  test("ng module wasm helper passes typed registration options"):
    var capturedName = ""
    var capturedOptions: js.Any = js.Dynamic.literal()
    val raw = js.Dynamic
      .literal(
        name = "demo",
        wasm = (name: String, options: js.Any) =>
          capturedName = name
          capturedOptions = options
          js.Dynamic.literal(),
      )
      .asInstanceOf[RuntimeNgModule]
    val module = NgModule(raw)
    val imports = js.Dynamic.literal(env = js.Dynamic.literal()).asInstanceOf[js.Object]
    val token = AngularTS.token[WasmResource]("gameWasm")

    assertEquals(
      module.wasm(token, WasmLoadOptions("/game.wasm", imports)),
      module,
    )
    assertEquals(capturedName, "gameWasm")
    assertEquals(
      capturedOptions.asInstanceOf[js.Dynamic].selectDynamic("source").asInstanceOf[String],
      "/game.wasm",
    )

  test("ng module animation helper registers presets and factories"):
    val registered = js.Array[js.Array[js.Any]]()
    val raw = js.Dynamic
      .literal(
        name = "demo",
        animation = (name: String, animationFactory: js.Any) =>
          registered.push(js.Array(name, animationFactory))
          js.Dynamic.literal(),
      )
      .asInstanceOf[RuntimeNgModule]
    val module = NgModule(raw)
    val preset = AnimationPreset(
      enter = js.Array(js.Dynamic.literal(opacity = 1).asInstanceOf[js.Object]),
    )
    val factory = AngularTS.inject0(() => preset)

    assertEquals(module.animation("fade", preset), module)
    assertEquals(module.animation("slide", factory), module)
    assertEquals(registered.length, 2)
    assertEquals(registered(0)(0).asInstanceOf[String], "fade")
    assertEquals(
      registered(0)(1).asInstanceOf[js.Dynamic].selectDynamic("enter").asInstanceOf[js.Array[js.Object]].length,
      1,
    )
    assertEquals(registered(1)(0).asInstanceOf[String], "slide")
    assertEquals(
      registered(1)(1).asInstanceOf[js.Dynamic].selectDynamic("$inject").asInstanceOf[js.Array[String]].length,
      0,
    )

  test("persistent store config builder emits storage options"):
    val backend = js.Dynamic
      .literal(
        getItem = (_: String) => null,
        setItem = (_: String, _: String) => (),
        removeItem = (_: String) => (),
      )
      .asInstanceOf[StorageLike]
    val config = PersistentStoreConfig(
      backend = backend,
      serialize = (value: js.Any) => js.JSON.stringify(value),
      deserialize = (value: String) => js.JSON.parse(value),
      cookie = js.Dynamic.literal(path = "/app").asInstanceOf[js.Object],
    ).toJS.asInstanceOf[js.Dynamic]

    assert(config.selectDynamic("backend").isInstanceOf[js.Object])
    assert(config.selectDynamic("serialize").isInstanceOf[js.Function])
    assert(config.selectDynamic("deserialize").isInstanceOf[js.Function])
    assertEquals(
      config.selectDynamic("cookie").selectDynamic("path").asInstanceOf[String],
      "/app",
    )
    assertEquals(StorageType.Local.value, "local")
    assertEquals(StorageType.Custom.value, "custom")

  test("storage backend facade and small config builders preserve runtime shapes"):
    var stored = ""
    var removed = ""
    val backend = js.Dynamic
      .literal(
        get = (key: String) => s"value:$key",
        set = (_: String, value: String) => stored = value,
        remove = (key: String) => removed = key,
      )
      .asInstanceOf[StorageBackend]
    val errorConfig = ErrorHandlingConfig(objectMaxDepth = 3).toJS.asInstanceOf[js.Dynamic]
    val htmlCanvas = HtmlCanvasConfig(
      enabled = false,
      throwOnUnsupported = true,
      defaultScheduler = HtmlCanvasScheduler.Paint,
      defaultMode = HtmlCanvasMode.TwoD,
      requireFlag = true,
    ).toJS.asInstanceOf[js.Dynamic]

    assertEquals(backend.get("item").get, "value:item")
    backend.set("item", "stored")
    backend.remove("item")
    assertEquals(stored, "stored")
    assertEquals(removed, "item")
    assertEquals(errorConfig.selectDynamic("objectMaxDepth").asInstanceOf[Double], 3.0)
    assertEquals(htmlCanvas.selectDynamic("enabled").asInstanceOf[Boolean], false)
    assertEquals(
      htmlCanvas.selectDynamic("defaultScheduler").asInstanceOf[String],
      "paint",
    )
    assertEquals(htmlCanvas.selectDynamic("defaultMode").asInstanceOf[String], "2d")

  test("policy decision builder emits generic policy result"):
    val decision = PolicyDecision(
      "custom",
      reason = "matched",
      status = 202,
      target = "next",
      meta = js.Dictionary[js.Any]("source" -> "scala"),
    ).asInstanceOf[js.Dynamic]

    assertEquals(decision.selectDynamic("type").asInstanceOf[String], "custom")
    assertEquals(decision.selectDynamic("reason").asInstanceOf[String], "matched")
    assertEquals(decision.selectDynamic("status").asInstanceOf[Int], 202)
    assertEquals(decision.selectDynamic("target").asInstanceOf[String], "next")
    assertEquals(
      decision.selectDynamic("meta").selectDynamic("source").asInstanceOf[String],
      "scala",
    )

  test("rest cache policy and options builders emit runtime objects"):
    val network = js.Dynamic
      .literal(
        request = (_: RestRequest) =>
          js.Promise.resolve(
            js.Dynamic.literal(data = js.Array()).asInstanceOf[RestResponse[js.Any]],
          ),
      )
      .asInstanceOf[RestBackend]
    val cache = js.Dynamic
      .literal(
        get = (_: String) => js.Promise.resolve(()),
        set = (_: String, _: RestResponse[js.Any]) => js.Promise.resolve(()),
        delete = (_: String) => js.Promise.resolve(()),
        deletePrefix = (_: String) => js.Promise.resolve(()),
      )
      .asInstanceOf[RestCacheStore]
    val policy: RestCachePolicy = (_: RestCachePolicyContext) =>
      RestCacheStrategy.StaleWhileRevalidate.value
    val cached = CachedRestBackendOptions(
      network = network,
      cache = cache,
      strategy = RestCacheStrategy.CacheFirst,
      policy = policy,
      onRevalidate = (_: RestRevalidateEvent[js.Any]) => (),
    ).toJS.asInstanceOf[js.Dynamic]
    val options = RestOptions(
      backend = network,
      extra = js.Dictionary[js.Any]("timeout" -> 5000),
    ).toJS.asInstanceOf[js.Dynamic]
    val config = RestConfig(defaults = RestOptions(extra = js.Dictionary("mode" -> "cors")))
      .toJS
      .asInstanceOf[js.Dynamic]
    assert(cached.selectDynamic("network").isInstanceOf[js.Object])
    assert(cached.selectDynamic("cache").isInstanceOf[js.Object])
    assertEquals(cached.selectDynamic("strategy").asInstanceOf[String], "cache-first")
    assert(cached.selectDynamic("policy").isInstanceOf[js.Function])
    assert(cached.selectDynamic("onRevalidate").isInstanceOf[js.Function])
    assert(options.selectDynamic("backend").isInstanceOf[js.Object])
    assertEquals(options.selectDynamic("timeout").asInstanceOf[Int], 5000)
    assertEquals(
      config.selectDynamic("defaults").selectDynamic("mode").asInstanceOf[String],
      "cors",
    )
  test("rest factory extension passes typed options"):
    var capturedBaseUrl = ""
    var capturedOptions: js.UndefOr[js.Object] = js.undefined
    val rawFactory: js.Function3[
      String,
      EntityClass[js.Object],
      js.Object,
      RestService[js.Object, String],
    ] = (baseUrl: String, _: EntityClass[js.Object], options: js.Object) =>
      capturedBaseUrl = baseUrl
      capturedOptions = options
      js.Dynamic.literal().asInstanceOf[RestService[js.Object, String]]
    val factory = rawFactory.asInstanceOf[RestFactory]

    val entityClass = js.Dynamic.global.Object.asInstanceOf[EntityClass[js.Object]]
    factory.resource[js.Object, String](
      "/api/users",
      entityClass,
      RestOptions(extra = js.Dictionary[js.Any]("cache" -> true)),
    )

    assertEquals(capturedBaseUrl, "/api/users")
    assertEquals(
      capturedOptions
        .get
        .asInstanceOf[js.Dynamic]
        .selectDynamic("cache")
        .asInstanceOf[Boolean],
      true,
    )

  test("app model tokens and lifecycle builders emit sync options"):
    final class PlayerModel(var x: Double, var y: Double) extends js.Object

    val token = AngularTS.token[Model[PlayerModel]]("player")
    val restoreOptions = ModelRestoreOptions(
      origin = "socket",
      mode = ModelRestoreMode.Merge,
    ).toJS.asInstanceOf[js.Dynamic]
    val syncOptions = ModelSyncOptions(
      failure = ModelSyncFailurePolicy.Throw,
    ).toJS.asInstanceOf[js.Dynamic]
    val target = ModelSyncTarget[PlayerModel](
      restore = () => new PlayerModel(1.0, 2.0),
      write = (snapshot: PlayerModel, _: ModelChange) => snapshot.x,
      receive = (_: ModelApply[PlayerModel]) => js.undefined,
      dispose = () => (),
    ).toJS.asInstanceOf[js.Dynamic]

    assertEquals(token.name, "player")
    assertEquals(restoreOptions.selectDynamic("origin").asInstanceOf[String], "socket")
    assertEquals(restoreOptions.selectDynamic("mode").asInstanceOf[String], "merge")
    assertEquals(syncOptions.selectDynamic("failure").asInstanceOf[String], "throw")
    assert(target.selectDynamic("restore").isInstanceOf[js.Function])
    assert(target.selectDynamic("write").isInstanceOf[js.Function])
    assert(target.selectDynamic("receive").isInstanceOf[js.Function])
    assert(target.selectDynamic("dispose").isInstanceOf[js.Function])

  test("app model lifecycle extension passes typed sync target to runtime method"):
    final class PlayerModel(var score: Int) extends js.Object

    var capturedTarget: js.UndefOr[js.Object] = js.undefined
    var capturedOptions: js.UndefOr[js.Object] = js.undefined
    val runtimeModel = js.Dynamic.literal()
    val model = runtimeModel.asInstanceOf[ModelLifecycle[PlayerModel]]
    var disposed = false
    runtimeModel.updateDynamic("$sync") {
      (target: js.Object, options: js.Object) =>
        capturedTarget = target
        capturedOptions = options
        val disposer: js.Function0[Unit] = () => disposed = true
        disposer
    }
    val dispose = model.sync(
      ModelSyncTarget[PlayerModel](
        restore = () => new PlayerModel(10),
      ),
      ModelSyncOptions(failure = ModelSyncFailurePolicy.Ignore),
    )

    dispose()
    assert(disposed)
    assert(capturedTarget.isDefined)
    assert(capturedOptions.isDefined)
    assert(
      capturedTarget
        .get
        .asInstanceOf[js.Dynamic]
        .selectDynamic("restore")
        .isInstanceOf[js.Function],
    )
    assertEquals(
      capturedOptions
        .get
        .asInstanceOf[js.Dynamic]
        .selectDynamic("failure")
        .asInstanceOf[String],
      "ignore",
    )

  test("machine config builders emit state-tree transitions, guards, and hooks"):
    final class PlayerData(var status: String, var count: Int) extends js.Object
    type NoEvents = MachineNoEvents

    val update: MachineEventTransitionUpdate[PlayerData, NoEvents] =
      (context: MachineEventTransitionContext[PlayerData, NoEvents, js.Any]) =>
        context.data.count += 1
    val guard: MachineEventTransitionGuard[PlayerData, NoEvents] =
      (_: MachineEventTransitionContext[PlayerData, NoEvents, js.Any]) => true
    val hook: MachineEventTransitionHook[PlayerData, NoEvents] =
      (context: MachineEventTransitionContext[PlayerData, NoEvents, js.Any]) =>
        context.data.status = context.to.getOrElse("")
    val states: MachineStateMap[PlayerData, NoEvents] = js.Dictionary(
      "idle" -> MachineStateDefinition[PlayerData, NoEvents](
        on = js.Dictionary(
          "start" -> MachineEventTransitionConfig[PlayerData, js.Any, NoEvents](
            to = "ready",
            guard = guard,
            update = update,
          ),
        ),
      ),
      "ready" -> MachineStateDefinition[PlayerData, NoEvents](),
    )
    val config = MachineStateConfig[PlayerData, NoEvents](
      initial = "idle",
      data = new PlayerData("idle", 0),
      states = states,
      hooks = MachineHooks[PlayerData, NoEvents](
        enter = js.Dictionary("ready" -> hook),
        transition = hook,
      ),
    ).toJS.asInstanceOf[js.Dynamic]

    assertEquals(config.selectDynamic("initial").asInstanceOf[String], "idle")
    assertEquals(
      config.selectDynamic("data").selectDynamic("status").asInstanceOf[String],
      "idle",
    )
    assert(
      config
        .selectDynamic("states")
        .selectDynamic("idle")
        .selectDynamic("on")
        .selectDynamic("start")
        .selectDynamic("update")
        .isInstanceOf[js.Function],
    )
    assert(
      config
        .selectDynamic("states")
        .selectDynamic("idle")
        .selectDynamic("on")
        .selectDynamic("start")
        .selectDynamic("guard")
        .isInstanceOf[js.Function],
    )
    assert(
      config
        .selectDynamic("hooks")
        .selectDynamic("enter")
        .selectDynamic("ready")
        .isInstanceOf[js.Function],
    )
    assert(config.selectDynamic("hooks").selectDynamic("transition").isInstanceOf[js.Function])

  test("machine service facade and module helper pass typed machine config"):
    final class PlayerData(var status: String) extends js.Object
    type NoEvents = MachineNoEvents

    val token = AngularTS.token[Machine[PlayerData, NoEvents]]("playerMachine")
    val config =
      MachineStateConfig[PlayerData, NoEvents](
        initial = "idle",
        data = new PlayerData("idle"),
        states = js.Dictionary(
          "idle" -> MachineStateDefinition[PlayerData, NoEvents](
            on = js.Dictionary(
              "start" -> MachineEventTransitionConfig[PlayerData, js.Any, NoEvents](
                to = "ready",
              ),
            ),
          ),
          "ready" -> MachineStateDefinition[PlayerData, NoEvents](),
        ),
      )
    val machine = js.Dynamic
      .literal(
        current = "idle",
        data = new PlayerData("idle"),
        send = ((_: String, _: js.UndefOr[js.Any]) => true)
          .asInstanceOf[js.Function2[String, js.UndefOr[js.Any], Boolean]],
        can = ((_: String, _: js.UndefOr[js.Any]) => true)
          .asInstanceOf[js.Function2[String, js.UndefOr[js.Any], Boolean]],
        matches = ((mode: String) => mode == "idle")
          .asInstanceOf[js.Function1[String, Boolean]],
        snapshot = (() => MachineSnapshot("idle", new PlayerData("idle")))
          .asInstanceOf[js.Function0[MachineSnapshot[PlayerData]]],
        restore = ((_: MachineSnapshot[PlayerData]) => ())
          .asInstanceOf[js.Function1[MachineSnapshot[PlayerData], Unit]],
      )
      .asInstanceOf[Machine[PlayerData, NoEvents]]
    var capturedServiceConfig: js.UndefOr[js.Dynamic] = js.undefined
    val runtimeService: js.Function1[js.Object, Machine[PlayerData, NoEvents]] =
      (machineConfig: js.Object) =>
        capturedServiceConfig = machineConfig.asInstanceOf[js.Dynamic]
        machine
    val service = runtimeService.asInstanceOf[MachineService]
    var capturedModuleName = ""
    var capturedModuleConfig: js.UndefOr[js.Dynamic] = js.undefined
    val rawModuleObject = js.Dynamic.literal(name = "game")
    val registerMachine: js.Function2[String, js.Any, RuntimeNgModule] =
      (name: String, machineConfig: js.Any) =>
        capturedModuleName = name
        capturedModuleConfig = machineConfig.asInstanceOf[js.Dynamic]
        rawModuleObject.asInstanceOf[RuntimeNgModule]
    rawModuleObject.updateDynamic("machine")(registerMachine)
    val rawModule = rawModuleObject.asInstanceOf[RuntimeNgModule]

    val created = service.create(config)
    NgModule(rawModule).machine(token, config)

    assertEquals(created.asInstanceOf[js.Dynamic], machine.asInstanceOf[js.Dynamic])
    assertEquals(
      capturedServiceConfig.get.selectDynamic("initial").asInstanceOf[String],
      "idle",
    )
    assertEquals(capturedModuleName, "playerMachine")
    assertEquals(
      capturedModuleConfig.get.selectDynamic("initial").asInstanceOf[String],
      "idle",
    )

  test("workflow config builders emit commands, diagnostics, and options"):
    final class PlayerData(var status: String) extends js.Object
    type NoCommands = WorkflowNoCommands

    val diagnostic = WorkflowDiagnostic(
      code = "workflow.timeout",
      message = "Timed out",
      recoverable = true,
      command = "load",
    )
    val command = WorkflowCommandDefinition[String, Int, PlayerData](
      from = "idle",
      pending = "loading",
      execute = (context: WorkflowCommandContext[String, PlayerData]) => context.input.length,
      success = WorkflowLifecycleTarget(
        "complete",
        (context: WorkflowSuccessContext[String, Int, PlayerData]) =>
          context.data.status = s"loaded:${context.output}",
      ),
      failure = "failed",
      concurrency = WorkflowConcurrencyPolicy.Queue,
      commandTimeout = 250,
    )
    val config = AngularTS
      .defineWorkflow(
        WorkflowConfig[PlayerData, NoCommands](
          id = "player",
          initial = "idle",
          data = new PlayerData("idle"),
          commands = WorkflowCommandMap("load" -> command),
          diagnosticLimit = 5,
          historyLimit = 10,
        ),
      )
      .toJS
      .asInstanceOf[js.Dynamic]
    val snapshot = WorkflowSnapshot(
      id = "player",
      state = "idle",
      data = new PlayerData("idle"),
      diagnostics = js.Array(diagnostic),
      history = js.Array(
        WorkflowHistoryEntry(
          id = 1,
          `type` = "command.failed",
          command = "load",
          diagnostics = js.Array(diagnostic),
        ),
      ),
    )

    assertEquals(config.selectDynamic("id").asInstanceOf[String], "player")
    val emittedCommand = config.selectDynamic("commands").selectDynamic("load")
    assertEquals(emittedCommand.selectDynamic("pending").asInstanceOf[String], "loading")
    assertEquals(emittedCommand.selectDynamic("concurrency").asInstanceOf[String], "queue")
    assertEquals(emittedCommand.selectDynamic("commandTimeout").asInstanceOf[Double], 250.0)
    assert(emittedCommand.selectDynamic("execute").isInstanceOf[js.Function])
    assertEquals(snapshot.version, 1)
    assertEquals(snapshot.history.head.command, "load")

  test("workflow service facade and module helper pass typed workflow config"):
    final class PlayerData(var status: String) extends js.Object
    type NoCommands = WorkflowNoCommands

    val token = AngularTS.token[Workflow[PlayerData, NoCommands]]("playerWorkflow")
    val config = WorkflowConfig[PlayerData, NoCommands](
      id = "player",
      initial = "idle",
      data = new PlayerData("idle"),
      commands = WorkflowCommandMap(),
    )
    val workflow = js.Dynamic
      .literal(
        id = "player",
        state = "idle",
        data = new PlayerData("idle"),
        diagnostics = js.Array[WorkflowDiagnostic](),
        history = js.Array[WorkflowHistoryEntry](),
        can = ((_: String) => true).asInstanceOf[js.Function1[String, Boolean]],
        run = ((_: String, _: js.UndefOr[js.Any]) =>
          js.Promise.resolve(
            js.Dynamic.literal(ok = true, status = "completed", output = js.undefined),
          ))
          .asInstanceOf[
            js.Function2[
              String,
              js.UndefOr[js.Any],
              js.Promise[WorkflowResult[js.Any]],
            ],
          ],
        cancel = ((_: js.UndefOr[String]) => 0)
          .asInstanceOf[js.Function1[js.UndefOr[String], Int]],
        snapshot = (() => WorkflowSnapshot("player", "idle", new PlayerData("idle")))
          .asInstanceOf[js.Function0[WorkflowSnapshot[PlayerData]]],
        restore = ((_: js.Any) => ()).asInstanceOf[js.Function1[js.Any, Unit]],
      )
      .asInstanceOf[Workflow[PlayerData, NoCommands]]
    var capturedServiceConfig: js.UndefOr[js.Dynamic] = js.undefined
    val runtimeService: js.Function1[
      js.Object,
      Workflow[PlayerData, NoCommands],
    ] =
      (workflowConfig: js.Object) =>
        capturedServiceConfig = workflowConfig.asInstanceOf[js.Dynamic]
        workflow
    val service = runtimeService.asInstanceOf[WorkflowService]
    var capturedModuleName = ""
    var capturedModuleConfig: js.UndefOr[js.Dynamic] = js.undefined
    val rawModuleObject = js.Dynamic.literal(name = "workflow")
    val registerWorkflow: js.Function2[String, js.Any, RuntimeNgModule] =
      (name: String, workflowConfig: js.Any) =>
        capturedModuleName = name
        capturedModuleConfig = workflowConfig.asInstanceOf[js.Dynamic]
        rawModuleObject.asInstanceOf[RuntimeNgModule]
    rawModuleObject.updateDynamic("workflow")(registerWorkflow)
    val rawModule = rawModuleObject.asInstanceOf[RuntimeNgModule]

    val created = service.create(config)
    NgModule(rawModule).workflow(token, config)

    assertEquals(created.asInstanceOf[js.Dynamic], workflow.asInstanceOf[js.Dynamic])
    assertEquals(capturedServiceConfig.get.selectDynamic("id").asInstanceOf[String], "player")
    assertEquals(capturedModuleName, "playerWorkflow")
    assertEquals(capturedModuleConfig.get.selectDynamic("id").asInstanceOf[String], "player")

  test("workflow supervisor builders emit persistence, recovery, and snapshots"):
    final class PlayerData(var status: String) extends js.Object
    type NoCommands = WorkflowNoCommands

    val workflowConfig = WorkflowConfig[PlayerData, NoCommands](
      id = "player",
      initial = "idle",
      data = new PlayerData("idle"),
      commands = WorkflowCommandMap(),
    )
    val workflows = js.Dictionary[js.Any]("player" -> workflowConfig.toJS)
    val workflowSnapshot =
      WorkflowSnapshot("player", "idle", new PlayerData("idle").asInstanceOf[js.Object])
    val supervisorDiagnostic = WorkflowSupervisorDiagnostic(
      code = "workflowSupervisor.persistenceSaveFailed",
      message = "Save failed",
      recoverable = true,
      workflow = "player",
    )
    val supervisorSnapshot = WorkflowSupervisorSnapshot(
      id = "session",
      status = WorkflowSupervisorStatus.Idle,
      workflows = js.Dictionary("player" -> workflowSnapshot).asInstanceOf[js.Object],
      diagnostics = js.Array(supervisorDiagnostic),
      updatedAt = 42,
    )
    val persistence = js.Dynamic
      .literal(
        load = ((_: String) => js.Promise.resolve(js.defined(supervisorSnapshot)))
          .asInstanceOf[
            js.Function1[
              String,
              js.Promise[js.UndefOr[WorkflowSupervisorSnapshot[js.Object]]],
            ],
          ],
        save = ((_: String, _: WorkflowSupervisorSnapshot[js.Object]) =>
          js.Promise.resolve(()))
          .asInstanceOf[
            js.Function2[String, WorkflowSupervisorSnapshot[js.Object], js.Promise[Unit]],
          ],
      )
      .asInstanceOf[WorkflowSupervisorPersistence[WorkflowSupervisorSnapshot[js.Object]]]
    val config = WorkflowSupervisorConfig(
      id = "session",
      workflows = workflows.asInstanceOf[js.Object],
      persistence = persistence,
      autoPersist = true,
      autoRecover = true,
    ).toJS.asInstanceOf[js.Dynamic]
    val idbConfig = WorkflowSupervisorPersistenceConfig(
      database = "app-workflows",
      store = "snapshots",
      version = 2,
      indexedDB = js.Dynamic.literal(),
    ).toJS.asInstanceOf[js.Dynamic]

    assertEquals(idbConfig.selectDynamic("type").asInstanceOf[String], "indexeddb")
    assertEquals(config.selectDynamic("id").asInstanceOf[String], "session")
    assertEquals(
      config.selectDynamic("autoPersist").asInstanceOf[Boolean],
      true,
    )
    assertEquals(
      config.selectDynamic("autoRecover").asInstanceOf[Boolean],
      true,
    )
    assert(config.selectDynamic("persistence").isInstanceOf[js.Object])
    assertEquals(idbConfig.selectDynamic("database").asInstanceOf[String], "app-workflows")
    assertEquals(idbConfig.selectDynamic("store").asInstanceOf[String], "snapshots")
    assertEquals(idbConfig.selectDynamic("version").asInstanceOf[Int], 2)
    assertEquals(supervisorSnapshot.version, 1)
    assertEquals(supervisorSnapshot.status, "idle")
    assertEquals(supervisorSnapshot.diagnostics.head.workflow.get, "player")

  test("workflow supervisor module helper passes typed supervisor config"):
    val token = AngularTS.token[WorkflowSupervisor[js.Object]]("sessionSupervisor")
    val config = WorkflowSupervisorConfig(
      id = "session",
      workflows = js.Dictionary[js.Any](
        "player" -> js.Dynamic.literal(id = "player"),
      ).asInstanceOf[js.Object],
      autoPersist = false,
    )
    var capturedModuleName = ""
    var capturedModuleConfig: js.UndefOr[js.Dynamic] = js.undefined
    val rawModuleObject = js.Dynamic.literal(name = "supervisor")
    val registerSupervisor: js.Function2[String, js.Any, RuntimeNgModule] =
      (name: String, supervisorConfig: js.Any) =>
        capturedModuleName = name
        capturedModuleConfig = supervisorConfig.asInstanceOf[js.Dynamic]
        rawModuleObject.asInstanceOf[RuntimeNgModule]
    rawModuleObject.updateDynamic("workflowSupervisor")(registerSupervisor)
    val rawModule = rawModuleObject.asInstanceOf[RuntimeNgModule]

    NgModule(rawModule).workflowSupervisor(token, config)

    assertEquals(capturedModuleName, "sessionSupervisor")
    assertEquals(capturedModuleConfig.get.selectDynamic("id").asInstanceOf[String], "session")
    assertEquals(
      capturedModuleConfig.get.selectDynamic("autoPersist").asInstanceOf[Boolean],
      false,
    )

  test("workflow worker protocol builders preserve runtime message shapes"):
    val workflowSnapshot =
      WorkflowSnapshot("player", "idle", js.Dynamic.literal().asInstanceOf[js.Object])
    val request = WorkflowWorkerRequest(
      id = "1",
      operation = WorkflowWorkerRequestOperation.Run,
      workflow = "player",
      command = "load",
      input = js.Dynamic.literal(id = 1),
    )
    val response = WorkflowWorkerResponse(
      id = "1",
      ok = true,
      result = js
        .Dynamic
        .literal(ok = true, status = "completed", output = "loaded")
        .asInstanceOf[WorkflowResult[String]],
    )
    val snapshotMessage = WorkflowWorkerSnapshotMessage(
      js.Dictionary("player" -> workflowSnapshot),
    )
    val hostConfig = WorkflowWorkerHostConfig(
      workflows = js.Dictionary[js.Any]("player" -> js.Dynamic.literal()).asInstanceOf[js.Object],
      publishSnapshots = true,
    ).toJS.asInstanceOf[js.Dynamic]
    val client = js.Dynamic
      .literal(
        latestSnapshot = js.Dictionary("player" -> workflowSnapshot),
        run = ((_: String, _: String, _: js.UndefOr[js.Any]) =>
          js.Promise.resolve(
            js
              .Dynamic
              .literal(ok = true, status = "completed", output = "loaded")
              .asInstanceOf[WorkflowResult[String]],
          ))
          .asInstanceOf[
            js.Function3[
              String,
              String,
              js.UndefOr[js.Any],
              js.Promise[WorkflowResult[String]],
            ],
          ],
        snapshot = (() => js.Promise.resolve(js.Dictionary("player" -> workflowSnapshot)))
          .asInstanceOf[js.Function0[js.Promise[js.Dictionary[WorkflowSnapshot[js.Object]]]]],
        restore = ((_: js.Any) =>
          js.Promise.resolve(js.Dictionary("player" -> workflowSnapshot)))
          .asInstanceOf[
            js.Function1[js.Any, js.Promise[js.Dictionary[WorkflowSnapshot[js.Object]]]],
          ],
        onSnapshot = ((_: js.Function1[js.Dictionary[WorkflowSnapshot[js.Object]], Unit]) =>
          (() => ()).asInstanceOf[js.Function0[Unit]])
          .asInstanceOf[
            js.Function1[
              js.Function1[js.Dictionary[WorkflowSnapshot[js.Object]], Unit],
              js.Function0[Unit],
            ],
          ],
        dispose = (() => ()).asInstanceOf[js.Function0[Unit]],
      )
      .asInstanceOf[WorkflowWorkerClient]

    assertEquals(request.`type`, "angular-ts:workflow-worker:request")
    assertEquals(request.operation, "run")
    assertEquals(request.workflow.get, "player")
    assertEquals(response.`type`, "angular-ts:workflow-worker:response")
    assertEquals(response.result.get.ok, true)
    assertEquals(snapshotMessage.`type`, "angular-ts:workflow-worker:snapshot")
    assertEquals(snapshotMessage.snapshot("player").id, "player")
    assertEquals(hostConfig.selectDynamic("publishSnapshots").asInstanceOf[Boolean], true)
    assertEquals(client.latestSnapshot.get("player").id, "player")

  test("service worker config builder emits registration options"):
    val config = ServiceWorkerConfig(
      scope = "/app/",
      `type` = ServiceWorkerWorkerType.Module,
      updateViaCache = ServiceWorkerUpdateViaCache.None,
      autoRegister = true,
      checkForUpdatesOnRegister = true,
    ).toJS.asInstanceOf[js.Dynamic]

    assertEquals(config.selectDynamic("scope").asInstanceOf[String], "/app/")
    assertEquals(config.selectDynamic("type").asInstanceOf[String], "module")
    assertEquals(config.selectDynamic("updateViaCache").asInstanceOf[String], "none")
    assertEquals(config.selectDynamic("autoRegister").asInstanceOf[Boolean], true)
    assertEquals(
      config.selectDynamic("checkForUpdatesOnRegister").asInstanceOf[Boolean],
      true,
    )

  test("service worker request options map to the direct request contract"):
    import ServiceWorkerService.*

    val request = ServiceWorkerRequestOptions(
      transfer = js.Array(),
      timeout = 1000.0,
      target = ServiceWorkerMessageTarget.Active,
    ).toJS.asInstanceOf[js.Dynamic]
    var capturedTarget = ""
    val runtimeService = js.Dynamic.literal()
    val requestFn: js.Function2[js.Any, js.Object, js.Promise[String]] =
      (_: js.Any, options: js.Object) =>
        capturedTarget = options
          .asInstanceOf[js.Dynamic]
          .selectDynamic("target")
          .asInstanceOf[String]
        js.Promise.resolve("accepted")
    runtimeService.updateDynamic("request")(requestFn)
    val service = runtimeService.asInstanceOf[ServiceWorkerService]

    assert(request.selectDynamic("transfer").isInstanceOf[js.Array[js.Any]])
    assertEquals(request.selectDynamic("timeout").asInstanceOf[Double], 1000.0)
    assertEquals(request.selectDynamic("target").asInstanceOf[String], "active")
    service.requestWithOptions[String](js.Dynamic.literal(), ServiceWorkerRequestOptions(
      target = ServiceWorkerMessageTarget.Waiting,
    ))
    assertEquals(capturedTarget, "waiting")

  test("service worker errors preserve stable operation details"):
    val error = js.Dynamic
      .literal(
        name = "ServiceWorkerError",
        message = "timed out",
        code = ServiceWorkerErrorCode.RequestTimeout.value,
        detail = js.Dynamic.literal(operation = "request"),
      )
      .asInstanceOf[ServiceWorkerError]

    assertEquals(error.name, "ServiceWorkerError")
    assertEquals(error.message, "timed out")
    assertEquals(error.code, "request-timeout")
    assertEquals(
      error.detail.get.asInstanceOf[js.Dynamic].selectDynamic("operation").asInstanceOf[String],
      "request",
    )

  test("aria, interpolate, and sce config builders emit runtime objects"):
    val aria = AriaConfig(
      ariaHidden = false,
      ariaInvalid = true,
      bindKeydown = false,
    ).toJS.asInstanceOf[js.Dynamic]
    val interpolate = InterpolateConfig(
      startSymbol = "[[",
      endSymbol = "]]",
    ).toJS.asInstanceOf[js.Dynamic]
    val sce = SceConfig(enabled = true).toJS.asInstanceOf[js.Dynamic]
    val sceDelegate = SceDelegateConfig(
      trustedResourceUrlList = js.Array("self"),
      bannedResourceUrlList = js.Array(js.RegExp("^http://")),
      aHrefSanitizationTrustedUrlList = js.RegExp("^https?:"),
      imgSrcSanitizationTrustedUrlList = js.RegExp("^https?:"),
    ).toJS.asInstanceOf[js.Dynamic]

    assertEquals(aria.selectDynamic("ariaHidden").asInstanceOf[Boolean], false)
    assertEquals(aria.selectDynamic("ariaInvalid").asInstanceOf[Boolean], true)
    assertEquals(aria.selectDynamic("bindKeydown").asInstanceOf[Boolean], false)
    assertEquals(interpolate.selectDynamic("startSymbol").asInstanceOf[String], "[[")
    assertEquals(interpolate.selectDynamic("endSymbol").asInstanceOf[String], "]]")
    assertEquals(sce.selectDynamic("enabled").asInstanceOf[Boolean], true)
    assertEquals(
      sceDelegate
        .selectDynamic("trustedResourceUrlList")
        .asInstanceOf[js.Array[SceResourceUrlMatcher]]
        .head
        .asInstanceOf[String],
      "self",
    )
    assert(
      sceDelegate
        .selectDynamic("bannedResourceUrlList")
        .asInstanceOf[js.Array[SceResourceUrlMatcher]]
        .head
        .isInstanceOf[js.RegExp],
    )
    assert(sceDelegate.selectDynamic("aHrefSanitizationTrustedUrlList").isInstanceOf[js.RegExp])
    assert(sceDelegate.selectDynamic("imgSrcSanitizationTrustedUrlList").isInstanceOf[js.RegExp])
    assertEquals(SceContexts.Html, "html")
    assertEquals(SceContexts.ResourceUrl, "resourceUrl")

  test("security config builder emits credentials and permissions"):
    val config = SecurityConfig(
      fallback = SecurityFallbackDecision.Deny,
      allowInsecureOrigins = js.Array("http://localhost:8080"),
      credentials = SecurityCredentialsConfig(
        bearer = () => "token",
        basic = SecurityBasicCredentials("user", "password"),
        cookie = true,
        order = js.Array("bearer", "cookie"),
      ),
      isAuthenticated = true,
      permissions = js.Array("admin.read"),
    ).toJS.asInstanceOf[js.Dynamic]

    assertEquals(config.selectDynamic("fallback").asInstanceOf[String], "deny")
    assertEquals(
      config.selectDynamic("allowInsecureOrigins").asInstanceOf[js.Array[String]].toSeq,
      Seq("http://localhost:8080"),
    )
    assert(config.selectDynamic("credentials").selectDynamic("bearer").isInstanceOf[js.Function])
    assertEquals(
      config
        .selectDynamic("credentials")
        .selectDynamic("basic")
        .selectDynamic("username")
        .asInstanceOf[String],
      "user",
    )
    assertEquals(config.selectDynamic("isAuthenticated").asInstanceOf[Boolean], true)
    assertEquals(
      config
        .selectDynamic("credentials")
        .selectDynamic("cookie")
        .asInstanceOf[Boolean],
      true,
    )
    assertEquals(
      config
        .selectDynamic("credentials")
        .selectDynamic("order")
        .asInstanceOf[js.Array[String]]
        .toSeq,
      Seq("bearer", "cookie"),
    )
    assertEquals(
      config.selectDynamic("permissions").asInstanceOf[js.Array[String]].toSeq,
      Seq("admin.read"),
    )

  test("angular config builder emits security config under injectable name"):
    val config = AngularConfig(
      security = SecurityConfig(
        fallback = SecurityFallbackDecision.Allow,
      ),
    ).toJS.asInstanceOf[js.Dynamic]

    assertEquals(
      config
        .selectDynamic("$security")
        .selectDynamic("fallback")
        .asInstanceOf[String],
      "allow",
    )

  test("angular config builder emits core service configs under injectable names"):
    val config = AngularConfig(
      aria = AriaConfig(tabindex = false),
      htmlCanvas = HtmlCanvasConfig(enabled = false),
      interpolate = InterpolateConfig(startSymbol = "[[", endSymbol = "]]"),
      sce = SceConfig(enabled = false),
      sceDelegate = SceDelegateConfig(trustedResourceUrlList = js.Array("self")),
    ).toJS.asInstanceOf[js.Dynamic]

    assertEquals(
      config.selectDynamic("$aria").selectDynamic("tabindex").asInstanceOf[Boolean],
      false,
    )
    assertEquals(
      config.selectDynamic("$htmlCanvas").selectDynamic("enabled").asInstanceOf[Boolean],
      false,
    )
    assertEquals(
      config
        .selectDynamic("$interpolate")
        .selectDynamic("startSymbol")
        .asInstanceOf[String],
      "[[",
    )
    assertEquals(
      config.selectDynamic("$sce").selectDynamic("enabled").asInstanceOf[Boolean],
      false,
    )
    assertEquals(
      config
        .selectDynamic("$sceDelegate")
        .selectDynamic("trustedResourceUrlList")
        .asInstanceOf[js.Array[String]]
        .head,
      "self",
    )

  test("router config builder emits scroll and focus options"):
    val config = RouterConfig(
      strict = false,
      caseInsensitive = true,
      defaultSquashPolicy = "slash",
      scroll = RouterScrollOptions(
        behavior = "smooth",
        top = 0.0,
        selector = "main",
      ),
      focus = RouterFocusOptions(
        selector = "h1",
        preventScroll = true,
      ),
    ).toJS.asInstanceOf[js.Dynamic]

    assertEquals(config.selectDynamic("strict").asInstanceOf[Boolean], false)
    assertEquals(config.selectDynamic("caseInsensitive").asInstanceOf[Boolean], true)
    assertEquals(config.selectDynamic("defaultSquashPolicy").asInstanceOf[String], "slash")
    assertEquals(
      config.selectDynamic("scroll").selectDynamic("selector").asInstanceOf[String],
      "main",
    )
    assertEquals(
      config.selectDynamic("focus").selectDynamic("preventScroll").asInstanceOf[Boolean],
      true,
    )

  test("transition hook criteria and options builders emit runtime objects"):
    val matcher: StateMatchCriterion =
      (_: js.UndefOr[js.Object], _: js.UndefOr[Transition]) => true
    val criteria = HookMatchCriteria(
      to = "admin.**",
      from = true,
      exiting = matcher,
    ).toJS.asInstanceOf[js.Dynamic]
    val options = HookRegOptions(
      priority = 100.0,
      bind = js.Dynamic.literal(owner = "router").asInstanceOf[js.Object],
      invokeLimit = 1,
    ).toJS.asInstanceOf[js.Dynamic]

    assertEquals(criteria.selectDynamic("to").asInstanceOf[String], "admin.**")
    assertEquals(criteria.selectDynamic("from").asInstanceOf[Boolean], true)
    assert(criteria.selectDynamic("exiting").isInstanceOf[js.Function])
    assertEquals(options.selectDynamic("priority").asInstanceOf[Double], 100.0)
    assertEquals(
      options.selectDynamic("bind").selectDynamic("owner").asInstanceOf[String],
      "router",
    )
    assertEquals(options.selectDynamic("invokeLimit").asInstanceOf[Int], 1)

  test("transition service extension passes typed hook registration options"):
    var capturedCriteria: js.UndefOr[js.Object] = js.undefined
    var capturedOptions: js.UndefOr[js.Object] = js.undefined
    var disposed = false
    val runtimeService = js.Dynamic.literal()
    runtimeService.updateDynamic("onBefore") {
      (
          criteria: js.Object,
          _: TransitionHookFn,
          options: js.Object,
      ) =>
        capturedCriteria = criteria
        capturedOptions = options
        val disposer: js.Function0[Unit] = () => disposed = true
        disposer
    }

    val service = runtimeService.asInstanceOf[TransitionsService]
    val deregister = service.before(
      HookMatchCriteria(to = "dashboard"),
      (_: Transition) => true,
      HookRegOptions(priority = 10.0),
    )

    deregister()
    assert(disposed)
    assertEquals(
      capturedCriteria
        .get
        .asInstanceOf[js.Dynamic]
        .selectDynamic("to")
        .asInstanceOf[String],
      "dashboard",
    )
    assertEquals(
      capturedOptions
        .get
        .asInstanceOf[js.Dynamic]
        .selectDynamic("priority")
        .asInstanceOf[Double],
      10.0,
    )

  test("view service facade exposes router view registry hooks"):
    val ngView = js.Dynamic.literal(_fqn = "$default").asInstanceOf[ActiveNgView]
    val viewConfig = js.Dynamic.literal(_targetKey = "$default").asInstanceOf[ViewConfig]
    val retained = js.Dynamic.literal(_key = "home").asInstanceOf[RetainedViewEntry]
    var activeConfig: js.UndefOr[ViewConfig] = js.undefined
    var registeredView: js.UndefOr[ActiveNgView] = js.undefined
    var rootContext: js.UndefOr[js.Object | Null] = js.undefined
    var synced = false
    var destroyedRetainedViews = false
    var deregistered = false
    val runtimeService = js.Dynamic
      .literal(
        _ngViews = js.Array[ActiveNgView](),
        _viewConfigs = js.Array[ViewConfig](),
        _rootViewContext = (context: js.UndefOr[js.Object | Null]) =>
          if !js.isUndefined(context) then rootContext = context
          rootContext,
        _activateViewConfig = (config: ViewConfig) =>
          activeConfig = config
          (),
        _deactivateViewConfig = (_: ViewConfig) =>
          activeConfig = js.undefined
          (),
        _sync = () => synced = true,
        _registerNgView = (view: ActiveNgView) =>
          registeredView = view
          val deregister: js.Function0[Unit] = () => deregistered = true
          deregister,
        _restoreRetainedView = (_: ViewConfig) => retained,
        _destroyRetainedViews = () => destroyedRetainedViews = true,
      )
      .asInstanceOf[ViewService]

    runtimeService._activateViewConfig(viewConfig)
    runtimeService._rootViewContext(js.Dynamic.literal(name = "root").asInstanceOf[js.Object])
    val deregister = runtimeService._registerNgView(ngView)
    runtimeService._sync()
    deregister()
    assertEquals(activeConfig.get, viewConfig)
    assertEquals(registeredView.get, ngView)
    assertEquals(
      runtimeService._rootViewContext().get.asInstanceOf[js.Dynamic].selectDynamic("name").asInstanceOf[String],
      "root",
    )
    assertEquals(runtimeService._restoreRetainedView(viewConfig).get, retained)
    assertEquals(synced, true)
    assertEquals(deregistered, true)
    runtimeService._deactivateViewConfig(viewConfig)
    runtimeService._destroyRetainedViews()
    assert(js.isUndefined(activeConfig))
    assertEquals(destroyedRetainedViews, true)

  test("state declaration builder emits common route options"):
    val state = StateDeclaration(
      name = "home",
      url = "/home",
      template = "<home-view></home-view>",
      component = "homeView",
      params = js.Dictionary[js.Any]("id" -> "1"),
      data = js.Dynamic.literal(title = "Home").asInstanceOf[js.Object],
    ).toJS.asInstanceOf[js.Dynamic]

    assertEquals(state.selectDynamic("name").asInstanceOf[String], "home")
    assertEquals(state.selectDynamic("url").asInstanceOf[String], "/home")
    assertEquals(
      state.selectDynamic("template").asInstanceOf[String],
      "<home-view></home-view>",
    )
    assertEquals(state.selectDynamic("component").asInstanceOf[String], "homeView")
    assertEquals(state.selectDynamic("params").selectDynamic("id").asInstanceOf[String], "1")
    assertEquals(state.selectDynamic("data").selectDynamic("title").asInstanceOf[String], "Home")

  test("route contracts and resolve builders preserve router shapes"):
    type AppRoutes = RouteMap
    type AppState = StateService
    type AppTransition = Transition

    val routeName = "admin.users"
    val routeDeclaration = RouteContract(
      params = js.Dictionary[js.Any]("id" -> "u1"),
      resolves = js.Dictionary[js.Any]("user" -> "loaded"),
    )
    val route = routeDeclaration.toJS.asInstanceOf[js.Dynamic]
    val routeMap: AppRoutes = js.Dictionary(
      routeName -> routeDeclaration,
    )
    val params = js.Dictionary[js.Any]("id" -> "u1")
    val resolves = js.Dictionary[js.Any]("user" -> "loaded")
    val resolveFn: js.Function0[String] = () => "loaded"
    val resolveObject = StateResolveObject("user" -> resolveFn)
    val resolveArray = StateResolveArray(
      js.Dynamic
        .literal(
          token = "user",
          resolveFn = resolveFn,
          eager = true,
        )
        .asInstanceOf[js.Object],
    )
    val stateService = js.Dynamic
      .literal(
        params = params,
        current = js.Dynamic.literal(name = routeName),
        go = (_: String, _: js.Dictionary[js.Any]) =>
          js.Dynamic.literal(transition = js.Dynamic.literal()),
        href = (_: String, _: js.Dictionary[js.Any]) => "/users/u1",
      )
      .asInstanceOf[AppState]
    val transition = js.Dynamic
      .literal(
        params = (_: js.UndefOr[String]) => params,
        to = () => js.Dynamic.literal(name = routeName),
        from = () => js.Dynamic.literal(name = "admin"),
      )
      .asInstanceOf[AppTransition]

    assertEquals(routeMap(routeName), routeDeclaration)
    assertEquals(route.selectDynamic("params").selectDynamic("id").asInstanceOf[String], "u1")
    assertEquals(params("id").asInstanceOf[String], "u1")
    assertEquals(resolves("user").asInstanceOf[String], "loaded")
    assertEquals(resolveObject("user").asInstanceOf[js.Function0[String]](), "loaded")
    assertEquals(
      resolveArray.head.asInstanceOf[js.Dynamic].selectDynamic("token").asInstanceOf[String],
      "user",
    )
    assertEquals(stateService.href(routeName, params).asInstanceOf[String], "/users/u1")
    assertEquals(transition.params()("id").asInstanceOf[String], "u1")

  test("state declaration builder emits route policy options"):
    val state = StateDeclaration(
      name = "workspace.editor",
      url = "/editor/:id",
      policy = StatePolicyDeclaration(
        navigation = StateNavigationPolicyDeclaration(
          authenticated = true,
          permissions = "editor.write",
          redirectTo = "login",
          reason = "editor login required",
        ),
        transition = StateTransitionPolicyDeclaration(
          canExit = (_: StateTransitionPolicyContext) => true,
          dirty = StateDirtyPolicyDeclaration(
            when = (_: StateTransitionPolicyContext) => false,
            prompt = "Discard changes?",
          ),
          loading = "workspace.loading",
        ),
        retention = StateRetentionPolicyDeclaration(
          mode = StateRetentionMode.KeepAlive,
          key = (context: StateRetentionPolicyContext) =>
            s"editor:${String.valueOf(context.params.asInstanceOf[js.Dynamic].selectDynamic("id"))}",
          max = 3,
          pause = StateRetentionPauseMode.Schedulers,
          evict = StateRetentionEvictionMode.Lru,
        ),
      ),
    ).toJS.asInstanceOf[js.Dynamic]
    val policy = state.selectDynamic("policy")

    assertEquals(
      policy
        .selectDynamic("navigation")
        .selectDynamic("authenticated")
        .asInstanceOf[Boolean],
      true,
    )
    assertEquals(
      policy
        .selectDynamic("navigation")
        .selectDynamic("permissions")
        .asInstanceOf[String],
      "editor.write",
    )
    assert(policy.selectDynamic("transition").selectDynamic("canExit").isInstanceOf[js.Function])
    assertEquals(
      policy
        .selectDynamic("transition")
        .selectDynamic("dirty")
        .selectDynamic("prompt")
        .asInstanceOf[String],
      "Discard changes?",
    )
    assertEquals(
      policy
        .selectDynamic("retention")
        .selectDynamic("mode")
        .asInstanceOf[String],
      "keep-alive",
    )
    assert(policy.selectDynamic("retention").selectDynamic("key").isInstanceOf[js.Function])
    assertEquals(
      policy
        .selectDynamic("retention")
        .selectDynamic("pause")
        .asInstanceOf[String],
      "schedulers",
    )

  test("router module declaration builder emits child route tree"):
    val tree = RouterModuleDeclaration(
      name = "workspace",
      url = "/workspace",
      abstractState = true,
      policy = StatePolicyDeclaration(
        navigation = StateNavigationPolicyDeclaration(authenticated = true),
      ),
      children = js.Array(
        RouterModuleDeclaration(
          name = "editor",
          url = "/editor/:id",
          component = "workspaceEditor",
        ),
      ),
    ).toJS.asInstanceOf[js.Dynamic]

    assertEquals(tree.selectDynamic("name").asInstanceOf[String], "workspace")
    assertEquals(tree.selectDynamic("abstract").asInstanceOf[Boolean], true)
    assertEquals(
      tree
        .selectDynamic("policy")
        .selectDynamic("navigation")
        .selectDynamic("authenticated")
        .asInstanceOf[Boolean],
      true,
    )
    val child = tree
      .selectDynamic("children")
      .asInstanceOf[js.Array[js.Dynamic]]
      .head
    assertEquals(child.selectDynamic("name").asInstanceOf[String], "editor")
    assertEquals(child.selectDynamic("component").asInstanceOf[String], "workspaceEditor")

  test("lazy state loader normalization emits runtime state objects"):
    val state = StateDeclaration(
      name = "admin.home",
      url = "/admin",
      component = "adminHome",
    )
    val normalizedState =
      NgModule.normalizeLazyStateLoadResult(state).asInstanceOf[js.Dynamic]
    val normalizedArray = NgModule
      .normalizeLazyStateLoadResult(js.Array(state))
      .asInstanceOf[js.Array[js.Dynamic]]

    assertEquals(normalizedState.selectDynamic("name").asInstanceOf[String], "admin.home")
    assertEquals(normalizedState.selectDynamic("component").asInstanceOf[String], "adminHome")
    assertEquals(normalizedArray.head.selectDynamic("url").asInstanceOf[String], "/admin")

  test("lazy state loader normalization maps promised state objects"):
    val promise = js.Promise.resolve(
      StateDeclaration(
        name = "settings",
        template = "<settings-view></settings-view>",
      ).asInstanceOf[LazyStateLoadResult],
    )
    val normalized = NgModule
      .normalizeLazyStateLoadResult(promise)
      .asInstanceOf[js.Promise[js.Dynamic]]

    normalized.toFuture.map { state =>
      assertEquals(state.selectDynamic("name").asInstanceOf[String], "settings")
      assertEquals(
        state.selectDynamic("template").asInstanceOf[String],
        "<settings-view></settings-view>",
      )
    }

  test("angular config builder emits router config under injectable name"):
    val config = AngularConfig(
      router = RouterConfig(
        scroll = RouterScrollMode.Top,
        focus = "h1",
      ),
    ).toJS.asInstanceOf[js.Dynamic]

    assertEquals(
      config.selectDynamic("$router").selectDynamic("scroll").asInstanceOf[String],
      "top",
    )
    assertEquals(
      config.selectDynamic("$router").selectDynamic("focus").asInstanceOf[String],
      "h1",
    )
