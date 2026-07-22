/**
 * @externs
 * Public externs for AngularTS [VI]{version}[/VI] applications compiled with Google Closure.
 *
 * Version-pinned to @angular-wave/angular.ts [VI]{version}[/VI]; regenerate
 * this file when updating the public ng namespace.
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
 * Base class for user-authored AngularTS custom elements.
 * @type {!ng.ScopeElement}
 */
ng.Angular.prototype.ScopeElement;

/**
 * Sub-application instances created when multiple `ng-app` roots are initialized.
 * @type {!Array<!ng.Angular>}
 */
ng.Angular.prototype.subapps;

/**
 * Application-wide event bus, available after bootstrap providers are created.
 * @type {!ng.EventBusService}
 */
ng.Angular.prototype.$eventBus;

/**
 * Application injector, available after `bootstrap()` or `injector()` completes.
 * @type {!ng.InjectorService<?>}
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
 * @return {!ng.InjectorService<?>}
 */
ng.Angular.prototype.getInjector = function(element) {};

/**
 * Retrieve the scope cached on a compiled DOM element.
 * @param {!Element} element
 * @return {!ng.Scope}
 */
ng.Angular.prototype.getScope = function(element) {};

/**
 * Read an element attribute by normalized directive-style name.
 * @param {(!Element|!Node|null|undefined)} element
 * @param {string} normalizedName
 * @return {(string|undefined)}
 */
ng.Angular.prototype.getNormalizedAttr = function(element, normalizedName) {};

/**
 * Return the actual DOM attribute name for a normalized directive-style name.
 * @param {(!Element|!Node|null|undefined)} element
 * @param {string} normalizedName
 * @return {(string|undefined)}
 */
ng.Angular.prototype.getNormalizedAttrName = function(element, normalizedName) {};

/**
 * Return whether an element has an attribute matching a normalized name.
 * @param {(!Element|!Node|null|undefined)} element
 * @param {string} normalizedName
 * @return {boolean}
 */
ng.Angular.prototype.hasNormalizedAttr = function(element, normalizedName) {};

/**
 * Global framework error-handling configuration.
 * @param {(!ng.ErrorHandlingConfig|undefined)} config
 * @return {!ng.ErrorHandlingConfig}
 */
ng.Angular.prototype.errorHandlingConfig = function(config) {};

/**
 * Public injection token names keyed by token value.
 * @type {!Object}
 */
ng.Angular.prototype.$t;

/**
 * Registers the configured built-in `ng` module for this runtime instance.
 * @return {!ng.NgModule}
 */
ng.Angular.prototype.registerNgModule = function() {};

/**
 * The `angular.module` is a global place for creating, registering and retrieving AngularTS modules. All modules (AngularTS core or 3rd party) that should be available to an application must be registered using this mechanism. Passing one argument retrieves an existing ng.NgModule, whereas passing more than one argument creates a new ng.NgModule # Module A module is a collection of services, directives, controllers, filters, workers, WebAssembly modules, and configuration information. `angular.module` is used to configure the auto.$injector `$injector`. ```js // Create a new module let myModule = angular.module('myModule', []); // register a new service myModule.value('appName', 'MyCoolApp'); // configure built-in services with typed object config. myModule.config({ location: { hashPrefix: '!', }, }); ``` Then you can create an injector and load your modules like this: ```js let injector = angular.injector(['ng', 'myModule']) ``` However it's more likely that you'll use the `ng-app` directive or `bootstrap()` to simplify this process.
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
 * Use this function to manually start up AngularTS application. AngularTS will detect if it has been loaded into the browser more than once and only allow the first loaded script to be bootstrapped and will report a warning to the browser console for each of the subsequent scripts. This prevents strange results in applications, where otherwise multiple instances of AngularTS try to work on the DOM. **Note:** Do not bootstrap the app on an element with a directive that uses transclusion, such as `ng-if`, `ng-include`, or `ng-view`. Doing this misplaces the app root element and injector, causing animations to stop working and making the injector inaccessible from outside the app. ```html <!doctype html> <html> <body> <div ng-controller="WelcomeController"> {{greeting}} </div> <script src="angular.js"></script> <script> let app = angular.module('demo', []) .controller('WelcomeController', ['$scope', function($scope) { $scope.greeting = 'Welcome!'; }]); angular.bootstrap(document, ['demo']); </script> </body> </html> ```
 * @param {(!Document|!HTMLElement|string)} element
 * @param {(!Array<(string|!ng.Injectable)>|undefined)} modules
 * @return {!ng.InjectorService<?>}
 */
ng.Angular.prototype.bootstrap = function(element, modules) {};

/**
 * Create a standalone injector without bootstrapping the DOM.
 * @param {!Array<(string|!ng.Injectable)>} modules
 * @return {!ng.InjectorService<?>}
 */
ng.Angular.prototype.injector = function(modules) {};

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
 * @typedef {!Array<(string|function(...?): (!ng.Directive|(function(!ng.Scope, !HTMLElement): void|function(!ng.Scope, !HTMLElement, !ng.TranscludeFn): void|function(!ng.Scope, !HTMLElement, ?, (!ng.TranscludeFn|undefined)): void)))>}
 */
ng.AnnotatedDirectiveFactory;

/**
 * Defines a component's configuration object (a simplified directive definition object).
 * @record
 */
ng.Component = function() {};

/**
 * Public Component.controller member exposed by the AngularTS namespace contract.
 * @type {(!Array<(function(...?): !Object|function(...?): (!Object|undefined))>|function(...?): (!Object|undefined)|function(new: Object, ...?)|string|undefined)}
 */
ng.Component.prototype.controller;

/**
 * An identifier name for a reference to the controller. If present, the controller will be published to its scope under the specified name. If not present, this will default to '$ctrl'.
 * @type {(string|undefined)}
 */
ng.Component.prototype.controllerAs;

/**
 * html template as a string or a function that returns an html template as a string which should be used as the contents of this component. Empty string by default. If template is a function, then it is injected with the following locals: $element - Current element Use the array form to define dependencies.
 * @type {(!Array<function(...?): string>|function(...?): string|string|undefined)}
 */
ng.Component.prototype.template;

/**
 * Path or function that returns a path to an html template that should be used as the contents of this component. If templateUrl is a function, then it is injected with the following locals: $element - Current element Use the array form to define dependencies.
 * @type {(!Array<function(...?): string>|function(...?): string|string|undefined)}
 */
ng.Component.prototype.templateUrl;

/**
 * Define DOM attribute binding to component properties. Component properties are always bound to the component controller and not to the scope.
 * @type {(!Object<string, string>|undefined)}
 */
ng.Component.prototype.bindings;

/**
 * Replaces the generated component host element with the component template.
 * @type {(boolean|undefined)}
 */
ng.Component.prototype.replace;

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
 * Called after this controller has been linked, AngularTS has applied DOM mutations for the current flush, and the browser has had one animation frame to settle layout. Multiple schedules for the same controller in one flush are coalesced into one call.
 * @type {(function(): void|undefined)}
 */
ng.Controller.prototype.$afterRender;

/**
 * Boolean class map consumed by `ng-class`. Each key is a CSS class name. Truthy values add the class; `false`, `null`, and `undefined` remove it.
 * @record
 */
ng.ClassMap = function() {};

/**
 * Public shape accepted by `ng-class` for class binding expressions.
 * @typedef {(!Array<(!Object<string, (boolean|null|undefined)>|null|string|undefined)>|!Object<string, (boolean|null|undefined)>|null|string|undefined)}
 */
ng.ClassValue;

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
 * @type {(function(!HTMLElement, (!ng.LinkFn|!ng.TranscludeFn|undefined)): (!Object|function(...?): void|undefined)|undefined)}
 */
ng.Directive.prototype.compile;

/**
 * Controller constructor or injectable string name
 * @type {(!Array<(function(...?): !Object|function(...?): (!Object|undefined))>|function(...?): (!Object|undefined)|function(new: Object, ...?)|string|undefined)}
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
 * @type {(!Object|function(...?): void|undefined)}
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
 * @type {(function(!HTMLElement): string|string|undefined)}
 */
ng.Directive.prototype.template;

/**
 * Template namespace (e.g., SVG, HTML)
 * @type {(string|undefined)}
 */
ng.Directive.prototype.templateNamespace;

/**
 * Template URL for loading from server
 * @type {(function(!HTMLElement): string|string|undefined)}
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
 * Supported directive matching locations.
 * @typedef {string}
 */
ng.DirectiveRestrict;

/**
 * Directive registration factory that returns either a directive definition object or a link function.
 * @typedef {(!ng.AnnotatedDirectiveFactory|function(...?): (!ng.Directive|(function(!ng.Scope, !HTMLElement): void|function(!ng.Scope, !HTMLElement, !ng.TranscludeFn): void|function(!ng.Scope, !HTMLElement, ?, (!ng.TranscludeFn|undefined)): void)))}
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
 * Declare built-in AngularTS service configuration during the config phase.
 * @param {!Object} config
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.config = function(config) {};

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
 * @param {(!Array<function(...?): function(...?): ?>|function(...?): function(...?): ?)} filterFn
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.filter = function(name, filterFn) {};

/**
 * The $controller service is used by Angular to create new controllers. Named controllers are stored in the owning runtime's controller registry.
 * @param {string} name
 * @param {!ng.Injectable} ctlFn
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.controller = function(name, ctlFn) {};

/**
 * Register a named reactive model as an injectable app-owned service. The model is created lazily by the owning `AppContext` when the service is first injected. Models are shared across every root scope managed by the same `AppContext`; they are not children of `$rootScope`. Assign an injected model to a controller or scope property to bind it in a template. DOM interpolation, `ng-bind`, directive expressions, nested object reads, and array length reads update when the app model changes. Mutating the model proxy schedules every affected observer. The injected `Model<T>` value is proxy-backed. It exposes scope-proxy methods such as `$watch`, `$batch`, `$merge`, `$on`, `$emit`, `$broadcast`, and `$destroy`, plus `$snapshot`, `$restore`, and `$sync` for model lifecycle and synchronization. Prefer the factory form for nontrivial initial state: ```ts app.model("user", () => ({ name: "John", authenticated: false })); ```
 * @template T
 * @param {string} name
 * @param {(!Array<function(...?): T>|T|function(...?): T)} initial
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.model = function(name, initial) {};

/**
 * Register a named reactive state machine as an injectable service. The machine is created by `$machine` when the named service is requested. The returned instance is not tied to any one scope lifetime; it registers with AngularTS scope proxies when assigned to a controller or scope.
 * @template TData, TStates
 * @param {string} name
 * @param {(!Array<function(): !Object>|!Object|function(): !Object)} config
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.machine = function(name, config) {};

/**
 * Register a named workflow as an injectable service. The workflow is created by `$workflow` when the named service is requested. Workflow behavior remains local to its `WorkflowConfig`; the provider does not apply global workflow defaults.
 * @template TDefinition
 * @param {string} name
 * @param {(!Array<function(): TDefinition>|TDefinition|function(): TDefinition)} config
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.workflow = function(name, config) {};

/**
 * Register a named workflow supervisor as an injectable service. The supervisor is created when the named service is requested. It composes existing workflow configs or workflow instances and keeps persistence and recovery policy local to the supervisor config.
 * @template TWorkflows
 * @param {string} name
 * @param {(!Array<function(): !Object>|!Object|function(): !Object)} config
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.workflowSupervisor = function(name, config) {};

/**
 * Register a module-owned router state tree during module configuration. Child state names are relative to their parent unless they contain a dot. Each route is queued for the composed router runtime, so module router trees compose with `lazyState(...)` and inherited route policies.
 * @template TDeclaration
 * @param {TDeclaration} declaration
 * @return {!Object}
 */
ng.NgModule.prototype.router = function(declaration) {};

/**
 * Register a lazy router state namespace during module configuration. Lazy route declarations use the same composed router runtime as static module routes.
 * @param {string} prefix
 * @param {function(!Object, (!ng.InjectorService<?>|undefined)): (!Array<!ng.StateDeclaration>|!Promise<(!Array<!ng.StateDeclaration>|!ng.StateDeclaration|undefined)>|!ng.StateDeclaration|undefined)} loader
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.lazyState = function(prefix, loader) {};

/**
 * Register a named WebAssembly module as an injectable resource. The actual loading is delegated to the `$wasm` service, so custom runtimes can decide whether WebAssembly support is included.
 * @param {string} name
 * @param {(!Array<function(...?): !ng.WasmLoadOptions>|!ng.WasmLoadOptions|function(...?): !ng.WasmLoadOptions)} config
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.wasm = function(name, config) {};

/**
 * Register a named Web Worker connection as an injectable service. The actual connection is delegated to the `$worker` provider, so worker support remains provider-driven instead of directive-driven.
 * @param {string} name
 * @param {(!Array<function(...?): (!Object|string)>|!Object|function(...?): (!Object|string)|string)} scriptPath
 * @param {(!Array<function(...?): !Object>|!Object|function(...?): !Object|undefined)} config
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.worker = function(name, scriptPath, config) {};

/**
 * Configure the singleton `$serviceWorker` for this application.
 * @param {(!Object|string)} scriptUrl
 * @param {(!ng.ServiceWorkerConfig|undefined)} config
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.serviceWorker = function(scriptUrl, config) {};

/**
 * Register a persistent object store as an injectable service. Store construction is delegated to the internal provider registry, which creates the service through the injector and persists it through the selected backend.
 * @param {string} name
 * @param {(!Object|function(...?): ?|function(new: ?, ...?))} ctor
 * @param {string} type
 * @param {(!Object|undefined)} backendOrConfig
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.store = function(name, ctor, type, backendOrConfig) {};

/**
 * Register a REST resource as an injectable service. The resource factory is delegated to the injected `$rest` service, keeping REST support configurable by custom runtimes.
 * @template T
 * @param {string} name
 * @param {string} url
 * @param {(function(new: T, ?)|undefined)} entityClass
 * @param {(!Array<function(...?): !ng.RestOptions>|!ng.RestOptions|function(...?): !ng.RestOptions|undefined)} options
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.rest = function(name, url, entityClass, options) {};

/**
 * Register a pre-configured SSE connection as an injectable service. The connection is created by `$sse` when the named service is requested.
 * @param {string} name
 * @param {string} url
 * @param {(!Array<function(...?): !ng.SseConfig>|!ng.SseConfig|function(...?): !ng.SseConfig|undefined)} config
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.sse = function(name, url, config) {};

/**
 * Register a pre-configured WebSocket connection as an injectable service. The connection is created by `$websocket` when the named service is requested.
 * @param {string} name
 * @param {string} url
 * @param {(!Array<function(...?): !ng.WebSocketConfig>|!ng.WebSocketConfig|function(...?): !ng.WebSocketConfig|undefined)} config
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.websocket = function(name, url, config) {};

/**
 * Register a pre-configured WebTransport connection as an injectable service. The connection is created by `$webTransport` when the named service is requested.
 * @param {string} name
 * @param {string} url
 * @param {(!Array<function(...?): !ng.WebTransportConfig>|!ng.WebTransportConfig|function(...?): !ng.WebTransportConfig|undefined)} config
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.webTransport = function(name, url, config) {};

/**
 * Register an options-backed application host custom element. The definition is installed when the module runs. The host element is a native custom element backed by an AngularTS child scope.
 * @template T
 * @param {string} name
 * @param {!ng.AppComponentOptions<T>} options
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.appComponent = function(name, options) {};

/**
 * Register a user-authored native custom element backed by an AngularTS scope. The element class must extend `ScopeElement`. Its static template, shadow, scope, inputs, and isolate properties configure the AngularTS wiring.
 * @template T
 * @param {string} name
 * @param {!ng.ScopeElementConstructor<T>} elementClass
 * @return {!ng.NgModule}
 */
ng.NgModule.prototype.webComponent = function(name, elementClass) {};

/**
 * Public AngularTS RouterModule contract exposed through the global ng namespace for Closure-annotated applications.
 * @template TRouteMap
 * @record
 */
ng.RouterModule = function() {};

/**
 * Public RouterModule.filter member exposed by the AngularTS namespace contract.
 * @param {string} name
 * @param {(!Array<function(...?): function(...?): ?>|function(...?): function(...?): ?)} filterFn
 * @return {!ng.NgModule}
 */
ng.RouterModule.prototype.filter = function(name, filterFn) {};

/**
 * Public RouterModule.name member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.RouterModule.prototype.name;

/**
 * Public RouterModule.value member exposed by the AngularTS namespace contract.
 * @param {string} name
 * @param {?} object
 * @return {!ng.NgModule}
 */
ng.RouterModule.prototype.value = function(name, object) {};

/**
 * Public RouterModule.constant member exposed by the AngularTS namespace contract.
 * @param {string} name
 * @param {?} object
 * @return {!ng.NgModule}
 */
ng.RouterModule.prototype.constant = function(name, object) {};

/**
 * Declare built-in AngularTS service configuration during the config phase.
 * @param {!Object} config
 * @return {!ng.NgModule}
 */
ng.RouterModule.prototype.config = function(config) {};

/**
 * Public RouterModule.run member exposed by the AngularTS namespace contract.
 * @param {(!Array<function(...?): ?>|function(...?): ?)} block
 * @return {!ng.NgModule}
 */
ng.RouterModule.prototype.run = function(block) {};

/**
 * Public RouterModule.component member exposed by the AngularTS namespace contract.
 * @param {string} name
 * @param {!ng.Component} options
 * @return {!ng.NgModule}
 */
ng.RouterModule.prototype.component = function(name, options) {};

/**
 * Public RouterModule.factory member exposed by the AngularTS namespace contract.
 * @param {string} name
 * @param {(!Array<function(...?): ?>|function(...?): ?)} providerFunction
 * @return {!ng.NgModule}
 */
ng.RouterModule.prototype.factory = function(name, providerFunction) {};

/**
 * Public RouterModule.service member exposed by the AngularTS namespace contract.
 * @param {string} name
 * @param {(!Array<function(...?): ?>|function(...?): ?|function(new: ?, ...?))} serviceFunction
 * @return {!ng.NgModule}
 */
ng.RouterModule.prototype.service = function(name, serviceFunction) {};

/**
 * Public RouterModule.provider member exposed by the AngularTS namespace contract.
 * @param {string} name
 * @param {(!Array<function(...?): ?>|!Object|function(...?): ?|function(new: ?, ...?))} providerType
 * @return {!ng.NgModule}
 */
ng.RouterModule.prototype.provider = function(name, providerType) {};

/**
 * Public RouterModule.decorator member exposed by the AngularTS namespace contract.
 * @param {string} name
 * @param {(!Array<function(...?): ?>|function(...?): ?)} decorFn
 * @return {!ng.NgModule}
 */
ng.RouterModule.prototype.decorator = function(name, decorFn) {};

/**
 * Public RouterModule.directive member exposed by the AngularTS namespace contract.
 * @param {string} name
 * @param {(!Array<(function(...?): (!ng.Directive<?>|function(...?): void)|string)>|function(...?): (!ng.Directive<?>|function(...?): void))} directiveFactory
 * @return {!ng.NgModule}
 */
ng.RouterModule.prototype.directive = function(name, directiveFactory) {};

/**
 * Public RouterModule.animation member exposed by the AngularTS namespace contract.
 * @param {string} name
 * @param {(!Array<function(...?): ?>|function(...?): ?)} animationFactory
 * @return {!ng.NgModule}
 */
ng.RouterModule.prototype.animation = function(name, animationFactory) {};

/**
 * The $controller service is used by Angular to create new controllers. Named controllers are stored in the owning runtime's controller registry.
 * @param {string} name
 * @param {(!Array<(function(...?): !Object|function(...?): (!Object|undefined))>|function(...?): (!Object|undefined)|function(new: Object, ...?))} ctlFn
 * @return {!ng.NgModule}
 */
ng.RouterModule.prototype.controller = function(name, ctlFn) {};

/**
 * Register a named reactive model as an injectable app-owned service. The model is created lazily by the owning `AppContext` when the service is first injected. Models are shared across every root scope managed by the same `AppContext`; they are not children of `$rootScope`. Assign an injected model to a controller or scope property to bind it in a template. DOM interpolation, `ng-bind`, directive expressions, nested object reads, and array length reads update when the app model changes. Mutating the model proxy schedules every affected observer. The injected `Model<T>` value is proxy-backed. It exposes scope-proxy methods such as `$watch`, `$batch`, `$merge`, `$on`, `$emit`, `$broadcast`, and `$destroy`, plus `$snapshot`, `$restore`, and `$sync` for model lifecycle and synchronization. Prefer the factory form for nontrivial initial state: ```ts app.model("user", () => ({ name: "John", authenticated: false })); ```
 * @template T
 * @param {string} name
 * @param {(!Array<function(...?): T>|T|function(...?): T)} initial
 * @return {!ng.NgModule}
 */
ng.RouterModule.prototype.model = function(name, initial) {};

/**
 * Register a named reactive state machine as an injectable service. The machine is created by `$machine` when the named service is requested. The returned instance is not tied to any one scope lifetime; it registers with AngularTS scope proxies when assigned to a controller or scope.
 * @template TData, TStates
 * @param {string} name
 * @param {(!Array<function(): !Object>|!Object|function(): !Object)} config
 * @return {!ng.NgModule}
 */
ng.RouterModule.prototype.machine = function(name, config) {};

/**
 * Register a named workflow as an injectable service. The workflow is created by `$workflow` when the named service is requested. Workflow behavior remains local to its `WorkflowConfig`; the provider does not apply global workflow defaults.
 * @template TDefinition
 * @param {string} name
 * @param {(!Array<function(): TDefinition>|TDefinition|function(): TDefinition)} config
 * @return {!ng.NgModule}
 */
ng.RouterModule.prototype.workflow = function(name, config) {};

/**
 * Register a named workflow supervisor as an injectable service. The supervisor is created when the named service is requested. It composes existing workflow configs or workflow instances and keeps persistence and recovery policy local to the supervisor config.
 * @template TWorkflows
 * @param {string} name
 * @param {(!Array<function(): !Object>|!Object|function(): !Object)} config
 * @return {!ng.NgModule}
 */
ng.RouterModule.prototype.workflowSupervisor = function(name, config) {};

/**
 * Register a named WebAssembly module as an injectable resource. The actual loading is delegated to the `$wasm` service, so custom runtimes can decide whether WebAssembly support is included.
 * @param {string} name
 * @param {(!Array<function(...?): !ng.WasmLoadOptions>|!ng.WasmLoadOptions|function(...?): !ng.WasmLoadOptions)} config
 * @return {!ng.NgModule}
 */
ng.RouterModule.prototype.wasm = function(name, config) {};

/**
 * Register a named Web Worker connection as an injectable service. The actual connection is delegated to the `$worker` provider, so worker support remains provider-driven instead of directive-driven.
 * @param {string} name
 * @param {(!Array<function(...?): (!Object|string)>|!Object|function(...?): (!Object|string)|string)} scriptPath
 * @param {(!Array<function(...?): !Object>|!Object|function(...?): !Object|undefined)} config
 * @return {!ng.NgModule}
 */
ng.RouterModule.prototype.worker = function(name, scriptPath, config) {};

/**
 * Configure the singleton `$serviceWorker` for this application.
 * @param {(!Object|string)} scriptUrl
 * @param {(!ng.ServiceWorkerConfig|undefined)} config
 * @return {!ng.NgModule}
 */
ng.RouterModule.prototype.serviceWorker = function(scriptUrl, config) {};

/**
 * Register a persistent object store as an injectable service. Store construction is delegated to the internal provider registry, which creates the service through the injector and persists it through the selected backend.
 * @param {string} name
 * @param {?} ctor
 * @param {string} type
 * @param {(!Object|undefined)} backendOrConfig
 * @return {!ng.NgModule}
 */
ng.RouterModule.prototype.store = function(name, ctor, type, backendOrConfig) {};

/**
 * Register a REST resource as an injectable service. The resource factory is delegated to the injected `$rest` service, keeping REST support configurable by custom runtimes.
 * @template T
 * @param {string} name
 * @param {string} url
 * @param {(function(new: T, ?)|undefined)} entityClass
 * @param {(!Array<function(...?): !ng.RestOptions>|!ng.RestOptions|function(...?): !ng.RestOptions|undefined)} options
 * @return {!ng.NgModule}
 */
ng.RouterModule.prototype.rest = function(name, url, entityClass, options) {};

/**
 * Register a pre-configured SSE connection as an injectable service. The connection is created by `$sse` when the named service is requested.
 * @param {string} name
 * @param {string} url
 * @param {(!Array<function(...?): !ng.SseConfig>|!ng.SseConfig|function(...?): !ng.SseConfig|undefined)} config
 * @return {!ng.NgModule}
 */
ng.RouterModule.prototype.sse = function(name, url, config) {};

/**
 * Register a pre-configured WebSocket connection as an injectable service. The connection is created by `$websocket` when the named service is requested.
 * @param {string} name
 * @param {string} url
 * @param {(!Array<function(...?): !ng.WebSocketConfig>|!ng.WebSocketConfig|function(...?): !ng.WebSocketConfig|undefined)} config
 * @return {!ng.NgModule}
 */
ng.RouterModule.prototype.websocket = function(name, url, config) {};

/**
 * Register a pre-configured WebTransport connection as an injectable service. The connection is created by `$webTransport` when the named service is requested.
 * @param {string} name
 * @param {string} url
 * @param {(!Array<function(...?): !ng.WebTransportConfig>|!ng.WebTransportConfig|function(...?): !ng.WebTransportConfig|undefined)} config
 * @return {!ng.NgModule}
 */
ng.RouterModule.prototype.webTransport = function(name, url, config) {};

/**
 * Register an options-backed application host custom element. The definition is installed when the module runs. The host element is a native custom element backed by an AngularTS child scope.
 * @template T
 * @param {string} name
 * @param {!ng.AppComponentOptions<T>} options
 * @return {!ng.NgModule}
 */
ng.RouterModule.prototype.appComponent = function(name, options) {};

/**
 * Register a user-authored native custom element backed by an AngularTS scope. The element class must extend `ScopeElement`. Its static template, shadow, scope, inputs, and isolate properties configure the AngularTS wiring.
 * @template T
 * @param {string} name
 * @param {!ng.ScopeElementConstructor<T>} elementClass
 * @return {!ng.NgModule}
 */
ng.RouterModule.prototype.webComponent = function(name, elementClass) {};

/**
 * Register a router tree while preserving this module's route map.
 * @template TDeclaration
 * @param {!Object} declaration
 * @return {!Object}
 */
ng.RouterModule.prototype.router = function(declaration) {};

/**
 * Register a lazy state namespace while preserving this module route map.
 * @param {?} prefix
 * @param {function(!Object, (!ng.InjectorService<?>|undefined)): (!Array<!ng.StateDeclaration>|!Promise<(!Array<!ng.StateDeclaration>|!ng.StateDeclaration|undefined)>|!ng.StateDeclaration|undefined)} loader
 * @return {!Object}
 */
ng.RouterModule.prototype.lazyState = function(prefix, loader) {};

/**
 * A function returned by the `$compile` service that links a compiled template to a scope.
 * @record
 */
ng.LinkFn = function() {};

/**
 * Public LinkFn.pre member exposed by the AngularTS namespace contract.
 * @type {(?|undefined)}
 */
ng.LinkFn.prototype.pre;

/**
 * Public LinkFn.post member exposed by the AngularTS namespace contract.
 * @type {(?|undefined)}
 */
ng.LinkFn.prototype.post;

/**
 * Invokes the callable LinkFn contract.
 * @param {!ng.Scope} scope
 * @param {(function((!Array<!Node>|!Node|!Object|null|undefined), (!ng.Scope|null|undefined)): ?|undefined)} cloneAttachFn
 * @param {(!Object|undefined)} options
 * @return {(!Array<!Node>|!Element|!Node|!Object)}
 */
ng.LinkFn.prototype.call = function(scope, cloneAttachFn, options) {};

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
 * Runs synchronous scope mutations as one batch. Listener notifications are queued while the callback runs and flushed once after the outermost batch exits. Mutations are not rolled back if the callback throws.
 * @template T
 * @param {function(): T} fn
 * @return {T}
 */
ng.Scope.prototype.$batch = function(fn) {};

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
 * @return {!ng.ScopeEvent}
 */
ng.Scope.prototype.$emit = function(name, var_args) {};

/**
 * Broadcasts an event downward through the scope hierarchy.
 * @param {string} name
 * @param {...?} var_args
 * @return {!ng.ScopeEvent}
 */
ng.Scope.prototype.$broadcast = function(name, var_args) {};

/**
 * Public Scope.$destroy member exposed by the AngularTS namespace contract.
 * @return {void}
 */
ng.Scope.prototype.$destroy = function() {};

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
 * A function passed to directive link functions for transcluded content. It behaves like a linking function, with the `scope` argument automatically created as a new child of the transcluded parent scope. The function returns the DOM content to be injected (transcluded) into the directive.
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
 * Public AngularTS AriaConfig contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.AriaConfig = function() {};

/**
 * Public AriaConfig.ariaHidden member exposed by the AngularTS namespace contract.
 * @type {boolean}
 */
ng.AriaConfig.prototype.ariaHidden;

/**
 * Public AriaConfig.ariaChecked member exposed by the AngularTS namespace contract.
 * @type {boolean}
 */
ng.AriaConfig.prototype.ariaChecked;

/**
 * Public AriaConfig.ariaReadonly member exposed by the AngularTS namespace contract.
 * @type {boolean}
 */
ng.AriaConfig.prototype.ariaReadonly;

/**
 * Public AriaConfig.ariaDisabled member exposed by the AngularTS namespace contract.
 * @type {boolean}
 */
ng.AriaConfig.prototype.ariaDisabled;

/**
 * Public AriaConfig.ariaRequired member exposed by the AngularTS namespace contract.
 * @type {boolean}
 */
ng.AriaConfig.prototype.ariaRequired;

/**
 * Public AriaConfig.ariaInvalid member exposed by the AngularTS namespace contract.
 * @type {boolean}
 */
ng.AriaConfig.prototype.ariaInvalid;

/**
 * Public AriaConfig.ariaValue member exposed by the AngularTS namespace contract.
 * @type {boolean}
 */
ng.AriaConfig.prototype.ariaValue;

/**
 * Public AriaConfig.ariaCurrent member exposed by the AngularTS namespace contract.
 * @type {boolean}
 */
ng.AriaConfig.prototype.ariaCurrent;

/**
 * Public AriaConfig.ariaCurrentToken member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.AriaConfig.prototype.ariaCurrentToken;

/**
 * Public AriaConfig.tabindex member exposed by the AngularTS namespace contract.
 * @type {boolean}
 */
ng.AriaConfig.prototype.tabindex;

/**
 * Public AriaConfig.bindKeydown member exposed by the AngularTS namespace contract.
 * @type {boolean}
 */
ng.AriaConfig.prototype.bindKeydown;

/**
 * Public AriaConfig.bindRoleForClick member exposed by the AngularTS namespace contract.
 * @type {boolean}
 */
ng.AriaConfig.prototype.bindRoleForClick;

/**
 * Public AriaConfig.bindRoleForState member exposed by the AngularTS namespace contract.
 * @type {boolean}
 */
ng.AriaConfig.prototype.bindRoleForState;

/**
 * Public AriaConfig.diagnostics member exposed by the AngularTS namespace contract.
 * @type {boolean}
 */
ng.AriaConfig.prototype.diagnostics;

/**
 * Delimiter configuration accepted by `NgModule.config()`.
 * @record
 */
ng.InterpolateConfig = function() {};

/**
 * Opening delimiter. Defaults to `{{`.
 * @type {(string|undefined)}
 */
ng.InterpolateConfig.prototype.startSymbol;

/**
 * Closing delimiter. Defaults to `}}`.
 * @type {(string|undefined)}
 */
ng.InterpolateConfig.prototype.endSymbol;

/**
 * Main AngularTS runtime entry point with the full built-in `ng` module configured by default.
 * @record
 */
ng.AngularService = function() {};

/**
 * Base class for user-authored AngularTS custom elements.
 * @type {!ng.ScopeElement}
 */
ng.AngularService.prototype.ScopeElement;

/**
 * Sub-application instances created when multiple `ng-app` roots are initialized.
 * @type {!Array<!Object>}
 */
ng.AngularService.prototype.subapps;

/**
 * Application-wide event bus, available after bootstrap providers are created.
 * @type {!ng.EventBusService}
 */
ng.AngularService.prototype.$eventBus;

/**
 * Application injector, available after `bootstrap()` or `injector()` completes.
 * @type {!ng.InjectorService<?>}
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
 * @return {!ng.InjectorService<?>}
 */
ng.AngularService.prototype.getInjector = function(element) {};

/**
 * Retrieve the scope cached on a compiled DOM element.
 * @param {!Element} element
 * @return {!ng.Scope}
 */
ng.AngularService.prototype.getScope = function(element) {};

/**
 * Read an element attribute by normalized directive-style name.
 * @param {(!Element|!Node|null|undefined)} element
 * @param {string} normalizedName
 * @return {(string|undefined)}
 */
ng.AngularService.prototype.getNormalizedAttr = function(element, normalizedName) {};

/**
 * Return the actual DOM attribute name for a normalized directive-style name.
 * @param {(!Element|!Node|null|undefined)} element
 * @param {string} normalizedName
 * @return {(string|undefined)}
 */
ng.AngularService.prototype.getNormalizedAttrName = function(element, normalizedName) {};

/**
 * Return whether an element has an attribute matching a normalized name.
 * @param {(!Element|!Node|null|undefined)} element
 * @param {string} normalizedName
 * @return {boolean}
 */
ng.AngularService.prototype.hasNormalizedAttr = function(element, normalizedName) {};

/**
 * Global framework error-handling configuration.
 * @param {(!ng.ErrorHandlingConfig|undefined)} config
 * @return {!ng.ErrorHandlingConfig}
 */
ng.AngularService.prototype.errorHandlingConfig = function(config) {};

/**
 * Public injection token names keyed by token value.
 * @type {!Object}
 */
ng.AngularService.prototype.$t;

/**
 * Registers the configured built-in `ng` module for this runtime instance.
 * @return {!ng.NgModule}
 */
ng.AngularService.prototype.registerNgModule = function() {};

/**
 * The `angular.module` is a global place for creating, registering and retrieving AngularTS modules. All modules (AngularTS core or 3rd party) that should be available to an application must be registered using this mechanism. Passing one argument retrieves an existing ng.NgModule, whereas passing more than one argument creates a new ng.NgModule # Module A module is a collection of services, directives, controllers, filters, workers, WebAssembly modules, and configuration information. `angular.module` is used to configure the auto.$injector `$injector`. ```js // Create a new module let myModule = angular.module('myModule', []); // register a new service myModule.value('appName', 'MyCoolApp'); // configure built-in services with typed object config. myModule.config({ location: { hashPrefix: '!', }, }); ``` Then you can create an injector and load your modules like this: ```js let injector = angular.injector(['ng', 'myModule']) ``` However it's more likely that you'll use the `ng-app` directive or `bootstrap()` to simplify this process.
 * @param {string} name
 * @param {(!Array<string>|undefined)} requires
 * @param {(!Array<function(...?): ?>|function(...?): ?|undefined)} configFn
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
 * Use this function to manually start up AngularTS application. AngularTS will detect if it has been loaded into the browser more than once and only allow the first loaded script to be bootstrapped and will report a warning to the browser console for each of the subsequent scripts. This prevents strange results in applications, where otherwise multiple instances of AngularTS try to work on the DOM. **Note:** Do not bootstrap the app on an element with a directive that uses transclusion, such as `ng-if`, `ng-include`, or `ng-view`. Doing this misplaces the app root element and injector, causing animations to stop working and making the injector inaccessible from outside the app. ```html <!doctype html> <html> <body> <div ng-controller="WelcomeController"> {{greeting}} </div> <script src="angular.js"></script> <script> let app = angular.module('demo', []) .controller('WelcomeController', ['$scope', function($scope) { $scope.greeting = 'Welcome!'; }]); angular.bootstrap(document, ['demo']); </script> </body> </html> ```
 * @param {(!Document|!HTMLElement|string)} element
 * @param {(!Array<(!Array<function(...?): ?>|function(...?): ?|string)>|undefined)} modules
 * @return {!ng.InjectorService<?>}
 */
ng.AngularService.prototype.bootstrap = function(element, modules) {};

/**
 * Create a standalone injector without bootstrapping the DOM.
 * @param {!Array<(!Array<function(...?): ?>|function(...?): ?|string)>} modules
 * @return {!ng.InjectorService<?>}
 */
ng.AngularService.prototype.injector = function(modules) {};

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
 * Scope class for the Proxy. It intercepts operations like property access (get) and property setting (set), and adds support for deep change tracking and observer-like behavior.
 * @record
 */
ng.ScopeService = function() {};

/**
 * Public ScopeService.$proxy member exposed by the AngularTS namespace contract.
 * @type {!ng.Scope}
 */
ng.ScopeService.prototype.$proxy;

/**
 * Public ScopeService.$handler member exposed by the AngularTS namespace contract.
 * @type {?}
 */
ng.ScopeService.prototype.$handler;

/**
 * Public ScopeService.$target member exposed by the AngularTS namespace contract.
 * @type {!Object}
 */
ng.ScopeService.prototype.$target;

/**
 * Public ScopeService.$id member exposed by the AngularTS namespace contract.
 * @type {number}
 */
ng.ScopeService.prototype.$id;

/**
 * Public ScopeService.$root member exposed by the AngularTS namespace contract.
 * @type {!ng.Scope}
 */
ng.ScopeService.prototype.$root;

/**
 * Public ScopeService.$parent member exposed by the AngularTS namespace contract.
 * @type {(!ng.Scope|undefined)}
 */
ng.ScopeService.prototype.$parent;

/**
 * Public ScopeService.$scopename member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.ScopeService.prototype.$scopename;

/**
 * Intercepts and handles property assignments on the target object. Scopeable objects are stored as raw model values and proxied lazily when read.
 * @param {!Object} target
 * @param {string} property
 * @param {?} value
 * @param {!ng.Scope} proxy
 * @return {boolean}
 */
ng.ScopeService.prototype.set = function(target, property, value, proxy) {};

/**
 * Intercepts property access on the target object. It checks for specific properties (`watch` and `sync`) and binds their methods. For other properties, it returns the value directly.
 * @param {!Object} target
 * @param {(number|string|symbol)} property
 * @param {!ng.Scope} proxy
 * @return {?}
 */
ng.ScopeService.prototype.get = function(target, property, proxy) {};

/**
 * Public ScopeService.deleteProperty member exposed by the AngularTS namespace contract.
 * @param {!Object} target
 * @param {(number|string|symbol)} property
 * @return {boolean}
 */
ng.ScopeService.prototype.deleteProperty = function(target, property) {};

/**
 * Runs synchronous scope mutations as one batch. Listener notifications are queued while the callback runs and flushed once after the outermost batch exits. Mutations are not rolled back if the callback throws.
 * @template T
 * @param {function(): T} fn
 * @return {T}
 */
ng.ScopeService.prototype.$batch = function(fn) {};

/**
 * Registers a watcher for a property along with a listener function. The listener function is invoked when changes to that property are detected.
 * @param {string} watchProp
 * @param {(function((?|undefined), (?|undefined)): void|undefined)} listenerFn
 * @param {(boolean|undefined)} lazy
 * @return {(function(): void|undefined)}
 */
ng.ScopeService.prototype.$watch = function(watchProp, listenerFn, lazy) {};

/**
 * Creates a prototypically inherited child scope.
 * @param {(!ng.Scope|undefined)} childInstance
 * @return {!ng.Scope}
 */
ng.ScopeService.prototype.$new = function(childInstance) {};

/**
 * Creates an isolate child scope that does not inherit watchable properties directly.
 * @param {(!ng.Scope|undefined)} instance
 * @return {!ng.Scope}
 */
ng.ScopeService.prototype.$newIsolate = function(instance) {};

/**
 * Creates a transcluded child scope linked to this scope and an optional parent instance.
 * @param {(!ng.Scope|undefined)} parentInstance
 * @return {!ng.Scope}
 */
ng.ScopeService.prototype.$transcluded = function(parentInstance) {};

/**
 * Merges enumerable properties from the provided object into the current scope target.
 * @param {?} newTarget
 * @return {void}
 */
ng.ScopeService.prototype.$merge = function(newTarget) {};

/**
 * Registers an event listener on this scope and returns a deregistration function.
 * @param {string} name
 * @param {function(...?): ?} listener
 * @return {function(): void}
 */
ng.ScopeService.prototype.$on = function(name, listener) {};

/**
 * Emits an event upward through the scope hierarchy.
 * @param {string} name
 * @param {...?} var_args
 * @return {!ng.ScopeEvent}
 */
ng.ScopeService.prototype.$emit = function(name, var_args) {};

/**
 * Broadcasts an event downward through the scope hierarchy.
 * @param {string} name
 * @param {...?} var_args
 * @return {!ng.ScopeEvent}
 */
ng.ScopeService.prototype.$broadcast = function(name, var_args) {};

/**
 * Public ScopeService.$destroy member exposed by the AngularTS namespace contract.
 * @return {void}
 */
ng.ScopeService.prototype.$destroy = function() {};

/**
 * Searches this scope tree for a scope with the given id.
 * @param {(number|string)} id
 * @return {(!ng.Scope|undefined)}
 */
ng.ScopeService.prototype.$getById = function(id) {};

/**
 * Searches the scope tree for a scope registered under the provided name.
 * @param {string} name
 * @return {(!ng.Scope|undefined)}
 */
ng.ScopeService.prototype.$searchByName = function(name) {};

/**
 * Scope class for the Proxy. It intercepts operations like property access (get) and property setting (set), and adds support for deep change tracking and observer-like behavior.
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
 * Runs synchronous scope mutations as one batch. Listener notifications are queued while the callback runs and flushed once after the outermost batch exits. Mutations are not rolled back if the callback throws.
 * @template T
 * @param {function(): T} fn
 * @return {T}
 */
ng.RootScopeService.prototype.$batch = function(fn) {};

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
 * @param {?} newTarget
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
 * @return {!ng.ScopeEvent}
 */
ng.RootScopeService.prototype.$emit = function(name, var_args) {};

/**
 * Broadcasts an event downward through the scope hierarchy.
 * @param {string} name
 * @param {...?} var_args
 * @return {!ng.ScopeEvent}
 */
ng.RootScopeService.prototype.$broadcast = function(name, var_args) {};

/**
 * Public RootScopeService.$destroy member exposed by the AngularTS namespace contract.
 * @return {void}
 */
ng.RootScopeService.prototype.$destroy = function() {};

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
 * **`Element`** is the most general base class from which all element objects (i.e., objects that represent elements) in a Document inherit. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element)
 * @typedef {!Element}
 */
ng.ElementService;

/**
 * The **`HTMLElement`** interface represents any HTML element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement)
 * @typedef {!HTMLElement}
 */
ng.RootElementService;

/**
 * The **`Document`** interface represents any web page loaded in the browser and serves as an entry point into the web page's content, which is the DOM tree. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document)
 * @typedef {!Document}
 */
ng.DocumentService;

/**
 * The **`Window`** interface represents a window containing a DOM document; the `document` property points to the DOM document loaded in that window. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Window)
 * @record
 */
ng.WindowService = function() {};

/**
 * Public WindowService.angular member exposed by the AngularTS namespace contract.
 * @type {!ng.Angular}
 */
ng.WindowService.prototype.angular;

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
 * @param {(!ng.AnimationOptions|undefined)} options
 * @return {!ng.AnimationHandle}
 */
ng.AnimateService.prototype.enter = function(element, parent, after, options) {};

/**
 * Public AnimateService.move member exposed by the AngularTS namespace contract.
 * @param {!Element} element
 * @param {(!Object|null)} parent
 * @param {(!Object|null|undefined)} after
 * @param {(!ng.AnimationOptions|undefined)} options
 * @return {!ng.AnimationHandle}
 */
ng.AnimateService.prototype.move = function(element, parent, after, options) {};

/**
 * Public AnimateService.leave member exposed by the AngularTS namespace contract.
 * @param {!Element} element
 * @param {(!ng.AnimationOptions|undefined)} options
 * @return {!ng.AnimationHandle}
 */
ng.AnimateService.prototype.leave = function(element, options) {};

/**
 * Public AnimateService.addClass member exposed by the AngularTS namespace contract.
 * @param {!Element} element
 * @param {string} className
 * @param {(!ng.AnimationOptions|undefined)} options
 * @return {!ng.AnimationHandle}
 */
ng.AnimateService.prototype.addClass = function(element, className, options) {};

/**
 * Public AnimateService.removeClass member exposed by the AngularTS namespace contract.
 * @param {!Element} element
 * @param {string} className
 * @param {(!ng.AnimationOptions|undefined)} options
 * @return {!ng.AnimationHandle}
 */
ng.AnimateService.prototype.removeClass = function(element, className, options) {};

/**
 * Public AnimateService.setClass member exposed by the AngularTS namespace contract.
 * @param {!Element} element
 * @param {string} add
 * @param {string} remove
 * @param {(!ng.AnimationOptions|undefined)} options
 * @return {!ng.AnimationHandle}
 */
ng.AnimateService.prototype.setClass = function(element, add, remove, options) {};

/**
 * Public AnimateService.animate member exposed by the AngularTS namespace contract.
 * @param {!Element} element
 * @param {!Object<string, (number|string)>} from
 * @param {(!Object<string, (number|string)>|undefined)} to
 * @param {(string|undefined)} className
 * @param {(!ng.AnimationOptions|undefined)} options
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
 * @template K
 * @param {K} key
 * @return {?}
 */
ng.AriaService.prototype.config = function(key) {};

/**
 * Entry point for the `$compile` service.
 * @typedef {function((!Element|!Node|!Object|null|string), (!ng.LinkFn|!ng.TranscludeFn|null|undefined), (number|undefined), (string|undefined), (!Object|null|undefined)): !ng.LinkFn}
 */
ng.CompileService;

/**
 * Public AngularTS ControllerService contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {function((!Array<(function(...?): !Object|function(...?): (!Object|undefined))>|function(...?): (!Object|undefined)|function(new: Object, ...?)|string), (!Object|undefined), (boolean|undefined), (string|undefined)): ?}
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
 * Topic-based publish/subscribe service for decoupled application events.
 * @constructor
 */
ng.EventBusService = function() {};

/**
 * Reset the bus to its initial state without disposing it. All topics and listeners are removed, and the instance can be reused.
 * @return {void}
 */
ng.EventBusService.prototype.reset = function() {};

/**
 * Replace the runtime delivery policy used by future publications. The default policy delivers every active listener. Configured policies can drop deliveries for specific topics, scopes, or application metadata.
 * @param {(function(!ng.EventDeliveryPolicyContext): (!Promise<(!ng.PolicyDecision<string>|string)>|!ng.PolicyDecision<string>|string)|undefined)} policy
 * @return {void}
 */
ng.EventBusService.prototype.setDeliveryPolicy = function(policy) {};

/**
 * Checks if instance has been disposed.
 * @return {boolean}
 */
ng.EventBusService.prototype.isDisposed = function() {};

/**
 * Dispose the instance, removing all topics and listeners.
 * @return {void}
 */
ng.EventBusService.prototype.dispose = function() {};

/**
 * Subscribe a function to a topic. The returned function removes only this listener registration. When `context` is provided, it becomes the listener `this` binding. When `context` is an AngularTS scope proxy, the scope also owns the listener lifecycle: destroying the scope removes the listener and prevents queued delivery from reaching the destroyed scope.
 * @param {string} topic
 * @param {function(...?): ?} fn
 * @return {function(): boolean}
 */
ng.EventBusService.prototype.subscribe = function(topic, fn) {};

/**
 * Subscribe a function to a topic only once. Listener is removed before the first invocation. When `context` is provided, it becomes the listener `this` binding. When `context` is an AngularTS scope proxy, scope destruction before first delivery removes the one-time listener.
 * @param {string} topic
 * @param {function(...?): ?} fn
 * @return {function(): boolean}
 */
ng.EventBusService.prototype.subscribeOnce = function(topic, fn) {};

/**
 * Unsubscribe a specific function from a topic. Matches by function reference and optional context.
 * @param {string} topic
 * @param {function(...?): ?} fn
 * @return {boolean}
 */
ng.EventBusService.prototype.unsubscribe = function(topic, fn) {};

/**
 * Get the number of subscribers for a topic. This is the public diagnostic surface for `$eventBus`. It reports active registered listeners only; topic listings, leak reports, and reactive diagnostics are intentionally not exposed.
 * @param {string} topic
 * @return {number}
 */
ng.EventBusService.prototype.getCount = function(topic) {};

/**
 * Publish a value to a topic asynchronously. All listeners are invoked in the order they were added. Delivery is scheduled with `queueMicrotask`. Scope-owned listeners are skipped if their scope is destroyed before the queued delivery runs.
 * @param {string} topic
 * @param {...?} var_args
 * @return {boolean}
 */
ng.EventBusService.prototype.publish = function(topic, var_args) {};

/**
 * A callback type for handling errors.
 * @typedef {function(?): ?}
 */
ng.ExceptionHandlerService;

/**
 * Declarative config accepted by `NgModule.config({ $htmlCanvas: ... })`. The integration is disabled by default and has no AngularTS fallback.
 * @record
 */
ng.HtmlCanvasConfig = function() {};

/**
 * Public HtmlCanvasConfig.enabled member exposed by the AngularTS namespace contract.
 * @type {(boolean|string|undefined)}
 */
ng.HtmlCanvasConfig.prototype.enabled;

/**
 * Throw when HTML-in-Canvas is enabled on a runtime that does not support the native browser feature. AngularTS does not provide a fallback renderer.
 * @type {(boolean|undefined)}
 */
ng.HtmlCanvasConfig.prototype.throwOnUnsupported;

/**
 * Default invalidation scheduler for canvas-backed HTML layers.
 * @type {(string|undefined)}
 */
ng.HtmlCanvasConfig.prototype.defaultScheduler;

/**
 * Default canvas rendering target for directives that do not specify one.
 * @type {(string|undefined)}
 */
ng.HtmlCanvasConfig.prototype.defaultMode;

/**
 * Require an explicit browser/engine feature flag before activation. This stays strict by default while the browser API is experimental.
 * @type {(boolean|undefined)}
 */
ng.HtmlCanvasConfig.prototype.requireFlag;

/**
 * Public AngularTS HtmlCanvasRuntimeSupport contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.HtmlCanvasRuntimeSupport = function() {};

/**
 * Native layout-subtree support or an implied drawing primitive.
 * @type {boolean}
 */
ng.HtmlCanvasRuntimeSupport.prototype.layoutSubtree;

/**
 * Native canvas `paint` event support.
 * @type {boolean}
 */
ng.HtmlCanvasRuntimeSupport.prototype.paintEvent;

/**
 * Native canvas `requestPaint()` support.
 * @type {boolean}
 */
ng.HtmlCanvasRuntimeSupport.prototype.requestPaint;

/**
 * Native 2D `drawElementImage(...)` support.
 * @type {boolean}
 */
ng.HtmlCanvasRuntimeSupport.prototype.drawElementImage;

/**
 * Native WebGL `texElementImage2D(...)` support.
 * @type {boolean}
 */
ng.HtmlCanvasRuntimeSupport.prototype.texElementImage2D;

/**
 * Native WebGPU `copyElementImageToTexture(...)` support.
 * @type {boolean}
 */
ng.HtmlCanvasRuntimeSupport.prototype.copyElementImageToTexture;

/**
 * Supported rendering modes for the current runtime.
 * @type {!Object}
 */
ng.HtmlCanvasRuntimeSupport.prototype.modes;

/**
 * Whether any native HTML-in-Canvas rendering mode is available.
 * @type {boolean}
 */
ng.HtmlCanvasRuntimeSupport.prototype.supported;

/**
 * Public AngularTS HtmlCanvasService contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.HtmlCanvasService = function() {};

/**
 * Public HtmlCanvasService.config member exposed by the AngularTS namespace contract.
 * @type {!Object}
 */
ng.HtmlCanvasService.prototype.config;

/**
 * Public HtmlCanvasService.support member exposed by the AngularTS namespace contract.
 * @type {!ng.HtmlCanvasRuntimeSupport}
 */
ng.HtmlCanvasService.prototype.support;

/**
 * Public HtmlCanvasService.enabled member exposed by the AngularTS namespace contract.
 * @type {boolean}
 */
ng.HtmlCanvasService.prototype.enabled;

/**
 * Public HtmlCanvasService.supported member exposed by the AngularTS namespace contract.
 * @type {boolean}
 */
ng.HtmlCanvasService.prototype.supported;

/**
 * Public HtmlCanvasService.registerRoot member exposed by the AngularTS namespace contract.
 * @param {!Object} canvas
 * @param {(!Object|undefined)} options
 * @return {!Object}
 */
ng.HtmlCanvasService.prototype.registerRoot = function(canvas, options) {};

/**
 * Public HtmlCanvasService.registerSource member exposed by the AngularTS namespace contract.
 * @param {!Object} canvas
 * @param {!Element} source
 * @param {(!Object|undefined)} options
 * @return {function(): void}
 */
ng.HtmlCanvasService.prototype.registerSource = function(canvas, source, options) {};

/**
 * Public HtmlCanvasService.invalidate member exposed by the AngularTS namespace contract.
 * @param {!Object} canvas
 * @return {void}
 */
ng.HtmlCanvasService.prototype.invalidate = function(canvas) {};

/**
 * Public HtmlCanvasService.requestPaint member exposed by the AngularTS namespace contract.
 * @param {!Object} canvas
 * @return {void}
 */
ng.HtmlCanvasService.prototype.requestPaint = function(canvas) {};

/**
 * Public AngularTS FilterFn contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {function(...?): ?}
 */
ng.FilterFn;

/**
 * Public AngularTS FilterFactory contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {(!Array<function(...?): function(...?): ?>|function(...?): function(...?): ?)}
 */
ng.FilterFactory;

/**
 * Public AngularTS FilterService contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {function(string): function(...?): ?}
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
 * Public AngularTS CurrencyFilterOptions contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.CurrencyFilterOptions = function() {};

/**
 * Function that serializes query params into a URL-encoded string.
 * @typedef {function((!Object<string, ?>|undefined)): string}
 */
ng.HttpParamSerializerService;

/**
 * Runtime `$http` service contract for full request configs, HTTP verb shortcuts, defaults, and pending request tracking.
 * @constructor
 */
ng.HttpService = function() {};

/**
 * Send a `GET` request.
 * @template T
 * @param {string} url
 * @param {(!ng.HttpRequestOptions|undefined)} config
 * @return {!Promise<!ng.HttpResponse<T>>}
 */
ng.HttpService.prototype.get = function(url, config) {};

/**
 * Send a `DELETE` request.
 * @template T
 * @param {string} url
 * @param {(!ng.HttpRequestOptions|undefined)} config
 * @return {!Promise<!ng.HttpResponse<T>>}
 */
ng.HttpService.prototype.delete = function(url, config) {};

/**
 * Send a `HEAD` request.
 * @template T
 * @param {string} url
 * @param {(!ng.HttpRequestOptions|undefined)} config
 * @return {!Promise<!ng.HttpResponse<T>>}
 */
ng.HttpService.prototype.head = function(url, config) {};

/**
 * Send a `POST` request with a request body.
 * @template T
 * @param {string} url
 * @param {?} data
 * @param {(!ng.HttpRequestOptions|undefined)} config
 * @return {!Promise<!ng.HttpResponse<T>>}
 */
ng.HttpService.prototype.post = function(url, data, config) {};

/**
 * Send a `PUT` request with a request body.
 * @template T
 * @param {string} url
 * @param {?} data
 * @param {(!ng.HttpRequestOptions|undefined)} config
 * @return {!Promise<!ng.HttpResponse<T>>}
 */
ng.HttpService.prototype.put = function(url, data, config) {};

/**
 * Send a `PATCH` request with a request body.
 * @template T
 * @param {string} url
 * @param {?} data
 * @param {(!ng.HttpRequestOptions|undefined)} config
 * @return {!Promise<!ng.HttpResponse<T>>}
 */
ng.HttpService.prototype.patch = function(url, data, config) {};

/**
 * Live runtime defaults initialized from app-level `$http` configuration.
 * @type {!ng.HttpDefaults}
 */
ng.HttpService.prototype.defaults;

/**
 * Requests currently in flight.
 * @type {!Array<!ng.HttpRequestConfig>}
 */
ng.HttpService.prototype.pendingRequests;

/**
 * Invokes the callable HttpService contract.
 * @template T
 * @param {!ng.HttpRequestConfig} config
 * @return {!Promise<!ng.HttpResponse<T>>}
 */
ng.HttpService.prototype.call = function(config) {};

/**
 * Public AngularTS InjectorService contract exposed through the global ng namespace for Closure-annotated applications.
 * @template TCustomServices
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
 * Get a service by name.
 * @template TKey
 * @param {TKey} serviceName
 * @return {?}
 */
ng.InjectorService.prototype.get = function(serviceName) {};

/**
 * Invoke a function with optional context and locals.
 * @template TResult
 * @param {(!Array<function(...?): TResult>|function(...?): TResult)} fn
 * @param {(?|undefined)} self
 * @param {(?|undefined)} locals
 * @param {(string|undefined)} serviceName
 * @return {TResult}
 */
ng.InjectorService.prototype.invoke = function(fn, self, locals, serviceName) {};

/**
 * Instantiate a type constructor with optional locals.
 * @template TInstance
 * @param {(!Array<TInstance>|function(new: TInstance, ...?))} type
 * @param {(?|undefined)} locals
 * @param {(string|undefined)} serviceName
 * @return {TInstance}
 */
ng.InjectorService.prototype.instantiate = function(type, locals, serviceName) {};

/**
 * Public injectable contracts keyed by their canonical runtime token. Every single-dollar token exposed by [[PublicInjectionTokens]] must map to a named, documented contract here. Double-dollar framework internals are intentionally excluded.
 * @record
 */
ng.InjectionTokenMap = function() {};

/**
 * Public InjectionTokenMap.$angular member exposed by the AngularTS namespace contract.
 * @type {!ng.Angular}
 */
ng.InjectionTokenMap.prototype.$angular;

/**
 * Public InjectionTokenMap.$scope member exposed by the AngularTS namespace contract.
 * @type {!ng.Scope}
 */
ng.InjectionTokenMap.prototype.$scope;

/**
 * Public InjectionTokenMap.$element member exposed by the AngularTS namespace contract.
 * @type {!Element}
 */
ng.InjectionTokenMap.prototype.$element;

/**
 * Public InjectionTokenMap.$anchorScroll member exposed by the AngularTS namespace contract.
 * @param {(!HTMLElement|number|string|undefined)} hashOrElement
 * @return {void}
 */
ng.InjectionTokenMap.prototype.$anchorScroll = function(hashOrElement) {};

/**
 * Public InjectionTokenMap.$animate member exposed by the AngularTS namespace contract.
 * @type {!ng.AnimateService}
 */
ng.InjectionTokenMap.prototype.$animate;

/**
 * Public InjectionTokenMap.$aria member exposed by the AngularTS namespace contract.
 * @type {!ng.AriaService}
 */
ng.InjectionTokenMap.prototype.$aria;

/**
 * Public InjectionTokenMap.$compile member exposed by the AngularTS namespace contract.
 * @param {(!Element|!Node|!Object|null|string)} compileNode
 * @param {(!ng.LinkFn|!ng.TranscludeFn|null|undefined)} transcludeFn
 * @param {(number|undefined)} maxPriority
 * @param {(string|undefined)} ignoreDirective
 * @param {(!Object|null|undefined)} previousCompileContext
 * @return {!ng.LinkFn}
 */
ng.InjectionTokenMap.prototype.$compile = function(compileNode, transcludeFn, maxPriority, ignoreDirective, previousCompileContext) {};

/**
 * Public InjectionTokenMap.$controller member exposed by the AngularTS namespace contract.
 * @param {(!Array<(function(...?): !Object|function(...?): (!Object|undefined))>|function(...?): (!Object|undefined)|function(new: Object, ...?)|string)} expression
 * @param {(!Object|undefined)} locals
 * @param {(boolean|undefined)} later
 * @param {(string|undefined)} ident
 * @return {?}
 */
ng.InjectionTokenMap.prototype.$controller = function(expression, locals, later, ident) {};

/**
 * Public InjectionTokenMap.$cookie member exposed by the AngularTS namespace contract.
 * @type {!ng.CookieService}
 */
ng.InjectionTokenMap.prototype.$cookie;

/**
 * Public InjectionTokenMap.$document member exposed by the AngularTS namespace contract.
 * @type {!Document}
 */
ng.InjectionTokenMap.prototype.$document;

/**
 * Public InjectionTokenMap.$eventBus member exposed by the AngularTS namespace contract.
 * @type {!ng.EventBusService}
 */
ng.InjectionTokenMap.prototype.$eventBus;

/**
 * Public InjectionTokenMap.$exceptionHandler member exposed by the AngularTS namespace contract.
 * @param {?} exception
 * @return {?}
 */
ng.InjectionTokenMap.prototype.$exceptionHandler = function(exception) {};

/**
 * Public InjectionTokenMap.$filter member exposed by the AngularTS namespace contract.
 * @param {string} name
 * @return {function(...?): ?}
 */
ng.InjectionTokenMap.prototype.$filter = function(name) {};

/**
 * Public InjectionTokenMap.$htmlCanvas member exposed by the AngularTS namespace contract.
 * @type {!ng.HtmlCanvasService}
 */
ng.InjectionTokenMap.prototype.$htmlCanvas;

/**
 * Public InjectionTokenMap.$http member exposed by the AngularTS namespace contract.
 * @template T
 * @param {!ng.HttpRequestConfig} config
 * @return {!Promise<!ng.HttpResponse<T>>}
 */
ng.InjectionTokenMap.prototype.$http = function(config) {};

/**
 * Public InjectionTokenMap.$httpParamSerializer member exposed by the AngularTS namespace contract.
 * @param {(!Object<string, ?>|undefined)} params
 * @return {string}
 */
ng.InjectionTokenMap.prototype.$httpParamSerializer = function(params) {};

/**
 * Public InjectionTokenMap.$injector member exposed by the AngularTS namespace contract.
 * @type {!ng.InjectorService<?>}
 */
ng.InjectionTokenMap.prototype.$injector;

/**
 * Public InjectionTokenMap.$interpolate member exposed by the AngularTS namespace contract.
 * @param {string} text
 * @param {(boolean|undefined)} mustHaveExpression
 * @param {(string|undefined)} trustedContext
 * @param {(boolean|undefined)} allOrNothing
 * @return {(!ng.InterpolationFunction|undefined)}
 */
ng.InjectionTokenMap.prototype.$interpolate = function(text, mustHaveExpression, trustedContext, allOrNothing) {};

/**
 * Public InjectionTokenMap.$location member exposed by the AngularTS namespace contract.
 * @type {!ng.LocationService}
 */
ng.InjectionTokenMap.prototype.$location;

/**
 * Public InjectionTokenMap.$log member exposed by the AngularTS namespace contract.
 * @type {!ng.LogService}
 */
ng.InjectionTokenMap.prototype.$log;

/**
 * Public InjectionTokenMap.$machine member exposed by the AngularTS namespace contract.
 * @template TData, TStates
 * @param {!Object} config
 * @return {!ng.Machine<!Object>}
 */
ng.InjectionTokenMap.prototype.$machine = function(config) {};

/**
 * Public InjectionTokenMap.$parse member exposed by the AngularTS namespace contract.
 * @param {string} expression
 * @param {(function(?): ?|undefined)} interceptorFn
 * @return {!Object}
 */
ng.InjectionTokenMap.prototype.$parse = function(expression, interceptorFn) {};

/**
 * Public InjectionTokenMap.$rest member exposed by the AngularTS namespace contract.
 * @template T, ID
 * @param {string} baseUrl
 * @param {(function(new: T, ?)|undefined)} entityClass
 * @param {(!ng.RestOptions|undefined)} options
 * @return {!ng.RestService<T, ID>}
 */
ng.InjectionTokenMap.prototype.$rest = function(baseUrl, entityClass, options) {};

/**
 * Public InjectionTokenMap.$rootElement member exposed by the AngularTS namespace contract.
 * @type {!HTMLElement}
 */
ng.InjectionTokenMap.prototype.$rootElement;

/**
 * Public InjectionTokenMap.$rootScope member exposed by the AngularTS namespace contract.
 * @type {!ng.Scope}
 */
ng.InjectionTokenMap.prototype.$rootScope;

/**
 * Public InjectionTokenMap.$sce member exposed by the AngularTS namespace contract.
 * @type {!ng.SceService}
 */
ng.InjectionTokenMap.prototype.$sce;

/**
 * Public InjectionTokenMap.$sceDelegate member exposed by the AngularTS namespace contract.
 * @type {!ng.SceDelegateService}
 */
ng.InjectionTokenMap.prototype.$sceDelegate;

/**
 * Public InjectionTokenMap.$security member exposed by the AngularTS namespace contract.
 * @type {!ng.SecurityPolicy}
 */
ng.InjectionTokenMap.prototype.$security;

/**
 * Public InjectionTokenMap.$serviceWorker member exposed by the AngularTS namespace contract.
 * @type {!ng.ServiceWorkerService}
 */
ng.InjectionTokenMap.prototype.$serviceWorker;

/**
 * Public InjectionTokenMap.$sse member exposed by the AngularTS namespace contract.
 * @param {string} url
 * @param {(!ng.SseConfig|undefined)} config
 * @return {!ng.SseConnection}
 */
ng.InjectionTokenMap.prototype.$sse = function(url, config) {};

/**
 * Public InjectionTokenMap.$state member exposed by the AngularTS namespace contract.
 * @type {!Object}
 */
ng.InjectionTokenMap.prototype.$state;

/**
 * Public InjectionTokenMap.$stateRegistry member exposed by the AngularTS namespace contract.
 * @type {!ng.StateRegistryService}
 */
ng.InjectionTokenMap.prototype.$stateRegistry;

/**
 * Public InjectionTokenMap.$stream member exposed by the AngularTS namespace contract.
 * @type {!ng.StreamService}
 */
ng.InjectionTokenMap.prototype.$stream;

/**
 * Public InjectionTokenMap.$templateCache member exposed by the AngularTS namespace contract.
 * @type {!Map<string, string>}
 */
ng.InjectionTokenMap.prototype.$templateCache;

/**
 * Public InjectionTokenMap.$templateRequest member exposed by the AngularTS namespace contract.
 * @param {string} templateUrl
 * @return {!Promise<string>}
 */
ng.InjectionTokenMap.prototype.$templateRequest = function(templateUrl) {};

/**
 * Public InjectionTokenMap.$transitions member exposed by the AngularTS namespace contract.
 * @type {!Object}
 */
ng.InjectionTokenMap.prototype.$transitions;

/**
 * Public InjectionTokenMap.$wasm member exposed by the AngularTS namespace contract.
 * @type {!ng.WasmService}
 */
ng.InjectionTokenMap.prototype.$wasm;

/**
 * Public InjectionTokenMap.$webComponent member exposed by the AngularTS namespace contract.
 * @type {!ng.WebComponentService}
 */
ng.InjectionTokenMap.prototype.$webComponent;

/**
 * Public InjectionTokenMap.$websocket member exposed by the AngularTS namespace contract.
 * @param {string} url
 * @param {(!ng.WebSocketConfig|undefined)} config
 * @return {!ng.WebSocketConnection}
 */
ng.InjectionTokenMap.prototype.$websocket = function(url, config) {};

/**
 * Public InjectionTokenMap.$webTransport member exposed by the AngularTS namespace contract.
 * @param {string} url
 * @param {(!ng.WebTransportConfig|undefined)} config
 * @return {!ng.WebTransportConnection}
 */
ng.InjectionTokenMap.prototype.$webTransport = function(url, config) {};

/**
 * Public InjectionTokenMap.$window member exposed by the AngularTS namespace contract.
 * @type {!Window}
 */
ng.InjectionTokenMap.prototype.$window;

/**
 * Public InjectionTokenMap.$workflow member exposed by the AngularTS namespace contract.
 * @template TContract
 * @param {!Object} config
 * @return {!ng.Workflow<TContract>}
 */
ng.InjectionTokenMap.prototype.$workflow = function(config) {};

/**
 * Public InjectionTokenMap.$worker member exposed by the AngularTS namespace contract.
 * @template TSend, TReceive
 * @param {(!Object|string)} scriptPath
 * @param {(!Object|undefined)} config
 * @return {!ng.WorkerHandle<TSend, TReceive>}
 */
ng.InjectionTokenMap.prototype.$worker = function(scriptPath, config) {};

/**
 * Public AngularTS Model contract exposed through the global ng namespace for Closure-annotated applications.
 * @template T
 * @record
 */
ng.Model = function() {};

/**
 * Public Model.$proxy member exposed by the AngularTS namespace contract.
 * @type {!ng.Scope}
 */
ng.Model.prototype.$proxy;

/**
 * Public Model.$handler member exposed by the AngularTS namespace contract.
 * @type {?}
 */
ng.Model.prototype.$handler;

/**
 * Public Model.$target member exposed by the AngularTS namespace contract.
 * @type {!Object}
 */
ng.Model.prototype.$target;

/**
 * Public Model.$id member exposed by the AngularTS namespace contract.
 * @type {number}
 */
ng.Model.prototype.$id;

/**
 * Public Model.$root member exposed by the AngularTS namespace contract.
 * @type {!ng.Scope}
 */
ng.Model.prototype.$root;

/**
 * Public Model.$parent member exposed by the AngularTS namespace contract.
 * @type {(!ng.Scope|undefined)}
 */
ng.Model.prototype.$parent;

/**
 * Public Model.$scopename member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.Model.prototype.$scopename;

/**
 * Intercepts and handles property assignments on the target object. Scopeable objects are stored as raw model values and proxied lazily when read.
 * @param {!Object} target
 * @param {string} property
 * @param {?} value
 * @param {!ng.Scope} proxy
 * @return {boolean}
 */
ng.Model.prototype.set = function(target, property, value, proxy) {};

/**
 * Intercepts property access on the target object. It checks for specific properties (`watch` and `sync`) and binds their methods. For other properties, it returns the value directly.
 * @param {!Object} target
 * @param {(number|string|symbol)} property
 * @param {!ng.Scope} proxy
 * @return {?}
 */
ng.Model.prototype.get = function(target, property, proxy) {};

/**
 * Public Model.deleteProperty member exposed by the AngularTS namespace contract.
 * @param {!Object} target
 * @param {(number|string|symbol)} property
 * @return {boolean}
 */
ng.Model.prototype.deleteProperty = function(target, property) {};

/**
 * Runs synchronous scope mutations as one batch. Listener notifications are queued while the callback runs and flushed once after the outermost batch exits. Mutations are not rolled back if the callback throws.
 * @template T
 * @param {function(): T} fn
 * @return {T}
 */
ng.Model.prototype.$batch = function(fn) {};

/**
 * Registers a watcher for a property along with a listener function. The listener function is invoked when changes to that property are detected.
 * @param {string} watchProp
 * @param {(function((?|undefined), (?|undefined)): void|undefined)} listenerFn
 * @param {(boolean|undefined)} lazy
 * @return {(function(): void|undefined)}
 */
ng.Model.prototype.$watch = function(watchProp, listenerFn, lazy) {};

/**
 * Creates a prototypically inherited child scope.
 * @param {(!ng.Scope|undefined)} childInstance
 * @return {!ng.Scope}
 */
ng.Model.prototype.$new = function(childInstance) {};

/**
 * Creates an isolate child scope that does not inherit watchable properties directly.
 * @param {(!ng.Scope|undefined)} instance
 * @return {!ng.Scope}
 */
ng.Model.prototype.$newIsolate = function(instance) {};

/**
 * Creates a transcluded child scope linked to this scope and an optional parent instance.
 * @param {(!ng.Scope|undefined)} parentInstance
 * @return {!ng.Scope}
 */
ng.Model.prototype.$transcluded = function(parentInstance) {};

/**
 * Merges enumerable properties from the provided object into the current scope target.
 * @param {?} newTarget
 * @return {void}
 */
ng.Model.prototype.$merge = function(newTarget) {};

/**
 * Registers an event listener on this scope and returns a deregistration function.
 * @param {string} name
 * @param {function(...?): ?} listener
 * @return {function(): void}
 */
ng.Model.prototype.$on = function(name, listener) {};

/**
 * Emits an event upward through the scope hierarchy.
 * @param {string} name
 * @param {...?} var_args
 * @return {!ng.ScopeEvent}
 */
ng.Model.prototype.$emit = function(name, var_args) {};

/**
 * Broadcasts an event downward through the scope hierarchy.
 * @param {string} name
 * @param {...?} var_args
 * @return {!ng.ScopeEvent}
 */
ng.Model.prototype.$broadcast = function(name, var_args) {};

/**
 * Public Model.$destroy member exposed by the AngularTS namespace contract.
 * @return {void}
 */
ng.Model.prototype.$destroy = function() {};

/**
 * Searches this scope tree for a scope with the given id.
 * @param {(number|string)} id
 * @return {(!ng.Scope|undefined)}
 */
ng.Model.prototype.$getById = function(id) {};

/**
 * Searches the scope tree for a scope registered under the provided name.
 * @param {string} name
 * @return {(!ng.Scope|undefined)}
 */
ng.Model.prototype.$searchByName = function(name) {};

/**
 * Public Model.$snapshot member exposed by the AngularTS namespace contract.
 * @return {T}
 */
ng.Model.prototype.$snapshot = function() {};

/**
 * Public Model.$restore member exposed by the AngularTS namespace contract.
 * @param {T} snapshot
 * @param {(!ng.ModelRestoreOptions|undefined)} options
 * @return {void}
 */
ng.Model.prototype.$restore = function(snapshot, options) {};

/**
 * Public Model.$sync member exposed by the AngularTS namespace contract.
 * @param {(!Array<function(...?): !ng.ModelSyncTarget<T>>|!ng.ModelSyncTarget<T>|function(...?): !ng.ModelSyncTarget<T>)} target
 * @param {(!ng.ModelSyncOptions|undefined)} options
 * @return {function(): void}
 */
ng.Model.prototype.$sync = function(target, options) {};

/**
 * Public AngularTS ModelChange contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.ModelChange = function() {};

/**
 * Public ModelChange.origin member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.ModelChange.prototype.origin;

/**
 * Public ModelChange.keys member exposed by the AngularTS namespace contract.
 * @type {!Array<string>}
 */
ng.ModelChange.prototype.keys;

/**
 * Public ModelChange.snapshotVersion member exposed by the AngularTS namespace contract.
 * @type {number}
 */
ng.ModelChange.prototype.snapshotVersion;

/**
 * Public AngularTS ModelRestoreOptions contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.ModelRestoreOptions = function() {};

/**
 * Public ModelRestoreOptions.origin member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.ModelRestoreOptions.prototype.origin;

/**
 * Public ModelRestoreOptions.mode member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.ModelRestoreOptions.prototype.mode;

/**
 * Public AngularTS ModelSyncFailureMode contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {string}
 */
ng.ModelSyncFailureMode;

/**
 * Public AngularTS ModelSyncOptions contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.ModelSyncOptions = function() {};

/**
 * Public ModelSyncOptions.failure member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.ModelSyncOptions.prototype.failure;

/**
 * Public AngularTS ModelSyncTarget contract exposed through the global ng namespace for Closure-annotated applications.
 * @template T
 * @record
 */
ng.ModelSyncTarget = function() {};

/**
 * Public ModelSyncTarget.restore member exposed by the AngularTS namespace contract.
 * @type {(function(): (!Promise<(T|null|undefined)>|T|null|undefined)|undefined)}
 */
ng.ModelSyncTarget.prototype.restore;

/**
 * Public ModelSyncTarget.write member exposed by the AngularTS namespace contract.
 * @type {(function(T, !ng.ModelChange): (!Promise<void>|void)|undefined)}
 */
ng.ModelSyncTarget.prototype.write;

/**
 * Public ModelSyncTarget.receive member exposed by the AngularTS namespace contract.
 * @type {(function(function(T, (!ng.ModelRestoreOptions|undefined)): void): (function(): void|undefined)|undefined)}
 */
ng.ModelSyncTarget.prototype.receive;

/**
 * Public ModelSyncTarget.dispose member exposed by the AngularTS namespace contract.
 * @type {(function(): void|undefined)}
 */
ng.ModelSyncTarget.prototype.dispose;

/**
 * Public AngularTS InterpolateService contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.InterpolateService = function() {};

/**
 * Return the configured interpolation end delimiter.
 * @return {string}
 */
ng.InterpolateService.prototype.endSymbol = function() {};

/**
 * Return the configured interpolation start delimiter.
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
 * Declarative remote logging configuration for `navigator.sendBeacon()`.
 * @record
 */
ng.LogBeaconConfig = function() {};

/**
 * Action taken when serialization or Beacon queueing fails.
 * @type {(string|undefined)}
 */
ng.LogBeaconConfig.prototype.failure;

/**
 * Levels delivered remotely. Defaults to `error` only.
 * @type {(!Array<string>|undefined)}
 */
ng.LogBeaconConfig.prototype.levels;

/**
 * Name of an injectable {@link LogBeaconSerializer}.
 * @type {(string|undefined)}
 */
ng.LogBeaconConfig.prototype.serializer;

/**
 * Beacon endpoint URL.
 * @type {string}
 */
ng.LogBeaconConfig.prototype.url;

/**
 * Converts a structured log entry into a Beacon-compatible request body.
 * @typedef {function(!ng.LogEntry): (!Object|string)}
 */
ng.LogBeaconSerializer;

/**
 * Structured record passed to a configured Beacon serializer.
 * @record
 */
ng.LogEntry = function() {};

/**
 * Arguments originally passed to the logging method.
 * @type {!Array<?>}
 */
ng.LogEntry.prototype.args;

/**
 * Logging method that produced this entry.
 * @type {string}
 */
ng.LogEntry.prototype.level;

/**
 * ISO-8601 timestamp captured when the logging method was called.
 * @type {string}
 */
ng.LogEntry.prototype.timestamp;

/**
 * Logging severity attached to a structured remote log entry.
 * @typedef {string}
 */
ng.LogLevel;

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
 * Public AngularTS MachineService contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {function(!Object): !ng.Machine<!Object>}
 */
ng.MachineService;

/**
 * Public AngularTS WorkflowService contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {function(!Object): !ng.Workflow<?>}
 */
ng.WorkflowService;

/**
 * Parses a string or expression function into a compiled expression.
 * @typedef {function(string, (function(?): ?|undefined)): !Object}
 */
ng.ParseService;

/**
 * Public AngularTS Policy contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {function(?): ?}
 */
ng.Policy;

/**
 * Public AngularTS PolicyContext contract exposed through the global ng namespace for Closure-annotated applications.
 * @template TOperation
 * @record
 */
ng.PolicyContext = function() {};

/**
 * Public PolicyContext.operation member exposed by the AngularTS namespace contract.
 * @type {TOperation}
 */
ng.PolicyContext.prototype.operation;

/**
 * Public PolicyContext.meta member exposed by the AngularTS namespace contract.
 * @type {(!Object<string, ?>|undefined)}
 */
ng.PolicyContext.prototype.meta;

/**
 * Public AngularTS PolicyDecision contract exposed through the global ng namespace for Closure-annotated applications.
 * @template TType
 * @record
 */
ng.PolicyDecision = function() {};

/**
 * Public PolicyDecision.type member exposed by the AngularTS namespace contract.
 * @type {TType}
 */
ng.PolicyDecision.prototype.type;

/**
 * Public PolicyDecision.reason member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.PolicyDecision.prototype.reason;

/**
 * Public PolicyDecision.meta member exposed by the AngularTS namespace contract.
 * @type {(!Object<string, ?>|undefined)}
 */
ng.PolicyDecision.prototype.meta;

/**
 * Public AngularTS EventBusConfig contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.EventBusConfig = function() {};

/**
 * Public EventBusConfig.deliveryPolicy member exposed by the AngularTS namespace contract.
 * @type {(function(!ng.EventDeliveryPolicyContext): (!Promise<(!ng.PolicyDecision<string>|string)>|!ng.PolicyDecision<string>|string)|undefined)}
 */
ng.EventBusConfig.prototype.deliveryPolicy;

/**
 * Public AngularTS EventDeliveryPolicy contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {function(!ng.EventDeliveryPolicyContext): (!Promise<(!ng.PolicyDecision<string>|string)>|!ng.PolicyDecision<string>|string)}
 */
ng.EventDeliveryPolicy;

/**
 * Public AngularTS EventDeliveryPolicyContext contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.EventDeliveryPolicyContext = function() {};

/**
 * Public EventDeliveryPolicyContext.topic member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.EventDeliveryPolicyContext.prototype.topic;

/**
 * Public EventDeliveryPolicyContext.args member exposed by the AngularTS namespace contract.
 * @type {!Array<?>}
 */
ng.EventDeliveryPolicyContext.prototype.args;

/**
 * Public EventDeliveryPolicyContext.listenerIndex member exposed by the AngularTS namespace contract.
 * @type {number}
 */
ng.EventDeliveryPolicyContext.prototype.listenerIndex;

/**
 * Public EventDeliveryPolicyContext.scopeOwned member exposed by the AngularTS namespace contract.
 * @type {boolean}
 */
ng.EventDeliveryPolicyContext.prototype.scopeOwned;

/**
 * Public EventDeliveryPolicyContext.targetAlive member exposed by the AngularTS namespace contract.
 * @type {boolean}
 */
ng.EventDeliveryPolicyContext.prototype.targetAlive;

/**
 * Public EventDeliveryPolicyContext.operation member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.EventDeliveryPolicyContext.prototype.operation;

/**
 * Public EventDeliveryPolicyContext.meta member exposed by the AngularTS namespace contract.
 * @type {(!Object<string, ?>|undefined)}
 */
ng.EventDeliveryPolicyContext.prototype.meta;

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
 * @return {!Object}
 */
ng.SceService.prototype.parse = function(type, expression) {};

/**
 * Public SceService.parseAsHtml member exposed by the AngularTS namespace contract.
 * @param {string} expression
 * @return {!Object}
 */
ng.SceService.prototype.parseAsHtml = function(expression) {};

/**
 * Public SceService.parseAsResourceUrl member exposed by the AngularTS namespace contract.
 * @param {string} expression
 * @return {!Object}
 */
ng.SceService.prototype.parseAsResourceUrl = function(expression) {};

/**
 * Public SceService.parseAsUrl member exposed by the AngularTS namespace contract.
 * @param {string} expression
 * @return {!Object}
 */
ng.SceService.prototype.parseAsUrl = function(expression) {};

/**
 * Public SceService.parseAsMediaUrl member exposed by the AngularTS namespace contract.
 * @param {string} expression
 * @return {!Object}
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
 * @type {(function(!Event): void|undefined)}
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
 * @type {(function(string): ?|undefined)}
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
ng.SseConnection.prototype.reconnect = function() {};

/**
 * Public AngularTS SecurityPolicy contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.SecurityPolicy = function() {};

/**
 * Public SecurityPolicy.check member exposed by the AngularTS namespace contract.
 * @param {!Object} context
 * @return {!Object}
 */
ng.SecurityPolicy.prototype.check = function(context) {};

/**
 * Public AngularTS SecurityConfig contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.SecurityConfig = function() {};

/**
 * Public SecurityConfig.fallback member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.SecurityConfig.prototype.fallback;

/**
 * HTTP origins explicitly permitted to carry credentials.
 * @type {(!Array<string>|undefined)}
 */
ng.SecurityConfig.prototype.allowInsecureOrigins;

/**
 * Public SecurityConfig.credentials member exposed by the AngularTS namespace contract.
 * @type {(!ng.SecurityCredentialsConfig|undefined)}
 */
ng.SecurityConfig.prototype.credentials;

/**
 * Public SecurityConfig.isAuthenticated member exposed by the AngularTS namespace contract.
 * @type {(boolean|function(!Object): (!Promise<boolean>|boolean)|undefined)}
 */
ng.SecurityConfig.prototype.isAuthenticated;

/**
 * Public SecurityConfig.permissions member exposed by the AngularTS namespace contract.
 * @type {(!Array<string>|function(string, !Object): (!Promise<boolean>|boolean)|undefined)}
 */
ng.SecurityConfig.prototype.permissions;

/**
 * Public AngularTS SecurityCredentialsConfig contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.SecurityCredentialsConfig = function() {};

/**
 * Public SecurityCredentialsConfig.bearer member exposed by the AngularTS namespace contract.
 * @type {(function(!Object): (null|string|undefined)|string|undefined)}
 */
ng.SecurityCredentialsConfig.prototype.bearer;

/**
 * Public SecurityCredentialsConfig.basic member exposed by the AngularTS namespace contract.
 * @type {(!Object|undefined)}
 */
ng.SecurityCredentialsConfig.prototype.basic;

/**
 * Public SecurityCredentialsConfig.cookie member exposed by the AngularTS namespace contract.
 * @type {(boolean|undefined)}
 */
ng.SecurityCredentialsConfig.prototype.cookie;

/**
 * Public SecurityCredentialsConfig.order member exposed by the AngularTS namespace contract.
 * @type {(!Array<string>|undefined)}
 */
ng.SecurityCredentialsConfig.prototype.order;

/**
 * Public `$stateRegistry` contract for dynamic route registration. Module-owned static routes should normally use [[NgModule.router]]. Use this service when routes must be added or removed at runtime.
 * @record
 */
ng.StateRegistryService = function() {};

/**
 * Public StateRegistryService.onStatesChanged member exposed by the AngularTS namespace contract.
 * @param {function(string, !Array<!ng.StateDeclaration>): void} listener
 * @return {function(): void}
 */
ng.StateRegistryService.prototype.onStatesChanged = function(listener) {};

/**
 * Public StateRegistryService.root member exposed by the AngularTS namespace contract.
 * @return {!ng.StateDeclaration}
 */
ng.StateRegistryService.prototype.root = function() {};

/**
 * Public StateRegistryService.register member exposed by the AngularTS namespace contract.
 * @param {!ng.StateDeclaration} stateDefinition
 * @return {!ng.StateDeclaration}
 */
ng.StateRegistryService.prototype.register = function(stateDefinition) {};

/**
 * Public StateRegistryService.deregister member exposed by the AngularTS namespace contract.
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
 * @return {!Array<!ng.StateDeclaration>}
 */
ng.StateRegistryService.prototype.get = function() {};

/**
 * Injectable service-worker lifecycle and messaging facade.
 * @record
 */
ng.ServiceWorkerService = function() {};

/**
 * Support flag for templates and guards.
 * @type {boolean}
 */
ng.ServiceWorkerService.prototype.supported;

/**
 * Template-facing lifecycle status for the latest service-worker operation.
 * @type {string}
 */
ng.ServiceWorkerService.prototype.status;

/**
 * Current native controller, if the page is controlled.
 * @type {(!Object|null)}
 */
ng.ServiceWorkerService.prototype.controller;

/**
 * Latest known native registration.
 * @type {(!Object|null)}
 */
ng.ServiceWorkerService.prototype.registration;

/**
 * Template-friendly registration snapshot.
 * @type {!ng.ServiceWorkerRegistrationState}
 */
ng.ServiceWorkerService.prototype.registrationState;

/**
 * Template-friendly update snapshot.
 * @type {!ng.ServiceWorkerUpdateState}
 */
ng.ServiceWorkerService.prototype.updateState;

/**
 * Register the configured script or an explicit script URL.
 * @param {(!Object|string|undefined)} scriptOrOptions
 * @param {(!Object|undefined)} options
 * @return {!Promise<!Object>}
 */
ng.ServiceWorkerService.prototype.register = function(scriptOrOptions, options) {};

/**
 * Resolve when the browser reports an active ready registration.
 * @return {!Promise<!Object>}
 */
ng.ServiceWorkerService.prototype.ready = function() {};

/**
 * Ask the latest known registration to check for an updated worker.
 * @return {!Promise<!Object>}
 */
ng.ServiceWorkerService.prototype.update = function() {};

/**
 * Unregister the latest known registration.
 * @return {!Promise<boolean>}
 */
ng.ServiceWorkerService.prototype.unregister = function() {};

/**
 * Send a message to the current controller or an explicit worker target.
 * @param {?} message
 * @param {(!ng.ServiceWorkerPostOptions|undefined)} options
 * @return {!Promise<void>}
 */
ng.ServiceWorkerService.prototype.post = function(message, options) {};

/**
 * Send a request through a dedicated `MessageChannel`.
 * @template TResponse
 * @param {?} message
 * @param {(!ng.ServiceWorkerRequestOptions|undefined)} options
 * @return {!Promise<TResponse>}
 */
ng.ServiceWorkerService.prototype.request = function(message, options) {};

/**
 * Subscribe to messages from the service worker container.
 * @template TData
 * @param {function(!ng.ServiceWorkerMessageEvent<TData>): void} callback
 * @return {function(): void}
 */
ng.ServiceWorkerService.prototype.onMessage = function(callback) {};

/**
 * Subscribe to controller-change notifications.
 * @param {function((!Object|null)): void} callback
 * @return {function(): void}
 */
ng.ServiceWorkerService.prototype.onControllerChange = function(callback) {};

/**
 * Subscribe to update-state notifications.
 * @param {function(!ng.ServiceWorkerUpdateState): void} callback
 * @return {function(): void}
 */
ng.ServiceWorkerService.prototype.onUpdate = function(callback) {};

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
 * Public AngularTS SwapMode contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {string}
 */
ng.SwapMode;

/**
 * Public contract implemented by the `$templateCache` injectable.
 * @typedef {!Map<string, string>}
 */
ng.TemplateCacheService;

/**
 * Downloads a template using $http and, upon success, stores the contents inside of $templateCache. If the HTTP request fails or the response data of the HTTP request is empty then a $compile error will be thrown (unless {ignoreRequestError} is set to true).
 * @typedef {function(string): !Promise<string>}
 */
ng.TemplateRequestService;

/**
 * This interface specifies the api for registering Transition Hooks. Both the [[TransitionService]] and also the [[Transition]] object itself implement this interface. Note: the Transition object only allows hooks to be registered before the Transition is started.
 * @record
 */
ng.TransitionsService = function() {};

/**
 * Registers a [[TransitionHookFn]], called *before a transition starts*. Registers a transition lifecycle hook, which is invoked before a transition even begins. This hook can be useful to implement logic which prevents a transition from even starting, such as authentication, redirection See [[TransitionHookFn]] for the signature of the function. The [[HookMatchCriteria]] is used to determine which Transitions the hook should be invoked for. To match all Transitions, use an empty criteria object `{}`. ### Lifecycle `onBefore` hooks are invoked *before a Transition starts*. No resolves have been fetched yet. Each `onBefore` hook is invoked synchronously, in the same call stack as [[StateService.transitionTo]]. The registered `onBefore` hooks are invoked in priority order. Note: during the `onBefore` phase, additional hooks can be added to the specific [[Transition]] instance. These "on-the-fly" hooks only affect the currently running transition.. ### Return value The hook's return value can be used to pause, cancel, or redirect the current Transition. See [[HookResult]] for more information. If any hook modifies the transition *synchronously* (by throwing, returning `false`, or returning a [[TargetState]]), the remainder of the hooks are skipped. If a hook returns a promise, the remainder of the `onBefore` hooks are still invoked synchronously. All promises are resolved, and processed asynchronously before the `onStart` phase of the Transition. ### Examples #### Default Substate This example redirects any transition from 'home' to 'home.dashboard'. This is commonly referred to as a "default substate".
 * @param {!Object<string, (boolean|function((!Object|undefined), (!ng.Transition<!Object<string, !Object>, !Object>|undefined)): boolean|string|undefined)>} matchCriteria
 * @param {function(!ng.Transition<!Object<string, !Object>, !Object>): (!Object|boolean|void)} callback
 * @param {(!Object|undefined)} options
 * @return {function(): void}
 */
ng.TransitionsService.prototype.onBefore = function(matchCriteria, callback, options) {};

/**
 * Registers a [[TransitionHookFn]], called when a transition starts. Registers a transition lifecycle hook, which is invoked as a transition starts running. This hook can be useful to perform some asynchronous action before completing a transition. See [[TransitionHookFn]] for the signature of the function. The [[HookMatchCriteria]] is used to determine which Transitions the hook should be invoked for. To match all Transitions, use an empty criteria object `{}`. ### Lifecycle `onStart` hooks are invoked asynchronously when the Transition starts running. This happens after the `onBefore` phase is complete. At this point, the Transition has not yet exited nor entered any states. The registered `onStart` hooks are invoked in priority order. Note: A built-in `onStart` hook with high priority is used to fetch any eager resolve data. ### Return value The hook's return value can be used to pause, cancel, or redirect the current Transition. See [[HookResult]] for more information. ### Example #### Load feature shell data during transition This example pauses transitions into a reporting branch while an application-level feature shell loads. Use state `resolve` for route data and `policy.navigation` for security; use transition hooks for advanced orchestration that intentionally spans multiple states. #### Example: ```js $transitions.onStart({ to: 'reports.**' }, function(trans) { var reportsShell = trans.injector().get('ReportsShell'); return reportsShell.ensureLoaded(); }); ```
 * @param {!Object<string, (boolean|function((!Object|undefined), (!ng.Transition<!Object<string, !Object>, !Object>|undefined)): boolean|string|undefined)>} matchCriteria
 * @param {function(!ng.Transition<!Object<string, !Object>, !Object>): (!Object|boolean|void)} callback
 * @param {(!Object|undefined)} options
 * @return {function(): void}
 */
ng.TransitionsService.prototype.onStart = function(matchCriteria, callback, options) {};

/**
 * Registers a [[TransitionStateHookFn]], called when a specific state is entered. Registers a lifecycle hook, which is invoked (during a transition) when a specific state is being entered. Since this hook is run only when the specific state is being *entered*, it can be useful for performing tasks when entering a submodule/feature area such as initializing a stateful service, or for guarding access to a submodule/feature area. See [[TransitionStateHookFn]] for the signature of the function. The [[HookMatchCriteria]] is used to determine which Transitions the hook should be invoked for. `onEnter` hooks generally specify `{ entering: 'somestate' }`. To match all Transitions, use an empty criteria object `{}`. ### Lifecycle `onEnter` hooks are invoked when the Transition is entering a state. States are entered after the `onRetain` phase is complete. If more than one state is being entered, the parent state is entered first. The registered `onEnter` hooks for a state are invoked in priority order. Note: A built-in `onEnter` hook with high priority is used to fetch lazy resolve data for states being entered. ### Return value The hook's return value can be used to pause, cancel, or redirect the current Transition. See [[HookResult]] for more information. ### Inside a state declaration Instead of registering `onEnter` hooks using the [[TransitionService]], you may define an `onEnter` hook directly on a state declaration (see: [[StateDeclaration.onEnter]]). ### Examples #### Audit Log This example uses a service to log that a user has entered the admin section of an app. This assumes that there are substates of the "admin" state, such as "admin.users", "admin.pages", etc.
 * @param {!Object<string, (boolean|function((!Object|undefined), (!ng.Transition<!Object<string, !Object>, !Object>|undefined)): boolean|string|undefined)>} matchCriteria
 * @param {function(!ng.Transition<!Object<string, !Object>, !Object>, !ng.StateDeclaration): (!Object|boolean|void)} callback
 * @param {(!Object|undefined)} options
 * @return {function(): void}
 */
ng.TransitionsService.prototype.onEnter = function(matchCriteria, callback, options) {};

/**
 * Registers a [[TransitionStateHookFn]], called when a specific state is retained/kept. Registers a lifecycle hook, which is invoked (during a transition) for a specific state that was previously active will remain active (is not being entered nor exited). This hook is invoked when a state is "retained" or "kept". It means the transition is coming *from* a substate of the retained state *to* a substate of the retained state. This hook can be used to perform actions when the user moves from one substate to another, such as between steps in a wizard. The [[HookMatchCriteria]] is used to determine which Transitions the hook should be invoked for. `onRetain` hooks generally specify `{ retained: 'somestate' }`. To match all Transitions, use an empty criteria object `{}`. ### Lifecycle `onRetain` hooks are invoked after any `onExit` hooks have been fired. If more than one state is retained, the child states' `onRetain` hooks are invoked first. The registered `onRetain` hooks for a state are invoked in priority order. ### Return value The hook's return value can be used to pause, cancel, or redirect the current Transition. See [[HookResult]] for more information. ### Inside a state declaration Instead of registering `onRetain` hooks using the [[TransitionService]], you may define an `onRetain` hook directly on a state declaration (see: [[StateDeclaration.onRetain]]).
 * @param {!Object<string, (boolean|function((!Object|undefined), (!ng.Transition<!Object<string, !Object>, !Object>|undefined)): boolean|string|undefined)>} matchCriteria
 * @param {function(!ng.Transition<!Object<string, !Object>, !Object>, !ng.StateDeclaration): (!Object|boolean|void)} callback
 * @param {(!Object|undefined)} options
 * @return {function(): void}
 */
ng.TransitionsService.prototype.onRetain = function(matchCriteria, callback, options) {};

/**
 * Registers a [[TransitionStateHookFn]], called when a specific state is exited. Registers a lifecycle hook, which is invoked (during a transition) when a specific state is being exited. Since this hook is run only when the specific state is being *exited*, it can be useful for performing tasks when leaving a submodule/feature area such as cleaning up a stateful service, or for preventing the user from leaving a state or submodule until some criteria is satisfied. See [[TransitionStateHookFn]] for the signature of the function. The [[HookMatchCriteria]] is used to determine which Transitions the hook should be invoked for. `onExit` hooks generally specify `{ exiting: 'somestate' }`. To match all Transitions, use an empty criteria object `{}`. ### Lifecycle `onExit` hooks are invoked when the Transition is exiting a state. States are exited after any `onStart` phase is complete. If more than one state is being exited, the child states are exited first. The registered `onExit` hooks for a state are invoked in priority order. ### Return value The hook's return value can be used to pause, cancel, or redirect the current Transition. See [[HookResult]] for more information. ### Inside a state declaration Instead of registering `onExit` hooks using the [[TransitionService]], you may define an `onExit` hook directly on a state declaration (see: [[StateDeclaration.onExit]]).
 * @param {!Object<string, (boolean|function((!Object|undefined), (!ng.Transition<!Object<string, !Object>, !Object>|undefined)): boolean|string|undefined)>} matchCriteria
 * @param {function(!ng.Transition<!Object<string, !Object>, !Object>, !ng.StateDeclaration): (!Object|boolean|void)} callback
 * @param {(!Object|undefined)} options
 * @return {function(): void}
 */
ng.TransitionsService.prototype.onExit = function(matchCriteria, callback, options) {};

/**
 * Registers a [[TransitionHookFn]], called *just before a transition finishes*. Registers a transition lifecycle hook, which is invoked just before a transition finishes. This hook is a last chance to cancel or redirect a transition. See [[TransitionHookFn]] for the signature of the function. The [[HookMatchCriteria]] is used to determine which Transitions the hook should be invoked for. To match all Transitions, use an empty criteria object `{}`. ### Lifecycle `onFinish` hooks are invoked after the `onEnter` phase is complete. These hooks are invoked just before the transition is "committed". Each hook is invoked in priority order. ### Return value The hook's return value can be used to pause, cancel, or redirect the current Transition. See [[HookResult]] for more information.
 * @param {!Object<string, (boolean|function((!Object|undefined), (!ng.Transition<!Object<string, !Object>, !Object>|undefined)): boolean|string|undefined)>} matchCriteria
 * @param {function(!ng.Transition<!Object<string, !Object>, !Object>): (!Object|boolean|void)} callback
 * @param {(!Object|undefined)} options
 * @return {function(): void}
 */
ng.TransitionsService.prototype.onFinish = function(matchCriteria, callback, options) {};

/**
 * Registers a [[TransitionHookFn]], called after a successful transition completed. Registers a transition lifecycle hook, which is invoked after a transition successfully completes. See [[TransitionHookFn]] for the signature of the function. The [[HookMatchCriteria]] is used to determine which Transitions the hook should be invoked for. To match all Transitions, use an empty criteria object `{}`. ### Lifecycle `onSuccess` hooks are chained off the Transition's promise (see [[Transition.promise]]). If the Transition is successful and its promise is resolved, then the `onSuccess` hooks are invoked. Since these hooks are run after the transition is over, their return value is ignored. The `onSuccess` hooks are invoked in priority order. ### Return value Since the Transition is already completed, the hook's return value is ignored
 * @param {!Object<string, (boolean|function((!Object|undefined), (!ng.Transition<!Object<string, !Object>, !Object>|undefined)): boolean|string|undefined)>} matchCriteria
 * @param {function(!ng.Transition<!Object<string, !Object>, !Object>): (!Object|boolean|void)} callback
 * @param {(!Object|undefined)} options
 * @return {function(): void}
 */
ng.TransitionsService.prototype.onSuccess = function(matchCriteria, callback, options) {};

/**
 * Registers a [[TransitionHookFn]], called after a transition has errored. Registers a transition lifecycle hook, which is invoked after a transition has been rejected for any reason. See [[TransitionHookFn]] for the signature of the function. The [[HookMatchCriteria]] is used to determine which Transitions the hook should be invoked for. To match all Transitions, use an empty criteria object `{}`. ### Lifecycle The `onError` hooks are chained off the Transition's promise (see [[Transition.promise]]). If a Transition fails, its promise is rejected and the `onError` hooks are invoked. The `onError` hooks are invoked in priority order. Since these hooks are run after the transition is over, their return value is ignored. A transition "errors" if it was started, but failed to complete (for any reason). A *non-exhaustive list* of reasons a transition can error: - A transition was cancelled because a new transition started while it was still running (`Transition superseded`) - A transition was cancelled by a Transition Hook returning false - A transition was redirected by a Transition Hook returning a [[TargetState]] - A Transition Hook or resolve function threw an error - A Transition Hook returned a rejected promise - A resolve function returned a rejected promise To check the failure reason, inspect the return value of [[Transition.error]]. Note: `onError` should be used for targeted error handling, or error recovery. For catch-all error reporting, configure `$router.error` or `$exceptionHandler`. ### Return value Since the Transition is already completed, the hook's return value is ignored
 * @param {!Object<string, (boolean|function((!Object|undefined), (!ng.Transition<!Object<string, !Object>, !Object>|undefined)): boolean|string|undefined)>} matchCriteria
 * @param {function(!ng.Transition<!Object<string, !Object>, !Object>): (!Object|boolean|void)} callback
 * @param {(!Object|undefined)} options
 * @return {function(): void}
 */
ng.TransitionsService.prototype.onError = function(matchCriteria, callback, options) {};

/**
 * Injectable factory for typed managed Web Worker connections.
 * @typedef {function((!Object|string), (!Object|undefined)): !ng.WorkerHandle<?, ?>}
 */
ng.WorkerService;

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
 * @type {(!Array<!Keyframe>|!Object<string, (!Array<(null|number)>|!Array<string>|null|number|string|undefined)>|function(!Element, !ng.AnimationContext, !ng.AnimationOptions): (!Animation|!Promise<void>|undefined)|undefined)}
 */
ng.AnimationPreset.prototype.enter;

/**
 * Public AnimationPreset.leave member exposed by the AngularTS namespace contract.
 * @type {(!Array<!Keyframe>|!Object<string, (!Array<(null|number)>|!Array<string>|null|number|string|undefined)>|function(!Element, !ng.AnimationContext, !ng.AnimationOptions): (!Animation|!Promise<void>|undefined)|undefined)}
 */
ng.AnimationPreset.prototype.leave;

/**
 * Public AnimationPreset.move member exposed by the AngularTS namespace contract.
 * @type {(!Array<!Keyframe>|!Object<string, (!Array<(null|number)>|!Array<string>|null|number|string|undefined)>|function(!Element, !ng.AnimationContext, !ng.AnimationOptions): (!Animation|!Promise<void>|undefined)|undefined)}
 */
ng.AnimationPreset.prototype.move;

/**
 * Public AnimationPreset.addClass member exposed by the AngularTS namespace contract.
 * @type {(!Array<!Keyframe>|!Object<string, (!Array<(null|number)>|!Array<string>|null|number|string|undefined)>|function(!Element, !ng.AnimationContext, !ng.AnimationOptions): (!Animation|!Promise<void>|undefined)|undefined)}
 */
ng.AnimationPreset.prototype.addClass;

/**
 * Public AnimationPreset.removeClass member exposed by the AngularTS namespace contract.
 * @type {(!Array<!Keyframe>|!Object<string, (!Array<(null|number)>|!Array<string>|null|number|string|undefined)>|function(!Element, !ng.AnimationContext, !ng.AnimationOptions): (!Animation|!Promise<void>|undefined)|undefined)}
 */
ng.AnimationPreset.prototype.removeClass;

/**
 * Public AnimationPreset.setClass member exposed by the AngularTS namespace contract.
 * @type {(!Array<!Keyframe>|!Object<string, (!Array<(null|number)>|!Array<string>|null|number|string|undefined)>|function(!Element, !ng.AnimationContext, !ng.AnimationOptions): (!Animation|!Promise<void>|undefined)|undefined)}
 */
ng.AnimationPreset.prototype.setClass;

/**
 * Public AnimationPreset.animate member exposed by the AngularTS namespace contract.
 * @type {(!Array<!Keyframe>|!Object<string, (!Array<(null|number)>|!Array<string>|null|number|string|undefined)>|function(!Element, !ng.AnimationContext, !ng.AnimationOptions): (!Animation|!Promise<void>|undefined)|undefined)}
 */
ng.AnimationPreset.prototype.animate;

/**
 * Public AnimationPreset.options member exposed by the AngularTS namespace contract.
 * @type {(!KeyframeAnimationOptions|undefined)}
 */
ng.AnimationPreset.prototype.options;

/**
 * Public AngularTS AnimationPresetHandler contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {function(!Element, !ng.AnimationContext, !ng.AnimationOptions): (!Animation|!Promise<void>|undefined)}
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
 * @type {!ng.InjectorService<?>}
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
 * Application module that registers the custom element.
 * @type {(!ng.AngularElementModuleOptions|undefined)}
 */
ng.AngularElementOptions.prototype.elementModule;

/**
 * App component definition passed to `$webComponent.defineAppComponent`.
 * @type {!ng.AppComponentOptions<T>}
 */
ng.AngularElementOptions.prototype.component;

/**
 * Treat this runtime as a sub-application of the current host runtime.
 * @type {(boolean|undefined)}
 */
ng.AngularElementOptions.prototype.subapp;

/**
 * Framework modules included by the composed `ng` module.
 * @type {(!Array<function(!Object): !ng.NgModule>|undefined)}
 */
ng.AngularElementOptions.prototype.modules;

/**
 * Name of the composed root module. Defaults to `ng`.
 * @type {(string|undefined)}
 */
ng.AngularElementOptions.prototype.name;

/**
 * Additional application modules required by the composed root module.
 * @type {(!Array<string>|undefined)}
 */
ng.AngularElementOptions.prototype.requires;

/**
 * Additional providers registered in the composed root module.
 * @type {(!Object<string, (function(...?): ?|function(new: ?, ...?))>|undefined)}
 */
ng.AngularElementOptions.prototype.providers;

/**
 * Services registered in the composed root module.
 * @type {(!Array<!Object<string, (!Array<function(...?): ?>|function(...?): ?)>>|!Object<string, (!Array<function(...?): ?>|function(...?): ?)>|undefined)}
 */
ng.AngularElementOptions.prototype.services;

/**
 * Filters registered in the composed root module.
 * @type {(!Array<!Object<string, (!Array<function(...?): function(...?): ?>|function(...?): function(...?): ?)>>|!Object<string, (!Array<function(...?): function(...?): ?>|function(...?): function(...?): ?)>|undefined)}
 */
ng.AngularElementOptions.prototype.filters;

/**
 * Directives registered in the composed root module.
 * @type {(!Array<!Object<string, (!Array<(function(...?): (!ng.Directive<?>|function(...?): void)|string)>|function(...?): (!ng.Directive<?>|function(...?): void))>>|!Object<string, (!Array<(function(...?): (!ng.Directive<?>|function(...?): void)|string)>|function(...?): (!ng.Directive<?>|function(...?): void))>|undefined)}
 */
ng.AngularElementOptions.prototype.directives;

/**
 * A controller constructor function used in AngularTS.
 * @typedef {(function(...?): (!Object|undefined)|function(new: Object, ...?))}
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
 * Default request settings configured through `app.config({ $http })` and exposed at runtime through `$http.defaults`. Not every `HttpRequestOptions` field is supported here; this shape only includes the fields that the runtime reads from provider-level defaults. https://docs.angularjs.org/api/ng/service/$http#defaults https://docs.angularjs.org/api/ng/service/$http#usage
 * @record
 */
ng.HttpDefaults = function() {};

/**
 * Cache used for cacheable requests. `true` enables the default cache.
 * @type {(!Object|boolean|undefined)}
 */
ng.HttpDefaults.prototype.cache;

/**
 * Request body transform pipeline.
 * @type {(!Array<function(?, function(): !Object<string, string>): ?>|function(?, function(): !Object<string, string>): ?|undefined)}
 */
ng.HttpDefaults.prototype.transformRequest;

/**
 * Response body transform pipeline.
 * @type {(!Array<function(?, function(): !Object<string, string>, number): ?>|function(?, function(): !Object<string, string>, number): ?|undefined)}
 */
ng.HttpDefaults.prototype.transformResponse;

/**
 * Default headers merged into each request.
 * @type {(!Object<string, (!Object<string, (boolean|function(!ng.HttpRequestConfig): ?|null|number|string|undefined)>|boolean|function(!ng.HttpRequestConfig): ?|null|number|string|undefined)>|undefined)}
 */
ng.HttpDefaults.prototype.headers;

/**
 * Header name used when sending the XSRF token.
 * @type {(string|undefined)}
 */
ng.HttpDefaults.prototype.xsrfHeaderName;

/**
 * Cookie name used when reading the XSRF token.
 * @type {(string|undefined)}
 */
ng.HttpDefaults.prototype.xsrfCookieName;

/**
 * Whether cross-site requests should include credentials by default.
 * @type {(boolean|undefined)}
 */
ng.HttpDefaults.prototype.withCredentials;

/**
 * Query parameter serializer token or function.
 * @type {(function(!Object<string, ?>): string|string|undefined)}
 */
ng.HttpDefaults.prototype.paramSerializer;

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
 * @type {!ng.HttpRequestConfig}
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
 * A user-defined service recipe accepted by {@link ng.NgModule.provider}. Object recipes define an injectable `$get` factory directly. Injectable functions and classes are instantiated first and must produce an object with an injectable `$get` factory.
 * @typedef {(!Array<function(...?): ?>|!Object|function(...?): ?|function(new: ?, ...?))}
 */
ng.ProviderDefinition;

/**
 * Public AngularTS InterpolationFunction contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.InterpolationFunction = function() {};

/**
 * Expressions extracted from the interpolation text.
 * @type {!Array<string>}
 */
ng.InterpolationFunction.prototype.expressions;

/**
 * Original interpolation text.
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
 * Public AngularTS ListenerFn contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {function((?|undefined), (?|undefined)): void}
 */
ng.ListenerFn;

/**
 * Public AngularTS Machine contract exposed through the global ng namespace for Closure-annotated applications.
 * @template TContract
 * @record
 */
ng.Machine = function() {};

/**
 * Public Machine.state member exposed by the AngularTS namespace contract.
 * @type {?}
 */
ng.Machine.prototype.state;

/**
 * Public Machine.data member exposed by the AngularTS namespace contract.
 * @type {?}
 */
ng.Machine.prototype.data;

/**
 * Public Machine.send member exposed by the AngularTS namespace contract.
 * @template TType
 * @param {TType} type
 * @param {...?} var_args
 * @return {!Object}
 */
ng.Machine.prototype.send = function(type, var_args) {};

/**
 * Public Machine.can member exposed by the AngularTS namespace contract.
 * @template TType
 * @param {TType} type
 * @param {...?} var_args
 * @return {boolean}
 */
ng.Machine.prototype.can = function(type, var_args) {};

/**
 * Public Machine.matches member exposed by the AngularTS namespace contract.
 * @param {?} state
 * @return {boolean}
 */
ng.Machine.prototype.matches = function(state) {};

/**
 * Public Machine.snapshot member exposed by the AngularTS namespace contract.
 * @return {!ng.MachineSnapshot<TContract>}
 */
ng.Machine.prototype.snapshot = function() {};

/**
 * Public Machine.restore member exposed by the AngularTS namespace contract.
 * @param {?} snapshot
 * @return {void}
 */
ng.Machine.prototype.restore = function(snapshot) {};

/**
 * Labeled type contract carried by a machine definition and instance.
 * @record
 */
ng.MachineContract = function() {};

/**
 * Public MachineContract.data member exposed by the AngularTS namespace contract.
 * @type {?}
 */
ng.MachineContract.prototype.data;

/**
 * Public MachineContract.events member exposed by the AngularTS namespace contract.
 * @type {?}
 */
ng.MachineContract.prototype.events;

/**
 * Public MachineContract.state member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.MachineContract.prototype.state;

/**
 * Public AngularTS MachineConfig contract exposed through the global ng namespace for Closure-annotated applications.
 * @template TContract
 * @record
 */
ng.MachineConfig = function() {};

/**
 * Public MachineConfig.id member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.MachineConfig.prototype.id;

/**
 * Public MachineConfig.initial member exposed by the AngularTS namespace contract.
 * @type {?}
 */
ng.MachineConfig.prototype.initial;

/**
 * Public MachineConfig.states member exposed by the AngularTS namespace contract.
 * @type {!Object}
 */
ng.MachineConfig.prototype.states;

/**
 * Public MachineConfig.hooks member exposed by the AngularTS namespace contract.
 * @type {(!Object|undefined)}
 */
ng.MachineConfig.prototype.hooks;

/**
 * Public MachineConfig.policy member exposed by the AngularTS namespace contract.
 * @type {(function(?): (!ng.PolicyDecision<string>|string)|undefined)}
 */
ng.MachineConfig.prototype.policy;

/**
 * Public MachineConfig.meta member exposed by the AngularTS namespace contract.
 * @type {(!Object<string, ?>|undefined)}
 */
ng.MachineConfig.prototype.meta;

/**
 * Public MachineConfig.data member exposed by the AngularTS namespace contract.
 * @type {(?|undefined)}
 */
ng.MachineConfig.prototype.data;

/**
 * Public AngularTS MachineSnapshot contract exposed through the global ng namespace for Closure-annotated applications.
 * @template TContract
 * @record
 */
ng.MachineSnapshot = function() {};

/**
 * Public MachineSnapshot.state member exposed by the AngularTS namespace contract.
 * @type {?}
 */
ng.MachineSnapshot.prototype.state;

/**
 * Public MachineSnapshot.data member exposed by the AngularTS namespace contract.
 * @type {?}
 */
ng.MachineSnapshot.prototype.data;

/**
 * Public AngularTS MachineSendResult contract exposed through the global ng namespace for Closure-annotated applications.
 * @template TMode
 * @record
 */
ng.MachineSendResult = function() {};

/**
 * Public MachineSendResult.type member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.MachineSendResult.prototype.type;

/**
 * Public MachineSendResult.from member exposed by the AngularTS namespace contract.
 * @type {TMode}
 */
ng.MachineSendResult.prototype.from;

/**
 * Public MachineSendResult.to member exposed by the AngularTS namespace contract.
 * @type {TMode}
 */
ng.MachineSendResult.prototype.to;

/**
 * Public MachineSendResult.ok member exposed by the AngularTS namespace contract.
 * @type {boolean}
 */
ng.MachineSendResult.prototype.ok;

/**
 * Public MachineSendResult.status member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.MachineSendResult.prototype.status;

/**
 * Public AngularTS MachineSendStatus contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {string}
 */
ng.MachineSendStatus;

/**
 * Public AngularTS Workflow contract exposed through the global ng namespace for Closure-annotated applications.
 * @template TContract
 * @record
 */
ng.Workflow = function() {};

/**
 * Public Workflow.id member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.Workflow.prototype.id;

/**
 * Public Workflow.state member exposed by the AngularTS namespace contract.
 * @type {?}
 */
ng.Workflow.prototype.state;

/**
 * Public Workflow.data member exposed by the AngularTS namespace contract.
 * @type {?}
 */
ng.Workflow.prototype.data;

/**
 * Public Workflow.diagnostics member exposed by the AngularTS namespace contract.
 * @type {!Array<!Object>}
 */
ng.Workflow.prototype.diagnostics;

/**
 * Public Workflow.history member exposed by the AngularTS namespace contract.
 * @type {!Array<!Object>}
 */
ng.Workflow.prototype.history;

/**
 * Public Workflow.can member exposed by the AngularTS namespace contract.
 * @param {?} command
 * @return {boolean}
 */
ng.Workflow.prototype.can = function(command) {};

/**
 * Public Workflow.run member exposed by the AngularTS namespace contract.
 * @template TName
 * @param {TName} command
 * @param {...?} var_args
 * @return {!Promise<!Object>}
 */
ng.Workflow.prototype.run = function(command, var_args) {};

/**
 * Public Workflow.cancel member exposed by the AngularTS namespace contract.
 * @param {(?|undefined)} command
 * @return {number}
 */
ng.Workflow.prototype.cancel = function(command) {};

/**
 * Public Workflow.snapshot member exposed by the AngularTS namespace contract.
 * @return {!ng.WorkflowSnapshot<TContract>}
 */
ng.Workflow.prototype.snapshot = function() {};

/**
 * Public Workflow.restore member exposed by the AngularTS namespace contract.
 * @param {?} snapshot
 * @return {void}
 */
ng.Workflow.prototype.restore = function(snapshot) {};

/**
 * Labeled type contract carried by a workflow definition and instance.
 * @record
 */
ng.WorkflowContract = function() {};

/**
 * Public WorkflowContract.data member exposed by the AngularTS namespace contract.
 * @type {?}
 */
ng.WorkflowContract.prototype.data;

/**
 * Public WorkflowContract.commands member exposed by the AngularTS namespace contract.
 * @type {?}
 */
ng.WorkflowContract.prototype.commands;

/**
 * Public WorkflowContract.state member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.WorkflowContract.prototype.state;

/**
 * Public AngularTS WorkflowCommand contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {function(!ng.WorkflowCommandContext<?, ?>): ?}
 */
ng.WorkflowCommand;

/**
 * Input and output carried by a workflow command.
 * @record
 */
ng.WorkflowCommandContract = function() {};

/**
 * Public WorkflowCommandContract.input member exposed by the AngularTS namespace contract.
 * @type {?}
 */
ng.WorkflowCommandContract.prototype.input;

/**
 * Public WorkflowCommandContract.output member exposed by the AngularTS namespace contract.
 * @type {?}
 */
ng.WorkflowCommandContract.prototype.output;

/**
 * Public AngularTS WorkflowCommandContext contract exposed through the global ng namespace for Closure-annotated applications.
 * @template TContract, TInput
 * @record
 */
ng.WorkflowCommandContext = function() {};

/**
 * Public WorkflowCommandContext.data member exposed by the AngularTS namespace contract.
 * @type {!Object}
 */
ng.WorkflowCommandContext.prototype.data;

/**
 * Public WorkflowCommandContext.input member exposed by the AngularTS namespace contract.
 * @type {TInput}
 */
ng.WorkflowCommandContext.prototype.input;

/**
 * Public WorkflowCommandContext.command member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.WorkflowCommandContext.prototype.command;

/**
 * Public WorkflowCommandContext.cleanup member exposed by the AngularTS namespace contract.
 * @param {function(): void} callback
 * @return {void}
 */
ng.WorkflowCommandContext.prototype.cleanup = function(callback) {};

/**
 * Stop the command with a controlled, recorded diagnostic.
 * @param {!Object} diagnostic
 * @return {?}
 */
ng.WorkflowCommandContext.prototype.reject = function(diagnostic) {};

/**
 * Public WorkflowCommandContext.signal member exposed by the AngularTS namespace contract.
 * @type {!AbortSignal}
 */
ng.WorkflowCommandContext.prototype.signal;

/**
 * Public AngularTS WorkflowCommandDefinition contract exposed through the global ng namespace for Closure-annotated applications.
 * @template TContract, TCommand
 * @record
 */
ng.WorkflowCommandDefinition = function() {};

/**
 * Public WorkflowCommandDefinition.from member exposed by the AngularTS namespace contract.
 * @type {?}
 */
ng.WorkflowCommandDefinition.prototype.from;

/**
 * Public WorkflowCommandDefinition.pending member exposed by the AngularTS namespace contract.
 * @type {?}
 */
ng.WorkflowCommandDefinition.prototype.pending;

/**
 * Public WorkflowCommandDefinition.execute member exposed by the AngularTS namespace contract.
 * @type {(function(!ng.WorkflowCommandContext<TContract, ?>): ?|undefined)}
 */
ng.WorkflowCommandDefinition.prototype.execute;

/**
 * Public WorkflowCommandDefinition.success member exposed by the AngularTS namespace contract.
 * @type {?}
 */
ng.WorkflowCommandDefinition.prototype.success;

/**
 * Public WorkflowCommandDefinition.failure member exposed by the AngularTS namespace contract.
 * @type {?}
 */
ng.WorkflowCommandDefinition.prototype.failure;

/**
 * Public WorkflowCommandDefinition.cancelled member exposed by the AngularTS namespace contract.
 * @type {(?|undefined)}
 */
ng.WorkflowCommandDefinition.prototype.cancelled;

/**
 * Public WorkflowCommandDefinition.timeout member exposed by the AngularTS namespace contract.
 * @type {(?|undefined)}
 */
ng.WorkflowCommandDefinition.prototype.timeout;

/**
 * Public WorkflowCommandDefinition.concurrency member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.WorkflowCommandDefinition.prototype.concurrency;

/**
 * Public WorkflowCommandDefinition.commandTimeout member exposed by the AngularTS namespace contract.
 * @type {(number|undefined)}
 */
ng.WorkflowCommandDefinition.prototype.commandTimeout;

/**
 * Public WorkflowCommandDefinition.retry member exposed by the AngularTS namespace contract.
 * @type {(number|undefined)}
 */
ng.WorkflowCommandDefinition.prototype.retry;

/**
 * Public AngularTS WorkflowResult contract exposed through the global ng namespace for Closure-annotated applications.
 * @template TOutput
 * @record
 */
ng.WorkflowResult = function() {};

/**
 * Public WorkflowResult.ok member exposed by the AngularTS namespace contract.
 * @type {boolean}
 */
ng.WorkflowResult.prototype.ok;

/**
 * Public WorkflowResult.status member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.WorkflowResult.prototype.status;

/**
 * Public WorkflowResult.diagnostics member exposed by the AngularTS namespace contract.
 * @type {(!Array<!Object>|undefined)}
 */
ng.WorkflowResult.prototype.diagnostics;

/**
 * Public AngularTS WorkflowSnapshot contract exposed through the global ng namespace for Closure-annotated applications.
 * @template TContract
 * @record
 */
ng.WorkflowSnapshot = function() {};

/**
 * Public WorkflowSnapshot.version member exposed by the AngularTS namespace contract.
 * @type {number}
 */
ng.WorkflowSnapshot.prototype.version;

/**
 * Public WorkflowSnapshot.id member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.WorkflowSnapshot.prototype.id;

/**
 * Public WorkflowSnapshot.state member exposed by the AngularTS namespace contract.
 * @type {?}
 */
ng.WorkflowSnapshot.prototype.state;

/**
 * Public WorkflowSnapshot.data member exposed by the AngularTS namespace contract.
 * @type {?}
 */
ng.WorkflowSnapshot.prototype.data;

/**
 * Public WorkflowSnapshot.diagnostics member exposed by the AngularTS namespace contract.
 * @type {!Array<!Object>}
 */
ng.WorkflowSnapshot.prototype.diagnostics;

/**
 * Public WorkflowSnapshot.history member exposed by the AngularTS namespace contract.
 * @type {!Array<!Object>}
 */
ng.WorkflowSnapshot.prototype.history;

/**
 * Public AngularTS WorkflowSupervisor contract exposed through the global ng namespace for Closure-annotated applications.
 * @template TWorkflows
 * @record
 */
ng.WorkflowSupervisor = function() {};

/**
 * Public WorkflowSupervisor.id member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.WorkflowSupervisor.prototype.id;

/**
 * Public WorkflowSupervisor.status member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.WorkflowSupervisor.prototype.status;

/**
 * Public WorkflowSupervisor.diagnostics member exposed by the AngularTS namespace contract.
 * @type {!Array<!Object>}
 */
ng.WorkflowSupervisor.prototype.diagnostics;

/**
 * Public WorkflowSupervisor.ready member exposed by the AngularTS namespace contract.
 * @type {!Promise<(!ng.WorkflowSupervisorSnapshot<!Object<string, ?>>|undefined)>}
 */
ng.WorkflowSupervisor.prototype.ready;

/**
 * Public WorkflowSupervisor.workflow member exposed by the AngularTS namespace contract.
 * @template TWorkflowName
 * @param {TWorkflowName} name
 * @return {?}
 */
ng.WorkflowSupervisor.prototype.workflow = function(name) {};

/**
 * Public WorkflowSupervisor.cancelAll member exposed by the AngularTS namespace contract.
 * @return {number}
 */
ng.WorkflowSupervisor.prototype.cancelAll = function() {};

/**
 * Public WorkflowSupervisor.snapshot member exposed by the AngularTS namespace contract.
 * @return {!ng.WorkflowSupervisorSnapshot<!Object<string, ?>>}
 */
ng.WorkflowSupervisor.prototype.snapshot = function() {};

/**
 * Public WorkflowSupervisor.restore member exposed by the AngularTS namespace contract.
 * @param {?} snapshot
 * @return {void}
 */
ng.WorkflowSupervisor.prototype.restore = function(snapshot) {};

/**
 * Public WorkflowSupervisor.persist member exposed by the AngularTS namespace contract.
 * @return {!Promise<!ng.WorkflowSupervisorSnapshot<!Object<string, ?>>>}
 */
ng.WorkflowSupervisor.prototype.persist = function() {};

/**
 * Public WorkflowSupervisor.recover member exposed by the AngularTS namespace contract.
 * @return {!Promise<(!ng.WorkflowSupervisorSnapshot<!Object<string, ?>>|undefined)>}
 */
ng.WorkflowSupervisor.prototype.recover = function() {};

/**
 * Public AngularTS WorkflowSupervisorConfig contract exposed through the global ng namespace for Closure-annotated applications.
 * @template TWorkflows
 * @record
 */
ng.WorkflowSupervisorConfig = function() {};

/**
 * Public WorkflowSupervisorConfig.id member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.WorkflowSupervisorConfig.prototype.id;

/**
 * Public WorkflowSupervisorConfig.workflows member exposed by the AngularTS namespace contract.
 * @type {TWorkflows}
 */
ng.WorkflowSupervisorConfig.prototype.workflows;

/**
 * Public WorkflowSupervisorConfig.persistence member exposed by the AngularTS namespace contract.
 * @type {(!ng.WorkflowSupervisorPersistence<!ng.WorkflowSupervisorSnapshot<!Object<string, ?>>>|!ng.WorkflowSupervisorPersistenceConfig|string|undefined)}
 */
ng.WorkflowSupervisorConfig.prototype.persistence;

/**
 * Persist a fresh supervisor snapshot after each completed command.
 * @type {(boolean|undefined)}
 */
ng.WorkflowSupervisorConfig.prototype.autoPersist;

/**
 * Restore persisted state and retry recoverable commands on startup.
 * @type {(boolean|undefined)}
 */
ng.WorkflowSupervisorConfig.prototype.autoRecover;

/**
 * Built-in IndexedDB persistence selected by a workflow supervisor.
 * @record
 */
ng.WorkflowSupervisorPersistenceConfig = function() {};

/**
 * Public WorkflowSupervisorPersistenceConfig.type member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.WorkflowSupervisorPersistenceConfig.prototype.type;

/**
 * Public WorkflowSupervisorPersistenceConfig.database member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.WorkflowSupervisorPersistenceConfig.prototype.database;

/**
 * Public WorkflowSupervisorPersistenceConfig.store member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.WorkflowSupervisorPersistenceConfig.prototype.store;

/**
 * Public WorkflowSupervisorPersistenceConfig.version member exposed by the AngularTS namespace contract.
 * @type {(number|undefined)}
 */
ng.WorkflowSupervisorPersistenceConfig.prototype.version;

/**
 * Public WorkflowSupervisorPersistenceConfig.indexedDB member exposed by the AngularTS namespace contract.
 * @type {(!Object|undefined)}
 */
ng.WorkflowSupervisorPersistenceConfig.prototype.indexedDB;

/**
 * Public AngularTS WorkflowSupervisorPersistence contract exposed through the global ng namespace for Closure-annotated applications.
 * @template TSnapshot
 * @record
 */
ng.WorkflowSupervisorPersistence = function() {};

/**
 * Public WorkflowSupervisorPersistence.load member exposed by the AngularTS namespace contract.
 * @param {string} id
 * @return {!Promise<(TSnapshot|undefined)>}
 */
ng.WorkflowSupervisorPersistence.prototype.load = function(id) {};

/**
 * Public WorkflowSupervisorPersistence.save member exposed by the AngularTS namespace contract.
 * @param {string} id
 * @param {TSnapshot} snapshot
 * @return {!Promise<void>}
 */
ng.WorkflowSupervisorPersistence.prototype.save = function(id, snapshot) {};

/**
 * Public AngularTS WorkflowSupervisorSnapshot contract exposed through the global ng namespace for Closure-annotated applications.
 * @template TWorkflowSnapshots
 * @record
 */
ng.WorkflowSupervisorSnapshot = function() {};

/**
 * Public WorkflowSupervisorSnapshot.version member exposed by the AngularTS namespace contract.
 * @type {number}
 */
ng.WorkflowSupervisorSnapshot.prototype.version;

/**
 * Public WorkflowSupervisorSnapshot.id member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.WorkflowSupervisorSnapshot.prototype.id;

/**
 * Public WorkflowSupervisorSnapshot.status member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.WorkflowSupervisorSnapshot.prototype.status;

/**
 * Public WorkflowSupervisorSnapshot.workflows member exposed by the AngularTS namespace contract.
 * @type {TWorkflowSnapshots}
 */
ng.WorkflowSupervisorSnapshot.prototype.workflows;

/**
 * Public WorkflowSupervisorSnapshot.diagnostics member exposed by the AngularTS namespace contract.
 * @type {!Array<!Object>}
 */
ng.WorkflowSupervisorSnapshot.prototype.diagnostics;

/**
 * Public WorkflowSupervisorSnapshot.updatedAt member exposed by the AngularTS namespace contract.
 * @type {number}
 */
ng.WorkflowSupervisorSnapshot.prototype.updatedAt;

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
 * Public NgModelController.$validity member exposed by the AngularTS namespace contract.
 * @type {(!Object|null)}
 */
ng.NgModelController.prototype.$validity;

/**
 * Public NgModelController.$validationMessage member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.NgModelController.prototype.$validationMessage;

/**
 * Public NgModelController.$error member exposed by the AngularTS namespace contract.
 * @type {!Object<string, boolean>}
 */
ng.NgModelController.prototype.$error;

/**
 * Public NgModelController.$pending member exposed by the AngularTS namespace contract.
 * @type {(!Object<string, boolean>|undefined)}
 */
ng.NgModelController.prototype.$pending;

/**
 * Public NgModelController.$name member exposed by the AngularTS namespace contract.
 * @type {(number|string)}
 */
ng.NgModelController.prototype.$name;

/**
 * Public NgModelController.$target member exposed by the AngularTS namespace contract.
 * @type {!Object}
 */
ng.NgModelController.prototype.$target;

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
 * Public NgModelController.$setNativeValidity member exposed by the AngularTS namespace contract.
 * @param {(boolean|null)} state
 * @return {void}
 */
ng.NgModelController.prototype.$setNativeValidity = function(state) {};

/**
 * Sets the control's single native custom-validity message. Native controls expose this through `ValidityState.customError`; an empty message clears the custom error.
 * @param {string} message
 * @return {void}
 */
ng.NgModelController.prototype.$setCustomValidity = function(message) {};

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
 * Runs each of the registered validators (first synchronous validators and then asynchronous validators). If the validity changes to invalid, the model will be set to `undefined`, unless `ngModelOptions.allowInvalid` is `true`. If the validity changes to valid, it will set the model to the last available valid `$modelValue`, i.e. either the last parsed value or the last value set from the scope.
 * @return {void}
 */
ng.NgModelController.prototype.$validate = function() {};

/**
 * Commit a pending update to the `$modelValue`. Updates may be pending by a debounced event or because the input is waiting for a some future event defined in `ng-model-options`. this method is rarely needed as `NgModelController` usually handles calling this in response to input events.
 * @return {void}
 */
ng.NgModelController.prototype.$commitViewValue = function() {};

/**
 * Update the view value. This method should be called when a control wants to change the view value; typically, this is done from within a DOM event handler. For example, the `input` directive calls it when the value of the input changes and `select` calls it when an option is selected. When `$setViewValue` is called, the new `value` will be staged for committing through the `$parsers` and `$validators` pipelines. If there are no special `ngModelOptions` settings specified then the staged value is sent directly for processing through the `$parsers` pipeline. After this, the `$validators` and `$asyncValidators` are called and the value is applied to `$modelValue`. Finally, the value is set to the **expression** specified in the `ng-model` attribute and all the registered change listeners, in the `$viewChangeListeners` list are called. In case the `ngModelOptions` directive is used with `updateOn` and the `default` trigger is not listed, all those actions will remain pending until one of the `updateOn` events is triggered on the DOM element. All these actions will be debounced if the `ngModelOptions` directive is used with a custom debounce for this particular event. Note that a `$digest` is only triggered once the `updateOn` events are fired, or if `debounce` is specified, once the timer runs out. Standard native inputs pass through browser-native values, such as strings from text-like controls, booleans from checkboxes, and `FileList | null` from file inputs. However, custom controls might also pass objects to this method. In this case, we should make a copy of the object before passing it to `$setViewValue`. This is because `ngModel` does not perform a deep watch of objects, it only looks for a change of identity. If you only change the property of the object then ngModel will not realize that the object has changed and will not invoke the `$parsers` and `$validators` pipelines. For this reason, you should not change properties of the copy once it has been passed to `$setViewValue`. Otherwise you may cause the model value on the scope to change incorrectly. <div class="alert alert-info"> In any case, the value passed to the method should always reflect the current value of the control. For example, if you are calling `$setViewValue` for an input element, you should pass the input DOM value. Otherwise, the control and the scope model become out of sync. It's also important to note that `$setViewValue` does not call `$render` or change the control's DOM value in any way. If we want to change the control's DOM value programmatically, we should update the `ngModel` scope expression. Its new value will be picked up by the model controller, which will run it through the `$formatters`, `$render` it to update the DOM, and finally call `$validate` on it. </div>
 * @param {?} value
 * @param {(string|undefined)} trigger
 * @return {void}
 */
ng.NgModelController.prototype.$setViewValue = function(value, trigger) {};

/**
 * Override the current model options settings programmatically. The previous `ModelOptions` value will not be modified. Instead, a new `ModelOptions` object will inherit from the previous one overriding or inheriting settings that are defined in the given parameter. See `ngModelOptions` for information about what options can be specified and how model option inheritance works. <div class="alert alert-warning"> **Note:** this function only affects the options set on the `ngModelController`, and not the options on the `ngModelOptions` directive from which they might have been obtained initially. </div> <div class="alert alert-danger"> **Note:** it is not possible to override the `getterSetter` option. </div>
 * @param {!Object} options
 * @return {void}
 */
ng.NgModelController.prototype.$overrideModelOptions = function(options) {};

/**
 * Runs the model -> view pipeline on the current {@link NgModelController.$modelValue$modelValue}. The following actions are performed by this method: - the `$modelValue` is run through the {@link NgModelController.$formatters$formatters} and the result is set to the {@link NgModelController.$viewValue$viewValue} - the `ng-empty` or `ng-not-empty` class is set on the element - if the `$viewValue` has changed: - {@link NgModelController.$render$render} is called on the control - the {@link NgModelController.$validators$validators} are run and the validation status is set. This method is called by ngModel internally when the bound scope value changes. Application developers usually do not have to call this function themselves. This function can be used when the `$viewValue` or the rendered DOM value are not correctly formatted and the `$modelValue` must be run through the `$formatters` again.
 * @return {void}
 */
ng.NgModelController.prototype.$processModelValue = function() {};

/**
 * Full request configuration accepted by `$http(...)`. See http://docs.angularjs.org/api/ng/service/$http#usage
 * @record
 */
ng.HttpRequestConfig = function() {};

/**
 * HTTP verb to use for the request.
 * @type {string}
 */
ng.HttpRequestConfig.prototype.method;

/**
 * Request URL. Query parameters from `params` are appended to this URL.
 * @type {string}
 */
ng.HttpRequestConfig.prototype.url;

/**
 * Event handlers notified by the underlying transport.
 * @type {(!Object<string, (!Object|function(!Event): void|undefined)>|undefined)}
 */
ng.HttpRequestConfig.prototype.eventHandlers;

/**
 * Upload event handlers. Not used by the fetch transport.
 * @type {(!Object<string, (!Object|function(!Event): void|undefined)>|undefined)}
 */
ng.HttpRequestConfig.prototype.uploadEventHandlers;

/**
 * Query parameters appended to the request URL.
 * @type {(!Object<string, ?>|undefined)}
 */
ng.HttpRequestConfig.prototype.params;

/**
 * Request body. Shorthand methods with explicit data set this automatically.
 * @type {(?|undefined)}
 */
ng.HttpRequestConfig.prototype.data;

/**
 * Millisecond timeout, or a promise whose resolution aborts the request.
 * @type {(!Promise<?>|number|undefined)}
 */
ng.HttpRequestConfig.prototype.timeout;

/**
 * Native fetch response body reader hint.
 * @type {(string|undefined)}
 */
ng.HttpRequestConfig.prototype.responseType;

/**
 * Cache used for cacheable requests. `true` enables the default cache.
 * @type {(!Object|boolean|undefined)}
 */
ng.HttpRequestConfig.prototype.cache;

/**
 * Request body transform pipeline.
 * @type {(!Array<function(?, function(): !Object<string, string>): ?>|function(?, function(): !Object<string, string>): ?|undefined)}
 */
ng.HttpRequestConfig.prototype.transformRequest;

/**
 * Response body transform pipeline.
 * @type {(!Array<function(?, function(): !Object<string, string>, number): ?>|function(?, function(): !Object<string, string>, number): ?|undefined)}
 */
ng.HttpRequestConfig.prototype.transformResponse;

/**
 * Default headers merged into each request.
 * @type {(!Object<string, (!Object<string, (boolean|function(!ng.HttpRequestConfig): ?|null|number|string|undefined)>|boolean|function(!ng.HttpRequestConfig): ?|null|number|string|undefined)>|undefined)}
 */
ng.HttpRequestConfig.prototype.headers;

/**
 * Header name used when sending the XSRF token.
 * @type {(string|undefined)}
 */
ng.HttpRequestConfig.prototype.xsrfHeaderName;

/**
 * Cookie name used when reading the XSRF token.
 * @type {(string|undefined)}
 */
ng.HttpRequestConfig.prototype.xsrfCookieName;

/**
 * Whether cross-site requests should include credentials by default.
 * @type {(boolean|undefined)}
 */
ng.HttpRequestConfig.prototype.withCredentials;

/**
 * Query parameter serializer token or function.
 * @type {(function(!Object<string, ?>): string|string|undefined)}
 */
ng.HttpRequestConfig.prototype.paramSerializer;

/**
 * Request options shared by the `$http` shortcut methods. See http://docs.angularjs.org/api/ng/service/$http#usage
 * @record
 */
ng.HttpRequestOptions = function() {};

/**
 * Query parameters appended to the request URL.
 * @type {(!Object<string, ?>|undefined)}
 */
ng.HttpRequestOptions.prototype.params;

/**
 * Request body. Shorthand methods with explicit data set this automatically.
 * @type {(?|undefined)}
 */
ng.HttpRequestOptions.prototype.data;

/**
 * Millisecond timeout, or a promise whose resolution aborts the request.
 * @type {(!Promise<?>|number|undefined)}
 */
ng.HttpRequestOptions.prototype.timeout;

/**
 * Native fetch response body reader hint.
 * @type {(string|undefined)}
 */
ng.HttpRequestOptions.prototype.responseType;

/**
 * Cache used for cacheable requests. `true` enables the default cache.
 * @type {(!Object|boolean|undefined)}
 */
ng.HttpRequestOptions.prototype.cache;

/**
 * Request body transform pipeline.
 * @type {(!Array<function(?, function(): !Object<string, string>): ?>|function(?, function(): !Object<string, string>): ?|undefined)}
 */
ng.HttpRequestOptions.prototype.transformRequest;

/**
 * Response body transform pipeline.
 * @type {(!Array<function(?, function(): !Object<string, string>, number): ?>|function(?, function(): !Object<string, string>, number): ?|undefined)}
 */
ng.HttpRequestOptions.prototype.transformResponse;

/**
 * Default headers merged into each request.
 * @type {(!Object<string, (!Object<string, (boolean|function(!ng.HttpRequestConfig): ?|null|number|string|undefined)>|boolean|function(!ng.HttpRequestConfig): ?|null|number|string|undefined)>|undefined)}
 */
ng.HttpRequestOptions.prototype.headers;

/**
 * Header name used when sending the XSRF token.
 * @type {(string|undefined)}
 */
ng.HttpRequestOptions.prototype.xsrfHeaderName;

/**
 * Cookie name used when reading the XSRF token.
 * @type {(string|undefined)}
 */
ng.HttpRequestOptions.prototype.xsrfCookieName;

/**
 * Whether cross-site requests should include credentials by default.
 * @type {(boolean|undefined)}
 */
ng.HttpRequestOptions.prototype.withCredentials;

/**
 * Query parameter serializer token or function.
 * @type {(function(!Object<string, ?>): string|string|undefined)}
 */
ng.HttpRequestOptions.prototype.paramSerializer;

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
 * Public AngularTS RestCachePolicy contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {function(!ng.RestCachePolicyContext): (!Promise<(!ng.PolicyDecision<string>|string)>|!ng.PolicyDecision<string>|string)}
 */
ng.RestCachePolicy;

/**
 * Public AngularTS RestCachePolicyContext contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.RestCachePolicyContext = function() {};

/**
 * Public RestCachePolicyContext.method member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.RestCachePolicyContext.prototype.method;

/**
 * Public RestCachePolicyContext.url member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.RestCachePolicyContext.prototype.url;

/**
 * Public RestCachePolicyContext.collectionUrl member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.RestCachePolicyContext.prototype.collectionUrl;

/**
 * Public RestCachePolicyContext.id member exposed by the AngularTS namespace contract.
 * @type {(?|undefined)}
 */
ng.RestCachePolicyContext.prototype.id;

/**
 * Public RestCachePolicyContext.params member exposed by the AngularTS namespace contract.
 * @type {(!Object<string, ?>|undefined)}
 */
ng.RestCachePolicyContext.prototype.params;

/**
 * Public RestCachePolicyContext.options member exposed by the AngularTS namespace contract.
 * @type {(!Object<string, ?>|undefined)}
 */
ng.RestCachePolicyContext.prototype.options;

/**
 * Public RestCachePolicyContext.cacheKey member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.RestCachePolicyContext.prototype.cacheKey;

/**
 * Public RestCachePolicyContext.operation member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.RestCachePolicyContext.prototype.operation;

/**
 * Public RestCachePolicyContext.meta member exposed by the AngularTS namespace contract.
 * @type {(!Object<string, ?>|undefined)}
 */
ng.RestCachePolicyContext.prototype.meta;

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
 * @type {(!ng.HttpRequestConfig|undefined)}
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
 * Default read strategy used for cacheable GET requests.
 * @type {(string|undefined)}
 */
ng.CachedRestBackendOptions.prototype.strategy;

/**
 * Runtime policy used to choose the read strategy for each cacheable request.
 * @type {(function(!ng.RestCachePolicyContext): (!Promise<(!ng.PolicyDecision<string>|string)>|!ng.PolicyDecision<string>|string)|undefined)}
 */
ng.CachedRestBackendOptions.prototype.policy;

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
 * Fetch a collection. Parameters are used for URI template expansion and are also forwarded to `$http` as query params. Non-array responses resolve to an empty array.
 * @param {(!Object<string, ?>|undefined)} params
 * @return {!Promise<!Array<T>>}
 */
ng.RestService.prototype.list = function(params) {};

/**
 * Fetch one resource by ID using `GET`.
 * @param {ID} id
 * @param {(!Object<string, ?>|undefined)} params
 * @return {!Promise<(T|null)>}
 */
ng.RestService.prototype.get = function(id, params) {};

/**
 * Create a resource using `POST`.
 * @param {T} item
 * @return {!Promise<(T|null)>}
 */
ng.RestService.prototype.create = function(item) {};

/**
 * Update a resource using `PUT`.
 * @param {ID} id
 * @param {!Object} item
 * @return {!Promise<(T|null)>}
 */
ng.RestService.prototype.update = function(id, item) {};

/**
 * Delete a resource by ID.
 * @param {ID} id
 * @return {!Promise<void>}
 */
ng.RestService.prototype.delete = function(id) {};

/**
 * Event object passed to `$emit` and `$broadcast` listeners. Tracks target scope, current scope, name, propagation/default flags, and control methods.
 * @record
 */
ng.ScopeEvent = function() {};

/**
 * Public ScopeEvent.targetScope member exposed by the AngularTS namespace contract.
 * @type {!Object}
 */
ng.ScopeEvent.prototype.targetScope;

/**
 * Public ScopeEvent.currentScope member exposed by the AngularTS namespace contract.
 * @type {(!Object|null)}
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
 * Module-owned router state tree declaration. Use this with [[NgModule.router]] when a module owns a route subtree. Child state names are relative to their parent unless they contain a dot.
 * @record
 */
ng.RouterModuleDeclaration = function() {};

/**
 * Child states owned by this module route tree. Each child is lowered to a normal [[StateDeclaration]] before registration.
 * @type {(!Array<!ng.RouterModuleDeclaration>|undefined)}
 */
ng.RouterModuleDeclaration.prototype.children;

/**
 * The state name (required) A unique state name, e.g. `"home"`, `"about"`, `"contacts"`. To create a parent/child state use a dot, e.g. `"about.sales"`, `"home.newest"`. Note: [State] objects require unique names. The name is used like an id.
 * @type {string}
 */
ng.RouterModuleDeclaration.prototype.name;

/**
 * Abstract state indicator An abstract state can never be directly activated. Use an abstract state to provide inherited properties (url, resolve, data, etc) to children states.
 * @type {(boolean|undefined)}
 */
ng.RouterModuleDeclaration.prototype.abstract;

/**
 * The parent state Normally, a state's parent is implied from the state's [[name]], e.g., `"parentstate.childstate"`. Alternatively, you can explicitly set the parent state using this property. This allows shorter state names, e.g., `<a ng-state="'childstate'">Child</a>` instead of `<a ng-state="'parentstate.childstate'">Child</a> When using this property, the state's name should not have any dots in it. #### Example: ```js var parentstate = { name: 'parentstate' } var childstate = { name: 'childstate', parent: 'parentstate' // or use a JS var which is the parent StateDeclaration, i.e.: // parent: parentstate } ```
 * @type {(!ng.StateDeclaration|string|undefined)}
 */
ng.RouterModuleDeclaration.prototype.parent;

/**
 * Named view declarations for this state. Each key targets an `ng-view`; each value is either a full view declaration or a string shorthand for `{ component: "componentName" }`. Examples: ```js views: { mymessages: "mymessages", messagelist: { component: "messageList" }, "^.^.messagecontent": "message" } ```
 * @type {(!Object<string, (!Object|string)>|undefined)}
 */
ng.RouterModuleDeclaration.prototype.views;

/**
 * Resolve - a mechanism to asynchronously fetch data, participating in the Transition lifecycle The `resolve:` property defines data (or other dependencies) to be fetched asynchronously when the state is being entered. After the data is fetched, it may be used in views, transition hooks or other resolves that belong to this state. The data may also be used in any views or resolves that belong to nested states. ### As an array Each array element should be a [[ResolvableLiteral]] object. #### Example: The `user` resolve injects the current `Transition` and the `UserService` (using its token, which is a string). The [[ResolvableLiteral.eager]] flag controls whether the resolve starts at transition start instead of when the owning state is entered. The `user` data, fetched asynchronously, can then be used in a view. ```js var state = { name: 'user', url: '/user/:userId resolve: [ { token: 'user', eager: true, deps: ['UserService', Transition], resolveFn: (userSvc, trans) => userSvc.fetchUser(trans.params().userId) }, } ] } ``` ### As an object The `resolve` property may be an object where: - Each key (string) is the name of the dependency. - Each value (function) is an injectable function which returns the dependency, or a promise for the dependency. This style is based on AngularTS injectable functions. Dependency-bearing functions must use array annotation or a static `$inject` property. #### AngularTS Example: ```js resolve: { // If you inject `myStateDependency` into a controller, you'll get "abc" myStateDependency: function() { return "abc"; }, // Dependencies are annotated in "Inline Array Annotation" myAsyncData: ['$http', '$transition$' function($http, $transition$) { // Return a promise (async) for the data return $http.get("/foos/" + $transition$.params().foo); }] } ``` Note: You cannot mark individual entries as eager, nor can you use non-string tokens when using the object style `resolve:` block. ### Lifecycle Since a resolve function can return a promise, the router will delay entering the state until the promises are ready. If any of the promises are rejected, the Transition is aborted with an Error. By default, resolves for a state are fetched just before that state is entered. Note that only states which are being *entered* during the `Transition` have their resolves fetched. States that are "retained" do not have their resolves re-fetched. If you are currently in a parent state `parent` and are transitioning to a child state `parent.child`, the previously resolved data for state `parent` can be injected into `parent.child` without delay. Any resolved data for `parent.child` is retained until `parent.child` is exited, e.g., by transitioning back to the `parent` state. Because of this scoping and lifecycle, resolves are a great place to fetch your application's primary data. ### Injecting resolves into other things During a transition, Resolve data can be injected into: - Views (the components which fill a `ng-view` tag) - Transition Hooks - Other resolves (a resolve may depend on asynchronous data from a different resolve) ### Injecting other things into resolves Resolve functions usually have dependencies on some other API(s). The dependencies are usually declared and injected into the resolve function. A common pattern is to inject a custom service such as `UserService`. The resolve then delegates to a service method, such as `UserService.list()`; #### Special injectable tokens - `Transition`: The current [[Transition]] object; information and API about the current transition, such as "to" and "from" State Parameters and transition options. - `'$transition$'`: A string alias for the `Transition` injectable - `'$state$'`: For `onEnter`/`onExit`/`onRetain`, the state being entered/exited/retained. - Other resolve tokens: A resolve can depend on another resolve, either from the same state, or from any parent state. #### Example: ```js // Injecting a resolve into another resolve resolve: [ // Define a resolve 'allusers' which delegates to the UserService.list() // which returns a promise (async) for all the users { token: 'allusers', resolveFn: (UserService) => UserService.list(), deps: [UserService] }, // Define a resolve 'user' which depends on the allusers resolve. // This resolve function is not called until 'allusers' is ready. { token: 'user', resolveFn: (allusers, trans) => _.find(allusers, trans.params().userId), deps: ['allusers', Transition] } } ```
 * @type {(!Array<!Object>|!Object<string, (!Array<function(...?): ?>|function(...?): ?)>|undefined)}
 */
ng.RouterModuleDeclaration.prototype.resolve;

/**
 * The url fragment for the state A URL fragment (with optional parameters) which is used to match the browser location with this state. This fragment will be appended to the parent state's URL in order to build up the overall URL for this state. It may include path parameters, typed parameters, and query parameters.
 * @type {(string|undefined)}
 */
ng.RouterModuleDeclaration.prototype.url;

/**
 * Params configuration An object which optionally configures parameters declared in the url, or defines additional non-url parameters. For each parameter being configured, add a [[ParamDeclaration]] keyed to the name of the parameter. #### Example: ```js params: { param1: { type: "int", array: true, value: [] }, param2: { value: "index" } } ```
 * @type {(!Object<string, !Object>|undefined)}
 */
ng.RouterModuleDeclaration.prototype.params;

/**
 * An inherited property to store state data This is a spot for you to store inherited state metadata. Child states' `data` object will prototypally inherit from their parent state. Use this for application metadata. Use `policy.navigation` for framework navigation decisions such as authentication, permissions, or redirects. Note: because prototypal inheritance is used, changes to parent `data` objects reflect in the child `data` objects. Care should be taken if you are using `hasOwnProperty` on the `data` object. Properties from parent objects will return false for `hasOwnProperty`.
 * @type {(?|undefined)}
 */
ng.RouterModuleDeclaration.prototype.data;

/**
 * Declarative state policy metadata consumed by AngularTS framework services. `policy.navigation` is inherited through the state tree and evaluated by the router's security navigation hook before resolves, controllers, or views run. `policy.transition.canExit` is evaluated before exiting states are torn down. `policy.retention` declares keep-alive route subtree behavior and can override router-wide retention defaults.
 * @type {(!ng.StatePolicyDeclaration|undefined)}
 */
ng.RouterModuleDeclaration.prototype.policy;

/**
 * Synchronously or asynchronously redirects Transitions to a different state/params If this property is defined, a Transition directly to this state will be redirected based on the property's value. - If the value is a `string`, the Transition is redirected to the state named by the string. - If the property is an object with a `state` and/or `params` property, the Transition is redirected to the named `state` and/or `params`. - If the value is a [[TargetState]] the Transition is redirected to the `TargetState` - If the property is a function: - The function is called with the current [[Transition]] - The return value is processed using the previously mentioned rules. - If the return value is a promise, the promise is waited for, then the resolved async value is processed using the same rules. Note: `redirectTo` is processed as an `onStart` hook, before non-eager resolves. If your redirect function relies on resolve data, get the [[Transition.injector]] and request the resolve data with `getAsync()`. #### Example: ```js // a string .state('A', { redirectTo: 'A.B' }) // a {state, params} object .state('C', { redirectTo: { state: 'C.D', params: { foo: 'index' } } }) // a fn .state('E', { redirectTo: () => "A" }) // a fn conditionally returning a {state, params} .state('F', { redirectTo: (trans) => { if (trans.params().foo < 10) return { state: 'F', params: { foo: 10 } }; } }) // a fn returning a promise for a redirect .state('G', { redirectTo: (trans) => { let svc = trans.injector().get('SomeAsyncService') let promise = svc.getAsyncRedirectTo(trans.params.foo); return promise; } }) // a fn that fetches resolve data .state('G', { redirectTo: (trans) => { // getAsync tells the resolve to load let resolvePromise = trans.injector().getAsync('SomeResolve') return resolvePromise.then(resolveData => resolveData === 'login' ? 'login' : null); } }) ```
 * @type {(!Object|function(!ng.Transition<!Object<string, !Object>, !Object>): !Promise<(!Object|string|undefined)>|function(!ng.Transition<!Object<string, !Object>, !Object>): (!Object|string|undefined)|string|undefined)}
 */
ng.RouterModuleDeclaration.prototype.redirectTo;

/**
 * A state hook invoked when a state is being entered. The hook can inject global services. It can also inject `$transition$` or `$state$` (from the current transition). ### Example: ```js app.router({ name: 'mystate', onEnter: (MyService, $transition$, $state$) => { return MyService.doSomething($state$.name, $transition$.params()); } }); ``` #### Example:` ```js app.router({ name: 'mystate', onEnter: [ 'MyService', '$transition$', '$state$', function (MyService, $transition$, $state$) { return MyService.doSomething($state$.name, $transition$.params()); } ] }); ```
 * @type {(!Array<function(...?): ?>|function(!ng.Transition<!Object<string, !Object>, !Object>, !ng.StateDeclaration): (!Object|boolean|void)|function(...?): ?|undefined)}
 */
ng.RouterModuleDeclaration.prototype.onEnter;

/**
 * A state hook invoked when a state is being retained. The hook can inject global services. It can also inject `$transition$` or `$state$` (from the current transition). #### Example: ```js app.router({ name: 'mystate', onRetain: (MyService, $transition$, $state$) => { return MyService.doSomething($state$.name, $transition$.params()); } }); ``` #### Example:` ```js app.router({ name: 'mystate', onRetain: [ 'MyService', '$transition$', '$state$', function (MyService, $transition$, $state$) { return MyService.doSomething($state$.name, $transition$.params()); } ] }); ```
 * @type {(!Array<function(...?): ?>|function(!ng.Transition<!Object<string, !Object>, !Object>, !ng.StateDeclaration): (!Object|boolean|void)|function(...?): ?|undefined)}
 */
ng.RouterModuleDeclaration.prototype.onRetain;

/**
 * A state hook invoked when a state is being exited. The hook can inject global services. It can also inject `$transition$` or `$state$` (from the current transition). ### Example: ```js app.router({ name: 'mystate', onExit: (MyService, $transition$, $state$) => { return MyService.doSomething($state$.name, $transition$.params()); } }); ``` #### Example:` ```js app.router({ name: 'mystate', onExit: [ 'MyService', '$transition$', '$state$', function (MyService, $transition$, $state$) { return MyService.doSomething($state$.name, $transition$.params()); } ] }); ```
 * @type {(!Array<function(...?): ?>|function(!ng.Transition<!Object<string, !Object>, !Object>, !ng.StateDeclaration): (!Object|boolean|void)|function(...?): ?|undefined)}
 */
ng.RouterModuleDeclaration.prototype.onExit;

/**
 * Marks all the state's parameters as `dynamic`. All parameters on the state will use this value for `dynamic` as a default. Individual parameters may override this default using [[ParamDeclaration.dynamic]] in the [[params]] block. This default applies to all parameters declared on this state.
 * @type {(boolean|undefined)}
 */
ng.RouterModuleDeclaration.prototype.dynamic;

/**
 * The name of the component to use for this view. The name of an AngularTS `.component()` which will be used for this view. Resolve data can be provided to the component via the component's `bindings` object. For each binding declared on the component, any resolve with the same name is set on the component's controller instance. Note: Mapping from resolve names to component inputs may be specified using [[bindings]]. #### Example: ```js .state('profile', { // Use the <my-profile></my-profile> component for this state. component: 'MyProfile', } ``` Note: When using `component` to define a view, you may _not_ use any of: `template`, `templateUrl`, `controller`.
 * @type {(!ng.Component|string|undefined)}
 */
ng.RouterModuleDeclaration.prototype.component;

/**
 * An object which maps `resolve`s to [[component]] `bindings`. When using a [[component]] declaration (`component: 'myComponent'`), each input binding for the component is supplied data from a resolve of the same name, by default. You may supply data from a different resolve name by mapping it here. Each key in this object is the name of one of the component's input bindings. Each value is the name of the resolve that should be provided to that binding. Any component bindings that are omitted from this map get the default behavior of mapping to a resolve of the same name. #### Example: ```js app.router('foo', { resolve: { foo: ['FooService', function(FooService) { return FooService.get(); }], bar: ['BarService', function(BarService) { return BarService.get(); }] }, component: 'Baz', // The component's `baz` binding gets data from the `bar` resolve // The component's `foo` binding gets data from the `foo` resolve (default behavior) bindings: { baz: 'bar' } }); app.component('Baz', { templateUrl: 'baz.html', controller: 'BazController', bindings: { foo: '<', // foo binding baz: '<' // baz binding } }); ```
 * @type {(!Object<string, string>|undefined)}
 */
ng.RouterModuleDeclaration.prototype.bindings;

/**
 * The view's controller function or name The controller function, or the name of a registered controller. The controller function will be used to control the contents of the [[directives.ngVIew]] directive. See: [[Ng1Controller]] for information about component-level router hooks.
 * @type {(!Array<(function(...?): !Object|function(...?): (!Object|undefined))>|function(...?): (!Object|undefined)|function(new: Object, ...?)|string|undefined)}
 */
ng.RouterModuleDeclaration.prototype.controller;

/**
 * The HTML template for the view. HTML template as a string, or a function which returns an html template as a string. This template will be used to render the corresponding [[directives.ngVIew]] directive. This property takes precedence over templateUrl. If `template` is a function, it will be called with the Transition parameters as the first argument. #### Example: ```js template: "<h1>inline template definition</h1><div ng-view></div>" ``` #### Example: ```js template: function(params) { return "<h1>generated template</h1>"; } ```
 * @type {(function((!Object<string, ?>|undefined)): string|string|undefined)}
 */
ng.RouterModuleDeclaration.prototype.template;

/**
 * The URL for the HTML template for the view. A path or a function that returns a path to an html template. The template will be fetched and used to render the corresponding [[directives.ngVIew]] directive. If `templateUrl` is a function, it will be called with the Transition parameters as the first argument. #### Example: ```js templateUrl: "/templates/home.html" ``` #### Example: ```js templateUrl: function(params) { return myTemplates[params.pageId]; } ```
 * @type {(function((!Object<string, ?>|undefined)): (null|string|undefined)|string|undefined)}
 */
ng.RouterModuleDeclaration.prototype.templateUrl;

/**
 * Public AngularTS RouterConfig contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.RouterConfig = function() {};

/**
 * Public RouterConfig.strict member exposed by the AngularTS namespace contract.
 * @type {(boolean|undefined)}
 */
ng.RouterConfig.prototype.strict;

/**
 * Public RouterConfig.caseInsensitive member exposed by the AngularTS namespace contract.
 * @type {(boolean|undefined)}
 */
ng.RouterConfig.prototype.caseInsensitive;

/**
 * Public RouterConfig.defaultSquash member exposed by the AngularTS namespace contract.
 * @type {(boolean|string|undefined)}
 */
ng.RouterConfig.prototype.defaultSquash;

/**
 * Public RouterConfig.paramTypes member exposed by the AngularTS namespace contract.
 * @type {(!Object<string, !Object>|undefined)}
 */
ng.RouterConfig.prototype.paramTypes;

/**
 * Public RouterConfig.scroll member exposed by the AngularTS namespace contract.
 * @type {(!Object|boolean|string|undefined)}
 */
ng.RouterConfig.prototype.scroll;

/**
 * Public RouterConfig.focus member exposed by the AngularTS namespace contract.
 * @type {(!Object|boolean|string|undefined)}
 */
ng.RouterConfig.prototype.focus;

/**
 * Public RouterConfig.viewTransitions member exposed by the AngularTS namespace contract.
 * @type {(boolean|undefined)}
 */
ng.RouterConfig.prototype.viewTransitions;

/**
 * Public RouterConfig.loading member exposed by the AngularTS namespace contract.
 * @type {(!Array<function(!Object): (!Object|boolean|string|undefined)>|boolean|function(!Object): (!Object|boolean|string|undefined)|string|undefined)}
 */
ng.RouterConfig.prototype.loading;

/**
 * Public RouterConfig.retry member exposed by the AngularTS namespace contract.
 * @type {(!Array<function(!Object): (boolean|number)>|boolean|function(!Object): (boolean|number)|number|undefined)}
 */
ng.RouterConfig.prototype.retry;

/**
 * Public RouterConfig.fallbackTo member exposed by the AngularTS namespace contract.
 * @type {(!Object|string|undefined)}
 */
ng.RouterConfig.prototype.fallbackTo;

/**
 * Public RouterConfig.error member exposed by the AngularTS namespace contract.
 * @type {(!Array<function(!Object): (!Object|string|undefined)>|!Object|function(!Object): (!Object|string|undefined)|string|undefined)}
 */
ng.RouterConfig.prototype.error;

/**
 * Public RouterConfig.errorBoundary member exposed by the AngularTS namespace contract.
 * @type {(!Array<function(!Object): (!Object|string|undefined)>|!Object|function(!Object): (!Object|string|undefined)|string|undefined)}
 */
ng.RouterConfig.prototype.errorBoundary;

/**
 * Public RouterConfig.retention member exposed by the AngularTS namespace contract.
 * @type {(!Object|undefined)}
 */
ng.RouterConfig.prototype.retention;

/**
 * Public route contract entry used by router helper types. This is an author-written TypeScript shape. It is intentionally separate from built router state records so generated docs and language bindings do not expose internal state/runtime implementation details.
 * @record
 */
ng.RouteContract = function() {};

/**
 * Public RouteContract.params member exposed by the AngularTS namespace contract.
 * @type {(!Object<string, ?>|undefined)}
 */
ng.RouteContract.prototype.params;

/**
 * Public RouteContract.resolves member exposed by the AngularTS namespace contract.
 * @type {(!Object<string, ?>|undefined)}
 */
ng.RouteContract.prototype.resolves;

/**
 * Public route-name to route-contract map used by `StateService`, generic `Transition`, `ParamsOf`, and `ResolvesOf`.
 * @record
 */
ng.RouteMap = function() {};

/**
 * Public AngularTS RoutesOf contract exposed through the global ng namespace for Closure-annotated applications.
 * @template TTree, TParamTypes
 * @record
 */
ng.RoutesOf = function() {};

/**
 * Public AngularTS ParamsOf contract exposed through the global ng namespace for Closure-annotated applications.
 * @template TRouteMap, TRouteName
 * @record
 */
ng.ParamsOf = function() {};

/**
 * Public AngularTS ResolvesOf contract exposed through the global ng namespace for Closure-annotated applications.
 * @template TRouteMap, TRouteName
 * @record
 */
ng.ResolvesOf = function() {};

/**
 * Public AngularTS StateService contract exposed through the global ng namespace for Closure-annotated applications.
 * @template TRouteMap
 * @record
 */
ng.StateService = function() {};

/**
 * The latest successful state parameters.
 * @type {!Object<string, ?>}
 */
ng.StateService.prototype.params;

/**
 * The current state declaration, when navigation has selected one.
 * @type {(!ng.StateDeclaration|undefined)}
 */
ng.StateService.prototype.current;

/**
 * Overload for typed route names and params. Untyped overload used when no route map is supplied.
 * @template TRouteName
 * @param {TRouteName} to
 * @param {...?} var_args
 * @return {!Object}
 */
ng.StateService.prototype.go = function(to, var_args) {};

/**
 * Overload for typed route names and params. Untyped overload used when no route map is supplied.
 * @template TRouteName
 * @param {TRouteName} stateOrName
 * @param {...?} var_args
 * @return {(null|string)}
 */
ng.StateService.prototype.href = function(stateOrName, var_args) {};

/**
 * Build a target that can be returned from a transition hook.
 * @param {(!Object|!ng.StateDeclaration|string)} identifier
 * @param {(!Object<string, ?>|undefined)} params
 * @param {(!Object|undefined)} options
 * @return {!Object}
 */
ng.StateService.prototype.target = function(identifier, params, options) {};

/**
 * Get all states or a matching public state declaration.
 * @return {!Array<!ng.StateDeclaration>}
 */
ng.StateService.prototype.get = function() {};

/**
 * Check whether the current state matches a state, ancestor, or glob.
 * @param {(!Object|!ng.StateDeclaration|string)} stateOrName
 * @param {(!Object<string, ?>|undefined)} params
 * @param {(!Object|undefined)} options
 * @return {boolean}
 */
ng.StateService.prototype.matches = function(stateOrName, params, options) {};

/**
 * The StateDeclaration object is used to define a state or nested state. #### Example: ```js // StateDeclaration object var foldersState = { name: 'folders', url: '/folders', component: FoldersComponent, resolve: { allfolders: ['FolderService', function(FolderService) { return FolderService.list(); }] }, } registry.register(foldersState); ```
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
 * The parent state Normally, a state's parent is implied from the state's [[name]], e.g., `"parentstate.childstate"`. Alternatively, you can explicitly set the parent state using this property. This allows shorter state names, e.g., `<a ng-state="'childstate'">Child</a>` instead of `<a ng-state="'parentstate.childstate'">Child</a> When using this property, the state's name should not have any dots in it. #### Example: ```js var parentstate = { name: 'parentstate' } var childstate = { name: 'childstate', parent: 'parentstate' // or use a JS var which is the parent StateDeclaration, i.e.: // parent: parentstate } ```
 * @type {(!ng.StateDeclaration|string|undefined)}
 */
ng.StateDeclaration.prototype.parent;

/**
 * Named view declarations for this state. Each key targets an `ng-view`; each value is either a full view declaration or a string shorthand for `{ component: "componentName" }`. Examples: ```js views: { mymessages: "mymessages", messagelist: { component: "messageList" }, "^.^.messagecontent": "message" } ```
 * @type {(!Object<string, (!Object|string)>|undefined)}
 */
ng.StateDeclaration.prototype.views;

/**
 * Resolve - a mechanism to asynchronously fetch data, participating in the Transition lifecycle The `resolve:` property defines data (or other dependencies) to be fetched asynchronously when the state is being entered. After the data is fetched, it may be used in views, transition hooks or other resolves that belong to this state. The data may also be used in any views or resolves that belong to nested states. ### As an array Each array element should be a [[ResolvableLiteral]] object. #### Example: The `user` resolve injects the current `Transition` and the `UserService` (using its token, which is a string). The [[ResolvableLiteral.eager]] flag controls whether the resolve starts at transition start instead of when the owning state is entered. The `user` data, fetched asynchronously, can then be used in a view. ```js var state = { name: 'user', url: '/user/:userId resolve: [ { token: 'user', eager: true, deps: ['UserService', Transition], resolveFn: (userSvc, trans) => userSvc.fetchUser(trans.params().userId) }, } ] } ``` ### As an object The `resolve` property may be an object where: - Each key (string) is the name of the dependency. - Each value (function) is an injectable function which returns the dependency, or a promise for the dependency. This style is based on AngularTS injectable functions. Dependency-bearing functions must use array annotation or a static `$inject` property. #### AngularTS Example: ```js resolve: { // If you inject `myStateDependency` into a controller, you'll get "abc" myStateDependency: function() { return "abc"; }, // Dependencies are annotated in "Inline Array Annotation" myAsyncData: ['$http', '$transition$' function($http, $transition$) { // Return a promise (async) for the data return $http.get("/foos/" + $transition$.params().foo); }] } ``` Note: You cannot mark individual entries as eager, nor can you use non-string tokens when using the object style `resolve:` block. ### Lifecycle Since a resolve function can return a promise, the router will delay entering the state until the promises are ready. If any of the promises are rejected, the Transition is aborted with an Error. By default, resolves for a state are fetched just before that state is entered. Note that only states which are being *entered* during the `Transition` have their resolves fetched. States that are "retained" do not have their resolves re-fetched. If you are currently in a parent state `parent` and are transitioning to a child state `parent.child`, the previously resolved data for state `parent` can be injected into `parent.child` without delay. Any resolved data for `parent.child` is retained until `parent.child` is exited, e.g., by transitioning back to the `parent` state. Because of this scoping and lifecycle, resolves are a great place to fetch your application's primary data. ### Injecting resolves into other things During a transition, Resolve data can be injected into: - Views (the components which fill a `ng-view` tag) - Transition Hooks - Other resolves (a resolve may depend on asynchronous data from a different resolve) ### Injecting other things into resolves Resolve functions usually have dependencies on some other API(s). The dependencies are usually declared and injected into the resolve function. A common pattern is to inject a custom service such as `UserService`. The resolve then delegates to a service method, such as `UserService.list()`; #### Special injectable tokens - `Transition`: The current [[Transition]] object; information and API about the current transition, such as "to" and "from" State Parameters and transition options. - `'$transition$'`: A string alias for the `Transition` injectable - `'$state$'`: For `onEnter`/`onExit`/`onRetain`, the state being entered/exited/retained. - Other resolve tokens: A resolve can depend on another resolve, either from the same state, or from any parent state. #### Example: ```js // Injecting a resolve into another resolve resolve: [ // Define a resolve 'allusers' which delegates to the UserService.list() // which returns a promise (async) for all the users { token: 'allusers', resolveFn: (UserService) => UserService.list(), deps: [UserService] }, // Define a resolve 'user' which depends on the allusers resolve. // This resolve function is not called until 'allusers' is ready. { token: 'user', resolveFn: (allusers, trans) => _.find(allusers, trans.params().userId), deps: ['allusers', Transition] } } ```
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
 * An inherited property to store state data This is a spot for you to store inherited state metadata. Child states' `data` object will prototypally inherit from their parent state. Use this for application metadata. Use `policy.navigation` for framework navigation decisions such as authentication, permissions, or redirects. Note: because prototypal inheritance is used, changes to parent `data` objects reflect in the child `data` objects. Care should be taken if you are using `hasOwnProperty` on the `data` object. Properties from parent objects will return false for `hasOwnProperty`.
 * @type {(?|undefined)}
 */
ng.StateDeclaration.prototype.data;

/**
 * Declarative state policy metadata consumed by AngularTS framework services. `policy.navigation` is inherited through the state tree and evaluated by the router's security navigation hook before resolves, controllers, or views run. `policy.transition.canExit` is evaluated before exiting states are torn down. `policy.retention` declares keep-alive route subtree behavior and can override router-wide retention defaults.
 * @type {(!ng.StatePolicyDeclaration|undefined)}
 */
ng.StateDeclaration.prototype.policy;

/**
 * Synchronously or asynchronously redirects Transitions to a different state/params If this property is defined, a Transition directly to this state will be redirected based on the property's value. - If the value is a `string`, the Transition is redirected to the state named by the string. - If the property is an object with a `state` and/or `params` property, the Transition is redirected to the named `state` and/or `params`. - If the value is a [[TargetState]] the Transition is redirected to the `TargetState` - If the property is a function: - The function is called with the current [[Transition]] - The return value is processed using the previously mentioned rules. - If the return value is a promise, the promise is waited for, then the resolved async value is processed using the same rules. Note: `redirectTo` is processed as an `onStart` hook, before non-eager resolves. If your redirect function relies on resolve data, get the [[Transition.injector]] and request the resolve data with `getAsync()`. #### Example: ```js // a string .state('A', { redirectTo: 'A.B' }) // a {state, params} object .state('C', { redirectTo: { state: 'C.D', params: { foo: 'index' } } }) // a fn .state('E', { redirectTo: () => "A" }) // a fn conditionally returning a {state, params} .state('F', { redirectTo: (trans) => { if (trans.params().foo < 10) return { state: 'F', params: { foo: 10 } }; } }) // a fn returning a promise for a redirect .state('G', { redirectTo: (trans) => { let svc = trans.injector().get('SomeAsyncService') let promise = svc.getAsyncRedirectTo(trans.params.foo); return promise; } }) // a fn that fetches resolve data .state('G', { redirectTo: (trans) => { // getAsync tells the resolve to load let resolvePromise = trans.injector().getAsync('SomeResolve') return resolvePromise.then(resolveData => resolveData === 'login' ? 'login' : null); } }) ```
 * @type {(!Object|function(!ng.Transition<!Object<string, !Object>, !Object>): !Promise<(!Object|string|undefined)>|function(!ng.Transition<!Object<string, !Object>, !Object>): (!Object|string|undefined)|string|undefined)}
 */
ng.StateDeclaration.prototype.redirectTo;

/**
 * A state hook invoked when a state is being entered. The hook can inject global services. It can also inject `$transition$` or `$state$` (from the current transition). ### Example: ```js app.router({ name: 'mystate', onEnter: (MyService, $transition$, $state$) => { return MyService.doSomething($state$.name, $transition$.params()); } }); ``` #### Example:` ```js app.router({ name: 'mystate', onEnter: [ 'MyService', '$transition$', '$state$', function (MyService, $transition$, $state$) { return MyService.doSomething($state$.name, $transition$.params()); } ] }); ```
 * @type {((!Array<(string|function(...?): (!Object|!Promise<(!Object|boolean|undefined)>|boolean|undefined))>|function(!ng.Transition, !ng.StateDeclaration): (!Object|!Promise<(!Object|boolean|undefined)>|boolean|undefined)|function(...?): (!Object|!Promise<(!Object|boolean|undefined)>|boolean|undefined))|undefined)}
 */
ng.StateDeclaration.prototype.onEnter;

/**
 * A state hook invoked when a state is being retained. The hook can inject global services. It can also inject `$transition$` or `$state$` (from the current transition). #### Example: ```js app.router({ name: 'mystate', onRetain: (MyService, $transition$, $state$) => { return MyService.doSomething($state$.name, $transition$.params()); } }); ``` #### Example:` ```js app.router({ name: 'mystate', onRetain: [ 'MyService', '$transition$', '$state$', function (MyService, $transition$, $state$) { return MyService.doSomething($state$.name, $transition$.params()); } ] }); ```
 * @type {((!Array<(string|function(...?): (!Object|!Promise<(!Object|boolean|undefined)>|boolean|undefined))>|function(!ng.Transition, !ng.StateDeclaration): (!Object|!Promise<(!Object|boolean|undefined)>|boolean|undefined)|function(...?): (!Object|!Promise<(!Object|boolean|undefined)>|boolean|undefined))|undefined)}
 */
ng.StateDeclaration.prototype.onRetain;

/**
 * A state hook invoked when a state is being exited. The hook can inject global services. It can also inject `$transition$` or `$state$` (from the current transition). ### Example: ```js app.router({ name: 'mystate', onExit: (MyService, $transition$, $state$) => { return MyService.doSomething($state$.name, $transition$.params()); } }); ``` #### Example:` ```js app.router({ name: 'mystate', onExit: [ 'MyService', '$transition$', '$state$', function (MyService, $transition$, $state$) { return MyService.doSomething($state$.name, $transition$.params()); } ] }); ```
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
 * @type {(!ng.Component|string|undefined)}
 */
ng.StateDeclaration.prototype.component;

/**
 * An object which maps `resolve`s to [[component]] `bindings`. When using a [[component]] declaration (`component: 'myComponent'`), each input binding for the component is supplied data from a resolve of the same name, by default. You may supply data from a different resolve name by mapping it here. Each key in this object is the name of one of the component's input bindings. Each value is the name of the resolve that should be provided to that binding. Any component bindings that are omitted from this map get the default behavior of mapping to a resolve of the same name. #### Example: ```js app.router('foo', { resolve: { foo: ['FooService', function(FooService) { return FooService.get(); }], bar: ['BarService', function(BarService) { return BarService.get(); }] }, component: 'Baz', // The component's `baz` binding gets data from the `bar` resolve // The component's `foo` binding gets data from the `foo` resolve (default behavior) bindings: { baz: 'bar' } }); app.component('Baz', { templateUrl: 'baz.html', controller: 'BazController', bindings: { foo: '<', // foo binding baz: '<' // baz binding } }); ```
 * @type {(!Object<string, string>|undefined)}
 */
ng.StateDeclaration.prototype.bindings;

/**
 * The view's controller function or name The controller function, or the name of a registered controller. The controller function will be used to control the contents of the [[directives.ngVIew]] directive. See: [[Ng1Controller]] for information about component-level router hooks.
 * @type {(!Array<(function(...?): !Object|function(...?): (!Object|undefined))>|function(...?): (!Object|undefined)|function(new: Object, ...?)|string|undefined)}
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
 * Public AngularTS StatePolicyDeclaration contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.StatePolicyDeclaration = function() {};

/**
 * Public StatePolicyDeclaration.navigation member exposed by the AngularTS namespace contract.
 * @type {(!Object|undefined)}
 */
ng.StatePolicyDeclaration.prototype.navigation;

/**
 * Public StatePolicyDeclaration.transition member exposed by the AngularTS namespace contract.
 * @type {(!Object|undefined)}
 */
ng.StatePolicyDeclaration.prototype.transition;

/**
 * Public StatePolicyDeclaration.retention member exposed by the AngularTS namespace contract.
 * @type {(!Object|undefined)}
 */
ng.StatePolicyDeclaration.prototype.retention;

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
 * @type {(function(!Event): void|undefined)}
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
 * @type {(function(string): ?|undefined)}
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
 * Declarative defaults used when registering an application service worker. This config intentionally maps only browser registration options and safe observation policy. Activation, reload, cache strategy, push, and background sync remain explicit application or adapter policy.
 * @record
 */
ng.ServiceWorkerConfig = function() {};

/**
 * Register automatically when the runtime service is created.
 * @type {(boolean|undefined)}
 */
ng.ServiceWorkerConfig.prototype.autoRegister;

/**
 * Check for an updated worker after registration succeeds.
 * @type {(boolean|undefined)}
 */
ng.ServiceWorkerConfig.prototype.checkForUpdatesOnRegister;

/**
 * Stable failure codes reported by {@link ServiceWorkerError}.
 * @typedef {string}
 */
ng.ServiceWorkerErrorCode;

/**
 * Public AngularTS ServiceWorkerMessageEvent contract exposed through the global ng namespace for Closure-annotated applications.
 * @template TData
 * @record
 */
ng.ServiceWorkerMessageEvent = function() {};

/**
 * Message payload from the native service worker event.
 * @type {TData}
 */
ng.ServiceWorkerMessageEvent.prototype.data;

/**
 * Native event for callers that need browser-specific fields.
 * @type {!Object}
 */
ng.ServiceWorkerMessageEvent.prototype.event;

/**
 * Native source that sent the message, when supplied by the browser.
 * @type {(!Object|!Window|null|undefined)}
 */
ng.ServiceWorkerMessageEvent.prototype.source;

/**
 * Explicit message target for `$serviceWorker.post(...)`.
 * @typedef {string}
 */
ng.ServiceWorkerMessageTarget;

/**
 * Options for {@link ServiceWorkerService.post}.
 * @record
 */
ng.ServiceWorkerPostOptions = function() {};

/**
 * Transferable objects sent with `postMessage(...)`.
 * @type {(!Array<!Object>|undefined)}
 */
ng.ServiceWorkerPostOptions.prototype.transfer;

/**
 * Worker target for this message.
 * @type {(string|undefined)}
 */
ng.ServiceWorkerPostOptions.prototype.target;

/**
 * Template-friendly snapshot of the current registration.
 * @record
 */
ng.ServiceWorkerRegistrationState = function() {};

/**
 * True when a registration is currently known by the service.
 * @type {boolean}
 */
ng.ServiceWorkerRegistrationState.prototype.registered;

/**
 * Registration scope, when available.
 * @type {(string|undefined)}
 */
ng.ServiceWorkerRegistrationState.prototype.scope;

/**
 * Update cache policy reported by the browser registration.
 * @type {(string|undefined)}
 */
ng.ServiceWorkerRegistrationState.prototype.updateViaCache;

/**
 * State of the installing worker, when present.
 * @type {(string|undefined)}
 */
ng.ServiceWorkerRegistrationState.prototype.installing;

/**
 * State of the waiting worker, when present.
 * @type {(string|undefined)}
 */
ng.ServiceWorkerRegistrationState.prototype.waiting;

/**
 * State of the active worker, when present.
 * @type {(string|undefined)}
 */
ng.ServiceWorkerRegistrationState.prototype.active;

/**
 * Per-request options for {@link ServiceWorkerService.request}.
 * @record
 */
ng.ServiceWorkerRequestOptions = function() {};

/**
 * Request timeout in milliseconds.
 * @type {(number|undefined)}
 */
ng.ServiceWorkerRequestOptions.prototype.timeout;

/**
 * Transferable objects sent with `postMessage(...)`.
 * @type {(!Array<!Object>|undefined)}
 */
ng.ServiceWorkerRequestOptions.prototype.transfer;

/**
 * Worker target for this message.
 * @type {(string|undefined)}
 */
ng.ServiceWorkerRequestOptions.prototype.target;

/**
 * Template-friendly snapshot of update-related service-worker state.
 * @record
 */
ng.ServiceWorkerUpdateState = function() {};

/**
 * True while an explicit update check is in flight.
 * @type {boolean}
 */
ng.ServiceWorkerUpdateState.prototype.checking;

/**
 * True when a waiting worker has been discovered.
 * @type {boolean}
 */
ng.ServiceWorkerUpdateState.prototype.waiting;

/**
 * True when the active worker changed during the current page lifetime.
 * @type {boolean}
 */
ng.ServiceWorkerUpdateState.prototype.controllerChanged;

/**
 * Last successful update-check time in epoch milliseconds.
 * @type {(number|undefined)}
 */
ng.ServiceWorkerUpdateState.prototype.lastCheckedAt;

/**
 * Latest observed service worker lifecycle phase.
 * @type {(string|undefined)}
 */
ng.ServiceWorkerUpdateState.prototype.phase;

/**
 * Worker associated with the latest update event.
 * @type {(!Object|undefined)}
 */
ng.ServiceWorkerUpdateState.prototype.worker;

/**
 * Registration associated with the latest update event.
 * @type {(!Object|undefined)}
 */
ng.ServiceWorkerUpdateState.prototype.registration;

/**
 * Stable failure code from the last update-related operation.
 * @type {(string|undefined)}
 */
ng.ServiceWorkerUpdateState.prototype.errorCode;

/**
 * Native error preserved for diagnostics.
 * @type {(?|undefined)}
 */
ng.ServiceWorkerUpdateState.prototype.error;

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
 * Public AngularTS Transition contract exposed through the global ng namespace for Closure-annotated applications.
 * @template TRouteMap, TRoutes
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
 * @return {!ng.Transition<!Object<string, !Object>, !Object>}
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
 * Public AngularTS TransitionRouteContract contract exposed through the global ng namespace for Closure-annotated applications.
 * @template TRouteMap
 * @record
 */
ng.TransitionRouteContract = function() {};

/**
 * Public TransitionRouteContract.from member exposed by the AngularTS namespace contract.
 * @type {?}
 */
ng.TransitionRouteContract.prototype.from;

/**
 * Public TransitionRouteContract.to member exposed by the AngularTS namespace contract.
 * @type {?}
 */
ng.TransitionRouteContract.prototype.to;

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
 * Public AngularTS AppComponentOptions contract exposed through the global ng namespace for Closure-annotated applications.
 * @template T
 * @record
 */
ng.AppComponentOptions = function() {};

/**
 * Template compiled into the host or shadow root.
 * @type {(string|undefined)}
 */
ng.AppComponentOptions.prototype.template;

/**
 * Enables shadow DOM, or passes ShadowRootInit options.
 * @type {(!Object|boolean|undefined)}
 */
ng.AppComponentOptions.prototype.shadow;

/**
 * Initial scope state, or a factory returning it.
 * @type {(T|function(): T|undefined)}
 */
ng.AppComponentOptions.prototype.scope;

/**
 * Declared DOM attributes/properties that sync into the scope.
 * @type {(!Object<string, (!ng.WebComponentInputConfig|function((?|undefined)): number|function((?|undefined)): string|function((T|undefined)): boolean|function(?): ?)>|undefined)}
 */
ng.AppComponentOptions.prototype.inputs;

/**
 * Use an isolate child scope instead of inheriting parent properties.
 * @type {(boolean|undefined)}
 */
ng.AppComponentOptions.prototype.isolate;

/**
 * Called after the scope exists and the template has been linked.
 * @type {(function(!ng.WebComponentContext<T>): (function(): void|undefined)|undefined)}
 */
ng.AppComponentOptions.prototype.connected;

/**
 * Called before the scope is destroyed.
 * @type {(function(!ng.WebComponentContext<T>): void|undefined)}
 */
ng.AppComponentOptions.prototype.disconnected;

/**
 * Called after an observed input attribute changes.
 * @type {(function(string, (null|string), (null|string), !ng.WebComponentContext<T>): void|undefined)}
 */
ng.AppComponentOptions.prototype.attributeChanged;

/**
 * Public AngularTS ScopeElement contract exposed through the global ng namespace for Closure-annotated applications.
 * @template T
 * @record
 */
ng.ScopeElement = function() {};

/**
 * Scope owned by this custom element instance.
 * @type {!ng.Scope}
 */
ng.ScopeElement.prototype.scope;

/**
 * Injector used by the AngularTS app that registered this element.
 * @type {!ng.InjectorService<?>}
 */
ng.ScopeElement.prototype.injector;

/**
 * Render root used for compiled template content.
 * @type {(!HTMLElement|!Object)}
 */
ng.ScopeElement.prototype.root;

/**
 * Public ScopeElement.connectedCallback member exposed by the AngularTS namespace contract.
 * @return {void}
 */
ng.ScopeElement.prototype.connectedCallback = function() {};

/**
 * Public ScopeElement.disconnectedCallback member exposed by the AngularTS namespace contract.
 * @return {void}
 */
ng.ScopeElement.prototype.disconnectedCallback = function() {};

/**
 * Public ScopeElement.attributeChangedCallback member exposed by the AngularTS namespace contract.
 * @param {string} attribute
 * @param {(null|string)} oldValue
 * @param {(null|string)} newValue
 * @return {void}
 */
ng.ScopeElement.prototype.attributeChangedCallback = function(attribute, oldValue, newValue) {};

/**
 * Called after the AngularTS scope and template are connected.
 * @type {(function(): (function(): void|undefined)|undefined)}
 */
ng.ScopeElement.prototype.connected;

/**
 * Called before the AngularTS scope is destroyed.
 * @type {(function(): void|undefined)}
 */
ng.ScopeElement.prototype.disconnected;

/**
 * Called after an observed input attribute changes.
 * @type {(function(string, (null|string), (null|string)): void|undefined)}
 */
ng.ScopeElement.prototype.attributeChanged;

/**
 * Dispatch a composed bubbling DOM event from this custom element.
 * @param {string} type
 * @param {(?|undefined)} detail
 * @param {(!Object|undefined)} init
 * @return {boolean}
 */
ng.ScopeElement.prototype.dispatch = function(type, detail, init) {};

/**
 * Public AngularTS ScopeElementConstructor contract exposed through the global ng namespace for Closure-annotated applications.
 * @template T
 * @record
 */
ng.ScopeElementConstructor = function() {};

/**
 * Template compiled into the host or shadow root.
 * @type {(string|undefined)}
 */
ng.ScopeElementConstructor.prototype.template;

/**
 * Enables shadow DOM, or passes ShadowRootInit options.
 * @type {(!Object|boolean|undefined)}
 */
ng.ScopeElementConstructor.prototype.shadow;

/**
 * Initial scope state, or a factory returning it.
 * @type {(T|function(): T|undefined)}
 */
ng.ScopeElementConstructor.prototype.scope;

/**
 * Declared DOM attributes/properties that sync into the scope.
 * @type {(!Object<string, (!ng.WebComponentInputConfig|function((?|undefined)): number|function((?|undefined)): string|function((T|undefined)): boolean|function(?): ?)>|undefined)}
 */
ng.ScopeElementConstructor.prototype.inputs;

/**
 * Use an isolate child scope instead of inheriting parent properties.
 * @type {(boolean|undefined)}
 */
ng.ScopeElementConstructor.prototype.isolate;

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
 * @type {!ng.InjectorService<?>}
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
 * Application-wide defaults for scoped custom elements.
 * @record
 */
ng.WebComponentConfig = function() {};

/**
 * Defaults merged into every `appComponent(...)` declaration.
 * @type {(!Object|undefined)}
 */
ng.WebComponentConfig.prototype.defaults;

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
 * Public AngularTS WebComponentService contract exposed through the global ng namespace for Closure-annotated applications.
 * @record
 */
ng.WebComponentService = function() {};

/**
 * Define an options-backed application host custom element.
 * @template T
 * @param {string} name
 * @param {!ng.AppComponentOptions<T>} options
 * @return {function(new: HTMLElement, ...?)}
 */
ng.WebComponentService.prototype.defineAppComponent = function(name, options) {};

/**
 * Define a native custom element backed by an AngularTS child scope.
 * @template T
 * @param {string} name
 * @param {!ng.ScopeElementConstructor<T>} elementClass
 * @return {function(new: HTMLElement, ...?)}
 */
ng.WebComponentService.prototype.defineElement = function(name, elementClass) {};

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
 * @type {(function(!Event): void|undefined)}
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
 * @type {(function(string): ?|undefined)}
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
ng.WebSocketConnection.prototype.reconnect = function() {};

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
 * @typedef {function(string, (!ng.WebSocketConfig|undefined)): !ng.WebSocketConnection}
 */
ng.WebSocketService;

/**
 * Public AngularTS WebTransportBufferInput contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {BufferSource}
 */
ng.WebTransportBufferInput;

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
 * @type {!Object}
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
 * Public AngularTS WorkerConfig contract exposed through the global ng namespace for Closure-annotated applications.
 * @template TReceive
 * @record
 */
ng.WorkerConfig = function() {};

/**
 * Decode an inbound native message before delivering it to subscribers.
 * @type {(function(?, !Object): TReceive|undefined)}
 */
ng.WorkerConfig.prototype.decode;

/**
 * Restart the worker after a native runtime error. Automatic restart is disabled by default.
 * @type {(boolean|undefined)}
 */
ng.WorkerConfig.prototype.restart;

/**
 * Base restart delay. Exponential backoff is capped at 30s.
 * @type {(number|undefined)}
 */
ng.WorkerConfig.prototype.restartDelay;

/**
 * Maximum automatic restarts. Defaults to 3.
 * @type {(number|undefined)}
 */
ng.WorkerConfig.prototype.maxRestarts;

/**
 * Typed failure reported by a managed worker.
 * @record
 */
ng.WorkerError = function() {};

/**
 * Public WorkerError.code member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.WorkerError.prototype.code;

/**
 * Public WorkerError.event member exposed by the AngularTS namespace contract.
 * @type {(!Object|undefined)}
 */
ng.WorkerError.prototype.event;

/**
 * Public AngularTS WorkerErrorCode contract exposed through the global ng namespace for Closure-annotated applications.
 * @typedef {string}
 */
ng.WorkerErrorCode;

/**
 * Public AngularTS WorkerHandle contract exposed through the global ng namespace for Closure-annotated applications.
 * @template TSend, TReceive
 * @record
 */
ng.WorkerHandle = function() {};

/**
 * Current managed lifecycle state.
 * @type {string}
 */
ng.WorkerHandle.prototype.status;

/**
 * Latest managed failure, retained across worker replacement.
 * @type {(!ng.WorkerError|undefined)}
 */
ng.WorkerHandle.prototype.error;

/**
 * Number of explicit or automatic worker restarts.
 * @type {number}
 */
ng.WorkerHandle.prototype.restartCount;

/**
 * Send a typed message and optional transferable ownership list.
 * @param {TSend} message
 * @param {(!Array<!Object>|undefined)} transfer
 * @return {void}
 */
ng.WorkerHandle.prototype.post = function(message, transfer) {};

/**
 * Send a correlated request using the AngularTS worker envelope.
 * @param {TSend} message
 * @param {(!ng.WorkerRequestOptions|undefined)} options
 * @return {!Promise<TReceive>}
 */
ng.WorkerHandle.prototype.request = function(message, options) {};

/**
 * Adapt this handle to the standard model synchronization contract.
 * @template T
 * @param {(string|undefined)} channel
 * @return {!ng.ModelSyncTarget<T>}
 */
ng.WorkerHandle.prototype.model = function(channel) {};

/**
 * Subscribe to decoded worker messages.
 * @param {function(TReceive, !Object): void} listener
 * @return {function(): void}
 */
ng.WorkerHandle.prototype.onMessage = function(listener) {};

/**
 * Subscribe to runtime, message, decoding, and request failures.
 * @param {function(!ng.WorkerError): void} listener
 * @return {function(): void}
 */
ng.WorkerHandle.prototype.onError = function(listener) {};

/**
 * Permanently terminate this managed connection.
 * @return {void}
 */
ng.WorkerHandle.prototype.terminate = function() {};

/**
 * Replace the native worker unless this connection was terminated.
 * @return {void}
 */
ng.WorkerHandle.prototype.restart = function() {};

/**
 * Public AngularTS WorkerModelMessage contract exposed through the global ng namespace for Closure-annotated applications.
 * @template T
 * @record
 */
ng.WorkerModelMessage = function() {};

/**
 * Public WorkerModelMessage.type member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.WorkerModelMessage.prototype.type;

/**
 * Public WorkerModelMessage.channel member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.WorkerModelMessage.prototype.channel;

/**
 * Public AngularTS WorkerRequest contract exposed through the global ng namespace for Closure-annotated applications.
 * @template TPayload
 * @record
 */
ng.WorkerRequest = function() {};

/**
 * Public WorkerRequest.type member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.WorkerRequest.prototype.type;

/**
 * Public WorkerRequest.id member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.WorkerRequest.prototype.id;

/**
 * Public WorkerRequest.payload member exposed by the AngularTS namespace contract.
 * @type {TPayload}
 */
ng.WorkerRequest.prototype.payload;

/**
 * Options for one correlated worker request.
 * @record
 */
ng.WorkerRequestOptions = function() {};

/**
 * Reject the request after this many milliseconds. Defaults to 30 seconds.
 * @type {(number|undefined)}
 */
ng.WorkerRequestOptions.prototype.timeout;

/**
 * Abort the request without terminating the worker.
 * @type {(!AbortSignal|undefined)}
 */
ng.WorkerRequestOptions.prototype.signal;

/**
 * Transfer ownership of values contained by the request payload.
 * @type {(!Array<!Object>|undefined)}
 */
ng.WorkerRequestOptions.prototype.transfer;

/**
 * Public AngularTS WorkerResponse contract exposed through the global ng namespace for Closure-annotated applications.
 * @template TResult
 * @record
 */
ng.WorkerResponse = function() {};

/**
 * Public WorkerResponse.type member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.WorkerResponse.prototype.type;

/**
 * Public WorkerResponse.id member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.WorkerResponse.prototype.id;

/**
 * Public WorkerResponse.ok member exposed by the AngularTS namespace contract.
 * @type {boolean}
 */
ng.WorkerResponse.prototype.ok;

/**
 * Lifecycle state exposed by a managed {@link WorkerHandle}.
 * @typedef {string}
 */
ng.WorkerStatus;

/**
 * Public AngularTS WasmBinding contract exposed through the global ng namespace for Closure-annotated applications.
 * @template TTarget
 * @record
 */
ng.WasmBinding = function() {};

/**
 * Public WasmBinding.name member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.WasmBinding.prototype.name;

/**
 * Public WasmBinding.target member exposed by the AngularTS namespace contract.
 * @type {TTarget}
 */
ng.WasmBinding.prototype.target;

/**
 * Public WasmBinding.disposed member exposed by the AngularTS namespace contract.
 * @type {boolean}
 */
ng.WasmBinding.prototype.disposed;

/**
 * Public WasmBinding.dispose member exposed by the AngularTS namespace contract.
 * @return {void}
 */
ng.WasmBinding.prototype.dispose = function() {};

/**
 * Options for binding one reactive target to a WebAssembly guest.
 * @record
 */
ng.WasmBindingOptions = function() {};

/**
 * Stable name exposed to the guest.
 * @type {(string|undefined)}
 */
ng.WasmBindingOptions.prototype.name;

/**
 * Reactive paths delivered to the guest's update callback.
 * @type {(!Array<string>|undefined)}
 */
ng.WasmBindingOptions.prototype.watch;

/**
 * Deliver each watched path's current value when binding. Defaults to `true`.
 * @type {(boolean|undefined)}
 */
ng.WasmBindingOptions.prototype.initial;

/**
 * Standard WebAssembly compilation options forwarded without translation.
 * @record
 */
ng.WasmCompileOptions = function() {};

/**
 * Native WebAssembly builtin modules enabled while compiling.
 * @type {(!Array<string>|undefined)}
 */
ng.WasmCompileOptions.prototype.builtins;

/**
 * Native module name used for imported global string constants.
 * @type {(string|undefined)}
 */
ng.WasmCompileOptions.prototype.importedStringConstants;

/**
 * Structured error raised by the high-level WebAssembly host.
 * @record
 */
ng.WasmError = function() {};

/**
 * Public WasmError.code member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.WasmError.prototype.code;

/**
 * Public WasmError.source member exposed by the AngularTS namespace contract.
 * @type {(!Object|string|undefined)}
 */
ng.WasmError.prototype.source;

/**
 * Public WasmError.stage member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.WasmError.prototype.stage;

/**
 * Error categories reported by the high-level WebAssembly host.
 * @typedef {string}
 */
ng.WasmErrorCode;

/**
 * Lifecycle stage at which a WebAssembly operation failed.
 * @typedef {string}
 */
ng.WasmErrorStage;

/**
 * Declarative options for loading one WebAssembly module.
 * @record
 */
ng.WasmLoadOptions = function() {};

/**
 * URL, request, response, bytes, or compiled WebAssembly module.
 * @type {(!Object|string)}
 */
ng.WasmLoadOptions.prototype.source;

/**
 * Imports supplied in addition to the AngularTS reactive ABI.
 * @type {(!Object<string, !Object<string, (!Object|number)>>|undefined)}
 */
ng.WasmLoadOptions.prototype.imports;

/**
 * Standard options forwarded to WebAssembly compilation.
 * @type {(!ng.WasmCompileOptions|undefined)}
 */
ng.WasmLoadOptions.prototype.compile;

/**
 * Publish lifecycle timing entries through the browser Performance API.
 * @type {(boolean|undefined)}
 */
ng.WasmLoadOptions.prototype.diagnostics;

/**
 * Public AngularTS WasmResource contract exposed through the global ng namespace for Closure-annotated applications.
 * @template TExports
 * @record
 */
ng.WasmResource = function() {};

/**
 * Public WasmResource.source member exposed by the AngularTS namespace contract.
 * @type {(!Object|string)}
 */
ng.WasmResource.prototype.source;

/**
 * Public WasmResource.status member exposed by the AngularTS namespace contract.
 * @type {string}
 */
ng.WasmResource.prototype.status;

/**
 * Public WasmResource.ready member exposed by the AngularTS namespace contract.
 * @type {!Promise<!ng.WasmResource<TExports>>}
 */
ng.WasmResource.prototype.ready;

/**
 * Public WasmResource.error member exposed by the AngularTS namespace contract.
 * @type {(!ng.WasmError|undefined)}
 */
ng.WasmResource.prototype.error;

/**
 * Public WasmResource.instance member exposed by the AngularTS namespace contract.
 * @type {!Object}
 */
ng.WasmResource.prototype.instance;

/**
 * Public WasmResource.module member exposed by the AngularTS namespace contract.
 * @type {!Object}
 */
ng.WasmResource.prototype.module;

/**
 * Public WasmResource.exports member exposed by the AngularTS namespace contract.
 * @type {TExports}
 */
ng.WasmResource.prototype.exports;

/**
 * Public WasmResource.disposed member exposed by the AngularTS namespace contract.
 * @type {boolean}
 */
ng.WasmResource.prototype.disposed;

/**
 * Public WasmResource.bind member exposed by the AngularTS namespace contract.
 * @template TTarget
 * @param {TTarget} target
 * @param {(!ng.WasmBindingOptions|undefined)} options
 * @return {!Promise<!ng.WasmBinding<TTarget>>}
 */
ng.WasmResource.prototype.bind = function(target, options) {};

/**
 * Public WasmResource.dispose member exposed by the AngularTS namespace contract.
 * @return {void}
 */
ng.WasmResource.prototype.dispose = function() {};

/**
 * Lifecycle state of a WebAssembly resource.
 * @typedef {string}
 */
ng.WasmResourceStatus;

/**
 * High-level WebAssembly host service.
 * @record
 */
ng.WasmService = function() {};

/**
 * Loads one module and returns its owned resource.
 * @template TExports
 * @param {!ng.WasmLoadOptions} options
 * @return {!ng.WasmResource<TExports>}
 */
ng.WasmService.prototype.load = function(options) {};

/**
 * Source accepted by the WebAssembly loader.
 * @typedef {(!Object|string)}
 */
ng.WasmSource;

/**
 * Scope class for the Proxy. It intercepts operations like property access (get) and property setting (set), and adds support for deep change tracking and observer-like behavior.
 * @record
 */
ng.WasmTarget = function() {};

/**
 * Public WasmTarget.$proxy member exposed by the AngularTS namespace contract.
 * @type {!ng.Scope}
 */
ng.WasmTarget.prototype.$proxy;

/**
 * Public WasmTarget.$handler member exposed by the AngularTS namespace contract.
 * @type {?}
 */
ng.WasmTarget.prototype.$handler;

/**
 * Public WasmTarget.$target member exposed by the AngularTS namespace contract.
 * @type {!Object}
 */
ng.WasmTarget.prototype.$target;

/**
 * Public WasmTarget.$id member exposed by the AngularTS namespace contract.
 * @type {number}
 */
ng.WasmTarget.prototype.$id;

/**
 * Public WasmTarget.$root member exposed by the AngularTS namespace contract.
 * @type {!ng.Scope}
 */
ng.WasmTarget.prototype.$root;

/**
 * Public WasmTarget.$parent member exposed by the AngularTS namespace contract.
 * @type {(!ng.Scope|undefined)}
 */
ng.WasmTarget.prototype.$parent;

/**
 * Public WasmTarget.$scopename member exposed by the AngularTS namespace contract.
 * @type {(string|undefined)}
 */
ng.WasmTarget.prototype.$scopename;

/**
 * Intercepts and handles property assignments on the target object. Scopeable objects are stored as raw model values and proxied lazily when read.
 * @param {!Object} target
 * @param {string} property
 * @param {?} value
 * @param {!ng.Scope} proxy
 * @return {boolean}
 */
ng.WasmTarget.prototype.set = function(target, property, value, proxy) {};

/**
 * Intercepts property access on the target object. It checks for specific properties (`watch` and `sync`) and binds their methods. For other properties, it returns the value directly.
 * @param {!Object} target
 * @param {(number|string|symbol)} property
 * @param {!ng.Scope} proxy
 * @return {?}
 */
ng.WasmTarget.prototype.get = function(target, property, proxy) {};

/**
 * Public WasmTarget.deleteProperty member exposed by the AngularTS namespace contract.
 * @param {!Object} target
 * @param {(number|string|symbol)} property
 * @return {boolean}
 */
ng.WasmTarget.prototype.deleteProperty = function(target, property) {};

/**
 * Runs synchronous scope mutations as one batch. Listener notifications are queued while the callback runs and flushed once after the outermost batch exits. Mutations are not rolled back if the callback throws.
 * @template T
 * @param {function(): T} fn
 * @return {T}
 */
ng.WasmTarget.prototype.$batch = function(fn) {};

/**
 * Registers a watcher for a property along with a listener function. The listener function is invoked when changes to that property are detected.
 * @param {string} watchProp
 * @param {(function((?|undefined), (?|undefined)): void|undefined)} listenerFn
 * @param {(boolean|undefined)} lazy
 * @return {(function(): void|undefined)}
 */
ng.WasmTarget.prototype.$watch = function(watchProp, listenerFn, lazy) {};

/**
 * Creates a prototypically inherited child scope.
 * @param {(!ng.Scope|undefined)} childInstance
 * @return {!ng.Scope}
 */
ng.WasmTarget.prototype.$new = function(childInstance) {};

/**
 * Creates an isolate child scope that does not inherit watchable properties directly.
 * @param {(!ng.Scope|undefined)} instance
 * @return {!ng.Scope}
 */
ng.WasmTarget.prototype.$newIsolate = function(instance) {};

/**
 * Creates a transcluded child scope linked to this scope and an optional parent instance.
 * @param {(!ng.Scope|undefined)} parentInstance
 * @return {!ng.Scope}
 */
ng.WasmTarget.prototype.$transcluded = function(parentInstance) {};

/**
 * Merges enumerable properties from the provided object into the current scope target.
 * @param {?} newTarget
 * @return {void}
 */
ng.WasmTarget.prototype.$merge = function(newTarget) {};

/**
 * Registers an event listener on this scope and returns a deregistration function.
 * @param {string} name
 * @param {function(...?): ?} listener
 * @return {function(): void}
 */
ng.WasmTarget.prototype.$on = function(name, listener) {};

/**
 * Emits an event upward through the scope hierarchy.
 * @param {string} name
 * @param {...?} var_args
 * @return {!ng.ScopeEvent}
 */
ng.WasmTarget.prototype.$emit = function(name, var_args) {};

/**
 * Broadcasts an event downward through the scope hierarchy.
 * @param {string} name
 * @param {...?} var_args
 * @return {!ng.ScopeEvent}
 */
ng.WasmTarget.prototype.$broadcast = function(name, var_args) {};

/**
 * Public WasmTarget.$destroy member exposed by the AngularTS namespace contract.
 * @return {void}
 */
ng.WasmTarget.prototype.$destroy = function() {};

/**
 * Searches this scope tree for a scope with the given id.
 * @param {(number|string)} id
 * @return {(!ng.Scope|undefined)}
 */
ng.WasmTarget.prototype.$getById = function(id) {};

/**
 * Searches the scope tree for a scope registered under the provided name.
 * @param {string} name
 * @return {(!ng.Scope|undefined)}
 */
ng.WasmTarget.prototype.$searchByName = function(name) {};
