import {
  assert,
  concat,
  hasOwn,
  isDefined,
  isFunction,
  isObject,
  isProxy,
  isProxySymbol,
  isString,
  isUndefined,
  nextUid,
} from "../../shared/utils.js";
import { ASTType } from "../parse/ast-type.js";
import { $injectTokens as $t } from "../../injection-tokens.js";

/**
 * Decorator for excluding objects from scope observability
 */
export const NONSCOPE = "$nonscope";

/**
 * @type {number}
 */
let uid = 0;

export function nextId() {
  uid += 1;

  return uid;
}

/**
 * @type {ng.ParseService}
 */
let $parse;

/**@type {ng.ExceptionHandlerService} */
let $exceptionHandler;

export const $postUpdateQueue = [];

export let rootScope;

export class RootScopeProvider {
  constructor() {
    rootScope = this.rootScope = createScope();
  }

  $get = [
    $t.$exceptionHandler,
    $t.$parse,
    /**
     * @param {ng.ExceptionHandlerService} exceptionHandler
     * @param {ng.ParseService} parse
     */
    (exceptionHandler, parse) => {
      $exceptionHandler = exceptionHandler;
      $parse = parse;

      return this.rootScope;
    },
  ];
}

/**
 * Creates a deep proxy for the target object, intercepting property changes
 * and recursively applying proxies to nested objects.
 *
 * @param {Object} target - The object to be wrapped in a proxy.
 * @param {Scope} [context] - The context for the handler, used to track listeners.
 * @returns {Scope} - A proxy that intercepts operations on the target object,
 *                                     or the original value if the target is not an object.
 */
export function createScope(target = {}, context) {
  if (!isObject(target) || isNonScope(target)) return target;

  const proxy = new Proxy(target, context || new Scope());

  const keys = Object.keys(target);

  const ctorNonScope = Array.isArray(target.constructor?.$nonscope)
    ? target.constructor.$nonscope
    : null;

  const instNonScope = Array.isArray(target.$nonscope)
    ? target.$nonscope
    : null;

  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i];

    if (ctorNonScope?.includes(key) || instNonScope?.includes(key)) continue;
    target[key] = createScope(target[key], proxy.$handler);
  }

  return proxy;
}

const g = globalThis;

const proto = Object.prototype;

const { toString } = proto;

const wStr = "[object Window]";

/**
 * @ignore
 * Checks if a target should be excluded from scope observability
 * @param {any} target
 * @returns {boolean}
 */
export function isNonScope(target) {
  if (
    target[NONSCOPE] === true ||
    (target.constructor && target.constructor[NONSCOPE]) === true ||
    target === g.window ||
    target === g.document ||
    target === g.self ||
    target === g.frames ||
    target instanceof Window ||
    target instanceof Document ||
    target instanceof Element ||
    target instanceof Node ||
    target instanceof EventTarget ||
    target instanceof Promise ||
    target instanceof HTMLCollection ||
    target instanceof NodeList ||
    target instanceof Event
  ) {
    return true;
  }

  try {
    return toString.call(target) === wStr;
  } catch {
    return false;
  }
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
  constructor(context, parent) {
    this.context = context
      ? context.context
        ? context.context
        : context
      : undefined;

    /** @type {Map<string, Array<import('./interface.ts').Listener>>} Watch listeners */
    this.watchers = context ? context.watchers : new Map();

    /** @type {Map<String, Function[]>} Event listeners */
    this.$$listeners = new Map();

    /** @type {Map<string, Array<import('./interface.ts').Listener>>} Watch listeners from other proxies */
    this.foreignListeners = context ? context.foreignListeners : new Map();

    /** @type {Set<ProxyConstructor>} */
    this.foreignProxies = context ? context.foreignProxies : new Set();

    /** @type {WeakMap<Object, Array<string>>} */
    this.objectListeners = context ? context.objectListeners : new WeakMap();

    /** @type {Map<Function, {oldValue: any, fn: Function}>} */
    this.functionListeners = context ? context.functionListeners : new Map();

    /** Current proxy being operated on */
    this.$proxy = null;

    /** @type {Scope} The actual proxy */
    this.$handler = /** @type {Scope} */ (this);

    /** @type {*} Current target being called on */
    this.$target = null;

    /** @type {*} Value wrapped by the proxy */
    this.$value = null;

    /**
     * @type {Scope[]}
     */
    this.$children = [];

    /**
     * @type {number} Unique model ID (monotonically increasing) useful for debugging.
     */
    this.$id = nextId();

    /**
     * @type {Scope}
     */
    this.$root = context ? context.$root : /** @type {Scope} */ (this);

    this.$parent = parent
      ? parent
      : /** @type {Scope} */ (this).$root === /** @type {Scope} */ (this)
        ? null
        : context;

    this.filters = [];

    /** @type {boolean} */
    this.$$destroyed = false;

    this.scheduled = [];

    this.$scopename = undefined;

    /** @private */
    this.propertyMap = {
      $watch: this.$watch.bind(this),
      $new: this.$new.bind(this),
      $newIsolate: this.$newIsolate.bind(this),
      $destroy: this.$destroy.bind(this),
      $flushQueue: this.$flushQueue.bind(this),
      $eval: this.$eval.bind(this),
      $apply: this.$apply.bind(this),
      $postUpdate: this.$postUpdate.bind(this),
      $isRoot: this.#isRoot.bind(this),
      $on: this.$on.bind(this),
      $emit: this.$emit.bind(this),
      $broadcast: this.$broadcast.bind(this),
      $transcluded: this.$transcluded.bind(this),
      $handler: /** @type {Scope} */ (this),
      $merge: this.$merge.bind(this),
      $getById: this.$getById.bind(this),
      $searchByName: this.$searchByName.bind(this),
      $proxy: this.$proxy,
      $parent: this.$parent,
      $root: this.$root,
      $children: this.$children,
      $id: this.$id,
      $scopename: this.$scopename,
    };
  }

  /**
   * Intercepts and handles property assignments on the target object. If a new value is
   * an object, it will be recursively proxied.
   *
   * @param {Object} target - The target object.
   * @param {string} property - The name of the property being set.
   * @param {*} value - The new value being assigned to the property.
   * @param {Proxy} proxy - The proxy intercepting property access
   * @returns {boolean} - Returns true to indicate success of the operation.
   */
  set(target, property, value, proxy) {
    if (property === "undefined") {
      return false;
    }

    if (property === "$scopename") {
      this.$scopename = value;

      return true;
    }

    if (
      (target.constructor?.$nonscope &&
        Array.isArray(target.constructor.$nonscope) &&
        target.constructor.$nonscope.includes(property)) ||
      (target.$nonscope &&
        Array.isArray(target.$nonscope) &&
        target.$nonscope.includes(property))
    ) {
      target[property] = value;

      return true;
    }

    this.$proxy = proxy;
    this.$target = target;
    const oldValue = target[property];

    // Handle NaNs
    if (
      oldValue !== undefined &&
      Number.isNaN(oldValue) &&
      Number.isNaN(value)
    ) {
      return true;
    }

    if (oldValue && oldValue[isProxySymbol]) {
      if (Array.isArray(value)) {
        if (oldValue !== value) {
          const listeners = this.watchers.get(property);

          if (listeners) {
            this.#scheduleListener(listeners);
          }

          const foreignListeners = this.foreignListeners.get(property);

          if (foreignListeners) {
            this.#scheduleListener(foreignListeners);
          }
        }

        if (this.objectListeners.get(target[property])) {
          this.objectListeners.delete(target[property]);
        }
        target[property] = createScope(value, this);
        this.objectListeners.set(target[property], [property]);

        return true;
      }

      if (isObject(value)) {
        if (hasOwn(target, property)) {
          const keys = Object.keys(oldValue);

          for (const k of keys) {
            if (!value[k]) delete oldValue[k];
          }
        }

        if (oldValue !== value) {
          const listeners = this.watchers.get(property);

          if (listeners) {
            this.#scheduleListener(listeners);
          }

          const foreignListeners = this.foreignListeners.get(property);

          if (foreignListeners) {
            this.#scheduleListener(foreignListeners);
          }

          this.#checkeListenersForAllKeys(value);
        }
        target[property] = createScope(value, this);

        //setDeepValue(target[property], value);
        return true;
      }

      if (isUndefined(value)) {
        let called = false;

        const keys = Object.keys(oldValue.$target);

        const tgt = oldValue.$target;

        let i = 0;

        for (i; i < keys.length; i++) {
          const k = keys[i];

          const v = tgt[k];

          if (v && v[isProxySymbol]) {
            called = true;
          }
          delete oldValue[k];
        }

        target[property] = undefined;

        if (!called) {
          const listeners = this.watchers.get(property);

          if (listeners) {
            this.#scheduleListener(listeners);
          }
        }

        return true;
      }

      if (isDefined(value)) {
        target[property] = value;
        const listeners = this.watchers.get(property);

        if (listeners) {
          this.#scheduleListener(listeners);
        }

        if (Array.isArray(target)) {
          if (this.objectListeners.has(proxy) && property !== "length") {
            const keys = this.objectListeners.get(proxy);

            for (let i = 0, l = keys.length; i < l; i++) {
              const listeners = this.watchers.get(keys[i]);

              if (listeners) this.#scheduleListener(listeners);
            }
            decodeURI;
          }
        }

        return true;
      }

      return true;
    } else {
      if (isUndefined(target[property]) && isProxy(value)) {
        this.foreignProxies.add(value);
        target[property] = value;

        if (!this.watchers.has(property)) {
          return true;
        }
      }

      if (isUndefined(value)) {
        target[property] = value;
      } else {
        target[property] = createScope(value, this);
      }

      if (oldValue !== value) {
        let expectedTarget = this.$target;

        const listeners = [];

        // Handle the case where we need to start observing object after a watcher has been set
        if (isUndefined(oldValue) && isObject(target[property])) {
          if (!this.objectListeners.has(target[property])) {
            this.objectListeners.set(target[property], [property]);
          }
          const keys = Object.keys(value);

          for (let i = 0, l = keys.length; i < l; i++) {
            const key = keys[i];

            const keyListeners = this.watchers.get(key);

            if (keyListeners) {
              for (let j = 0, jl = keyListeners.length; j < jl; j++) {
                listeners.push(keyListeners[j]);
              }
            }
          }
          expectedTarget = value;
        }

        if (Array.isArray(target)) {
          const lengthListeners = this.watchers.get("length");

          if (lengthListeners) {
            for (let i = 0, l = lengthListeners.length; i < l; i++) {
              listeners.push(lengthListeners[i]);
            }
          }
        }

        const propListeners = this.watchers.get(property);

        if (propListeners) {
          for (let i = 0, l = propListeners.length; i < l; i++) {
            listeners.push(propListeners[i]);
          }
        }

        if (listeners.length > 0) {
          this.#scheduleListener(listeners, (list) => {
            const scheduled = [];

            for (let i = 0, l = list.length; i < l; i++) {
              const x = list[i];

              if (!x.watchProp) {
                scheduled.push(x);
                continue;
              }

              const wrapperExpr = x.watchProp.split(".").slice(0, -1).join(".");

              const expectedHandler = $parse(wrapperExpr)(
                x.originalTarget,
              )?.$handler;

              if (expectedTarget === expectedHandler?.$target) {
                scheduled.push(x);
              }
            }

            return scheduled;
          });
        }

        let foreignListeners = this.foreignListeners.get(property);

        if (!foreignListeners && this.$parent?.foreignListeners) {
          foreignListeners = this.$parent.foreignListeners.get(property);
        }

        if (foreignListeners) {
          let scheduled = foreignListeners;

          // filter for repeaters
          const hashKey = this.$target.$$hashKey;

          if (hashKey) {
            scheduled = [];

            for (let i = 0, l = foreignListeners.length; i < l; i++) {
              const listener = foreignListeners[i];

              if (listener.originalTarget.$$hashKey === hashKey) {
                scheduled.push(listener);
              }
            }
          }

          if (scheduled.length > 0) {
            this.#scheduleListener(scheduled);
          }
        }
      }

      if (this.objectListeners.has(proxy) && property !== "length") {
        const keys = this.objectListeners.get(proxy);

        for (let i = 0, l = keys.length; i < l; i++) {
          const key = keys[i];

          const listeners = this.watchers.get(key);

          if (listeners && this.scheduled !== listeners) {
            this.#scheduleListener(listeners);
          }
        }
      }

      return true;
    }
  }

  /**
   * Intercepts property access on the target object. It checks for specific
   * properties (`watch` and `sync`) and binds their methods. For other properties,
   * it returns the value directly.
   *
   * @param {Object} target - The target object.
   * @param {string|number|symbol} property - The name of the property being accessed.
   * @param {Proxy} proxy - The proxy object being invoked
   * @returns {*} - The value of the property or a method if accessing `watch` or `sync`.
   */
  get(target, property, proxy) {
    if (property === "$scopename" && this.$scopename) return this.$scopename;

    if (property === "$$watchersCount") return calculateWatcherCount(this);

    if (property === isProxySymbol) return true;

    if (target[property] && isProxy(target[property])) {
      this.$proxy = target[property];
    } else {
      this.$proxy = proxy;
    }

    this.propertyMap.$target = target;
    this.propertyMap.$proxy = proxy;

    if (
      Array.isArray(target) &&
      ["pop", "shift", "unshift"].includes(/** @type { string } */ (property))
    ) {
      if (this.objectListeners.has(proxy)) {
        const keys = this.objectListeners.get(proxy);

        for (let i = 0, l = keys.length; i < l; i++) {
          const key = keys[i];

          const listeners = this.watchers.get(key);

          if (listeners) {
            this.scheduled = listeners;
          }
        }
      }

      if (property === "unshift") {
        this.#scheduleListener(this.scheduled);
      }
    }

    if (hasOwn(this.propertyMap, property)) {
      this.$target = target;

      return this.propertyMap[property];
    } else {
      // we are a simple getter
      return target[property];
    }
  }

  deleteProperty(target, property) {
    // Currently deletes $model
    if (target[property] && target[property][isProxySymbol]) {
      target[property] = undefined;

      const listeners = this.watchers.get(property);

      if (listeners) {
        this.#scheduleListener(listeners);
      }

      if (this.objectListeners.has(this.$proxy)) {
        const keys = this.objectListeners.get(this.$proxy);

        for (let i = 0, l = keys.length; i < l; i++) {
          const key = keys[i];

          const listeners = this.watchers.get(key);

          if (listeners) this.#scheduleListener(listeners);
        }
      }

      if (this.scheduled) {
        this.#scheduleListener(this.scheduled);
        this.scheduled = [];
      }

      return true;
    }

    delete target[property];

    if (this.objectListeners.has(this.$proxy)) {
      const keys = this.objectListeners.get(this.$proxy);

      for (let i = 0, l = keys.length; i < l; i++) {
        const key = keys[i];

        const listeners = this.watchers.get(key);

        if (listeners) this.#scheduleListener(listeners);
      }
    } else {
      const listeners = this.watchers.get(property);

      if (listeners) {
        this.#scheduleListener(listeners, target[property]);
      }
    }

    return true;
  }

  /** @internal **/
  #checkeListenersForAllKeys(value) {
    if (isUndefined(value)) {
      return;
    }
    Object.keys(value).forEach((k) => {
      const listeners = this.watchers.get(k);

      if (listeners) {
        this.#scheduleListener(listeners);
      }

      if (isObject(value[k])) {
        this.#checkeListenersForAllKeys(value[k]);
      }
    });
  }

  /**
   * @param {import('./interface.ts').Listener[]} listeners
   * @param {Function} filter
   */
  #scheduleListener(listeners, filter = (val) => val) {
    queueMicrotask(() => {
      let index = 0;

      const filteredListeners = filter(listeners);

      while (index < filteredListeners.length) {
        const listener = filteredListeners[index];

        if (listener.foreignListener) {
          listener.foreignListener.#notifyListener(listener, this.$target);
        } else {
          this.#notifyListener(listener, this.$target);
        }
        index++;
      }
    });
  }

  /**
   * Registers a watcher for a property along with a listener function. The listener
   * function is invoked when changes to that property are detected.
   *
   * @param {string} watchProp - An expression to be watched in the context of this model.
   * @param {ng.ListenerFn} [listenerFn] - A function to execute when changes are detected on watched context.
   * @param {boolean} [lazy] - A flag to indicate if the listener should be invoked immediately. Defaults to false.
   */
  $watch(watchProp, listenerFn, lazy = false) {
    assert(isString(watchProp), "Watched property required");
    watchProp = watchProp.trim();
    const get = $parse(watchProp);

    // Constant are immediately passed to listener function
    if (get.constant) {
      if (listenerFn) {
        queueMicrotask(() => {
          let res = get();

          while (isFunction(res)) {
            res = res();
          }
          listenerFn(res, this.$target);
        });
      }

      return () => {
        /* empty */
      };
    }

    /** @type {ng.Listener} */
    const listener = {
      originalTarget: this.$target,
      listenerFn,
      watchFn: get,
      scopeId: this.$id,
      id: nextUid(),
      property: [],
    };

    // simplest case
    let key = get.decoratedNode.body[0].expression.name;

    const keySet = [];

    const { type } = get.decoratedNode.body[0].expression;

    switch (type) {
      // 3
      case ASTType.AssignmentExpression:
        // assignment calls without listener functions
        if (!listenerFn) {
          let res = get(this.$target);

          while (isFunction(res)) {
            res = res(this.$target);
          }

          return undefined;
        }
        key = get.decoratedNode.body[0].expression.left.name;
        break;
      // 4
      case ASTType.ConditionalExpression: {
        key = get.decoratedNode.body[0].expression.toWatch[0]?.test?.name;
        listener.property.push(key);
        break;
      }
      // 5
      case ASTType.LogicalExpression: {
        const keys = [
          get.decoratedNode.body[0].expression.left.toWatch[0]?.name,
          get.decoratedNode.body[0].expression.right.toWatch[0]?.name,
        ];

        for (let i = 0, l = keys.length; i < l; i++) {
          const registerKey = keys[i];

          if (registerKey) this.#registerKey(registerKey, listener);
        }

        return () => {
          for (let i = 0, l = keys.length; i < l; i++) {
            const deregisterKey = keys[i];

            this.#deregisterKey(deregisterKey, listener.id);
          }
        };
      }
      // 6
      case ASTType.BinaryExpression: {
        if (get.decoratedNode.body[0].expression.isPure) {
          const expr = get.decoratedNode.body[0].expression.toWatch[0];

          key = expr.property ? expr.property.name : expr.name;

          if (!key) {
            throw new Error("Unable to determine key");
          }
          listener.property.push(key);
          break;
        } else {
          const { toWatch } = get.decoratedNode.body[0].expression;

          for (let i = 0, l = toWatch.length; i < l; i++) {
            const x = toWatch[i];

            const registerKey = x.property ? x.property.name : x.name;

            if (!registerKey) throw new Error("Unable to determine key");

            this.#registerKey(registerKey, listener);
            this.#scheduleListener([listener]);
          }

          // Return deregistration function
          return () => {
            for (let i = 0, l = toWatch.length; i < l; i++) {
              const x = toWatch[i];

              const deregisterKey = x.property ? x.property.name : x.name;

              this.#deregisterKey(deregisterKey, listener.id);
            }
          };
        }
      }
      // 7
      case ASTType.UnaryExpression: {
        const expr = get.decoratedNode.body[0].expression.toWatch[0];

        key = expr.property ? expr.property.name : expr.name;

        if (!key) {
          throw new Error("Unable to determine key");
        }
        listener.property.push(key);
        break;
      }
      // 8 function
      case ASTType.CallExpression: {
        const { toWatch } = get.decoratedNode.body[0].expression;

        for (let i = 0, l = toWatch.length; i < l; i++) {
          const x = toWatch[i];

          if (!isDefined(x)) continue;
          this.#registerKey(x.name, listener);
          this.#scheduleListener([listener]);
        }

        return () => {
          for (let i = 0, l = toWatch.length; i < l; i++) {
            const x = toWatch[i];

            if (!isDefined(x)) continue;
            this.#deregisterKey(x.name, listener.id);
          }
        };
      }

      // 9
      case ASTType.MemberExpression: {
        key = get.decoratedNode.body[0].expression.property.name;

        // array watcher
        if (!key) {
          key = get.decoratedNode.body[0].expression.object.name;
        }

        listener.property.push(key);

        if (watchProp !== key) {
          // Handle nested expression call
          listener.watchProp = watchProp;

          const potentialProxy = $parse(
            watchProp.split(".").slice(0, -1).join("."),
          )(/** @type {Scope} */ (listener.originalTarget));

          if (potentialProxy && this.foreignProxies.has(potentialProxy)) {
            potentialProxy.$handler.#registerForeignKey(key, listener);
            potentialProxy.$handler.#scheduleListener([listener]);

            return () => {
              return potentialProxy.$handler.#deregisterKey(key, listener.id);
            };
          }
        }
        break;
      }

      // 10
      case ASTType.Identifier: {
        listener.property.push(get.decoratedNode.body[0].expression.name);
        break;
      }

      // 12
      case ASTType.ArrayExpression: {
        const { elements } = get.decoratedNode.body[0].expression;

        for (let i = 0, l = elements.length; i < l; i++) {
          const x = elements[i];

          const registerKey =
            x.type === ASTType.Literal ? x.value : x.toWatch[0]?.name;

          if (!registerKey) continue;

          this.#registerKey(registerKey, listener);
          this.#scheduleListener([listener]);
        }

        return () => {
          for (let i = 0, l = elements.length; i < l; i++) {
            const x = elements[i];

            const deregisterKey =
              x.type === ASTType.Literal ? x.value : x.toWatch[0]?.name;

            if (!deregisterKey) continue;

            this.#deregisterKey(deregisterKey, listener.id);
          }
        };
      }

      // 14
      case ASTType.ObjectExpression: {
        const { properties } = get.decoratedNode.body[0].expression;

        for (let i = 0, l = properties.length; i < l; i++) {
          const prop = properties[i];

          let key;

          if (prop.key.isPure === false) {
            key = prop.key.name;
          } else if (prop.value?.name) {
            key = prop.value.name;
          } else {
            const target = get.decoratedNode.body[0].expression.toWatch[0];

            key = target.property ? target.property.name : target.name;
          }

          if (key) {
            keySet.push(key);
            listener.property.push(key);
          }
        }
        break;
      }
      default: {
        throw new Error(`Unsupported type ${type}`);
      }
    }

    // if the target is an object, then start observing it
    const listenerObject = listener.watchFn(this.$target);

    if (isObject(listenerObject)) {
      this.objectListeners.set(listenerObject, [key]);
    }

    if (keySet.length > 0) {
      for (let i = 0, l = keySet.length; i < l; i++) {
        this.#registerKey(keySet[i], listener);
      }
    } else {
      this.#registerKey(key, listener);
    }

    if (!lazy) {
      this.#scheduleListener([listener]);
    }

    return () => {
      if (keySet.length > 0) {
        let res = true;

        for (let i = 0, l = keySet.length; i < l; i++) {
          const success = this.#deregisterKey(keySet[i], listener.id);

          if (!success) {
            res = false;
          }
        }

        return res;
      } else {
        return this.#deregisterKey(key, listener.id);
      }
    };
  }

  $new(childInstance) {
    let child;

    if (childInstance) {
      if (Object.getPrototypeOf(childInstance) === Object.prototype) {
        Object.setPrototypeOf(childInstance, this.$target);
      } else {
        if (Object.getPrototypeOf(childInstance) == this.$target) {
          Object.setPrototypeOf(childInstance, this.$target);
        } else {
          Object.setPrototypeOf(
            Object.getPrototypeOf(childInstance) || childInstance,
            this.$target,
          );
        }
      }

      child = childInstance;
    } else {
      child = Object.create(this.$target);
    }

    const proxy = new Proxy(child, new Scope(this));

    this.$children.push(proxy);

    return proxy;
  }

  $newIsolate(instance) {
    const child = instance ? Object.create(instance) : Object.create(null);

    const proxy = new Proxy(child, new Scope(this, this.$root));

    this.$children.push(proxy);

    return proxy;
  }

  $transcluded(parentInstance) {
    const child = Object.create(this.$target);

    const proxy = new Proxy(child, new Scope(this, parentInstance));

    this.$children.push(proxy);

    return proxy;
  }

  /** @internal **/
  #registerKey(key, listener) {
    if (this.watchers.has(key)) {
      this.watchers.get(key).push(listener);
    } else {
      this.watchers.set(key, [listener]);
    }
  }

  /** @internal **/
  #registerForeignKey(key, listener) {
    if (this.foreignListeners.has(key)) {
      this.foreignListeners.get(key).push(listener);
    } else {
      this.foreignListeners.set(key, [listener]);
    }
  }

  #deregisterKey(key, id) {
    const listenerList = this.watchers.get(key);

    if (!listenerList) return false;

    const index = listenerList.findIndex((x) => x.id === id);

    if (index === -1) return false;

    listenerList.splice(index, 1);

    if (listenerList.length) {
      this.watchers.set(key, listenerList);
    } else {
      this.watchers.delete(key);
    }

    return true;
  }

  // #deregisterForeignKey(key, id) {
  //   const listenerList = this.foreignListeners.get(key);
  //   if (!listenerList) return false;

  //   const index = listenerList.findIndex((x) => x.id === id);
  //   if (index === -1) return false;

  //   listenerList.splice(index, 1);
  //   if (listenerList.length) {
  //     this.foreignListeners.set(key, listenerList);
  //   } else {
  //     this.foreignListeners.delete(key);
  //   }
  //   return true;
  // }

  $eval(expr, locals) {
    const fn = $parse(expr);

    const res = fn(this, locals);

    if (isUndefined(res) || res === null) {
      return res;
    }

    if (res.name === Object.hasOwnProperty.name) {
      return res;
    }

    if (isFunction(res)) {
      return res();
    }

    if (Number.isNaN(res)) {
      return 0;
    }

    return res;
  }

  /**
   * @param {Object} newTarget
   */
  $merge(newTarget) {
    const entries = Object.entries(newTarget);

    for (let i = 0, l = entries.length; i < l; i++) {
      const [key, value] = entries[i];

      this.set(this.$target, key, value, this.$proxy);
    }
  }

  /**
   * @param {ng.Expression} expr
   * @returns {any}
   */
  $apply(expr) {
    try {
      return $parse(expr)(this.$proxy);
    } catch (e) {
      $exceptionHandler(e);
    }
  }

  /**
   * @param {string} name
   * @param {Function} listener
   * @returns {(function(): void)|*}
   */
  $on(name, listener) {
    let namedListeners = this.$$listeners.get(name);

    if (!namedListeners) {
      namedListeners = [];
      this.$$listeners.set(name, namedListeners);
    }
    namedListeners.push(listener);

    return () => {
      const indexOfListener = namedListeners.indexOf(listener);

      if (indexOfListener !== -1) {
        namedListeners.splice(indexOfListener, 1);

        if (namedListeners.length == 0) {
          this.$$listeners.delete(name);
        }
      }
    };
  }

  /**
   * @param {string} name
   * @param  {...any} args
   * @returns {void}
   */
  $emit(name, ...args) {
    return this.#eventHelper(
      { name, event: undefined, broadcast: false },
      ...args,
    );
  }

  /**
   * @param {string} name
   * @param  {...any} args
   * @returns {any}
   */
  $broadcast(name, ...args) {
    return this.#eventHelper(
      { name, event: undefined, broadcast: true },
      ...args,
    );
  }

  /**
   * @internal
   * @returns {any}
   */
  #eventHelper({ name, event, broadcast }, ...args) {
    if (!broadcast) {
      if (!this.$$listeners.has(name)) {
        if (this.$parent) {
          return this.$parent.$handler.#eventHelper(
            { name, event, broadcast },
            ...args,
          );
        }

        return;
      }
    }

    if (event) {
      event.currentScope = this.$target;
    } else {
      event = event || {
        name,
        targetScope: this.$target,
        currentScope: this.$target,
        stopped: false,
        stopPropagation() {
          event.stopped = true;
        },
        preventDefault() {
          event.defaultPrevented = true;
        },
        defaultPrevented: false,
      };
    }

    const listenerArgs = concat([event], [event].concat(args), 1);

    const listeners = this.$$listeners.get(name);

    if (listeners) {
      let { length } = listeners;

      for (let i = 0; i < length; i++) {
        try {
          const cb = listeners[i];

          cb.apply(null, listenerArgs);

          const currentLength = listeners.length;

          if (currentLength !== length) {
            if (currentLength < length) {
              i--;
            }
            length = currentLength;
          }
        } catch (err) {
          $exceptionHandler(err);
        }
      }
    }

    event.currentScope = null;

    if (event.stopped) {
      return event;
    }

    if (broadcast) {
      if (this.$children.length > 0) {
        this.$children.forEach((child) => {
          event = child.$handler.#eventHelper(
            { name, event, broadcast },
            ...args,
          );
        });
      }

      return event;
    } else {
      if (this.$parent) {
        return this.$parent.#eventHelper({ name, event, broadcast }, ...args);
      } else {
        return event;
      }
    }
  }

  /**
   * @internal
   * @returns {boolean}
   */
  #isRoot() {
    return this.$root === /** @type {Scope} */ (this);
  }

  /**
   * @param {Function} fn
   */
  $postUpdate(fn) {
    $postUpdateQueue.push(fn);
  }

  $destroy() {
    if (this.$$destroyed) return;

    this.$broadcast("$destroy");

    for (const [key, val] of this.watchers) {
      for (let i = val.length - 1; i >= 0; i--) {
        if (val[i].scopeId === this.$id) {
          val.splice(i, 1);
        }
      }

      if (val.length === 0) {
        this.watchers.delete(key);
      } else {
        this.watchers.set(key, val);
      }
    }

    if (this.#isRoot()) {
      this.watchers.clear();
    } else {
      const children = this.$parent.$children;

      for (let i = 0, l = children.length; i < l; i++) {
        if (children[i].$id === this.$id) {
          children.splice(i, 1);
          break;
        }
      }
    }

    this.$$listeners.clear();
    this.$$destroyed = true;
  }

  /**
   * @internal
   * @param {import('./interface.ts').Listener} listener - The property path that was changed.
   */
  #notifyListener(listener, target) {
    const { originalTarget, listenerFn, watchFn } = listener;

    try {
      let newVal = watchFn(originalTarget);

      if (isUndefined(newVal)) {
        newVal = watchFn(target);
      }

      if (isFunction(newVal)) {
        newVal = newVal(originalTarget);
      }

      if (Array.isArray(newVal)) {
        for (let i = 0, l = newVal.length; i < l; i++) {
          if (isFunction(newVal[i])) {
            newVal[i] = newVal[i](originalTarget);
          }
        }
      }

      listenerFn(newVal, originalTarget);

      while ($postUpdateQueue.length) {
        const fn = $postUpdateQueue.shift();

        fn();
      }
    } catch (e) {
      $exceptionHandler(e);
    }
  }

  /* @ignore */
  $flushQueue() {
    while ($postUpdateQueue.length) {
      $postUpdateQueue.shift()();
    }
  }

  /**
   * Searches the scope instance
   *
   * @param {string|number}id
   * @returns {Scope|undefined}
   */
  $getById(id) {
    if (isString(id)) {
      id = parseInt(/** @type {string} */ (id), 10);
    }

    if (this.$id === id) {
      return this;
    } else {
      let res = undefined;

      for (const child of this.$children) {
        const found = child.$getById(id);

        if (found) {
          res = found;
          break;
        }
      }

      return res;
    }
  }

  $searchByName(name) {
    const getByName = (scope, name) => {
      if (scope.$scopename === name) {
        return scope;
      } else {
        let res = undefined;

        for (const child of scope.$children) {
          const found = getByName(child, name);

          if (found) {
            res = found;
            break;
          }
        }

        return res;
      }
    };

    return getByName(this.$root, name);
  }
}

/*------------- Private helpers -------------*/

/**
 * @param {Scope} model
 * @returns {number}
 */
function calculateWatcherCount(model) {
  const childIds = collectChildIds(model);

  let count = 0;

  for (const watchers of model.watchers.values()) {
    for (let i = 0, l = watchers.length; i < l; i++) {
      if (childIds.has(watchers[i].scopeId)) {
        count++;
      }
    }
  }

  return count;
}

/**
 * @param {Scope} child
 * @returns {Set<number>}
 */
function collectChildIds(child) {
  const ids = new Set();

  const stack = [child];

  while (stack.length) {
    const node = stack.pop();

    if (!ids.has(node.$id)) {
      ids.add(node.$id);

      if (node.$children) {
        for (let i = 0, l = node.$children.length; i < l; i++) {
          stack.push(node.$children[i]);
        }
      }
    }
  }

  return ids;
}
