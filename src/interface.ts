import type {
  BoundTranscludeFn,
  ChildTranscludeOrLinkFn,
  CloneAttachFn,
  LinkFn,
  TemplateLinkingFunctionOptions as CompileTemplateLinkingFunctionOptions,
} from "./core/compile/compile.ts";
import {
  _anchorScroll,
  _angular,
  _animate,
  _aria,
  _compile,
  _controller,
  _cookie,
  _document,
  _element,
  _eventBus,
  _exceptionHandler,
  _filter,
  _htmlCanvas,
  _http,
  _httpParamSerializer,
  _injector,
  _interpolate,
  _location,
  _log,
  _machine,
  _parse,
  _rest,
  _rootElement,
  _rootScope,
  _sce,
  _sceDelegate,
  _scope,
  _security,
  _serviceWorker,
  _sse,
  _state,
  _stateRegistry,
  _stream,
  _templateCache,
  _templateRequest,
  _transitions,
  _wasm,
  _webComponent,
  _websocket,
  _webTransport,
  _window,
  _workflow,
  _worker,
} from "./injection-tokens.ts";
type Dynamic = ReturnType<typeof JSON.parse>;

export type Constructor<T = unknown> = new (...args: Dynamic[]) => T;

/**
 * Public injectable contracts keyed by their canonical runtime token.
 *
 * Every single-dollar token exposed by [[PublicInjectionTokens]] must map to a
 * named, documented contract here. Double-dollar framework internals are
 * intentionally excluded.
 */
export interface InjectionTokenMap {
  $angular: ng.AngularService;
  $scope: ng.ScopeService;
  $element: ng.ElementService;
  $anchorScroll: ng.AnchorScrollService;
  $animate: ng.AnimateService;
  $aria: ng.AriaService;
  $compile: ng.CompileService;
  $controller: ng.ControllerService;
  $cookie: ng.CookieService;
  $document: ng.DocumentService;
  $eventBus: ng.EventBusService;
  $exceptionHandler: ng.ExceptionHandlerService;
  $filter: ng.FilterService;
  $htmlCanvas: ng.HtmlCanvasService;
  $http: ng.HttpService;
  $httpParamSerializer: ng.HttpParamSerializerService;
  $injector: ng.InjectorService;
  $interpolate: ng.InterpolateService;
  $location: ng.LocationService;
  $log: ng.LogService;
  $machine: ng.MachineService;
  $parse: ng.ParseService;
  $rest: ng.RestFactory;
  $rootElement: ng.RootElementService;
  $rootScope: ng.RootScopeService;
  $sce: ng.SceService;
  $sceDelegate: ng.SceDelegateService;
  $security: ng.SecurityPolicy;
  $serviceWorker: ng.ServiceWorkerService;
  $sse: ng.SseService;
  $state: ng.StateService;
  $stateRegistry: ng.StateRegistryService;
  $stream: ng.StreamService;
  $templateCache: ng.TemplateCacheService;
  $templateRequest: ng.TemplateRequestService;
  $transitions: ng.TransitionsService;
  $wasm: ng.WasmService;
  $webComponent: ng.WebComponentService;
  $websocket: ng.WebSocketService;
  $webTransport: ng.WebTransportService;
  $window: ng.WindowService;
  $workflow: ng.WorkflowService;
  $worker: ng.WorkerService;
}

export const PublicInjectionTokens = {
  $angular: _angular,
  $scope: _scope,
  $element: _element,
  $anchorScroll: _anchorScroll,
  $animate: _animate,
  $aria: _aria,
  $compile: _compile,
  $cookie: _cookie,
  $controller: _controller,
  $document: _document,
  $eventBus: _eventBus,
  $exceptionHandler: _exceptionHandler,
  $filter: _filter,
  $htmlCanvas: _htmlCanvas,
  $http: _http,
  $httpParamSerializer: _httpParamSerializer,
  $interpolate: _interpolate,
  $location: _location,
  $log: _log,
  $machine: _machine,
  $parse: _parse,
  $rest: _rest,
  $rootScope: _rootScope,
  $rootElement: _rootElement,
  $sce: _sce,
  $sceDelegate: _sceDelegate,
  $security: _security,
  $serviceWorker: _serviceWorker,
  $state: _state,
  $stateRegistry: _stateRegistry,
  $stream: _stream,
  $sse: _sse,
  $templateCache: _templateCache,
  $templateRequest: _templateRequest,
  $transitions: _transitions,
  $window: _window,
  $webComponent: _webComponent,
  $webTransport: _webTransport,
  $websocket: _websocket,
  $worker: _worker,
  $wasm: _wasm,
  $workflow: _workflow,
  $injector: _injector,
} as const;

type PublicInjectionTokenParity = [
  Exclude<keyof InjectionTokenMap, keyof typeof PublicInjectionTokens>,
  Exclude<keyof typeof PublicInjectionTokens, keyof InjectionTokenMap>,
] extends [never, never]
  ? true
  : never;

const publicInjectionTokenParity: PublicInjectionTokenParity = true;

void publicInjectionTokenParity;

/**
 * A JavaScript expression represented as a string, typically used in interpolation bindings.
 *
 * Example:
 * ```html
 * <span title="{{ attrBinding }}">{{ textBinding }}</span>
 * ```
 *
 */
export type Expression = string;

export type ExpandoStore = Record<string, unknown>;

/**
 * Boolean class map consumed by `ng-class`.
 *
 * Each key is a CSS class name. Truthy values add the class; `false`, `null`,
 * and `undefined` remove it.
 */
export type ClassMap = Record<string, boolean | null | undefined>;

/**
 * Public shape accepted by `ng-class` for class binding expressions.
 */
export type ClassValue =
  | string
  | ClassMap
  | readonly (string | ClassMap | null | undefined)[]
  | null
  | undefined;

/**
 * Dependency-annotated factory array used by AngularTS DI system.
 *
 * Example:
 * ['dep1', 'dep2', (dep1, dep2) => new MyController(dep1, dep2)]
 */
export type AnnotatedFactory<
  TFunction extends (...args: Dynamic[]) => unknown,
> = [...string[], TFunction];

/**
 * A class (constructor function) that can be instantiated.
 */
export type InjectableClass<TInstance = unknown> = new (
  ...args: Dynamic[]
) => TInstance;

/**
 * A factory that can be:
 * - a standalone function,
 * - a dependency-annotated array,
 * - or a class constructor.
 *
 * Parentheses are required around constructor types when used in unions.
 */
export type FactoryFunction<T> = T extends abstract new (
  ...args: Dynamic[]
) => unknown
  ? (...args: ConstructorParameters<T>) => InstanceType<T>
  : T;

export type Injectable<
  T extends
    | ((...args: Dynamic[]) => unknown)
    | (abstract new (...args: Dynamic[]) => unknown),
> =
  | AnnotatedFactory<FactoryFunction<T>>
  | (T extends abstract new (...args: Dynamic[]) => unknown
      ? InjectableClass<InstanceType<T>>
      : never)
  | T;

export type ServiceProviderClass = new (...args: Dynamic[]) => ServiceProvider;

export type ServiceProviderFactory = (...args: Dynamic[]) => ServiceProvider;

/**
 * An object that defines how a service is constructed.
 *
 * It must define a `$get` property that provides the instance of the service,
 * either as a plain factory function or as an {@link AnnotatedFactory}.
 */
export interface ServiceProvider {
  $get: Injectable<(...args: Dynamic[]) => unknown>;
}

/**
 * A user-defined service recipe accepted by {@link ng.NgModule.provider}.
 *
 * Object recipes define an injectable `$get` factory directly. Injectable
 * functions and classes are instantiated first and must produce an object with
 * an injectable `$get` factory.
 */
export type ProviderDefinition =
  | { $get: Injectable<(...args: Dynamic[]) => unknown> }
  | Injectable<(...args: Dynamic[]) => unknown>
  | Injectable<Constructor>;

/**
 * A controller constructor function used in AngularTS.
 */
export type ControllerConstructor =
  | (new (...args: Dynamic[]) => Controller)
  | ((...args: Dynamic[]) => undefined | Controller);

/**
 * Describes the changes in component bindings during `$onChanges`.
 */
export interface ChangesObject<T = unknown> {
  /** New value of the binding */
  currentValue: T;
  /** Whether this is the first change */
  isFirstChange: () => boolean;
}

/**
 * Mapping of binding property names to their change metadata.
 */
export type OnChangesObject = Record<string, ChangesObject>;

/**
 * Interface for the $onInit lifecycle hook
 * https://docs.angularjs.org/api/ng/service/$compile#life-cycle-hooks
 */
export interface OnInit {
  /**
   * Called on each controller after all the controllers on an element have been constructed and had their bindings
   * initialized (and before the pre & post linking functions for the directives on this element). This is a good
   * place to put initialization code for your controller.
   */
  $onInit(): void;
}

/**
 * Interface for the $onChanges lifecycle hook
 * https://docs.angularjs.org/api/ng/service/$compile#life-cycle-hooks
 */
export interface OnChanges {
  /**
   * Called whenever one-way bindings are updated. The onChangesObj is a hash whose keys are the names of the bound
   * properties that have changed, and the values are a {@link ChangesObject} object of the form
   * { currentValue, previousValue, isFirstChange() }. Use this hook to trigger updates within a component such as
   * cloning the bound value to prevent accidental mutation of the outer value.
   */
  $onChanges(onChangesObj: OnChangesObject): void;
}

/**
 * Interface for the $onDestroy lifecycle hook
 * https://docs.angularjs.org/api/ng/service/$compile#life-cycle-hooks
 */
export interface OnDestroy {
  /**
   * Called on a controller when its containing scope is destroyed. Use this hook for releasing external resources,
   * watches and event handlers.
   */
  $onDestroy(): void;
}

/**
 * Interface for the $postLink lifecycle hook
 * https://docs.angularjs.org/api/ng/service/$compile#life-cycle-hooks
 */
export interface PostLink {
  /**
   * Called after this controller's element and its children have been linked. Similar to the post-link function this
   * hook can be used to set up DOM event handlers and do direct DOM manipulation. Note that child elements that contain
   * templateUrl directives will not have been compiled and linked since they are waiting for their template to load
   * asynchronously and their own compilation and linking has been suspended until that occurs. This hook can be considered
   * analogous to the ngAfterViewInit and ngAfterContentInit hooks in Angular 2. Since the compilation process is rather
   * different in Angular 1 there is no direct mapping and care should be taken when upgrading.
   */
  $postLink(): void;
}

/**
 * Interface for the $afterRender lifecycle hook.
 */
export interface AfterRender {
  /**
   * Called after this controller has been linked, AngularTS has applied DOM
   * mutations for the current flush, and the browser has had one animation frame
   * to settle layout. External resources such as fonts and images are not waited
   * on by default.
   */
  $afterRender(): void;
}

/**
 * AngularTS component lifecycle interface.
 * Directive controllers have a well-defined lifecycle. Each controller can implement "lifecycle hooks". These are methods that
 * will be called by Angular at certain points in the life cycle of the directive.
 * https://docs.angularjs.org/api/ng/service/$compile#life-cycle-hooks
 * https://docs.angularjs.org/guide/component
 */
export type Controller = object & {
  /** Optional controller name (used in debugging) */
  name?: string;
  /**
   * Called on each controller after all the controllers on an element have been constructed and had their bindings
   * initialized (and before the pre & post linking functions for the directives on this element). This is a good
   * place to put initialization code for your controller.
   */
  $onInit?: () => void;
  /**
   * Called whenever one-way bindings are updated. The onChangesObj is a hash whose keys are the names of the bound
   * properties that have changed, and the values are a {@link ChangesObject} object of the form
   * { currentValue, previousValue, isFirstChange() }. Use this hook to trigger updates within a component such as
   * cloning the bound value to prevent accidental mutation of the outer value.
   */
  $onChanges?: (changes: OnChangesObject) => void;
  /**
   * Called on a controller when its containing scope is destroyed. Use this hook for releasing external resources,
   * watches and event handlers.
   */
  $onDestroy?: () => void;
  /**
   * Called after this controller's element and its children have been linked. Similar to the post-link function this
   * hook can be used to set up DOM event handlers and do direct DOM manipulation. Note that child elements that contain
   * templateUrl directives will not have been compiled and linked since they are waiting for their template to load
   * asynchronously and their own compilation and linking has been suspended until that occurs. This hook can be considered
   * analogous to the ngAfterViewInit and ngAfterContentInit hooks in Angular 2. Since the compilation process is rather
   * different in Angular 1 there is no direct mapping and care should be taken when upgrading.
   */
  $postLink?: () => void;
  /**
   * Called after this controller has been linked, AngularTS has applied DOM
   * mutations for the current flush, and the browser has had one animation frame
   * to settle layout. Multiple schedules for the same controller in one flush are
   * coalesced into one call.
   */
  $afterRender?: () => void;
};

/**
 * Defines a component's configuration object (a simplified directive definition object).
 */
export interface Component {
  controller?: string | Injectable<ControllerConstructor> | undefined;
  /**
   * An identifier name for a reference to the controller. If present, the controller will be published to its scope under
   * the specified name. If not present, this will default to '$ctrl'.
   */
  controllerAs?: string | undefined;
  /**
   * html template as a string or a function that returns an html template as a string which should be used as the
   * contents of this component. Empty string by default.
   * If template is a function, then it is injected with the following locals:
   * $element - Current element
   * Use the array form to define dependencies.
   */
  template?: string | Injectable<(...args: never[]) => string> | undefined;
  /**
   * Path or function that returns a path to an html template that should be used as the contents of this component.
   * If templateUrl is a function, then it is injected with the following locals:
   * $element - Current element
   * Use the array form to define dependencies.
   */
  templateUrl?: string | Injectable<(...args: never[]) => string> | undefined;
  /**
   * Define DOM attribute binding to component properties. Component properties are always bound to the component
   * controller and not to the scope.
   */
  bindings?: Record<string, string> | undefined;
  /**
   * Replaces the generated component host element with the component template.
   */
  replace?: boolean | undefined;
  /**
   * Whether transclusion is enabled. Disabled by default.
   */
  transclude?: boolean | Record<string, string> | undefined;
  /**
   * Requires the controllers of other directives and binds them to this component's controller.
   * The object keys specify the property names under which the required controllers (object values) will be bound.
   * Note that the required controllers will not be available during the instantiation of the controller,
   * but they are guaranteed to be available just before the $onInit method is executed!
   */
  require?: Record<string, string> | undefined;
}

/**
 * A controller instance or object map used in directives.
 */
export type DirectiveController =
  | Controller
  | Controller[]
  | Record<string, Controller>;

/**
 * Represents a controller used within directive link functions.
 */
export type TController<T> = T;

/**
 * Defines optional pre/post link functions in directive compile phase.
 */
export interface DirectivePrePost {
  pre?: DirectiveLinkFn<unknown>;
  post?: DirectiveLinkFn<unknown>;
}

/**
 * A link function executed during directive linking.
 */
type BivariantDirectiveLinkFn<TArgs extends unknown[]> = {
  bivarianceHack(...args: TArgs): void;
}["bivarianceHack"];

export type DirectiveLinkFn<T> =
  | BivariantDirectiveLinkFn<[scope: ng.Scope, element: HTMLElement]>
  | BivariantDirectiveLinkFn<
      [
        scope: ng.Scope,
        element: HTMLElement,
        controller: TController<T>,
        transclude?: ng.TranscludeFn,
      ]
    >
  | BivariantDirectiveLinkFn<
      [scope: ng.Scope, element: HTMLElement, transclude: ng.TranscludeFn]
    >;

/**
 * A compile function used to prepare directives before linking.
 */
export type DirectiveCompileFn = {
  bivarianceHack(
    templateElement: HTMLElement,
    transclude?: ChildTranscludeOrLinkFn,
  ): undefined | DirectiveLinkFn<unknown> | DirectivePrePost;
}["bivarianceHack"];

/**
 * Supported directive matching locations.
 */
export type DirectiveRestrict = "A" | "E" | "AE" | "EA";

/**
 * Defines the structure of an AngularTS directive.
 */
export interface Directive<TCtrl = unknown> {
  /** Optional name (usually inferred) */
  name?: string;
  /** Restrict option: 'A' and/or 'E'. Defaults to 'EA' if not defined */
  restrict?: DirectiveRestrict;
  /** Compile function for the directive */
  compile?: DirectiveCompileFn;
  /** Controller constructor or injectable string name */
  controller?: string | Injectable<ControllerConstructor>;
  /** Alias name for the controller in templates */
  controllerAs?: string;
  /** Whether to bind scope to controller */
  bindToController?: boolean | Record<string, string>;
  /** Link function(s) executed during linking */
  link?: DirectiveLinkFn<TCtrl> | DirectivePrePost;
  /** Priority of the directive */
  priority?: number;
  /** Stops further directive processing if true */
  terminal?: boolean;
  /** Replaces the element with the template if true */
  replace?: boolean;
  /** Required controllers for the directive */
  require?: string | string[] | Record<string, string>;
  /** Scope configuration (`true`, `false`, or object for isolate scope) */
  scope?: boolean | Record<string, string>;
  /** Inline template */
  template?: string | ((element: HTMLElement) => string);
  /** Template namespace (e.g., SVG, HTML) */
  templateNamespace?: string;
  /** Template URL for loading from server */
  templateUrl?: string | ((element: HTMLElement) => string);
  /** Enables transclusion or configures named slots */
  transclude?: boolean | string | Record<string, string>;
  /** Currently only used by view directive */
  count?: number;
  /** Internal hook for directive compilation state */
  /** @internal */
  _addStateInfo?: {
    bivarianceHack(...args: unknown[]): unknown;
  }["bivarianceHack"];
}

export type DirectiveFactoryFn = (
  ...args: never[]
) => Directive | DirectiveLinkFn<unknown>;

export type AnnotatedDirectiveFactory = (string | DirectiveFactoryFn)[];

export type DirectiveFactory = DirectiveFactoryFn | AnnotatedDirectiveFactory;

/**
 * Represents advanced transclusion functions used in directives.
 */
export type TranscludeFunctionObject = BoundTranscludeFn;

/**
 * Callback used when transcluded content is cloned.
 */
export type CloneAttachFunction = CloneAttachFn;

// This corresponds to the "publicLinkFn" returned by $compile.
export type TemplateLinkingFunction = LinkFn;

export type TemplateLinkingFunctionOptions =
  CompileTemplateLinkingFunctionOptions;

export interface InvocationDetail {
  expr: string;
  reply?: {
    resolve: (value: unknown) => unknown;
    reject: (reason: unknown) => PromiseLike<never>;
  };
}
