package angular.ts

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
    assertEquals(Tokens.view.name, "$view")
    assertEquals(Tokens.wasm.name, "$wasm")
    assertEquals(Tokens.websocket.name, "$websocket")
    assertEquals(Tokens.webTransport.name, "$webTransport")
    assertEquals(Tokens.webComponent.name, "$webComponent")
    assertEquals(Tokens.worker.name, "$worker")
    assertEquals(Tokens.workflow.name, "$workflow")

  test("public service aliases preserve existing runtime service shapes"):
    val angular: Angular = js.Dynamic.literal(version = "test").asInstanceOf[js.Object]
    val angularService: AngularService = angular
    val eventBus = js.Dynamic
      .literal(
        publish = (_: String, _: js.Any) => (),
        subscribe = (_: String, _: js.Function1[js.Any, Unit]) => () => (),
      )
      .asInstanceOf[EventBusService]
    val pubSub: PubSubService = eventBus

    assertEquals(
      angularService.asInstanceOf[js.Dynamic].selectDynamic("version").asInstanceOf[String],
      "test",
    )
    assertEquals(pubSub.asInstanceOf[js.Dynamic], eventBus.asInstanceOf[js.Dynamic])

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
    val link = linkRaw.asInstanceOf[PublicLinkFn]

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
    val config = RequestConfig(
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
    val config = RequestShortcutConfig(
      headers = js.Dictionary[js.Any]("X-Test" -> "yes"),
      timeout = 2500.0,
    ).toJS.asInstanceOf[js.Dynamic]

    assertEquals(
      config.selectDynamic("headers").selectDynamic("X-Test").asInstanceOf[String],
      "yes",
    )
    assertEquals(config.selectDynamic("timeout").asInstanceOf[Double], 2500.0)

  test("filter option aliases and entry item builder preserve runtime shapes"):
    val entry = EntryFilterItem("name", "Ada").asInstanceOf[js.Dynamic]
    val dateOptions: DateFilterOptions =
      js.Dynamic.literal(dateStyle = "medium").asInstanceOf[js.Object]
    val numberOptions: NumberFilterOptions =
      js.Dynamic.literal(maximumFractionDigits = 2).asInstanceOf[js.Object]
    val currencyOptions: CurrencyFilterOptions =
      js.Dynamic.literal(currency = "EUR").asInstanceOf[js.Object]
    val relativeOptions: RelativeTimeFilterOptions =
      js.Dynamic.literal(numeric = "auto").asInstanceOf[js.Object]

    assertEquals(entry.selectDynamic("key").asInstanceOf[String], "name")
    assertEquals(entry.selectDynamic("value").asInstanceOf[String], "Ada")
    assertEquals(
      dateOptions.asInstanceOf[js.Dynamic].selectDynamic("dateStyle").asInstanceOf[String],
      "medium",
    )
    assertEquals(
      numberOptions
        .asInstanceOf[js.Dynamic]
        .selectDynamic("maximumFractionDigits")
        .asInstanceOf[Int],
      2,
    )
    assertEquals(
      currencyOptions.asInstanceOf[js.Dynamic].selectDynamic("currency").asInstanceOf[String],
      "EUR",
    )
    assertEquals(
      relativeOptions.asInstanceOf[js.Dynamic].selectDynamic("numeric").asInstanceOf[String],
      "auto",
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
    val linkFn = rawLink.asInstanceOf[PublicLinkFn]
    val rawCompile: js.Function5[
      CompileNode,
      js.UndefOr[ChildTranscludeOrLinkFn | Null],
      js.UndefOr[Double],
      js.UndefOr[String],
      js.UndefOr[js.Object | Null],
      PublicLinkFn,
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
    val options = NativeAnimationOptions(
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
      (_: org.scalajs.dom.Element, _: AnimationContext, _: NativeAnimationOptions) => ()
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
        NativeAnimationOptions(duration = 250.0),
      ),
      handle,
    )
    assertEquals(service.leave(element, NativeAnimationOptions(duration = 50.0)), handle)
    assertEquals(capturedClass, "is-visible")
    assertEquals(
      capturedOptions
        .asInstanceOf[js.Dynamic]
        .selectDynamic("duration")
        .asInstanceOf[Double],
      250.0,
    )

  test("pubsub config builder emits event delivery policy object"):
    val policy = js.Dynamic
      .literal(
        check = (_: EventDeliveryPolicyContext) =>
          EventDeliveryPolicyDecision.deliver,
      )
      .asInstanceOf[EventDeliveryPolicy]
    val config = PubSubConfig(deliveryPolicy = policy).toJS.asInstanceOf[js.Dynamic]

    assertEquals(
      config
        .selectDynamic("deliveryPolicy")
        .selectDynamic("check")
        .asInstanceOf[js.Function1[EventDeliveryPolicyContext, EventDeliveryPolicyDecision]]
        .apply(js.Dynamic.literal(topic = "ready").asInstanceOf[EventDeliveryPolicyContext])
        .`type`,
      "deliver",
    )

  test("sse config builder emits connection and transport options"):
    val config = SseConfig(
      withCredentials = true,
      params = js.Dictionary[js.Any]("room" -> "alpha"),
      headers = js.Dictionary("X-Test" -> "yes"),
      connection = ConnectionConfig(
        retryDelay = 100.0,
        maxRetries = 3.0,
        eventTypes = js.Array("message", "ready"),
      ),
    ).toJS.asInstanceOf[js.Dynamic]

    assertEquals(config.selectDynamic("withCredentials").asInstanceOf[Boolean], true)
    assertEquals(config.selectDynamic("params").selectDynamic("room").asInstanceOf[String], "alpha")
    assertEquals(config.selectDynamic("headers").selectDynamic("X-Test").asInstanceOf[String], "yes")
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
      swap = SwapModeType.BeforeEnd,
    ).asInstanceOf[js.Dynamic]
    val detail = RealtimeProtocolEventDetail[String, SseConnection](
      data = "ready",
      source = source,
      url = "/events",
    ).asInstanceOf[js.Dynamic]
    val sseDetail = detail.asInstanceOf[SseProtocolEventDetail[String]]
    val sseMessage = message.asInstanceOf[SseProtocolMessage]

    assertEquals(message.selectDynamic("data").asInstanceOf[String], "fallback")
    assertEquals(message.selectDynamic("html").asInstanceOf[String], "<p>ready</p>")
    assertEquals(message.selectDynamic("target").asInstanceOf[String], "#status")
    assertEquals(message.selectDynamic("swap").asInstanceOf[String], "beforeend")
    assertEquals(detail.selectDynamic("data").asInstanceOf[String], "ready")
    assertEquals(detail.selectDynamic("source").asInstanceOf[SseConnection], source)
    assertEquals(detail.selectDynamic("url").asInstanceOf[String], "/events")
    assertEquals(SwapModeType.Delete.value, "delete")
    assertEquals(sseDetail.asInstanceOf[js.Dynamic].selectDynamic("url").asInstanceOf[String], "/events")
    assertEquals(
      sseMessage.asInstanceOf[js.Dynamic].selectDynamic("swap").asInstanceOf[String],
      "beforeend",
    )

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
      autoRestart = true,
      autoTerminate = false,
      transformMessage = (value: js.Any) => value,
    ).toJS.asInstanceOf[js.Dynamic]

    assertEquals(config.selectDynamic("autoRestart").asInstanceOf[Boolean], true)
    assertEquals(config.selectDynamic("autoTerminate").asInstanceOf[Boolean], false)
    assert(config.selectDynamic("transformMessage").isInstanceOf[js.Function])

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
    val options = WasmOptions(raw = true).toJS.asInstanceOf[js.Dynamic]
    val scopeOptions = WasmScopeOptions(name = "hud").toJS.asInstanceOf[js.Dynamic]
    val bindingOptions = WasmScopeBindingOptions(
      name = "player",
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
    val result = js.Dynamic
      .literal(
        instance = js.Dynamic.literal(),
        exports = js.Dynamic.literal(memory = exports.memory),
        module = js.Dynamic.literal(),
      )
      .asInstanceOf[WasmInstantiationResult]

    assertEquals(options.selectDynamic("raw").asInstanceOf[Boolean], true)
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
    assertEquals(
      result.exports.asInstanceOf[js.Dynamic].selectDynamic("memory").asInstanceOf[js.Any],
      exports.memory.asInstanceOf[js.Any],
    )

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
    val imports = js.Dynamic
      .literal(
        angular_ts = js.Dynamic.literal(
          scope_resolve = (_: Int, _: Int) => 1,
          scope_get = (_: Int, _: Int, _: Int) => 2,
          scope_get_named = (_: Int, _: Int, _: Int, _: Int) => 3,
          scope_set = (_: Int, _: Int, _: Int, _: Int, _: Int) => 1,
          scope_set_named = (_: Int, _: Int, _: Int, _: Int, _: Int, _: Int) => 1,
          scope_delete = (_: Int, _: Int, _: Int) => 1,
          scope_delete_named = (_: Int, _: Int, _: Int, _: Int) => 1,
          scope_sync = (_: Int) => 1,
          scope_sync_named = (_: Int, _: Int) => 1,
          scope_watch = (_: Int, _: Int, _: Int) => 4,
          scope_watch_named = (_: Int, _: Int, _: Int, _: Int) => 5,
          scope_unwatch = (_: Int) => 1,
          scope_unbind = (_: Int) => 1,
          scope_unbind_named = (_: Int, _: Int) => 1,
          buffer_ptr = (_: Int) => 8,
          buffer_len = (_: Int) => 13,
          buffer_free = (_: Int) => (),
        ),
      )
      .asInstanceOf[WasmScopeAbiImportObject]
    lazy val wasmScope: WasmScope = js.Dynamic
      .literal(
        abi = abi,
        handle = 1,
        name = "player",
        scope = angularScope,
        isDisposed = () => false,
        get = (_: String) => "value",
        set = (_: String, _: js.Any) => true,
        delete = (_: String) => true,
        sync = () => (),
        onSync = (_: js.Function0[Unit]) => (() => ()).asInstanceOf[js.Function0[Unit]],
        watch = (path: String, _: js.Function1[WasmScopeUpdate, Unit], _: js.Object) =>
          watchedPath = path
          (() => ()).asInstanceOf[js.Function0[Unit]],
        bindExports = (_: WasmAbiExports, _: js.Object) =>
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
        unregisterScope = (_: Int) => true,
        notifyBind = (_: WasmScope) => (),
        notifyUpdate = (_: WasmScopeUpdate) => (),
        notifyUnbind = (_: WasmScope) => (),
        freeBuffer = (_: Int) => (),
      )
      .asInstanceOf[WasmScopeAbi]
    val exports = js.Dynamic
      .literal(
        memory = js.Dynamic.literal(buffer = new js.typedarray.ArrayBuffer(8)),
        ng_abi_alloc = (_: Int) => 0,
        ng_abi_free = (_: Int, _: Int) => (),
      )
      .asInstanceOf[WasmAbiExports]
    val runtimeService
        : js.Function3[
          String,
          js.UndefOr[js.Object],
          js.UndefOr[js.Object],
          js.Promise[js.Any],
        ] = (
        _: String,
        _: js.UndefOr[js.Object],
        options: js.UndefOr[js.Object],
    ) =>
      serviceLoadOptions = options.get
      js.Promise.resolve(js.Dynamic.literal())
    val runtimeServiceDynamic = runtimeService.asInstanceOf[js.Dynamic]
    runtimeServiceDynamic.updateDynamic("scope")((_: Scope, _: js.Object) => wasmScope)
    runtimeServiceDynamic.updateDynamic("createScopeAbi")((_: js.UndefOr[WasmAbiExports]) => abi)
    val service = runtimeService.asInstanceOf[WasmService]

    assertEquals(imports.angular_ts.scope_resolve(0, 0), 1)
    assertEquals(abi.createScope(angularScope, WasmScopeOptions(name = "player")), wasmScope)
    assertEquals(abi.getScope(1).get, wasmScope)
    assertEquals(wasmScope.get("name").asInstanceOf[String], "value")
    assertEquals(wasmScope.set("name", "next"), true)
    wasmScope.watch(
      "score",
      (_: WasmScopeUpdate) => (),
      WasmScopeWatchOptions(initial = true),
    )
    wasmScope.bindExports(
      exports,
      WasmScopeBindingOptions(watch = js.Array("score"), initial = true),
    )
    service.load("demo.wasm", options = WasmOptions(raw = true))
    assertEquals(service.createScope(angularScope, WasmScopeOptions(name = "player")), wasmScope)
    assertEquals(service.createScopeAbi(exports), abi)
    assertEquals(watchedPath, "score")
    assertEquals(boundWithOptions, true)
    assertEquals(
      serviceLoadOptions.asInstanceOf[js.Dynamic].selectDynamic("raw").asInstanceOf[Boolean],
      true,
    )

  test("ng module wasm helper passes typed registration options"):
    var capturedName = ""
    var capturedSrc = ""
    var capturedImports: js.Any = js.Dynamic.literal()
    var capturedOptions: js.Any = js.Dynamic.literal()
    val raw = js.Dynamic
      .literal(
        name = "demo",
        wasm = (
            name: String,
            src: String,
            imports: js.Any,
            options: js.Any,
        ) =>
          capturedName = name
          capturedSrc = src
          capturedImports = imports
          capturedOptions = options
          js.Dynamic.literal(),
      )
      .asInstanceOf[RuntimeNgModule]
    val module = NgModule(raw)
    val imports = js.Dynamic.literal(env = js.Dynamic.literal()).asInstanceOf[js.Object]
    val token = AngularTS.token[WasmService]("gameWasm")

    assertEquals(
      module.wasm(token, "/game.wasm", imports, WasmOptions(raw = true)),
      module,
    )
    assertEquals(capturedName, "gameWasm")
    assertEquals(capturedSrc, "/game.wasm")
    assertEquals(capturedImports, imports.asInstanceOf[js.Any])
    assertEquals(
      capturedOptions.asInstanceOf[js.Dynamic].selectDynamic("raw").asInstanceOf[Boolean],
      true,
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
    val policy = js.Dynamic
      .literal(
        check = (_: RestCachePolicyContext) =>
          RestCachePolicyDecision(RestCacheStrategy.StaleWhileRevalidate),
      )
      .asInstanceOf[RestCachePolicy]
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
    val definition = RestDefinition[js.Object](
      name = "users",
      url = "/api/users",
      options = RestOptions(extra = js.Dictionary[js.Any]("cache" -> true)),
    ).toJS.asInstanceOf[js.Dynamic]

    assert(cached.selectDynamic("network").isInstanceOf[js.Object])
    assert(cached.selectDynamic("cache").isInstanceOf[js.Object])
    assertEquals(cached.selectDynamic("strategy").asInstanceOf[String], "cache-first")
    assert(cached.selectDynamic("policy").selectDynamic("check").isInstanceOf[js.Function])
    assert(cached.selectDynamic("onRevalidate").isInstanceOf[js.Function])
    assert(options.selectDynamic("backend").isInstanceOf[js.Object])
    assertEquals(options.selectDynamic("timeout").asInstanceOf[Int], 5000)
    assertEquals(
      config.selectDynamic("defaults").selectDynamic("mode").asInstanceOf[String],
      "cors",
    )
    assertEquals(definition.selectDynamic("name").asInstanceOf[String], "users")
    assertEquals(definition.selectDynamic("url").asInstanceOf[String], "/api/users")
    assertEquals(
      definition.selectDynamic("options").selectDynamic("cache").asInstanceOf[Boolean],
      true,
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

    val token = AngularTS.token[AppModelValue[PlayerModel]]("player")
    val restoreOptions = AppModelRestoreOptions(
      origin = "socket",
      mode = AppModelRestoreMode.Merge,
    ).toJS.asInstanceOf[js.Dynamic]
    val syncOptions = AppModelSyncOptions(
      failure = AppModelSyncFailurePolicy.Throw,
    ).toJS.asInstanceOf[js.Dynamic]
    val target = AppModelSyncTarget[PlayerModel](
      restore = () => new PlayerModel(1.0, 2.0),
      write = (snapshot: PlayerModel, _: AppModelChange) => snapshot.x,
      receive = (_: AppModelApply[PlayerModel]) => js.undefined,
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
    val model = runtimeModel.asInstanceOf[AppModelLifecycle[PlayerModel]]
    var disposed = false
    runtimeModel.updateDynamic("$sync") {
      (target: js.Object, options: js.Object) =>
        capturedTarget = target
        capturedOptions = options
        val disposer: js.Function0[Unit] = () => disposed = true
        disposer
    }
    val dispose = model.sync(
      AppModelSyncTarget[PlayerModel](
        restore = () => new PlayerModel(10),
      ),
      AppModelSyncOptions(failure = AppModelSyncFailurePolicy.Ignore),
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

  test("machine config builders emit transitions, guards, and hooks"):
    final class PlayerData(var status: String, var count: Int) extends js.Object
    type NoEvents = MachineNoEvents

    val transition: MachineTransition[PlayerData, js.Any, NoEvents] =
      (data: PlayerData, _: js.Any, _: Machine[PlayerData, NoEvents]) =>
        data.count += 1
        "ready"
    val guard: MachineGuard[PlayerData, js.Any, NoEvents] =
      (_: PlayerData, _: js.Any, _: Machine[PlayerData, NoEvents]) => true
    val hook: MachineTransitionHook[PlayerData, NoEvents] =
      (context: MachineTransitionContext[PlayerData, NoEvents, js.Any]) =>
        context.data.status = context.to
    val descriptor = MachineTransitionDescriptor[PlayerData, js.Any, NoEvents](
      target = transition,
      guard = guard,
    )
    val transitions: MachineTransitionMap[PlayerData, NoEvents] = js.Dictionary(
      "idle" -> js.Dictionary[MachineTransitionDefinition[PlayerData, js.Any, NoEvents]](
        "start" -> descriptor,
      ),
    )
    val config = MachineConfig[PlayerData, NoEvents](
      initial = "idle",
      data = new PlayerData("idle", 0),
      transitions = transitions,
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
        .selectDynamic("transitions")
        .selectDynamic("idle")
        .selectDynamic("start")
        .selectDynamic("target")
        .isInstanceOf[js.Function],
    )
    assert(
      config
        .selectDynamic("transitions")
        .selectDynamic("idle")
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
    val transition: MachineTransition[PlayerData, js.Any, NoEvents] =
      (_: PlayerData, _: js.Any, _: Machine[PlayerData, NoEvents]) => "ready"
    val config = AngularTS.defineMachine(
      MachineConfig[PlayerData, NoEvents](
        initial = "idle",
        data = new PlayerData("idle"),
        transitions = js.Dictionary(
          "idle" -> js.Dictionary[MachineTransitionDefinition[PlayerData, js.Any, NoEvents]](
            "start" -> transition,
          ),
        ),
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
    type NoEvents = MachineNoEvents
    type NoCommands = WorkflowNoCommands

    val diagnostic = WorkflowDiagnostic(
      code = "workflow.timeout",
      message = "Timed out",
      recoverable = true,
      command = "load",
    )
    val command = AngularTS.defineCommand[
      PlayerData,
      String,
      Int,
      NoEvents,
      NoCommands,
      String,
    ]((context: WorkflowCommandContext[PlayerData, String, NoEvents, NoCommands, String]) =>
      WorkflowCommandResult.ok[Int](context.input.length),
    )
    val transitions: MachineTransitionMap[PlayerData, NoEvents] = js.Dictionary(
      "idle" -> js.Dictionary.empty[MachineTransitionDefinition[PlayerData, js.Any, NoEvents]],
    )
    val config = AngularTS
      .defineWorkflow(
        WorkflowConfig[PlayerData, NoEvents, NoCommands](
          id = "player",
          initial = "idle",
          data = new PlayerData("idle"),
          transitions = transitions,
          commands = js.Dictionary("load" -> command),
          commandTimeout = 250,
          concurrency = WorkflowConcurrencyPolicy.Queue,
          diagnosticLimit = 5,
          historyLimit = 10,
        ),
      )
      .toJS
      .asInstanceOf[js.Dynamic]
    val options = WorkflowCommandOptions(
      concurrency = WorkflowConcurrencyPolicy.Reject,
      timeout = 100,
    ).toJS.asInstanceOf[js.Dynamic]
    val failed = WorkflowCommandResult.failed[Int](js.Array(diagnostic))
    val snapshot = WorkflowSnapshot(
      id = "player",
      current = "idle",
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
    assertEquals(config.selectDynamic("concurrency").asInstanceOf[String], "queue")
    assertEquals(config.selectDynamic("commandTimeout").asInstanceOf[Double], 250.0)
    assert(config.selectDynamic("commands").selectDynamic("load").isInstanceOf[js.Function])
    assertEquals(options.selectDynamic("concurrency").asInstanceOf[String], "reject")
    assertEquals(options.selectDynamic("timeout").asInstanceOf[Double], 100.0)
    assertEquals(failed.ok, false)
    assertEquals(failed.diagnostics.get.head.code, "workflow.timeout")
    assertEquals(snapshot.version, 1)
    assertEquals(snapshot.history.head.command, "load")

  test("workflow service facade and module helper pass typed workflow config"):
    final class PlayerData(var status: String) extends js.Object
    type NoEvents = MachineNoEvents
    type NoCommands = WorkflowNoCommands

    val token = AngularTS.token[Workflow[PlayerData, NoEvents, NoCommands]]("playerWorkflow")
    val config = WorkflowConfig[PlayerData, NoEvents, NoCommands](
      id = "player",
      initial = "idle",
      data = new PlayerData("idle"),
      transitions = js.Dictionary(
        "idle" -> js.Dictionary.empty[MachineTransitionDefinition[PlayerData, js.Any, NoEvents]],
      ),
    )
    val workflow = js.Dynamic
      .literal(
        id = "player",
        current = "idle",
        data = new PlayerData("idle"),
        diagnostics = js.Array[WorkflowDiagnostic](),
        history = js.Array[WorkflowHistoryEntry](),
        send = ((_: String, _: js.UndefOr[js.Any]) => true)
          .asInstanceOf[js.Function2[String, js.UndefOr[js.Any], Boolean]],
        can = ((_: String) => true).asInstanceOf[js.Function1[String, Boolean]],
        matches = ((mode: String) => mode == "idle")
          .asInstanceOf[js.Function1[String, Boolean]],
        run = ((_: String, _: js.UndefOr[js.Any], _: js.UndefOr[js.Object]) =>
          js.Promise.resolve(WorkflowCommandResult.ok[js.Any]()))
          .asInstanceOf[
            js.Function3[
              String,
              js.UndefOr[js.Any],
              js.UndefOr[js.Object],
              js.Promise[WorkflowCommandResult[js.Any]],
            ],
          ],
        retry = ((_: js.UndefOr[String], _: js.UndefOr[js.Object]) =>
          js.Promise.resolve(WorkflowCommandResult.ok[js.Any]()))
          .asInstanceOf[
            js.Function2[
              js.UndefOr[String],
              js.UndefOr[js.Object],
              js.Promise[WorkflowCommandResult[js.Any]],
            ],
          ],
        repeat = ((_: js.UndefOr[String], _: js.UndefOr[js.Object]) =>
          js.Promise.resolve(WorkflowCommandResult.ok[js.Any]()))
          .asInstanceOf[
            js.Function2[
              js.UndefOr[String],
              js.UndefOr[js.Object],
              js.Promise[WorkflowCommandResult[js.Any]],
            ],
          ],
        cancel = ((_: js.UndefOr[String]) => 0)
          .asInstanceOf[js.Function1[js.UndefOr[String], Int]],
        snapshot = (() => WorkflowSnapshot("player", "idle", new PlayerData("idle")))
          .asInstanceOf[js.Function0[WorkflowSnapshot[PlayerData]]],
        restore = ((_: js.Any) => ()).asInstanceOf[js.Function1[js.Any, Unit]],
      )
      .asInstanceOf[Workflow[PlayerData, NoEvents, NoCommands]]
    var capturedServiceConfig: js.UndefOr[js.Dynamic] = js.undefined
    val runtimeService: js.Function1[
      js.Object,
      Workflow[PlayerData, NoEvents, NoCommands],
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
    type NoEvents = MachineNoEvents
    type NoCommands = WorkflowNoCommands

    val workflowConfig = WorkflowConfig[PlayerData, NoEvents, NoCommands](
      id = "player",
      initial = "idle",
      data = new PlayerData("idle"),
      transitions = js.Dictionary(
        "idle" -> js.Dictionary.empty[MachineTransitionDefinition[PlayerData, js.Any, NoEvents]],
      ),
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
        remove = ((_: String) => js.Promise.resolve(()))
          .asInstanceOf[js.Function1[String, js.Promise[Unit]]],
      )
      .asInstanceOf[WorkflowSupervisorPersistence[WorkflowSupervisorSnapshot[js.Object]]]
    val config = WorkflowSupervisorConfig(
      id = "session",
      workflows = workflows.asInstanceOf[js.Object],
      persistence = persistence,
      persistencePolicy = WorkflowSupervisorPersistencePolicy.AfterCommand,
      recovery = WorkflowSupervisorRecoveryPolicy(
        restoreOnStart = true,
        retryRecoverable = false,
      ),
    ).toJS.asInstanceOf[js.Dynamic]
    val idbConfig = WorkflowSupervisorIndexedDbPersistenceConfig(
      database = "app-workflows",
      store = "snapshots",
      version = 2,
      indexedDB = js.Dynamic.literal(),
    ).toJS.asInstanceOf[js.Dynamic]

    assertEquals(config.selectDynamic("id").asInstanceOf[String], "session")
    assertEquals(
      config.selectDynamic("persistencePolicy").asInstanceOf[String],
      "after-command",
    )
    assertEquals(
      config.selectDynamic("recovery").selectDynamic("restoreOnStart").asInstanceOf[Boolean],
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
      persistencePolicy = WorkflowSupervisorPersistencePolicy.Manual,
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
      capturedModuleConfig.get.selectDynamic("persistencePolicy").asInstanceOf[String],
      "manual",
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
      result = WorkflowCommandResult.ok[String]("loaded"),
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
          js.Promise.resolve(WorkflowCommandResult.ok[String]("loaded")))
          .asInstanceOf[
            js.Function3[
              String,
              String,
              js.UndefOr[js.Any],
              js.Promise[WorkflowCommandResult[String]],
            ],
          ],
        send = ((_: String, _: String, _: js.UndefOr[js.Any]) =>
          js.Promise.resolve(true))
          .asInstanceOf[
            js.Function3[String, String, js.UndefOr[js.Any], js.Promise[Boolean]],
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
      scriptUrl = "/sw.js",
      checkForUpdatesOnRegister = true,
    ).toJS.asInstanceOf[js.Dynamic]

    assertEquals(config.selectDynamic("scope").asInstanceOf[String], "/app/")
    assertEquals(config.selectDynamic("type").asInstanceOf[String], "module")
    assertEquals(config.selectDynamic("updateViaCache").asInstanceOf[String], "none")
    assertEquals(config.selectDynamic("autoRegister").asInstanceOf[Boolean], true)
    assertEquals(config.selectDynamic("scriptUrl").asInstanceOf[String], "/sw.js")
    assertEquals(
      config.selectDynamic("checkForUpdatesOnRegister").asInstanceOf[Boolean],
      true,
    )

  test("service worker message client option builders emit protocol options"):
    val client = ServiceWorkerMessageClientOptions(
      requestType = "request",
      responseType = "response",
      timeout = 5000.0,
      createId = () => "id",
      target = ServiceWorkerMessageTarget.Waiting,
    ).toJS.asInstanceOf[js.Dynamic]
    val request = ServiceWorkerMessageClientRequestOptions(
      transfer = js.Array(),
      timeout = 1000.0,
      target = ServiceWorkerMessageTarget.Active,
    ).toJS.asInstanceOf[js.Dynamic]

    assertEquals(client.selectDynamic("requestType").asInstanceOf[String], "request")
    assertEquals(client.selectDynamic("responseType").asInstanceOf[String], "response")
    assertEquals(client.selectDynamic("timeout").asInstanceOf[Double], 5000.0)
    assert(client.selectDynamic("createId").isInstanceOf[js.Function])
    assertEquals(client.selectDynamic("target").asInstanceOf[String], "waiting")
    assert(request.selectDynamic("transfer").isInstanceOf[js.Array[js.Any]])
    assertEquals(request.selectDynamic("timeout").asInstanceOf[Double], 1000.0)
    assertEquals(request.selectDynamic("target").asInstanceOf[String], "active")

  test("service worker message contracts preserve runtime protocol shape"):
    import ServiceWorkerMessageClient.*

    val request = ServiceWorkerMessageRequest(
      messageType = "request",
      id = "request-1",
      payload = js.Dynamic.literal(action = "sync"),
    ).asInstanceOf[js.Dynamic]
    val response = ServiceWorkerMessageResponse(
      messageType = "response",
      id = "request-1",
      ok = true,
      data = js.Dynamic.literal(status = "ok"),
    ).asInstanceOf[js.Dynamic]
    val error = js.Dynamic
      .literal(
        name = "ServiceWorkerMessageClientError",
        message = "timed out",
        code = ServiceWorkerMessageClientErrorCode.Timeout.value,
        detail = js.Dynamic.literal(id = "request-1"),
      )
      .asInstanceOf[ServiceWorkerMessageClientError]
    var disposed = false
    var capturedTarget = ""
    val runtimeClient = js.Dynamic.literal(pending = 1, disposed = false)
    val requestFn: js.Function2[js.Any, js.Object, js.Promise[String]] =
      (_: js.Any, options: js.Object) =>
        capturedTarget = options
          .asInstanceOf[js.Dynamic]
          .selectDynamic("target")
          .asInstanceOf[String]
        js.Promise.resolve("accepted")
    val disposeFn: js.Function0[Unit] = () => disposed = true
    runtimeClient.updateDynamic("request")(requestFn)
    runtimeClient.updateDynamic("dispose")(disposeFn)
    val messageClient = runtimeClient.asInstanceOf[ServiceWorkerMessageClient]

    assertEquals(request.selectDynamic("type").asInstanceOf[String], "request")
    assertEquals(request.selectDynamic("id").asInstanceOf[String], "request-1")
    assertEquals(
      request
        .selectDynamic("payload")
        .asInstanceOf[js.Dynamic]
        .selectDynamic("action")
        .asInstanceOf[String],
      "sync",
    )
    assertEquals(response.selectDynamic("type").asInstanceOf[String], "response")
    assertEquals(response.selectDynamic("ok").asInstanceOf[Boolean], true)
    assertEquals(error.name, "ServiceWorkerMessageClientError")
    assertEquals(error.message, "timed out")
    assertEquals(error.code, "timeout")
    assertEquals(messageClient.pending, 1)
    messageClient.requestWithOptions[String](
      js.Dynamic.literal(),
      ServiceWorkerMessageClientRequestOptions(
        target = ServiceWorkerMessageTarget.Waiting,
      ),
    )
    messageClient.dispose()
    assertEquals(capturedTarget, "waiting")
    assertEquals(disposed, true)

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

  test("security config builder emits credential and navigation policy options"):
    val config = SecurityPolicyConfig(
      defaultDecision = SecurityPolicyDecisionType.Deny,
      branches = js.Array("jwt", "cookieSession"),
      allowInsecureTransport = false,
      credentials = SecurityPolicyCredentialConfig(
        jwt = () => "token",
        cookieSession = SecurityCookieSessionConfig(withCredentials = true),
      ),
      navigation = SecurityNavigationPolicyConfig(
        rules = js.Array(
          SecurityNavigationRule(
            state = js.Array("admin"),
            decision = SecurityPolicyDecisionType.Redirect,
            reason = "login required",
            status = 302,
            target = "login",
          ),
        ),
        permissions = () => js.Array("admin.read"),
      ),
    ).toJS.asInstanceOf[js.Dynamic]

    assertEquals(config.selectDynamic("defaultDecision").asInstanceOf[String], "deny")
    assertEquals(
      config.selectDynamic("branches").asInstanceOf[js.Array[String]].toSeq,
      Seq("jwt", "cookieSession"),
    )
    assertEquals(config.selectDynamic("allowInsecureTransport").asInstanceOf[Boolean], false)
    assert(config.selectDynamic("credentials").selectDynamic("jwt").isInstanceOf[js.Function])
    assertEquals(
      config
        .selectDynamic("credentials")
        .selectDynamic("cookieSession")
        .selectDynamic("withCredentials")
        .asInstanceOf[Boolean],
      true,
    )
    assertEquals(
      config
        .selectDynamic("navigation")
        .selectDynamic("rules")
        .asInstanceOf[js.Array[js.Dynamic]]
        .head
        .selectDynamic("decision")
        .asInstanceOf[String],
      "redirect",
    )
    assert(config.selectDynamic("navigation").selectDynamic("permissions").isInstanceOf[js.Function])

  test("angular config builder emits security config under injectable name"):
    val config = AngularConfig(
      security = SecurityPolicyConfig(
        defaultDecision = SecurityPolicyDecisionType.Allow,
      ),
    ).toJS.asInstanceOf[js.Dynamic]

    assertEquals(
      config
        .selectDynamic("$security")
        .selectDynamic("defaultDecision")
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

    val service = runtimeService.asInstanceOf[TransitionService]
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

  test("typed route aliases and resolve builders preserve router shapes"):
    type AppRoutes = TypedRouteMap
    type UserRouteName = TypedRouteName[AppRoutes]
    type UserParams = TypedRouteParams[AppRoutes, UserRouteName]
    type UserResolves = TypedRouteResolves[AppRoutes, UserRouteName]
    type AppState = TypedStateService[AppRoutes]
    type AppTransition = TypedTransition[AppRoutes, UserRouteName, UserRouteName]

    val routeName: UserRouteName = "admin.users"
    val routeDeclaration = TypedRouteDeclaration(
      params = js.Dictionary[js.Any]("id" -> "u1"),
      resolves = js.Dictionary[js.Any]("user" -> "loaded"),
    )
    val route = routeDeclaration.toJS.asInstanceOf[js.Dynamic]
    val routeMap: AppRoutes = js.Dictionary(
      routeName -> routeDeclaration,
    )
    val params: UserParams = js.Dictionary[js.Any]("id" -> "u1")
    val resolves: UserResolves = js.Dictionary[js.Any]("user" -> "loaded")
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
          require = js.Array("auth"),
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
        .selectDynamic("require")
        .asInstanceOf[js.Array[String]]
        .toSeq,
      Seq("auth"),
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
        navigation = StateNavigationPolicyDeclaration(require = "auth"),
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
        .selectDynamic("require")
        .asInstanceOf[String],
      "auth",
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
