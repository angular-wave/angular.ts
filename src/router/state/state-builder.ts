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
  keys,
  values,
} from "../../shared/utils.ts";
import { stringify } from "../../shared/strings.ts";
import { ResolveContext } from "../resolve/resolve-context.ts";
import { Resolvable } from "../resolve/resolvable.ts";
import { annotate } from "../../core/di/di.ts";
import { ViewConfig } from "./views.ts";
import type { ParamDeclaration } from "../params/interface.ts";
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
    : ((parent && parent.navigable) || root).url.append(url);
}

/**
 * @param {ParamFactory} paramFactory
 */
function buildParams(
  state: BuiltStateDeclaration,
  paramFactory: ParamFactory,
): Record<string, any> {
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

function getResolveLocals(ctx: ResolveContext): Record<string, any> {
  const tokens = ctx.getTokens().filter(isString);

  const tuples: [string, any][] = [];

  for (let i = 0; i < tokens.length; i++) {
    const key = tokens[i];

    const resolvable = ctx.getResolvable(key);

    tuples.push([key, resolvable.data]);
  }

  return tuples.reduce(applyPairs, {});
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
export function resolvablesBuilder(
  state: StateObject & StateDeclaration,
  strictDi: boolean | undefined,
): Resolvable[] {
  type ResolveTuple = {
    token: any;
    val: any;
  };

  const annotateFn = (fn: Function) => annotate(fn, strictDi);

  const objectToTuples = (
    resolveObj: Record<string, any> | undefined,
  ): ResolveTuple[] => {
    const tuples: ResolveTuple[] = [];

    const source = resolveObj || {};

    const tokens = keys(source);

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      tuples.push({
        token,
        val: source[token],
      });
    }

    return tuples;
  };

  const tupleToResolvable = (tuple: ResolveTuple): Resolvable => {
    if (isArray(tuple.val)) {
      return new Resolvable(
        tuple.token,
        tail(tuple.val),
        tuple.val.slice(0, -1),
      );
    }

    if (isFunction(tuple.val)) {
      return new Resolvable(tuple.token, tuple.val, annotateFn(tuple.val));
    }

    throw new Error(`Invalid resolve value: ${stringify(tuple)}`);
  };

  const literalToResolvable = (literal: ResolvableLiteral): Resolvable => {
    if (hasOwn(literal, "resolveFn") || hasOwn(literal, "data")) {
      return new Resolvable(literal);
    }

    throw new Error(`Invalid resolve value: ${stringify(literal)}`);
  };

  const itemToResolvable = (item: any): Resolvable => {
    if (
      item &&
      hasOwn(item, "token") &&
      (hasOwn(item, "resolveFn") || hasOwn(item, "data"))
    ) {
      return literalToResolvable(item);
    }

    if (
      item &&
      hasOwn(item, "token") &&
      hasOwn(item, "val") &&
      (isArray(item.val) || isFunction(item.val))
    ) {
      return tupleToResolvable(item);
    }

    throw new Error(`Invalid resolve value: ${stringify(item)}`);
  };

  const decl = state.resolve;

  const items = isArray(decl) ? decl : objectToTuples(decl);

  const resolvables: Resolvable[] = [];

  for (let i = 0; i < items.length; i++) {
    resolvables.push(itemToResolvable(items[i]));
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

      const locals = Object.assign(getResolveLocals(subContext), {
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
  build(state: StateObject): StateObject | null {
    const { _matcher: matcher, _urlService: urlService } = this;

    const parent = this.parentName(state);

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
    state.includes = state.parent
      ? Object.assign({}, state.parent.includes)
      : {};
    state.includes[state.name] = true;
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
    const rawName = (state.self && state.self.name) || state.name || "";

    const name = rawName;

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
