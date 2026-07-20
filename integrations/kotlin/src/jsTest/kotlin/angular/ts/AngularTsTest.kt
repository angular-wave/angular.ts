package angular.ts

import angular.ts.generated.AnchorScrollService as RawAnchorScrollService
import angular.ts.generated.AnimateService as RawAnimateService
import angular.ts.generated.AnimationHandle as RawAnimationHandle
import angular.ts.generated.Scope as RawScope
import angular.ts.generated.SseConnection as RawSseConnection
import angular.ts.generated.WasmError as RawWasmError
import angular.ts.generated.WebSocketConnection as RawWebSocketConnection
import angular.ts.generated.WebTransportConnection as RawWebTransportConnection
import angular.ts.generated.WebComponentService as RawWebComponentService
import angular.ts.unsafe.UnsafeInterop
import org.w3c.dom.Element
import org.w3c.dom.HTMLElement
import kotlin.js.Promise
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

class AngularTsTest {
    @Test
    fun exposesPackageMarker() {
        assertEquals("angular.ts", ng.marker())
    }

    @Test
    fun createsTypedTokens() {
        val token = ng.token<String>("message")

        assertEquals("message", token.name)
    }

    @Test
    fun tracksInjectionTokens() {
        val first = ng.token<String>("first")
        val second = ng.token<Int>("second")
        val injectable = ng.inject2(first, second) { value, count ->
            value.repeat(count)
        }

        assertEquals(listOf(first, second), injectable.tokens)
        assertEquals("aaa", injectable.factory("a", 3))
    }

    @Test
    fun supportsCommonInjectionArities() {
        val one = ng.token<Int>("one")
        val two = ng.token<Int>("two")
        val three = ng.token<Int>("three")
        val four = ng.token<Int>("four")
        val five = ng.token<Int>("five")
        val six = ng.token<Int>("six")
        val seven = ng.token<Int>("seven")
        val eight = ng.token<Int>("eight")
        val injectable = ng.inject8(one, two, three, four, five, six, seven, eight) {
                a,
                b,
                c,
                d,
                e,
                f,
                g,
                h,
            ->
            a + b + c + d + e + f + g + h
        }

        assertEquals(listOf(one, two, three, four, five, six, seven, eight), injectable.tokens)
        assertEquals(36, injectable.factory(1, 2, 3, 4, 5, 6, 7, 8))
    }

    @Test
    fun createsNamedModule() {
        val app = ng.module("kotlinSmoke")

        assertEquals("kotlinSmoke", app.name)
    }

    @Test
    fun injectsCoreServicesByToken() {
        val injector = ng.injector(listOf("ng"))
        val rootScope = injector.get(rootScopeToken)
        val interpolate = injector.get(interpolateToken)
        val parse = injector.get(parseToken)

        rootScope.merge(js("{message:'Kotlin'}"))

        assertEquals(true, injector.has(rootScopeToken))
        assertEquals("{{", interpolate.startSymbol())
        assertEquals("}}", interpolate.endSymbol())
        assertEquals("Hello Kotlin", interpolate("Hello {{ message }}")?.invoke(rootScope))
        assertEquals("Kotlin", parse("message")(rootScope))
    }

    @Test
    fun wrapsBrowserStorageServices() {
        val injector = ng.injector(listOf("ng"))
        val aria = injector.get(ariaToken)
        val cookie = injector.get(cookieToken)
        val templateCache = injector.get(templateCacheToken)
        val templateRequest = injector.get(templateRequestToken)
        val rawAnchorScroll = js("(function(){})")
        val anchorScroll = AnchorScrollService(rawAnchorScroll.unsafeCast<RawAnchorScrollService>())

        anchorScroll.yOffset = 12
        assertEquals(12, anchorScroll.yOffset)
        assertEquals(true, aria.config("tabindex"))
        assertNotNull(templateRequest)

        val cookieName = "kotlinSmokeCookie"
        cookie.remove(cookieName, CookieOptions(path = "/"))
        cookie.put(cookieName, "ready", CookieOptions(path = "/", sameSite = SameSite.Lax))
        assertEquals("ready", cookie.get(cookieName))
        cookie.remove(cookieName, CookieOptions(path = "/"))

        templateCache.set("kotlin-template.html", "<span>cached</span>")
        assertEquals(true, templateCache.has("kotlin-template.html"))
        assertEquals("<span>cached</span>", templateCache.get("kotlin-template.html"))
        assertEquals(true, templateCache.delete("kotlin-template.html"))

        val backend = object : StorageBackend {
            private val values = mutableMapOf<String, String>()

            override fun get(key: String): String? = values[key]

            override fun set(
                key: String,
                value: String,
            ) {
                values[key] = value
            }

            override fun remove(key: String) {
                values.remove(key)
            }
        }

        backend.set("state", StorageType.Local.raw)
        assertEquals("local", backend.get("state"))
        backend.remove("state")
        assertEquals(null, backend.get("state"))
    }

    @Test
    fun wrapsFilterServices() {
        val injector = ng.injector(listOf("ng"))
        val filter = injector.get(filterToken)

        assertEquals("1,234.5", filter.number(1234.5))
        assertEquals("$1,234.50", filter.currency(1234.5))
        assertEquals("1 day ago", filter.relativeTime(-1, "day"))
        assertEquals("1,234.5", filter("number")(1234.5))

        val entry = EntryFilterItem("name", "AngularTS")
        assertEquals("name", entry.key)
        assertEquals("AngularTS", entry.value)
        assertEquals(
            "meter",
            NumberFilterOptions(intl = mapOf("unit" to "meter")).intl["unit"],
        )
        assertEquals(
            "UTC",
            DateFilterOptions(intl = mapOf("timeZone" to "UTC")).intl["timeZone"],
        )
    }

    @Test
    fun wrapsHttpAndRestServices() {
        val injector = ng.injector(listOf("ng"))
        val serializer = injector.get(httpParamSerializerToken)
        val http = injector.get(httpToken)
        val query = serializer(mapOf("q" to "Kotlin", "page" to 1))

        assertEquals(true, injector.has(httpToken))
        assertEquals(true, injector.has(httpParamSerializerToken))
        assertEquals(true, query.contains("q=Kotlin"))
        assertEquals(true, query.contains("page=1"))
        assertEquals(0, http.pendingRequestsCount)
        assertEquals("GET", HttpMethod.Get.raw)
        assertEquals("json", HttpResponseType.Json.raw)
        assertEquals("complete", HttpResponseStatus.Complete.raw)

        val request = HttpRequestConfig(
            method = HttpMethod.Get,
            url = "/api/items",
            params = mapOf("q" to "Kotlin"),
            responseType = HttpResponseType.Json,
            headers = HttpRequestConfigHeaders(common = mapOf("Accept" to "application/json")),
        )
        val response = HttpResponse(
            data = "ok",
            status = 200,
            headers = mapOf("Content-Type" to "text/plain"),
            config = request,
            statusText = "OK",
            xhrStatus = HttpResponseStatus.Complete,
        )

        assertEquals("/api/items", request.url)
        assertEquals("ok", response.data)
        assertEquals("text/plain", response.headers["Content-Type"])

        val restRequest = RestRequest(
            method = HttpMethod.Get,
            url = "/api/items/7",
            collectionUrl = "/api/items",
            id = 7,
            params = mapOf("expand" to "owner"),
        )
        val restResponse = RestResponse(
            data = "cached",
            source = RestResponseSource.Cache,
            stale = true,
            status = 200,
        )
        val backend = object : RestBackend {
            override fun request(request: RestRequest): Any? =
                RestResponse(data = request.url, source = RestResponseSource.Network)
        }
        val cache = object : RestCacheStore {
            private val values = mutableMapOf<String, RestResponse<*>>()

            override fun get(key: String): Any? = values[key]

            override fun set(
                key: String,
                response: RestResponse<*>,
            ): Any? {
                values[key] = response
                return null
            }

            override fun delete(key: String): Any? {
                values.remove(key)
                return null
            }

            override fun deletePrefix(prefix: String): Any? {
                values.keys.filter { key -> key.startsWith(prefix) }.forEach(values::remove)
                return null
            }
        }
        val cacheOptions = CachedRestBackendOptions(
            network = backend,
            cache = cache,
            strategy = RestCacheStrategy.CacheFirst,
        )

        assertEquals("/api/items/7", restRequest.url)
        assertEquals("cache", restResponse.source?.raw)
        assertEquals("cache-first", cacheOptions.strategy.raw)

        if (injector.has(restToken)) {
            val rest = injector.get(restToken)
            val service = rest<Any, Int>("/api/items/{id}")

            assertNotNull(service)
        }
    }

    @Test
    fun wrapsRouterServicesAndStateDeclarations() {
        val root = js("document.createElement('div')").unsafeCast<HTMLElement>()
        val declaration = StateDeclaration(
            name = "kotlinRouterState",
            url = "/kotlin/{id}",
            data = mapOf("section" to "tests"),
            resolve = mapOf("message" to ng.inject0 { "ready" }),
            views = mapOf(
                "\$default" to ViewDeclaration(
                    template = "<span>{{ message }}</span>",
                    controller = ng.inject0 { ng.viewModel { property("message", "ready") } },
                ),
            ),
        )
        val app = ng.module("kotlinRouterSmoke").router(declaration)

        js("document.body.appendChild(root)")
        val injector = ng.bootstrap(root.unsafeCast<Element>(), listOf(app.name))
        val state = injector.get(stateToken)
        val stateRegistry = injector.get(stateRegistryToken)
        val transitions = injector.get(transitionsToken)

        assertEquals(true, injector.has(stateToken))
        assertEquals(true, injector.has(stateRegistryToken))
        assertEquals(true, injector.has(transitionsToken))
        assertNotNull(state)
        assertNotNull(stateRegistry)
        assertEquals("kotlinRouterState", declaration.name)
        assertEquals("/kotlin/{id}", declaration.url)

        val literal = ResolvableLiteral("answer", ng.inject0 { 42 }, eager = true)
        val redirect = RedirectTo(state = "kotlinRouterState", params = mapOf("id" to 7))
        val module = ng.module("kotlinRouterModule")
            .router(StateDeclaration(name = "kotlinRouterModule.home", redirectTo = redirect))
        val hookDisposer = transitions.onStart(mapOf("to" to "kotlinRouterState")) { transition ->
            assertNotNull(transition)
            null
        }

        assertEquals("answer", literal.token)
        assertEquals(true, literal.eager)
        assertEquals("kotlinRouterState", redirect.state)
        assertEquals("kotlinRouterModule", module.name)

        hookDisposer()
        js("document.body.removeChild(root)")
    }

    @Test
    fun wrapsRealtimeConnectionShapes() {
        val injector = ng.injector(listOf("ng"))
        val sse = injector.get(sseToken)
        val websocket = injector.get(websocketToken)
        val realtimeMessage = RealtimeProtocolMessage(
            html = "<strong>ready</strong>",
            target = "#status",
            swap = SwapMode.InnerHTML,
        )
        val connectionEvent = ConnectionEvent(
            type = "message",
            data = realtimeMessage,
            rawData = "{\"html\":\"ready\"}",
        )

        assertEquals(true, injector.has(sseToken))
        assertEquals(true, injector.has(websocketToken))
        assertNotNull(sse)
        assertNotNull(websocket)
        assertEquals("innerHTML", SwapMode.InnerHTML.raw)
        assertEquals("#status", realtimeMessage.target)
        assertEquals("message", connectionEvent.type)
        assertEquals(realtimeMessage, connectionEvent.data)

        val sseConfig = SseConfig(
            eventTypes = listOf("message", "patch"),
            withCredentials = true,
            params = mapOf("room" to "kotlin"),
        )
        val websocketConfig = WebSocketConfig(
            protocols = listOf("json"),
            eventTypes = listOf("message"),
            onProtocolMessage = { message, _ ->
                assertEquals("none", message.swap?.raw)
            },
        )
        val hash = WebTransportCertificateHash("sha-256", "abc")
        val transportConfig = WebTransportConfig(
            allowPooling = true,
            serverCertificateHashes = listOf(hash),
            reconnect = false,
            retryDelay = { attempt: Int, _: Any? -> attempt * 10 },
        )

        assertEquals(true, sseConfig.withCredentials)
        assertEquals(listOf("json"), websocketConfig.protocols)
        assertEquals("sha-256", hash.algorithm)
        assertEquals(true, transportConfig.allowPooling)

        val sseRaw = js(
            "({connected:false,closed:false,reconnect:function(){this.connected=true},close:function(){this.closed=true}})",
        )
        val socketRaw = js(
            "({connected:false,closed:false,sent:null,reconnect:function(){this.connected=true},send:function(data){this.sent=data},close:function(){this.closed=true}})",
        )
        val transportRaw = js(
            "({closed:null,ready:null,transport:{ready:null,closed:null,datagrams:null,close:function(info){this.closeInfo=info},createBidirectionalStream:function(){return 'native-bi'},createUnidirectionalStream:function(){return 'native-uni'}},close:function(info){this.closeInfo=info},createBidirectionalStream:function(){return 'bi'},sendDatagram:function(data){this.datagram=data;return data},sendText:function(data){this.text=data;return data},sendStream:function(data){this.stream=data;return data}})",
        )
        val sseConnection = SseConnection(sseRaw.unsafeCast<RawSseConnection>())
        val socketConnection = WebSocketConnection(socketRaw.unsafeCast<RawWebSocketConnection>())
        val transportConnection = WebTransportConnection(transportRaw.unsafeCast<RawWebTransportConnection>())

        sseConnection.reconnect()
        sseConnection.close()
        socketConnection.reconnect()
        socketConnection.send("hello")
        socketConnection.close()
        transportConnection.sendDatagram("bytes")
        transportConnection.sendText("text")
        transportConnection.sendStream("stream")
        transportConnection.close("done")

        assertEquals(true, sseRaw.connected)
        assertEquals(true, sseRaw.closed)
        assertEquals("hello", socketRaw.sent)
        assertEquals(true, socketRaw.closed)
        assertEquals("bytes", transportRaw.datagram)
        assertEquals("text", transportRaw.text)
        assertEquals("stream", transportRaw.stream)
        assertEquals("done", transportRaw.closeInfo)

        val token = ng.token<WebSocketConnection>("kotlinSocket")
        val app = ng.module("kotlinRealtimeRegistrations")
            .sse(ng.token<SseConnection>("kotlinEvents"), SseRegistration("/events", sseConfig))
            .websocket(
                token,
                WebSocketRegistration(
                    "/socket",
                    config = websocketConfig.copy(protocols = listOf("json")),
                ),
            )
            .webTransport(
                ng.token<WebTransportConnection>("kotlinTransport"),
                WebTransportRegistration("https://localhost:4433/transport", transportConfig),
            )

        assertEquals("kotlinRealtimeRegistrations", app.name)
        assertEquals("kotlinSocket", token.name)
    }

    @Test
    fun wrapsAnimationServicesAndPresets() {
        val injector = ng.injector(listOf("ng"))
        val element = js("document.createElement('div')").unsafeCast<HTMLElement>()
        val rawHandle = js(
            "({controller:{},finished:{},played:false,paused:false,finishedCalled:false,cancelled:false,completed:null,done:function(cb){this.doneCallback=cb;cb(true)},cancel:function(){this.cancelled=true},finish:function(){this.finishedCalled=true},pause:function(){this.paused=true},play:function(){this.played=true},complete:function(status){this.completed=status},then:function(ok,err){this.thenCalled=true;return ok && ok()}})",
        )
        val rawAnimate = js(
            "({defined:null,cancelled:null,added:null,options:null,define:function(name,preset){this.defined={name:name,preset:preset}},cancel:function(handle){this.cancelled=handle},addClass:function(el,cls,opts){this.added=cls;this.options=opts;if(opts && opts.onStart){opts.onStart(el,{signal:null,phase:'addClass',className:cls})}return rawHandle},removeClass:function(el,cls,opts){return rawHandle},setClass:function(el,add,remove,opts){return rawHandle},enter:function(el,parent,after,opts){return rawHandle},move:function(el,parent,after,opts){return rawHandle},leave:function(el,opts){return rawHandle},animate:function(el,from,to,cls,opts){this.from=from;this.to=to;return rawHandle}})",
        )
        val animate = AnimateService(rawAnimate.unsafeCast<RawAnimateService>())
        var startedPhase: AnimationPhase? = null
        var doneStatus: Boolean? = null
        val options = AnimationOptions(
            duration = 125,
            easing = "ease-out",
            from = mapOf("opacity" to 0),
            to = mapOf("opacity" to 1),
            onStart = { _, context ->
                startedPhase = context.phase
            },
        )
        val preset = AnimationPreset(
            addClass = js("[{opacity:0},{opacity:1}]"),
            options = AnimationOptions(duration = 100),
        )

        animate.define("fade", preset)
        val handle = animate.addClass(element, "visible", options)
        handle.done { ok -> doneStatus = ok }
        handle.play()
        handle.pause()
        handle.finish()
        handle.complete(false)
        handle.cancel()
        handle.then()
        animate.cancel(handle)
        animate.animate(element, mapOf("opacity" to 0), mapOf("opacity" to 1))

        assertEquals(true, injector.has(animateToken))
        assertNotNull(injector.get(animateToken))
        assertEquals("fade", rawAnimate.defined.name)
        assertEquals("visible", rawAnimate.added)
        assertEquals(AnimationPhase.AddClass, startedPhase)
        assertEquals(true, doneStatus)
        assertEquals(true, rawHandle.played)
        assertEquals(true, rawHandle.paused)
        assertEquals(true, rawHandle.finishedCalled)
        assertEquals(false, rawHandle.completed)
        assertEquals(true, rawHandle.cancelled)
        assertEquals(true, rawHandle.thenCalled)
        assertEquals(rawHandle, rawAnimate.cancelled)
        assertEquals("enter", AnimationPhase.Enter.raw)

        val module = ng.module("kotlinAnimationRegistrations")
            .animation("fade", preset)

        assertEquals("kotlinAnimationRegistrations", module.name)
    }

    @Test
    fun wrapsWorkerAndWasmServices() {
        val injector = ng.injector(listOf("ng"))

        assertEquals(true, injector.has(workerToken))
        assertNotNull(injector.get(workerToken))

        val rawWorkerHandle = js(
            "({status:'running',error:undefined,restartCount:0,posted:null,terminated:false,restarted:false,post:function(data){this.posted=data},request:function(data){return Promise.resolve(data)},model:function(){return {}},onMessage:function(listener){this.listener=listener;return function(){}},onError:function(listener){this.errorListener=listener;return function(){}},terminate:function(){this.terminated=true},restart:function(){this.restarted=true}})",
        )
        val rawWorkerService = js("(function(scriptPath, config){ rawWorkerHandle.scriptPath=scriptPath; rawWorkerHandle.serviceConfig=config; return rawWorkerHandle })")
        val worker = WorkerService(rawWorkerService)
        val workerHandle = worker(
            "/worker.js",
            WorkerConfig(
                restart = true,
                restartDelay = 250.0,
                maxRestarts = 4,
                decode = { value -> "out:$value" },
            ),
        )

        workerHandle.post("hello")
        workerHandle.restart()
        workerHandle.terminate()

        assertEquals("/worker.js", rawWorkerHandle.scriptPath)
        assertEquals("hello", rawWorkerHandle.posted)
        assertEquals(true, rawWorkerHandle.restarted)
        assertEquals(true, rawWorkerHandle.terminated)
        assertEquals(true, rawWorkerHandle.serviceConfig.restart)
        assertEquals(250.0, rawWorkerHandle.serviceConfig.restartDelay)
        assertEquals(4, rawWorkerHandle.serviceConfig.maxRestarts)

        val wasmCallState = js("({})")
        val rawBinding = js("({name:'vm',target:null,disposed:false,dispose:function(){this.disposed=true}})")
        val rawResource = js("({source:'/module.wasm',status:'ready',ready:Promise.resolve(null),error:null,instance:{},module:{},exports:{answer:42},disposed:false,dispose:function(){this.disposed=true}})")
        rawResource.bind = { target: dynamic, options: dynamic ->
            rawBinding.target = target
            rawBinding.name = options.name
            Promise.resolve<Any?>(rawBinding)
        }
        val rawWasm = js("({})")
        rawWasm.load = { options: dynamic ->
            wasmCallState.source = options.source
            wasmCallState.imports = options.imports
            wasmCallState.compile = options.compile
            wasmCallState.diagnostics = options.diagnostics
            rawResource
        }
        val wasm = WasmService(rawWasm)
        val rootScope = injector.get(rootScopeToken)
        val resource = wasm.load(
            WasmLoadOptions(
                source = "/module.wasm",
                imports = mapOf("env" to js("({})")),
                compile = WasmCompileOptions(
                    builtins = listOf("js-string"),
                    importedStringConstants = "string_constants",
                ),
                diagnostics = true,
            ),
        )

        assertEquals("/module.wasm", wasmCallState.source)
        assertNotNull(wasmCallState.imports.env)
        assertEquals("js-string", wasmCallState.compile.builtins[0])
        assertEquals("string_constants", wasmCallState.compile.importedStringConstants)
        assertEquals(true, wasmCallState.diagnostics)
        assertEquals(WasmResourceStatus.Ready, resource.status)
        assertEquals(42, resource.exports.answer)
        val binding: Promise<WasmBinding<Any>> =
            resource.bind(rootScope, WasmBindingOptions(name = "vm"))
        val wasmError = WasmError(
            js("({code:'binding',message:'Unable to bind'})").unsafeCast<RawWasmError>(),
        )
        assertNotNull(binding)
        assertEquals(WasmErrorCode.Binding, wasmError.code)
        resource.dispose()
        assertEquals(true, resource.disposed)

        val workerToken = ng.token<WorkerHandle>("kotlinWorker")
        val wasmToken = ng.token<WasmResource>("kotlinWasm")
        val module = ng.module("kotlinWorkerWasmRegistrations")
            .worker(workerToken, WorkerRegistration("/worker.js", WorkerConfig(restart = true)))
            .wasm(wasmToken, WasmLoadOptions("/module.wasm"))

        assertEquals("kotlinWorkerWasmRegistrations", module.name)
        assertEquals("kotlinWorker", workerToken.name)
        assertEquals("kotlinWasm", wasmToken.name)
    }

    @Test
    fun buildsExplicitTemplateViewModel() {
        var initialized = false
        val viewModel = ng.viewModel {
            property("message", "hello")
            method("label") { "ready" }
            onInit { initialized = true }
        }

        viewModel.`$onInit`()

        assertEquals("hello", viewModel.message)
        assertEquals("ready", viewModel.label())
        assertEquals(true, initialized)
    }

    @Test
    fun exposesDocumentedUnsafeInterop() {
        val raw = UnsafeInterop.objectLiteral()

        UnsafeInterop.set(raw, "message", "ready")
        raw.upper = { value: String -> value.uppercase() }

        assertEquals("ready", UnsafeInterop.get(raw, "message"))
        assertEquals("READY", UnsafeInterop.call(raw, "upper", "ready"))
        assertEquals("ready", UnsafeInterop.cast<dynamic>(raw).message)
    }

    @Test
    fun wrapsAppComponentAndWebComponentServices() {
        val host = js("document.createElement('kotlin-card')").unsafeCast<HTMLElement>()
        val rawScope = js("({message:'ready'})")
        val rawContext = js("({host:host,injector:{},root:host,shadowRoot:null,dispatched:null,dispatch:function(name,detail,init){this.dispatched={name:name,detail:detail,init:init};return true}})")
        rawContext.scope = rawScope
        var connectedMessage: String? = null
        var disconnected = false
        var changedName: String? = null
        var cleanupCalled = false
        val component = AppComponent<Any>(
            template = "<span>{{ message }}</span>",
            shadow = true,
            scope = { js("({message:'ready'})").unsafeCast<Any>() },
            isolate = true,
            inputs = mapOf(
                "message" to inputString(attribute = "message", defaultValue = "ready", reflect = true),
                "count" to inputNumber(defaultValue = 1),
                "enabled" to inputBoolean(defaultValue = true),
                "custom" to inputCustom({ value -> "custom:$value" }),
            ),
            connected = { context ->
                connectedMessage = context.scope.unsafe.message.unsafeCast<String>()
                context.dispatch(WebComponentEvent("ready", connectedMessage))
                val cleanup = { cleanupCalled = true }
                cleanup
            },
            disconnected = {
                disconnected = true
            },
            attributeChanged = { name, _, _, _ ->
                changedName = name
            },
        )
        val rawOptions = component.toJs()
        val cleanup = callJsFunction(rawOptions.connected, null, arrayOf(rawContext)).unsafeCast<() -> Unit>()

        callJsFunction(rawOptions.attributeChanged, null, arrayOf("message", "old", "new", rawContext))
        callJsFunction(rawOptions.disconnected, null, arrayOf(rawContext))
        cleanup()

        assertEquals(true, rawOptions.shadow)
        assertEquals(true, rawOptions.isolate)
        assertEquals("message", rawOptions.inputs.message.attribute)
        assertEquals("ready", rawOptions.inputs.message.default)
        assertEquals(true, rawOptions.inputs.message.reflect)
        assertEquals("ready", connectedMessage)
        assertEquals("ready", rawContext.dispatched.detail)
        assertEquals("message", changedName)
        assertEquals(true, disconnected)
        assertEquals(true, cleanupCalled)

        val rawConstructor = js("(function KotlinElement(){})")
        val rawService = js("({definedApp:null,definedElement:null,created:null,defineAppComponent:function(name,options){this.definedApp={name:name,options:options};return rawConstructor},defineElement:function(name,elementClass){this.definedElement={name:name,elementClass:elementClass};return elementClass},createElementScope:function(host,state,options){this.created={host:host,state:state,options:options};return state}})")
        val service = WebComponentService(rawService.unsafeCast<RawWebComponentService>())
        val constructor = service.defineAppComponent("kotlin-card", component)
        val definedElement = service.defineElement("kotlin-native-card", constructor)
        val initialState = js("({message:'created'})").unsafeCast<Any>()
        val createdScope = service.createElementScope(host, initialState, ElementScopeOptions(isolate = true))

        assertEquals("kotlin-card", rawService.definedApp.name)
        assertEquals("kotlin-native-card", rawService.definedElement.name)
        assertEquals(rawConstructor, definedElement.raw)
        assertEquals("created", createdScope.unsafe.message)
        assertEquals(true, rawService.created.options.isolate)

        var configuredModuleName: String? = null
        var configuredVersion: String? = null
        val elementModule = AngularElementModuleOptions(
            name = "kotlinElementModule",
            requires = listOf("dep"),
            configure = { module, angular ->
                configuredModuleName = module.name
                configuredVersion = angular.version
            },
        )
        val rawElementModule = elementModule.toJs()

        callJsFunction(rawElementModule.configure, null, arrayOf(js("({name:'kotlinElementModule'})"), js("({version:'0.27.0'})")))

        val elementOptions = AngularElementOptions(
            component = component,
            ngModule = js("({name:'kotlinNg'})"),
            elementModule = elementModule,
            subapp = true,
            registerBuiltins = false,
            extra = mapOf("mode" to "test"),
        )
        val rawElementOptions = elementOptions.toJs()
        val rawDefinition = js("({angular:{version:'0.27.0'},ngModule:{name:'kotlinNg'},elementModule:{name:'kotlinElementModule'},injector:{has:function(name){return name === '\$webComponent'},get:function(name){return name}},element:rawConstructor,name:'kotlin-card'})")
        val definition = AngularElementDefinition.unsafe(rawDefinition)

        assertEquals("kotlinElementModule", configuredModuleName)
        assertEquals("0.27.0", configuredVersion)
        assertEquals("dep", rawElementModule.requires[0])
        assertEquals("test", rawElementOptions.mode)
        assertEquals("kotlinNg", rawElementOptions.ngModule.name)
        assertEquals("kotlin-card", definition.name)
        assertEquals("kotlinElementModule", definition.elementModule.name)
        assertEquals(true, definition.injector.has(webComponentToken))
    }

    @Test
    fun wrapsScopeOperations() {
        var destroyed = false
        var watchedExpression = ""
        var eventName = ""
        val raw = js("{}")

        raw.`$watch` = { expression: String, listener: dynamic, lazy: Boolean ->
            watchedExpression = expression
            listener("new", raw)
            assertEquals(true, lazy)
            ({ destroyed = true }).unsafeCast<dynamic>()
        }
        raw.`$on` = { name: String, listener: dynamic ->
            eventName = name
            listener("event")
            ({}).unsafeCast<dynamic>()
        }
        raw.`$emit` = { name: String, value: String -> "$name:$value" }
        raw.`$broadcast` = { name: String, value: String -> "$name:$value" }
        raw.`$merge` = { value: dynamic ->
            raw.merged = value
        }
        raw.`$destroy` = {
            destroyed = true
        }
        raw.`$new` = { raw }
        raw.`$newIsolate` = { raw }

        val scope = Scope<Any>(raw.unsafeCast<RawScope>())
        var observed: Any? = null
        val disposer = scope.watch("message", lazy = true) { value, _ ->
            observed = value
        }

        assertEquals("message", watchedExpression)
        assertEquals("new", observed)
        assertNotNull(disposer)

        scope.on("ready") {}
        assertEquals("ready", eventName)
        assertEquals("change:value", scope.emit("change", "value"))
        assertEquals("fanout:value", scope.broadcast("fanout", "value"))

        scope.merge(js("{merged:true}"))
        assertEquals(true, raw.merged.merged)
        assertEquals(scope.unsafe, scope.child().unsafe)
        assertEquals(scope.unsafe, scope.isolateChild().unsafe)

        disposer()
        assertEquals(true, destroyed)
    }

    @Test
    fun registersModuleEntries() {
        val message = ng.token<String>("message")
        val app = ng.module("kotlinRegistrations")

        app
            .value(message, "hello")
            .factory(message, ng.inject0 { "factory" })
            .service(message, ng.inject0 { "service" })
            .controller("MessageController", ng.inject1(message) { value -> value })
            .component(
                "messageCard",
                Component<String>(
                    template = "<p>{{ \$ctrl.message }}</p>",
                    controller = ng.inject1(message) { value ->
                        ng.viewModel {
                            property("message", value)
                        }.unsafeCast<String>()
                    },
                    bindings = mapOf("message" to "<"),
                ),
            )
            .directive(
                "messageBadge",
                Directive<Unit>(
                    template = "<span>badge</span>",
                    restrict = DirectiveRestrict.Element,
                    postLink = { scope, _, _, _ ->
                        scope.unsafe.linked = true
                    },
                ),
            )
            .appComponent(
                "message-card",
                AppComponent<Unit>(
                    template = "<span>{{ message }}</span>",
                    shadow = true,
                    inputs = mapOf("message" to WebComponentInput(attribute = "message")),
                ),
            )

        assertEquals("kotlinRegistrations", app.name)
    }

    @Test
    fun rendersComponentAndLinksDirective() {
        val root = js("document.createElement('div')").unsafeCast<HTMLElement>()

        js("document.body.appendChild(root)")
        root.innerHTML = "<kotlin-hello></kotlin-hello><section kotlin-linked></section>"

        val app = ng.module("kotlinRenderSmoke")

        app
            .component(
                "kotlinHello",
                Component<Any>(
                    template = "<strong>{{ \$ctrl.message }}</strong>",
                    controller = ng.inject0 {
                        ng.viewModel {
                            property("message", "Hello Kotlin")
                        }.unsafeCast<Any>()
                    },
                ),
            )
            .directive(
                "kotlinLinked",
                Directive<Unit>(
                    restrict = DirectiveRestrict.Attribute,
                    postLink = { _, element, _, _ ->
                        element.setAttribute("data-linked", "yes")
                    },
                ),
            )

        val injector = ng.bootstrap(root.unsafeCast<Element>(), listOf(app.name))
        injector.raw.get("\$rootScope").`$handler`._flushScheduledTasks()

        assertEquals("Hello Kotlin", root.querySelector("strong")?.textContent)
        assertEquals("yes", root.querySelector("section")?.getAttribute("data-linked"))

        js("document.body.removeChild(root)")
    }
}
