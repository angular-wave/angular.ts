/**
 * @externs
 * Public externs for AngularTS applications compiled with Google Closure.
 *
 * This file is generated from src/namespace.ts by
 * integrations/closure/scripts/generate-externs.mjs. Browser-native aliases
 * reuse Closure Compiler's built-in browser externs instead of duplicating DOM
 * API surfaces under the public ng namespace.
 */

/** @const */
var angular = {};

/** @const Closure mirror of AngularTS's public TypeScript ng namespace. */
var ng = {};

/**
 * Retrieve or create an AngularTS module.
 * @param {string} name
 * @param {!Array<string>=} requires
 * @return {!ng.NgModule}
 */
angular.module = function(name, requires) {};

/**
 * AngularTS runtime instance used to create modules, bootstrap DOM trees, create injectors, and recover scopes from native elements.
 * @constructor
 */
ng.Angular = function() {};

/**
 * Sub-application instances created when multiple `ng-app` roots are initialized.
 * @type {!Array<!ng.AngularService>}
 */
ng.Angular.prototype.subapps;

/**
 * Application-wide event bus, available after bootstrap providers are created.
 * @type {!ng.PubSubService}
 */
ng.Angular.prototype.$eventBus;

/**
 * Application injector, available after `bootstrap()` or `injector()` completes.
 * @type {!ng.InjectorService}
 */
ng.Angular.prototype.$injector;

/**
 * Root scope for the bootstrapped application.
 * @type {!ng.Scope}
 */
ng.Angular.prototype.$rootScope;

/**
 * AngularTS version string replaced at build time.
 * @type {string}
 */
ng.Angular.prototype.version;

/**
 * Retrieve the controller instance cached on a compiled DOM element.
 * @param {!Element} element
 * @param {(string|undefined)} name
 * @return {(!ng.Scope|undefined)}
 */
ng.Angular.prototype.getController = function(element, name) {};

/**
 * Retrieve the injector cached on a bootstrapped DOM element.
 * @param {!Element} element
 * @return {!ng.InjectorService}
 */
ng.Angular.prototype.getInjector = function(element) {};

/**
 * Retrieve the scope cached on a compiled DOM element.
 * @param {!Element} element
 * @return {!ng.Scope}
 */
ng.Angular.prototype.getScope = function(element) {};

/**
 * Global framework error-handling configuration.
 * @param {(!ng.ErrorHandlingConfig|undefined)} config
 * @return {!ng.ErrorHandlingConfig}
 */
ng.Angular.prototype.errorHandlingConfig = function(config) {};

/**
 * Public injection token names keyed by token value.
 * @type {!ng.InjectionTokens}
 */
ng.Angular.prototype.$t;

/**
 * Registers the configured built-in `ng` module for this runtime instance.
 * @return {!ng.NgModule}
 */
ng.Angular.prototype.registerNgModule = function() {};

/**
 * The `angular.module` is a global place for creating, registering and retrieving AngularTS modules. All modules (AngularTS core or 3rd party) that should be available to an application must be registered using this mechanism. Passing one argument retrieves an existing ng.NgModule, whereas passing more than one argument creates a new ng.NgModule # Module A module is a collection of services, directives, controllers, filters, workers, WebAssembly modules, and configuration information. `angular.module` is used to configure the auto.$injector `$injector`. ```js // Create a new module let myModule = angular.module('myModule', []); // register a new service myModule.value('appName', 'MyCoolApp'); // configure existing services inside initialization blocks. myModule.config(['$locationProvider', function($locationProvider) { // Configure existing providers $locationProvider.hashPrefix('!'); }]); ``` Then you can create an injector and load your modules like this: ```js let injector = angular.injector(['ng', 'myModule']) ``` However it's more likely that you'll use the `ng-app` directive or `bootstrap()` to simplify this process.
 * @param {string} name
 * @param {(!Array<string>|undefined)} requires
 * @param {(!ng.Injectable|undefined)} configFn
 * @return {!ng.NgModule}
 */
ng.Angular.prototype.module = function(name, requires, configFn) {};

/**
 * Dispatches an invocation event to either an injectable service or a named scope. The event `type` identifies the target and the payload contains the expression to evaluate against that target.
 * @param {!Event} event
 * @return {boolean}
 */
ng.Angular.prototype.dispatchEvent = function(event) {};

/**
 * Fire-and-forget. Accepts a single string: `"<target>.<expression>"`
 * @param {string} input
 * @return {void}
 */
ng.Angular.prototype.emit = function(input) {};

/**
 * Await result. Accepts a single string: `"<target>.<expression>"`
 * @param {string} input
 * @return {!Promise<?>}
 */
ng.Angular.prototype.call = function(input) {};

/**
 * Use this function to manually start up AngularTS application. AngularTS will detect if it has been loaded into the browser more than once and only allow the first loaded script to be bootstrapped and will report a warning to the browser console for each of the subsequent scripts. This prevents strange results in applications, where otherwise multiple instances of AngularTS try to work on the DOM. **Note:** Do not bootstrap the app on an element with a directive that uses transclusion, such as `ng-if`, `ng-include`, or `ng-view`. Doing this misplaces the app root element and injector, causing animations to stop working and making the injector inaccessible from outside the app. ```html <!doctype html> <html> <body> <div ng-controller="WelcomeController"> {{greeting}} </div> <script src="angular.js"></script> <script> let app = angular.module('demo', []) .controller('WelcomeController', function($scope) { $scope.greeting = 'Welcome!'; }); angular.bootstrap(document, ['demo']); </script> </body> </html> ```
 * @param {(!Document|!HTMLElement|string)} element
 * @param {(!Array<(string|!ng.Injectable)>|undefined)} modules
 * @param {(!Object|undefined)} config
 * @return {!ng.InjectorService}
 */
ng.Angular.prototype.bootstrap = function(element, modules, config) {};

/**
 * Create a standalone injector without bootstrapping the DOM.
 * @param {!Array<(string|!ng.Injectable)>} modules
 * @param {(boolean|undefined)} strictDi
 * @return {!ng.InjectorService}
 */
ng.Angular.prototype.injector = function(modules, strictDi) {};

/**
 * Find `ng-app` roots under the provided element and bootstrap them. The first root uses this instance. Additional roots are bootstrapped as sub-applications and stored in {@link subapps}.
 * @param {(!Document|!HTMLElement)} element
 * @return {void}
 */
ng.Angular.prototype.init = function(element) {};

/**
 * Find a scope by its registered `$scopename`.
 * @param {string} name
 * @return {(!ng.Scope|undefined)}
 */
ng.Angular.prototype.getScopeByName = function(name) {};

/**
 * Dependency-annotated directive factory array containing dependency token names followed by a directive factory function.
 * @typedef {!Array<(string|function(...?): (!ng.Directive|function(!ng.Scope, !HTMLElement, !ng.Attributes, ?, (!ng.TranscludeFn|undefined)): void))>}
 */
ng.AnnotatedDirectiveFactory;

/**
 * Public AngularTS Attributes contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.Attributes = function() {};

/**
 * Public Attributes.$attr member exposed by the AngularTS namespace contract.
 * @type {!Object<string, string>}
 */
ng.Attributes.prototype.$attr;

/**
 * Converts an attribute name (e.g. dash/colon/underscore-delimited string, optionally prefixed with `x-` or `data-`) to its normalized, camelCase form. Also there is special case for Moz prefix starting with upper case letter. Normalization follows the directive matching rules used by `$compile`.
 * @param {string} name
 * @return {string}
 */
ng.Attributes.prototype.$normalize = function(name) {};

/**
 * Public Attributes.$addClass member exposed by the AngularTS namespace contract.
 * @param {string} classVal
 * @return {void}
 */
ng.Attributes.prototype.$addClass = function(classVal) {};

/**
 * Public Attributes.$removeClass member exposed by the AngularTS namespace contract.
 * @param {string} classVal
 * @return {void}
 */
ng.Attributes.prototype.$removeClass = function(classVal) {};

/**
 * Public Attributes.$updateClass member exposed by the AngularTS namespace contract.
 * @param {string} newClasses
 * @param {string} oldClasses
 * @return {void}
 */
ng.Attributes.prototype.$updateClass = function(newClasses, oldClasses) {};

/**
 * Public Attributes.$set member exposed by the AngularTS namespace contract.
 * @param {string} key
 * @param {(boolean|null|string)} value
 * @param {(boolean|undefined)} writeAttr
 * @param {(string|undefined)} attrName
 * @return {void}
 */
ng.Attributes.prototype.$set = function(key, value, writeAttr, attrName) {};

/**
 * Public Attributes.$observe member exposed by the AngularTS namespace contract.
 * @param {string} key
 * @param {function((?|undefined)): ?} fn
 * @return {function(): void}
 */
ng.Attributes.prototype.$observe = function(key, fn) {};

/**
 * A specialized version of `TranscludeFn` with the parent scope already bound. Used internally to thread controller context and future parent elements.
 * @typedef {function((!ng.Scope|null|undefined), (function((!Array<!Node>|!Node|!Object|null|undefined), (!ng.Scope|null|undefined)): ?|undefined), (?|undefined), (!Element|!Node|null|undefined), (!ng.Scope|undefined)): (!Array<!Node>|!Node|!Object|null|undefined)}
 */
ng.BoundTranscludeFn;

/**
 * Public AngularTS Component contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.Component = function() {};

/**
 * Public Component.controller member exposed by the AngularTS namespace contract.
 * @type {(!Array<(function(...?): !ng.Controller|function(...?): (!ng.Controller|undefined))>|function(...?): (!ng.Controller|undefined)|function(new: ng.Controller, ...?)|string|undefined)}
 */
ng.Component.prototype.controller;

/**
 * An identifier name for a reference to the controller. If present, the controller will be published to its scope under the specified name. If not present, this will default to '$ctrl'.
 * @type {(string|undefined)}
 */
ng.Component.prototype.controllerAs;

/**
 * html template as a string or a function that returns an html template as a string which should be used as the contents of this component. Empty string by default. If template is a function, then it is injected with the following locals: $element - Current element $attrs - Current attributes object for the element Use the array form to define dependencies (necessary if strictDi is enabled and you require dependency injection)
 * @type {(!Array<function(...?): string>|function(...?): string|string|undefined)}
 */
ng.Component.prototype.template;

/**
 * Path or function that returns a path to an html template that should be used as the contents of this component. If templateUrl is a function, then it is injected with the following locals: $element - Current element $attrs - Current attributes object for the element Use the array form to define dependencies (necessary if strictDi is enabled and you require dependency injection)
 * @type {(!Array<function(...?): string>|function(...?): string|string|undefined)}
 */
ng.Component.prototype.templateUrl;

/**
 * Define DOM attribute binding to component properties. Component properties are always bound to the component controller and not to the scope.
 * @type {(!Object<string, string>|undefined)}
 */
ng.Component.prototype.bindings;

/**
 * Whether transclusion is enabled. Disabled by default.
 * @type {(!Object<string, string>|boolean|undefined)}
 */
ng.Component.prototype.transclude;

/**
 * Requires the controllers of other directives and binds them to this component's controller. The object keys specify the property names under which the required controllers (object values) will be bound. Note that the required controllers will not be available during the instantiation of the controller, but they are guaranteed to be available just before the $onInit method is executed!
 * @type {(!Object<string, string>|undefined)}
 */
ng.Component.prototype.require;

/**
 * AngularTS component lifecycle interface. Directive controllers have a well-defined lifecycle. Each controller can implement "lifecycle hooks". These are methods that will be called by Angular at certain points in the life cycle of the directive. https://docs.angularjs.org/api/ng/service/$compile#life-cycle-hooks https://docs.angularjs.org/guide/component
 * @record
 */
ng.Controller = function() {};

/**
 * Optional controller name (used in debugging)
 * @type {(string|undefined)}
 */
ng.Controller.prototype.name;

/**
 * Called on each controller after all the controllers on an element have been constructed and had their bindings initialized (and before the pre & post linking functions for the directives on this element). This is a good place to put initialization code for your controller.
 * @type {(function(): void|undefined)}
 */
ng.Controller.prototype.$onInit;

/**
 * Called whenever one-way bindings are updated. The onChangesObj is a hash whose keys are the names of the bound properties that have changed, and the values are a {@link ChangesObject} object of the form { currentValue, previousValue, isFirstChange() }. Use this hook to trigger updates within a component such as cloning the bound value to prevent accidental mutation of the outer value.
 * @type {(function(!Object<string, !Object>): void|undefined)}
 */
ng.Controller.prototype.$onChanges;

/**
 * Called on a controller when its containing scope is destroyed. Use this hook for releasing external resources, watches and event handlers.
 * @type {(function(): void|undefined)}
 */
ng.Controller.prototype.$onDestroy;

/**
 * Called after this controller's element and its children have been linked. Similar to the post-link function this hook can be used to set up DOM event handlers and do direct DOM manipulation. Note that child elements that contain templateUrl directives will not have been compiled and linked since they are waiting for their template to load asynchronously and their own compilation and linking has been suspended until that occurs. This hook can be considered analogous to the ngAfterViewInit and ngAfterContentInit hooks in Angular 2. Since the compilation process is rather different in Angular 1 there is no direct mapping and care should be taken when upgrading.
 * @type {(function(): void|undefined)}
 */
ng.Controller.prototype.$postLink;

/**
 * Public AngularTS Directive contract exposed through the global ng namespace for Closure-annotated applications.
 * @template TController
 * @record
 */
ng.Directive = function() {};

/**
 * Optional name (usually inferred)
 * @type {(string|undefined)}
 */
ng.Directive.prototype.name;

/**
 * Restrict option: 'A' and/or 'E'. Defaults to 'EA' if not defined
 * @type {(string|undefined)}
 */
ng.Directive.prototype.restrict;

/**
 * Compile function for the directive
 * @type {(function(!HTMLElement, !ng.Attributes, (function(...?): ?|undefined)): (!Object|function(!ng.Scope, !HTMLElement, !ng.Attributes, ?, (!ng.TranscludeFn|undefined)): void|undefined)|undefined)}
 */
ng.Directive.prototype.compile;

/**
 * Controller constructor or injectable string name
 * @type {(!Array<(function(...?): !ng.Controller|function(...?): (!ng.Controller|undefined))>|function(...?): (!ng.Controller|undefined)|function(new: ng.Controller, ...?)|string|undefined)}
 */
ng.Directive.prototype.controller;

/**
 * Alias name for the controller in templates
 * @type {(string|undefined)}
 */
ng.Directive.prototype.controllerAs;

/**
 * Whether to bind scope to controller
 * @type {(!Object<string, string>|boolean|undefined)}
 */
ng.Directive.prototype.bindToController;

/**
 * Link function(s) executed during linking
 * @type {(!Object|function(!ng.Scope, !HTMLElement, !ng.Attributes, TController, (!ng.TranscludeFn|undefined)): void|undefined)}
 */
ng.Directive.prototype.link;

/**
 * Priority of the directive
 * @type {(number|undefined)}
 */
ng.Directive.prototype.priority;

/**
 * Stops further directive processing if true
 * @type {(boolean|undefined)}
 */
ng.Directive.prototype.terminal;

/**
 * Replaces the element with the template if true
 * @type {(boolean|undefined)}
 */
ng.Directive.prototype.replace;

/**
 * Required controllers for the directive
 * @type {(!Array<string>|!Object<string, string>|string|undefined)}
 */
ng.Directive.prototype.require;

/**
 * Scope configuration (`true`, `false`, or object for isolate scope)
 * @type {(!Object<string, string>|boolean|undefined)}
 */
ng.Directive.prototype.scope;

/**
 * Inline template
 * @type {(function(!HTMLElement, !ng.Attributes): string|string|undefined)}
 */
ng.Directive.prototype.template;

/**
 * Template namespace (e.g., SVG, HTML)
 * @type {(string|undefined)}
 */
ng.Directive.prototype.templateNamespace;

/**
 * Template URL for loading from server
 * @type {(function(!HTMLElement, !ng.Attributes): string|string|undefined)}
 */
ng.Directive.prototype.templateUrl;

/**
 * Enables transclusion or configures named slots
 * @type {(!Object<string, string>|boolean|string|undefined)}
 */
ng.Directive.prototype.transclude;

/**
 * Currently only used by view directive
 * @type {(number|undefined)}
 */
ng.Directive.prototype.count;

/**
 * Directive registration factory that returns either a directive definition object or a link function.
 * @typedef {(!ng.AnnotatedDirectiveFactory|function(...?): (!ng.Directive|function(!ng.Scope, !HTMLElement, !ng.Attributes, ?, (!ng.TranscludeFn|undefined)): void))}
 */
ng.DirectiveFactory;

/**
 * AngularTS module registration surface for controllers, directives, services, factories, providers, filters, run blocks, and config blocks.
 * @constructor
 */
ng.NgModule = function() {};

/**
 * Public NgModule.name member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.NgModule.prototype.name;

/**
 * Public NgModule.value member exposed by the AngularTS namespace contract.
 * @param {string} name
 * @param {?} object
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.value = function(name, object) {};

/**
 * Public NgModule.constant member exposed by the AngularTS namespace contract.
 * @param {string} name
 * @param {(!Object|number|string)} object
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.constant = function(name, object) {};

/**
 * Public NgModule.config member exposed by the AngularTS namespace contract.
 * @param {!ng.Injectable} configFn
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.config = function(configFn) {};

/**
 * Public NgModule.run member exposed by the AngularTS namespace contract.
 * @param {!ng.Injectable} block
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.run = function(block) {};

/**
 * Public NgModule.component member exposed by the AngularTS namespace contract.
 * @param {string} name
 * @param {!ng.Component} options
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.component = function(name, options) {};

/**
 * Public NgModule.factory member exposed by the AngularTS namespace contract.
 * @param {string} name
 * @param {!ng.Injectable} providerFunction
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.factory = function(name, providerFunction) {};

/**
 * Public NgModule.service member exposed by the AngularTS namespace contract.
 * @param {string} name
 * @param {!ng.Injectable} serviceFunction
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.service = function(name, serviceFunction) {};

/**
 * Public NgModule.provider member exposed by the AngularTS namespace contract.
 * @param {string} name
 * @param {!ng.Injectable} providerType
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.provider = function(name, providerType) {};

/**
 * Public NgModule.decorator member exposed by the AngularTS namespace contract.
 * @param {string} name
 * @param {!ng.Injectable} decorFn
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.decorator = function(name, decorFn) {};

/**
 * Public NgModule.directive member exposed by the AngularTS namespace contract.
 * @param {string} name
 * @param {!ng.DirectiveFactory} directiveFactory
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.directive = function(name, directiveFactory) {};

/**
 * Public NgModule.animation member exposed by the AngularTS namespace contract.
 * @param {string} name
 * @param {!ng.Injectable} animationFactory
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.animation = function(name, animationFactory) {};

/**
 * Public NgModule.filter member exposed by the AngularTS namespace contract.
 * @param {string} name
 * @param {function(...?): !Object} filterFn
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.filter = function(name, filterFn) {};

/**
 * The $controller service is used by Angular to create new controllers. This provider allows controller registration via the register method.
 * @param {string} name
 * @param {!ng.Injectable} ctlFn
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.controller = function(name, ctlFn) {};

/**
 * Register a router state during module configuration. This is equivalent to calling `$stateProvider.state(...)` in a config block, but keeps route declarations in the same fluent module API used for components, services, directives, and custom elements. Register a named router state during module configuration. The provided `name` is copied onto the state declaration before it is passed to `$stateProvider`.
 * @param {!ng.StateDeclaration} definition
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.state = function(definition) {};

/**
 * Register a named WebAssembly module as an injectable service. The actual loading is delegated to the `$wasm` provider, so custom runtimes can decide whether WebAssembly support is included.
 * @param {string} name
 * @param {string} src
 * @param {(!Object<string, !Object<string, (!Object|number)>>|undefined)} imports
 * @param {(!Object<string, ?>|undefined)} opts
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.wasm = function(name, src, imports, opts) {};

/**
 * Register a named Web Worker connection as an injectable service. The actual connection is delegated to the `$worker` provider, so worker support remains provider-driven instead of directive-driven.
 * @param {string} name
 * @param {(!Object|string)} scriptPath
 * @param {(!ng.WorkerConfig|undefined)} config
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.worker = function(name, scriptPath, config) {};

/**
 * Register a persistent object store as an injectable service. Store construction is delegated to `$provide.store`, which creates the service through the injector and persists it through the selected backend.
 * @param {string} name
 * @param {(!Object|function(...?): ?|function(new: ?, ...?))} ctor
 * @param {string} type
 * @param {(!Object|undefined)} backendOrConfig
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.store = function(name, ctor, type, backendOrConfig) {};

/**
 * Register a REST resource as an injectable service. The resource factory is delegated to the `$rest` provider, keeping REST support configurable by custom runtimes.
 * @template T
 * @param {string} name
 * @param {string} url
 * @param {(function(new: T, ?)|undefined)} entityClass
 * @param {(!ng.RestOptions|undefined)} options
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.rest = function(name, url, entityClass, options) {};

/**
 * Register a pre-configured SSE connection as an injectable service. The connection is created by `$sse` when the named service is requested.
 * @param {string} name
 * @param {string} url
 * @param {(!ng.SseConfig|undefined)} config
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.sse = function(name, url, config) {};

/**
 * Register a pre-configured WebSocket connection as an injectable service. The connection is created by `$websocket` when the named service is requested.
 * @param {string} name
 * @param {string} url
 * @param {(!Array<string>|undefined)} protocols
 * @param {(!ng.WebSocketConfig|undefined)} config
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.websocket = function(name, url, protocols, config) {};

/**
 * Register a pre-configured WebTransport connection as an injectable service. The connection is created by `$webTransport` when the named service is requested.
 * @param {string} name
 * @param {string} url
 * @param {(!ng.WebTransportConfig|undefined)} config
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.webTransport = function(name, url, config) {};

/**
 * Register a scoped custom element backed by a normal AngularTS child scope. The definition is installed when the module runs. The custom element can be consumed as a native element while its internal model remains part of the AngularTS scope tree.
 * @template T
 * @param {string} name
 * @param {!ng.WebComponentOptions<T>} options
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.webComponent = function(name, options) {};

/**
 * Register a topic-bound event bus facade as an injectable service. Events published through the facade are namespaced as `${topic}:${event}`, keeping raw event-bus topic strings out of application services.
 * @param {string} name
 * @param {string} topic
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.topic = function(name, topic) {};

/**
 * A function returned by the `$compile` service that links a compiled template to a scope.
 * @record
 */
ng.PublicLinkFn = function() {};

/**
 * Public PublicLinkFn.pre member exposed by the AngularTS namespace contract.
 * @type {(?|undefined)}
 */
ng.PublicLinkFn.prototype.pre;

/**
 * Public PublicLinkFn.post member exposed by the AngularTS namespace contract.
 * @type {(?|undefined)}
 */
ng.PublicLinkFn.prototype.post;

/**
 * Invokes the callable PublicLinkFn contract.
 * @param {!ng.Scope} scope
 * @param {(function((!Array<!Node>|!Node|!Object|null|undefined), (!ng.Scope|null|undefined)): ?|undefined)} cloneAttachFn
 * @param {(!Object|undefined)} options
 * @return {(!Array<!Node>|!Element|!Node|!Object)}
 */
ng.PublicLinkFn.prototype.call = function(scope, cloneAttachFn, options) {};

/**
 * Provider used during module configuration to register and expose the application-wide AngularTS pub/sub event bus service.
 * @constructor
 */
ng.PubSubProvider = function() {};

/**
 * Public PubSubProvider.eventBus member exposed by the AngularTS namespace contract.
 * @type {!ng.PubSubService}
 */
ng.PubSubProvider.prototype.eventBus;

/**
 * Public PubSubProvider.$get member exposed by the AngularTS namespace contract.
 * @return {!ng.PubSubService}
 */
ng.PubSubProvider.prototype.$get = function() {};

/**
 * Reactive scope object used by AngularTS templates, directives, event propagation, listener registration, and queued change delivery.
 * @constructor
 */
ng.Scope = function() {};

/**
 * Public Scope.$proxy member exposed by the AngularTS namespace contract.
 * @type {!ng.Scope}
 */
ng.Scope.prototype.$proxy;

/**
 * Public Scope.$handler member exposed by the AngularTS namespace contract.
 * @type {?}
 */
ng.Scope.prototype.$handler;

/**
 * Public Scope.$target member exposed by the AngularTS namespace contract.
 * @type {!Object}
 */
ng.Scope.prototype.$target;

/**
 * Public Scope.$id member exposed by the AngularTS namespace contract.
 * @type {number}
 */
ng.Scope.prototype.$id;

/**
 * Public Scope.$root member exposed by the AngularTS namespace contract.
 * @type {!ng.Scope}
 */
ng.Scope.prototype.$root;

/**
 * Public Scope.$parent member exposed by the AngularTS namespace contract.
 * @type {(!ng.Scope|undefined)}
 */
ng.Scope.prototype.$parent;

/**
 * Public Scope.$scopename member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.Scope.prototype.$scopename;

/**
 * Intercepts and handles property assignments on the target object. Scopeable objects are stored as raw model values and proxied lazily when read.
 * @param {!Object} target
 * @param {string} property
 * @param {?} value
 * @param {!ng.Scope} proxy
 * @return {boolean}
 */
ng.Scope.prototype.set = function(target, property, value, proxy) {};

/**
 * Intercepts property access on the target object. It checks for specific properties (`watch` and `sync`) and binds their methods. For other properties, it returns the value directly.
 * @param {!Object} target
 * @param {(number|string|symbol)} property
 * @param {!ng.Scope} proxy
 * @return {?}
 */
ng.Scope.prototype.get = function(target, property, proxy) {};

/**
 * Public Scope.deleteProperty member exposed by the AngularTS namespace contract.
 * @param {!Object} target
 * @param {(number|string|symbol)} property
 * @return {boolean}
 */
ng.Scope.prototype.deleteProperty = function(target, property) {};

/**
 * Registers a watcher for a property along with a listener function. The listener function is invoked when changes to that property are detected.
 * @param {string} watchProp
 * @param {(function((?|undefined), (?|undefined)): void|undefined)} listenerFn
 * @param {(boolean|undefined)} lazy
 * @return {(function(): void|undefined)}
 */
ng.Scope.prototype.$watch = function(watchProp, listenerFn, lazy) {};

/**
 * Creates a prototypically inherited child scope.
 * @param {(!ng.Scope|undefined)} childInstance
 * @return {!ng.Scope}
 */
ng.Scope.prototype.$new = function(childInstance) {};

/**
 * Creates an isolate child scope that does not inherit watchable properties directly.
 * @param {(!ng.Scope|undefined)} instance
 * @return {!ng.Scope}
 */
ng.Scope.prototype.$newIsolate = function(instance) {};

/**
 * Creates a transcluded child scope linked to this scope and an optional parent instance.
 * @param {(!ng.Scope|undefined)} parentInstance
 * @return {!ng.Scope}
 */
ng.Scope.prototype.$transcluded = function(parentInstance) {};

/**
 * Merges enumerable properties from the provided object into the current scope target.
 * @param {!Object} newTarget
 * @return {void}
 */
ng.Scope.prototype.$merge = function(newTarget) {};

/**
 * Registers an event listener on this scope and returns a deregistration function.
 * @param {string} name
 * @param {function(...?): ?} listener
 * @return {function(): void}
 */
ng.Scope.prototype.$on = function(name, listener) {};

/**
 * Emits an event upward through the scope hierarchy.
 * @param {string} name
 * @param {...?} var_args
 * @return {(!ng.ScopeEvent|undefined)}
 */
ng.Scope.prototype.$emit = function(name, var_args) {};

/**
 * Broadcasts an event downward through the scope hierarchy.
 * @param {string} name
 * @param {...?} var_args
 * @return {(!ng.ScopeEvent|undefined)}
 */
ng.Scope.prototype.$broadcast = function(name, var_args) {};

/**
 * Queues a callback to run after the current listener batch completes.
 * @param {function(): void} fn
 * @return {void}
 */
ng.Scope.prototype.$postUpdate = function(fn) {};

/**
 * Public Scope.$destroy member exposed by the AngularTS namespace contract.
 * @return {void}
 */
ng.Scope.prototype.$destroy = function() {};

/**
 * Public Scope.$flushQueue member exposed by the AngularTS namespace contract.
 * @return {void}
 */
ng.Scope.prototype.$flushQueue = function() {};

/**
 * Searches this scope tree for a scope with the given id.
 * @param {(number|string)} id
 * @return {(!ng.Scope|undefined)}
 */
ng.Scope.prototype.$getById = function(id) {};

/**
 * Searches the scope tree for a scope registered under the provided name.
 * @param {string} name
 * @return {(!ng.Scope|undefined)}
 */
ng.Scope.prototype.$searchByName = function(name) {};

/**
 * A function passed as the fifth argument to a `PublicLinkFn` link function. It behaves like a linking function, with the `scope` argument automatically created as a new child of the transcluded parent scope. The function returns the DOM content to be injected (transcluded) into the directive.
 * @record
 */
ng.TranscludeFn = function() {};

/**
 * Added by your `controllersBoundTransclude` wrapper.
 * @type {(function((number|string)): boolean|undefined)}
 */
ng.TranscludeFn.prototype.isSlotFilled;

/**
 * Invokes the callable TranscludeFn contract.
 * @param {function((!Array<!Node>|!Node|!Object|null|undefined), (!ng.Scope|null|undefined)): ?} cloneAttachFn
 * @param {(!Element|!Node|null|undefined)} futureParentElement
 * @param {(number|string|undefined)} slotName
 * @return {(!Array<!Node>|!Node|!Object|null|undefined)}
 */
ng.TranscludeFn.prototype.call = function(cloneAttachFn, futureParentElement, slotName) {};

/**
 * Public AngularTS AnchorScrollProvider contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.AnchorScrollProvider = function() {};

/**
 * Public AnchorScrollProvider.autoScrollingEnabled member exposed by the AngularTS namespace contract.
 * @type {boolean}
 */
ng.AnchorScrollProvider.prototype.autoScrollingEnabled;

/**
 * Public AnchorScrollProvider.$get member exposed by the AngularTS namespace contract.
 * @type {!Array<(function(!ng.LocationService, !ng.Scope): !ng.AnchorScrollService|string)>}
 */
ng.AnchorScrollProvider.prototype.$get;

/**
 * Public AngularTS AngularServiceProvider contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.AngularServiceProvider = function() {};

/**
 * Public AngularServiceProvider.$get member exposed by the AngularTS namespace contract.
 * @param {...?} var_args
 * @return {!ng.Angular}
 */
ng.AngularServiceProvider.prototype.$get = function(var_args) {};

/**
 * Public AngularTS AnimateProvider contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.AnimateProvider = function() {};

/**
 * Public AnimateProvider.register member exposed by the AngularTS namespace contract.
 * @param {string} name
 * @param {(!Array<function(): !ng.AnimationPreset>|!ng.AnimationPreset|function(): !ng.AnimationPreset)} preset
 * @return {void}
 */
ng.AnimateProvider.prototype.register = function(name, preset) {};

/**
 * Public AnimateProvider.$get member exposed by the AngularTS namespace contract.
 * @type {!Array<string>}
 */
ng.AnimateProvider.prototype.$get;

/**
 * Public AngularTS FilterProvider contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.FilterProvider = function() {};

/**
 * Public FilterProvider.$get member exposed by the AngularTS namespace contract.
 * @type {!Array<string>}
 */
ng.FilterProvider.prototype.$get;

/**
 * Public FilterProvider.register member exposed by the AngularTS namespace contract.
 * @param {string} name
 * @param {function(...?): !Object} factory
 * @return {!ng.FilterProvider}
 */
ng.FilterProvider.prototype.register = function(name, factory) {};

/**
 * Provider for the `$exceptionHandler` service. The default implementation rethrows exceptions, enabling strict fail-fast behavior. Applications may replace the handler via by setting `errorHandler`property or by providing their own `$exceptionHandler` factory.
 * @record
 */
ng.ExceptionHandlerProvider = function() {};

/**
 * Public ExceptionHandlerProvider.handler member exposed by the AngularTS namespace contract.
 * @param {?} exception
 * @return {?}
 */
ng.ExceptionHandlerProvider.prototype.handler = function(exception) {};

/**
 * Returns the currently configured exception handler wrapper.
 * @return {function(?): ?}
 */
ng.ExceptionHandlerProvider.prototype.$get = function() {};

/**
 * Public AngularTS HttpParamSerializerProvider contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.HttpParamSerializerProvider = function() {};

/**
 * Public HttpParamSerializerProvider.$get member exposed by the AngularTS namespace contract.
 * @type {(function(): function((!Object<string, (!Array<?>|boolean|null|number|string|undefined)>|undefined)): string|undefined)}
 */
ng.HttpParamSerializerProvider.prototype.$get;

/**
 * Public AngularTS InterpolateProvider contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.InterpolateProvider = function() {};

/**
 * Public InterpolateProvider.startSymbol member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InterpolateProvider.prototype.startSymbol;

/**
 * Public InterpolateProvider.endSymbol member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InterpolateProvider.prototype.endSymbol;

/**
 * Public InterpolateProvider.$get member exposed by the AngularTS namespace contract.
 * @type {!Array<string>}
 */
ng.InterpolateProvider.prototype.$get;

/**
 * Public AngularTS LocationProvider contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.LocationProvider = function() {};

/**
 * Public LocationProvider.hashPrefixConf member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.LocationProvider.prototype.hashPrefixConf;

/**
 * Public LocationProvider.lastCachedState member exposed by the AngularTS namespace contract.
 * @type {?}
 */
ng.LocationProvider.prototype.lastCachedState;

/**
 * Public LocationProvider.html5ModeConf member exposed by the AngularTS namespace contract.
 * @type {!Object}
 */
ng.LocationProvider.prototype.html5ModeConf;

/**
 * Updates the browser's current URL and history state.
 * @param {(string|undefined)} url
 * @param {(?|undefined)} state
 * @return {!ng.LocationProvider}
 */
ng.LocationProvider.prototype.setUrl = function(url, state) {};

/**
 * Returns the current browser URL with any empty hash (`#`) removed.
 * @return {string}
 */
ng.LocationProvider.prototype.getBrowserUrl = function() {};

/**
 * Returns the cached browser history state.
 * @return {?}
 */
ng.LocationProvider.prototype.state = function() {};

/**
 * Caches the current state.
 * @return {void}
 */
ng.LocationProvider.prototype.cacheState = function() {};

/**
 * Public LocationProvider.$get member exposed by the AngularTS namespace contract.
 * @type {!Array<(function(!ng.Scope, !HTMLElement, function(?): ?): !ng.LocationService|string)>}
 */
ng.LocationProvider.prototype.$get;

/**
 * The `$sceDelegateProvider` provider allows developers to configure the {@link ng.$sceDelegate * $sceDelegate service}, used as a delegate for {@link ng.$sce Strict Contextual Escaping (SCE)}. The `$sceDelegateProvider` allows one to get/set the `trustedResourceUrlList` and `bannedResourceUrlList` used to ensure that the URLs used for sourcing AngularTS templates and other script-running URLs are safe (all places that use the `$sce.RESOURCE_URL` context). See {@link ng.$sceDelegateProvider#trustedResourceUrlList * $sceDelegateProvider.trustedResourceUrlList} and {@link ng.$sceDelegateProvider#bannedResourceUrlList $sceDelegateProvider.bannedResourceUrlList}, For the general details about this service in AngularTS, read the main page for {@link ng.$sce * Strict Contextual Escaping (SCE)}. **Example**: Consider the following case. <a name="example"></a> - your app is hosted at url `http://myapp.example.com/` - but some of your templates are hosted on other domains you control such as `http://srv01.assets.example.com/`, `http://srv02.assets.example.com/`, etc. - and you have an open redirect at `http://myapp.example.com/clickThru?...`. Here is what a secure configuration for this scenario might look like: ``` angular.module('myApp', []).config(function($sceDelegateProvider) { $sceDelegateProvider.trustedResourceUrlList([ // Allow same origin resource loads. 'self', // Allow loading from our assets domain. Notice the difference between * and **. 'http://srv*.assets.example.com/**' ]); // The banned resource URL list overrides the trusted resource URL list so the open redirect // here is blocked. $sceDelegateProvider.bannedResourceUrlList([ 'http://myapp.example.com/clickThru**' ]); }); ``` Note that an empty trusted resource URL list will block every resource URL from being loaded, and will require you to manually mark each one as trusted with `$sce.trustAsResourceUrl`. However, templates requested by {@link ng.$templateRequest $templateRequest} that are present in {@link ng.$templateCache $templateCache} will not go through this check. If you have a mechanism to populate your templates in that cache at config time, then it is a good idea to remove 'self' from the trusted resource URL lsit. This helps to mitigate the security impact of certain types of issues, like for instance attacker-controlled `ng-includes`.
 * @record
 */
ng.SceDelegateProvider = function() {};

/**
 * Public SceDelegateProvider.trustedResourceUrlList member exposed by the AngularTS namespace contract.
 * @param {(!Array<(!Object|string)>|null|undefined)} value
 * @return {!Array<(!Object|string)>}
 */
ng.SceDelegateProvider.prototype.trustedResourceUrlList = function(value) {};

/**
 * Public SceDelegateProvider.bannedResourceUrlList member exposed by the AngularTS namespace contract.
 * @param {(!Array<(!Object|string)>|null|undefined)} value
 * @return {!Array<(!Object|string)>}
 */
ng.SceDelegateProvider.prototype.bannedResourceUrlList = function(value) {};

/**
 * Retrieves or overrides the regular expression used to trust safe URLs for a[href] sanitization.
 * @param {(!Object|undefined)} regexp
 * @return {(!Object|!ng.SceDelegateProvider)}
 */
ng.SceDelegateProvider.prototype.aHrefSanitizationTrustedUrlList = function(regexp) {};

/**
 * Retrieves or overrides the regular expression used to trust safe URLs for media source sanitization.
 * @param {(!Object|undefined)} regexp
 * @return {(!Object|!ng.SceDelegateProvider)}
 */
ng.SceDelegateProvider.prototype.imgSrcSanitizationTrustedUrlList = function(regexp) {};

/**
 * Public SceDelegateProvider.$get member exposed by the AngularTS namespace contract.
 * @type {!Array<?>}
 */
ng.SceDelegateProvider.prototype.$get;

/**
 * Public AngularTS SceProvider contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.SceProvider = function() {};

/**
 * This interface specifies the api for registering Transition Hooks. Both the [[TransitionService]] and also the [[Transition]] object itself implement this interface. Note: the Transition object only allows hooks to be registered before the Transition is started.
 * @record
 */
ng.TransitionService = function() {};

/**
 * Registers a [[TransitionHookFn]], called *before a transition starts*. Registers a transition lifecycle hook, which is invoked before a transition even begins. This hook can be useful to implement logic which prevents a transition from even starting, such as authentication, redirection See [[TransitionHookFn]] for the signature of the function. The [[HookMatchCriteria]] is used to determine which Transitions the hook should be invoked for. To match all Transitions, use an empty criteria object `{}`. ### Lifecycle `onBefore` hooks are invoked *before a Transition starts*. No resolves have been fetched yet. Each `onBefore` hook is invoked synchronously, in the same call stack as [[StateService.transitionTo]]. The registered `onBefore` hooks are invoked in priority order. Note: during the `onBefore` phase, additional hooks can be added to the specific [[Transition]] instance. These "on-the-fly" hooks only affect the currently running transition.. ### Return value The hook's return value can be used to pause, cancel, or redirect the current Transition. See [[HookResult]] for more information. If any hook modifies the transition *synchronously* (by throwing, returning `false`, or returning a [[TargetState]]), the remainder of the hooks are skipped. If a hook returns a promise, the remainder of the `onBefore` hooks are still invoked synchronously. All promises are resolved, and processed asynchronously before the `onStart` phase of the Transition. ### Examples #### Default Substate This example redirects any transition from 'home' to 'home.dashboard'. This is commonly referred to as a "default substate".
 * @param {!Object<string, (boolean|function((!Object|undefined), (!ng.Transition|undefined)): boolean|string|undefined)>} matchCriteria
 * @param {function(!ng.Transition): (!Object|!Promise<(!Object|boolean|undefined)>|boolean|undefined)} callback
 * @param {(!Object|undefined)} options
 * @return {function(): void}
 */
ng.TransitionService.prototype.onBefore = function(matchCriteria, callback, options) {};

/**
 * Registers a [[TransitionHookFn]], called when a transition starts. Registers a transition lifecycle hook, which is invoked as a transition starts running. This hook can be useful to perform some asynchronous action before completing a transition. See [[TransitionHookFn]] for the signature of the function. The [[HookMatchCriteria]] is used to determine which Transitions the hook should be invoked for. To match all Transitions, use an empty criteria object `{}`. ### Lifecycle `onStart` hooks are invoked asynchronously when the Transition starts running. This happens after the `onBefore` phase is complete. At this point, the Transition has not yet exited nor entered any states. The registered `onStart` hooks are invoked in priority order. Note: A built-in `onStart` hook with high priority is used to fetch any eager resolve data. ### Return value The hook's return value can be used to pause, cancel, or redirect the current Transition. See [[HookResult]] for more information. ### Example #### Login during transition This example intercepts any transition to a state which requires authentication, when the user is not currently authenticated. It allows the user to authenticate asynchronously, then resumes the transition. If the user did not authenticate successfully, it redirects to the "guest" state, which does not require authentication. This example assumes: - authenticated states are marked using `data.requiresAuth`. - `MyAuthService.isAuthenticated()` synchronously returns a boolean. - `MyAuthService.authenticate()` presents a login dialog, and returns a promise which is resolved or rejected, whether or not the login attempt was successful. #### Example: ```js $transitions.onStart( { to: state => state.data?.requiresAuth }, function(trans) { var $state = trans.router.stateService; var MyAuthService = trans.injector().get('MyAuthService'); // If the user is not authenticated if (!MyAuthService.isAuthenticated()) { // Then return a promise for a successful login. // The transition will wait for this promise to settle return MyAuthService.authenticate().catch(function() { // If the authenticate() method failed for whatever reason, // redirect to a 'guest' state which doesn't require auth. return $state.target("guest"); }); } }); ```
 * @param {!Object<string, (boolean|function((!Object|undefined), (!ng.Transition|undefined)): boolean|string|undefined)>} matchCriteria
 * @param {function(!ng.Transition): (!Object|!Promise<(!Object|boolean|undefined)>|boolean|undefined)} callback
 * @param {(!Object|undefined)} options
 * @return {function(): void}
 */
ng.TransitionService.prototype.onStart = function(matchCriteria, callback, options) {};

/**
 * Registers a [[TransitionStateHookFn]], called when a specific state is entered. Registers a lifecycle hook, which is invoked (during a transition) when a specific state is being entered. Since this hook is run only when the specific state is being *entered*, it can be useful for performing tasks when entering a submodule/feature area such as initializing a stateful service, or for guarding access to a submodule/feature area. See [[TransitionStateHookFn]] for the signature of the function. The [[HookMatchCriteria]] is used to determine which Transitions the hook should be invoked for. `onEnter` hooks generally specify `{ entering: 'somestate' }`. To match all Transitions, use an empty criteria object `{}`. ### Lifecycle `onEnter` hooks are invoked when the Transition is entering a state. States are entered after the `onRetain` phase is complete. If more than one state is being entered, the parent state is entered first. The registered `onEnter` hooks for a state are invoked in priority order. Note: A built-in `onEnter` hook with high priority is used to fetch lazy resolve data for states being entered. ### Return value The hook's return value can be used to pause, cancel, or redirect the current Transition. See [[HookResult]] for more information. ### Inside a state declaration Instead of registering `onEnter` hooks using the [[TransitionService]], you may define an `onEnter` hook directly on a state declaration (see: [[StateDeclaration.onEnter]]). ### Examples #### Audit Log This example uses a service to log that a user has entered the admin section of an app. This assumes that there are substates of the "admin" state, such as "admin.users", "admin.pages", etc.
 * @param {!Object<string, (boolean|function((!Object|undefined), (!ng.Transition|undefined)): boolean|string|undefined)>} matchCriteria
 * @param {function(!ng.Transition, !ng.StateDeclaration): (!Object|!Promise<(!Object|boolean|undefined)>|boolean|undefined)} callback
 * @param {(!Object|undefined)} options
 * @return {function(): void}
 */
ng.TransitionService.prototype.onEnter = function(matchCriteria, callback, options) {};

/**
 * Registers a [[TransitionStateHookFn]], called when a specific state is retained/kept. Registers a lifecycle hook, which is invoked (during a transition) for a specific state that was previously active will remain active (is not being entered nor exited). This hook is invoked when a state is "retained" or "kept". It means the transition is coming *from* a substate of the retained state *to* a substate of the retained state. This hook can be used to perform actions when the user moves from one substate to another, such as between steps in a wizard. The [[HookMatchCriteria]] is used to determine which Transitions the hook should be invoked for. `onRetain` hooks generally specify `{ retained: 'somestate' }`. To match all Transitions, use an empty criteria object `{}`. ### Lifecycle `onRetain` hooks are invoked after any `onExit` hooks have been fired. If more than one state is retained, the child states' `onRetain` hooks are invoked first. The registered `onRetain` hooks for a state are invoked in priority order. ### Return value The hook's return value can be used to pause, cancel, or redirect the current Transition. See [[HookResult]] for more information. ### Inside a state declaration Instead of registering `onRetain` hooks using the [[TransitionService]], you may define an `onRetain` hook directly on a state declaration (see: [[StateDeclaration.onRetain]]).
 * @param {!Object<string, (boolean|function((!Object|undefined), (!ng.Transition|undefined)): boolean|string|undefined)>} matchCriteria
 * @param {function(!ng.Transition, !ng.StateDeclaration): (!Object|!Promise<(!Object|boolean|undefined)>|boolean|undefined)} callback
 * @param {(!Object|undefined)} options
 * @return {function(): void}
 */
ng.TransitionService.prototype.onRetain = function(matchCriteria, callback, options) {};

/**
 * Registers a [[TransitionStateHookFn]], called when a specific state is exited. Registers a lifecycle hook, which is invoked (during a transition) when a specific state is being exited. Since this hook is run only when the specific state is being *exited*, it can be useful for performing tasks when leaving a submodule/feature area such as cleaning up a stateful service, or for preventing the user from leaving a state or submodule until some criteria is satisfied. See [[TransitionStateHookFn]] for the signature of the function. The [[HookMatchCriteria]] is used to determine which Transitions the hook should be invoked for. `onExit` hooks generally specify `{ exiting: 'somestate' }`. To match all Transitions, use an empty criteria object `{}`. ### Lifecycle `onExit` hooks are invoked when the Transition is exiting a state. States are exited after any `onStart` phase is complete. If more than one state is being exited, the child states are exited first. The registered `onExit` hooks for a state are invoked in priority order. ### Return value The hook's return value can be used to pause, cancel, or redirect the current Transition. See [[HookResult]] for more information. ### Inside a state declaration Instead of registering `onExit` hooks using the [[TransitionService]], you may define an `onExit` hook directly on a state declaration (see: [[StateDeclaration.onExit]]).
 * @param {!Object<string, (boolean|function((!Object|undefined), (!ng.Transition|undefined)): boolean|string|undefined)>} matchCriteria
 * @param {function(!ng.Transition, !ng.StateDeclaration): (!Object|!Promise<(!Object|boolean|undefined)>|boolean|undefined)} callback
 * @param {(!Object|undefined)} options
 * @return {function(): void}
 */
ng.TransitionService.prototype.onExit = function(matchCriteria, callback, options) {};

/**
 * Registers a [[TransitionHookFn]], called *just before a transition finishes*. Registers a transition lifecycle hook, which is invoked just before a transition finishes. This hook is a last chance to cancel or redirect a transition. See [[TransitionHookFn]] for the signature of the function. The [[HookMatchCriteria]] is used to determine which Transitions the hook should be invoked for. To match all Transitions, use an empty criteria object `{}`. ### Lifecycle `onFinish` hooks are invoked after the `onEnter` phase is complete. These hooks are invoked just before the transition is "committed". Each hook is invoked in priority order. ### Return value The hook's return value can be used to pause, cancel, or redirect the current Transition. See [[HookResult]] for more information.
 * @param {!Object<string, (boolean|function((!Object|undefined), (!ng.Transition|undefined)): boolean|string|undefined)>} matchCriteria
 * @param {function(!ng.Transition): (!Object|!Promise<(!Object|boolean|undefined)>|boolean|undefined)} callback
 * @param {(!Object|undefined)} options
 * @return {function(): void}
 */
ng.TransitionService.prototype.onFinish = function(matchCriteria, callback, options) {};

/**
 * Registers a [[TransitionHookFn]], called after a successful transition completed. Registers a transition lifecycle hook, which is invoked after a transition successfully completes. See [[TransitionHookFn]] for the signature of the function. The [[HookMatchCriteria]] is used to determine which Transitions the hook should be invoked for. To match all Transitions, use an empty criteria object `{}`. ### Lifecycle `onSuccess` hooks are chained off the Transition's promise (see [[Transition.promise]]). If the Transition is successful and its promise is resolved, then the `onSuccess` hooks are invoked. Since these hooks are run after the transition is over, their return value is ignored. The `onSuccess` hooks are invoked in priority order. ### Return value Since the Transition is already completed, the hook's return value is ignored
 * @param {!Object<string, (boolean|function((!Object|undefined), (!ng.Transition|undefined)): boolean|string|undefined)>} matchCriteria
 * @param {function(!ng.Transition): (!Object|!Promise<(!Object|boolean|undefined)>|boolean|undefined)} callback
 * @param {(!Object|undefined)} options
 * @return {function(): void}
 */
ng.TransitionService.prototype.onSuccess = function(matchCriteria, callback, options) {};

/**
 * Registers a [[TransitionHookFn]], called after a transition has errored. Registers a transition lifecycle hook, which is invoked after a transition has been rejected for any reason. See [[TransitionHookFn]] for the signature of the function. The [[HookMatchCriteria]] is used to determine which Transitions the hook should be invoked for. To match all Transitions, use an empty criteria object `{}`. ### Lifecycle The `onError` hooks are chained off the Transition's promise (see [[Transition.promise]]). If a Transition fails, its promise is rejected and the `onError` hooks are invoked. The `onError` hooks are invoked in priority order. Since these hooks are run after the transition is over, their return value is ignored. A transition "errors" if it was started, but failed to complete (for any reason). A *non-exhaustive list* of reasons a transition can error: - A transition was cancelled because a new transition started while it was still running (`Transition superseded`) - A transition was cancelled by a Transition Hook returning false - A transition was redirected by a Transition Hook returning a [[TargetState]] - A Transition Hook or resolve function threw an error - A Transition Hook returned a rejected promise - A resolve function returned a rejected promise To check the failure reason, inspect the return value of [[Transition.error]]. Note: `onError` should be used for targeted error handling, or error recovery. For simple catch-all error reporting, use [[StateService.defaultErrorHandler]]. ### Return value Since the Transition is already completed, the hook's return value is ignored
 * @param {!Object<string, (boolean|function((!Object|undefined), (!ng.Transition|undefined)): boolean|string|undefined)>} matchCriteria
 * @param {function(!ng.Transition): (!Object|!Promise<(!Object|boolean|undefined)>|boolean|undefined)} callback
 * @param {(!Object|undefined)} options
 * @return {function(): void}
 */
ng.TransitionService.prototype.onError = function(matchCriteria, callback, options) {};

/**
 * Public AngularTS AnchorScrollService contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.AnchorScrollService = function() {};

/**
 * Vertical scroll offset. Can be a number, a function returning a number, or an Element whose offsetTop will be used.
 * @type {(!Element|function(): number|number|undefined)}
 */
ng.AnchorScrollService.prototype.yOffset;

/**
 * Invokes the callable AnchorScrollService contract.
 * @param {(!HTMLElement|number|string|undefined)} hashOrElement
 * @return {void}
 */
ng.AnchorScrollService.prototype.call = function(hashOrElement) {};

/**
 * Public AngularTS AnimateService contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.AnimateService = function() {};

/**
 * Public AnimateService.cancel member exposed by the AngularTS namespace contract.
 * @param {(!ng.AnimationHandle|undefined)} handle
 * @return {void}
 */
ng.AnimateService.prototype.cancel = function(handle) {};

/**
 * Public AnimateService.define member exposed by the AngularTS namespace contract.
 * @param {string} name
 * @param {!ng.AnimationPreset} preset
 * @return {void}
 */
ng.AnimateService.prototype.define = function(name, preset) {};

/**
 * Public AnimateService.enter member exposed by the AngularTS namespace contract.
 * @param {!Element} element
 * @param {(!Object|null|undefined)} parent
 * @param {(!Object|null|undefined)} after
 * @param {(!ng.NativeAnimationOptions|undefined)} options
 * @return {!ng.AnimationHandle}
 */
ng.AnimateService.prototype.enter = function(element, parent, after, options) {};

/**
 * Public AnimateService.move member exposed by the AngularTS namespace contract.
 * @param {!Element} element
 * @param {(!Object|null)} parent
 * @param {(!Object|null|undefined)} after
 * @param {(!ng.NativeAnimationOptions|undefined)} options
 * @return {!ng.AnimationHandle}
 */
ng.AnimateService.prototype.move = function(element, parent, after, options) {};

/**
 * Public AnimateService.leave member exposed by the AngularTS namespace contract.
 * @param {!Element} element
 * @param {(!ng.NativeAnimationOptions|undefined)} options
 * @return {!ng.AnimationHandle}
 */
ng.AnimateService.prototype.leave = function(element, options) {};

/**
 * Public AnimateService.addClass member exposed by the AngularTS namespace contract.
 * @param {!Element} element
 * @param {string} className
 * @param {(!ng.NativeAnimationOptions|undefined)} options
 * @return {!ng.AnimationHandle}
 */
ng.AnimateService.prototype.addClass = function(element, className, options) {};

/**
 * Public AnimateService.removeClass member exposed by the AngularTS namespace contract.
 * @param {!Element} element
 * @param {string} className
 * @param {(!ng.NativeAnimationOptions|undefined)} options
 * @return {!ng.AnimationHandle}
 */
ng.AnimateService.prototype.removeClass = function(element, className, options) {};

/**
 * Public AnimateService.setClass member exposed by the AngularTS namespace contract.
 * @param {!Element} element
 * @param {string} add
 * @param {string} remove
 * @param {(!ng.NativeAnimationOptions|undefined)} options
 * @return {!ng.AnimationHandle}
 */
ng.AnimateService.prototype.setClass = function(element, add, remove, options) {};

/**
 * Public AnimateService.animate member exposed by the AngularTS namespace contract.
 * @param {!Element} element
 * @param {!Object<string, (number|string)>} from
 * @param {(!Object<string, (number|string)>|undefined)} to
 * @param {(string|undefined)} className
 * @param {(!ng.NativeAnimationOptions|undefined)} options
 * @return {!ng.AnimationHandle}
 */
ng.AnimateService.prototype.animate = function(element, from, to, className, options) {};

/**
 * Public AnimateService.transition member exposed by the AngularTS namespace contract.
 * @param {function(): (!Promise<void>|void)} update
 * @return {!Promise<void>}
 */
ng.AnimateService.prototype.transition = function(update) {};

/**
 * Public AngularTS AnimationHandle contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.AnimationHandle = function() {};

/**
 * Public AnimationHandle.controller member exposed by the AngularTS namespace contract.
 * @type {!Object}
 */
ng.AnimationHandle.prototype.controller;

/**
 * Public AnimationHandle.finished member exposed by the AngularTS namespace contract.
 * @type {!Promise<undefined>}
 */
ng.AnimationHandle.prototype.finished;

/**
 * Attaches callbacks for the resolution and/or rejection of the Promise.
 * @template TResult1, TResult2
 * @param {(function(undefined): (!Object|TResult1)|null|undefined)} onfulfilled
 * @param {(function(?): (!Object|TResult2)|null|undefined)} onrejected
 * @return {!Object}
 */
ng.AnimationHandle.prototype.then = function(onfulfilled, onrejected) {};

/**
 * Public AnimationHandle.catch member exposed by the AngularTS namespace contract.
 * @template TResult
 * @param {(function(?): (!Object|TResult)|null|undefined)} onrejected
 * @return {!Promise<(TResult|undefined)>}
 */
ng.AnimationHandle.prototype.catch = function(onrejected) {};

/**
 * Public AnimationHandle.finally member exposed by the AngularTS namespace contract.
 * @param {(function(): void|null|undefined)} onfinally
 * @return {!Promise<undefined>}
 */
ng.AnimationHandle.prototype.finally = function(onfinally) {};

/**
 * Public AnimationHandle.done member exposed by the AngularTS namespace contract.
 * @param {function(boolean): void} callback
 * @return {void}
 */
ng.AnimationHandle.prototype.done = function(callback) {};

/**
 * Public AnimationHandle.cancel member exposed by the AngularTS namespace contract.
 * @return {void}
 */
ng.AnimationHandle.prototype.cancel = function() {};

/**
 * Public AnimationHandle.finish member exposed by the AngularTS namespace contract.
 * @return {void}
 */
ng.AnimationHandle.prototype.finish = function() {};

/**
 * Public AnimationHandle.pause member exposed by the AngularTS namespace contract.
 * @return {void}
 */
ng.AnimationHandle.prototype.pause = function() {};

/**
 * Public AnimationHandle.play member exposed by the AngularTS namespace contract.
 * @return {void}
 */
ng.AnimationHandle.prototype.play = function() {};

/**
 * Public AnimationHandle.complete member exposed by the AngularTS namespace contract.
 * @param {(boolean|undefined)} status
 * @return {void}
 */
ng.AnimationHandle.prototype.complete = function(status) {};

/**
 * Public AngularTS AnimationContext contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.AnimationContext = function() {};

/**
 * Public AnimationContext.signal member exposed by the AngularTS namespace contract.
 * @type {!AbortSignal}
 */
ng.AnimationContext.prototype.signal;

/**
 * Public AnimationContext.phase member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.AnimationContext.prototype.phase;

/**
 * Public AnimationContext.className member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.AnimationContext.prototype.className;

/**
 * Public AnimationContext.addClass member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.AnimationContext.prototype.addClass;

/**
 * Public AnimationContext.removeClass member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.AnimationContext.prototype.removeClass;

/**
 * Public AnimationContext.from member exposed by the AngularTS namespace contract.
 * @type {(!Object<string, (number|string)>|undefined)}
 */
ng.AnimationContext.prototype.from;

/**
 * Public AnimationContext.to member exposed by the AngularTS namespace contract.
 * @type {(!Object<string, (number|string)>|undefined)}
 */
ng.AnimationContext.prototype.to;

/**
 * Public AngularTS AnimationLifecycleCallback contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {function(!Element, !ng.AnimationContext): void}
 */
ng.AnimationLifecycleCallback;

/**
 * Public AngularTS AriaService contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.AriaService = function() {};

/**
 * Public AriaService.config member exposed by the AngularTS namespace contract.
 * @param {(number|string)} key
 * @return {?}
 */
ng.AriaService.prototype.config = function(key) {};

/**
 * Entry point for the `$compile` service.
 * @typedef {function((!Element|!Node|!Object|null|string), (!ng.PublicLinkFn|!ng.TranscludeFn|null|undefined), (number|undefined), (string|undefined), (?|undefined)): !ng.PublicLinkFn}
 */
ng.CompileService;

/**
 * Public AngularTS ControllerService contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {function((!Array<(function(...?): !ng.Controller|function(...?): (!ng.Controller|undefined))>|function(...?): (!ng.Controller|undefined)|function(new: ng.Controller, ...?)|string), (!Object|undefined), (boolean|undefined), (string|undefined)): ?}
 */
ng.ControllerService;

/**
 * High-level API for reading, writing, serializing, and removing browser cookies through the injectable `$cookie` service.
 * @record
 */
ng.CookieService = function() {};

/**
 * Retrieves a raw cookie value.
 * @param {string} key
 * @return {(null|string)}
 */
ng.CookieService.prototype.get = function(key) {};

/**
 * Retrieves a cookie and deserializes its JSON content.
 * @param {string} key
 * @return {?}
 */
ng.CookieService.prototype.getObject = function(key) {};

/**
 * Returns an object containing all raw cookies.
 * @return {!Object<string, string>}
 */
ng.CookieService.prototype.getAll = function() {};

/**
 * Sets a raw cookie value.
 * @param {string} key
 * @param {string} value
 * @param {(!ng.CookieOptions|undefined)} options
 * @return {void}
 */
ng.CookieService.prototype.put = function(key, value, options) {};

/**
 * Serializes an object as JSON and stores it as a cookie.
 * @param {string} key
 * @param {?} value
 * @param {(!ng.CookieOptions|undefined)} options
 * @return {void}
 */
ng.CookieService.prototype.putObject = function(key, value, options) {};

/**
 * Removes a cookie by setting an expired date.
 * @param {string} key
 * @param {(!ng.CookieOptions|undefined)} options
 * @return {void}
 */
ng.CookieService.prototype.remove = function(key, options) {};

/**
 * A callback type for handling errors.
 * @typedef {function(?): ?}
 */
ng.ExceptionHandlerService;

/**
 * Public AngularTS FilterFn contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {function(?, ...?): ?}
 */
ng.FilterFn;

/**
 * Public AngularTS FilterFactory contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {function(...?): !Object}
 */
ng.FilterFactory;

/**
 * Public AngularTS FilterService contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {function(string): function(?, ...?): ?}
 */
ng.FilterService;

/**
 * Public AngularTS EntryFilterItem contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.EntryFilterItem = function() {};

/**
 * Public EntryFilterItem.key member exposed by the AngularTS namespace contract.
 * @type {?}
 */
ng.EntryFilterItem.prototype.key;

/**
 * Public EntryFilterItem.value member exposed by the AngularTS namespace contract.
 * @type {?}
 */
ng.EntryFilterItem.prototype.value;

/**
 * Public AngularTS DateFilterFormat contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {string}
 */
ng.DateFilterFormat;

/**
 * Public AngularTS DateFilterOptions contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.DateFilterOptions = function() {};

/**
 * Public DateFilterOptions.locale member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.DateFilterOptions.prototype.locale;

/**
 * Public AngularTS NumberFilterOptions contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.NumberFilterOptions = function() {};

/**
 * Public NumberFilterOptions.locale member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.NumberFilterOptions.prototype.locale;

/**
 * Public AngularTS CurrencyFilterOptions contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.CurrencyFilterOptions = function() {};

/**
 * Public CurrencyFilterOptions.locale member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.CurrencyFilterOptions.prototype.locale;

/**
 * Public AngularTS RelativeTimeFilterOptions contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.RelativeTimeFilterOptions = function() {};

/**
 * Public RelativeTimeFilterOptions.locale member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.RelativeTimeFilterOptions.prototype.locale;

/**
 * Function that serializes query params into a URL-encoded string.
 * @typedef {function((!Object<string, (!Array<?>|boolean|null|number|string|undefined)>|undefined)): string}
 */
ng.HttpParamSerializerSerService;

/**
 * Runtime `$http` service contract for full request configs, HTTP verb shortcuts, defaults, and pending request tracking.
 * @constructor
 */
ng.HttpService = function() {};

/**
 * Send a `GET` request.
 * @template T
 * @param {string} url
 * @param {(!ng.RequestShortcutConfig|undefined)} config
 * @return {!Promise<!ng.HttpResponse<T>>}
 */
ng.HttpService.prototype.get = function(url, config) {};

/**
 * Send a `DELETE` request.
 * @template T
 * @param {string} url
 * @param {(!ng.RequestShortcutConfig|undefined)} config
 * @return {!Promise<!ng.HttpResponse<T>>}
 */
ng.HttpService.prototype.delete = function(url, config) {};

/**
 * Send a `HEAD` request.
 * @template T
 * @param {string} url
 * @param {(!ng.RequestShortcutConfig|undefined)} config
 * @return {!Promise<!ng.HttpResponse<T>>}
 */
ng.HttpService.prototype.head = function(url, config) {};

/**
 * Send a `POST` request with a request body.
 * @template T
 * @param {string} url
 * @param {?} data
 * @param {(!ng.RequestShortcutConfig|undefined)} config
 * @return {!Promise<!ng.HttpResponse<T>>}
 */
ng.HttpService.prototype.post = function(url, data, config) {};

/**
 * Send a `PUT` request with a request body.
 * @template T
 * @param {string} url
 * @param {?} data
 * @param {(!ng.RequestShortcutConfig|undefined)} config
 * @return {!Promise<!ng.HttpResponse<T>>}
 */
ng.HttpService.prototype.put = function(url, data, config) {};

/**
 * Send a `PATCH` request with a request body.
 * @template T
 * @param {string} url
 * @param {?} data
 * @param {(!ng.RequestShortcutConfig|undefined)} config
 * @return {!Promise<!ng.HttpResponse<T>>}
 */
ng.HttpService.prototype.patch = function(url, data, config) {};

/**
 * Runtime defaults shared with `$httpProvider.defaults`.
 * @type {!ng.HttpProviderDefaults}
 */
ng.HttpService.prototype.defaults;

/**
 * Requests currently in flight.
 * @type {!Array<!ng.RequestConfig>}
 */
ng.HttpService.prototype.pendingRequests;

/**
 * Invokes the callable HttpService contract.
 * @template T
 * @param {!ng.RequestConfig} config
 * @return {!Promise<!ng.HttpResponse<T>>}
 */
ng.HttpService.prototype.call = function(config) {};

/**
 * Injector for factories and services
 * @record
 */
ng.InjectorService = function() {};

/**
 * Public InjectorService.loadNewModules member exposed by the AngularTS namespace contract.
 * @param {!Array<(!Array<function(...?): ?>|function(...?): ?|string)>} mods
 * @return {void}
 */
ng.InjectorService.prototype.loadNewModules = function(mods) {};

/**
 * Public InjectorService.has member exposed by the AngularTS namespace contract.
 * @param {string} name
 * @return {boolean}
 */
ng.InjectorService.prototype.has = function(name) {};

/**
 * Public InjectorService.strictDi member exposed by the AngularTS namespace contract.
 * @type {boolean}
 */
ng.InjectorService.prototype.strictDi;

/**
 * Get a service by name.
 * @param {string} serviceName
 * @return {?}
 */
ng.InjectorService.prototype.get = function(serviceName) {};

/**
 * Invoke a function with optional context and locals.
 * @param {(!Array<(function(...?): ?|function(new: ?, ...?)|string)>|!Array<function(...?): ?>|function(...?): ?|function(new: ?, ...?)|string)} fn
 * @param {(?|undefined)} self
 * @param {(!Object<string, ?>|string|undefined)} locals
 * @param {(string|undefined)} serviceName
 * @return {?}
 */
ng.InjectorService.prototype.invoke = function(fn, self, locals, serviceName) {};

/**
 * Instantiate a type constructor with optional locals.
 * @param {(!Array<(function(...?): ?|function(new: ?, ...?)|string)>|!Array<function(...?): ?>|function(...?): ?|function(new: ?, ...?))} type
 * @param {(!Object<string, ?>|undefined)} locals
 * @param {(string|undefined)} serviceName
 * @return {?}
 */
ng.InjectorService.prototype.instantiate = function(type, locals, serviceName) {};

/**
 * Public AngularTS InterpolateService contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.InterpolateService = function() {};

/**
 * Public InterpolateService.endSymbol member exposed by the AngularTS namespace contract.
 * @return {string}
 */
ng.InterpolateService.prototype.endSymbol = function() {};

/**
 * Public InterpolateService.startSymbol member exposed by the AngularTS namespace contract.
 * @return {string}
 */
ng.InterpolateService.prototype.startSymbol = function() {};

/**
 * Invokes the callable InterpolateService contract.
 * @param {string} text
 * @param {(boolean|undefined)} mustHaveExpression
 * @param {(string|undefined)} trustedContext
 * @param {(boolean|undefined)} allOrNothing
 * @return {(!ng.InterpolationFunction|undefined)}
 */
ng.InterpolateService.prototype.call = function(text, mustHaveExpression, trustedContext, allOrNothing) {};

/**
 * Public AngularTS LocationService contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.LocationService = function() {};

/**
 * Public LocationService.appBase member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.LocationService.prototype.appBase;

/**
 * Public LocationService.appBaseNoFile member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.LocationService.prototype.appBaseNoFile;

/**
 * Public LocationService.html5 member exposed by the AngularTS namespace contract.
 * @type {boolean}
 */
ng.LocationService.prototype.html5;

/**
 * Public LocationService.basePrefix member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.LocationService.prototype.basePrefix;

/**
 * Public LocationService.hashPrefix member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.LocationService.prototype.hashPrefix;

/**
 * Public LocationService.absUrl member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.LocationService.prototype.absUrl;

/**
 * Change path, search and hash, when called with parameter and return `$location`.
 * @param {string} url
 * @return {!ng.LocationService}
 */
ng.LocationService.prototype.setUrl = function(url) {};

/**
 * Return URL (e.g. `/path?a=b#hash`) when called without any parameter.
 * @return {string}
 */
ng.LocationService.prototype.getUrl = function() {};

/**
 * Public LocationService.url member exposed by the AngularTS namespace contract.
 * @return {string}
 */
ng.LocationService.prototype.url = function() {};

/**
 * Changes the path parameter and returns `$location`.
 * @param {(null|number|string)} path
 * @return {!ng.LocationService}
 */
ng.LocationService.prototype.setPath = function(path) {};

/**
 * Returns the path of the current URL.
 * @return {string}
 */
ng.LocationService.prototype.getPath = function() {};

/**
 * Public LocationService.path member exposed by the AngularTS namespace contract.
 * @return {string}
 */
ng.LocationService.prototype.path = function() {};

/**
 * Changes the hash fragment when called with a parameter and returns `$location`.
 * @param {(null|number|string)} hash
 * @return {!ng.LocationService}
 */
ng.LocationService.prototype.setHash = function(hash) {};

/**
 * Returns the hash fragment when called without any parameters.
 * @return {string}
 */
ng.LocationService.prototype.getHash = function() {};

/**
 * Public LocationService.hash member exposed by the AngularTS namespace contract.
 * @return {string}
 */
ng.LocationService.prototype.hash = function() {};

/**
 * Sets the search part of the current URL as an object.
 * @param {(!Object<string, ?>|number|string)} search
 * @param {(!Array<string>|boolean|null|number|string|undefined)} paramValue
 * @return {!ng.LocationService}
 */
ng.LocationService.prototype.setSearch = function(search, paramValue) {};

/**
 * Returns the search part of the current URL as an object.
 * @return {!Object<string, ?>}
 */
ng.LocationService.prototype.getSearch = function() {};

/**
 * Public LocationService.search member exposed by the AngularTS namespace contract.
 * @return {!Object<string, ?>}
 */
ng.LocationService.prototype.search = function() {};

/**
 * Change the history state object when called with one parameter and return `$location`. The state object is later passed to `pushState` or `replaceState`. See {@link https://developer.mozilla.org/en-US/docs/Web/API/History/pushState#state History.state} NOTE: This method is supported only in HTML5 mode and only in browsers supporting the HTML5 History API (i.e. methods `pushState` and `replaceState`). If you need to support older browsers (like IE9 or Android < 4.0), don't use this method.
 * @param {?} state
 * @return {!ng.LocationService}
 */
ng.LocationService.prototype.setState = function(state) {};

/**
 * Returns the current history state object.
 * @return {?}
 */
ng.LocationService.prototype.getState = function() {};

/**
 * Public LocationService.state member exposed by the AngularTS namespace contract.
 * @return {?}
 */
ng.LocationService.prototype.state = function() {};

/**
 * Attempts to parse a clicked link into an app-relative URL update.
 * @param {string} url
 * @param {(null|string)} relHref
 * @return {boolean}
 */
ng.LocationService.prototype.parseLinkUrl = function(url, relHref) {};

/**
 * Parse given HTML5 (regular) URL string into properties
 * @param {string} url
 * @return {void}
 */
ng.LocationService.prototype.parse = function(url) {};

/**
 * Service for logging messages at various levels.
 * @record
 */
ng.LogService = function() {};

/**
 * Log a debug message.
 * @param {...?} var_args
 * @return {void}
 */
ng.LogService.prototype.debug = function(var_args) {};

/**
 * Log an error message.
 * @param {...?} var_args
 * @return {void}
 */
ng.LogService.prototype.error = function(var_args) {};

/**
 * Log an info message.
 * @param {...?} var_args
 * @return {void}
 */
ng.LogService.prototype.info = function(var_args) {};

/**
 * Log a general message.
 * @param {...?} var_args
 * @return {void}
 */
ng.LogService.prototype.log = function(var_args) {};

/**
 * Log a warning message.
 * @param {...?} var_args
 * @return {void}
 */
ng.LogService.prototype.warn = function(var_args) {};

/**
 * Parses a string or expression function into a compiled expression.
 * @typedef {function(string, (function(?): ?|undefined)): !Object}
 */
ng.ParseService;

/**
 * The API for registering different types of providers with the injector. This interface is used within AngularTS's `$provide` service to define services, factories, constants, values, decorators, etc.
 * @record
 */
ng.ProvideService = function() {};

/**
 * Register a directive Register multiple directives
 * @param {string} name
 * @param {!ng.DirectiveFactory} directive
 * @return {!ng.ProvideService}
 */
ng.ProvideService.prototype.directive = function(name, directive) {};

/**
 * Register a service provider. Register multiple service providers
 * @param {string} name
 * @param {(!ng.ServiceProvider|!ng.Injectable|!Object)} provider
 * @return {!ng.ProvideService}
 */
ng.ProvideService.prototype.provider = function(name, provider) {};

/**
 * Register a factory function to create a service.
 * @param {string} name
 * @param {!ng.Injectable} factoryFn
 * @return {!ng.ProvideService}
 */
ng.ProvideService.prototype.factory = function(name, factoryFn) {};

/**
 * Register a constructor function to create a service.
 * @param {string} name
 * @param {!ng.Injectable} constructor
 * @return {!ng.ProvideService}
 */
ng.ProvideService.prototype.service = function(name, constructor) {};

/**
 * Register a fixed value as a service.
 * @param {string} name
 * @param {?} val
 * @return {!ng.ProvideService}
 */
ng.ProvideService.prototype.value = function(name, val) {};

/**
 * Register a constant service, such as a string, a number, an array, an object or a function, with the $injector. Unlike value it can be injected into a module configuration function (see config) and it cannot be overridden by an Angular decorator.
 * @param {string} name
 * @param {?} val
 * @return {!ng.ProvideService}
 */
ng.ProvideService.prototype.constant = function(name, val) {};

/**
 * Register a decorator function to modify or replace an existing service.
 * @param {string} name
 * @param {!ng.Injectable} fn
 * @return {!ng.ProvideService}
 */
ng.ProvideService.prototype.decorator = function(name, fn) {};

/**
 * Topic-based publish/subscribe service for decoupled application events.
 * @constructor
 */
ng.PubSubService = function() {};

/**
 * Reset the bus to its initial state without disposing it. All topics and listeners are removed, and the instance can be reused.
 * @return {void}
 */
ng.PubSubService.prototype.reset = function() {};

/**
 * Checks if instance has been disposed.
 * @return {boolean}
 */
ng.PubSubService.prototype.isDisposed = function() {};

/**
 * Dispose the instance, removing all topics and listeners.
 * @return {void}
 */
ng.PubSubService.prototype.dispose = function() {};

/**
 * Subscribe a function to a topic. The returned function removes only this listener registration.
 * @param {string} topic
 * @param {function(...?): ?} fn
 * @param {(?|undefined)} context
 * @return {function(): boolean}
 */
ng.PubSubService.prototype.subscribe = function(topic, fn, context) {};

/**
 * Subscribe a function to a topic only once. Listener is removed before the first invocation.
 * @param {string} topic
 * @param {function(...?): ?} fn
 * @param {(?|undefined)} context
 * @return {function(): boolean}
 */
ng.PubSubService.prototype.subscribeOnce = function(topic, fn, context) {};

/**
 * Unsubscribe a specific function from a topic. Matches by function reference and optional context.
 * @param {string} topic
 * @param {function(...?): ?} fn
 * @param {(?|undefined)} context
 * @return {boolean}
 */
ng.PubSubService.prototype.unsubscribe = function(topic, fn, context) {};

/**
 * Get the number of subscribers for a topic.
 * @param {string} topic
 * @return {number}
 */
ng.PubSubService.prototype.getCount = function(topic) {};

/**
 * Publish a value to a topic asynchronously. All listeners are invoked in the order they were added. Delivery is scheduled with `queueMicrotask`.
 * @param {string} topic
 * @param {...?} var_args
 * @return {boolean}
 */
ng.PubSubService.prototype.publish = function(topic, var_args) {};

/**
 * **`Element`** is the most general base class from which all element objects (i.e., objects that represent elements) in a Document inherit. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element)
 * @typedef {!Element}
 */
ng.RootElementService;

/**
 * Public AngularTS RootScopeService contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.RootScopeService = function() {};

/**
 * Public RootScopeService.$proxy member exposed by the AngularTS namespace contract.
 * @type {!ng.Scope}
 */
ng.RootScopeService.prototype.$proxy;

/**
 * Public RootScopeService.$handler member exposed by the AngularTS namespace contract.
 * @type {?}
 */
ng.RootScopeService.prototype.$handler;

/**
 * Public RootScopeService.$target member exposed by the AngularTS namespace contract.
 * @type {!Object}
 */
ng.RootScopeService.prototype.$target;

/**
 * Public RootScopeService.$id member exposed by the AngularTS namespace contract.
 * @type {number}
 */
ng.RootScopeService.prototype.$id;

/**
 * Public RootScopeService.$root member exposed by the AngularTS namespace contract.
 * @type {!ng.Scope}
 */
ng.RootScopeService.prototype.$root;

/**
 * Public RootScopeService.$parent member exposed by the AngularTS namespace contract.
 * @type {(!ng.Scope|undefined)}
 */
ng.RootScopeService.prototype.$parent;

/**
 * Public RootScopeService.$scopename member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.RootScopeService.prototype.$scopename;

/**
 * Intercepts and handles property assignments on the target object. Scopeable objects are stored as raw model values and proxied lazily when read.
 * @param {!Object} target
 * @param {string} property
 * @param {?} value
 * @param {!ng.Scope} proxy
 * @return {boolean}
 */
ng.RootScopeService.prototype.set = function(target, property, value, proxy) {};

/**
 * Intercepts property access on the target object. It checks for specific properties (`watch` and `sync`) and binds their methods. For other properties, it returns the value directly.
 * @param {!Object} target
 * @param {(number|string|symbol)} property
 * @param {!ng.Scope} proxy
 * @return {?}
 */
ng.RootScopeService.prototype.get = function(target, property, proxy) {};

/**
 * Public RootScopeService.deleteProperty member exposed by the AngularTS namespace contract.
 * @param {!Object} target
 * @param {(number|string|symbol)} property
 * @return {boolean}
 */
ng.RootScopeService.prototype.deleteProperty = function(target, property) {};

/**
 * Registers a watcher for a property along with a listener function. The listener function is invoked when changes to that property are detected.
 * @param {string} watchProp
 * @param {(function((?|undefined), (?|undefined)): void|undefined)} listenerFn
 * @param {(boolean|undefined)} lazy
 * @return {(function(): void|undefined)}
 */
ng.RootScopeService.prototype.$watch = function(watchProp, listenerFn, lazy) {};

/**
 * Creates a prototypically inherited child scope.
 * @param {(!ng.Scope|undefined)} childInstance
 * @return {!ng.Scope}
 */
ng.RootScopeService.prototype.$new = function(childInstance) {};

/**
 * Creates an isolate child scope that does not inherit watchable properties directly.
 * @param {(!ng.Scope|undefined)} instance
 * @return {!ng.Scope}
 */
ng.RootScopeService.prototype.$newIsolate = function(instance) {};

/**
 * Creates a transcluded child scope linked to this scope and an optional parent instance.
 * @param {(!ng.Scope|undefined)} parentInstance
 * @return {!ng.Scope}
 */
ng.RootScopeService.prototype.$transcluded = function(parentInstance) {};

/**
 * Merges enumerable properties from the provided object into the current scope target.
 * @param {!Object} newTarget
 * @return {void}
 */
ng.RootScopeService.prototype.$merge = function(newTarget) {};

/**
 * Registers an event listener on this scope and returns a deregistration function.
 * @param {string} name
 * @param {function(...?): ?} listener
 * @return {function(): void}
 */
ng.RootScopeService.prototype.$on = function(name, listener) {};

/**
 * Emits an event upward through the scope hierarchy.
 * @param {string} name
 * @param {...?} var_args
 * @return {(!ng.ScopeEvent|undefined)}
 */
ng.RootScopeService.prototype.$emit = function(name, var_args) {};

/**
 * Broadcasts an event downward through the scope hierarchy.
 * @param {string} name
 * @param {...?} var_args
 * @return {(!ng.ScopeEvent|undefined)}
 */
ng.RootScopeService.prototype.$broadcast = function(name, var_args) {};

/**
 * Queues a callback to run after the current listener batch completes.
 * @param {function(): void} fn
 * @return {void}
 */
ng.RootScopeService.prototype.$postUpdate = function(fn) {};

/**
 * Public RootScopeService.$destroy member exposed by the AngularTS namespace contract.
 * @return {void}
 */
ng.RootScopeService.prototype.$destroy = function() {};

/**
 * Public RootScopeService.$flushQueue member exposed by the AngularTS namespace contract.
 * @return {void}
 */
ng.RootScopeService.prototype.$flushQueue = function() {};

/**
 * Searches this scope tree for a scope with the given id.
 * @param {(number|string)} id
 * @return {(!ng.Scope|undefined)}
 */
ng.RootScopeService.prototype.$getById = function(id) {};

/**
 * Searches the scope tree for a scope registered under the provided name.
 * @param {string} name
 * @return {(!ng.Scope|undefined)}
 */
ng.RootScopeService.prototype.$searchByName = function(name) {};

/**
 * Provides services related to ng-router states. This API is located at `$state`.
 * @record
 */
ng.StateService = function() {};

/**
 * The latest successful state parameters
 * @type {!Object<string, ?>}
 */
ng.StateService.prototype.params;

/**
 * The current [[StateDeclaration]]
 * @type {(!ng.StateDeclaration|undefined)}
 */
ng.StateService.prototype.current;

/**
 * The current [[StateObject]] (an internal API)
 * @type {(!Object|undefined)}
 */
ng.StateService.prototype.$current;

/**
 * Public StateService.$get member exposed by the AngularTS namespace contract.
 * @type {!Array<(function(!ng.InjectorService, !Object, !Object, !ng.Scope, !Object): !Object|string)>}
 */
ng.StateService.prototype.$get;

/**
 * Register a router state. Register a named router state.
 * @param {!ng.StateDeclaration} definition
 * @return {!Object}
 */
ng.StateService.prototype.state = function(definition) {};

/**
 * Registers a lazy state namespace. The loader is invoked the first time navigation targets this prefix.
 * @param {string} prefix
 * @param {function(!Object, (!ng.InjectorService|undefined)): (!Array<!ng.StateDeclaration>|!Promise<(!Array<!ng.StateDeclaration>|!ng.StateDeclaration|undefined)>|!ng.StateDeclaration|undefined)} loader
 * @return {!Object}
 */
ng.StateService.prototype.lazy = function(prefix, loader) {};

/**
 * Reloads the current state A method that force reloads the current state, or a partial state hierarchy. All resolves are re-resolved, and components reinstantiated. #### Example: ```js let app = angular.module('app', []); app.controller('ctrl', function ($scope, $state) { $scope.reload = function(){ $state.reload(); } }); ``` Note: `reload()` is just an alias for: ```js $state.transitionTo($state.current, $state.params, { reload: true, inherit: false }); ```
 * @param {(!Object|!ng.StateDeclaration|string|undefined)} reloadState
 * @return {(!Object|!Promise<(!ng.StateDeclaration|undefined)>)}
 */
ng.StateService.prototype.reload = function(reloadState) {};

/**
 * Transition to a different state and/or parameters Convenience method for transitioning to a new state. `$state.go` calls `$state.transitionTo` internally but automatically sets options to `{ location: true, inherit: true, relative: $state.$current }`. This allows you to use either an absolute or relative `to` argument (because of `relative: $state.$current`). It also allows you to specify * only the parameters you'd like to update, while letting unspecified parameters inherit from the current parameter values (because of `inherit: true`). #### Example: ```js let app = angular.module('app', []); app.controller('ctrl', function ($scope, $state) { $scope.changeState = function () { $state.go('contact.detail'); }; }); ```
 * @param {(!Object|!ng.StateDeclaration|string)} to
 * @param {(!Object<string, ?>|undefined)} params
 * @param {(!Object|undefined)} options
 * @return {(!Object|!Promise<(!ng.StateDeclaration|undefined)>)}
 */
ng.StateService.prototype.go = function(to, params, options) {};

/**
 * Creates a [[TargetState]] This is a factory method for creating a TargetState This may be returned from a Transition Hook to redirect a transition, for example.
 * @param {(!Object|!ng.StateDeclaration|string)} identifier
 * @param {(!Object<string, ?>|undefined)} params
 * @param {(!Object|undefined)} options
 * @return {!Object}
 */
ng.StateService.prototype.target = function(identifier, params, options) {};

/**
 * Public StateService.getCurrentPath member exposed by the AngularTS namespace contract.
 * @return {!Array<!Object>}
 */
ng.StateService.prototype.getCurrentPath = function() {};

/**
 * Low-level method for transitioning to a new state. The [[go]] method (which uses `transitionTo` internally) is recommended in most situations. #### Example: ```js let app = angular.module('app', []); app.controller('ctrl', function ($scope, $state) { $scope.changeState = function () { $state.transitionTo('contact.detail'); }; }); ```
 * @param {(!Object|!ng.StateDeclaration|string)} to
 * @param {(!Object<string, ?>|undefined)} toParams
 * @param {(!Object|undefined)} options
 * @return {(!Object|!Promise<(!ng.StateDeclaration|undefined)>)}
 */
ng.StateService.prototype.transitionTo = function(to, toParams, options) {};

/**
 * Checks if the current state *is* the provided state Similar to [[includes]] but only checks for the full state name. If params is supplied then it will be tested for strict equality against the current active params object, so all params must match with none missing and no extras. #### Example: ```js $state.$current.name = 'contacts.details.item'; // absolute name $state.is('contact.details.item'); // returns true $state.is(contactDetailItemStateObject); // returns true ``` // relative name (. and ^), typically from a template // E.g. from the 'contacts.details' template ```html <div ng-class="{highlighted: $state.is('.item')}">Item</div> ```
 * @param {(!Object|!ng.StateDeclaration|string)} stateOrName
 * @param {(!Object<string, ?>|undefined)} params
 * @param {(!Object|undefined)} options
 * @return {(boolean|undefined)}
 */
ng.StateService.prototype.is = function(stateOrName, params, options) {};

/**
 * Checks if the current state *includes* the provided state A method to determine if the current active state is equal to or is the child of the state stateName. If any params are passed then they will be tested for a match as well. Not all the parameters need to be passed, just the ones you'd like to test for equality. #### Example when `$state.$current.name === 'contacts.details.item'` ```js // Using partial names $state.includes("contacts"); // returns true $state.includes("contacts.details"); // returns true $state.includes("contacts.details.item"); // returns true $state.includes("contacts.list"); // returns false $state.includes("about"); // returns false ``` #### Glob Examples when `* $state.$current.name === 'contacts.details.item.url'`: ```js $state.includes("*.details.*.*"); // returns true $state.includes("*.details.**"); // returns true $state.includes("**.item.**"); // returns true $state.includes("*.details.item.url"); // returns true $state.includes("*.details.*.url"); // returns true $state.includes("*.details.*"); // returns false $state.includes("item.**"); // returns false ```
 * @param {(!Object|!ng.StateDeclaration|string)} stateOrName
 * @param {(!Object<string, ?>|undefined)} params
 * @param {(!Object|undefined)} options
 * @return {(boolean|undefined)}
 */
ng.StateService.prototype.includes = function(stateOrName, params, options) {};

/**
 * Generates a URL for a state and parameters Returns the url for the given state populated with the given params. #### Example: ```js expect($state.href("about.person", { person: "bob" })).toEqual("/about/bob"); ```
 * @param {(!Object|!ng.StateDeclaration|string)} stateOrName
 * @param {(!Object<string, ?>|undefined)} params
 * @param {(!Object|undefined)} options
 * @return {(null|string)}
 */
ng.StateService.prototype.href = function(stateOrName, params, options) {};

/**
 * Sets or gets the default [[transitionTo]] error handler. The error handler is called when a [[Transition]] is rejected or when any error occurred during the Transition. This includes errors caused by resolves and transition hooks. Note: This handler does not receive certain Transition rejections. Redirected and Ignored Transitions are not considered to be errors by [[StateService.transitionTo]]. The built-in default error handler logs the error to the console. You can provide your own custom handler. #### Example: ```js stateService.defaultErrorHandler(function() { // Do not log transitionTo errors }); ```
 * @param {(function(?): ?|undefined)} handler
 * @return {function(?): ?}
 */
ng.StateService.prototype.defaultErrorHandler = function(handler) {};

/**
 * Public StateService.get member exposed by the AngularTS namespace contract.
 * @param {(!Object|!ng.StateDeclaration|string|undefined)} stateOrName
 * @param {(!Object|!ng.StateDeclaration|string|undefined)} base
 * @return {(!Array<!ng.StateDeclaration>|!ng.StateDeclaration|null)}
 */
ng.StateService.prototype.get = function(stateOrName, base) {};

/**
 * A registry for all of the application's [[StateDeclaration]]s This API is found at `$stateRegistry`.
 * @record
 */
ng.StateRegistryService = function() {};

/**
 * Public StateRegistryService.$get member exposed by the AngularTS namespace contract.
 * @type {!Array<(function(!ng.InjectorService): !Object|string)>}
 */
ng.StateRegistryService.prototype.$get;

/**
 * Public StateRegistryService.registerRoot member exposed by the AngularTS namespace contract.
 * @return {void}
 */
ng.StateRegistryService.prototype.registerRoot = function() {};

/**
 * Listen for a State Registry events Adds a callback that is invoked when states are registered or deregistered with the StateRegistry. #### Example: ```js let allStates = registry.get(); // Later, invoke deregisterFn() to remove the listener let deregisterFn = registry.onStatesChanged((event, states) => { switch(event) { case: 'registered': states.forEach(state => allStates.push(state)); break; case: 'deregistered': states.forEach(state => { let idx = allStates.indexOf(state); if (idx !== -1) allStates.splice(idx, 1); }); break; } }); ```
 * @param {function(string, !Array<!ng.StateDeclaration>): void} listener
 * @return {function(): void}
 */
ng.StateRegistryService.prototype.onStatesChanged = function(listener) {};

/**
 * Gets the implicit root state Gets the root of the state tree. The root state is implicitly created by ng-router. Note: this returns the internal [[StateObject]] representation, not a [[StateDeclaration]]
 * @return {!Object}
 */
ng.StateRegistryService.prototype.root = function() {};

/**
 * Adds a state to the registry Registers a [[StateDeclaration]] or queues it for registration. Note: a state will be queued if the state's parent isn't yet registered.
 * @param {(!ng.StateDeclaration|function(new: ng.StateDeclaration))} stateDefinition
 * @return {!Object}
 */
ng.StateRegistryService.prototype.register = function(stateDefinition) {};

/**
 * Removes a state from the registry This removes a state from the registry. If the state has children, they are are also removed from the registry.
 * @param {(!Object|!ng.StateDeclaration|string)} stateOrName
 * @return {!Array<!ng.StateDeclaration>}
 */
ng.StateRegistryService.prototype.deregister = function(stateOrName) {};

/**
 * Public StateRegistryService.getAll member exposed by the AngularTS namespace contract.
 * @return {!Array<!ng.StateDeclaration>}
 */
ng.StateRegistryService.prototype.getAll = function() {};

/**
 * Public StateRegistryService.get member exposed by the AngularTS namespace contract.
 * @param {(!Object|!ng.StateDeclaration|string|undefined)} stateOrName
 * @param {(!Object|!ng.StateDeclaration|string|undefined)} base
 * @return {(!Array<!ng.StateDeclaration>|!ng.StateDeclaration|null)}
 */
ng.StateRegistryService.prototype.get = function(stateOrName, base) {};

/**
 * Public AngularTS SceService contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.SceService = function() {};

/**
 * Public SceService.getTrusted member exposed by the AngularTS namespace contract.
 * @param {string} type
 * @param {?} mayBeTrusted
 * @return {?}
 */
ng.SceService.prototype.getTrusted = function(type, mayBeTrusted) {};

/**
 * Public SceService.getTrustedHtml member exposed by the AngularTS namespace contract.
 * @param {?} value
 * @return {?}
 */
ng.SceService.prototype.getTrustedHtml = function(value) {};

/**
 * Public SceService.getTrustedResourceUrl member exposed by the AngularTS namespace contract.
 * @param {?} value
 * @return {?}
 */
ng.SceService.prototype.getTrustedResourceUrl = function(value) {};

/**
 * Public SceService.getTrustedUrl member exposed by the AngularTS namespace contract.
 * @param {?} value
 * @return {?}
 */
ng.SceService.prototype.getTrustedUrl = function(value) {};

/**
 * Public SceService.getTrustedMediaUrl member exposed by the AngularTS namespace contract.
 * @param {?} value
 * @return {?}
 */
ng.SceService.prototype.getTrustedMediaUrl = function(value) {};

/**
 * Public SceService.parse member exposed by the AngularTS namespace contract.
 * @param {string} type
 * @param {string} expression
 * @return {function(?, ?): ?}
 */
ng.SceService.prototype.parse = function(type, expression) {};

/**
 * Public SceService.parseAsHtml member exposed by the AngularTS namespace contract.
 * @param {string} expression
 * @return {function(?, ?): ?}
 */
ng.SceService.prototype.parseAsHtml = function(expression) {};

/**
 * Public SceService.parseAsResourceUrl member exposed by the AngularTS namespace contract.
 * @param {string} expression
 * @return {function(?, ?): ?}
 */
ng.SceService.prototype.parseAsResourceUrl = function(expression) {};

/**
 * Public SceService.parseAsUrl member exposed by the AngularTS namespace contract.
 * @param {string} expression
 * @return {function(?, ?): ?}
 */
ng.SceService.prototype.parseAsUrl = function(expression) {};

/**
 * Public SceService.parseAsMediaUrl member exposed by the AngularTS namespace contract.
 * @param {string} expression
 * @return {function(?, ?): ?}
 */
ng.SceService.prototype.parseAsMediaUrl = function(expression) {};

/**
 * Public SceService.trustAs member exposed by the AngularTS namespace contract.
 * @param {string} type
 * @param {?} value
 * @return {?}
 */
ng.SceService.prototype.trustAs = function(type, value) {};

/**
 * Public SceService.trustAsHtml member exposed by the AngularTS namespace contract.
 * @param {?} value
 * @return {?}
 */
ng.SceService.prototype.trustAsHtml = function(value) {};

/**
 * Public SceService.trustAsResourceUrl member exposed by the AngularTS namespace contract.
 * @param {?} value
 * @return {?}
 */
ng.SceService.prototype.trustAsResourceUrl = function(value) {};

/**
 * Public SceService.trustAsUrl member exposed by the AngularTS namespace contract.
 * @param {?} value
 * @return {?}
 */
ng.SceService.prototype.trustAsUrl = function(value) {};

/**
 * Public SceService.trustAsMediaUrl member exposed by the AngularTS namespace contract.
 * @param {?} value
 * @return {?}
 */
ng.SceService.prototype.trustAsMediaUrl = function(value) {};

/**
 * Public SceService.isEnabled member exposed by the AngularTS namespace contract.
 * @return {boolean}
 */
ng.SceService.prototype.isEnabled = function() {};

/**
 * Public SceService.valueOf member exposed by the AngularTS namespace contract.
 * @param {(?|undefined)} value
 * @return {?}
 */
ng.SceService.prototype.valueOf = function(value) {};

/**
 * Public AngularTS SceDelegateService contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.SceDelegateService = function() {};

/**
 * Public SceDelegateService.getTrusted member exposed by the AngularTS namespace contract.
 * @param {string} type
 * @param {?} mayBeTrusted
 * @return {?}
 */
ng.SceDelegateService.prototype.getTrusted = function(type, mayBeTrusted) {};

/**
 * Public SceDelegateService.trustAs member exposed by the AngularTS namespace contract.
 * @param {string} type
 * @param {?} value
 * @return {?}
 */
ng.SceDelegateService.prototype.trustAs = function(type, value) {};

/**
 * Public SceDelegateService.valueOf member exposed by the AngularTS namespace contract.
 * @param {(?|undefined)} value
 * @return {?}
 */
ng.SceDelegateService.prototype.valueOf = function(value) {};

/**
 * $sse service type Returns a managed SSE connection that automatically reconnects when needed.
 * @typedef {function(string, (!ng.SseConfig|undefined)): !ng.SseConnection}
 */
ng.SseService;

/**
 * SSE-specific configuration
 * @record
 */
ng.SseConfig = function() {};

/**
 * Include cookies/credentials when connecting
 * @type {(boolean|undefined)}
 */
ng.SseConfig.prototype.withCredentials;

/**
 * Optional query parameters appended to the URL
 * @type {(!Object<string, ?>|undefined)}
 */
ng.SseConfig.prototype.params;

/**
 * Custom headers (EventSource doesn't natively support headers)
 * @type {(!Object<string, string>|undefined)}
 */
ng.SseConfig.prototype.headers;

/**
 * Called when the connection opens
 * @type {(function(!Event): void|undefined)}
 */
ng.SseConfig.prototype.onOpen;

/**
 * Called when a message is received
 * @type {(function(?, (!Event|!Object)): void|undefined)}
 */
ng.SseConfig.prototype.onMessage;

/**
 * Called with every registered connection message, including custom SSE event types
 * @type {(function(!ng.ConnectionEvent): void|undefined)}
 */
ng.SseConfig.prototype.onEvent;

/**
 * Called when an error occurs
 * @type {(function(?): void|undefined)}
 */
ng.SseConfig.prototype.onError;

/**
 * Called when a WebSocket connection closes
 * @type {(function(!Object): void|undefined)}
 */
ng.SseConfig.prototype.onClose;

/**
 * Called when a reconnect attempt happens
 * @type {(function(number): void|undefined)}
 */
ng.SseConfig.prototype.onReconnect;

/**
 * Delay between reconnect attempts in milliseconds
 * @type {(number|undefined)}
 */
ng.SseConfig.prototype.retryDelay;

/**
 * Maximum number of reconnect attempts
 * @type {(number|undefined)}
 */
ng.SseConfig.prototype.maxRetries;

/**
 * Timeout in milliseconds to detect heartbeat inactivity
 * @type {(number|undefined)}
 */
ng.SseConfig.prototype.heartbeatTimeout;

/**
 * Function to transform incoming messages
 * @type {(function(?): ?|undefined)}
 */
ng.SseConfig.prototype.transformMessage;

/**
 * Additional EventSource event names to subscribe to
 * @type {(!Array<string>|undefined)}
 */
ng.SseConfig.prototype.eventTypes;

/**
 * Managed SSE connection object returned by $sse. Provides a safe way to close the connection and stop reconnection attempts.
 * @record
 */
ng.SseConnection = function() {};

/**
 * Manually close the SSE connection and stop all reconnect attempts
 * @return {void}
 */
ng.SseConnection.prototype.close = function() {};

/**
 * Manually restart the SSE connection.
 * @return {void}
 */
ng.SseConnection.prototype.connect = function() {};

/**
 * Public AngularTS RealtimeProtocolEventDetail contract exposed through the global ng namespace for Closure-annotated applications.
 * @template T, TSource
 * @record
 */
ng.RealtimeProtocolEventDetail = function() {};

/**
 * Public RealtimeProtocolEventDetail.data member exposed by the AngularTS namespace contract.
 * @type {(T|undefined)}
 */
ng.RealtimeProtocolEventDetail.prototype.data;

/**
 * Public RealtimeProtocolEventDetail.event member exposed by the AngularTS namespace contract.
 * @type {(!Event|!Object|null|undefined)}
 */
ng.RealtimeProtocolEventDetail.prototype.event;

/**
 * Public RealtimeProtocolEventDetail.source member exposed by the AngularTS namespace contract.
 * @type {(TSource|undefined)}
 */
ng.RealtimeProtocolEventDetail.prototype.source;

/**
 * Public RealtimeProtocolEventDetail.url member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.RealtimeProtocolEventDetail.prototype.url;

/**
 * Public RealtimeProtocolEventDetail.error member exposed by the AngularTS namespace contract.
 * @type {(?|undefined)}
 */
ng.RealtimeProtocolEventDetail.prototype.error;

/**
 * Public AngularTS RealtimeProtocolMessage contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.RealtimeProtocolMessage = function() {};

/**
 * Plain value used as swap content when `html` is omitted.
 * @type {(?|undefined)}
 */
ng.RealtimeProtocolMessage.prototype.data;

/**
 * HTML or text payload to apply with the configured swap mode.
 * @type {(?|undefined)}
 */
ng.RealtimeProtocolMessage.prototype.html;

/**
 * Optional CSS selector that overrides the directive target for this message.
 * @type {(string|undefined)}
 */
ng.RealtimeProtocolMessage.prototype.target;

/**
 * Optional swap mode that overrides the directive swap mode for this message.
 * @type {(string|undefined)}
 */
ng.RealtimeProtocolMessage.prototype.swap;

/**
 * Public AngularTS SseProtocolEventDetail contract exposed through the global ng namespace for Closure-annotated applications.
 * @template T
 * @record
 */
ng.SseProtocolEventDetail = function() {};

/**
 * Public SseProtocolEventDetail.data member exposed by the AngularTS namespace contract.
 * @type {(T|undefined)}
 */
ng.SseProtocolEventDetail.prototype.data;

/**
 * Public SseProtocolEventDetail.event member exposed by the AngularTS namespace contract.
 * @type {(!Event|!Object|null|undefined)}
 */
ng.SseProtocolEventDetail.prototype.event;

/**
 * Public SseProtocolEventDetail.source member exposed by the AngularTS namespace contract.
 * @type {(!ng.SseConnection|undefined)}
 */
ng.SseProtocolEventDetail.prototype.source;

/**
 * Public SseProtocolEventDetail.url member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.SseProtocolEventDetail.prototype.url;

/**
 * Public SseProtocolEventDetail.error member exposed by the AngularTS namespace contract.
 * @type {(?|undefined)}
 */
ng.SseProtocolEventDetail.prototype.error;

/**
 * Public AngularTS SseProtocolMessage contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.SseProtocolMessage = function() {};

/**
 * Plain value used as swap content when `html` is omitted.
 * @type {(?|undefined)}
 */
ng.SseProtocolMessage.prototype.data;

/**
 * HTML or text payload to apply with the configured swap mode.
 * @type {(?|undefined)}
 */
ng.SseProtocolMessage.prototype.html;

/**
 * Optional CSS selector that overrides the directive target for this message.
 * @type {(string|undefined)}
 */
ng.SseProtocolMessage.prototype.target;

/**
 * Optional swap mode that overrides the directive swap mode for this message.
 * @type {(string|undefined)}
 */
ng.SseProtocolMessage.prototype.swap;

/**
 * Public AngularTS SwapModeType contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {string}
 */
ng.SwapModeType;

/**
 * Public AngularTS TemplateCacheService contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {!Map<string, string>}
 */
ng.TemplateCacheService;

/**
 * Downloads a template using $http and, upon success, stores the contents inside of $templateCache. If the HTTP request fails or the response data of the HTTP request is empty then a $compile error will be thrown (unless {ignoreRequestError} is set to true).
 * @typedef {function(string): !Promise<string>}
 */
ng.TemplateRequestService;

/**
 * Single-topic pub/sub object used to publish values and manage subscriptions.
 * @record
 */
ng.TopicService = function() {};

/**
 * Base topic prefix used by this facade.
 * @type {string}
 */
ng.TopicService.prototype.topic;

/**
 * Publish an event under `${topic}:${event}`.
 * @param {string} event
 * @param {...?} var_args
 * @return {boolean}
 */
ng.TopicService.prototype.publish = function(event, var_args) {};

/**
 * Subscribe to an event under `${topic}:${event}`.
 * @param {string} event
 * @param {function(...?): ?} fn
 * @param {(?|undefined)} context
 * @return {function(): boolean}
 */
ng.TopicService.prototype.subscribe = function(event, fn, context) {};

/**
 * Subscribe once to an event under `${topic}:${event}`.
 * @param {string} event
 * @param {function(...?): ?} fn
 * @param {(?|undefined)} context
 * @return {function(): boolean}
 */
ng.TopicService.prototype.subscribeOnce = function(event, fn, context) {};

/**
 * Return subscriber count for an event under `${topic}:${event}`.
 * @param {string} event
 * @return {number}
 */
ng.TopicService.prototype.getCount = function(event) {};

/**
 * Main AngularTS runtime entry point with the full built-in `ng` module configured by default.
 * @record
 */
ng.AngularService = function() {};

/**
 * Sub-application instances created when multiple `ng-app` roots are initialized.
 * @type {!Array<!ng.AngularService>}
 */
ng.AngularService.prototype.subapps;

/**
 * Application-wide event bus, available after bootstrap providers are created.
 * @type {!ng.PubSubService}
 */
ng.AngularService.prototype.$eventBus;

/**
 * Application injector, available after `bootstrap()` or `injector()` completes.
 * @type {!ng.InjectorService}
 */
ng.AngularService.prototype.$injector;

/**
 * Root scope for the bootstrapped application.
 * @type {!ng.Scope}
 */
ng.AngularService.prototype.$rootScope;

/**
 * AngularTS version string replaced at build time.
 * @type {string}
 */
ng.AngularService.prototype.version;

/**
 * Retrieve the controller instance cached on a compiled DOM element.
 * @param {!Element} element
 * @param {(string|undefined)} name
 * @return {(!ng.Scope|undefined)}
 */
ng.AngularService.prototype.getController = function(element, name) {};

/**
 * Retrieve the injector cached on a bootstrapped DOM element.
 * @param {!Element} element
 * @return {!ng.InjectorService}
 */
ng.AngularService.prototype.getInjector = function(element) {};

/**
 * Retrieve the scope cached on a compiled DOM element.
 * @param {!Element} element
 * @return {!ng.Scope}
 */
ng.AngularService.prototype.getScope = function(element) {};

/**
 * Global framework error-handling configuration.
 * @param {(!ng.ErrorHandlingConfig|undefined)} config
 * @return {!ng.ErrorHandlingConfig}
 */
ng.AngularService.prototype.errorHandlingConfig = function(config) {};

/**
 * Public injection token names keyed by token value.
 * @type {!ng.InjectionTokens}
 */
ng.AngularService.prototype.$t;

/**
 * Registers the configured built-in `ng` module for this runtime instance.
 * @return {!ng.NgModule}
 */
ng.AngularService.prototype.registerNgModule = function() {};

/**
 * The `angular.module` is a global place for creating, registering and retrieving AngularTS modules. All modules (AngularTS core or 3rd party) that should be available to an application must be registered using this mechanism. Passing one argument retrieves an existing ng.NgModule, whereas passing more than one argument creates a new ng.NgModule # Module A module is a collection of services, directives, controllers, filters, workers, WebAssembly modules, and configuration information. `angular.module` is used to configure the auto.$injector `$injector`. ```js // Create a new module let myModule = angular.module('myModule', []); // register a new service myModule.value('appName', 'MyCoolApp'); // configure existing services inside initialization blocks. myModule.config(['$locationProvider', function($locationProvider) { // Configure existing providers $locationProvider.hashPrefix('!'); }]); ``` Then you can create an injector and load your modules like this: ```js let injector = angular.injector(['ng', 'myModule']) ``` However it's more likely that you'll use the `ng-app` directive or `bootstrap()` to simplify this process.
 * @param {string} name
 * @param {(!Array<string>|undefined)} requires
 * @param {(!ng.Injectable|undefined)} configFn
 * @return {!ng.NgModule}
 */
ng.AngularService.prototype.module = function(name, requires, configFn) {};

/**
 * Dispatches an invocation event to either an injectable service or a named scope. The event `type` identifies the target and the payload contains the expression to evaluate against that target.
 * @param {!Event} event
 * @return {boolean}
 */
ng.AngularService.prototype.dispatchEvent = function(event) {};

/**
 * Fire-and-forget. Accepts a single string: `"<target>.<expression>"`
 * @param {string} input
 * @return {void}
 */
ng.AngularService.prototype.emit = function(input) {};

/**
 * Await result. Accepts a single string: `"<target>.<expression>"`
 * @param {string} input
 * @return {!Promise<?>}
 */
ng.AngularService.prototype.call = function(input) {};

/**
 * Use this function to manually start up AngularTS application. AngularTS will detect if it has been loaded into the browser more than once and only allow the first loaded script to be bootstrapped and will report a warning to the browser console for each of the subsequent scripts. This prevents strange results in applications, where otherwise multiple instances of AngularTS try to work on the DOM. **Note:** Do not bootstrap the app on an element with a directive that uses transclusion, such as `ng-if`, `ng-include`, or `ng-view`. Doing this misplaces the app root element and injector, causing animations to stop working and making the injector inaccessible from outside the app. ```html <!doctype html> <html> <body> <div ng-controller="WelcomeController"> {{greeting}} </div> <script src="angular.js"></script> <script> let app = angular.module('demo', []) .controller('WelcomeController', function($scope) { $scope.greeting = 'Welcome!'; }); angular.bootstrap(document, ['demo']); </script> </body> </html> ```
 * @param {(!Document|!HTMLElement|string)} element
 * @param {(!Array<(string|!ng.Injectable)>|undefined)} modules
 * @param {(!Object|undefined)} config
 * @return {!ng.InjectorService}
 */
ng.AngularService.prototype.bootstrap = function(element, modules, config) {};

/**
 * Create a standalone injector without bootstrapping the DOM.
 * @param {!Array<(string|!ng.Injectable)>} modules
 * @param {(boolean|undefined)} strictDi
 * @return {!ng.InjectorService}
 */
ng.AngularService.prototype.injector = function(modules, strictDi) {};

/**
 * Find `ng-app` roots under the provided element and bootstrap them. The first root uses this instance. Additional roots are bootstrapped as sub-applications and stored in {@link subapps}.
 * @param {(!Document|!HTMLElement)} element
 * @return {void}
 */
ng.AngularService.prototype.init = function(element) {};

/**
 * Find a scope by its registered `$scopename`.
 * @param {string} name
 * @return {(!ng.Scope|undefined)}
 */
ng.AngularService.prototype.getScopeByName = function(name) {};

/**
 * Dependency-annotated injectable array containing dependency token names followed by the factory or constructor function.
 * @typedef {!Array<(string|function(...?): ?|function(new: ?, ...?))>}
 */
ng.AnnotatedFactory;

/**
 * Public AngularTS AnimationOptions contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.AnimationOptions = function() {};

/**
 * Public AnimationOptions.animation member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.AnimationOptions.prototype.animation;

/**
 * Public AnimationOptions.keyframes member exposed by the AngularTS namespace contract.
 * @type {(!Array<!Keyframe>|!Object<string, (!Array<(null|number)>|!Array<string>|null|number|string|undefined)>|undefined)}
 */
ng.AnimationOptions.prototype.keyframes;

/**
 * Public AnimationOptions.enter member exposed by the AngularTS namespace contract.
 * @type {(!Array<!Keyframe>|!Object<string, (!Array<(null|number)>|!Array<string>|null|number|string|undefined)>|undefined)}
 */
ng.AnimationOptions.prototype.enter;

/**
 * Public AnimationOptions.leave member exposed by the AngularTS namespace contract.
 * @type {(!Array<!Keyframe>|!Object<string, (!Array<(null|number)>|!Array<string>|null|number|string|undefined)>|undefined)}
 */
ng.AnimationOptions.prototype.leave;

/**
 * Public AnimationOptions.move member exposed by the AngularTS namespace contract.
 * @type {(!Array<!Keyframe>|!Object<string, (!Array<(null|number)>|!Array<string>|null|number|string|undefined)>|undefined)}
 */
ng.AnimationOptions.prototype.move;

/**
 * Public AnimationOptions.addClass member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.AnimationOptions.prototype.addClass;

/**
 * Public AnimationOptions.removeClass member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.AnimationOptions.prototype.removeClass;

/**
 * Public AnimationOptions.from member exposed by the AngularTS namespace contract.
 * @type {(!Object<string, (number|string)>|undefined)}
 */
ng.AnimationOptions.prototype.from;

/**
 * Public AnimationOptions.to member exposed by the AngularTS namespace contract.
 * @type {(!Object<string, (number|string)>|undefined)}
 */
ng.AnimationOptions.prototype.to;

/**
 * Public AnimationOptions.tempClasses member exposed by the AngularTS namespace contract.
 * @type {(!Array<string>|string|undefined)}
 */
ng.AnimationOptions.prototype.tempClasses;

/**
 * Public AnimationOptions.onStart member exposed by the AngularTS namespace contract.
 * @type {(function(!Element, !ng.AnimationContext): void|undefined)}
 */
ng.AnimationOptions.prototype.onStart;

/**
 * Public AnimationOptions.onDone member exposed by the AngularTS namespace contract.
 * @type {(function(!Element, !ng.AnimationContext): void|undefined)}
 */
ng.AnimationOptions.prototype.onDone;

/**
 * Public AnimationOptions.onCancel member exposed by the AngularTS namespace contract.
 * @type {(function(!Element, !ng.AnimationContext): void|undefined)}
 */
ng.AnimationOptions.prototype.onCancel;

/**
 * Public AngularTS NativeAnimationOptions contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.NativeAnimationOptions = function() {};

/**
 * Public NativeAnimationOptions.animation member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.NativeAnimationOptions.prototype.animation;

/**
 * Public NativeAnimationOptions.keyframes member exposed by the AngularTS namespace contract.
 * @type {(!Array<!Keyframe>|!Object<string, (!Array<(null|number)>|!Array<string>|null|number|string|undefined)>|undefined)}
 */
ng.NativeAnimationOptions.prototype.keyframes;

/**
 * Public NativeAnimationOptions.enter member exposed by the AngularTS namespace contract.
 * @type {(!Array<!Keyframe>|!Object<string, (!Array<(null|number)>|!Array<string>|null|number|string|undefined)>|undefined)}
 */
ng.NativeAnimationOptions.prototype.enter;

/**
 * Public NativeAnimationOptions.leave member exposed by the AngularTS namespace contract.
 * @type {(!Array<!Keyframe>|!Object<string, (!Array<(null|number)>|!Array<string>|null|number|string|undefined)>|undefined)}
 */
ng.NativeAnimationOptions.prototype.leave;

/**
 * Public NativeAnimationOptions.move member exposed by the AngularTS namespace contract.
 * @type {(!Array<!Keyframe>|!Object<string, (!Array<(null|number)>|!Array<string>|null|number|string|undefined)>|undefined)}
 */
ng.NativeAnimationOptions.prototype.move;

/**
 * Public NativeAnimationOptions.addClass member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.NativeAnimationOptions.prototype.addClass;

/**
 * Public NativeAnimationOptions.removeClass member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.NativeAnimationOptions.prototype.removeClass;

/**
 * Public NativeAnimationOptions.from member exposed by the AngularTS namespace contract.
 * @type {(!Object<string, (number|string)>|undefined)}
 */
ng.NativeAnimationOptions.prototype.from;

/**
 * Public NativeAnimationOptions.to member exposed by the AngularTS namespace contract.
 * @type {(!Object<string, (number|string)>|undefined)}
 */
ng.NativeAnimationOptions.prototype.to;

/**
 * Public NativeAnimationOptions.tempClasses member exposed by the AngularTS namespace contract.
 * @type {(!Array<string>|string|undefined)}
 */
ng.NativeAnimationOptions.prototype.tempClasses;

/**
 * Public NativeAnimationOptions.onStart member exposed by the AngularTS namespace contract.
 * @type {(function(!Element, !ng.AnimationContext): void|undefined)}
 */
ng.NativeAnimationOptions.prototype.onStart;

/**
 * Public NativeAnimationOptions.onDone member exposed by the AngularTS namespace contract.
 * @type {(function(!Element, !ng.AnimationContext): void|undefined)}
 */
ng.NativeAnimationOptions.prototype.onDone;

/**
 * Public NativeAnimationOptions.onCancel member exposed by the AngularTS namespace contract.
 * @type {(function(!Element, !ng.AnimationContext): void|undefined)}
 */
ng.NativeAnimationOptions.prototype.onCancel;

/**
 * Public AngularTS AnimationPhase contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {string}
 */
ng.AnimationPhase;

/**
 * Public AngularTS AnimationPreset contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.AnimationPreset = function() {};

/**
 * Public AnimationPreset.enter member exposed by the AngularTS namespace contract.
 * @type {(!Array<!Keyframe>|!Object<string, (!Array<(null|number)>|!Array<string>|null|number|string|undefined)>|function(!Element, !ng.AnimationContext, !ng.NativeAnimationOptions): (!Animation|!Promise<void>|undefined)|undefined)}
 */
ng.AnimationPreset.prototype.enter;

/**
 * Public AnimationPreset.leave member exposed by the AngularTS namespace contract.
 * @type {(!Array<!Keyframe>|!Object<string, (!Array<(null|number)>|!Array<string>|null|number|string|undefined)>|function(!Element, !ng.AnimationContext, !ng.NativeAnimationOptions): (!Animation|!Promise<void>|undefined)|undefined)}
 */
ng.AnimationPreset.prototype.leave;

/**
 * Public AnimationPreset.move member exposed by the AngularTS namespace contract.
 * @type {(!Array<!Keyframe>|!Object<string, (!Array<(null|number)>|!Array<string>|null|number|string|undefined)>|function(!Element, !ng.AnimationContext, !ng.NativeAnimationOptions): (!Animation|!Promise<void>|undefined)|undefined)}
 */
ng.AnimationPreset.prototype.move;

/**
 * Public AnimationPreset.addClass member exposed by the AngularTS namespace contract.
 * @type {(!Array<!Keyframe>|!Object<string, (!Array<(null|number)>|!Array<string>|null|number|string|undefined)>|function(!Element, !ng.AnimationContext, !ng.NativeAnimationOptions): (!Animation|!Promise<void>|undefined)|undefined)}
 */
ng.AnimationPreset.prototype.addClass;

/**
 * Public AnimationPreset.removeClass member exposed by the AngularTS namespace contract.
 * @type {(!Array<!Keyframe>|!Object<string, (!Array<(null|number)>|!Array<string>|null|number|string|undefined)>|function(!Element, !ng.AnimationContext, !ng.NativeAnimationOptions): (!Animation|!Promise<void>|undefined)|undefined)}
 */
ng.AnimationPreset.prototype.removeClass;

/**
 * Public AnimationPreset.setClass member exposed by the AngularTS namespace contract.
 * @type {(!Array<!Keyframe>|!Object<string, (!Array<(null|number)>|!Array<string>|null|number|string|undefined)>|function(!Element, !ng.AnimationContext, !ng.NativeAnimationOptions): (!Animation|!Promise<void>|undefined)|undefined)}
 */
ng.AnimationPreset.prototype.setClass;

/**
 * Public AnimationPreset.animate member exposed by the AngularTS namespace contract.
 * @type {(!Array<!Keyframe>|!Object<string, (!Array<(null|number)>|!Array<string>|null|number|string|undefined)>|function(!Element, !ng.AnimationContext, !ng.NativeAnimationOptions): (!Animation|!Promise<void>|undefined)|undefined)}
 */
ng.AnimationPreset.prototype.animate;

/**
 * Public AnimationPreset.options member exposed by the AngularTS namespace contract.
 * @type {(!KeyframeAnimationOptions|undefined)}
 */
ng.AnimationPreset.prototype.options;

/**
 * Public AngularTS AnimationPresetHandler contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {function(!Element, !ng.AnimationContext, !ng.NativeAnimationOptions): (!Animation|!Promise<void>|undefined)}
 */
ng.AnimationPresetHandler;

/**
 * Public AngularTS AnimationResult contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {(!Animation|!Promise<void>|undefined)}
 */
ng.AnimationResult;

/**
 * Runtime metadata returned after defining a standalone custom element.
 * @record
 */
ng.AngularElementDefinition = function() {};

/**
 * AngularTS runtime instance that owns the element injector.
 * @type {!ng.Angular}
 */
ng.AngularElementDefinition.prototype.angular;

/**
 * Custom runtime `ng` module.
 * @type {!ng.NgModule}
 */
ng.AngularElementDefinition.prototype.ngModule;

/**
 * Application module that registered the element.
 * @type {!ng.NgModule}
 */
ng.AngularElementDefinition.prototype.elementModule;

/**
 * Injector used by all instances of this custom element definition.
 * @type {!ng.InjectorService}
 */
ng.AngularElementDefinition.prototype.injector;

/**
 * Native custom element constructor registered with `customElements`.
 * @type {function(new: HTMLElement, ...?)}
 */
ng.AngularElementDefinition.prototype.element;

/**
 * Registered custom element tag name.
 * @type {string}
 */
ng.AngularElementDefinition.prototype.name;

/**
 * Configuration for the application module that owns the custom element.
 * @record
 */
ng.AngularElementModuleOptions = function() {};

/**
 * Name of the element application module. Defaults to a name derived from the tag.
 * @type {(string|undefined)}
 */
ng.AngularElementModuleOptions.prototype.name;

/**
 * Additional application modules required by the element module.
 * @type {(!Array<string>|undefined)}
 */
ng.AngularElementModuleOptions.prototype.requires;

/**
 * Optional hook for adding services, filters, directives, or config to the element module.
 * @type {(function(!ng.NgModule, !ng.Angular): void|undefined)}
 */
ng.AngularElementModuleOptions.prototype.configure;

/**
 * Public AngularTS AngularElementOptions contract exposed through the global ng namespace for Closure-annotated applications.
 * @template T
 * @record
 */
ng.AngularElementOptions = function() {};

/**
 * Custom runtime `ng` module configuration.
 * @type {(!Object|undefined)}
 */
ng.AngularElementOptions.prototype.ngModule;

/**
 * Application module that registers the custom element.
 * @type {(!ng.AngularElementModuleOptions|undefined)}
 */
ng.AngularElementOptions.prototype.elementModule;

/**
 * Custom element definition passed to `$webComponent.define`.
 * @type {!ng.WebComponentOptions<T>}
 */
ng.AngularElementOptions.prototype.component;

/**
 * Treat this instance as a sub-application. Sub-applications do not attach to `window.angular` by default.
 * @type {(boolean|undefined)}
 */
ng.AngularElementOptions.prototype.subapp;

/**
 * Assign the runtime instance to `window.angular`. Defaults to `true` for root apps and `false` for sub-applications.
 * @type {(boolean|undefined)}
 */
ng.AngularElementOptions.prototype.attachToWindow;

/**
 * Register the configured built-in `ng` module during construction. Custom builds should pass `false` and register their own `ng` module.
 * @type {(boolean|undefined)}
 */
ng.AngularElementOptions.prototype.registerBuiltins;

/**
 * A controller constructor function used in AngularTS.
 * @typedef {(function(...?): (!ng.Controller|undefined)|function(new: ng.Controller, ...?))}
 */
ng.ControllerConstructor;

/**
 * Public AngularTS CookieOptions contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.CookieOptions = function() {};

/**
 * URL path scope for the cookie.
 * @type {(string|undefined)}
 */
ng.CookieOptions.prototype.path;

/**
 * Domain scope for the cookie.
 * @type {(string|undefined)}
 */
ng.CookieOptions.prototype.domain;

/**
 * Expiration date, date string, or timestamp. Omit for a session cookie.
 * @type {(!Object|number|string|undefined)}
 */
ng.CookieOptions.prototype.expires;

/**
 * Restrict the cookie to HTTPS connections.
 * @type {(boolean|undefined)}
 */
ng.CookieOptions.prototype.secure;

/**
 * SameSite policy applied by the browser.
 * @type {(string|undefined)}
 */
ng.CookieOptions.prototype.samesite;

/**
 * Serialization options for cookie-backed stores.
 * @record
 */
ng.CookieStoreOptions = function() {};

/**
 * Convert values to strings before writing.
 * @type {(function(?): string|undefined)}
 */
ng.CookieStoreOptions.prototype.serialize;

/**
 * Convert stored strings back to values after reading.
 * @type {(function(string): ?|undefined)}
 */
ng.CookieStoreOptions.prototype.deserialize;

/**
 * Cookie attributes used for writes.
 * @type {(!ng.CookieOptions|undefined)}
 */
ng.CookieStoreOptions.prototype.cookie;

/**
 * The **`Document`** interface represents any web page loaded in the browser and serves as an entry point into the web page's content, which is the DOM tree. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document)
 * @typedef {!Document}
 */
ng.DocumentService;

/**
 * Constructor used by REST resources to map raw response data into entity instances.
 * @typedef {function(new: ?, ?)}
 */
ng.EntityClass;

/**
 * Error configuration object. May only contain the options that need to be updated.
 * @record
 */
ng.ErrorHandlingConfig = function() {};

/**
 * The max depth for stringifying objects. Setting to a non-positive or non-numeric value removes the max depth limit. Default: 5.
 * @type {(number|undefined)}
 */
ng.ErrorHandlingConfig.prototype.objectMaxDepth;

/**
 * Public AngularTS Expression contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {string}
 */
ng.Expression;

/**
 * Public AngularTS HttpMethod contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {string}
 */
ng.HttpMethod;

/**
 * Public AngularTS HttpPromise contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {!Promise<!ng.HttpResponse<?>>}
 */
ng.HttpPromise;

/**
 * Default request settings exposed through `$httpProvider.defaults`. Not every `RequestShortcutConfig` field is supported here; this shape only includes the fields that the runtime reads from provider-level defaults. https://docs.angularjs.org/api/ng/service/$http#defaults https://docs.angularjs.org/api/ng/service/$http#usage https://docs.angularjs.org/api/ng/provider/$httpProvider The properties section
 * @record
 */
ng.HttpProviderDefaults = function() {};

/**
 * Cache used for cacheable requests. `true` enables the default cache.
 * @type {(?|undefined)}
 */
ng.HttpProviderDefaults.prototype.cache;

/**
 * Request body transform pipeline.
 * @type {(!Array<function(?, function(): !Object<string, string>): ?>|function(?, function(): !Object<string, string>): ?|undefined)}
 */
ng.HttpProviderDefaults.prototype.transformRequest;

/**
 * Response body transform pipeline.
 * @type {(!Array<function(?, function(): !Object<string, string>, number): ?>|function(?, function(): !Object<string, string>, number): ?|undefined)}
 */
ng.HttpProviderDefaults.prototype.transformResponse;

/**
 * Default headers merged into each request.
 * @type {(!Object<string, ?>|undefined)}
 */
ng.HttpProviderDefaults.prototype.headers;

/**
 * Header name used when sending the XSRF token.
 * @type {(string|undefined)}
 */
ng.HttpProviderDefaults.prototype.xsrfHeaderName;

/**
 * Cookie name used when reading the XSRF token.
 * @type {(string|undefined)}
 */
ng.HttpProviderDefaults.prototype.xsrfCookieName;

/**
 * Whether cross-site requests should include credentials by default.
 * @type {(boolean|undefined)}
 */
ng.HttpProviderDefaults.prototype.withCredentials;

/**
 * Query parameter serializer token or function.
 * @type {(function(?): string|string|undefined)}
 */
ng.HttpProviderDefaults.prototype.paramSerializer;

/**
 * Public AngularTS HttpResponse contract exposed through the global ng namespace for Closure-annotated applications.
 * @template T
 * @record
 */
ng.HttpResponse = function() {};

/**
 * Parsed response body.
 * @type {T}
 */
ng.HttpResponse.prototype.data;

/**
 * Numeric HTTP status code. Non-2xx statuses reject the promise.
 * @type {number}
 */
ng.HttpResponse.prototype.status;

/**
 * Lazy response header reader.
 * @return {!Object<string, string>}
 */
ng.HttpResponse.prototype.headers = function() {};

/**
 * Request configuration that produced this response.
 * @type {!ng.RequestConfig}
 */
ng.HttpResponse.prototype.config;

/**
 * Native status text such as `OK` or `Not Found`.
 * @type {string}
 */
ng.HttpResponse.prototype.statusText;

/**
 * Transport completion status. Useful for distinguishing timeout, abort, and network errors.
 * @type {string}
 */
ng.HttpResponse.prototype.xhrStatus;

/**
 * Final transport status reported by transport completion handlers.
 * @typedef {string}
 */
ng.HttpResponseStatus;

/**
 * AngularTS dependency-injectable function or dependency-annotated factory array.
 * @typedef {(!ng.AnnotatedFactory|function(...?): ?|function(new: ?, ...?))}
 */
ng.Injectable;

/**
 * Public AngularTS InjectionTokens contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.InjectionTokens = function() {};

/**
 * Public InjectionTokens.$angular member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$angular;

/**
 * Public InjectionTokens.$attrs member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$attrs;

/**
 * Public InjectionTokens.$scope member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$scope;

/**
 * Public InjectionTokens.$element member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$element;

/**
 * Public InjectionTokens.$anchorScroll member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$anchorScroll;

/**
 * Public InjectionTokens.$animate member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$animate;

/**
 * Public InjectionTokens.$aria member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$aria;

/**
 * Public InjectionTokens.$compile member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$compile;

/**
 * Public InjectionTokens.$cookie member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$cookie;

/**
 * Public InjectionTokens.$controller member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$controller;

/**
 * Public InjectionTokens.$document member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$document;

/**
 * Public InjectionTokens.$eventBus member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$eventBus;

/**
 * Public InjectionTokens.$exceptionHandler member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$exceptionHandler;

/**
 * Public InjectionTokens.$filter member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$filter;

/**
 * Public InjectionTokens.$http member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$http;

/**
 * Public InjectionTokens.$httpParamSerializer member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$httpParamSerializer;

/**
 * Public InjectionTokens.$interpolate member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$interpolate;

/**
 * Public InjectionTokens.$location member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$location;

/**
 * Public InjectionTokens.$log member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$log;

/**
 * Public InjectionTokens.$parse member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$parse;

/**
 * Public InjectionTokens.$rest member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$rest;

/**
 * Public InjectionTokens.$rootScope member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$rootScope;

/**
 * Public InjectionTokens.$rootElement member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$rootElement;

/**
 * Public InjectionTokens.$sce member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$sce;

/**
 * Public InjectionTokens.$sceDelegate member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$sceDelegate;

/**
 * Public InjectionTokens.$state member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$state;

/**
 * Public InjectionTokens.$stateRegistry member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$stateRegistry;

/**
 * Public InjectionTokens.$sse member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$sse;

/**
 * Public InjectionTokens.$templateCache member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$templateCache;

/**
 * Public InjectionTokens.$templateFactory member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$templateFactory;

/**
 * Public InjectionTokens.$templateRequest member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$templateRequest;

/**
 * Public InjectionTokens.$transitions member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$transitions;

/**
 * Public InjectionTokens.$view member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$view;

/**
 * Public InjectionTokens.$window member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$window;

/**
 * Public InjectionTokens.$websocket member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$websocket;

/**
 * Public InjectionTokens.$worker member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$worker;

/**
 * Public InjectionTokens.$wasm member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$wasm;

/**
 * Public InjectionTokens.$provide member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$provide;

/**
 * Public InjectionTokens.$injector member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$injector;

/**
 * Public InjectionTokens.$angularProvider member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$angularProvider;

/**
 * Public InjectionTokens.$anchorScrollProvider member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$anchorScrollProvider;

/**
 * Public InjectionTokens.$compileProvider member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$compileProvider;

/**
 * Public InjectionTokens.$animateProvider member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$animateProvider;

/**
 * Public InjectionTokens.$ariaProvider member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$ariaProvider;

/**
 * Public InjectionTokens.$cookieProvider member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$cookieProvider;

/**
 * Public InjectionTokens.$eventBusProvider member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$eventBusProvider;

/**
 * Public InjectionTokens.$exceptionHandlerProvider member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$exceptionHandlerProvider;

/**
 * Public InjectionTokens.$filterProvider member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$filterProvider;

/**
 * Public InjectionTokens.$httpProvider member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$httpProvider;

/**
 * Public InjectionTokens.$httpParamSerializerProvider member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$httpParamSerializerProvider;

/**
 * Public InjectionTokens.$interpolateProvider member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$interpolateProvider;

/**
 * Public InjectionTokens.$locationProvider member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$locationProvider;

/**
 * Public InjectionTokens.$logProvider member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$logProvider;

/**
 * Public InjectionTokens.$parseProvider member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$parseProvider;

/**
 * Public InjectionTokens.$restProvider member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$restProvider;

/**
 * Public InjectionTokens.$rootScopeProvider member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$rootScopeProvider;

/**
 * Public InjectionTokens.$sceProvider member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$sceProvider;

/**
 * Public InjectionTokens.$sceDelegateProvider member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$sceDelegateProvider;

/**
 * Public InjectionTokens.$sseProvider member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$sseProvider;

/**
 * Public InjectionTokens.$stateProvider member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$stateProvider;

/**
 * Public InjectionTokens.$stateRegistryProvider member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$stateRegistryProvider;

/**
 * Public InjectionTokens.$templateCacheProvider member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$templateCacheProvider;

/**
 * Public InjectionTokens.$templateFactoryProvider member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$templateFactoryProvider;

/**
 * Public InjectionTokens.$templateRequestProvider member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$templateRequestProvider;

/**
 * Public InjectionTokens.$transitionsProvider member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$transitionsProvider;

/**
 * Public InjectionTokens.$viewProvider member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$viewProvider;

/**
 * Public InjectionTokens.$websocketProvider member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$websocketProvider;

/**
 * Public InjectionTokens.$workerProvider member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$workerProvider;

/**
 * Public InjectionTokens.$wasmProvider member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$wasmProvider;

/**
 * Public InjectionTokens.$controllerProvider member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InjectionTokens.prototype.$controllerProvider;

/**
 * Public AngularTS InterpolationFunction contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.InterpolationFunction = function() {};

/**
 * Public InterpolationFunction.expressions member exposed by the AngularTS namespace contract.
 * @type {!Array<string>}
 */
ng.InterpolationFunction.prototype.expressions;

/**
 * Public InterpolationFunction.exp member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InterpolationFunction.prototype.exp;

/**
 * Invokes the callable InterpolationFunction contract.
 * @param {?} context
 * @param {(function(?): void|undefined)} cb
 * @return {?}
 */
ng.InterpolationFunction.prototype.call = function(context, cb) {};

/**
 * Public AngularTS InvocationDetail contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.InvocationDetail = function() {};

/**
 * Public InvocationDetail.expr member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.InvocationDetail.prototype.expr;

/**
 * Public AngularTS ListenerFn contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {function((?|undefined), (?|undefined)): void}
 */
ng.ListenerFn;

/**
 * Public AngularTS NgModelController contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.NgModelController = function() {};

/**
 * Public NgModelController.$viewValue member exposed by the AngularTS namespace contract.
 * @type {?}
 */
ng.NgModelController.prototype.$viewValue;

/**
 * Public NgModelController.$modelValue member exposed by the AngularTS namespace contract.
 * @type {?}
 */
ng.NgModelController.prototype.$modelValue;

/**
 * Public NgModelController.$validators member exposed by the AngularTS namespace contract.
 * @type {!Object<string, function(?, ?): ?>}
 */
ng.NgModelController.prototype.$validators;

/**
 * Public NgModelController.$asyncValidators member exposed by the AngularTS namespace contract.
 * @type {!Object<string, function(?, ?): !Promise<?>>}
 */
ng.NgModelController.prototype.$asyncValidators;

/**
 * Public NgModelController.$parsers member exposed by the AngularTS namespace contract.
 * @type {!Array<function(?): ?>}
 */
ng.NgModelController.prototype.$parsers;

/**
 * Public NgModelController.$formatters member exposed by the AngularTS namespace contract.
 * @type {!Array<function(?): ?>}
 */
ng.NgModelController.prototype.$formatters;

/**
 * Public NgModelController.$viewChangeListeners member exposed by the AngularTS namespace contract.
 * @type {!Array<function(): void>}
 */
ng.NgModelController.prototype.$viewChangeListeners;

/**
 * Public NgModelController.$untouched member exposed by the AngularTS namespace contract.
 * @type {boolean}
 */
ng.NgModelController.prototype.$untouched;

/**
 * Public NgModelController.$touched member exposed by the AngularTS namespace contract.
 * @type {boolean}
 */
ng.NgModelController.prototype.$touched;

/**
 * Public NgModelController.$pristine member exposed by the AngularTS namespace contract.
 * @type {boolean}
 */
ng.NgModelController.prototype.$pristine;

/**
 * Public NgModelController.$dirty member exposed by the AngularTS namespace contract.
 * @type {boolean}
 */
ng.NgModelController.prototype.$dirty;

/**
 * Public NgModelController.$valid member exposed by the AngularTS namespace contract.
 * @type {(boolean|undefined)}
 */
ng.NgModelController.prototype.$valid;

/**
 * Public NgModelController.$invalid member exposed by the AngularTS namespace contract.
 * @type {(boolean|undefined)}
 */
ng.NgModelController.prototype.$invalid;

/**
 * Public NgModelController.$error member exposed by the AngularTS namespace contract.
 * @type {!Object<string, boolean>}
 */
ng.NgModelController.prototype.$error;

/**
 * Public NgModelController.$pending member exposed by the AngularTS namespace contract.
 * @type {(!Object<string, ?>|undefined)}
 */
ng.NgModelController.prototype.$pending;

/**
 * Public NgModelController.$name member exposed by the AngularTS namespace contract.
 * @type {?}
 */
ng.NgModelController.prototype.$name;

/**
 * Public NgModelController.$options member exposed by the AngularTS namespace contract.
 * @type {!Object}
 */
ng.NgModelController.prototype.$options;

/**
 * Updates the validation state of the control and propagates it to the parent form.
 * @param {string} validationErrorKey
 * @param {(boolean|null|undefined)} state
 * @return {void}
 */
ng.NgModelController.prototype.$setValidity = function(validationErrorKey, state) {};

/**
 * Called when the view needs to be updated. It is expected that the user of the ng-model directive will implement this method. The `$render()` method is invoked in the following situations: * `$rollbackViewValue()` is called. If we are rolling back the view value to the last committed value then `$render()` is called to update the input control. * The value referenced by `ng-model` is changed programmatically and both the `$modelValue` and the `$viewValue` are different from last time. Since `ng-model` does not do a deep watch, `$render()` is only invoked if the values of `$modelValue` and `$viewValue` are actually different from their previous values. If `$modelValue` or `$viewValue` are objects (rather than a string or number) then `$render()` will not be invoked if you only change a property on the objects.
 * @return {void}
 */
ng.NgModelController.prototype.$render = function() {};

/**
 * This is called when we need to determine if the value of an input is empty. For instance, the required directive does this to work out if the input has data or not. The default `$isEmpty` function checks whether the value is `undefined`, `''`, `null` or `NaN`. You can override this for input directives whose concept of being empty is different from the default. The `checkboxInputType` directive does this because in its case a value of `false` implies empty.
 * @param {?} value
 * @return {boolean}
 */
ng.NgModelController.prototype.$isEmpty = function(value) {};

/**
 * Sets the control to its pristine state. This method can be called to remove the `ng-dirty` class and set the control to its pristine state (`ng-pristine` class). A model is considered to be pristine when the control has not been changed from when first compiled.
 * @return {void}
 */
ng.NgModelController.prototype.$setPristine = function() {};

/**
 * Sets the control to its dirty state. This method can be called to remove the `ng-pristine` class and set the control to its dirty state (`ng-dirty` class). A model is considered to be dirty when the control has been changed from when first compiled.
 * @return {void}
 */
ng.NgModelController.prototype.$setDirty = function() {};

/**
 * Sets the control to its untouched state. This method can be called to remove the `ng-touched` class and set the control to its untouched state (`ng-untouched` class). Upon compilation, a model is set as untouched by default, however this function can be used to restore that state if the model has already been touched by the user.
 * @return {void}
 */
ng.NgModelController.prototype.$setUntouched = function() {};

/**
 * Sets the control to its touched state. This method can be called to remove the `ng-untouched` class and set the control to its touched state (`ng-touched` class). A model is considered to be touched when the user has first focused the control element and then shifted focus away from the control (blur event).
 * @return {void}
 */
ng.NgModelController.prototype.$setTouched = function() {};

/**
 * Cancel an update and reset the input element's value to prevent an update to the `$modelValue`, which may be caused by a pending debounced event or because the input is waiting for some future event. If you have an input that uses `ng-model-options` to set up debounced updates or updates that depend on special events such as `blur`, there can be a period when the `$viewValue` is out of sync with the ngModel's `$modelValue`. In this case, you can use `$rollbackViewValue()` to manually cancel the debounced / future update and reset the input to the last committed view value. It is also possible that you run into difficulties if you try to update the ngModel's `$modelValue` programmatically before these debounced/future events have resolved/occurred, because AngularTS's dirty checking mechanism is not able to tell whether the model has actually changed or not. The `$rollbackViewValue()` method should be called before programmatically changing the model of an input which may have such events pending. This is important in order to make sure that the input field will be updated with the new model value and any pending operations are cancelled.
 * @return {void}
 */
ng.NgModelController.prototype.$rollbackViewValue = function() {};

/**
 * Runs each of the registered validators (first synchronous validators and then asynchronous validators). If the validity changes to invalid, the model will be set to `undefined`, unless {@link ngModelOptions `ngModelOptions.allowInvalid`} is `true`. If the validity changes to valid, it will set the model to the last available valid `$modelValue`, i.e. either the last parsed value or the last value set from the scope.
 * @return {void}
 */
ng.NgModelController.prototype.$validate = function() {};

/**
 * Commit a pending update to the `$modelValue`. Updates may be pending by a debounced event or because the input is waiting for a some future event defined in `ng-model-options`. this method is rarely needed as `NgModelController` usually handles calling this in response to input events.
 * @return {void}
 */
ng.NgModelController.prototype.$commitViewValue = function() {};

/**
 * Update the view value. This method should be called when a control wants to change the view value; typically, this is done from within a DOM event handler. For example, the {@link ng.directive :input input} directive calls it when the value of the input changes and {@link ng.directive :select select} calls it when an option is selected. When `$setViewValue` is called, the new `value` will be staged for committing through the `$parsers` and `$validators` pipelines. If there are no special {@link ngModelOptions } specified then the staged value is sent directly for processing through the `$parsers` pipeline. After this, the `$validators` and `$asyncValidators` are called and the value is applied to `$modelValue`. Finally, the value is set to the **expression** specified in the `ng-model` attribute and all the registered change listeners, in the `$viewChangeListeners` list are called. In case the {@link ng.directive :ngModelOptions ngModelOptions} directive is used with `updateOn` and the `default` trigger is not listed, all those actions will remain pending until one of the `updateOn` events is triggered on the DOM element. All these actions will be debounced if the {@link ng.directive :ngModelOptions ngModelOptions} directive is used with a custom debounce for this particular event. Note that a `$digest` is only triggered once the `updateOn` events are fired, or if `debounce` is specified, once the timer runs out. When used with standard inputs, the view value will always be a string (which is in some cases parsed into another type, such as a `Date` object for `input[date]`.) However, custom controls might also pass objects to this method. In this case, we should make a copy of the object before passing it to `$setViewValue`. This is because `ngModel` does not perform a deep watch of objects, it only looks for a change of identity. If you only change the property of the object then ngModel will not realize that the object has changed and will not invoke the `$parsers` and `$validators` pipelines. For this reason, you should not change properties of the copy once it has been passed to `$setViewValue`. Otherwise you may cause the model value on the scope to change incorrectly. <div class="alert alert-info"> In any case, the value passed to the method should always reflect the current value of the control. For example, if you are calling `$setViewValue` for an input element, you should pass the input DOM value. Otherwise, the control and the scope model become out of sync. It's also important to note that `$setViewValue` does not call `$render` or change the control's DOM value in any way. If we want to change the control's DOM value programmatically, we should update the `ngModel` scope expression. Its new value will be picked up by the model controller, which will run it through the `$formatters`, `$render` it to update the DOM, and finally call `$validate` on it. </div>
 * @param {?} value
 * @param {(string|undefined)} trigger
 * @return {void}
 */
ng.NgModelController.prototype.$setViewValue = function(value, trigger) {};

/**
 * Override the current model options settings programmatically. The previous `ModelOptions` value will not be modified. Instead, a new `ModelOptions` object will inherit from the previous one overriding or inheriting settings that are defined in the given parameter. See {@link ngModelOptions } for information about what options can be specified and how model option inheritance works. <div class="alert alert-warning"> **Note:** this function only affects the options set on the `ngModelController`, and not the options on the {@link ngModelOptions } directive from which they might have been obtained initially. </div> <div class="alert alert-danger"> **Note:** it is not possible to override the `getterSetter` option. </div>
 * @param {?} options
 * @return {void}
 */
ng.NgModelController.prototype.$overrideModelOptions = function(options) {};

/**
 * Runs the model -> view pipeline on the current {@link ngModel.NgModelController#$modelValue $modelValue}. The following actions are performed by this method: - the `$modelValue` is run through the {@link ngModel.NgModelController#$formatters $formatters} and the result is set to the {@link ngModel.NgModelController#$viewValue $viewValue} - the `ng-empty` or `ng-not-empty` class is set on the element - if the `$viewValue` has changed: - {@link ngModel.NgModelController#$render $render} is called on the control - the {@link ngModel.NgModelController#$validators $validators} are run and the validation status is set. This method is called by ngModel internally when the bound scope value changes. Application developers usually do not have to call this function themselves. This function can be used when the `$viewValue` or the rendered DOM value are not correctly formatted and the `$modelValue` must be run through the `$formatters` again.
 * @return {void}
 */
ng.NgModelController.prototype.$processModelValue = function() {};

/**
 * Full request configuration accepted by `$http(...)`. See http://docs.angularjs.org/api/ng/service/$http#usage
 * @record
 */
ng.RequestConfig = function() {};

/**
 * HTTP verb to use for the request.
 * @type {string}
 */
ng.RequestConfig.prototype.method;

/**
 * Request URL. Query parameters from `params` are appended to this URL.
 * @type {string}
 */
ng.RequestConfig.prototype.url;

/**
 * Event handlers notified by the underlying transport.
 * @type {(!Object<string, (!Object|function(!Event): void)>|undefined)}
 */
ng.RequestConfig.prototype.eventHandlers;

/**
 * Upload event handlers. Not used by the fetch transport.
 * @type {(!Object<string, (!Object|function(!Event): void)>|undefined)}
 */
ng.RequestConfig.prototype.uploadEventHandlers;

/**
 * Query parameters appended to the request URL.
 * @type {(?|undefined)}
 */
ng.RequestConfig.prototype.params;

/**
 * Request body. Shorthand methods with explicit data set this automatically.
 * @type {(?|undefined)}
 */
ng.RequestConfig.prototype.data;

/**
 * Millisecond timeout, or a promise whose resolution aborts the request.
 * @type {(!Promise<?>|number|undefined)}
 */
ng.RequestConfig.prototype.timeout;

/**
 * Native fetch response body reader hint.
 * @type {(string|undefined)}
 */
ng.RequestConfig.prototype.responseType;

/**
 * Cache used for cacheable requests. `true` enables the default cache.
 * @type {(?|undefined)}
 */
ng.RequestConfig.prototype.cache;

/**
 * Request body transform pipeline.
 * @type {(!Array<function(?, function(): !Object<string, string>): ?>|function(?, function(): !Object<string, string>): ?|undefined)}
 */
ng.RequestConfig.prototype.transformRequest;

/**
 * Response body transform pipeline.
 * @type {(!Array<function(?, function(): !Object<string, string>, number): ?>|function(?, function(): !Object<string, string>, number): ?|undefined)}
 */
ng.RequestConfig.prototype.transformResponse;

/**
 * Default headers merged into each request.
 * @type {(!Object<string, ?>|undefined)}
 */
ng.RequestConfig.prototype.headers;

/**
 * Header name used when sending the XSRF token.
 * @type {(string|undefined)}
 */
ng.RequestConfig.prototype.xsrfHeaderName;

/**
 * Cookie name used when reading the XSRF token.
 * @type {(string|undefined)}
 */
ng.RequestConfig.prototype.xsrfCookieName;

/**
 * Whether cross-site requests should include credentials by default.
 * @type {(boolean|undefined)}
 */
ng.RequestConfig.prototype.withCredentials;

/**
 * Query parameter serializer token or function.
 * @type {(function(?): string|string|undefined)}
 */
ng.RequestConfig.prototype.paramSerializer;

/**
 * Request options shared by the `$http` shortcut methods. See http://docs.angularjs.org/api/ng/service/$http#usage
 * @record
 */
ng.RequestShortcutConfig = function() {};

/**
 * Query parameters appended to the request URL.
 * @type {(?|undefined)}
 */
ng.RequestShortcutConfig.prototype.params;

/**
 * Request body. Shorthand methods with explicit data set this automatically.
 * @type {(?|undefined)}
 */
ng.RequestShortcutConfig.prototype.data;

/**
 * Millisecond timeout, or a promise whose resolution aborts the request.
 * @type {(!Promise<?>|number|undefined)}
 */
ng.RequestShortcutConfig.prototype.timeout;

/**
 * Native fetch response body reader hint.
 * @type {(string|undefined)}
 */
ng.RequestShortcutConfig.prototype.responseType;

/**
 * Cache used for cacheable requests. `true` enables the default cache.
 * @type {(?|undefined)}
 */
ng.RequestShortcutConfig.prototype.cache;

/**
 * Request body transform pipeline.
 * @type {(!Array<function(?, function(): !Object<string, string>): ?>|function(?, function(): !Object<string, string>): ?|undefined)}
 */
ng.RequestShortcutConfig.prototype.transformRequest;

/**
 * Response body transform pipeline.
 * @type {(!Array<function(?, function(): !Object<string, string>, number): ?>|function(?, function(): !Object<string, string>, number): ?|undefined)}
 */
ng.RequestShortcutConfig.prototype.transformResponse;

/**
 * Default headers merged into each request.
 * @type {(!Object<string, ?>|undefined)}
 */
ng.RequestShortcutConfig.prototype.headers;

/**
 * Header name used when sending the XSRF token.
 * @type {(string|undefined)}
 */
ng.RequestShortcutConfig.prototype.xsrfHeaderName;

/**
 * Cookie name used when reading the XSRF token.
 * @type {(string|undefined)}
 */
ng.RequestShortcutConfig.prototype.xsrfCookieName;

/**
 * Whether cross-site requests should include credentials by default.
 * @type {(boolean|undefined)}
 */
ng.RequestShortcutConfig.prototype.withCredentials;

/**
 * Query parameter serializer token or function.
 * @type {(function(?): string|string|undefined)}
 */
ng.RequestShortcutConfig.prototype.paramSerializer;

/**
 * Public AngularTS RestDefinition contract exposed through the global ng namespace for Closure-annotated applications.
 * @template T
 * @record
 */
ng.RestDefinition = function() {};

/**
 * Informational name for the resource definition.
 * @type {string}
 */
ng.RestDefinition.prototype.name;

/**
 * Base URL or RFC 6570 URI template for the resource.
 * @type {string}
 */
ng.RestDefinition.prototype.url;

/**
 * Constructor for mapping JSON objects to entity instances.
 * @type {(function(new: T, ?)|undefined)}
 */
ng.RestDefinition.prototype.entityClass;

/**
 * Extra REST options merged into each request for this resource.
 * @type {(!ng.RestOptions|undefined)}
 */
ng.RestDefinition.prototype.options;

/**
 * Factory service exposed as `$rest`. Creates a typed {@link RestService} for a base URL, optional entity mapper, and optional backend request defaults.
 * @typedef {function(string, (function(new: ?, ?)|undefined), (!ng.RestOptions|undefined)): !ng.RestService<?, ?>}
 */
ng.RestFactory;

/**
 * Backend abstraction used by {@link RestService}. Implement this interface to route REST operations through `$http`, IndexedDB, the Cache API, a test double, or a composed backend such as {@link CachedRestBackend}.
 * @record
 */
ng.RestBackend = function() {};

/**
 * Execute one normalized REST request.
 * @template T
 * @param {!ng.RestRequest} request
 * @return {!Promise<!ng.RestResponse<T>>}
 */
ng.RestBackend.prototype.request = function(request) {};

/**
 * Async cache store used by {@link CachedRestBackend}. The interface is deliberately small so implementations can be backed by IndexedDB, the browser Cache API, local storage, memory, or test fixtures.
 * @record
 */
ng.RestCacheStore = function() {};

/**
 * Read a cached REST response by deterministic key.
 * @template T
 * @param {string} key
 * @return {!Promise<(!ng.RestResponse<T>|undefined)>}
 */
ng.RestCacheStore.prototype.get = function(key) {};

/**
 * Store a REST response by deterministic key.
 * @template T
 * @param {string} key
 * @param {!ng.RestResponse<T>} response
 * @return {!Promise<void>}
 */
ng.RestCacheStore.prototype.set = function(key, response) {};

/**
 * Delete one cached REST response.
 * @param {string} key
 * @return {!Promise<void>}
 */
ng.RestCacheStore.prototype.delete = function(key) {};

/**
 * Delete cached REST responses whose keys start with the prefix. `CachedRestBackend` uses prefixes such as `GET /api/users` to invalidate collection and entity entries after successful writes.
 * @param {string} prefix
 * @return {!Promise<void>}
 */
ng.RestCacheStore.prototype.deletePrefix = function(prefix) {};

/**
 * Read strategy used by {@link CachedRestBackend} for `GET` requests. - `cache-first`: return cached data when present, otherwise fetch network. - `network-first`: fetch network first, falling back to stale cache on error. - `stale-while-revalidate`: return cache immediately and refresh in the background.
 * @typedef {string}
 */
ng.RestCacheStrategy;

/**
 * Extra backend options merged into requests made by a REST resource.
 * @record
 */
ng.RestOptions = function() {};

/**
 * Optional backend used instead of the default HTTP backend.
 * @type {(!ng.RestBackend|undefined)}
 */
ng.RestOptions.prototype.backend;

/**
 * Normalized request object passed from {@link RestService} to a {@link RestBackend}. Backends receive expanded URLs and already-separated request options, so they can focus on transport, persistence, or cache policy.
 * @record
 */
ng.RestRequest = function() {};

/**
 * Resource operation method.
 * @type {string}
 */
ng.RestRequest.prototype.method;

/**
 * Expanded request URL.
 * @type {string}
 */
ng.RestRequest.prototype.url;

/**
 * Collection URL used for broad cache invalidation.
 * @type {(string|undefined)}
 */
ng.RestRequest.prototype.collectionUrl;

/**
 * Resource identifier for entity operations.
 * @type {(?|undefined)}
 */
ng.RestRequest.prototype.id;

/**
 * Request body for write operations.
 * @type {(?|undefined)}
 */
ng.RestRequest.prototype.data;

/**
 * URI template and query parameters.
 * @type {(!Object<string, ?>|undefined)}
 */
ng.RestRequest.prototype.params;

/**
 * Backend-specific request options.
 * @type {(!Object<string, ?>|undefined)}
 */
ng.RestRequest.prototype.options;

/**
 * Public AngularTS RestResponse contract exposed through the global ng namespace for Closure-annotated applications.
 * @template T
 * @record
 */
ng.RestResponse = function() {};

/**
 * Response payload.
 * @type {T}
 */
ng.RestResponse.prototype.data;

/**
 * Backend that produced the response.
 * @type {(string|undefined)}
 */
ng.RestResponse.prototype.source;

/**
 * Whether the returned cached value may be older than the remote source.
 * @type {(boolean|undefined)}
 */
ng.RestResponse.prototype.stale;

/**
 * Numeric HTTP status code. Non-2xx statuses reject the promise.
 * @type {(number|undefined)}
 */
ng.RestResponse.prototype.status;

/**
 * Lazy response header reader.
 * @type {(function(): !Object<string, string>|undefined)}
 */
ng.RestResponse.prototype.headers;

/**
 * Request configuration that produced this response.
 * @type {(!ng.RequestConfig|undefined)}
 */
ng.RestResponse.prototype.config;

/**
 * Native status text such as `OK` or `Not Found`.
 * @type {(string|undefined)}
 */
ng.RestResponse.prototype.statusText;

/**
 * Transport completion status. Useful for distinguishing timeout, abort, and network errors.
 * @type {(string|undefined)}
 */
ng.RestResponse.prototype.xhrStatus;

/**
 * Public AngularTS RestRevalidateEvent contract exposed through the global ng namespace for Closure-annotated applications.
 * @template T
 * @record
 */
ng.RestRevalidateEvent = function() {};

/**
 * Cache key that was refreshed.
 * @type {string}
 */
ng.RestRevalidateEvent.prototype.key;

/**
 * Original request.
 * @type {!ng.RestRequest}
 */
ng.RestRevalidateEvent.prototype.request;

/**
 * Fresh network response.
 * @type {!ng.RestResponse<T>}
 */
ng.RestRevalidateEvent.prototype.response;

/**
 * Configuration for {@link CachedRestBackend}.
 * @record
 */
ng.CachedRestBackendOptions = function() {};

/**
 * Backend used for authoritative network responses and writes.
 * @type {!ng.RestBackend}
 */
ng.CachedRestBackendOptions.prototype.network;

/**
 * Async cache store, such as IndexedDB, Cache API, or memory.
 * @type {!ng.RestCacheStore}
 */
ng.CachedRestBackendOptions.prototype.cache;

/**
 * Read strategy used for cacheable GET requests.
 * @type {string}
 */
ng.CachedRestBackendOptions.prototype.strategy;

/**
 * Notified after a stale-while-revalidate refresh succeeds.
 * @type {(function(!ng.RestRevalidateEvent<?>): void|undefined)}
 */
ng.CachedRestBackendOptions.prototype.onRevalidate;

/**
 * Public AngularTS RestService contract exposed through the global ng namespace for Closure-annotated applications.
 * @template T, ID
 * @record
 */
ng.RestService = function() {};

/**
 * Expand an RFC 6570 URI template with the provided parameters.
 * @param {string} template
 * @param {!Object<string, ?>} params
 * @return {string}
 */
ng.RestService.prototype.buildUrl = function(template, params) {};

/**
 * Fetch a collection. Parameters are used for URI template expansion and are also forwarded to `$http` as query params. Non-array responses resolve to an empty array.
 * @param {(!Object<string, ?>|undefined)} params
 * @return {!Promise<!Array<T>>}
 */
ng.RestService.prototype.list = function(params) {};

/**
 * Fetch one resource by ID using `GET`.
 * @param {ID} id
 * @param {(!Object<string, ?>|undefined)} params
 * @return {!Promise<?>}
 */
ng.RestService.prototype.get = function(id, params) {};

/**
 * Create a resource using `POST`.
 * @param {T} item
 * @return {!Promise<?>}
 */
ng.RestService.prototype.create = function(item) {};

/**
 * Update a resource using `PUT`.
 * @param {ID} id
 * @param {!Object} item
 * @return {!Promise<?>}
 */
ng.RestService.prototype.update = function(id, item) {};

/**
 * Delete a resource by ID.
 * @param {ID} id
 * @return {!Promise<boolean>}
 */
ng.RestService.prototype.delete = function(id) {};

/**
 * Public AngularTS ScopeEvent contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.ScopeEvent = function() {};

/**
 * Public ScopeEvent.targetScope member exposed by the AngularTS namespace contract.
 * @type {function(new: ng.Scope, !ng.Scope, !Object)}
 */
ng.ScopeEvent.prototype.targetScope;

/**
 * Public ScopeEvent.currentScope member exposed by the AngularTS namespace contract.
 * @type {(function(new: ng.Scope, !ng.Scope, !Object)|null)}
 */
ng.ScopeEvent.prototype.currentScope;

/**
 * Public ScopeEvent.name member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.ScopeEvent.prototype.name;

/**
 * Public ScopeEvent.stopPropagation member exposed by the AngularTS namespace contract.
 * @type {(function(): void|undefined)}
 */
ng.ScopeEvent.prototype.stopPropagation;

/**
 * Public ScopeEvent.preventDefault member exposed by the AngularTS namespace contract.
 * @return {void}
 */
ng.ScopeEvent.prototype.preventDefault = function() {};

/**
 * Public ScopeEvent.stopped member exposed by the AngularTS namespace contract.
 * @type {boolean}
 */
ng.ScopeEvent.prototype.stopped;

/**
 * Public ScopeEvent.defaultPrevented member exposed by the AngularTS namespace contract.
 * @type {boolean}
 */
ng.ScopeEvent.prototype.defaultPrevented;

/**
 * An object that defines how a service is constructed. It must define a `$get` property that provides the instance of the service, either as a plain factory function or as an {@link AnnotatedFactory}.
 * @record
 */
ng.ServiceProvider = function() {};

/**
 * Public ServiceProvider.$get member exposed by the AngularTS namespace contract.
 * @type {!ng.Injectable}
 */
ng.ServiceProvider.prototype.$get;

/**
 * The StateDeclaration object is used to define a state or nested state. #### Example: ```js // StateDeclaration object var foldersState = { name: 'folders', url: '/folders', component: FoldersComponent, resolve: { allfolders: function(FolderService) { return FolderService.list(); } }, } registry.register(foldersState); ```
 * @record
 */
ng.StateDeclaration = function() {};

/**
 * The state name (required) A unique state name, e.g. `"home"`, `"about"`, `"contacts"`. To create a parent/child state use a dot, e.g. `"about.sales"`, `"home.newest"`. Note: [State] objects require unique names. The name is used like an id.
 * @type {string}
 */
ng.StateDeclaration.prototype.name;

/**
 * Abstract state indicator An abstract state can never be directly activated. Use an abstract state to provide inherited properties (url, resolve, data, etc) to children states.
 * @type {(boolean|undefined)}
 */
ng.StateDeclaration.prototype.abstract;

/**
 * The parent state Normally, a state's parent is implied from the state's [[name]], e.g., `"parentstate.childstate"`. Alternatively, you can explicitly set the parent state using this property. This allows shorter state names, e.g., `<a ng-sref="childstate">Child</a>` instead of `<a ng-sref="parentstate.childstate">Child</a> When using this property, the state's name should not have any dots in it. #### Example: ```js var parentstate = { name: 'parentstate' } var childstate = { name: 'childstate', parent: 'parentstate' // or use a JS var which is the parent StateDeclaration, i.e.: // parent: parentstate } ```
 * @type {(!ng.StateDeclaration|string|undefined)}
 */
ng.StateDeclaration.prototype.parent;

/**
 * Named view declarations for this state. Each key targets an `ng-view`; each value is either a full view declaration or a string shorthand for `{ component: "componentName" }`. Examples: ```js views: { mymessages: "mymessages", messagelist: { component: "messageList" }, "^.^.messagecontent": "message" } ```
 * @type {(!Object<string, (!Object|string)>|undefined)}
 */
ng.StateDeclaration.prototype.views;

/**
 * Resolve - a mechanism to asynchronously fetch data, participating in the Transition lifecycle The `resolve:` property defines data (or other dependencies) to be fetched asynchronously when the state is being entered. After the data is fetched, it may be used in views, transition hooks or other resolves that belong to this state. The data may also be used in any views or resolves that belong to nested states. ### As an array Each array element should be a [[ResolvableLiteral]] object. #### Example: The `user` resolve injects the current `Transition` and the `UserService` (using its token, which is a string). The [[ResolvableLiteral.eager]] flag controls whether the resolve starts at transition start instead of when the owning state is entered. The `user` data, fetched asynchronously, can then be used in a view. ```js var state = { name: 'user', url: '/user/:userId resolve: [ { token: 'user', eager: true, deps: ['UserService', Transition], resolveFn: (userSvc, trans) => userSvc.fetchUser(trans.params().userId) }, } ] } ``` ### As an object The `resolve` property may be an object where: - Each key (string) is the name of the dependency. - Each value (function) is an injectable function which returns the dependency, or a promise for the dependency. This style is based on AngularTS injectable functions. If your code will be minified, the function should be ["annotated" in the AngularTS manner](https://docs.angularjs.org/guide/di#dependency-annotation). #### AngularTS Example: ```js resolve: { // If you inject `myStateDependency` into a controller, you'll get "abc" myStateDependency: function() { return "abc"; }, // Dependencies are annotated in "Inline Array Annotation" myAsyncData: ['$http', '$transition$' function($http, $transition$) { // Return a promise (async) for the data return $http.get("/foos/" + $transition$.params().foo); }] } ``` Note: You cannot mark individual entries as eager, nor can you use non-string tokens when using the object style `resolve:` block. ### Lifecycle Since a resolve function can return a promise, the router will delay entering the state until the promises are ready. If any of the promises are rejected, the Transition is aborted with an Error. By default, resolves for a state are fetched just before that state is entered. Note that only states which are being *entered* during the `Transition` have their resolves fetched. States that are "retained" do not have their resolves re-fetched. If you are currently in a parent state `parent` and are transitioning to a child state `parent.child`, the previously resolved data for state `parent` can be injected into `parent.child` without delay. Any resolved data for `parent.child` is retained until `parent.child` is exited, e.g., by transitioning back to the `parent` state. Because of this scoping and lifecycle, resolves are a great place to fetch your application's primary data. ### Injecting resolves into other things During a transition, Resolve data can be injected into: - Views (the components which fill a `ng-view` tag) - Transition Hooks - Other resolves (a resolve may depend on asynchronous data from a different resolve) ### Injecting other things into resolves Resolve functions usually have dependencies on some other API(s). The dependencies are usually declared and injected into the resolve function. A common pattern is to inject a custom service such as `UserService`. The resolve then delegates to a service method, such as `UserService.list()`; #### Special injectable tokens - `Transition`: The current [[Transition]] object; information and API about the current transition, such as "to" and "from" State Parameters and transition options. - `'$transition$'`: A string alias for the `Transition` injectable - `'$state$'`: For `onEnter`/`onExit`/`onRetain`, the state being entered/exited/retained. - Other resolve tokens: A resolve can depend on another resolve, either from the same state, or from any parent state. #### Example: ```js // Injecting a resolve into another resolve resolve: [ // Define a resolve 'allusers' which delegates to the UserService.list() // which returns a promise (async) for all the users { token: 'allusers', resolveFn: (UserService) => UserService.list(), deps: [UserService] }, // Define a resolve 'user' which depends on the allusers resolve. // This resolve function is not called until 'allusers' is ready. { token: 'user', resolveFn: (allusers, trans) => _.find(allusers, trans.params().userId), deps: ['allusers', Transition] } } ```
 * @type {(!Array<!Object>|!Object<string, (!Array<function(...?): ?>|function(...?): ?)>|undefined)}
 */
ng.StateDeclaration.prototype.resolve;

/**
 * The url fragment for the state A URL fragment (with optional parameters) which is used to match the browser location with this state. This fragment will be appended to the parent state's URL in order to build up the overall URL for this state. It may include path parameters, typed parameters, and query parameters.
 * @type {(string|undefined)}
 */
ng.StateDeclaration.prototype.url;

/**
 * Params configuration An object which optionally configures parameters declared in the url, or defines additional non-url parameters. For each parameter being configured, add a [[ParamDeclaration]] keyed to the name of the parameter. #### Example: ```js params: { param1: { type: "int", array: true, value: [] }, param2: { value: "index" } } ```
 * @type {(!Object<string, !Object>|undefined)}
 */
ng.StateDeclaration.prototype.params;

/**
 * An inherited property to store state data This is a spot for you to store inherited state metadata. Child states' `data` object will prototypally inherit from their parent state. This is a good spot to put metadata such as `requiresAuth`. Note: because prototypal inheritance is used, changes to parent `data` objects reflect in the child `data` objects. Care should be taken if you are using `hasOwnProperty` on the `data` object. Properties from parent objects will return false for `hasOwnProperty`.
 * @type {(?|undefined)}
 */
ng.StateDeclaration.prototype.data;

/**
 * Synchronously or asynchronously redirects Transitions to a different state/params If this property is defined, a Transition directly to this state will be redirected based on the property's value. - If the value is a `string`, the Transition is redirected to the state named by the string. - If the property is an object with a `state` and/or `params` property, the Transition is redirected to the named `state` and/or `params`. - If the value is a [[TargetState]] the Transition is redirected to the `TargetState` - If the property is a function: - The function is called with the current [[Transition]] - The return value is processed using the previously mentioned rules. - If the return value is a promise, the promise is waited for, then the resolved async value is processed using the same rules. Note: `redirectTo` is processed as an `onStart` hook, before non-eager resolves. If your redirect function relies on resolve data, get the [[Transition.injector]] and request the resolve data with `getAsync()`. #### Example: ```js // a string .state('A', { redirectTo: 'A.B' }) // a {state, params} object .state('C', { redirectTo: { state: 'C.D', params: { foo: 'index' } } }) // a fn .state('E', { redirectTo: () => "A" }) // a fn conditionally returning a {state, params} .state('F', { redirectTo: (trans) => { if (trans.params().foo < 10) return { state: 'F', params: { foo: 10 } }; } }) // a fn returning a promise for a redirect .state('G', { redirectTo: (trans) => { let svc = trans.injector().get('SomeAsyncService') let promise = svc.getAsyncRedirectTo(trans.params.foo); return promise; } }) // a fn that fetches resolve data .state('G', { redirectTo: (trans) => { // getAsync tells the resolve to load let resolvePromise = trans.injector().getAsync('SomeResolve') return resolvePromise.then(resolveData => resolveData === 'login' ? 'login' : null); } }) ```
 * @type {(!Object|function(!ng.Transition): !Promise<(!Object|string|undefined)>|function(!ng.Transition): (!Object|string|undefined)|string|undefined)}
 */
ng.StateDeclaration.prototype.redirectTo;

/**
 * A state hook invoked when a state is being entered. The hook can inject global services. It can also inject `$transition$` or `$state$` (from the current transition). ### Example: ```js $stateProvider.state({ name: 'mystate', onEnter: (MyService, $transition$, $state$) => { return MyService.doSomething($state$.name, $transition$.params()); } }); ``` #### Example:` ```js $stateProvider.state({ name: 'mystate', onEnter: [ 'MyService', '$transition$', '$state$', function (MyService, $transition$, $state$) { return MyService.doSomething($state$.name, $transition$.params()); } ] }); ```
 * @type {((!Array<(string|function(...?): (!Object|!Promise<(!Object|boolean|undefined)>|boolean|undefined))>|function(!ng.Transition, !ng.StateDeclaration): (!Object|!Promise<(!Object|boolean|undefined)>|boolean|undefined)|function(...?): (!Object|!Promise<(!Object|boolean|undefined)>|boolean|undefined))|undefined)}
 */
ng.StateDeclaration.prototype.onEnter;

/**
 * A state hook invoked when a state is being retained. The hook can inject global services. It can also inject `$transition$` or `$state$` (from the current transition). #### Example: ```js $stateProvider.state({ name: 'mystate', onRetain: (MyService, $transition$, $state$) => { return MyService.doSomething($state$.name, $transition$.params()); } }); ``` #### Example:` ```js $stateProvider.state({ name: 'mystate', onRetain: [ 'MyService', '$transition$', '$state$', function (MyService, $transition$, $state$) { return MyService.doSomething($state$.name, $transition$.params()); } ] }); ```
 * @type {((!Array<(string|function(...?): (!Object|!Promise<(!Object|boolean|undefined)>|boolean|undefined))>|function(!ng.Transition, !ng.StateDeclaration): (!Object|!Promise<(!Object|boolean|undefined)>|boolean|undefined)|function(...?): (!Object|!Promise<(!Object|boolean|undefined)>|boolean|undefined))|undefined)}
 */
ng.StateDeclaration.prototype.onRetain;

/**
 * A state hook invoked when a state is being exited. The hook can inject global services. It can also inject `$transition$` or `$state$` (from the current transition). ### Example: ```js $stateProvider.state({ name: 'mystate', onExit: (MyService, $transition$, $state$) => { return MyService.doSomething($state$.name, $transition$.params()); } }); ``` #### Example:` ```js $stateProvider.state({ name: 'mystate', onExit: [ 'MyService', '$transition$', '$state$', function (MyService, $transition$, $state$) { return MyService.doSomething($state$.name, $transition$.params()); } ] }); ```
 * @type {((!Array<(string|function(...?): (!Object|!Promise<(!Object|boolean|undefined)>|boolean|undefined))>|function(!ng.Transition, !ng.StateDeclaration): (!Object|!Promise<(!Object|boolean|undefined)>|boolean|undefined)|function(...?): (!Object|!Promise<(!Object|boolean|undefined)>|boolean|undefined))|undefined)}
 */
ng.StateDeclaration.prototype.onExit;

/**
 * Marks all the state's parameters as `dynamic`. All parameters on the state will use this value for `dynamic` as a default. Individual parameters may override this default using [[ParamDeclaration.dynamic]] in the [[params]] block. This default applies to all parameters declared on this state.
 * @type {(boolean|undefined)}
 */
ng.StateDeclaration.prototype.dynamic;

/**
 * The name of the component to use for this view. The name of an AngularTS `.component()` which will be used for this view. Resolve data can be provided to the component via the component's `bindings` object. For each binding declared on the component, any resolve with the same name is set on the component's controller instance. Note: Mapping from resolve names to component inputs may be specified using [[bindings]]. #### Example: ```js .state('profile', { // Use the <my-profile></my-profile> component for this state. component: 'MyProfile', } ``` Note: When using `component` to define a view, you may _not_ use any of: `template`, `templateUrl`, `controller`.
 * @type {(string|undefined)}
 */
ng.StateDeclaration.prototype.component;

/**
 * An object which maps `resolve`s to [[component]] `bindings`. When using a [[component]] declaration (`component: 'myComponent'`), each input binding for the component is supplied data from a resolve of the same name, by default. You may supply data from a different resolve name by mapping it here. Each key in this object is the name of one of the component's input bindings. Each value is the name of the resolve that should be provided to that binding. Any component bindings that are omitted from this map get the default behavior of mapping to a resolve of the same name. #### Example: ```js $stateProvider.state('foo', { resolve: { foo: function(FooService) { return FooService.get(); }, bar: function(BarService) { return BarService.get(); } }, component: 'Baz', // The component's `baz` binding gets data from the `bar` resolve // The component's `foo` binding gets data from the `foo` resolve (default behavior) bindings: { baz: 'bar' } }); app.component('Baz', { templateUrl: 'baz.html', controller: 'BazController', bindings: { foo: '<', // foo binding baz: '<' // baz binding } }); ```
 * @type {(!Object<string, string>|undefined)}
 */
ng.StateDeclaration.prototype.bindings;

/**
 * The view's controller function or name The controller function, or the name of a registered controller. The controller function will be used to control the contents of the [[directives.ngVIew]] directive. See: [[Ng1Controller]] for information about component-level router hooks.
 * @type {(!Array<(function(...?): !ng.Controller|function(...?): (!ng.Controller|undefined))>|function(...?): (!ng.Controller|undefined)|function(new: ng.Controller, ...?)|string|undefined)}
 */
ng.StateDeclaration.prototype.controller;

/**
 * The HTML template for the view. HTML template as a string, or a function which returns an html template as a string. This template will be used to render the corresponding [[directives.ngVIew]] directive. This property takes precedence over templateUrl. If `template` is a function, it will be called with the Transition parameters as the first argument. #### Example: ```js template: "<h1>inline template definition</h1><div ng-view></div>" ``` #### Example: ```js template: function(params) { return "<h1>generated template</h1>"; } ```
 * @type {(function((!Object<string, ?>|undefined)): string|string|undefined)}
 */
ng.StateDeclaration.prototype.template;

/**
 * The URL for the HTML template for the view. A path or a function that returns a path to an html template. The template will be fetched and used to render the corresponding [[directives.ngVIew]] directive. If `templateUrl` is a function, it will be called with the Transition parameters as the first argument. #### Example: ```js templateUrl: "/templates/home.html" ``` #### Example: ```js templateUrl: function(params) { return myTemplates[params.pageId]; } ```
 * @type {(function((!Object<string, ?>|undefined)): (null|string|undefined)|string|undefined)}
 */
ng.StateDeclaration.prototype.templateUrl;

/**
 * Array-style state resolves. Use this when you need explicit resolve metadata such as `token`, `deps`, `eager`, or pre-resolved `data`. Example: ```js resolve: [ { token: "user", deps: ["UserService", Transition], resolveFn: (UserService, trans) => UserService.fetchUser(trans.params().userId), eager: true, }, ] ```
 * @typedef {!Array<!Object>}
 */
ng.StateResolveArray;

/**
 * Object-style state resolves. Use this when resolve tokens are string keys and each value is a normal AngularTS injectable function or annotated factory. Example: ```js resolve: { user: ["UserService", (UserService) => UserService.current()], featureFlags: () => fetchFlags(), } ```
 * @record
 */
ng.StateResolveObject = function() {};

/**
 * Public AngularTS StorageBackend contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.StorageBackend = function() {};

/**
 * Read a stored serialized value.
 * @param {string} key
 * @return {(string|undefined)}
 */
ng.StorageBackend.prototype.get = function(key) {};

/**
 * Store a serialized value.
 * @param {string} key
 * @param {string} value
 * @return {void}
 */
ng.StorageBackend.prototype.set = function(key, value) {};

/**
 * Remove a stored value.
 * @param {string} key
 * @return {void}
 */
ng.StorageBackend.prototype.remove = function(key) {};

/**
 * Built-in persistent storage backends understood by `NgModule.store()`.
 * @typedef {string}
 */
ng.StorageType;

/**
 * Public AngularTS ConnectionConfig contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.ConnectionConfig = function() {};

/**
 * Called when the connection opens
 * @type {(function(!Event): void|undefined)}
 */
ng.ConnectionConfig.prototype.onOpen;

/**
 * Called when a message is received
 * @type {(function(?, (!Event|!Object)): void|undefined)}
 */
ng.ConnectionConfig.prototype.onMessage;

/**
 * Called with every registered connection message, including custom SSE event types
 * @type {(function(!ng.ConnectionEvent): void|undefined)}
 */
ng.ConnectionConfig.prototype.onEvent;

/**
 * Called when an error occurs
 * @type {(function(?): void|undefined)}
 */
ng.ConnectionConfig.prototype.onError;

/**
 * Called when a WebSocket connection closes
 * @type {(function(!Object): void|undefined)}
 */
ng.ConnectionConfig.prototype.onClose;

/**
 * Called when a reconnect attempt happens
 * @type {(function(number): void|undefined)}
 */
ng.ConnectionConfig.prototype.onReconnect;

/**
 * Delay between reconnect attempts in milliseconds
 * @type {(number|undefined)}
 */
ng.ConnectionConfig.prototype.retryDelay;

/**
 * Maximum number of reconnect attempts
 * @type {(number|undefined)}
 */
ng.ConnectionConfig.prototype.maxRetries;

/**
 * Timeout in milliseconds to detect heartbeat inactivity
 * @type {(number|undefined)}
 */
ng.ConnectionConfig.prototype.heartbeatTimeout;

/**
 * Function to transform incoming messages
 * @type {(function(?): ?|undefined)}
 */
ng.ConnectionConfig.prototype.transformMessage;

/**
 * Additional EventSource event names to subscribe to
 * @type {(!Array<string>|undefined)}
 */
ng.ConnectionConfig.prototype.eventTypes;

/**
 * Public AngularTS ConnectionEvent contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.ConnectionEvent = function() {};

/**
 * Public ConnectionEvent.type member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.ConnectionEvent.prototype.type;

/**
 * Public ConnectionEvent.data member exposed by the AngularTS namespace contract.
 * @type {?}
 */
ng.ConnectionEvent.prototype.data;

/**
 * Public ConnectionEvent.rawData member exposed by the AngularTS namespace contract.
 * @type {?}
 */
ng.ConnectionEvent.prototype.rawData;

/**
 * Public ConnectionEvent.event member exposed by the AngularTS namespace contract.
 * @type {(!Event|!Object)}
 */
ng.ConnectionEvent.prototype.event;

/**
 * Public AngularTS StreamService contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.StreamService = function() {};

/**
 * Returns true when a value is a native readable byte stream.
 * @param {?} value
 * @return {boolean}
 */
ng.StreamService.prototype.isReadableStream = function(value) {};

/**
 * Decodes a byte stream and calls `onChunk` without retaining decoded text.
 * @param {!Object} stream
 * @param {(!Object|undefined)} options
 * @return {!Promise<void>}
 */
ng.StreamService.prototype.consumeText = function(stream, options) {};

/**
 * Decodes a byte stream into text chunks.
 * @param {!Object} stream
 * @param {(!Object|undefined)} options
 * @return {!Promise<string>}
 */
ng.StreamService.prototype.readText = function(stream, options) {};

/**
 * Decodes a byte stream and emits complete lines.
 * @param {!Object} stream
 * @param {(!Object|undefined)} options
 * @return {!Promise<!Array<string>>}
 */
ng.StreamService.prototype.readLines = function(stream, options) {};

/**
 * Decodes newline-delimited JSON without retaining parsed values.
 * @template T
 * @param {!Object} stream
 * @param {(!Object|undefined)} options
 * @return {!Promise<void>}
 */
ng.StreamService.prototype.consumeJsonLines = function(stream, options) {};

/**
 * Decodes newline-delimited JSON and returns all parsed values.
 * @template T
 * @param {!Object} stream
 * @param {(!Object|undefined)} options
 * @return {!Promise<!Array<T>>}
 */
ng.StreamService.prototype.readJsonLines = function(stream, options) {};

/**
 * Represents a transition between two states. When navigating to a state, we are transitioning **from** the current state **to** the new state. This object contains all contextual information about the to/from states, parameters, resolves. It has information about all states being entered and exited as a result of the transition.
 * @record
 */
ng.Transition = function() {};

/**
 * Public Transition.promise member exposed by the AngularTS namespace contract.
 * @type {!Promise<!ng.StateDeclaration>}
 */
ng.Transition.prototype.promise;

/**
 * Public Transition.$id member exposed by the AngularTS namespace contract.
 * @type {number}
 */
ng.Transition.prototype.$id;

/**
 * Public Transition.success member exposed by the AngularTS namespace contract.
 * @type {(boolean|undefined)}
 */
ng.Transition.prototype.success;

/**
 * Public Transition.applyViewConfigs member exposed by the AngularTS namespace contract.
 * @return {void}
 */
ng.Transition.prototype.applyViewConfigs = function() {};

/**
 * Public Transition.$from member exposed by the AngularTS namespace contract.
 * @return {!Object}
 */
ng.Transition.prototype.$from = function() {};

/**
 * Public Transition.$to member exposed by the AngularTS namespace contract.
 * @return {!Object}
 */
ng.Transition.prototype.$to = function() {};

/**
 * Returns the "from state" Returns the state that the transition is coming *from*.
 * @return {!ng.StateDeclaration}
 */
ng.Transition.prototype.from = function() {};

/**
 * Returns the "to state" Returns the state that the transition is going *to*.
 * @return {!ng.StateDeclaration}
 */
ng.Transition.prototype.to = function() {};

/**
 * Public Transition.params member exposed by the AngularTS namespace contract.
 * @param {(string|undefined)} pathname
 * @return {!Object<string, ?>}
 */
ng.Transition.prototype.params = function(pathname) {};

/**
 * Gets the states being entered.
 * @return {!Array<!ng.StateDeclaration>}
 */
ng.Transition.prototype.entering = function() {};

/**
 * Gets the states being exited.
 * @return {!Array<!ng.StateDeclaration>}
 */
ng.Transition.prototype.exiting = function() {};

/**
 * Creates a new transition that is a redirection of the current one. This transition can be returned from a [[TransitionService]] hook to redirect a transition to a new state and/or set of parameters.
 * @param {!Object} targetState
 * @return {!ng.Transition}
 */
ng.Transition.prototype.redirect = function(targetState) {};

/**
 * Returns true if the transition is dynamic. A transition is dynamic if no states are entered nor exited, but at least one dynamic parameter has changed.
 * @return {boolean}
 */
ng.Transition.prototype.dynamic = function() {};

/**
 * Runs the transition This method is generally called from the [[StateService.transitionTo]]
 * @return {!Promise<!ng.StateDeclaration>}
 */
ng.Transition.prototype.run = function() {};

/**
 * Checks if this transition is currently active/running.
 * @return {boolean}
 */
ng.Transition.prototype.isActive = function() {};

/**
 * Checks if the Transition is valid
 * @return {boolean}
 */
ng.Transition.prototype.valid = function() {};

/**
 * Aborts this transition Imperative API to abort a Transition. This only applies to Transitions that are not yet complete.
 * @return {void}
 */
ng.Transition.prototype.abort = function() {};

/**
 * The Transition error reason. If the transition is invalid (and could not be run), returns the reason the transition is invalid. If the transition was valid and ran, but was not successful, returns the reason the transition failed.
 * @return {(!Object|undefined)}
 */
ng.Transition.prototype.error = function() {};

/**
 * A string representation of the Transition
 * @return {string}
 */
ng.Transition.prototype.toString = function() {};

/**
 * Public AngularTS Validator contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {function(?): boolean}
 */
ng.Validator;

/**
 * Public AngularTS ElementScopeOptions contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.ElementScopeOptions = function() {};

/**
 * Explicit parent scope. Defaults to nearest inherited DOM scope.
 * @type {(!ng.Scope|undefined)}
 */
ng.ElementScopeOptions.prototype.parentScope;

/**
 * Use an isolate child scope.
 * @type {(boolean|undefined)}
 */
ng.ElementScopeOptions.prototype.isolate;

/**
 * Public AngularTS WebComponentContext contract exposed through the global ng namespace for Closure-annotated applications.
 * @template T
 * @record
 */
ng.WebComponentContext = function() {};

/**
 * Custom element host.
 * @type {!HTMLElement}
 */
ng.WebComponentContext.prototype.host;

/**
 * Scope owned by the custom element.
 * @type {!ng.Scope}
 */
ng.WebComponentContext.prototype.scope;

/**
 * Injector used by the AngularTS app that registered the element.
 * @type {!ng.InjectorService}
 */
ng.WebComponentContext.prototype.injector;

/**
 * Render root used for template content.
 * @type {(!HTMLElement|!Object)}
 */
ng.WebComponentContext.prototype.root;

/**
 * Shadow root when `shadow` is enabled.
 * @type {(!Object|undefined)}
 */
ng.WebComponentContext.prototype.shadowRoot;

/**
 * Dispatch a composed bubbling DOM event from the host.
 * @param {string} type
 * @param {(?|undefined)} detail
 * @param {(!Object|undefined)} init
 * @return {boolean}
 */
ng.WebComponentContext.prototype.dispatch = function(type, detail, init) {};

/**
 * Public AngularTS WebComponentInput contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {(!ng.WebComponentInputConfig|function((?|undefined)): boolean|function((?|undefined)): number|function((?|undefined)): string|function(?): ?)}
 */
ng.WebComponentInput;

/**
 * Public AngularTS WebComponentInputConfig contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.WebComponentInputConfig = function() {};

/**
 * Attribute name. Defaults to the kebab-case property name.
 * @type {(string|undefined)}
 */
ng.WebComponentInputConfig.prototype.attribute;

/**
 * Attribute/property coercion function. Defaults to `String`.
 * @type {(function((?|undefined)): boolean|function((?|undefined)): number|function((?|undefined)): string|function(?): ?|undefined)}
 */
ng.WebComponentInputConfig.prototype.type;

/**
 * Reflect property writes back to the DOM attribute.
 * @type {(boolean|undefined)}
 */
ng.WebComponentInputConfig.prototype.reflect;

/**
 * Initial value used when no attribute or property was provided.
 * @type {(?|undefined)}
 */
ng.WebComponentInputConfig.prototype.default;

/**
 * Public AngularTS WebComponentInputs contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.WebComponentInputs = function() {};

/**
 * Public AngularTS WebComponentOptions contract exposed through the global ng namespace for Closure-annotated applications.
 * @template T
 * @record
 */
ng.WebComponentOptions = function() {};

/**
 * Template compiled into the host or shadow root.
 * @type {(string|undefined)}
 */
ng.WebComponentOptions.prototype.template;

/**
 * Enables shadow DOM, or passes ShadowRootInit options.
 * @type {(!Object|boolean|undefined)}
 */
ng.WebComponentOptions.prototype.shadow;

/**
 * Initial scope state, or a factory returning it.
 * @type {(T|function(): T|undefined)}
 */
ng.WebComponentOptions.prototype.scope;

/**
 * Declared DOM attributes/properties that sync into the scope.
 * @type {(!Object<string, (!ng.WebComponentInputConfig|function((?|undefined)): number|function((?|undefined)): string|function((T|undefined)): boolean|function(?): ?)>|undefined)}
 */
ng.WebComponentOptions.prototype.inputs;

/**
 * Use an isolate child scope instead of inheriting parent properties.
 * @type {(boolean|undefined)}
 */
ng.WebComponentOptions.prototype.isolate;

/**
 * Called after the scope exists and the template has been linked.
 * @type {(function(!ng.WebComponentContext<T>): (function(): void|undefined)|undefined)}
 */
ng.WebComponentOptions.prototype.connected;

/**
 * Called before the scope is destroyed.
 * @type {(function(!ng.WebComponentContext<T>): void|undefined)}
 */
ng.WebComponentOptions.prototype.disconnected;

/**
 * Called after an observed input attribute changes.
 * @type {(function(string, (null|string), (null|string), !ng.WebComponentContext<T>): void|undefined)}
 */
ng.WebComponentOptions.prototype.attributeChanged;

/**
 * Public AngularTS WebComponentService contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.WebComponentService = function() {};

/**
 * Define a scoped custom element.
 * @template T
 * @param {string} name
 * @param {!ng.WebComponentOptions<T>} options
 * @return {function(new: HTMLElement, ...?)}
 */
ng.WebComponentService.prototype.define = function(name, options) {};

/**
 * Create and attach a normal AngularTS child scope for a custom element.
 * @template T
 * @param {!HTMLElement} host
 * @param {(T|undefined)} initialState
 * @param {(!ng.ElementScopeOptions|undefined)} options
 * @return {!ng.Scope}
 */
ng.WebComponentService.prototype.createElementScope = function(host, initialState, options) {};

/**
 * WebSocket-specific configuration
 * @record
 */
ng.WebSocketConfig = function() {};

/**
 * Optional WebSocket subprotocols
 * @type {(!Array<string>|undefined)}
 */
ng.WebSocketConfig.prototype.protocols;

/**
 * Called when a decoded message uses the realtime protocol shape.
 * @type {(function(!ng.RealtimeProtocolMessage, (!Event|!Object)): void|undefined)}
 */
ng.WebSocketConfig.prototype.onProtocolMessage;

/**
 * Called when the connection opens
 * @type {(function(!Event): void|undefined)}
 */
ng.WebSocketConfig.prototype.onOpen;

/**
 * Called when a message is received
 * @type {(function(?, (!Event|!Object)): void|undefined)}
 */
ng.WebSocketConfig.prototype.onMessage;

/**
 * Called with every registered connection message, including custom SSE event types
 * @type {(function(!ng.ConnectionEvent): void|undefined)}
 */
ng.WebSocketConfig.prototype.onEvent;

/**
 * Called when an error occurs
 * @type {(function(?): void|undefined)}
 */
ng.WebSocketConfig.prototype.onError;

/**
 * Called when a WebSocket connection closes
 * @type {(function(!Object): void|undefined)}
 */
ng.WebSocketConfig.prototype.onClose;

/**
 * Called when a reconnect attempt happens
 * @type {(function(number): void|undefined)}
 */
ng.WebSocketConfig.prototype.onReconnect;

/**
 * Delay between reconnect attempts in milliseconds
 * @type {(number|undefined)}
 */
ng.WebSocketConfig.prototype.retryDelay;

/**
 * Maximum number of reconnect attempts
 * @type {(number|undefined)}
 */
ng.WebSocketConfig.prototype.maxRetries;

/**
 * Timeout in milliseconds to detect heartbeat inactivity
 * @type {(number|undefined)}
 */
ng.WebSocketConfig.prototype.heartbeatTimeout;

/**
 * Function to transform incoming messages
 * @type {(function(?): ?|undefined)}
 */
ng.WebSocketConfig.prototype.transformMessage;

/**
 * Additional EventSource event names to subscribe to
 * @type {(!Array<string>|undefined)}
 */
ng.WebSocketConfig.prototype.eventTypes;

/**
 * Managed WebSocket connection returned by $websocket.
 * @record
 */
ng.WebSocketConnection = function() {};

/**
 * Manually restart the WebSocket connection.
 * @return {void}
 */
ng.WebSocketConnection.prototype.connect = function() {};

/**
 * Send a JSON-serialized message through the native WebSocket.
 * @param {?} data
 * @return {void}
 */
ng.WebSocketConnection.prototype.send = function(data) {};

/**
 * Close the WebSocket connection and stop reconnect attempts.
 * @return {void}
 */
ng.WebSocketConnection.prototype.close = function() {};

/**
 * Public AngularTS WebSocketService contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {function(string, (!Array<string>|undefined), (!ng.WebSocketConfig|undefined)): !ng.WebSocketConnection}
 */
ng.WebSocketService;

/**
 * Public AngularTS NativeWebTransport contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {!WebTransport}
 */
ng.NativeWebTransport;

/**
 * Public AngularTS WebTransportBufferInput contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {BufferSource}
 */
ng.WebTransportBufferInput;

/**
 * Public AngularTS WebTransportCertificateHash contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.WebTransportCertificateHash = function() {};

/**
 * Public WebTransportCertificateHash.algorithm member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.WebTransportCertificateHash.prototype.algorithm;

/**
 * Public WebTransportCertificateHash.value member exposed by the AngularTS namespace contract.
 * @type {!Object}
 */
ng.WebTransportCertificateHash.prototype.value;

/**
 * Options passed to `$webTransport`.
 * @record
 */
ng.WebTransportConfig = function() {};

/**
 * Called whenever the current native transport resolves `ready`.
 * @type {(function(): void|undefined)}
 */
ng.WebTransportConfig.prototype.onOpen;

/**
 * Called when the managed connection closes without another reconnect.
 * @type {(function(): void|undefined)}
 */
ng.WebTransportConfig.prototype.onClose;

/**
 * Called when opening, reading, writing, or closing fails.
 * @type {(function(?): void|undefined)}
 */
ng.WebTransportConfig.prototype.onError;

/**
 * Called with each incoming datagram.
 * @type {(function(!ng.WebTransportDatagramEvent<?>): void|undefined)}
 */
ng.WebTransportConfig.prototype.onDatagram;

/**
 * Called when a decoded datagram uses the realtime protocol shape.
 * @type {(function(!ng.RealtimeProtocolMessage, !ng.WebTransportDatagramEvent<!ng.RealtimeProtocolMessage>): void|undefined)}
 */
ng.WebTransportConfig.prototype.onProtocolMessage;

/**
 * Converts incoming datagram bytes into the value passed as `event.message`.
 * @type {(function(!Object): ?|undefined)}
 */
ng.WebTransportConfig.prototype.transformDatagram;

/**
 * Reopen the native WebTransport session when it closes unexpectedly.
 * @type {(boolean|undefined)}
 */
ng.WebTransportConfig.prototype.reconnect;

/**
 * Delay before each reconnect attempt. Defaults to 1000ms.
 * @type {(function(number, (?|undefined)): number|number|undefined)}
 */
ng.WebTransportConfig.prototype.retryDelay;

/**
 * Maximum reconnect attempts before `closed` settles. Defaults to no limit.
 * @type {(number|undefined)}
 */
ng.WebTransportConfig.prototype.maxRetries;

/**
 * Called after a replacement session is ready so callers can renegotiate state.
 * @type {(function(!ng.WebTransportReconnectEvent): (!Promise<void>|void)|undefined)}
 */
ng.WebTransportConfig.prototype.onReconnect;

/**
 * Public WebTransportConfig.allowPooling member exposed by the AngularTS namespace contract.
 * @type {(boolean|undefined)}
 */
ng.WebTransportConfig.prototype.allowPooling;

/**
 * Public WebTransportConfig.congestionControl member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.WebTransportConfig.prototype.congestionControl;

/**
 * Public WebTransportConfig.requireUnreliable member exposed by the AngularTS namespace contract.
 * @type {(boolean|undefined)}
 */
ng.WebTransportConfig.prototype.requireUnreliable;

/**
 * Public WebTransportConfig.serverCertificateHashes member exposed by the AngularTS namespace contract.
 * @type {(!Array<!ng.WebTransportCertificateHash>|undefined)}
 */
ng.WebTransportConfig.prototype.serverCertificateHashes;

/**
 * Managed WebTransport connection returned by `$webTransport`. The connection wraps the browser-native `WebTransport` object and keeps its promise/stream model visible while adding small conveniences for sending bytes, text, datagrams, and unidirectional streams.
 * @record
 */
ng.WebTransportConnection = function() {};

/**
 * Resolves after the current native WebTransport session is ready.
 * @type {!Promise<!ng.WebTransportConnection>}
 */
ng.WebTransportConnection.prototype.ready;

/**
 * Resolves or rejects when the managed connection closes permanently.
 * @type {!Promise<void>}
 */
ng.WebTransportConnection.prototype.closed;

/**
 * Current browser-native WebTransport instance. Replaced after reconnects.
 * @type {!ng.NativeWebTransport}
 */
ng.WebTransportConnection.prototype.transport;

/**
 * Send one unreliable datagram.
 * @param {(!Object|string)} data
 * @return {!Promise<void>}
 */
ng.WebTransportConnection.prototype.sendDatagram = function(data) {};

/**
 * Send UTF-8 text as one unreliable datagram.
 * @param {string} data
 * @return {!Promise<void>}
 */
ng.WebTransportConnection.prototype.sendText = function(data) {};

/**
 * Send data on a client-opened reliable unidirectional stream.
 * @param {(!Object|string)} data
 * @return {!Promise<void>}
 */
ng.WebTransportConnection.prototype.sendStream = function(data) {};

/**
 * Open a reliable bidirectional stream.
 * @return {!Promise<!Object>}
 */
ng.WebTransportConnection.prototype.createBidirectionalStream = function() {};

/**
 * Close the WebTransport session.
 * @param {(!Object|undefined)} closeInfo
 * @return {void}
 */
ng.WebTransportConnection.prototype.close = function(closeInfo) {};

/**
 * Public AngularTS WebTransportDatagramEvent contract exposed through the global ng namespace for Closure-annotated applications.
 * @template T
 * @record
 */
ng.WebTransportDatagramEvent = function() {};

/**
 * Raw bytes received from the browser WebTransport datagram stream.
 * @type {!Object}
 */
ng.WebTransportDatagramEvent.prototype.data;

/**
 * Value after `transformDatagram`, or the raw bytes when no transform is configured.
 * @type {T}
 */
ng.WebTransportDatagramEvent.prototype.message;

/**
 * Public AngularTS WebTransportOptions contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.WebTransportOptions = function() {};

/**
 * Public WebTransportOptions.allowPooling member exposed by the AngularTS namespace contract.
 * @type {(boolean|undefined)}
 */
ng.WebTransportOptions.prototype.allowPooling;

/**
 * Public WebTransportOptions.congestionControl member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.WebTransportOptions.prototype.congestionControl;

/**
 * Public WebTransportOptions.requireUnreliable member exposed by the AngularTS namespace contract.
 * @type {(boolean|undefined)}
 */
ng.WebTransportOptions.prototype.requireUnreliable;

/**
 * Public WebTransportOptions.serverCertificateHashes member exposed by the AngularTS namespace contract.
 * @type {(!Array<!ng.WebTransportCertificateHash>|undefined)}
 */
ng.WebTransportOptions.prototype.serverCertificateHashes;

/**
 * Event passed to WebTransport reconnect and renegotiation hooks.
 * @record
 */
ng.WebTransportReconnectEvent = function() {};

/**
 * Stable managed connection whose native `transport` was reopened.
 * @type {!ng.WebTransportConnection}
 */
ng.WebTransportReconnectEvent.prototype.connection;

/**
 * One-based reconnect attempt count for this connection.
 * @type {number}
 */
ng.WebTransportReconnectEvent.prototype.attempt;

/**
 * Error or close reason that caused the reconnect attempt, when available.
 * @type {(?|undefined)}
 */
ng.WebTransportReconnectEvent.prototype.error;

/**
 * URL used to open the replacement WebTransport session.
 * @type {string}
 */
ng.WebTransportReconnectEvent.prototype.url;

/**
 * Delay, in milliseconds, before a reconnect attempt is opened.
 * @typedef {(function(number, (?|undefined)): number|number)}
 */
ng.WebTransportRetryDelay;

/**
 * Factory function exposed as `$webTransport`.
 * @typedef {function(string, (!ng.WebTransportConfig|undefined)): !ng.WebTransportConnection}
 */
ng.WebTransportService;

/**
 * The **`Window`** interface represents a window containing a DOM document; the `document` property points to the DOM document loaded in that window. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Window)
 * @typedef {!Window}
 */
ng.WindowService;

/**
 * Public AngularTS WorkerConfig contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.WorkerConfig = function() {};

/**
 * Public WorkerConfig.onMessage member exposed by the AngularTS namespace contract.
 * @type {(function(?, !Object): void|undefined)}
 */
ng.WorkerConfig.prototype.onMessage;

/**
 * Public WorkerConfig.onError member exposed by the AngularTS namespace contract.
 * @type {(function(!Object): void|undefined)}
 */
ng.WorkerConfig.prototype.onError;

/**
 * Public WorkerConfig.autoRestart member exposed by the AngularTS namespace contract.
 * @type {(boolean|undefined)}
 */
ng.WorkerConfig.prototype.autoRestart;

/**
 * Public WorkerConfig.autoTerminate member exposed by the AngularTS namespace contract.
 * @type {(boolean|undefined)}
 */
ng.WorkerConfig.prototype.autoTerminate;

/**
 * Public WorkerConfig.transformMessage member exposed by the AngularTS namespace contract.
 * @type {(function(?): ?|undefined)}
 */
ng.WorkerConfig.prototype.transformMessage;

/**
 * Public WorkerConfig.logger member exposed by the AngularTS namespace contract.
 * @type {(!ng.LogService|undefined)}
 */
ng.WorkerConfig.prototype.logger;

/**
 * Public WorkerConfig.err member exposed by the AngularTS namespace contract.
 * @type {(function(?): ?|undefined)}
 */
ng.WorkerConfig.prototype.err;

/**
 * Public AngularTS WorkerConnection contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.WorkerConnection = function() {};

/**
 * Public WorkerConnection.post member exposed by the AngularTS namespace contract.
 * @param {?} data
 * @return {void}
 */
ng.WorkerConnection.prototype.post = function(data) {};

/**
 * Public WorkerConnection.terminate member exposed by the AngularTS namespace contract.
 * @return {void}
 */
ng.WorkerConnection.prototype.terminate = function() {};

/**
 * Public WorkerConnection.restart member exposed by the AngularTS namespace contract.
 * @return {void}
 */
ng.WorkerConnection.prototype.restart = function() {};

/**
 * Public WorkerConnection.config member exposed by the AngularTS namespace contract.
 * @type {!ng.WorkerConfig}
 */
ng.WorkerConnection.prototype.config;
