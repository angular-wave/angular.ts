import {
  assert,
  concat,
  entries,
  hasOwn,
  isArray,
  isDefined,
  isFunction,
  isObject,
  isProxy,
  isProxySymbol,
  isString,
  isUndefined,
  keys,
  nextUid,
  nullObject,
} from "../../shared/utils.js";
import { ASTType } from "../parse/ast-type.js";
import { $injectTokens as $t } from "../../injection-tokens.js";

/** @typedef {import("../parse/ast/ast-node.ts").ExpressionNode} ExpressionNode */
/** @typedef {import("../parse/ast/ast-node.ts").LiteralNode} LiteralNode */
/** @typedef {import("../parse/ast/ast-node.ts").BodyNode} BodyNode */
/** @typedef {import("../parse/ast/ast-node.ts").ArrayNode} ArrayNode */
/** @typedef {import("../parse/ast/ast-node.ts").ObjectNode} ObjectNode */
/** @typedef {import("../parse/ast/ast-node.ts").ObjectPropertyNode} ObjectPropertyNode */

/**
 * @type {number}
 */
let uid = 0;

function nextId() {
  uid += 1;

  return uid;
}

/**
 * @type {ng.ParseService}
 */
let $parse;

/**@type {ng.ExceptionHandlerService} */
let $exceptionHandler;

/** @ignore @type {Function[]} */
export const $postUpdateQueue = [];

export class RootScopeProvider {
  constructor() {
    this.rootScope = createScope();
  }

  $get = [
    $t._exceptionHandler,
    $t._parse,
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
 * @private
 * Creates a deep proxy for the target object, intercepting property changes
 * and recursively applying proxies to nested objects.
 *
 * @param {Object & {$nonscope?: import("./interface.ts").NonScope} & Record<string, any>} target - The object to be wrapped in a proxy.
 * @param {Scope} [context] - The context for the handler, used to track listeners.
 * @returns {Scope|Object} - A proxy that intercepts operations on the target object,
 *                                     or the original value if the target is not an object.
 */
export function createScope(target = {}, context) {
  if (!isObject(target) || isNonScope(target)) return target;

  const proxy = new Proxy(target, context || new Scope());

  const keyList = keys(target);

  const ctorNonScope = isArray(target.constructor?.$nonscope)
    ? target.constructor.$nonscope
    : null;

  const instNonScope = isArray(target.$nonscope) ? target.$nonscope : null;

  for (let i = 0, l = keyList.length; i < l; i++) {
    const key = keyList[i];

    if (ctorNonScope?.includes(key) || instNonScope?.includes(key)) continue;
    target[key] = createScope(target[key], proxy.$handler);
  }

  return proxy;
}

const global = globalThis;

const wStr = "[object Window]";

/**
 * Checks if a target should be excluded from scope observability
 * @param {any} target
 * @returns {boolean}
 */
export function isNonScope(target) {
  // 1. Null or primitive types are non-scope
  if (
    target === null ||
    typeof target === "undefined" ||
    typeof target === "number" ||
    typeof target === "string" ||
    typeof target === "boolean" ||
    typeof target === "symbol" ||
    typeof target === "bigint"
  ) {
    return true;
  }

  // 2. Explicit non-scope flags
  if (target.$nonscope === true || target?.constructor?.$nonscope === true) {
    return true;
  }

  // 3. Global objects
  if (
    target === global.window ||
    target === global.document ||
    target === global.self ||
    target === global.frames
  ) {
    return true;
  }

  // 4. Safe instanceof checks
  const nonScopeConstructors = [
    Window,
    Document,
    Element,
    Node,
    EventTarget,
    Promise,
    HTMLCollection,
    NodeList,
    Event,
    Date,
    RegExp,
    Map,
    Set,
    WeakMap,
    WeakSet,
    ArrayBuffer,
    DataView,
    Uint8Array,
    Uint16Array,
    Uint32Array,
    Int8Array,
    Int16Array,
    Int32Array,
    Float32Array,
    Float64Array,
    Function,
    Error,
    Blob,
    File,
    FormData,
    URL,
    URLSearchParams,
  ];

  for (const Ctor of nonScopeConstructors) {
    try {
      if (target instanceof /** @type {any} */ (Ctor)) return true;
    } catch {
      /* empty */
    }
  }

  try {
    return Object.prototype.toString.call(target) === wStr;
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
    /** @ignore @type {Map<string, Array<import('./interface.ts').Listener>>} Watch listeners */
    this._watchers = context?._watchers ?? new Map();

    /** @private @type {Map<String, Function[]>} Event listeners */
    this._listeners = new Map();

    /** @private @type {Map<string, Array<import('./interface.ts').Listener>>} Watch listeners from other proxies */
    this._foreignListeners = context?._foreignListeners ?? new Map();

    /** @private @type {Set<Proxy<ng.Scope>>} */
    this._foreignProxies = context?._foreignProxies ?? new Set();

    /** @private @type {WeakMap<Object, Array<string>>} */
    this._objectListeners = context?._objectListeners ?? new WeakMap();

    /** @type {Proxy<Scope>} Current proxy being operated on */
    this.$proxy;

    /** @type {Scope} This is the reference to the Scope object with acts as the actual proxy */
    this.$handler = /** @type {Scope} */ (this);

    /** @type {*} Current target being called on */
    this.$target = null;

    /**
     * @ignore @type {Scope[]}
     */
    this._children = [];

    /**
     * @type {number} Unique model ID (monotonically increasing) useful for debugging.
     */
    this.$id = nextId();

    /**
     * @type {ng.RootScopeService}
     */
    this.$root = context ? context.$root : this;

    /**
     * @type {Scope | undefined}
     */
    this.$parent = parent || (this.$root === this ? undefined : context);

    /** @ignore @type {boolean} */
    this._destroyed = false;

    /** @private @type {import("./interface.ts").Listener[]} A list of scheduled Event listeners */
    this._scheduled = [];

    this.$scopename = undefined;

    /** @private */
    /** @type {Record<any, any>} */
    this.propertyMap = {
      $apply: this.$apply.bind(this),
      $broadcast: this.$broadcast.bind(this),
      _children: this._children,
      $destroy: this.$destroy.bind(this),
      $emit: this.$emit.bind(this),
      $eval: this.$eval.bind(this),
      $flushQueue: this.$flushQueue.bind(this),
      $getById: this.$getById.bind(this),
      $handler: /** @type {Scope} */ (this),
      $id: this.$id,
      $isRoot: this.#isRoot.bind(this),
      $merge: this.$merge.bind(this),
      $new: this.$new.bind(this),
      $newIsolate: this.$newIsolate.bind(this),
      $on: this.$on.bind(this),
      $parent: this.$parent,
      $postUpdate: this.$postUpdate.bind(this),
      $proxy: this.$proxy,
      $root: this.$root,
      $scopename: this.$scopename,
      $searchByName: this.$searchByName.bind(this),
      $transcluded: this.$transcluded.bind(this),
      $watch: this.$watch.bind(this),
    };
  }

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
  set(target, property, value, proxy) {
    if (property === "undefined") {
      return false;
    }

    if (property === "$scopename") {
      this.$scopename = value;

      return true;
    }

    const nonscopeProps = target.constructor?.$nonscope ?? target.$nonscope;

    if (isArray(nonscopeProps) && nonscopeProps.includes(property)) {
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
      if (isArray(value)) {
        if (oldValue !== value) {
          const listeners = this._watchers.get(property);

          if (listeners) {
            this.#scheduleListener(listeners);
          }

          const _foreignListeners = this._foreignListeners.get(property);

          if (_foreignListeners) {
            this.#scheduleListener(_foreignListeners);
          }
        }

        if (this._objectListeners.get(target[property])) {
          this._objectListeners.delete(target[property]);
        }
        target[property] = createScope(value, this);
        this._objectListeners.set(target[property], [property]);

        return true;
      }

      if (isObject(value)) {
        if (hasOwn(target, property)) {
          const keyList = keys(oldValue);

          for (const k of keyList) {
            if (!value[k]) delete oldValue[k];
          }
        }

        if (oldValue !== value) {
          const listeners = this._watchers.get(property);

          if (listeners) {
            this.#scheduleListener(listeners);
          }

          const _foreignListeners = this._foreignListeners.get(property);

          if (_foreignListeners) {
            this.#scheduleListener(_foreignListeners);
          }

          this.#checkeListenersForAllKeys(value);
        }
        target[property] = createScope(value, this);

        //setDeepValue(target[property], value);
        return true;
      }

      if (isUndefined(value)) {
        let called = false;

        const keyList = keys(oldValue.$target);

        const tgt = oldValue.$target;

        let i = 0;

        for (i; i < keyList.length; i++) {
          const k = keyList[i];

          const v = tgt[k];

          if (v && v[isProxySymbol]) {
            called = true;
          }
          delete oldValue[k];
        }

        target[property] = undefined;

        if (!called) {
          const listeners = this._watchers.get(property);

          if (listeners) {
            this.#scheduleListener(listeners);
          }
        }

        return true;
      }

      if (isDefined(value)) {
        target[property] = value;
        const listeners = this._watchers.get(property);

        if (listeners) {
          this.#scheduleListener(listeners);
        }

        if (isArray(target)) {
          if (this._objectListeners.has(proxy) && property !== "length") {
            const keyList = /** @type {string[]} */ (
              this._objectListeners.get(proxy)
            );

            for (let i = 0, l = keyList.length; i < l; i++) {
              const currentListeners = this._watchers.get(keyList[i]);

              if (currentListeners) this.#scheduleListener(currentListeners);
            }
          }
        }

        return true;
      }

      return true;
    } else {
      if (isUndefined(target[property]) && isProxy(value)) {
        this._foreignProxies.add(/** @type {Proxy<ng.Scope>} */ (value));
        target[property] = value;

        if (!this._watchers.has(property)) {
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
          if (!this._objectListeners.has(target[property])) {
            this._objectListeners.set(target[property], [property]);
          }
          const keyList = keys(value);

          for (let i = 0, l = keyList.length; i < l; i++) {
            const key = keyList[i];

            const keyListeners = this._watchers.get(key);

            if (keyListeners) {
              for (let j = 0, jl = keyListeners.length; j < jl; j++) {
                listeners.push(keyListeners[j]);
              }
            }
          }
          expectedTarget = value;
        }

        if (isArray(target)) {
          const lengthListeners = this._watchers.get("length");

          if (lengthListeners) {
            for (let i = 0, l = lengthListeners.length; i < l; i++) {
              listeners.push(lengthListeners[i]);
            }
          }
        }

        const propListeners = this._watchers.get(property);

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

              const expectedHandler = $parse(wrapperExpr)(x.originalTarget);

              if (expectedTarget === expectedHandler?.$target) {
                scheduled.push(x);
              }
            }

            return scheduled;
          });
        }

        let _foreignListeners = this._foreignListeners.get(property);

        if (!_foreignListeners && this.$parent?._foreignListeners) {
          _foreignListeners = this.$parent._foreignListeners.get(property);
        }

        if (_foreignListeners) {
          let scheduled = _foreignListeners;

          // filter for repeaters
          const hashKey = this.$target._hashKey;

          if (hashKey) {
            scheduled = [];

            for (let i = 0, l = _foreignListeners.length; i < l; i++) {
              const listener = _foreignListeners[i];

              if (listener.originalTarget._hashKey === hashKey) {
                scheduled.push(listener);
              }
            }
          }

          if (scheduled.length > 0) {
            this.#scheduleListener(scheduled);
          }
        }
      }

      if (this._objectListeners.has(proxy) && property !== "length") {
        const keyList = /** @type {string[]} */ (
          this._objectListeners.get(proxy)
        );

        for (let i = 0, l = keyList.length; i < l; i++) {
          const key = keyList[i];

          const listeners = this._watchers.get(key);

          if (listeners && this._scheduled !== listeners) {
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
   * @param {Object & Record<string, any>} target - The target object.
   * @param {string|number|symbol} property - The name of the property being accessed.
   * @param {Proxy<Scope>} proxy - The proxy object being invoked
   * @returns {*} - The value of the property or a method if accessing `watch` or `sync`.
   */
  get(target, property, proxy) {
    if (property === "$scopename" && this.$scopename) return this.$scopename;

    if (property === "$$watchersCount") return calculateWatcherCount(this);

    if (property === isProxySymbol) return true;

    const targetProp = target[/** @type {string} */ (property)];

    if (isProxy(targetProp)) {
      this.$proxy = /** @type {Proxy<Scope>} */ (targetProp);
    } else {
      this.$proxy = proxy;
    }

    this.propertyMap.$target = target;
    this.propertyMap.$proxy = proxy;

    if (
      isArray(target) &&
      ["pop", "shift", "unshift"].includes(/** @type { string } */ (property))
    ) {
      if (this._objectListeners.has(proxy)) {
        const keyList = /** @type {string []} */ (
          this._objectListeners.get(proxy)
        );

        for (let i = 0, l = keyList.length; i < l; i++) {
          const key = keyList[i];

          const listeners = this._watchers.get(key);

          if (listeners) {
            this._scheduled = listeners;
          }
        }
      }

      if (property === "unshift") {
        this.#scheduleListener(this._scheduled);
      }
    }

    if (hasOwn(this.propertyMap, property)) {
      this.$target = target;

      return this.propertyMap[/** @type {string} */ (property)];
    } else {
      // we are a simple getter
      return targetProp;
    }
  }

  /**
   * @param {Object & Record<string, any>} target - The target object.
   * @param {string} property - The name of the property being deleted
   */
  deleteProperty(target, property) {
    // Currently deletes $model
    if (target[property] && target[property][isProxySymbol]) {
      target[property] = undefined;

      const listeners = this._watchers.get(property);

      if (listeners) {
        this.#scheduleListener(listeners);
      }

      if (this._objectListeners.has(this.$proxy)) {
        const keyList = /** @type {string[]} */ (
          this._objectListeners.get(this.$proxy)
        );

        for (let i = 0, l = keyList.length; i < l; i++) {
          const key = keyList[i];

          const currentListeners = this._watchers.get(key);

          if (currentListeners) this.#scheduleListener(currentListeners);
        }
      }

      if (this._scheduled) {
        this.#scheduleListener(this._scheduled);
        this._scheduled = [];
      }

      return true;
    }

    delete target[property];

    if (this._objectListeners.has(this.$proxy)) {
      const keyList = /** @type {string[]} */ (
        this._objectListeners.get(this.$proxy)
      );

      for (let i = 0, l = keyList.length; i < l; i++) {
        const key = keyList[i];

        const listeners = this._watchers.get(key);

        if (listeners) this.#scheduleListener(listeners);
      }
    } else {
      const listeners = this._watchers.get(property);

      if (listeners) {
        this.#scheduleListener(listeners, target[property]);
      }
    }

    return true;
  }

  /**
   * @param {Object & Record<string, any>} value
   */
  #checkeListenersForAllKeys(value) {
    if (isUndefined(value)) {
      return;
    }
    keys(value).forEach((k) => {
      const listeners = this._watchers.get(k);

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
   * @param {(listeners: import('./interface').Listener[]) => import('./interface').Listener[]} filter
   */
  #scheduleListener(listeners, filter = (val) => val) {
    queueMicrotask(() => {
      let index = 0;

      const filteredListeners = filter(listeners);

      while (index < filteredListeners.length) {
        const listener = filteredListeners[index];

        this.#notifyListener(listener, this.$target);

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
   * @return {(() => void) | undefined} - A function to deregister the watcher, or undefined if no listener function is provided.
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

    const expr = /** @type {import("../parse/ast/ast-node.ts").ASTNode} */ (
      /** @type {ExpressionNode & BodyNode} */ (get._decoratedNode.body[0])
        .expression
    );

    if (!listenerFn) {
      let res = get(this.$target);

      while (isFunction(res)) {
        res = res(this.$target);
      }

      return undefined;
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
    let key = /** @type {LiteralNode} */ (expr).name;

    /**
     * @type {string[]}
     */
    const keySet = [];

    const { type } = expr;

    switch (type) {
      // 3
      case ASTType._AssignmentExpression:
        // assignment calls without listener functions
        key = /** @type {LiteralNode} */ (
          /** @type {ExpressionNode} */ (expr).left
        )?.name;
        break;
      // 4
      case ASTType._ConditionalExpression: {
        key = /** @type {LiteralNode} */ (
          /** @type {ExpressionNode} */ (
            /** @type {BodyNode} */ (expr).toWatch[0]
          )?.test
        )?.name;
        listener.property.push(/** @type {string} */ (key));
        break;
      }
      // 5
      case ASTType._LogicalExpression: {
        const keyList = [
          /** @type {LiteralNode} */ (
            /** @type {BodyNode} */ (/** @type {ExpressionNode} */ (expr).left)
              .toWatch[0]
          )?.name,
          /** @type {LiteralNode} */ (
            /** @type {BodyNode} */ (/** @type {ExpressionNode} */ (expr).right)
              .toWatch[0]
          )?.name,
        ];

        for (let i = 0, l = keyList.length; i < l; i++) {
          const registerKey = keyList[i];

          if (registerKey) this.#registerKey(registerKey, listener);
        }

        return () => {
          for (let i = 0, l = keyList.length; i < l; i++) {
            const deregisterKey = keyList[i];

            this.#deregisterKey(
              /** @type {string} */ (deregisterKey),
              listener.id,
            );
          }
        };
      }
      // 6
      case ASTType._BinaryExpression: {
        if (/** @type {ExpressionNode} */ (expr).isPure) {
          const watch = /** @type {BodyNode} */ (expr).toWatch[0];

          key = /** @type {ExpressionNode} */ (watch).property
            ? /** @type {LiteralNode} */ (
                /** @type {ExpressionNode} */ (watch).property
              ).name
            : /** @type {LiteralNode} */ (watch).name;

          if (!key) {
            throw new Error("Unable to determine key");
          }
          listener.property.push(key);
          break;
        } else {
          const { toWatch } = /** @type {BodyNode} */ (expr);

          for (let i = 0, l = toWatch.length; i < l; i++) {
            const x = toWatch[i];

            const registerKey = /** @type {ExpressionNode} */ (x).property
              ? /** @type {LiteralNode} */ (
                  /** @type {ExpressionNode} */ (x).property
                ).name
              : /** @type {LiteralNode} */ (x).name;

            if (!registerKey) throw new Error("Unable to determine key");

            this.#registerKey(registerKey, listener);
            this.#scheduleListener([listener]);
          }

          // Return deregistration function
          return () => {
            for (let i = 0, l = toWatch.length; i < l; i++) {
              const x = toWatch[i];

              const deregisterKey = /** @type {ExpressionNode} */ (x).property
                ? /** @type {LiteralNode} */ (
                    /** @type {ExpressionNode} */ (x).property
                  ).name
                : /** @type {LiteralNode} */ (x).name;

              this.#deregisterKey(
                /** @type {string} */ (deregisterKey),
                listener.id,
              );
            }
          };
        }
      }
      // 7
      case ASTType._UnaryExpression: {
        const x = /** @type {BodyNode} */ (expr).toWatch[0];

        key = /** @type {ExpressionNode} */ (x).property
          ? /** @type {LiteralNode} */ (
              /** @type {ExpressionNode} */ (x).property
            ).name
          : /** @type {LiteralNode} */ (x).name;

        if (!key) {
          throw new Error("Unable to determine key");
        }
        listener.property.push(key);
        break;
      }
      // 8 function
      case ASTType._CallExpression: {
        const { toWatch } = /** @type {BodyNode} */ (
          /** @type {ExpressionNode} */ (expr)
        );

        for (let i = 0, l = toWatch.length; i < l; i++) {
          const x = toWatch[i];

          if (!isDefined(x)) continue;
          this.#registerKey(
            /** @type {string} */ (/** @type {LiteralNode} */ (x).name),
            listener,
          );
          this.#scheduleListener([listener]);
        }

        return () => {
          for (let i = 0, l = toWatch.length; i < l; i++) {
            const x = toWatch[i];

            if (!isDefined(x)) continue;
            this.#deregisterKey(
              /** @type {string} */ (/** @type {LiteralNode} */ (x).name),
              listener.id,
            );
          }
        };
      }

      // 9
      case ASTType._MemberExpression: {
        key = /** @type {LiteralNode} */ (
          /** @type {ExpressionNode} */ (expr).property
        ).name;

        // array watcher
        if (!key) {
          key = /** @type {LiteralNode} */ (
            /** @type {ExpressionNode} */ (expr).object
          ).name;
        }

        listener.property.push(/** @type {string} */ (key));

        if (watchProp !== key) {
          // Handle nested expression call
          listener.watchProp = watchProp;

          const potentialProxy = $parse(
            watchProp.split(".").slice(0, -1).join("."),
          )(/** @type {Scope} */ (listener.originalTarget));

          if (potentialProxy && this._foreignProxies.has(potentialProxy)) {
            potentialProxy.$handler._registerForeignKey(key, listener);
            potentialProxy.$handler.#scheduleListener([listener]);

            return () => {
              potentialProxy.$handler._deregisterForeignKey(key, listener.id);

              return potentialProxy.$handler.#deregisterKey(key, listener.id);
            };
          }
        }
        break;
      }

      // 10
      case ASTType._Identifier: {
        listener.property.push(
          /** @type {string} */ (/** @type {LiteralNode} */ (expr).name),
        );
        break;
      }

      // 12
      case ASTType._ArrayExpression: {
        const { elements } = /** @type {ArrayNode} */ (expr);

        for (let i = 0, l = elements.length; i < l; i++) {
          const x = elements[i];

          const registerKey =
            x.type === ASTType._Literal
              ? /** @type {LiteralNode} */ (x).value
              : /** @type {LiteralNode} */ (
                  /** @type {BodyNode} */ (x).toWatch[0]
                )?.name;

          if (!registerKey) continue;

          this.#registerKey(registerKey, listener);
          this.#scheduleListener([listener]);
        }

        return () => {
          for (let i = 0, l = elements.length; i < l; i++) {
            const x = elements[i];

            const deregisterKey =
              x.type === ASTType._Literal
                ? /** @type {LiteralNode} */ (x).value
                : /** @type {LiteralNode} */ (
                    /** @type {BodyNode} */ (x).toWatch[0]
                  ).name;

            if (!deregisterKey) continue;

            this.#deregisterKey(deregisterKey, listener.id);
          }
        };
      }

      // 14
      case ASTType._ObjectExpression: {
        const { properties } = /** @type {ObjectNode} */ (expr);

        for (let i = 0, l = properties.length; i < l; i++) {
          const prop = /** @type {ObjectPropertyNode} */ (properties[i]);

          let currentKey;

          if (prop.key.isPure === false) {
            currentKey = /** @type {LiteralNode} */ (prop.key).name;
          } else if (/** @type {LiteralNode} */ (prop.value)?.name) {
            currentKey = /** @type {LiteralNode} */ (prop.value).name;
          } else {
            const target = /** @type {BodyNode} */ (expr).toWatch[0];

            currentKey = /** @type {ExpressionNode} */ (target).property
              ? /** @type {LiteralNode} */ (
                  /** @type {ExpressionNode} */ (target).property
                ).name
              : /** @type {LiteralNode} */ (target).name;
          }

          if (currentKey) {
            keySet.push(currentKey);
            listener.property.push(currentKey);
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
      this._objectListeners.set(listenerObject, [/** @type {string} */ (key)]);
    }

    if (keySet.length > 0) {
      for (let i = 0, l = keySet.length; i < l; i++) {
        this.#registerKey(keySet[i], listener);
      }
    } else {
      this.#registerKey(/** @type {string} */ (key), listener);
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
        return this.#deregisterKey(/** @type {string} */ (key), listener.id);
      }
    };
  }

  /**
   * @param {ng.Scope} [childInstance]
   * @returns {Proxy<ng.Scope> & ng.Scope}
   */
  $new(childInstance) {
    let child;

    if (childInstance) {
      const proto = Object.getPrototypeOf(childInstance);

      // If child is plain object, or already inherits from target, set prototype to target
      if (proto === Object.prototype || proto === this.$target) {
        Object.setPrototypeOf(childInstance, this.$target);
      } else {
        // If child has some other prototype, preserve it but link to this.$target
        Object.setPrototypeOf(proto || childInstance, this.$target);
      }

      child = childInstance;
    } else {
      child = Object.create(this.$target);
    }

    const proxy = new Proxy(child, new Scope(this));

    this._children.push(proxy);

    return proxy;
  }

  /**
   * @param {ng.Scope} [instance]
   * @returns {Proxy<ng.Scope> & ng.Scope}
   */
  $newIsolate(instance) {
    const child = instance ? Object.create(instance) : nullObject();

    const proxy = new Proxy(child, new Scope(this, this.$root));

    this._children.push(proxy);

    return proxy;
  }

  /**
   * @param {ng.Scope} parentInstance
   * @returns {Proxy<ng.Scope> & ng.Scope}
   */
  $transcluded(parentInstance) {
    const child = Object.create(this.$target);

    const proxy = new Proxy(child, new Scope(this, parentInstance));

    this._children.push(proxy);

    return proxy;
  }

  /**
   * @param {string} key
   * @param {import("./interface.ts").Listener} listener
   */
  #registerKey(key, listener) {
    if (this._watchers.has(key)) {
      /** @type {import("./interface.ts").Listener[]} */ (
        this._watchers.get(key)
      ).push(listener);
    } else {
      this._watchers.set(key, [listener]);
    }
  }

  /**
   * @param {string} key
   * @param {import("./interface.ts").Listener} listener
   */
  _registerForeignKey(key, listener) {
    if (this._foreignListeners.has(key)) {
      /** @type {import("./interface.ts").Listener[]} */ (
        this._foreignListeners.get(key)
      ).push(listener);
    } else {
      this._foreignListeners.set(key, [listener]);
    }
  }

  /**
   * @param {string} key
   * @param {number} id
   */
  #deregisterKey(key, id) {
    const listenerList = this._watchers.get(key);

    if (!listenerList) return false;

    const index = listenerList.findIndex((x) => x.id === id);

    if (index === -1) return false;

    listenerList.splice(index, 1);

    if (listenerList.length) {
      this._watchers.set(key, listenerList);
    } else {
      this._watchers.delete(key);
    }

    return true;
  }

  /**
   * @param {string} key
   * @param {number} id
   */
  _deregisterForeignKey(key, id) {
    const listenerList = this._foreignListeners.get(key);

    if (!listenerList) return false;

    const index = listenerList.findIndex((x) => x.id === id);

    if (index === -1) return false;

    listenerList.splice(index, 1);

    if (listenerList.length) {
      this._foreignListeners.set(key, listenerList);
    } else {
      this._foreignListeners.delete(key);
    }

    return true;
  }

  /**
   * Evaluates an Angular expression in the context of this scope.
   *
   * @param {string} expr - Angular expression to evaluate
   * @param {Record<string, any>} [locals] - Optional local variables
   * @returns {any}
   */
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
    const list = entries(newTarget);

    for (let i = 0, l = list.length; i < l; i++) {
      const [key, value] = list[i];

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
    } catch (err) {
      return $exceptionHandler(err);
    }
  }

  /**
   * @param {string} name
   * @param {Function} listener
   * @returns {(function(): void)|*}
   */
  $on(name, listener) {
    let namedListeners = this._listeners.get(name);

    if (!namedListeners) {
      namedListeners = [];
      this._listeners.set(name, namedListeners);
    }
    namedListeners.push(listener);

    return () => {
      const indexOfListener = namedListeners.indexOf(listener);

      if (indexOfListener !== -1) {
        namedListeners.splice(indexOfListener, 1);

        if (namedListeners.length === 0) {
          this._listeners.delete(name);
        }
      }
    };
  }

  /**
   * @param {string} name
   * @param  {...any} args
   * @returns {ng.ScopeEvent | undefined}
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
   * Internal event propagation helper
   * @param {{ name: string, event?: ng.ScopeEvent, broadcast: boolean }} param0 - Event info
   * @param {...any} args - Additional arguments passed to listeners
   * @returns {ng.ScopeEvent|undefined}
   */
  #eventHelper({ name, event, broadcast }, ...args) {
    if (!broadcast) {
      if (!this._listeners.has(name)) {
        if (this.$parent) {
          return this.$parent.$handler.#eventHelper(
            { name, event, broadcast },
            ...args,
          );
        }

        return undefined;
      }
    }

    if (event) {
      event.currentScope = this.$proxy;
    } else {
      event = event || {
        name,
        targetScope: this.$proxy,
        currentScope: this.$proxy,
        stopped: false,
        stopPropagation() {
          /** @type {ng.ScopeEvent} */ (event).stopped = true;
        },
        preventDefault() {
          /** @type {ng.ScopeEvent} */ (event).defaultPrevented = true;
        },
        defaultPrevented: false,
      };
    }

    const listenerArgs = concat([event], [event].concat(args), 1);

    const listeners = this._listeners.get(name);

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
      if (this._children.length > 0) {
        this._children.forEach((child) => {
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
    if (this._destroyed) return;

    this.$broadcast("$destroy");

    for (const [key, val] of this._watchers) {
      for (let i = val.length - 1; i >= 0; i--) {
        if (val[i].scopeId === this.$id) {
          val.splice(i, 1);
        }
      }

      if (val.length === 0) {
        this._watchers.delete(key);
      } else {
        this._watchers.set(key, val);
      }
    }

    if (this.#isRoot()) {
      this._watchers.clear();
    } else {
      const children = /** @type {Scope} */ (this.$parent)._children;

      for (let i = 0, l = children.length; i < l; i++) {
        if (children[i].$id === this.$id) {
          children.splice(i, 1);
          break;
        }
      }
    }

    this._listeners.clear();
    this._destroyed = true;
  }

  /**
   * @internal
   * @param {import('./interface.ts').Listener} listener - The property path that was changed.
   * @param {Scope | typeof Proxy<Scope> | undefined} target
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

      if (isArray(newVal)) {
        for (let i = 0, l = newVal.length; i < l; i++) {
          if (isFunction(newVal[i])) {
            newVal[i] = newVal[i](originalTarget);
          }
        }
      }

      listenerFn(newVal, originalTarget);

      while ($postUpdateQueue.length) {
        const fn = /** @type {Function} */ ($postUpdateQueue.shift());

        fn();
      }
    } catch (err) {
      $exceptionHandler(err);
    }
  }

  /* @ignore */
  $flushQueue() {
    while ($postUpdateQueue.length) {
      /** @type {Function} */ ($postUpdateQueue.shift())();
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

      for (const child of this._children) {
        const found = child.$getById(id);

        if (found) {
          res = found;
          break;
        }
      }

      return res;
    }
  }

  /**
   * @param {string} name
   * @returns {ng.Scope|undefined}
   */
  $searchByName(name) {
    const stack = [this.$root];

    while (stack.length) {
      const scope = /** @type {Scope} */ (stack.pop());

      if (scope.$scopename === name) {
        return scope;
      }

      if (scope._children?.length) {
        for (let i = scope._children.length - 1; i >= 0; i--) {
          stack.push(scope._children[i]);
        }
      }
    }

    return undefined;
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

  for (const watchers of model._watchers.values()) {
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
    const node = /** @type {Scope} */ (stack.pop());

    if (!ids.has(node.$id)) {
      ids.add(node.$id);

      if (node._children) {
        for (let i = 0, l = node._children.length; i < l; i++) {
          stack.push(node._children[i]);
        }
      }
    }
  }

  return ids;
}
