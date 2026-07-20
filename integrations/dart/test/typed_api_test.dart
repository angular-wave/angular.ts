import 'dart:js_interop';
import 'dart:js_interop_unsafe';

import 'package:angular_ts/angular_ts.dart' as ng;
import 'package:test/test.dart';
import 'package:web/web.dart';

final class ApiService {
  const ApiService();
}

final class ApiEntity {
  const ApiEntity(this.raw);

  final Object? raw;
}

final class DemoController {
  const DemoController(this.api);

  final ApiService api;
}

final class LifecycleController with ng.Controller {}

void main() {
  test('typed DI helpers preserve token parameter types', () {
    final api = ng.token<ApiService>('api');
    final factory = ng.inject1(api, DemoController.new);

    expect(factory.tokens.single.name, 'api');
  });

  test('public ng namespace parity types are exported', () {
    const date = ng.DateFilterOptions(
      dateStyle: 'medium',
      timeZone: 'UTC',
    );
    const number = ng.NumberFilterOptions(
      style: 'unit',
      unit: 'meter',
      maximumFractionDigits: 2,
    );
    const currency = ng.CurrencyFilterOptions(
      currency: 'USD',
      currencyDisplay: 'symbol',
      minimumFractionDigits: 2,
    );
    const relativeTime = ng.RelativeTimeFilterOptions(
      numeric: 'auto',
      style: 'short',
    );
    const animation = ng.AnimationOptions(
      animation: 'fade',
      duration: 250,
      easing: 'ease-out',
      fill: 'both',
    );
    const errorHandling = ng.ErrorHandlingConfig(objectMaxDepth: 3);
    const worker = ng.WorkerConfig(
      restart: true,
      restartDelay: 250,
      maxRestarts: 4,
    );
    JSPromise<JSAny?> promise() {
      return Future<JSAny?>.value(JSObject()).toJS;
    }

    final animateServiceRaw = JSObject()
      ..setProperty('cancel'.toJS, (([JSAny? _]) => null).toJS)
      ..setProperty('define'.toJS, ((JSAny? _, JSAny? __) => null).toJS)
      ..setProperty(
        'enter'.toJS,
        ((JSAny? _, [JSAny? __, JSAny? ___, JSAny? ____]) => JSObject()).toJS,
      )
      ..setProperty(
        'move'.toJS,
        ((JSAny? _, JSAny? __, [JSAny? ___, JSAny? ____]) => JSObject()).toJS,
      )
      ..setProperty('leave'.toJS, ((JSAny? _, [JSAny? __]) => JSObject()).toJS)
      ..setProperty(
        'addClass'.toJS,
        ((JSAny? _, JSAny? __, [JSAny? ___]) => JSObject()).toJS,
      )
      ..setProperty(
        'removeClass'.toJS,
        ((JSAny? _, JSAny? __, [JSAny? ___]) => JSObject()).toJS,
      )
      ..setProperty(
        'setClass'.toJS,
        ((JSAny? _, JSAny? __, JSAny? ___, [JSAny? ____]) => JSObject()).toJS,
      )
      ..setProperty(
        'animate'.toJS,
        ((JSAny? _, JSAny? __, [JSAny? ___, JSAny? ____, JSAny? _____]) =>
            JSObject()).toJS,
      )
      ..setProperty('transition'.toJS, ((JSAny? _) => promise()).toJS);
    final animateService = ng.AnimateService(animateServiceRaw);
    final anchorServiceRaw = JSObject()..setProperty('yOffset'.toJS, 10.toJS);
    final anchorService = ng.AnchorScrollService(anchorServiceRaw);
    final ariaServiceRaw = JSObject()
      ..setProperty('config'.toJS, ((JSAny? _) => true.toJS).toJS);
    final ariaService = ng.AriaService(ariaServiceRaw);
    final interpolateServiceRaw = JSObject()
      ..setProperty('startSymbol'.toJS, (() => '{{'.toJS).toJS)
      ..setProperty('endSymbol'.toJS, (() => '}}'.toJS).toJS);
    final interpolateService = ng.InterpolateService(interpolateServiceRaw);
    final injectorRaw = JSObject()
      ..setProperty('get'.toJS, ((JSAny? name) => name).toJS)
      ..setProperty('has'.toJS, ((JSAny? _) => true.toJS).toJS)
      ..setProperty('invoke'.toJS,
          ((JSAny? fn, [JSAny? _, JSAny? __, JSAny? ___]) => fn).toJS)
      ..setProperty('instantiate'.toJS,
          ((JSAny? type, [JSAny? _, JSAny? __]) => type).toJS)
      ..setProperty('loadNewModules'.toJS, ((JSAny? _) => null).toJS);
    final injector = ng.InjectorService(injectorRaw);
    final httpRaw = JSObject()
      ..setProperty('defaults'.toJS, JSObject())
      ..setProperty('pendingRequests'.toJS, <JSObject>[].toJS)
      ..setProperty('get'.toJS, ((JSAny? _, [JSAny? __]) => promise()).toJS)
      ..setProperty(
        'delete'.toJS,
        ((JSAny? _, [JSAny? __]) => promise()).toJS,
      )
      ..setProperty('head'.toJS, ((JSAny? _, [JSAny? __]) => promise()).toJS)
      ..setProperty(
        'post'.toJS,
        ((JSAny? _, JSAny? __, [JSAny? ___]) => promise()).toJS,
      )
      ..setProperty(
        'put'.toJS,
        ((JSAny? _, JSAny? __, [JSAny? ___]) => promise()).toJS,
      )
      ..setProperty(
        'patch'.toJS,
        ((JSAny? _, JSAny? __, [JSAny? ___]) => promise()).toJS,
      );
    final http = ng.HttpService(httpRaw);
    final locationServiceRaw = JSObject()
      ..setProperty('appBase'.toJS, 'https://example.test/app/'.toJS)
      ..setProperty('appBaseNoFile'.toJS, 'https://example.test/'.toJS)
      ..setProperty('html5'.toJS, true.toJS)
      ..setProperty('basePrefix'.toJS, '/app'.toJS)
      ..setProperty('hashPrefix'.toJS, '#!'.toJS)
      ..setProperty('absUrl'.toJS, 'https://example.test/app/home'.toJS)
      ..setProperty('setUrl'.toJS, ((JSAny? _) => null).toJS)
      ..setProperty('getUrl'.toJS, (() => '/home'.toJS).toJS)
      ..setProperty('url'.toJS, (([JSAny? url]) => url ?? '/home'.toJS).toJS)
      ..setProperty('setPath'.toJS, ((JSAny? _) => null).toJS)
      ..setProperty('getPath'.toJS, (() => '/home'.toJS).toJS)
      ..setProperty('path'.toJS, (([JSAny? path]) => path ?? '/home'.toJS).toJS)
      ..setProperty('setHash'.toJS, ((JSAny? _) => null).toJS)
      ..setProperty('getHash'.toJS, (() => 'top'.toJS).toJS)
      ..setProperty('hash'.toJS, (([JSAny? hash]) => hash ?? 'top'.toJS).toJS)
      ..setProperty('setSearch'.toJS, ((JSAny? _, [JSAny? __]) => null).toJS)
      ..setProperty('getSearch'.toJS, JSObject.new.toJS)
      ..setProperty('search'.toJS,
          (([JSAny? search, JSAny? _]) => search ?? JSObject()).toJS)
      ..setProperty('setState'.toJS, ((JSAny? _) => null).toJS)
      ..setProperty('getState'.toJS, (() => 'state'.toJS).toJS)
      ..setProperty(
          'state'.toJS, (([JSAny? state]) => state ?? 'state'.toJS).toJS)
      ..setProperty(
          'parseLinkUrl'.toJS, ((JSAny? _, JSAny? __) => true.toJS).toJS)
      ..setProperty('parse'.toJS, ((JSAny? _) => null).toJS);
    final locationService = ng.LocationService(locationServiceRaw);
    final sceServiceRaw = JSObject()
      ..setProperty(
        'getTrusted'.toJS,
        ((JSAny? _, JSAny? value) => value).toJS,
      )
      ..setProperty('getTrustedHtml'.toJS, ((JSAny? value) => value).toJS)
      ..setProperty('getTrustedMediaUrl'.toJS, ((JSAny? value) => value).toJS)
      ..setProperty(
        'getTrustedResourceUrl'.toJS,
        ((JSAny? value) => value).toJS,
      )
      ..setProperty('getTrustedUrl'.toJS, ((JSAny? value) => value).toJS)
      ..setProperty('parse'.toJS, ((JSAny? _, JSAny? expr) => expr).toJS)
      ..setProperty('parseAsHtml'.toJS, ((JSAny? expr) => expr).toJS)
      ..setProperty('parseAsMediaUrl'.toJS, ((JSAny? expr) => expr).toJS)
      ..setProperty('parseAsResourceUrl'.toJS, ((JSAny? expr) => expr).toJS)
      ..setProperty('parseAsUrl'.toJS, ((JSAny? expr) => expr).toJS)
      ..setProperty('trustAs'.toJS, ((JSAny? _, JSAny? value) => value).toJS)
      ..setProperty('trustAsHtml'.toJS, ((JSAny? value) => value).toJS)
      ..setProperty('trustAsMediaUrl'.toJS, ((JSAny? value) => value).toJS)
      ..setProperty('trustAsResourceUrl'.toJS, ((JSAny? value) => value).toJS)
      ..setProperty('trustAsUrl'.toJS, ((JSAny? value) => value).toJS)
      ..setProperty('isEnabled'.toJS, (() => true.toJS).toJS)
      ..setProperty('valueOf'.toJS, (([JSAny? value]) => value).toJS);
    final sceService = ng.SceService(sceServiceRaw);
    final sceDelegateServiceRaw = JSObject()
      ..setProperty(
        'getTrusted'.toJS,
        ((JSAny? _, JSAny? value) => value).toJS,
      )
      ..setProperty('trustAs'.toJS, ((JSAny? _, JSAny? value) => value).toJS)
      ..setProperty('valueOf'.toJS, (([JSAny? value]) => value).toJS);
    final sceDelegateService = ng.SceDelegateService(sceDelegateServiceRaw);
    final elementConstructor = (() => null).toJS;
    final webComponentServiceRaw = JSObject()
      ..setProperty(
        'defineAppComponent'.toJS,
        ((JSAny? _, JSAny? __) => elementConstructor).toJS,
      )
      ..setProperty(
        'defineElement'.toJS,
        ((JSAny? _, JSAny? __) => (() => null).toJS).toJS,
      )
      ..setProperty(
        'createElementScope'.toJS,
        ((JSAny? _, [JSAny? __, JSAny? ___]) => JSObject()).toJS,
      );
    final webComponentService = ng.WebComponentService(webComponentServiceRaw);
    final scope = ng.Scope<Object?>.unsafe(JSObject());
    final wasmBindingRaw = JSObject()
      ..setProperty('name'.toJS, 'demo'.toJS)
      ..setProperty('target'.toJS, scope.raw)
      ..setProperty('disposed'.toJS, false.toJS)
      ..setProperty('dispose'.toJS, (() => null).toJS);
    final wasmBinding = ng.WasmBinding<Object?>(wasmBindingRaw);
    final wasmErrorRaw = JSObject()
      ..setProperty('code'.toJS, 'binding'.toJS)
      ..setProperty('message'.toJS, 'Unable to bind'.toJS);
    final wasmError = ng.WasmError(wasmErrorRaw);
    final wasmResourceRaw = JSObject()
      ..setProperty('source'.toJS, '/demo.wasm'.toJS)
      ..setProperty('status'.toJS, 'ready'.toJS)
      ..setProperty('ready'.toJS, promise())
      ..setProperty('instance'.toJS, JSObject())
      ..setProperty('module'.toJS, JSObject())
      ..setProperty('exports'.toJS, JSObject())
      ..setProperty('disposed'.toJS, false.toJS)
      ..setProperty(
        'bind'.toJS,
        ((JSAny? _, [JSAny? __]) => Future<JSAny?>.value(wasmBindingRaw).toJS)
            .toJS,
      )
      ..setProperty('dispose'.toJS, (() => null).toJS);
    final wasmRaw = JSObject()
      ..setProperty('load'.toJS, ((JSAny? _) => wasmResourceRaw).toJS);
    final wasm = ng.WasmService(wasmRaw);
    final streamRaw = JSObject()
      ..setProperty('isReadableStream'.toJS, ((JSAny? _) => true.toJS).toJS)
      ..setProperty(
        'consumeText'.toJS,
        ((JSAny? _, [JSAny? __]) => promise()).toJS,
      )
      ..setProperty(
        'readText'.toJS,
        ((JSAny? _, [JSAny? __]) => promise()).toJS,
      )
      ..setProperty(
        'readLines'.toJS,
        ((JSAny? _, [JSAny? __]) => promise()).toJS,
      )
      ..setProperty(
        'consumeJsonLines'.toJS,
        ((JSAny? _, [JSAny? __]) => promise()).toJS,
      )
      ..setProperty(
        'readJsonLines'.toJS,
        ((JSAny? _, [JSAny? __]) => promise()).toJS,
      );
    final stream = ng.StreamService(streamRaw);
    final transitionServiceRaw = JSObject();
    final transitionHook =
        ((JSAny? _, JSAny? __, [JSAny? ___]) => (() => null).toJS).toJS;
    transitionServiceRaw
      ..setProperty('onBefore'.toJS, transitionHook)
      ..setProperty('onStart'.toJS, transitionHook)
      ..setProperty('onEnter'.toJS, transitionHook)
      ..setProperty('onRetain'.toJS, transitionHook)
      ..setProperty('onExit'.toJS, transitionHook)
      ..setProperty('onFinish'.toJS, transitionHook)
      ..setProperty('onSuccess'.toJS, transitionHook)
      ..setProperty('onError'.toJS, transitionHook);
    final transitionService = ng.TransitionsService(transitionServiceRaw);
    final transitionRaw = JSObject()
      ..setProperty('run'.toJS, (() => 'done'.toJS).toJS);
    final transition = ng.Transition(transitionRaw);
    const elementModule = ng.AngularElementModuleOptions(name: 'demo');
    const elementOptions = ng.AngularElementOptions<Object>(
      component: ng.AppComponent<Object>(template: '<span></span>'),
      subapp: true,
      registerBuiltins: false,
    );
    const model = ng.NgModelOptions(updateOn: 'blur');
    const state = ng.StateDeclaration(
      name: 'home',
      url: '/home',
      component: 'homePage',
      abstractState: false,
      dynamicState: true,
      data: {'title': 'Home'},
    );
    const httpDefaults = ng.HttpDefaults(
      cache: true,
      transformRequest: 'requestTransform',
      transformResponse: 'responseTransform',
    );
    const shortcut = ng.HttpRequestOptions(
      defaults: httpDefaults,
      headers:
          ng.HttpRequestConfigHeaders(common: {'Accept': 'application/json'}),
      withCredentials: true,
      paramSerializer: r'$httpParamSerializer',
      params: {'page': 1},
      responseType: ng.HttpResponseType.json,
    );
    const request = ng.HttpRequestConfig(
      method: ng.HttpMethod.get,
      url: '/api/entity',
      shortcut: shortcut,
      cache: false,
      data: {'active': true},
      timeout: 1000,
      xsrfHeaderName: 'X-XSRF-TOKEN',
    );
    final entityClass = ApiEntity.new;
    const response = ng.RestResponse<String>(
      data: 'ok',
      status: 200,
      headers: {'content-type': 'application/json'},
      config: request,
      statusText: 'OK',
      xhrStatus: ng.HttpResponseStatus.complete,
    );
    const cookie = ng.CookieOptions(samesite: ng.SameSite.lax);
    final sse = ng.SseConfig(
      eventTypes: const ['message'],
      transformMessage: (data) => data,
    );
    final websocket = ng.WebSocketConfig(
      maxRetries: 1,
      transformMessage: (data) => data,
    );
    final webTransport = ng.WebTransportConfig(
      allowPooling: true,
      congestionControl: 'low-latency',
      retryDelay: 250,
      transformDatagram: (data) => data,
    );
    const realtime = ng.RealtimeProtocolMessage(
      html: '<p>Updated</p>',
      target: '#message',
      swap: ng.SwapMode.outerHTML,
    );
    const eventDetail = ng.RealtimeProtocolEventDetail<String, Object>(
      data: 'ready',
      url: '/events',
    );
    final ng.ControllerConstructor<LifecycleController> constructor =
        LifecycleController.new;
    final element = document.createElement('div') as HTMLElement;

    expect(date.toMap()['dateStyle'], 'medium');
    expect(number.toMap()['unit'], 'meter');
    expect(currency.toMap()['currency'], 'USD');
    expect(currency.toMap()['currencyDisplay'], 'symbol');
    expect(relativeTime.toMap()['numeric'], 'auto');
    expect(animation.duration, 250);
    expect(animation.fill, 'both');
    expect(errorHandling.toMap()['objectMaxDepth'], 3);
    expect(worker.restart, isTrue);
    expect(worker.restartDelay, 250);
    expect(worker.maxRestarts, 4);
    animateService.cancel();
    animateService.cancel(JSObject());
    animateService.define('fade', const ng.AnimationPreset(options: animation));
    expect(animateService.enter(element), isNotNull);
    expect(animateService.enter(element, document.body, null, animation),
        isNotNull);
    expect(animateService.move(element, document.body), isNotNull);
    expect(animateService.move(element, document.body, null, animation),
        isNotNull);
    expect(animateService.leave(element), isNotNull);
    expect(animateService.leave(element, animation), isNotNull);
    expect(animateService.addClass(element, 'active'), isNotNull);
    expect(animateService.addClass(element, 'active', animation), isNotNull);
    expect(animateService.removeClass(element, 'active'), isNotNull);
    expect(animateService.removeClass(element, 'active', animation), isNotNull);
    expect(animateService.setClass(element, 'active', 'idle'), isNotNull);
    expect(
      animateService.setClass(element, 'active', 'idle', animation),
      isNotNull,
    );
    expect(animateService.animate(element, {'opacity': 0}), isNotNull);
    expect(
      animateService.animate(
        element,
        {'opacity': 0},
        {'opacity': 1},
        'fade',
        animation,
      ),
      isNotNull,
    );
    expect(animateService.transition((() => null).toJS), isNotNull);
    expect(anchorService.yOffset, isNotNull);
    anchorService.yOffset = 24;
    expect(anchorService.yOffset, isNotNull);
    expect(ariaService.config('ariaHidden'), isTrue);
    expect(interpolateService.startSymbol(), '{{');
    expect(interpolateService.endSymbol(), '}}');
    expect(injector.get('service'), isNotNull);
    expect(injector.has('service'), isTrue);
    expect(injector.invoke('fn'), isNotNull);
    expect(injector.instantiate('Type'), isNotNull);
    injector.loadNewModules(['lazy']);
    expect(http.defaults, isNotNull);
    http.defaults = const ng.HttpDefaults(withCredentials: true);
    expect(http.defaults, isNotNull);
    expect(http.pendingRequests, isNotNull);
    http.pendingRequests = [];
    expect(http.get('/api'), isNotNull);
    expect(http.get('/api', const ng.HttpRequestOptions()), isNotNull);
    expect(http.delete('/api/1'), isNotNull);
    expect(http.head('/api'), isNotNull);
    expect(http.post('/api', {'name': 'demo'}), isNotNull);
    expect(http.put('/api/1', {'name': 'demo'}), isNotNull);
    expect(http.patch('/api/1', {'name': 'demo'}), isNotNull);
    expect(locationService.appBase, 'https://example.test/app/');
    locationService.appBase = 'https://example.test/new/';
    expect(locationService.appBase, 'https://example.test/new/');
    expect(locationService.appBaseNoFile, 'https://example.test/');
    expect(locationService.html5, isTrue);
    locationService.html5 = false;
    expect(locationService.html5, isFalse);
    expect(locationService.basePrefix, '/app');
    expect(locationService.hashPrefix, '#!');
    expect(locationService.absUrl, 'https://example.test/app/home');
    expect(locationService.setUrl('/home'), locationService);
    expect(locationService.getUrl(), '/home');
    expect(locationService.url(), isNotNull);
    expect(locationService.url('/next'), isNotNull);
    expect(locationService.setPath('/home'), locationService);
    expect(locationService.getPath(), '/home');
    expect(locationService.path(), isNotNull);
    expect(locationService.path(null), isNotNull);
    expect(locationService.setHash('top'), locationService);
    expect(locationService.getHash(), 'top');
    expect(locationService.hash(), isNotNull);
    expect(locationService.hash(null), isNotNull);
    expect(locationService.setSearch({'q': 'term'}), locationService);
    expect(locationService.getSearch(), isNotNull);
    expect(locationService.search(), isNotNull);
    expect(locationService.search('q', 'term'), isNotNull);
    expect(locationService.setState({'id': 1}), locationService);
    expect(locationService.getState(), isNotNull);
    expect(locationService.state(), isNotNull);
    expect(locationService.state(null), isNotNull);
    expect(locationService.parseLinkUrl('/home', '/home'), isTrue);
    locationService.parse('/home');
    expect(sceService.getTrusted('html', 'safe'), isNotNull);
    expect(sceService.getTrustedHtml('safe'), isNotNull);
    expect(sceService.getTrustedMediaUrl('safe'), isNotNull);
    expect(sceService.getTrustedResourceUrl('safe'), isNotNull);
    expect(sceService.getTrustedUrl('safe'), isNotNull);
    expect(sceService.parse('html', 'expr'), isNotNull);
    expect(sceService.parseAsHtml('expr'), isNotNull);
    expect(sceService.parseAsMediaUrl('expr'), isNotNull);
    expect(sceService.parseAsResourceUrl('expr'), isNotNull);
    expect(sceService.parseAsUrl('expr'), isNotNull);
    expect(sceService.trustAs('html', 'safe'), isNotNull);
    expect(sceService.trustAsHtml('safe'), isNotNull);
    expect(sceService.trustAsMediaUrl('safe'), isNotNull);
    expect(sceService.trustAsResourceUrl('safe'), isNotNull);
    expect(sceService.trustAsUrl('safe'), isNotNull);
    expect(sceService.isEnabled(), isTrue);
    expect(sceService.valueOf('safe'), isNotNull);
    expect(sceDelegateService.getTrusted('html', 'safe'), isNotNull);
    expect(sceDelegateService.trustAs('html', 'safe'), isNotNull);
    expect(sceDelegateService.valueOf('safe'), isNotNull);
    expect(
      webComponentService.defineAppComponent(
        'x-demo-app',
        const ng.AppComponent<Object>(template: '<span></span>'),
      ),
      isNotNull,
    );
    expect(
      webComponentService.defineElement(
        'x-demo-element',
        elementConstructor,
      ),
      isNotNull,
    );
    expect(webComponentService.createElementScope<Object?>(element), isNotNull);
    expect(
      webComponentService.createElementScope<Object?>(
        element,
        {'ready': true},
        const ng.ElementScopeOptions(isolate: true),
      ),
      isNotNull,
    );
    final wasmResource = wasm.load(
      const ng.WasmLoadOptions(
        source: '/demo.wasm',
        compile: ng.WasmCompileOptions(builtins: ['js-string']),
        diagnostics: true,
      ),
    );
    final Future<ng.WasmBinding<Object?>> binding = wasmResource.bind(
      scope,
      const ng.WasmBindingOptions(name: 'demo'),
    );
    expect(wasmResource.status, ng.WasmResourceStatus.ready);
    expect(wasmResource.source, isNotNull);
    expect(wasmBinding.target.raw, same(scope.raw));
    expect(wasmError.code, ng.WasmErrorCode.binding);
    expect(binding, isA<Future<ng.WasmBinding<Object?>>>());
    final readableStream = ReadableStream();
    expect(stream.isReadableStream(readableStream), isTrue);
    expect(stream.consumeText(readableStream), isNotNull);
    expect(
        stream.consumeText(readableStream, {'encoding': 'utf-8'}), isNotNull);
    expect(stream.readText(readableStream), isNotNull);
    expect(stream.readLines(readableStream), isNotNull);
    expect(stream.consumeJsonLines(readableStream), isNotNull);
    expect(stream.readJsonLines(readableStream), isNotNull);
    expect(transitionService.onBefore({}, (() => null).toJS), isNotNull);
    expect(transitionService.onStart({}, (() => null).toJS), isNotNull);
    expect(transitionService.onEnter({}, (() => null).toJS), isNotNull);
    expect(transitionService.onRetain({}, (() => null).toJS), isNotNull);
    expect(transitionService.onExit({}, (() => null).toJS), isNotNull);
    expect(transitionService.onFinish({}, (() => null).toJS), isNotNull);
    expect(transitionService.onSuccess({}, (() => null).toJS), isNotNull);
    expect(transitionService.onError({}, (() => null).toJS), isNotNull);
    expect(transition.run(), isNotNull);
    expect(elementModule.name, 'demo');
    expect(elementOptions.subapp, isTrue);
    expect(elementOptions.registerBuiltins, isFalse);
    expect(model.updateOn, 'blur');
    expect(state.name, 'home');
    expect(state.component, 'homePage');
    expect(state.dynamicState, isTrue);
    expect(httpDefaults.toMap()['transformRequest'], 'requestTransform');
    expect(shortcut.toMap()['withCredentials'], isTrue);
    expect(request.cache, isFalse);
    expect(request.xsrfHeaderName, 'X-XSRF-TOKEN');
    expect(entityClass({'id': 1}).raw, {'id': 1});
    expect(response.status, 200);
    expect(response.xhrStatus, ng.HttpResponseStatus.complete);
    expect(cookie.samesite?.value, 'Lax');
    expect(sse.eventTypes, ['message']);
    expect(websocket.maxRetries, 1);
    expect(webTransport.allowPooling, isTrue);
    expect(webTransport.retryDelay, 250);
    expect(realtime.swap?.value, 'outerHTML');
    expect(eventDetail.url, '/events');
    expect(constructor(), isA<LifecycleController>());
  });
}
