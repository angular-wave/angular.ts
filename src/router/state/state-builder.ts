import {
  assign,
  createObject,
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
import { normalizeNgViewTarget } from "../view/view.ts";
import type { ParamFactory } from "../params/param-factory.ts";
import type { InjectorService } from "../../core/di/internal-injector.ts";
import type { ResolveFn, ResolvableLiteral } from "../resolve/interface.ts";
import type {
  BuiltStateDeclaration,
  RouterInjectable,
  StateDeclaration,
  ViewDeclaration,
} from "./interface.ts";
import type { PathNode } from "../path/path-node.ts";
import type { Param } from "../params/param.ts";
import type { StateMatcher } from "./state-matcher.ts";
import type { StateObject } from "./state-object.ts";
import type { UrlMatcher } from "../url/url-matcher.ts";
import type {
  HookResult,
  TransitionStateHookFn,
} from "../transition/interface.ts";

type ViewDeclarationKey = keyof ViewDeclaration | "notify" | "async";

type ViewDeclarationValueMap = Partial<Record<ViewDeclarationKey, unknown>>;

type StateLifecycleHookName = "_onEnter" | "_onExit" | "_onRetain";

type StateLifecyclePathName = "to" | "from";

type StateLifecycleHookContext = {
  _$injector: ng.InjectorService | undefined;
};

const TEMPLATE_VIEW_KEYS: ViewDeclarationKey[] = [
  "templateUrl",
  "template",
  "notify",
  "async",
];

const CONTROLLER_VIEW_KEYS: ViewDeclarationKey[] = ["controller"];

const COMPONENT_VIEW_KEYS: ViewDeclarationKey[] = ["component", "bindings"];

const NON_COMPONENT_VIEW_KEYS = TEMPLATE_VIEW_KEYS.concat(CONTROLLER_VIEW_KEYS);

const ALL_VIEW_KEYS = COMPONENT_VIEW_KEYS.concat(NON_COMPONENT_VIEW_KEYS);

const REMOVED_VIEW_KEYS = ["templateProvider", "controllerAs", "resolveAs"];

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
): UrlMatcher | null {
  const stateDec = stateObject.self;

  const { parent } = stateObject;

  const parsed = parseUrl(stateDec.url);

  const url = (
    !parsed ? stateDec.url : $url.compile(parsed.val, { state: stateDec })
  ) as UrlMatcher | null;

  if (!url) return null;

  if (!$url.isMatcher(url))
    throw new Error(`Invalid url '${url}' in state '${stateObject}'`);

  return parsed && parsed.root
    ? url
    : ((parent && parent.navigable) || root).url!.append(url);
}

/**
 * @param {ParamFactory} paramFactory
 */
function buildParams(
  state: BuiltStateDeclaration,
  paramFactory: ParamFactory,
): Record<string, Param> {
  const urlParams =
    (state.url && state.url.parameters({ inherit: false })) || [];

  const params: Record<string, Param> = {};

  urlParams.forEach((param) => {
    params[param.id] = param;
  });

  const paramConfigs = state.params || {};

  const paramConfigKeys = keys(paramConfigs);

  paramConfigKeys.forEach((id) => {
    if (!hasOwn(params, id)) {
      params[id] = paramFactory.fromConfig(id, null, state.self);
    }
  });

  return params;
}

function hasAnyViewKey(
  keyItems: ViewDeclarationKey[],
  values: ViewDeclarationValueMap,
): boolean {
  for (let i = 0; i < keyItems.length; i++) {
    if (isDefined(values[keyItems[i]])) {
      return true;
    }
  }

  return false;
}

function presentViewKeys(
  keyItems: ViewDeclarationKey[],
  values: ViewDeclarationValueMap,
): string {
  const present: string[] = [];

  keyItems.forEach((key) => {
    if (isDefined(values[key])) {
      present.push(key);
    }
  });

  return present.join(", ");
}

function assertNoRemovedViewKeys(
  keyItems: string[],
  values: Record<string, unknown>,
  description: string,
): void {
  const present: string[] = [];

  keyItems.forEach((key) => {
    if (isDefined(values[key])) {
      present.push(key);
    }
  });

  if (present.length) {
    throw new Error(
      `${description} uses unsupported view properties: ${present.join(", ")}`,
    );
  }
}

function viewsBuilder(
  state: StateObject & StateDeclaration,
): Record<string, ViewDeclaration> {
  if (!state.parent) {
    return {};
  }

  assertNoRemovedViewKeys(
    REMOVED_VIEW_KEYS,
    state as unknown as Record<string, unknown>,
    `State '${state.name}'`,
  );

  if (isDefined(state.views) && hasAnyViewKey(ALL_VIEW_KEYS, state)) {
    throw new Error(
      `State '${state.name}' has a 'views' object. It cannot also have view properties at the state level. Move these properties into a view declaration: ${presentViewKeys(ALL_VIEW_KEYS, state)}`,
    );
  }

  const views: Record<string, ViewDeclaration> = {};

  const defaultViewConfig: Record<string, unknown> = {};

  const stateValues: ViewDeclarationValueMap = state;

  ALL_VIEW_KEYS.forEach((key) => {
    if (isDefined(stateValues[key])) {
      defaultViewConfig[key] = stateValues[key];
    }
  });

  const viewsObject = (state.views || {
    $default: defaultViewConfig,
  }) as Record<string, ViewDeclaration | string>;

  const viewEntries = entries(viewsObject);

  viewEntries.forEach(([entryName, entryConfig]) => {
    let name = entryName as string;

    let config = entryConfig as ViewDeclaration | string;

    name = name || "$default";

    if (isString(config)) {
      config = { component: config };
    }

    config = assign({}, config) as ViewDeclaration;

    assertNoRemovedViewKeys(
      REMOVED_VIEW_KEYS,
      config as Record<string, unknown>,
      `State view '${name}@${state.name}'`,
    );

    if (
      hasAnyViewKey(COMPONENT_VIEW_KEYS, config) &&
      hasAnyViewKey(NON_COMPONENT_VIEW_KEYS, config)
    ) {
      throw new Error(
        `Cannot combine: ${COMPONENT_VIEW_KEYS.join("|")} with: ${NON_COMPONENT_VIEW_KEYS.join("|")} in state view '${name}@${state.name}'`,
      );
    }

    config.$context = state;
    config.$name = name;

    const normalized = normalizeNgViewTarget(
      config.$context as StateObject,
      config.$name as string,
    );

    config.$ngViewName = normalized.ngViewName;
    config.$ngViewContextAnchor = normalized.ngViewContextAnchor;

    views[name] = config;
  });

  return views;
}

function getResolveLocals(ctx: ResolveContext): Record<string, unknown> {
  const tokens = ctx.getTokens();

  const locals: Record<string, unknown> = {};

  tokens.forEach((key) => {
    if (isString(key)) {
      locals[key] = ctx.getResolvable(key).data;
    }
  });

  return locals;
}

function valueToResolvable(
  token: string,
  value: unknown,
  strictDi: boolean | undefined,
): Resolvable {
  if (isArray(value)) {
    return new Resolvable(
      token,
      value[value.length - 1] as ResolveFn,
      value.slice(0, -1),
    );
  }

  if (isFunction(value)) {
    return new Resolvable(token, value as ResolveFn, annotate(value, strictDi));
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
    decl.forEach((literal) => {
      resolvables.push(literalToResolvable(literal));
    });

    return resolvables;
  }

  const resolveObj = decl || {};

  const resolveKeys = keys(resolveObj);

  resolveKeys.forEach((token) => {
    resolvables.push(valueToResolvable(token, resolveObj[token], strictDi));
  });

  return resolvables;
}

function invokeStateLifecycleHook(
  trans: ng.Transition,
  state: StateDeclaration,
  hookName: StateLifecycleHookName,
  pathname: StateLifecyclePathName,
): HookResult {
  const stateObject = (state as BuiltStateDeclaration)._state() as StateObject;

  const hook = stateObject[hookName];

  if (!hook) return undefined;

  const hookContext = stateObject._hookContext as StateLifecycleHookContext;

  const $injector = hookContext._$injector as InjectorService;

  const resolveContext = new ResolveContext(
    (trans._treeChanges[pathname] || []) as PathNode[],
    $injector,
  );

  const subContext = resolveContext.subContext(stateObject);

  const locals = assign(getResolveLocals(subContext), {
    $state$: state,
    $transition$: trans,
  });

  return $injector.invoke(hook, hookContext, locals) as HookResult;
}

function invokeOnEnterHook(
  trans: ng.Transition,
  state: StateDeclaration,
): HookResult {
  return invokeStateLifecycleHook(trans, state, "_onEnter", "to");
}

function invokeOnRetainHook(
  trans: ng.Transition,
  state: StateDeclaration,
): HookResult {
  return invokeStateLifecycleHook(trans, state, "_onRetain", "to");
}

function invokeOnExitHook(
  trans: ng.Transition,
  state: StateDeclaration,
): HookResult {
  return invokeStateLifecycleHook(trans, state, "_onExit", "from");
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

  /** @internal */
  _assignStateHook(
    stateObject: StateObject,
    publicName: "onEnter" | "onExit" | "onRetain",
    privateName: StateLifecycleHookName,
    hookFn: TransitionStateHookFn,
  ): void {
    const hook = stateObject[publicName] as RouterInjectable | undefined;

    if (!hook) return;

    stateObject[privateName] = hook;
    stateObject._hookContext = this;
    stateObject[publicName] = hookFn;
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
    state.url =
      buildUrl(
        state as StateObject & BuiltStateDeclaration,
        urlService,
        matcher.find("") as StateObject | BuiltStateDeclaration,
      ) || undefined;
    state.resolvables = resolvablesBuilder(
      state as StateObject & StateDeclaration,
      this._$injector && this._$injector.strictDi,
    );
    this._assignStateHook(state, "onExit", "_onExit", invokeOnExitHook);
    this._assignStateHook(state, "onRetain", "_onRetain", invokeOnRetainHook);
    this._assignStateHook(state, "onEnter", "_onEnter", invokeOnEnterHook);

    state.navigable =
      !isRoot(state) && state.url
        ? state
        : state.parent
          ? state.parent.navigable
          : null;
    state.params = buildParams(
      state as StateObject & BuiltStateDeclaration,
      this._paramFactory,
    );

    if (state.parent && state.parent.data) {
      state.data = state.self.data = assign(
        createObject(state.parent.data),
        state.data,
      );
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
