import type { ParamDeclaration, RawParams } from "../params/interface.ts";
import type { Param } from "../params/param.ts";
import type { StateObject } from "./state-object.ts";
import type { ControllerConstructor, Injectable } from "../../interface.ts";
import type { Transition } from "../transition/transition.ts";
import type { TransitionStateHookFn } from "../transition/interface.ts";
import type { ResolvableLiteral } from "../resolve/interface.ts";
import type { Resolvable } from "../resolve/resolvable.ts";
import type { TargetState } from "./target-state.ts";
import type { Glob } from "../glob/glob.ts";

export type StateOrName = string | StateDeclaration | StateObject;

export type StateStore = Record<string, StateObject | BuiltStateDeclaration>;

/**
 * Public route contract entry used by router helper types.
 *
 * This is an author-written TypeScript shape. It is intentionally separate
 * from built router state records so generated docs and language bindings do
 * not expose internal state/runtime implementation details.
 */
export type RouteContract = {
  params?: Record<string, unknown>;
  resolves?: Record<string, unknown>;
};

/**
 * Public route-name to route-contract map used by `StateService`,
 * generic `Transition`, `ParamsOf`, and `ResolvesOf`.
 */
export type RouteMap = Record<string, RouteContract>;

type RouterResolvedRouteName<
  TParentName extends string | undefined,
  TName extends string,
> = TParentName extends string
  ? TName extends `${string}.${string}`
    ? TName
    : `${TParentName}.${TName}`
  : TName;

type RouterResolveReturn<TResolve> = TResolve extends (
  ...args: never[]
) => infer TResult
  ? Awaited<TResult>
  : TResolve extends readonly [...never[], infer TLast]
    ? TLast extends (...args: never[]) => infer TResult
      ? Awaited<TResult>
      : unknown
    : TResolve extends { resolveFn: (...args: never[]) => infer TResult }
      ? Awaited<TResult>
      : TResolve extends { data: infer TData }
        ? TData
        : unknown;

type TrimLeft<TValue extends string> = TValue extends
  | ` ${infer TRest}`
  | `\n${infer TRest}`
  | `\t${infer TRest}`
  ? TrimLeft<TRest>
  : TValue;

type TrimRight<TValue extends string> = TValue extends
  | `${infer TRest} `
  | `${infer TRest}\n`
  | `${infer TRest}\t`
  ? TrimRight<TRest>
  : TValue;

type Trim<TValue extends string> = TrimLeft<TrimRight<TValue>>;

type WidenLiteral<TValue> = TValue extends string
  ? string
  : TValue extends number
    ? number
    : TValue extends boolean
      ? boolean
      : TValue;

type RouterParamTypeDefinitionValue<TDefinition> = TDefinition extends {
  readonly decode: (...args: never[]) => infer TValue;
}
  ? TValue
  : TDefinition extends {
        readonly is: (
          value: unknown,
          ...args: never[]
        ) => value is infer TValue;
      }
    ? TValue
    : unknown;

type RouterParamValueForType<
  TType,
  TParamTypes extends Record<string, unknown>,
> = TType extends keyof TParamTypes
  ? RouterParamTypeDefinitionValue<TParamTypes[TType]>
  : TType extends string
    ? Trim<TType> extends "int"
      ? number
      : Trim<TType> extends "bool"
        ? boolean
        : Trim<TType> extends "date"
          ? Date
          : Trim<TType> extends "json" | "any"
            ? unknown
            : Trim<TType> extends "string" | "path" | "query" | "hash"
              ? string
              : unknown
    : unknown;

type RouterParamArrayValue<TValue, TDeclaration> = TDeclaration extends {
  readonly array: infer TArray;
}
  ? TArray extends true
    ? TValue[]
    : TArray extends "auto"
      ? TValue | TValue[]
      : TValue
  : TValue;

type RouterParamDeclarationValue<
  TDeclaration,
  TParamTypes extends Record<string, unknown>,
> = TDeclaration extends {
  readonly type: infer TType;
}
  ? RouterParamArrayValue<
      RouterParamValueForType<TType, TParamTypes>,
      TDeclaration
    >
  : TDeclaration extends { readonly value: infer TValue }
    ? RouterParamArrayValue<WidenLiteral<TValue>, TDeclaration>
    : WidenLiteral<TDeclaration>;

type NormalizeUrlParamName<TName extends string> =
  Trim<TName> extends `${infer TArrayName}[]` ? TArrayName : Trim<TName>;

type UrlParamRecord<TName extends string, TValue> = {
  [TKey in NormalizeUrlParamName<TName>]: TValue;
};

type RouterUrlBraceParam<
  TBody extends string,
  TDefaultType extends string,
  TParamTypes extends Record<string, unknown>,
> = TBody extends `${infer TName}:${infer TType}`
  ? UrlParamRecord<TName, RouterParamValueForType<TType, TParamTypes>>
  : UrlParamRecord<TBody, RouterParamValueForType<TDefaultType, TParamTypes>>;

type RouterUrlBraceParams<
  TUrl extends string,
  TDefaultType extends string,
  TParamTypes extends Record<string, unknown>,
> = TUrl extends `${string}{${infer TBody}}${infer TRest}`
  ? RouterUrlBraceParam<TBody, TDefaultType, TParamTypes> &
      RouterUrlBraceParams<TRest, TDefaultType, TParamTypes>
  : object;

type ReadColonParamName<
  TValue extends string,
  TName extends string = "",
> = TValue extends `${infer TChar}${infer TRest}`
  ? TChar extends "/" | "?" | "&" | "#"
    ? TName
    : ReadColonParamName<TRest, `${TName}${TChar}`>
  : TName;

type RouterUrlColonParams<
  TUrl extends string,
  TParamTypes extends Record<string, unknown>,
> = TUrl extends `${string}:${infer TRest}`
  ? UrlParamRecord<
      ReadColonParamName<TRest>,
      RouterParamValueForType<"path", TParamTypes>
    > &
      (TRest extends `${ReadColonParamName<TRest>}${infer TNext}`
        ? RouterUrlColonParams<TNext, TParamTypes>
        : object)
  : object;

type RouterUrlPath<TUrl extends string> =
  TUrl extends `${infer TPath}?${string}` ? TPath : TUrl;

type RouterUrlPathWithoutBraceParams<TUrl extends string> =
  TUrl extends `${infer TBefore}{${string}}${infer TAfter}`
    ? RouterUrlPathWithoutBraceParams<`${TBefore}${TAfter}`>
    : TUrl;

type RouterUrlQuery<TUrl extends string> =
  TUrl extends `${string}?${infer TQuery}` ? TQuery : "";

type RouterUrlQuerySegmentParam<
  TSegment extends string,
  TParamTypes extends Record<string, unknown>,
> = TSegment extends `{${infer TBody}}`
  ? RouterUrlBraceParam<TBody, "query", TParamTypes>
  : TSegment extends ""
    ? object
    : UrlParamRecord<TSegment, RouterParamValueForType<"query", TParamTypes>>;

type RouterUrlQueryParams<
  TQuery extends string,
  TParamTypes extends Record<string, unknown>,
> = TQuery extends `${infer TSegment}&${infer TRest}`
  ? RouterUrlQuerySegmentParam<TSegment, TParamTypes> &
      RouterUrlQueryParams<TRest, TParamTypes>
  : RouterUrlQuerySegmentParam<TQuery, TParamTypes>;

type Simplify<TValue> = { [TKey in keyof TValue]: TValue[TKey] };

type MergeRouteParams<TUrlParams, TExplicitParams> = Simplify<
  Omit<TUrlParams, keyof TExplicitParams> & TExplicitParams
>;

type RouterTreeUrlParams<
  TTree,
  TParamTypes extends Record<string, unknown>,
> = TTree extends { readonly url: infer TUrl }
  ? TUrl extends string
    ? Simplify<
        RouterUrlBraceParams<RouterUrlPath<TUrl>, "path", TParamTypes> &
          RouterUrlColonParams<
            RouterUrlPathWithoutBraceParams<RouterUrlPath<TUrl>>,
            TParamTypes
          > &
          Partial<RouterUrlQueryParams<RouterUrlQuery<TUrl>, TParamTypes>>
      >
    : Record<string, never>
  : Record<string, never>;

type RouterTreeExplicitParams<
  TTree,
  TParamTypes extends Record<string, unknown>,
> = TTree extends {
  readonly params: infer TParams;
}
  ? TParams extends Record<string, unknown>
    ? {
        [TKey in Extract<keyof TParams, string>]: RouterParamDeclarationValue<
          TParams[TKey],
          TParamTypes
        >;
      }
    : Record<string, never>
  : Record<string, never>;

type RouterTreeParams<
  TTree,
  TParamTypes extends Record<string, unknown>,
> = TTree extends { readonly params: infer TParams }
  ? TParams extends Record<string, unknown>
    ? MergeRouteParams<
        RouterTreeUrlParams<TTree, TParamTypes>,
        RouterTreeExplicitParams<TTree, TParamTypes>
      >
    : RouterTreeUrlParams<TTree, TParamTypes>
  : RouterTreeUrlParams<TTree, TParamTypes>;

type RouterTreeResolves<TTree> = TTree extends {
  readonly resolve: infer TResolve;
}
  ? TResolve extends readonly unknown[]
    ? Record<string, never>
    : TResolve extends Record<string, unknown>
      ? {
          [TKey in Extract<keyof TResolve, string>]: RouterResolveReturn<
            TResolve[TKey]
          >;
        }
      : Record<string, never>
  : Record<string, never>;

type RouterTreeRouteEntry<
  TTree,
  TParentName extends string | undefined,
  TParamTypes extends Record<string, unknown>,
> = TTree extends { readonly name: infer TName extends string }
  ? {
      [TResolvedName in RouterResolvedRouteName<TParentName, TName>]: {
        params: RouterTreeParams<TTree, TParamTypes>;
        resolves: RouterTreeResolves<TTree>;
      };
    }
  : object;

type UnionToIntersection<TUnion> = (
  TUnion extends unknown ? (value: TUnion) => void : never
) extends (value: infer TIntersection) => void
  ? TIntersection
  : never;

type RouterTreeChildrenRouteMap<
  TChildren,
  TParentName extends string,
  TParamTypes extends Record<string, unknown>,
> = [TChildren] extends [never]
  ? object
  : TChildren extends readonly [infer TFirstChild, ...infer TRestChildren]
    ? RouterTreeRouteMap<TFirstChild, TParentName, TParamTypes> &
        RouterTreeChildrenRouteMap<TRestChildren, TParentName, TParamTypes>
    : TChildren extends readonly (infer TChild)[]
      ? UnionToIntersection<
          RouterTreeRouteMap<TChild, TParentName, TParamTypes>
        >
      : object;

type RouterTreeChildren<TTree> = TTree extends { readonly children?: unknown }
  ? NonNullable<TTree["children"]>
  : never;

/** @inline */
type RouterTreeRouteMap<
  TTree,
  TParentName extends string | undefined,
  TParamTypes extends Record<string, unknown>,
> = TTree extends { readonly name: infer TName extends string }
  ? RouterTreeRouteEntry<TTree, TParentName, TParamTypes> &
      RouterTreeChildrenRouteMap<
        RouterTreeChildren<TTree>,
        RouterResolvedRouteName<TParentName, TName>,
        TParamTypes
      >
  : object;

/**
 * Derives a public route map from a literal `router(...)` tree.
 *
 * The helper keeps route typing tied to the same declaration object passed to
 * [[NgModule.router]] without exposing built router state, transition, or view
 * records. It infers dot-composed child route names, explicitly declared
 * `params` keys, built-in URL param types, custom `$router.paramTypes` values,
 * and object-style `resolve` return values.
 *
 */
type RouterTreeShape = { name: string; children?: readonly unknown[] };

type RouteMapFromTree<
  TTree extends RouterTreeShape,
  TParamTypes extends Record<string, unknown> = Record<never, never>,
> =
  RouterTreeRouteMap<TTree, undefined, TParamTypes> extends infer TRouteMap
    ? { [TKey in Extract<keyof TRouteMap, string>]: TRouteMap[TKey] }
    : never;

type RouteMapFromForest<
  TTrees extends readonly RouterTreeShape[],
  TParamTypes extends Record<string, unknown>,
> = TTrees extends readonly [
  infer TFirst extends RouterTreeShape,
  ...infer TRest extends readonly RouterTreeShape[],
]
  ? RouteMapFromTree<TFirst, TParamTypes> &
      RouteMapFromForest<TRest, TParamTypes>
  : TTrees extends readonly (infer TTree extends RouterTreeShape)[]
    ? UnionToIntersection<RouteMapFromTree<TTree, TParamTypes>>
    : object;

/**
 * Derives the public route map for a literal `router(...)` tree.
 */
export type RoutesOf<
  TTree extends RouterTreeShape | readonly RouterTreeShape[],
  TParamTypes extends Record<string, unknown> = Record<never, never>,
> = TTree extends readonly RouterTreeShape[]
  ? RouteMapFromForest<TTree, TParamTypes> extends infer TRouteMap
    ? { [TKey in Extract<keyof TRouteMap, string>]: TRouteMap[TKey] }
    : never
  : TTree extends RouterTreeShape
    ? RouteMapFromTree<TTree, TParamTypes>
    : never;

/**
 * Params declared by one route in a public route map.
 */
export type ParamsOf<
  TRouteMap extends RouteMap,
  TRouteName extends Extract<keyof TRouteMap, string>,
> = TRouteMap[TRouteName] extends { readonly params?: infer TParams }
  ? TParams extends Record<string, unknown>
    ? TParams
    : Record<string, never>
  : Record<string, never>;

/**
 * Resolve values declared by one route in a public route map.
 */
export type ResolvesOf<
  TRouteMap extends RouteMap,
  TRouteName extends Extract<keyof TRouteMap, string>,
> = TRouteMap[TRouteName] extends { readonly resolves?: infer TResolves }
  ? TResolves extends Record<string, unknown>
    ? TResolves
    : Record<string, never>
  : Record<string, never>;

export type StateTransitionResult = StateDeclaration | undefined;

export interface TransitionPromise extends Promise<StateTransitionResult> {
  readonly transition?: Transition;
}

export type LazyStateLoadResult =
  | StateDeclaration
  | StateDeclaration[]
  | undefined;

export type LazyStateLoader = (
  target: TargetState,
  injector?: ng.InjectorService,
) => LazyStateLoadResult | Promise<LazyStateLoadResult>;

export type RouterInjectable = Injectable<(...args: unknown[]) => unknown>;

export type TemplateFactory = (params?: RawParams) => string;

export type TemplateUrlFactory = (
  params?: RawParams,
) => string | null | undefined;

/**
 * Object-style state resolves.
 *
 * Use this when resolve tokens are string keys and each value is a normal
 * AngularTS injectable function or annotated factory.
 *
 * Example:
 * ```js
 * resolve: {
 *   user: ["UserService", (UserService) => UserService.current()],
 *   featureFlags: () => fetchFlags(),
 * }
 * ```
 */
export type StateResolveObject = Record<string, RouterInjectable>;

/**
 * Array-style state resolves.
 *
 * Use this when you need explicit resolve metadata such as `token`, `deps`,
 * `eager`, or pre-resolved `data`.
 *
 * Example:
 * ```js
 * resolve: [
 *   {
 *     token: "user",
 *     deps: ["UserService", Transition],
 *     resolveFn: (UserService, trans) =>
 *       UserService.fetchUser(trans.params().userId),
 *     eager: true,
 *   },
 * ]
 * ```
 */
export type StateResolveArray = ResolvableLiteral[];

export type RawViewConfig = ViewDeclaration | string;

export type RoutedComponent = string | ng.Component;

/**
 * Public view options shared by state-level view shorthand and named view declarations.
 */
export interface ViewDeclarationCommon {
  /**
   * The name of the component to use for this view.
   *
   * The name of an AngularTS `.component()` which will be used for this view.
   *
   * Resolve data can be provided to the component via the component's `bindings` object.
   * For each binding declared on the component, any resolve with the same name is set on
   * the component's controller instance.
   *
   * Note: Mapping from resolve names to component inputs may be specified using [[bindings]].
   *
   * #### Example:
   * ```js
   * .state('profile', {
   *   // Use the <my-profile></my-profile> component for this state.
   *   component: 'MyProfile',
   * }
   * ```
   *
   *
   * Note: When using `component` to define a view, you may _not_ use any of: `template`, `templateUrl`, `controller`.
   */
  component?: RoutedComponent;

  /**
   * An object which maps `resolve`s to [[component]] `bindings`.
   *
   * When using a [[component]] declaration (`component: 'myComponent'`), each input binding for the component is supplied
   * data from a resolve of the same name, by default.  You may supply data from a different resolve name by mapping it here.
   *
   * Each key in this object is the name of one of the component's input bindings.
   * Each value is the name of the resolve that should be provided to that binding.
   *
   * Any component bindings that are omitted from this map get the default behavior of mapping to a resolve of the
   * same name.
   *
   * #### Example:
   * ```js
   * app.router('foo', {
   *   resolve: {
   *     foo: function(FooService) { return FooService.get(); },
   *     bar: function(BarService) { return BarService.get(); }
   *   },
   *   component: 'Baz',
   *   // The component's `baz` binding gets data from the `bar` resolve
   *   // The component's `foo` binding gets data from the `foo` resolve (default behavior)
   *   bindings: {
   *     baz: 'bar'
   *   }
   * });
   *
   * app.component('Baz', {
   *   templateUrl: 'baz.html',
   *   controller: 'BazController',
   *   bindings: {
   *     foo: '<', // foo binding
   *     baz: '<'  // baz binding
   *   }
   * });
   * ```
   *
   */
  bindings?: Record<string, string>;

  /**
   * The view's controller function or name
   *
   * The controller function, or the name of a registered controller.  The controller function will be used
   * to control the contents of the [[directives.ngVIew]] directive.
   *
   * See: [[Ng1Controller]] for information about component-level router hooks.
   */
  controller?: Injectable<ControllerConstructor> | string;

  /**
   * The HTML template for the view.
   *
   * HTML template as a string, or a function which returns an html template as a string.
   * This template will be used to render the corresponding [[directives.ngVIew]] directive.
   *
   * This property takes precedence over templateUrl.
   *
   * If `template` is a function, it will be called with the Transition parameters as the first argument.
   *
   * #### Example:
   * ```js
   * template: "<h1>inline template definition</h1><div ng-view></div>"
   * ```
   *
   * #### Example:
   * ```js
   * template: function(params) {
   *   return "<h1>generated template</h1>";
   * }
   * ```
   */
  template?: TemplateFactory | string;

  /**
   * The URL for the HTML template for the view.
   *
   * A path or a function that returns a path to an html template.
   * The template will be fetched and used to render the corresponding [[directives.ngVIew]] directive.
   *
   * If `templateUrl` is a function, it will be called with the Transition parameters as the first argument.
   *
   * #### Example:
   * ```js
   * templateUrl: "/templates/home.html"
   * ```
   *
   * #### Example:
   * ```js
   * templateUrl: function(params) {
   *   return myTemplates[params.pageId];
   * }
   * ```
   */
  templateUrl?: string | TemplateUrlFactory;
}

/**
 * Interface for declaring a view
 *
 * This interface defines the basic data that a normalized view declaration will have on it.
 */
export interface ViewDeclaration extends ViewDeclarationCommon {
  /**
   * The raw view declaration name from [[StateDeclaration.views]].
   */
  /** @internal */
  _name?: string;

  /**
   * The normalized address for the targeted `ng-view`.
   *
   * A view target is matched relative to the `_ngViewContextAnchor`.
   * @example `header`, `messagecontent`, or `$default`
   */
  /** @internal */
  _ngViewName?: string;

  /**
   * The normalized context anchor (state name) for the `ngVIewName`
   *
   * When targeting a `ng-view`, the `ngVIewName` address is anchored to a context name (state name).
   */
  /** @internal */
  _ngViewContextAnchor?: string;

  /**
   * The context that this view is declared within.
   */
  /** @internal */
  _context?: import("../view/view.ts").ViewContext;
}

/**
 * The return value of a [[redirectTo]] function
 *
 * - string: a state name
 * - TargetState: a target state, parameters, and options
 * - object: an object with a state name and parameters
 */
export type RedirectToResult =
  | string
  | TargetState
  | { state?: string; params?: RawParams }
  | undefined;

/**
 * Security requirements inherited through a route tree.
 *
 * A public declaration clears inherited requirements. It cannot also declare
 * authentication, permissions, redirects, or denial reasons.
 */
export type StateNavigationPolicyDeclaration =
  | {
      public: true;
      authenticated?: never;
      permissions?: never;
      redirectTo?: never;
      reason?: never;
    }
  | {
      public?: false;
      authenticated?: boolean;
      permissions?: string | string[];
      redirectTo?: string;
      reason?: string;
    };

export interface StateTransitionPolicyContext {
  operation: "canExit" | "dirty";
  transition: Transition;
  from: StateDeclaration;
  to: StateDeclaration;
  state: StateDeclaration;
}

export interface StateTransitionErrorPolicyContext {
  operation: "error";
  transition?: Transition;
  from: StateDeclaration;
  to: StateDeclaration;
  state: StateDeclaration;
  error: unknown;
}

export interface StateTransitionLoadingPolicyContext {
  operation: "loading";
  transition: Transition;
  from: StateDeclaration;
  to: StateDeclaration;
  state: StateDeclaration;
}

export interface StateTransitionRetryPolicyContext {
  operation: "retry";
  transition?: Transition;
  from: StateDeclaration;
  to: StateDeclaration;
  state: StateDeclaration;
  attempt: number;
  error?: unknown;
}

export type StateCanExitPolicy = Injectable<
  (context: StateTransitionPolicyContext) => boolean | RedirectToResult
>;

export type StateDirtyPolicy = Injectable<
  (context: StateTransitionPolicyContext) => boolean
>;

export type StateRetryPolicy = Injectable<
  (context: StateTransitionRetryPolicyContext) => boolean | number
>;

export type StateErrorBoundaryPolicy = Injectable<
  (context: StateTransitionErrorPolicyContext) => RedirectToResult
>;

export type StateTransitionLoadingPolicy = Injectable<
  (context: StateTransitionLoadingPolicyContext) => boolean | RedirectToResult
>;

export interface StateDirtyPolicyDeclaration {
  when: StateDirtyPolicy;
  prompt?: string;
  redirectTo?: string;
}

export interface StateTransitionPolicyDeclaration {
  canExit?: StateCanExitPolicy;
  dirty?: StateDirtyPolicyDeclaration;
  retry?: boolean | number | StateRetryPolicy;
  fallbackTo?: StateTransitionFallbackTarget;
  loading?: boolean | string | StateTransitionLoadingPolicy;
  errorBoundary?:
    | string
    | { state?: string; params?: RawParams }
    | RedirectToResult
    | StateErrorBoundaryPolicy;
  error?:
    | string
    | { state?: string; params?: RawParams }
    | RedirectToResult
    | StateErrorBoundaryPolicy;
}

export type StateTransitionFallbackTarget =
  | string
  | {
      state?: string;
      params?: RawParams;
    };

export type StateRetentionMode = "destroy" | "keep-alive";

export type StateRetentionPauseMode = "none" | "background" | "schedulers";

export type StateRetentionEvictionMode = "lru" | "oldest";

export interface StateRetentionPolicyContext {
  transition: Transition;
  state: StateDeclaration;
  params: RawParams;
}

export interface StateRetentionEvictionContext {
  state: StateDeclaration;
  key: string;
  size: number;
  max: number;
}

export type StateRetentionKeyPolicy = Injectable<
  (context: StateRetentionPolicyContext) => string
>;

export type StateRetentionEvictionPolicy = Injectable<
  (context: StateRetentionEvictionContext) => string | undefined
>;

export interface StateRetentionPolicyDeclaration {
  /**
   * Controls whether this route subtree is destroyed on exit or deactivated
   * and retained for later reactivation.
   */
  mode?: StateRetentionMode;

  /**
   * Optional cache key override. By default, retained route instances are keyed
   * by state identity and params.
   */
  key?: string | StateRetentionKeyPolicy;

  /**
   * Maximum number of retained route instances allowed for this policy.
   */
  max?: number;

  /**
   * Controls how inactive retained route trees pause work while deactivated.
   */
  pause?: StateRetentionPauseMode;

  /**
   * Eviction strategy used when the retained route cache exceeds `max`.
   */
  evict?: StateRetentionEvictionMode | StateRetentionEvictionPolicy;
}

export interface StatePolicyDeclaration {
  navigation?: StateNavigationPolicyDeclaration;
  transition?: StateTransitionPolicyDeclaration;
  retention?: StateRetentionPolicyDeclaration;
}

/**
 * Module-owned router state tree declaration.
 *
 * Use this with [[NgModule.router]] when a module owns a route subtree. Child
 * state names are relative to their parent unless they contain a dot.
 */
export interface RouterModuleDeclaration extends StateDeclaration {
  /**
   * Child states owned by this module route tree.
   *
   * Each child is lowered to a normal [[StateDeclaration]] before registration.
   */
  children?: readonly RouterModuleDeclaration[];
}

/**
 * The StateDeclaration object is used to define a state or nested state.
 *
 *
 * #### Example:
 * ```js
 * // StateDeclaration object
 * var foldersState = {
 *   name: 'folders',
 *   url: '/folders',
 *   component: FoldersComponent,
 *   resolve: {
 *     allfolders: function(FolderService) {
 *       return FolderService.list();
 *     }
 *   },
 * }
 *
 * registry.register(foldersState);
 * ```
 */
export interface StateDeclaration extends ViewDeclarationCommon {
  /**
   * The state name (required)
   *
   * A unique state name, e.g. `"home"`, `"about"`, `"contacts"`.
   * To create a parent/child state use a dot, e.g. `"about.sales"`, `"home.newest"`.
   *
   * Note: [State] objects require unique names.
   * The name is used like an id.
   */
  name: string;

  /**
   * Abstract state indicator
   *
   * An abstract state can never be directly activated.
   * Use an abstract state to provide inherited properties (url, resolve, data, etc) to children states.
   */
  abstract?: boolean;

  /**
   * The parent state
   *
   * Normally, a state's parent is implied from the state's [[name]], e.g., `"parentstate.childstate"`.
   *
   * Alternatively, you can explicitly set the parent state using this property.
   * This allows shorter state names, e.g., `<a ng-state="'childstate'">Child</a>`
   * instead of `<a ng-state="'parentstate.childstate'">Child</a>
   *
   * When using this property, the state's name should not have any dots in it.
   *
   * #### Example:
   * ```js
   * var parentstate = {
   *   name: 'parentstate'
   * }
   * var childstate = {
   *   name: 'childstate',
   *   parent: 'parentstate'
   *   // or use a JS var which is the parent StateDeclaration, i.e.:
   *   // parent: parentstate
   * }
   * ```
   */
  parent?: string | StateDeclaration;

  /**
   * Named view declarations for this state.
   *
   * Each key targets an `ng-view`; each value is either a full view declaration or
   * a string shorthand for `{ component: "componentName" }`.
   *
   * Examples:
   * ```js
   * views: {
   *   mymessages: "mymessages",
   *   messagelist: { component: "messageList" },
   *   "^.^.messagecontent": "message"
   * }
   * ```
   */
  views?: Record<string, RawViewConfig>;

  /**
   * Resolve - a mechanism to asynchronously fetch data, participating in the Transition lifecycle
   *
   * The `resolve:` property defines data (or other dependencies) to be fetched asynchronously when the state is being entered.
   * After the data is fetched, it may be used in views, transition hooks or other resolves that belong to this state.
   * The data may also be used in any views or resolves that belong to nested states.
   *
   * ### As an array
   *
   * Each array element should be a [[ResolvableLiteral]] object.
   *
   * #### Example:
   * The `user` resolve injects the current `Transition` and the `UserService` (using its token, which is a string).
   * The [[ResolvableLiteral.eager]] flag controls whether the resolve starts
   * at transition start instead of when the owning state is entered.
   * The `user` data, fetched asynchronously, can then be used in a view.
   * ```js
   * var state = {
   *   name: 'user',
   *   url: '/user/:userId
   *   resolve: [
   *     {
   *       token: 'user',
   *       eager: true,
   *       deps: ['UserService', Transition],
   *       resolveFn: (userSvc, trans) => userSvc.fetchUser(trans.params().userId) },
   *     }
   *   ]
   * }
   * ```
   *
   * ### As an object
   *
   * The `resolve` property may be an object where:
   * - Each key (string) is the name of the dependency.
   * - Each value (function) is an injectable function which returns the dependency, or a promise for the dependency.
   *
   * This style is based on AngularTS injectable functions.
   * If your code will be minified, the function should be ["annotated" in the AngularTS manner](https://docs.angularjs.org/guide/di#dependency-annotation).
   *
   * #### AngularTS Example:
   * ```js
   * resolve: {
   *   // If you inject `myStateDependency` into a controller, you'll get "abc"
   *   myStateDependency: function() {
   *     return "abc";
   *   },
   *   // Dependencies are annotated in "Inline Array Annotation"
   *   myAsyncData: ['$http', '$transition$' function($http, $transition$) {
   *     // Return a promise (async) for the data
   *     return $http.get("/foos/" + $transition$.params().foo);
   *   }]
   * }
   * ```
   *
   * Note: You cannot mark individual entries as eager, nor can you use non-string
   * tokens when using the object style `resolve:` block.
   *
   * ### Lifecycle
   *
   * Since a resolve function can return a promise, the router will delay entering the state until the promises are ready.
   * If any of the promises are rejected, the Transition is aborted with an Error.
   *
   * By default, resolves for a state are fetched just before that state is entered.
   * Note that only states which are being *entered* during the `Transition` have their resolves fetched.
   * States that are "retained" do not have their resolves re-fetched.
   *
   * If you are currently in a parent state `parent` and are transitioning to a child state `parent.child`, the
   * previously resolved data for state `parent` can be injected into `parent.child` without delay.
   *
   * Any resolved data for `parent.child` is retained until `parent.child` is exited, e.g., by transitioning back to the `parent` state.
   *
   * Because of this scoping and lifecycle, resolves are a great place to fetch your application's primary data.
   *
   * ### Injecting resolves into other things
   *
   * During a transition, Resolve data can be injected into:
   *
   * - Views (the components which fill a `ng-view` tag)
   * - Transition Hooks
   * - Other resolves (a resolve may depend on asynchronous data from a different resolve)
   *
   * ### Injecting other things into resolves
   *
   * Resolve functions usually have dependencies on some other API(s).
   * The dependencies are usually declared and injected into the resolve function.
   * A common pattern is to inject a custom service such as `UserService`.
   * The resolve then delegates to a service method, such as `UserService.list()`;
   *
   * #### Special injectable tokens
   *
   * - `Transition`: The current [[Transition]] object; information and API about the current transition, such as
   *    "to" and "from" State Parameters and transition options.
   * - `'$transition$'`: A string alias for the `Transition` injectable
   * - `'$state$'`: For `onEnter`/`onExit`/`onRetain`, the state being entered/exited/retained.
   * - Other resolve tokens: A resolve can depend on another resolve, either from the same state, or from any parent state.
   *
   * #### Example:
   * ```js
   * // Injecting a resolve into another resolve
   * resolve: [
   *   // Define a resolve 'allusers' which delegates to the UserService.list()
   *   // which returns a promise (async) for all the users
   *   { token: 'allusers', resolveFn: (UserService) => UserService.list(), deps: [UserService] },
   *
   *   // Define a resolve 'user' which depends on the allusers resolve.
   *   // This resolve function is not called until 'allusers' is ready.
   *   { token: 'user', resolveFn: (allusers, trans) => _.find(allusers, trans.params().userId), deps: ['allusers', Transition] }
   * }
   * ```
   */
  resolve?: StateResolveArray | StateResolveObject;

  /**
   * The url fragment for the state
   *
   * A URL fragment (with optional parameters) which is used to match the browser location with this state.
   *
   * This fragment will be appended to the parent state's URL in order to build up the overall URL for this state.
   * It may include path parameters, typed parameters, and query parameters.
   *
   * @example
   * ```js
   *
   * url: "/home"
   * // Define a parameter named 'userid'
   * url: "/users/:userid"
   * // param 'bookid' has a custom regexp
   * url: "/books/{bookid:[a-zA-Z_-]}"
   * // param 'categoryid' is of type 'int'
   * url: "/books/{categoryid:int}"
   * // two parameters for this state
   * url: "/books/{publishername:string}/{categoryid:int}"
   * // Query parameters
   * url: "/messages?before&after"
   * // Query parameters of type 'date'
   * url: "/messages?{before:date}&{after:date}"
   * // Path and query parameters
   * url: "/messages/:mailboxid?{before:date}&{after:date}"
   * ```
   */
  url?: string;

  /**
   * Params configuration
   *
   * An object which optionally configures parameters declared in the url, or defines additional non-url
   * parameters. For each parameter being configured, add a [[ParamDeclaration]] keyed to the name of the parameter.
   *
   * #### Example:
   * ```js
   * params: {
   *   param1: {
   *    type: "int",
   *    array: true,
   *    value: []
   *   },
   *   param2: {
   *     value: "index"
   *   }
   * }
   * ```
   */
  params?: Record<string, ParamDeclaration>;

  /**
   * An inherited property to store state data
   *
   * This is a spot for you to store inherited state metadata.
   * Child states' `data` object will prototypally inherit from their parent state.
   *
   * Use this for application metadata. Use `policy.navigation` for framework
   * navigation decisions such as authentication, permissions, or redirects.
   *
   * Note: because prototypal inheritance is used, changes to parent `data` objects reflect in the child `data` objects.
   * Care should be taken if you are using `hasOwnProperty` on the `data` object.
   * Properties from parent objects will return false for `hasOwnProperty`.
   */
  data?: unknown;

  /**
   * Declarative state policy metadata consumed by AngularTS framework services.
   *
   * `policy.navigation` is inherited through the state tree and evaluated by
   * the router's security navigation hook before resolves, controllers, or
   * views run. `policy.transition.canExit` is evaluated before exiting states
   * are torn down. `policy.retention` declares keep-alive route subtree
   * behavior and can override router-wide retention defaults.
   */
  policy?: StatePolicyDeclaration;

  /**
   * Synchronously or asynchronously redirects Transitions to a different state/params
   *
   * If this property is defined, a Transition directly to this state will be redirected based on the property's value.
   *
   * - If the value is a `string`, the Transition is redirected to the state named by the string.
   *
   * - If the property is an object with a `state` and/or `params` property,
   *   the Transition is redirected to the named `state` and/or `params`.
   *
   * - If the value is a [[TargetState]] the Transition is redirected to the `TargetState`
   *
   * - If the property is a function:
   *   - The function is called with the current [[Transition]]
   *   - The return value is processed using the previously mentioned rules.
   *   - If the return value is a promise, the promise is waited for, then the resolved async value is processed using the same rules.
   *
   * Note: `redirectTo` is processed as an `onStart` hook, before non-eager resolves.
   * If your redirect function relies on resolve data, get the [[Transition.injector]] and request
   * the resolve data with `getAsync()`.
   *
   * #### Example:
   * ```js
   * // a string
   * .state('A', {
   *   redirectTo: 'A.B'
   * })
   *
   * // a {state, params} object
   * .state('C', {
   *   redirectTo: { state: 'C.D', params: { foo: 'index' } }
   * })
   *
   * // a fn
   * .state('E', {
   *   redirectTo: () => "A"
   * })
   *
   * // a fn conditionally returning a {state, params}
   * .state('F', {
   *   redirectTo: (trans) => {
   *     if (trans.params().foo < 10)
   *       return { state: 'F', params: { foo: 10 } };
   *   }
   * })
   *
   * // a fn returning a promise for a redirect
   * .state('G', {
   *   redirectTo: (trans) => {
   *     let svc = trans.injector().get('SomeAsyncService')
   *     let promise = svc.getAsyncRedirectTo(trans.params.foo);
   *     return promise;
   *   }
   * })
   *
   * // a fn that fetches resolve data
   * .state('G', {
   *   redirectTo: (trans) => {
   *     // getAsync tells the resolve to load
   *     let resolvePromise = trans.injector().getAsync('SomeResolve')
   *     return resolvePromise.then(resolveData => resolveData === 'login' ? 'login' : null);
   *   }
   * })
   * ```
   */
  redirectTo?:
    | RedirectToResult
    | ((transition: Transition) => RedirectToResult)
    | ((transition: Transition) => Promise<RedirectToResult>);

  /**
   * A state hook invoked when a state is being entered.
   *
   * The hook can inject global services.
   * It can also inject `$transition$` or `$state$` (from the current transition).
   *
   * ### Example:
   * ```js
   * app.router({
   *   name: 'mystate',
   *   onEnter: (MyService, $transition$, $state$) => {
   *     return MyService.doSomething($state$.name, $transition$.params());
   *   }
   * });
   * ```
   *
   * #### Example:`
   * ```js
   * app.router({
   *   name: 'mystate',
   *   onEnter: [ 'MyService', '$transition$', '$state$', function (MyService, $transition$, $state$) {
   *     return MyService.doSomething($state$.name, $transition$.params());
   *   } ]
   * });
   * ```
   */
  onEnter?: TransitionStateHookFn | RouterInjectable;
  /**
   * A state hook invoked when a state is being retained.
   *
   * The hook can inject global services.
   * It can also inject `$transition$` or `$state$` (from the current transition).
   *
   * #### Example:
   * ```js
   * app.router({
   *   name: 'mystate',
   *   onRetain: (MyService, $transition$, $state$) => {
   *     return MyService.doSomething($state$.name, $transition$.params());
   *   }
   * });
   * ```
   *
   * #### Example:`
   * ```js
   * app.router({
   *   name: 'mystate',
   *   onRetain: [ 'MyService', '$transition$', '$state$', function (MyService, $transition$, $state$) {
   *     return MyService.doSomething($state$.name, $transition$.params());
   *   } ]
   * });
   * ```
   */
  onRetain?: TransitionStateHookFn | RouterInjectable;
  /**
   * A state hook invoked when a state is being exited.
   *
   * The hook can inject global services.
   * It can also inject `$transition$` or `$state$` (from the current transition).
   *
   * ### Example:
   * ```js
   * app.router({
   *   name: 'mystate',
   *   onExit: (MyService, $transition$, $state$) => {
   *     return MyService.doSomething($state$.name, $transition$.params());
   *   }
   * });
   * ```
   *
   * #### Example:`
   * ```js
   * app.router({
   *   name: 'mystate',
   *   onExit: [ 'MyService', '$transition$', '$state$', function (MyService, $transition$, $state$) {
   *     return MyService.doSomething($state$.name, $transition$.params());
   *   } ]
   * });
   * ```
   */
  onExit?: TransitionStateHookFn | RouterInjectable;

  /**
   * Marks all the state's parameters as `dynamic`.
   *
   * All parameters on the state will use this value for `dynamic` as a default.
   * Individual parameters may override this default using [[ParamDeclaration.dynamic]] in the [[params]] block.
   *
   * This default applies to all parameters declared on this state.
   */
  dynamic?: boolean;
}

/** Internal router augmentation added after a state declaration is registered. */
export interface InternalStateDeclaration extends StateDeclaration {
  _state: () => BuiltStateDeclaration;
}

/**
 * Represents a fully built StateObject after registration in the StateRegistry.
 */
export type BuiltStateDeclaration = InternalStateDeclaration & {
  /** Reference to the original StateDeclaration */
  self: StateDeclaration;

  /**
   * Gets the internal State object API
   *
   * Gets the *internal API* for a registered state.
   *
   * Note: the internal [[StateObject]] API is subject to change without notice
   * @internal
   */
  _state: () => BuiltStateDeclaration;

  /** Array of Resolvables built from the state's resolve declarations */
  resolvables: Resolvable[];

  /** Full path from root down to this state */
  path: BuiltStateDeclaration[];

  /** Fast lookup of ancestor states for `$state.matches()`. */
  includes: Record<string, boolean>;

  /** Closest ancestor state that has a URL (navigable) */
  navigable?: BuiltStateDeclaration | null;

  /** @internal URL matcher built from url / parent / root */
  _url?: unknown;

  /** Computed parameters of this state */
  params?: Record<string, Param>;

  /** Optional parent state */
  parent?: StateDeclaration | null;

  /** Optional inherited data */
  data?: unknown;

  /** Built state hook invoked when the state is entered. */
  onEnter?: TransitionStateHookFn;

  /** Built state hook invoked when the state is retained. */
  onRetain?: TransitionStateHookFn;

  /** Built state hook invoked when the state is exited. */
  onExit?: TransitionStateHookFn;

  /** @internal */
  _stateObjectCache?: { nameGlob: Glob } | null;
};

/**
 * An options object for [[StateService.href]]
 */
export interface HrefOptions {
  /**
   * Defines what state to be "relative from"
   *
   * When a relative path is found (e.g `^` or `.bar`), defines which state to be relative from.
   */
  relative?: StateOrName;

  /**
   * If true, and if there is no url associated with the state provided in the
   *    first parameter, then the constructed href url will be built from the first
   *    ancestor which has a url.
   */
  lossy?: boolean;

  /**
   * If `true` will inherit parameters from the current parameter values.
   */
  inherit?: boolean;

  /**
   * If true will generate an absolute url, e.g. `http://www.example.com/fullurl`.
   */
  absolute?: boolean;
}

/**
 * Either a [[StateDeclaration]] or an ES6 class that implements [[StateDeclaration]]
 * The ES6 class constructor should have no arguments.
 */
export type StateDeclarationInput =
  | StateDeclaration
  | (new () => StateDeclaration);

/**
 * The signature for the callback function provided to [[StateRegistry.onStatesChanged]].
 *
 * This callback receives two parameters:
 *
 * @param event a string; either "registered" or "deregistered"
 * @param states the list of [[StateDeclaration]]s that were registered (or deregistered).
 */
export type StateRegistryListener = (
  event: "registered" | "deregistered",
  states: StateDeclaration[],
) => void;
