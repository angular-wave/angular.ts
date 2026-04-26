import { inherit } from "../../shared/common.ts";
import {
  assign,
  entries,
  hasOwn,
  isArray,
  isDefined,
  isFunction,
  isString,
  keys,
} from "../../shared/utils.ts";
import { stringify } from "../../shared/strings.ts";
import { ResolveContext } from "../resolve/resolve-context.ts";
import { Resolvable } from "../resolve/resolvable.ts";
import { annotate } from "../../core/di/di.ts";
import { ViewConfig } from "./views.ts";
import type { ParamFactory } from "../params/param-factory.ts";
import type { InjectorService } from "../../core/di/internal-injector.ts";
import type { ResolvableLiteral } from "../resolve/interface.ts";
import type { BuiltStateDeclaration, StateDeclaration } from "./interface.ts";
import type { PathNode } from "../path/path-node.ts";
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

function buildUrl(
  stateObject: StateObject & BuiltStateDeclaration,
  $url: ng.UrlService,
  root: StateObject | BuiltStateDeclaration,
) {
  const stateDec = stateObject.self;

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
    : ((parent && parent.navigable) || root).url.append(url);
}

/**
 * @param {ParamFactory} paramFactory
 */
function buildParams(
  state: BuiltStateDeclaration,
  paramFactory: ParamFactory,
): Record<string, any> {
  const urlParams =
    (state.url && state.url.parameters({ inherit: false })) || [];

  const params: Record<string, any> = {};

  for (let i = 0; i < urlParams.length; i++) {
    const param = urlParams[i];

    params[param.id] = param;
  }

  const urlParamIds = new Set<string>();

  for (let i = 0; i < urlParams.length; i++) {
    urlParamIds.add(urlParams[i].id);
  }

  const paramConfigs = state.params || {};

  const paramConfigKeys = keys(paramConfigs);

  for (let i = 0; i < paramConfigKeys.length; i++) {
    const id = paramConfigKeys[i];

    if (!urlParamIds.has(id)) {
      params[id] = paramFactory.fromConfig(id, null, state.self);
    }
  }

  return params;
}

function hasAnyViewKey(keyItems: string[], obj: Record<string, any>): boolean {
  for (let i = 0; i < keyItems.length; i++) {
    if (isDefined(obj[keyItems[i]])) {
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

  const ctrlKeys = ["controller", "controllerAs", "resolveAs"];

  const compKeys = ["component", "bindings"];

  const nonCompKeys = tplKeys.concat(ctrlKeys);

  const allViewKeys = compKeys.concat(nonCompKeys);

  if (isDefined(state.views) && hasAnyViewKey(allViewKeys, state)) {
    throw new Error(
      `State '${state.name}' has a 'views' object. ` +
        `It cannot also have view properties at the state level. ` +
        `Move these properties into a view declaration: ` +
        `${allViewKeys.filter((key) => isDefined(state[key])).join(", ")}`,
    );
  }

  const views: Record<string, any> = {};

  const defaultViewConfig: Record<string, any> = {};

  for (let i = 0; i < allViewKeys.length; i++) {
    const key = allViewKeys[i];

    if (isDefined(state[key])) {
      defaultViewConfig[key] = state[key];
    }
  }

  const viewsObject = (state.views || {
    $default: defaultViewConfig,
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

    config = assign({}, config);

    if (hasAnyViewKey(compKeys, config) && hasAnyViewKey(nonCompKeys, config)) {
      throw new Error(
        `Cannot combine: ${compKeys.join("|")} with: ${nonCompKeys.join("|")} in state view '${name}@${state.name}'`,
      );
    }

    config.resolveAs = config.resolveAs || "$resolve";
    config.$context = state;
    config.$name = name;

    const normalized = ViewConfig.normalizeNgViewTarget(
      config.$context as StateObject,
      config.$name as string,
    );

    config.$ngViewName = normalized.ngViewName;
    config.$ngViewContextAnchor = normalized.ngViewContextAnchor;

    views[name] = config;
  }

  return views;
}

function getResolveLocals(ctx: ResolveContext): Record<string, any> {
  const tokens = ctx.getTokens().filter(isString);

  const locals: Record<string, any> = {};

  for (let i = 0; i < tokens.length; i++) {
    const key = tokens[i];

    const resolvable = ctx.getResolvable(key);

    locals[key] = resolvable.data;
  }

  return locals;
}

function valueToResolvable(
  token: string,
  value: any,
  strictDi: boolean | undefined,
): Resolvable {
  if (isArray(value)) {
    return new Resolvable(token, value[value.length - 1], value.slice(0, -1));
  }

  if (isFunction(value)) {
    return new Resolvable(token, value, annotate(value, strictDi));
  }

  throw new Error(`Invalid resolve value: ${stringify({ token, val: value })}`);
}

function literalToResolvable(literal: ResolvableLiteral): Resolvable {
  if (
    literal &&
    hasOwn(literal, "token") &&
    (hasOwn(literal, "resolveFn") || hasOwn(literal, "data"))
  ) {
    return new Resolvable(literal);
  }

  throw new Error(`Invalid resolve value: ${stringify(literal)}`);
}

/**
 * Builds the `resolve:` block on a [[StateDeclaration]].
 *
 * When the [[StateBuilder]] builds a [[StateObject]] object from a raw [[StateDeclaration]], this function
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
 * }
 *
 * or:
 *
 * [
 *   { token: "myFooResolve", resolveFn: function() { return "myFooData" } },
 *   { token: "myBarResolve", resolveFn: function(dep) { return dep.fetchSomethingAsPromise() }, deps: [ "DependencyName" ] },
 *   { token: "myBazResolve", resolveFn: function(dep) { return dep.fetchSomethingAsPromise() }, deps: [ "DependencyName" ] }
 * ]
 * @param {ng.StateObject & ng.StateDeclaration} state
 * @param {boolean | undefined} strictDi
 */
function resolvablesBuilder(
  state: StateObject & StateDeclaration,
  strictDi: boolean | undefined,
): Resolvable[] {
  const decl = state.resolve;

  const resolvables: Resolvable[] = [];

  if (isArray(decl)) {
    for (let i = 0; i < decl.length; i++) {
      resolvables.push(literalToResolvable(decl[i]));
    }

    return resolvables;
  }

  const resolveObj = decl || {};

  const resolveKeys = keys(resolveObj);

  for (let i = 0; i < resolveKeys.length; i++) {
    const token = resolveKeys[i];

    resolvables.push(valueToResolvable(token, resolveObj[token], strictDi));
  }

  return resolvables;
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
 */
export class StateBuilder {
  /** @internal */
  _matcher: StateMatcher;
  /** @internal */
  _$injector: ng.InjectorService | undefined;
  /** @internal */
  _paramFactory: ParamFactory;
  /** @internal */
  _urlService: ng.UrlService;

  /**
   * @param {StateMatcher} matcher
   * @param {ng.UrlService} urlService
   */
  constructor(matcher: StateMatcher, urlService: ng.UrlService) {
    this._matcher = matcher;
    this._$injector = undefined;
    this._paramFactory = urlService._paramFactory;
    this._urlService = urlService;
  }

  _buildStateHook(
    stateObject: StateObject & Record<string, any>,
    hookName: "onEnter" | "onExit" | "onRetain",
  ): ((trans: ng.Transition, state: BuiltStateDeclaration) => any) | undefined {
    const hook = stateObject[hookName];

    if (!hook) return undefined;

    const pathname = hookName === "onExit" ? "from" : "to";

    return (trans: ng.Transition, state: BuiltStateDeclaration) => {
      const $injector = this._$injector as InjectorService;

      const resolveContext = new ResolveContext(
        trans.treeChanges(pathname) as PathNode[],
        $injector,
      );

      const subContext = resolveContext.subContext(state._state());

      const locals = assign(getResolveLocals(subContext), {
        $state$: state,
        $transition$: trans,
      });

      return $injector.invoke(hook, this, locals);
    };
  }

  /**
   * Builds all of the properties on an essentially blank State object, returning a State object which has all its
   * properties and API built.
   *
   * @param {ng.StateObject} state an uninitialized State object
   * @returns {ng.StateObject | null} the built State object
   */
  /** @internal */
  _build(state: StateObject): StateObject | null {
    const { _matcher: matcher, _urlService: urlService } = this;

    const parent = this._parentName(state);

    if (parent && !matcher.find(parent, undefined, false)) {
      return null;
    }

    state.parent = isRoot(state)
      ? null
      : matcher.find(parent) || matcher.find("");
    state.url = buildUrl(
      state as StateObject & BuiltStateDeclaration,
      urlService,
      matcher.find("") as StateObject | BuiltStateDeclaration,
    ) as any;
    state.resolvables = resolvablesBuilder(
      state as StateObject & StateDeclaration,
      this._$injector && this._$injector.strictDi,
    );
    state.onExit = this._buildStateHook(state, "onExit") as any;
    state.onRetain = this._buildStateHook(state, "onRetain") as any;
    state.onEnter = this._buildStateHook(state, "onEnter") as any;

    state.navigable =
      !isRoot(state) && state.url
        ? state
        : state.parent
          ? state.parent.navigable
          : null;
    state.params = buildParams(
      state as StateObject & BuiltStateDeclaration,
      this._paramFactory,
    ) as any;

    if (state.parent && state.parent.data) {
      state.data = state.self.data = inherit(state.parent.data, state.data);
    }
    state.path = state.parent
      ? (state.parent.path || []).concat(state)
      : [state];
    state.includes = state.parent ? assign({}, state.parent.includes) : {};
    state.includes[state.name] = true;
    state._views = viewsBuilder(state as StateObject & BuiltStateDeclaration);

    return state;
  }

  /**
   *
   * @param {ng.StateObject} state
   * @returns {string}
   */
  /** @internal */
  _parentName(state: StateObject): string {
    const rawName = (state.self && state.self.name) || state.name || "";

    const name = rawName;

    const segments = name.split(".");

    segments.pop();

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

  /** @internal */
  _name(state: StateObject): string {
    const name = (state.self && state.self.name) || state.name;

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
