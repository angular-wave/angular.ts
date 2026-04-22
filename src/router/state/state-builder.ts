import {
  applyPairs,
  copy,
  inherit,
  map,
  omit,
  pick,
  tail,
} from "../../shared/common.ts";
import {
  entries,
  hasOwn,
  isArray,
  isDefined,
  isFunction,
  isString,
  values,
} from "../../shared/utils.ts";
import { stringify } from "../../shared/strings.ts";
import { is, pattern, val } from "../../shared/hof.ts";
import { Resolvable } from "../resolve/resolvable.ts";
import { annotate } from "../../core/di/di.ts";
import { ViewConfig } from "./views.ts";
import type { ParamDeclaration } from "../params/interface.ts";
import type { ParamFactory } from "../params/param-factory.ts";
import type {
  ResolvePolicy,
  ResolvableLiteral,
  ProviderLike,
} from "../resolve/interface.ts";
import type {
  BuilderFunction,
  Builders,
  BuiltStateDeclaration,
  StateDeclaration,
} from "./interface.ts";
import type { StateMatcher } from "./state-matcher.ts";
import type { StateObject } from "./state-object.ts";
import type { UrlMatcher } from "../url/url-matcher.ts";

/**
 * @param {unknown} url
 */
function parseUrl(url: unknown): false | { val: string; root: boolean } {
  if (!isString(url)) return false;
  const root = url.charAt(0) === "^";

  return { val: root ? url.substring(1) : url, root };
}

/**
 *
 * @param {ng.BuiltStateDeclaration} state
 * @returns {ng.StateDeclaration}
 */
function selfBuilder(state: BuiltStateDeclaration): StateDeclaration {
  state.self._state = () => state;

  return state.self;
}

/**
 * @param {ng.BuiltStateDeclaration} state
 * @returns {any}
 */
function dataBuilder(state: BuiltStateDeclaration): any {
  if (state.parent && state.parent.data) {
    state.data = state.self.data = inherit(state.parent.data, state.data);
  }

  return state.data;
}

/**
 * @param {ng.UrlService} $url
 * @param {() => ng.StateObject | ng.BuiltStateDeclaration | undefined} root
 */
function getUrlBuilder(
  $url: ng.UrlService,
  root: () => StateObject | BuiltStateDeclaration | undefined,
): BuilderFunction {
  return function (stateObject: StateObject & BuiltStateDeclaration) {
    let stateDec = stateObject.self;

    // For future states, i.e., states whose name ends with `.**`,
    // match anything that starts with the url prefix
    if (
      stateDec &&
      stateDec.url &&
      stateDec.name &&
      stateDec.name.match(/\.\*\*$/)
    ) {
      const newStateDec = {} as BuiltStateDeclaration;

      copy(stateDec, newStateDec);
      newStateDec.url += "{remainder:any}"; // match any path (.*)
      stateDec = newStateDec;
    }
    const { parent } = stateObject;

    const parsed = parseUrl(stateDec.url);

    const url = (
      !parsed ? stateDec.url : $url.compile(parsed.val, { state: stateDec })
    ) as (UrlMatcher & Record<string, any>) | null;

    if (!url) return null;

    if (!$url.isMatcher(url))
      throw new Error(`Invalid url '${url}' in state '${stateObject}'`);

    return parsed && parsed.root
      ? url
      : (
          (parent && parent?.navigable) ||
          (root() as StateObject | BuiltStateDeclaration)
        ).url.append(url);
  };
}

/**
 * @param {{ (state: ng.StateObject): boolean; (arg0: any): any; }} rootFn
 */
function getNavigableBuilder(
  rootFn: (state: StateObject) => boolean,
): BuilderFunction {
  return function (state: StateObject & BuiltStateDeclaration) {
    return !rootFn(state) && state.url
      ? state
      : state.parent
        ? state.parent.navigable
        : null;
  };
}

/**
 * @param {ParamFactory} paramFactory
 */
function getParamsBuilder(paramFactory: ParamFactory): BuilderFunction {
  return function (state: BuiltStateDeclaration) {
    const makeConfigParam = (_config: ParamDeclaration, id: string | number) =>
      paramFactory.fromConfig(String(id), null, state.self);

    const urlParams =
      (state.url && state.url.parameters({ inherit: false })) || [];

    const nonUrlParams = values(
      map(
        omit(
          state.params || {},
          urlParams.map((x: any) => x.id),
        ),
        makeConfigParam,
      ),
    );

    return urlParams
      .concat(nonUrlParams)
      .map((x: any) => [x.id, x] as [string, any])
      .reduce(applyPairs, {});
  };
}

/**
 * @param {ng.StateObject} state
 */
function pathBuilder(state: StateObject): StateObject[] {
  return state.parent ? (state.parent.path || []).concat(state) : [state];
}

/**
 * @param {ng.StateObject} state
 */
function includesBuilder(state: StateObject): Record<string, boolean> {
  const includes = state.parent ? Object.assign({}, state.parent.includes) : {};

  includes[state.name] = true;

  return includes;
}

function hasAnyViewKey(keys: string[], obj: Record<string, any>): boolean {
  for (let i = 0; i < keys.length; i++) {
    if (isDefined(obj[keys[i]])) {
      return true;
    }
  }

  return false;
}

function viewsBuilder(
  state: StateObject & Record<string, any>,
): Record<string, any> {
  if (!state.parent) {
    return {};
  }

  const tplKeys = [
    "templateProvider",
    "templateUrl",
    "template",
    "notify",
    "async",
  ];

  const ctrlKeys = [
    "controller",
    "controllerProvider",
    "controllerAs",
    "resolveAs",
  ];

  const compKeys = ["component", "bindings", "componentProvider"];

  const nonCompKeys = tplKeys.concat(ctrlKeys);

  const allViewKeys = compKeys.concat(nonCompKeys);

  if (isDefined(state.views) && hasAnyViewKey(allViewKeys, state)) {
    throw new Error(
      `State '${state.name}' has a 'views' object. ` +
        `It cannot also have "view properties" at the state level.  ` +
        `Move the following properties into a view (in the 'views' object): ` +
        ` ${allViewKeys.filter((key) => isDefined(state[key])).join(", ")}`,
    );
  }

  const views: Record<string, any> = {};

  const viewsObject = (state.views || {
    $default: pick(state, allViewKeys),
  }) as Record<string, any>;

  const viewEntries = entries(viewsObject);

  for (let i = 0; i < viewEntries.length; i++) {
    const [entryName, entryConfig] = viewEntries[i];

    let name = entryName as string;

    let config = entryConfig as Record<string, any> | string;

    name = name || "$default";

    if (isString(config)) {
      config = { component: config };
    }

    config = Object.assign({}, config);

    if (hasAnyViewKey(compKeys, config) && hasAnyViewKey(nonCompKeys, config)) {
      throw new Error(
        `Cannot combine: ${compKeys.join("|")} with: ${nonCompKeys.join("|")} in stateview: '${name}@${state.name}'`,
      );
    }

    config.resolveAs = config.resolveAs || "$resolve";
    config.$context = state;
    config.$name = name;
    const normalized = ViewConfig.normalizeUIViewTarget(
      config.$context as StateObject,
      config.$name as string,
    );

    config.$ngViewName = normalized.ngViewName;
    config.$ngViewContextAnchor = normalized.ngViewContextAnchor;
    views[name] = config;
  }

  return views;
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
export function resolvablesBuilder(
  state: StateObject & StateDeclaration,
  strictDi: boolean | undefined,
): Resolvable[] {
  /** convert resolve: {} and resolvePolicy: {} objects to an array of tuples */
  const objects2Tuples = (
    resolveObj: Record<string, any> | undefined,
    resolvePolicies: Record<string, ResolvePolicy>,
  ) =>
    Object.keys(resolveObj || {}).map((token) => ({
      token,
      val: (resolveObj || {})[token],
      deps: undefined,
      policy: resolvePolicies[token],
    }));

  /** fetch DI annotations from a function or ng1-style array */
  const annotateFn = (fn: Function) => annotate(fn, strictDi);

  /** true if the object has both `token` and `resolveFn`, and is probably a [[ResolveLiteral]] */
  const isResolveLiteral = (obj: { token: any; resolveFn: any }) =>
    !!(obj.token && obj.resolveFn);

  /** true if the object looks like a tuple from obj2Tuples */
  const isTupleFromObj = (obj: { val: unknown }) =>
    !!(
      obj &&
      obj.val &&
      (isString(obj.val) || isArray(obj.val) || isFunction(obj.val))
    );

  // Given a literal resolve or provider object, returns a Resolvable
  const literal2Resolvable = pattern([
    [
      (x: { resolveFn: any }) => x.resolveFn,
      (y: ResolvableLiteral) =>
        new Resolvable(getToken(y), y.resolveFn, y.deps, y.policy),
    ],
    [
      (x: { useFactory: any }) => x.useFactory,
      (
        y: ProviderLike & {
          token?: any;
          policy?: ResolvePolicy;
          dependencies?: any[];
        },
      ) =>
        new Resolvable(
          getToken(y),
          y.useFactory,
          y.deps || y.dependencies,
          y.policy,
        ),
    ],
    [
      (x: { useClass: any }) => x.useClass,
      (
        y: ProviderLike & {
          useClass: any;
          token?: any;
          policy?: ResolvePolicy;
        },
      ) => new Resolvable(getToken(y), () => new y.useClass(), [], y.policy),
    ],
    [
      (x: { useValue: any }) => x.useValue,
      (
        y: ProviderLike & {
          useValue: any;
          token?: any;
          policy?: ResolvePolicy;
        },
      ) =>
        new Resolvable(getToken(y), () => y.useValue, [], y.policy, y.useValue),
    ],
    [
      (x: { useExisting: any }) => x.useExisting,
      (
        y: ProviderLike & {
          useExisting: any;
          token?: any;
          policy?: ResolvePolicy;
        },
      ) =>
        new Resolvable(getToken(y), (x: any) => x, [y.useExisting], y.policy),
    ],
  ]);

  const tuple2Resolvable = pattern([
    [
      (x: { val: unknown }) => isString(x.val),
      (tuple: { token: any; val: any; policy: ResolvePolicy | undefined }) =>
        new Resolvable(tuple.token, (x: any) => x, [tuple.val], tuple.policy),
    ],
    [
      (x: { val: any }) => isArray(x.val),
      (tuple: { token: any; val: any[]; policy?: ResolvePolicy }) =>
        new Resolvable(
          tuple.token,
          tail(tuple.val),
          tuple.val.slice(0, -1),
          tuple.policy,
        ),
    ],
    [
      (x: { val: any }) => isFunction(x.val),
      (tuple: { token: any; val: Function; policy?: ResolvePolicy }) =>
        new Resolvable(
          tuple.token,
          tuple.val,
          annotateFn(tuple.val),
          tuple.policy,
        ),
    ],
  ]);

  const item2Resolvable = pattern([
    [is(Resolvable), (x: Resolvable) => x],
    [isResolveLiteral, literal2Resolvable],
    [isTupleFromObj, tuple2Resolvable],
    [
      val(true),
      (obj: any) => {
        throw new Error(`Invalid resolve value: ${stringify(obj)}`);
      },
    ],
  ]);

  // If resolveBlock is already an array, use it as-is.
  // Otherwise, assume it's an object and convert to an Array of tuples
  const decl = state.resolve;

  const items = isArray(decl)
    ? decl
    : objects2Tuples(
        decl,
        (state.resolvePolicy || {}) as unknown as Record<string, ResolvePolicy>,
      );

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
  /** @internal */
  _matcher: StateMatcher;
  /** @internal */
  _$injector: ng.InjectorService | undefined;
  /** @internal */
  _builders: Builders;

  /**
   * @param {StateMatcher} matcher
   * @param {ng.UrlService} urlService
   */
  constructor(matcher: StateMatcher, urlService: ng.UrlService) {
    this._matcher = matcher;
    this._$injector = undefined;
    const self = this;

    const root = () => matcher.find("");

    /**
     * @param {ng.StateObject} state
     */
    function parentBuilder(state: StateObject) {
      if (isRoot(state)) return null;

      return matcher.find(self.parentName(state)) || root();
    }
    /** @type {Builders} */
    this._builders = {
      name: [(state: StateObject) => state.name],
      self: [selfBuilder],
      parent: [parentBuilder],
      data: [dataBuilder],
      // Build a URLMatcher if necessary, either via a relative or absolute URL
      url: [getUrlBuilder(urlService, root)],
      // Keep track of the closest ancestor state that has a URL (i.e. is navigable)
      navigable: [getNavigableBuilder(isRoot)],
      // TODO
      params: [getParamsBuilder(urlService._paramFactory)],
      // Keep a full path from the root down to this state as this is needed for state activation.
      path: [pathBuilder],
      // Speed up $state.includes() as it's used a lot
      includes: [includesBuilder],
      resolvables: [
        (state: StateObject & StateDeclaration) =>
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
  builder(
    name: string,
    fn?: any,
  ): BuilderFunction | BuilderFunction[] | (() => null) | undefined {
    const { _builders: builders } = this;

    const array = builders[name] || [];

    // Backwards compat: if only one builder exists, return it, else return whole arary.
    if (isString(name) && !isDefined(fn))
      return array.length > 1 ? array : array[0];

    if (!isString(name) || !isFunction(fn)) return undefined;
    builders[name] = array;
    builders[name].push(fn);

    return () => {
      builders[name].splice(builders[name].indexOf(fn, 1));

      return null;
    };
  }

  /**
   * Builds all of the properties on an essentially blank State object, returning a State object which has all its
   * properties and API built.
   *
   * @param {ng.StateObject} state an uninitialized State object
   * @returns {ng.StateObject | null} the built State object
   */
  build(state: StateObject): StateObject | null {
    const { _matcher: matcher, _builders: builders } = this;

    const parent = this.parentName(state);

    if (parent && !matcher.find(parent, undefined, false)) {
      return null;
    }

    for (const key in builders) {
      if (!hasOwn(builders, key)) continue;
      const chain = builders[key].reduce(
        (parentFn: BuilderFunction, step: BuilderFunction) => (_state) =>
          step(_state, parentFn),
        () => {
          /* empty */
        },
      );

      (state as Record<string, any>)[key] = chain(
        state as StateObject & BuiltStateDeclaration,
      );
    }

    state.views = viewsBuilder(state as StateObject & BuiltStateDeclaration);

    return state;
  }

  /**
   *
   * @param {ng.StateObject} state
   * @returns {string}
   */
  parentName(state: StateObject): string {
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
  name(state: StateObject): string {
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
function isRoot(state: StateObject): boolean {
  return state.name === "";
}

/**
 * extracts the token from a Provider or provide literal
 * @param {{ provide: any; token: any; }} provider
 */
function getToken(provider: { provide?: any; token?: any }) {
  return provider.provide || provider.token;
}
