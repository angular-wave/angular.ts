import {
  applyPairs,
  copy,
  inherit,
  map,
  omit,
  tail,
} from "../../shared/common.js";
import {
  hasOwn,
  isArray,
  isDefined,
  isFunction,
  isString,
} from "../../shared/utils.js";
import { stringify } from "../../shared/strings.js";
import { is, pattern, val } from "../../shared/hof.js";
import { Resolvable } from "../resolve/resolvable.js";
import { ng1ViewsBuilder } from "./views.js";
import { annotate } from "../../core/di/di.js";

/** @typedef {import("./interface.js").BuilderFunction} BuilderFunction */
/** @typedef {import("./interface.js").Builders} Builders */
/** @typedef {import("../url/url-matcher.js").UrlMatcher} UrlMatcher */

/**
 * @param {unknown} url
 */
function parseUrl(url) {
  if (!isString(url)) return false;
  const root = url.charAt(0) === "^";

  return { val: root ? url.substring(1) : url, root };
}

/**
 *
 * @param {ng.BuiltStateDeclaration} state
 * @returns {ng.StateDeclaration}
 */
function selfBuilder(state) {
  state.self._state = () => state;

  return state.self;
}

/**
 * @param {ng.BuiltStateDeclaration} state
 * @returns {any}
 */
function dataBuilder(state) {
  if (state.parent && state.parent.data) {
    state.data = state.self.data = inherit(state.parent.data, state.data);
  }

  return state.data;
}

/**
 * @param {ng.UrlService} $url
 * @param {() => ng.StateObject | ng.BuiltStateDeclaration | undefined} root
 */
function getUrlBuilder($url, root) {
  return function (/** @type {ng.StateObject} */ stateObject) {
    let stateDec = stateObject.self;

    // For future states, i.e., states whose name ends with `.**`,
    // match anything that starts with the url prefix
    if (
      stateDec &&
      stateDec.url &&
      stateDec.name &&
      stateDec.name.match(/\.\*\*$/)
    ) {
      const newStateDec = /** @type {ng.BuiltStateDeclaration} */ ({});

      copy(stateDec, newStateDec);
      newStateDec.url += "{remainder:any}"; // match any path (.*)
      stateDec = newStateDec;
    }
    const { parent } = stateObject;

    const parsed = parseUrl(stateDec.url);

    const url = /** @type {UrlMatcher & Record<string, any>} */ (
      !parsed ? stateDec.url : $url.compile(parsed.val, { state: stateDec })
    );

    if (!url) return null;

    if (!$url.isMatcher(url))
      throw new Error(`Invalid url '${url}' in state '${stateObject}'`);

    return parsed && parsed.root
      ? url
      : (
          (parent && parent?.navigable) ||
          /** @type {ng.StateObject | ng.BuiltStateDeclaration} */ (root())
        ).url.append(url);
  };
}

/**
 * @param {{ (state: ng.StateObject): boolean; (arg0: any): any; }} rootFn
 */
function getNavigableBuilder(rootFn) {
  return function (/** @type {ng.StateObject} */ state) {
    return !rootFn(state) && state.url
      ? state
      : state.parent
        ? state.parent.navigable
        : null;
  };
}

/**
 * @param {import("../params/param-factory.js").ParamFactory} paramFactory
 */
function getParamsBuilder(paramFactory) {
  return function (/** @type {ng.BuiltStateDeclaration} */ state) {
    const makeConfigParam = (
      /** @type {import("../params/interface.js").ParamDeclaration} */ _config,
      /** @type {string | number} */ id,
    ) => paramFactory.fromConfig(/** @type {string} */ (id), null, state.self);

    const urlParams = /** @type {import("./state-object.js").Param[]} */ (
      (state.url && state.url.parameters({ inherit: false })) || []
    );

    const nonUrlParams = Object.values(
      map(
        omit(
          state.params || {},
          urlParams.map((x) => x.id),
        ),
        makeConfigParam,
      ),
    );

    return urlParams
      .concat(nonUrlParams)
      .map((x) => [x.id, x])
      .reduce(applyPairs, {});
  };
}

/**
 * @param {ng.StateObject} state
 */
function pathBuilder(state) {
  return state.parent ? state.parent?.path?.concat(state) : [state];
}

/**
 * @param {ng.StateObject} state
 */
function includesBuilder(state) {
  const includes = state.parent ? Object.assign({}, state.parent.includes) : {};

  includes[state.name] = true;

  return includes;
}

/**
 * This is a [[StateBuilder.builder]] function for the `resolve:` block on a [[StateDeclaration]].
 *
 * When the [[StateBuilder]] builds a [[StateObject]] object from a raw [[StateDeclaration]], this builder
 * validates the `resolve` property and converts it to a [[Resolvable]] array.
 *
 * resolve: input value can be:
 *
 * {
 *   // analyzed but not injected
 *   myFooResolve: function() { return "myFooData"; },
 *
 *   // function.toString() parsed, "DependencyName" dep as string (not min-safe)
 *   myBarResolve: function(DependencyName) { return DependencyName.fetchSomethingAsPromise() },
 *
 *   // Array split; "DependencyName" dep as string
 *   myBazResolve: [ "DependencyName", function(dep) { return dep.fetchSomethingAsPromise() },
 *
 *   // Array split; DependencyType dep as token (compared using ===)
 *   myQuxResolve: [ DependencyType, function(dep) { return dep.fetchSometingAsPromise() },
 *
 *   // val.$inject used as deps
 *   // where:
 *   //     corgeResolve.$inject = ["DependencyName"];
 *   //     function corgeResolve(dep) { dep.fetchSometingAsPromise() }
 *   // then "DependencyName" dep as string
 *   myCorgeResolve: corgeResolve,
 *
 *  // inject service by name
 *  // When a string is found, desugar creating a resolve that injects the named service
 *   myGraultResolve: "SomeService"
 * }
 *
 * or:
 *
 * [
 *   new Resolvable("myFooResolve", function() { return "myFooData" }),
 *   new Resolvable("myBarResolve", function(dep) { return dep.fetchSomethingAsPromise() }, [ "DependencyName" ]),
 *   { provide: "myBazResolve", useFactory: function(dep) { dep.fetchSomethingAsPromise() }, deps: [ "DependencyName" ] }
 * ]
 * @param {ng.StateObject & ng.StateDeclaration} state
 * @param {boolean | undefined} strictDi
 */
export function resolvablesBuilder(state, strictDi) {
  /** convert resolve: {} and resolvePolicy: {} objects to an array of tuples */
  const objects2Tuples = (
    /** @type {Record<string, any> | undefined} */ resolveObj,
    /** @type {Record<string, import("../resolve/interface.js").ResolvePolicy>} */ resolvePolicies,
  ) =>
    Object.keys(resolveObj || {}).map((token) => ({
      token,
      val: /** @type {Record<string, any>} */ (resolveObj)[token],
      deps: undefined,
      policy: resolvePolicies[token],
    }));

  /** fetch DI annotations from a function or ng1-style array */
  const annotateFn = (/** @type {Function} */ fn) => annotate(fn, strictDi);

  /** true if the object has both `token` and `resolveFn`, and is probably a [[ResolveLiteral]] */
  const isResolveLiteral = (
    /** @type {{ token: any; resolveFn: any; }} */ obj,
  ) => !!(obj.token && obj.resolveFn);

  /** true if the object looks like a tuple from obj2Tuples */
  const isTupleFromObj = (/** @type {{ val: unknown; }} */ obj) =>
    !!(
      obj &&
      obj.val &&
      (isString(obj.val) || isArray(obj.val) || isFunction(obj.val))
    );

  // Given a literal resolve or provider object, returns a Resolvable
  const literal2Resolvable = pattern([
    [
      (/** @type {{ resolveFn: any; }} */ x) => x.resolveFn,
      (/** @type {any} */ y) =>
        new Resolvable(getToken(y), y.resolveFn, y.deps, y.policy),
    ],
    [
      (/** @type {{ useFactory: any; }} */ x) => x.useFactory,
      (/** @type {any} */ y) =>
        new Resolvable(
          getToken(y),
          y.useFactory,
          y.deps || y.dependencies,
          y.policy,
        ),
    ],
    [
      (/** @type {{ useClass: any; }} */ x) => x.useClass,
      (/** @type {any} */ y) =>
        new Resolvable(getToken(y), () => new y.useClass(), [], y.policy),
    ],
    [
      (/** @type {{ useValue: any; }} */ x) => x.useValue,
      (/** @type {any} */ y) =>
        new Resolvable(getToken(y), () => y.useValue, [], y.policy, y.useValue),
    ],
    [
      (/** @type {{ useExisting: any; }} */ x) => x.useExisting,
      (/** @type {any} */ y) =>
        new Resolvable(
          getToken(y),
          (/** @type {any} */ x) => x,
          [y.useExisting],
          y.policy,
        ),
    ],
  ]);

  const tuple2Resolvable = pattern([
    [
      (/** @type {{ val: unknown; }} */ x) => isString(x.val),
      (
        /** @type {{ token: any; val: any; policy: import("../resolve/interface.js").ResolvePolicy | undefined; }} */ tuple,
      ) =>
        new Resolvable(
          tuple.token,
          (/** @type {any} */ x) => x,
          [tuple.val],
          tuple.policy,
        ),
    ],
    [
      (/** @type {{ val: any; }} */ x) => isArray(x.val),
      (/** @type {any} */ tuple) =>
        new Resolvable(
          tuple.token,
          tail(tuple.val),
          tuple.val.slice(0, -1),
          tuple.policy,
        ),
    ],
    [
      (/** @type {{ val: any; }} */ x) => isFunction(x.val),
      (/** @type {any} */ tuple) =>
        new Resolvable(
          tuple.token,
          tuple.val,
          annotateFn(tuple.val),
          tuple.policy,
        ),
    ],
  ]);

  const item2Resolvable = pattern([
    [is(Resolvable), (/** @type {any} */ x) => x],
    [isResolveLiteral, literal2Resolvable],
    [isTupleFromObj, tuple2Resolvable],
    [
      val(true),
      (/** @type {any} */ obj) => {
        throw new Error(`Invalid resolve value: ${stringify(obj)}`);
      },
    ],
  ]);

  // If resolveBlock is already an array, use it as-is.
  // Otherwise, assume it's an object and convert to an Array of tuples
  const decl = state.resolve;

  const items = isArray(decl)
    ? decl
    : objects2Tuples(decl, /** @type {any} */ (state.resolvePolicy || {}));

  return items.map(item2Resolvable);
}
/**
 * A internal global service
 *
 * StateBuilder is a factory for the internal [[StateObject]] objects.
 *
 * When you register a state with the [[StateRegistry]], you register a plain old javascript object which
 * conforms to the [[StateDeclaration]] interface.  This factory takes that object and builds the corresponding
 * [[StateObject]] object, which has an API and is used internally.
 *
 * Custom properties or API may be added to the internal [[StateObject]] object by registering a decorator function
 * using the [[builder]] method.
 */
export class StateBuilder {
  /**
   * @param {import('./state-matcher.js').StateMatcher} matcher
   * @param {ng.UrlService} urlService
   */
  constructor(matcher, urlService) {
    this._matcher = matcher;
    /** @type {ng.InjectorService | undefined} */
    this._$injector = undefined;
    const self = this;

    const root = () => matcher.find("");

    /**
     * @param {ng.StateObject} state
     */
    function parentBuilder(state) {
      if (isRoot(state)) return null;

      return matcher.find(self.parentName(state)) || root();
    }
    /** @type {Builders} */
    this._builders = {
      name: [(/** @type {ng.StateObject} */ state) => state.name],
      self: [selfBuilder],
      parent: [parentBuilder],
      data: [dataBuilder],
      // Build a URLMatcher if necessary, either via a relative or absolute URL
      url: [getUrlBuilder(urlService, root)],
      // Keep track of the closest ancestor state that has a URL (i.e. is navigable)
      navigable: [getNavigableBuilder(isRoot)],
      // TODO
      params: [getParamsBuilder(urlService._paramFactory)],
      views: [ng1ViewsBuilder],
      // Keep a full path from the root down to this state as this is needed for state activation.
      path: [pathBuilder],
      // Speed up $state.includes() as it's used a lot
      includes: [includesBuilder],
      resolvables: [
        (/** @type {ng.StateObject & ng.StateDeclaration} */ state) =>
          resolvablesBuilder(
            state,
            this._$injector && this._$injector.strictDi,
          ),
      ],
    };
  }

  /**
   * @param {string} name
   * @param {*} fn
   * @returns {BuilderFunction | BuilderFunction[] | null | undefined}
   */
  builder(name, fn) {
    const { _builders: builders } = this;

    const array = builders[name] || [];

    // Backwards compat: if only one builder exists, return it, else return whole arary.
    if (isString(name) && !isDefined(fn))
      return array.length > 1 ? array : array[0];

    if (!isString(name) || !isFunction(fn)) return undefined;
    builders[name] = array;
    builders[name].push(fn);

    return () => builders[name].splice(builders[name].indexOf(fn, 1)) && null;
  }

  /**
   * Builds all of the properties on an essentially blank State object, returning a State object which has all its
   * properties and API built.
   *
   * @param {ng.StateObject} state an uninitialized State object
   * @returns {ng.StateObject | null} the built State object
   */
  build(state) {
    const { _matcher: matcher, _builders: builders } = this;

    const parent = this.parentName(state);

    if (parent && !matcher.find(parent, undefined, false)) {
      return null;
    }

    for (const key in builders) {
      if (!hasOwn(builders, key)) continue;
      const chain = builders[key].reduce(
        (
          /** @type {BuilderFunction} */ parentFn,
          /** @type {BuilderFunction} */ step,
        ) =>
          (_state) =>
            step(_state, parentFn),
        () => {
          /* empty */
        },
      );

      state[key] = chain(
        /** @type {ng.StateObject & ng.BuiltStateDeclaration} */ (state),
      );
    }

    return state;
  }

  /**
   *
   * @param {ng.StateObject} state
   * @returns {string}
   */
  parentName(state) {
    // name = 'foo.bar.baz.**'
    const name = state.name || "";

    // segments = ['foo', 'bar', 'baz', '.**']
    const segments = name.split(".");

    // segments = ['foo', 'bar', 'baz']
    const lastSegment = segments.pop();

    // segments = ['foo', 'bar'] (ignore .** segment for future states)
    if (lastSegment === "**") segments.pop();

    if (segments.length) {
      if (state.parent) {
        throw new Error(
          `States that specify the 'parent:' property should not have a '.' in their name (${name})`,
        );
      }

      // 'foo.bar'
      return segments.join(".");
    }

    if (!state.parent) return "";

    return isString(state.parent) ? state.parent : state.parent.name;
  }

  /** @param {ng.StateObject} state*/
  name(state) {
    const { name } = state;

    if (name.indexOf(".") !== -1 || !state.parent) return name;
    const parentName = isString(state.parent)
      ? state.parent
      : state.parent.name;

    return parentName ? `${parentName}.${name}` : name;
  }
}

/**
 * @param {ng.StateObject} state
 * @returns {boolean}
 */
function isRoot(state) {
  return state.name === "";
}

/**
 * extracts the token from a Provider or provide literal
 * @param {{ provide: any; token: any; }} provider
 */
function getToken(provider) {
  return provider.provide || provider.token;
}
