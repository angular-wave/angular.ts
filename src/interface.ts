export * from "./animations/interface.ts";
export * from "./services/http/interface.ts";
export * from "./services/log/interface.ts";
export * from "./services/log/log.js";
export * from "./services/location/interface.ts";
export * from "./services/location/location.js";
export * from "./services/pubsub/pubsub.js";
export * from "./services/template-cache/template-cache.js";
export * from "./index.js";
export * from "./angular.js";
export * from "./core/di/internal-injector.js";
export * from "./core/scope/scope.js";
export * from "./services/cookie/cookie.js";
export * from "./services/cookie/interface.ts";
export * from "./services/exception/exception.ts";
export * from "./services/exception/interface.ts";
export * from "./core/parse/interface.ts";

export * from "./filters/interface.ts";
export * from "./core/filter/filter.js";

import { Attributes } from "./core/compile/attributes.js";
import { Scope } from "./core/scope/scope.js";
import { NgModelController } from "./directive/model/model.js";

/**
 * Configuration options for the AngularTS bootstrap process.
 *
 * @property strictDi - If `true`, disables automatic function annotation
 * for the application. This helps identify code that breaks under minification.
 * Defaults to `false`.
 */
export interface AngularBootstrapConfig {
  /**
   * Disable automatic function annotation for the application.
   * This helps find bugs that would break under minified code.
   * Defaults to `false`.
   */
  strictDi?: boolean;
}

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

export type ExpandoStore = {
  data: { [key: string]: any };
};

/**
 * Dependency-annotated factory array used by AngularTS DI system.
 *
 * Example:
 * ['dep1', 'dep2', (dep1, dep2) => new MyController(dep1, dep2)]
 */
export type AnnotatedFactory<TFunction extends (...args: any[]) => any> = [
  ...string[],
  TFunction,
];

/**
 * A class (constructor function) that can be instantiated.
 */
export type InjectableClass<TInstance = any> = new (...args: any) => TInstance;

/**
 * A factory that can be:
 * - a standalone function,
 * - a dependency-annotated array,
 * - or a class constructor.
 *
 * Parentheses are required around constructor types when used in unions.
 */
export type FactoryFunction<T> = T extends abstract new (...args: any[]) => any
  ? (...args: ConstructorParameters<T>) => InstanceType<T>
  : T;

export type Injectable<
  T extends ((...args: any[]) => any) | (abstract new (...args: any[]) => any),
> =
  | AnnotatedFactory<FactoryFunction<T>>
  | (T extends abstract new (...args: any[]) => any
      ? InjectableClass<InstanceType<T>>
      : never)
  | T;

export interface ServiceProviderClass {
  new (...args: any[]): ServiceProvider;
}

export interface ServiceProviderFactory {
  (...args: any[]): ServiceProvider;
}

/**
 * An object that defines how a service is constructed.
 *
 * It must define a `$get` property that provides the instance of the service,
 * either as a plain factory function or as an {@link AnnotatedFactory}.
 */
export interface ServiceProvider {
  $get: Injectable<any>;
}

/**
 * The API for registering different types of providers with the injector.
 *
 * This interface is used within AngularTS's `$provide` service to define
 * services, factories, constants, values, decorators, etc.
 */
export interface Provider {
  /**
   * Register a directive
   * @param name - The name of the directive.
   * @param directive - An object with a `$get` property that defines how the service is created.
   */
  directive(name: string, directive: DirectiveFactory): Provider;

  /**
   * Register multiple directives
   * @param obj
   */
  directive(obj: Record<string, DirectiveFactory>): Provider;

  /**
   * Register a service provider.
   * @param name - The name of the service.
   * @param provider - An object with a `$get` property that defines how the service is created.
   */
  provider(name: string, provider: Function): Provider;

  /**
   * Register multiple service providers
   * @param obj
   */
  provider(obj: Record<string, Function>): Provider;

  /**
   * Register a factory function to create a service.
   * @param name - The name of the service.
   * @param factoryFn - A function (or annotated array) that returns the service instance.
   */
  factory(name: string, factoryFn: Injectable<any>): Provider;

  /**
   * Register a constructor function to create a service.
   * @param name - The name of the service.
   * @param constructor - A class or function to instantiate.
   */
  service(name: string, constructor: Injectable<any>): Provider;

  /**
   * Register a fixed value as a service.
   * @param name - The name of the service.
   * @param val - The value to use.
   */
  value(name: string, val: any): Provider;

  /**
   * Register a constant service, such as a string, a number, an array, an object or a function, with the $injector. Unlike value it can be injected into a module configuration function (see config) and it cannot be overridden by an Angular decorator.
   * @param name - The name of the constant.
   * @param val - The constant value.
   */
  constant(name: string, val: any): Provider;

  /**
   * Register a decorator function to modify or replace an existing service.
   * @param name - The name of the service to decorate.
   * @param fn - A function that takes `$delegate` and returns a decorated service.
   */
  decorator(name: string, fn: Function): Provider;
}

/**
 * A controller constructor function used in AngularTS.
 */
export type ControllerConstructor =
  | (new (...args: any[]) => Controller)
  | ((...args: any[]) => void | Controller);

/**
 * Describes the changes in component bindings during `$onChanges`.
 */
export interface ChangesObject<T = any> {
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
   * properties that have changed, and the values are an {@link IChangesObject} object  of the form
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
 * AngularTS component lifecycle interface.
 * Directive controllers have a well-defined lifecycle. Each controller can implement "lifecycle hooks". These are methods that
 * will be called by Angular at certain points in the life cycle of the directive.
 * https://docs.angularjs.org/api/ng/service/$compile#life-cycle-hooks
 * https://docs.angularjs.org/guide/component
 */
export interface Controller {
  // Controller implementations frequently do not implement any of its methods.
  // A string indexer indicates to TypeScript not to issue a weak type error in this case.
  [s: string]: any;
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
   * properties that have changed, and the values are an {@link IChangesObject} object  of the form
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
}

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
   * $attrs - Current attributes object for the element
   * Use the array form to define dependencies (necessary if strictDi is enabled and you require dependency injection)
   */
  template?: string | Injectable<(...args: any[]) => string> | undefined;
  /**
   * Path or function that returns a path to an html template that should be used as the contents of this component.
   * If templateUrl is a function, then it is injected with the following locals:
   * $element - Current element
   * $attrs - Current attributes object for the element
   * Use the array form to define dependencies (necessary if strictDi is enabled and you require dependency injection)
   */
  templateUrl?: string | Injectable<(...args: any[]) => string> | undefined;
  /**
   * Define DOM attribute binding to component properties. Component properties are always bound to the component
   * controller and not to the scope.
   */
  bindings?: { [boundProperty: string]: string } | undefined;
  /**
   * Whether transclusion is enabled. Disabled by default.
   */
  transclude?: boolean | { [slot: string]: string } | undefined;
  /**
   * Requires the controllers of other directives and binds them to this component's controller.
   * The object keys specify the property names under which the required controllers (object values) will be bound.
   * Note that the required controllers will not be available during the instantiation of the controller,
   * but they are guaranteed to be available just before the $onInit method is executed!
   */
  require?: { [controller: string]: string } | undefined;
}

/**
 * A controller instance or object map used in directives.
 */
export type DirectiveController =
  | Controller
  | Controller[]
  | { [key: string]: Controller };

/**
 * Represents a controller used within directive link functions.
 */
export type TController<T> = DirectiveController | NgModelController | T;

/**
 * Defines optional pre/post link functions in directive compile phase.
 */
export interface DirectivePrePost {
  pre?: DirectiveLinkFn<any>;
  post?: DirectiveLinkFn<any>;
}

/**
 * A link function executed during directive linking.
 */
export type DirectiveLinkFn<T> = (
  scope: Scope,
  element: HTMLElement,
  attrs: Attributes & Record<string, any>,
  controller?: TController<T>,
  transclude?: (...args: any[]) => any,
) => void;

/**
 * A compile function used to prepare directives before linking.
 */
export type DirectiveCompileFn = (
  templateElement: HTMLElement,
  templateAttributes: Attributes & Record<string, any>,
  transclude?: (...args: any[]) => any,
) => void | DirectiveLinkFn<any> | DirectivePrePost;

/**
 * Defines the structure of an AngularTS directive.
 */
export interface Directive<TController = any> {
  /** Optional name (usually inferred) */
  name?: string;
  /** Restrict option: 'A' and/or 'E'. Defaults to 'EA' if not defined */
  restrict?: string;
  /** Compile function for the directive */
  compile?: DirectiveCompileFn;
  /** Controller constructor or injectable string name */
  controller?: string | Injectable<any> | any;
  /** Alias name for the controller in templates */
  controllerAs?: string;
  /** Whether to bind scope to controller */
  bindToController?: boolean | Record<string, string>;
  /** Link function(s) executed during linking */
  link?: DirectiveLinkFn<TController> | DirectivePrePost;
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
  template?: string | ((element: Element, attrs: Attributes) => string);
  /** Template namespace (e.g., SVG, HTML) */
  templateNamespace?: string;
  /** Template URL for loading from server */
  templateUrl?: string | ((element: Element, attrs: Attributes) => string);
  /** Enables transclusion or configures named slots */
  transclude?: boolean | string | Record<string, string>;
  /** Internal hook for directive compilation state */
  $$addStateInfo?: (...args: any[]) => any;
  count?: number;
}

export type DirectiveFactoryFn = (
  ...args: any[]
) => Directive | DirectiveLinkFn<any>;

export type AnnotatedDirectiveFactory = Array<string | DirectiveFactoryFn>;

export type DirectiveFactory = DirectiveFactoryFn | AnnotatedDirectiveFactory;

/**
 * Represents advanced transclusion functions used in directives.
 */
export interface TranscludeFunctionObject {
  /** Transcludes content with a new scope */
  transcludeWithScope(
    scope: Scope,
    cloneAttachFn: CloneAttachFunction,
    element?: Element,
    slotName?: string,
  ): Element;
  /** Transcludes content without creating a new scope */
  transcludeWithoutScope(
    cloneAttachFn?: CloneAttachFunction,
    element?: Element,
    slotName?: string,
  ): Element;
  /** Checks if a named slot is filled */
  isSlotFilled(slotName: string): boolean;
}

/**
 * Callback used when transcluded content is cloned.
 */
export type CloneAttachFunction = (
  clonedElement?: Element,
  scope?: Scope,
) => any;

/**
 * Configuration for ngModel behavior.
 */
export interface NgModelOptions {
  /** Space-separated event names that trigger updates */
  updateOn?: string;
  /** Delay in milliseconds or event-specific debounce times */
  debounce?: number | Record<string, number>;
  /** Whether to allow invalid values */
  allowInvalid?: boolean;
  /** Enables getter/setter style ngModel */
  getterSetter?: boolean;
  /** Timezone used for Date objects */
  timezone?: string;
  /** Time display format including seconds */
  timeSecondsFormat?: string;
  /** Whether to remove trailing :00 seconds */
  timeStripZeroSeconds?: boolean;
}

export interface RootElementService extends Element {}

/**
 * The minimal local definitions required by $controller(ctrl, locals) calls.
 */
export interface ControllerLocals {
  $scope: Scope;
  $element: Element;
}
