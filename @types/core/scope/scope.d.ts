/**
 * @private
 * Creates a deep proxy for the target object, intercepting property changes
 * and recursively applying proxies to nested objects.
 *
 * @param {Object & {$nonscope?: import("./interface.ts").NonScope} & Record<string, any>} target - The object to be wrapped in a proxy.
 * @param {Scope} [context] - The context for the handler, used to track listeners.
 * @returns {Scope|Object} - A proxy that intercepts operations on the target object,
 *                                     or the original value if the target is not an object.
 */
export function createScope(
  target?: any & {
    $nonscope?: import("./interface.ts").NonScope;
  } & Record<string, any>,
  context?: Scope,
): Scope | any;
/**
 * Checks if a target should be excluded from scope observability
 * @param {any} target
 * @returns {boolean}
 */
export function isNonScope(target: any): boolean;
/** @ignore @type {Function[]} */
export const $postUpdateQueue: Function[];
export class RootScopeProvider {
  rootScope: any;
  $get: (
    | string
    | ((
        exceptionHandler: ng.ExceptionHandlerService,
        parse: ng.ParseService,
      ) => any)
  )[];
}
/**
 * Scope class for the Proxy. It intercepts operations like property access (get)
 * and property setting (set), and adds support for deep change tracking and
 * observer-like behavior.
 * @extends {Record<string, any>}
 */
export class Scope {
  /**
   * Initializes the handler with the target object and a context.
   *
   * @param {Scope} [context] - The context containing listeners.
   * @param {Scope} [parent] - Custom parent.
   */
  constructor(context?: Scope, parent?: Scope);
  /** @ignore @type {Map<string, Array<import('./interface.ts').Listener>>} Watch listeners */
  _watchers: Map<string, Array<import("./interface.ts").Listener>>;
  /** @private @type {Map<String, Function[]>} Event listeners */
  private _listeners;
  /** @private @type {Map<string, Array<import('./interface.ts').Listener>>} Watch listeners from other proxies */
  private _foreignListeners;
  /** @private @type {Set<Proxy<ng.Scope>>} */
  private _foreignProxies;
  /** @private @type {WeakMap<Object, Array<string>>} */
  private _objectListeners;
  /** @type {Proxy<Scope>} Current proxy being operated on */
  $proxy: ProxyConstructor;
  /** @type {Scope} This is the reference to the Scope object with acts as the actual proxy */
  $handler: Scope;
  /** @type {*} Current target being called on */
  $target: any;
  /**
   * @ignore @type {Scope[]}
   */
  _children: Scope[];
  /**
   * @type {number} Unique model ID (monotonically increasing) useful for debugging.
   */
  $id: number;
  /**
   * @type {ng.RootScopeService}
   */
  $root: ng.RootScopeService;
  /**
   * @type {Scope | undefined}
   */
  $parent: Scope | undefined;
  /** @ignore @type {boolean} */
  _destroyed: boolean;
  /** @private @type {import("./interface.ts").Listener[]} A list of scheduled Event listeners */
  private _scheduled;
  $scopename: any;
  /** @private */
  /** @type {Record<any, any>} */
  propertyMap: Record<any, any>;
  /**
   * Intercepts and handles property assignments on the target object. If a new value is
   * an object, it will be recursively proxied.
   *
   * @param {Object & Record<string, any>} target - The target object.
   * @param {string} property - The name of the property being set.
   * @param {*} value - The new value being assigned to the property.
   * @param {Proxy<Scope>} proxy - The proxy intercepting property access
   * @returns {boolean} - Returns true to indicate success of the operation.
   */
  set(
    target: any & Record<string, any>,
    property: string,
    value: any,
    proxy: ProxyConstructor,
  ): boolean;
  /**
   * Intercepts property access on the target object. It checks for specific
   * properties (`watch` and `sync`) and binds their methods. For other properties,
   * it returns the value directly.
   *
   * @param {Object & Record<string, any>} target - The target object.
   * @param {string|number|symbol} property - The name of the property being accessed.
   * @param {Proxy<Scope>} proxy - The proxy object being invoked
   * @returns {*} - The value of the property or a method if accessing `watch` or `sync`.
   */
  get(
    target: any & Record<string, any>,
    property: string | number | symbol,
    proxy: ProxyConstructor,
  ): any;
  /**
   * @param {Object & Record<string, any>} target - The target object.
   * @param {string} property - The name of the property being deleted
   */
  deleteProperty(target: any & Record<string, any>, property: string): boolean;
  /**
   * Registers a watcher for a property along with a listener function. The listener
   * function is invoked when changes to that property are detected.
   *
   * @param {string} watchProp - An expression to be watched in the context of this model.
   * @param {ng.ListenerFn} [listenerFn] - A function to execute when changes are detected on watched context.
   * @param {boolean} [lazy] - A flag to indicate if the listener should be invoked immediately. Defaults to false.
   */
  $watch(
    watchProp: string,
    listenerFn?: ng.ListenerFn,
    lazy?: boolean,
  ): () => void;
  /**
   * @param {ng.Scope} [childInstance]
   * @returns {Proxy<ng.Scope> & ng.Scope}
   */
  $new(childInstance?: ng.Scope): ProxyConstructor & ng.Scope;
  /**
   * @param {ng.Scope} [instance]
   * @returns {Proxy<ng.Scope> & ng.Scope}
   */
  $newIsolate(instance?: ng.Scope): ProxyConstructor & ng.Scope;
  /**
   * @param {ng.Scope} parentInstance
   * @returns {Proxy<ng.Scope> & ng.Scope}
   */
  $transcluded(parentInstance: ng.Scope): ProxyConstructor & ng.Scope;
  /**
   * @param {string} key
   * @param {import("./interface.ts").Listener} listener
   */
  _registerForeignKey(
    key: string,
    listener: import("./interface.ts").Listener,
  ): void;
  /**
   * @param {string} key
   * @param {number} id
   */
  _deregisterForeignKey(key: string, id: number): boolean;
  /**
   * Evaluates an Angular expression in the context of this scope.
   *
   * @param {string} expr - Angular expression to evaluate
   * @param {Record<string, any>} [locals] - Optional local variables
   * @returns {any}
   */
  $eval(expr: string, locals?: Record<string, any>): any;
  /**
   * @param {Object} newTarget
   */
  $merge(newTarget: any): void;
  /**
   * @param {ng.Expression} expr
   * @returns {any}
   */
  $apply(expr: ng.Expression): any;
  /**
   * @param {string} name
   * @param {Function} listener
   * @returns {(function(): void)|*}
   */
  $on(name: string, listener: Function): (() => void) | any;
  /**
   * @param {string} name
   * @param  {...any} args
   * @returns {ng.ScopeEvent | undefined}
   */
  $emit(name: string, ...args: any[]): ng.ScopeEvent | undefined;
  /**
   * @param {string} name
   * @param  {...any} args
   * @returns {any}
   */
  $broadcast(name: string, ...args: any[]): any;
  /**
   * @param {Function} fn
   */
  $postUpdate(fn: Function): void;
  $destroy(): void;
  $flushQueue(): void;
  /**
   * Searches the scope instance
   *
   * @param {string|number}id
   * @returns {Scope|undefined}
   */
  $getById(id: string | number): Scope | undefined;
  /**
   * @param {string} name
   * @returns {ng.Scope|undefined}
   */
  $searchByName(name: string): ng.Scope | undefined;
  #private;
}
export type ExpressionNode = import("../parse/ast/ast-node.ts").ExpressionNode;
export type LiteralNode = import("../parse/ast/ast-node.ts").LiteralNode;
export type BodyNode = import("../parse/ast/ast-node.ts").BodyNode;
export type ArrayNode = import("../parse/ast/ast-node.ts").ArrayNode;
export type ObjectNode = import("../parse/ast/ast-node.ts").ObjectNode;
export type ObjectPropertyNode =
  import("../parse/ast/ast-node.ts").ObjectPropertyNode;
