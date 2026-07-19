import type {
  BuiltStateDeclaration,
  InternalStateDeclaration,
  ParamsOf,
  ResolvesOf,
  RoutesOf,
  RouterModuleDeclaration,
  StateDeclaration,
  RouteMap,
  StateTransitionRetryPolicyContext,
  StateRetentionPolicyContext,
  StateRetryPolicy,
  StateTransitionPolicyContext,
  StateTransitionErrorPolicyContext,
  StateTransitionLoadingPolicyContext,
} from "./interface.ts";
import type { StateRegistryRuntime } from "./state-registry.ts";
import type { StateService } from "./state-service.ts";
import type { Transition } from "../transition/transition.ts";
import type { RouterConfig } from "../router.ts";

type AppRouteMap = {
  "admin.users": {
    params: {
      page?: number;
      query?: string;
    };
    resolves: {
      users: { id: string }[];
      total: number;
    };
  };
  "admin.roles": {
    resolves: {
      roles: { id: number; name: string }[];
    };
  };
  "admin.profile": {
    params: {
      userId: string;
    };
  };
  "admin.dashboard": {};
};

const userParams: ParamsOf<AppRouteMap, "admin.users"> = {
  page: 1,
  query: "active",
};

const aliasUserParams: ParamsOf<AppRouteMap, "admin.users"> = {
  page: 1,
  query: "active",
};

const profileParams: ParamsOf<AppRouteMap, "admin.profile"> = {
  userId: "42",
};

const invalidUserParams: ParamsOf<AppRouteMap, "admin.users"> = {
  // @ts-expect-error route params reject unknown keys
  userId: "42",
};

// @ts-expect-error required params stay required for route maps
const missingProfileParams: ParamsOf<AppRouteMap, "admin.profile"> = {};

const roleResolves: ResolvesOf<AppRouteMap, "admin.roles"> = {
  roles: [{ id: 1, name: "admin" }],
};

const userResolves: ResolvesOf<AppRouteMap, "admin.users"> = {
  users: [{ id: "1" }],
  total: 1,
};

const aliasUserResolves: ResolvesOf<AppRouteMap, "admin.users"> = {
  users: [{ id: "1" }],
  total: 1,
};

// @ts-expect-error route resolves reject missing required resolve keys
const missingUserResolves: ResolvesOf<AppRouteMap, "admin.users"> = {
  users: [{ id: "1" }],
};

declare const stateService: StateService<AppRouteMap>;

stateService.go("admin.users", userParams);
stateService.go("admin.users");
stateService.go("admin.roles");
stateService.go("admin.profile", profileParams);
stateService.go("admin.users", { page: 2 });
stateService.go("admin.roles");
stateService.href("admin.users", { query: "all" });
stateService.href("admin.profile", profileParams);

// @ts-expect-error unknown route names are rejected
stateService.go("admin.unknown", {});

// @ts-expect-error href rejects unknown typed route names
stateService.href("admin.unknown", {});

// @ts-expect-error params must match map for route
stateService.go("admin.profile", { page: 1 });

// @ts-expect-error href params must match map for route
stateService.href("admin.profile", { page: 1 });

// @ts-expect-error params must be route-specific and avoid unknown keys
stateService.go("admin.roles", { userId: "42" });

// @ts-expect-error href params are route-specific and avoid unknown keys
stateService.href("admin.roles", { userId: "42" });

// @ts-expect-error missing required params are rejected
stateService.go("admin.profile", {});

// @ts-expect-error required params cannot be omitted
stateService.go("admin.profile");

// @ts-expect-error go requires required params
stateService.go("admin.profile");

// @ts-expect-error href rejects missing required params
stateService.href("admin.profile", {});

// @ts-expect-error href requires required params
stateService.href("admin.profile");

const invalidResolves: ResolvesOf<AppRouteMap, "admin.roles"> = {
  // @ts-expect-error resolve map keys are strictly inferred
  invalidRole: { name: "x" },
};

type StaticNgStateLiteral<
  TRouteMap extends RouteMap,
  TName extends Extract<keyof TRouteMap, string>,
> = {
  state: TName;
  params: ParamsOf<TRouteMap, TName>;
};

const staticNgStateProfileLink: StaticNgStateLiteral<
  AppRouteMap,
  "admin.profile"
> = {
  state: "admin.profile",
  params: { userId: "42" },
};

void staticNgStateProfileLink;

const invalidStaticNgStateProfileLink: StaticNgStateLiteral<
  AppRouteMap,
  "admin.profile"
> = {
  state: "admin.profile",
  // @ts-expect-error quoted literal ng-state examples can mirror typed route params
  params: { page: 1 },
};

const typedStateByName = stateService.get("admin.users");

declare const $transition$: Transition<
  AppRouteMap,
  { to: "admin.profile"; from: "admin.users" }
>;

const transitionTargetParams = $transition$.params();
const transitionExplicitTargetParams = $transition$.params("to");
const transitionSourceParams = $transition$.params("from");
const transitionRetainedParams = $transition$.params("retained");

transitionTargetParams.userId.toUpperCase();
transitionExplicitTargetParams.userId.toUpperCase();
transitionSourceParams.page?.toFixed();
transitionSourceParams.query?.toUpperCase();
void transitionRetainedParams["anyRuntimeParam"];

// @ts-expect-error target params reject source-only keys
transitionTargetParams.page;

// @ts-expect-error explicit target params reject source-only keys
transitionExplicitTargetParams.query;

// @ts-expect-error source params reject target-only keys
transitionSourceParams.userId;

declare const untypedTransition: Transition;
const untypedTransitionParams = untypedTransition.params();
void untypedTransitionParams["runtimeParam"];

type AssertStateGetReturn = ReturnType<StateService<AppRouteMap>["get"]>;
type AssertStateGetHasPrivateMarker = Extract<
  AssertStateGetReturn,
  { _state(): unknown }
>;
type AssertStateGetIsPublicOnly = AssertStateGetHasPrivateMarker extends never
  ? true
  : false;
type AssertLiteral<T extends true> = T;

const _typedStateGetExcludesPrivateMarker: AssertLiteral<AssertStateGetIsPublicOnly> = true;

const declaration: StateDeclaration = {
  name: "home",
  url: "/home",
};

const publicDeclaration: StateDeclaration = {
  name: "public",
  policy: { navigation: { public: true } },
};

const protectedDeclaration: StateDeclaration = {
  name: "protected",
  policy: {
    navigation: {
      authenticated: true,
      permissions: ["profile:read"],
      redirectTo: "login",
    },
  },
};

const invalidPublicDeclaration: StateDeclaration = {
  name: "invalid-public",
  policy: {
    // @ts-expect-error public routes cannot also require authentication.
    navigation: { public: true, authenticated: true },
  },
};

void declaration;
void publicDeclaration;
void protectedDeclaration;
void invalidPublicDeclaration;

const retainedDeclaration: StateDeclaration = {
  name: "workspace.editor",
  url: "/editor/:id",
  policy: {
    retention: {
      mode: "keep-alive",
      key: [
        "retentionContext",
        (context: StateRetentionPolicyContext) =>
          `editor:${String(context.params.id ?? "new")}`,
      ],
      max: 5,
      pause: "background",
      evict: "lru",
    },
  },
};

const retainedRouterTree: RouterModuleDeclaration = {
  name: "workspace",
  url: "/workspace",
  policy: {
    retention: {
      mode: "keep-alive",
      key: [
        "context",
        (context: StateRetentionPolicyContext) =>
          `${context.state.name}:${String(context.params.id ?? "index")}`,
      ],
      max: 3,
      pause: "schedulers",
      evict: () => undefined,
    },
  },
  children: [
    {
      name: "editor",
      url: "/editor/:id",
    },
  ],
};

const inferredRouterTree = {
  name: "admin",
  url: "/admin/{section:string}",
  params: {
    section: { value: "users" },
  },
  resolve: {
    account: () => Promise.resolve({ id: "admin" }),
  },
  children: [
    {
      name: "users",
      url: "/users/{page:int}?{query:string}&{active:bool}",
      params: {
        page: { type: "int" },
      },
      resolve: {
        users: () => [{ id: "1" }],
        total: () => Promise.resolve(1),
      },
    },
    {
      name: "admin.profile",
      url: "/profile/:userId?{viewedAt:date}",
      params: {
        userId: { type: "string" },
      },
      resolve: {
        profile: () => ({ id: "42" }),
      },
    },
  ],
} as const;

const inferredRouterTreeDeclaration: RouterModuleDeclaration =
  inferredRouterTree;

type InferredRouterTreeRoutes = RoutesOf<typeof inferredRouterTree>;
type InferredRouterTreeRoutesAlias = RoutesOf<typeof inferredRouterTree>;
type NamespaceInferredRouterTreeRoutesAlias = ng.RoutesOf<
  typeof inferredRouterTree
>;
type NamespaceInferredRouterTreeRoutes = NamespaceInferredRouterTreeRoutesAlias;

type UuidParam = string & { readonly __uuid: unique symbol };
type SlugParam = string & { readonly __slug: unique symbol };

const typedRouteParamTypes = {
  uuid: {
    pattern: /[0-9a-f-]{36}/i,
    encode(value: UuidParam) {
      return value;
    },
    decode(value: string): UuidParam {
      return value as UuidParam;
    },
    is(value: unknown): value is UuidParam {
      return typeof value === "string";
    },
  },
  slug: {
    pattern: /[a-z0-9-]+/i,
    encode(value: SlugParam) {
      return value;
    },
    is(value: unknown): value is SlugParam {
      return typeof value === "string";
    },
  },
} as const;

const typedRouteParamTypesConfig: RouterConfig = {
  paramTypes: typedRouteParamTypes,
  viewTransitions: true,
  loading: "loading",
  retry: 2,
  fallbackTo: "fallback",
  errorBoundary: "error",
  error: { state: "error", params: {} },
};

void typedRouteParamTypesConfig;

const customParamRouterTree = {
  name: "catalog",
  url: "/catalog/{itemId:uuid}?{filter:slug}",
  params: {
    related: { type: "uuid", array: true },
    fallback: { type: "slug" },
  },
} as const;

type CustomParamRouterTreeRoutes = RoutesOf<
  typeof customParamRouterTree,
  typeof typedRouteParamTypes
>;

declare const inferredStateService: StateService<InferredRouterTreeRoutes>;
declare const inferredAliasStateService: StateService<InferredRouterTreeRoutesAlias>;
declare const customParamStateService: StateService<CustomParamRouterTreeRoutes>;

inferredStateService.go("admin", { section: "settings" });
inferredAliasStateService.go("admin.users", { page: 1 });
inferredStateService.go("admin.users", { page: 1 });
inferredStateService.go("admin.users", {
  page: 1,
  query: "active",
  active: true,
});
inferredStateService.href("admin.profile", { userId: "42" });
inferredStateService.href("admin.profile", {
  userId: "42",
  viewedAt: new Date(),
});
customParamStateService.go("catalog", {
  itemId: "b4f6eb70-3d2b-42df-8f14-4c7e8e88c208" as UuidParam,
  filter: "active-items" as SlugParam,
  related: ["a2dc428b-2f79-4ac0-8d2f-8c521765b683" as UuidParam],
  fallback: "default-items" as SlugParam,
});

// @ts-expect-error int URL params are inferred as numbers
inferredStateService.go("admin.users", { page: "1" });

// @ts-expect-error bool URL params are inferred as booleans
inferredStateService.go("admin.users", { page: 1, active: "true" });

// @ts-expect-error date URL params are inferred as Date values
inferredStateService.href("admin.profile", {
  userId: "42",
  viewedAt: "2026-06-24",
});

// @ts-expect-error relative child route names are dot-composed from their parent
inferredStateService.go("users", { page: 1 });

// @ts-expect-error explicit params declared on the router tree are required
inferredStateService.go("admin.users", {});

// @ts-expect-error custom URL param types infer from $router.paramTypes decode
customParamStateService.go("catalog", {
  itemId: "b4f6eb70-3d2b-42df-8f14-4c7e8e88c208",
  related: ["a2dc428b-2f79-4ac0-8d2f-8c521765b683" as UuidParam],
  fallback: "default-items" as SlugParam,
});

// @ts-expect-error custom query param types infer from $router.paramTypes is predicate
customParamStateService.go("catalog", {
  itemId: "b4f6eb70-3d2b-42df-8f14-4c7e8e88c208" as UuidParam,
  filter: "active-items",
  related: ["a2dc428b-2f79-4ac0-8d2f-8c521765b683" as UuidParam],
  fallback: "default-items" as SlugParam,
});

// @ts-expect-error explicit params using custom array types require arrays
customParamStateService.go("catalog", {
  itemId: "b4f6eb70-3d2b-42df-8f14-4c7e8e88c208" as UuidParam,
  related: "a2dc428b-2f79-4ac0-8d2f-8c521765b683" as UuidParam,
  fallback: "default-items" as SlugParam,
});

const inferredUserResolves: ResolvesOf<
  InferredRouterTreeRoutes,
  "admin.users"
> = {
  users: [{ id: "1" }],
  total: 1,
};

const namespaceProfileParams: ng.ParamsOf<
  NamespaceInferredRouterTreeRoutes,
  "admin.profile"
> = {
  userId: "42",
};

const namespaceAliasProfileParams: ng.ParamsOf<
  NamespaceInferredRouterTreeRoutesAlias,
  "admin.profile"
> = {
  userId: "42",
};

const namespaceProfileResolves: ng.ResolvesOf<
  NamespaceInferredRouterTreeRoutes,
  "admin.profile"
> = {
  profile: { id: "42" },
};

const namespaceAliasProfileResolves: ng.ResolvesOf<
  NamespaceInferredRouterTreeRoutesAlias,
  "admin.profile"
> = {
  profile: { id: "42" },
};

// @ts-expect-error object-style resolve return types are inferred from the tree
const invalidInferredUserResolves: ResolvesOf<
  InferredRouterTreeRoutes,
  "admin.users"
> = {
  users: [{ id: "1" }],
};

const transitionPolicyDeclaration: StateDeclaration = {
  name: "workflow",
  url: "/workflow",
  policy: {
    transition: {
      canExit: [
        "context",
        (context: StateTransitionPolicyContext) => {
          context.operation;
          context.from;
          context.to;
          context.state;
          context.transition;

          return { state: "workflow.confirm", params: { step: "1" } };
        },
      ],
    },
  },
};

const invalidTransitionPolicy: StateDeclaration = {
  name: "invalid.canExit",
  policy: {
    transition: {
      // @ts-expect-error canExit must return boolean or redirect shape
      canExit: ["context", (context: StateTransitionPolicyContext) => context],
      dirty: {
        // @ts-expect-error dirty.when must evaluate a boolean predicate
        when: ["context", (context: StateTransitionPolicyContext) => context],
      },
    },
  },
};

const dirtyTransitionPolicyDeclaration: StateDeclaration = {
  name: "workflow.with-dirty",
  url: "/workflow-with-dirty",
  policy: {
    transition: {
      dirty: {
        when: [
          "context",
          (context: StateTransitionPolicyContext) => {
            context.state;
            context.operation;
            context.transition;

            return false;
          },
        ],
        prompt: "Discard changes?",
        redirectTo: "workflow",
      },
    },
  },
};

const invalidDirtyPolicy: StateDeclaration = {
  name: "invalid.dirty",
  url: "/invalid-dirty",
  policy: {
    transition: {
      dirty: {
        when: [
          "context",
          // @ts-expect-error dirty.when must return boolean
          (context: StateTransitionPolicyContext) => context.operation,
        ],
      },
    },
  },
};

const retryTransitionPolicy: StateDeclaration = {
  name: "workflow.retry",
  url: "/workflow-retry",
  policy: {
    transition: {
      retry: [
        "context",
        (context: StateTransitionRetryPolicyContext) => {
          context.operation;
          context.from;
          context.to;
          context.attempt;
          context.state;

          return 2;
        },
      ],
    },
  },
};

const retryPolicyAsBool: StateDeclaration = {
  name: "workflow.retry-boolean",
  url: "/workflow-retry-boolean",
  policy: {
    transition: {
      retry: [
        "context",
        (context: StateTransitionRetryPolicyContext) => {
          context.state;

          return false;
        },
      ],
    },
  },
};

const invalidRetryPolicy: StateDeclaration = {
  name: "invalid.retry",
  url: "/invalid-retry",
  policy: {
    transition: {
      retry: [
        "context",
        // @ts-expect-error retry expects boolean/number/injectable policy
        (context: StateTransitionRetryPolicyContext) =>
          context.attempt.toString(),
      ],
    },
  },
};

const transitionFallbackPolicy: StateDeclaration = {
  name: "with-fallback",
  url: "/with-fallback",
  policy: {
    transition: {
      fallbackTo: "fallback",
    },
  },
};

const transitionFallbackPolicyWithParams: StateDeclaration = {
  name: "with-fallback-params",
  url: "/with-fallback-params",
  policy: {
    transition: {
      fallbackTo: { state: "fallback", params: { reason: "retry" } },
    },
  },
};

const invalidFallbackPolicy: StateDeclaration = {
  name: "invalid.fallback",
  url: "/invalid-fallback",
  policy: {
    transition: {
      // @ts-expect-error fallbackTo supports only route names or state/params
      // object shorthand
      fallbackTo: ["fallback"],
    },
  },
};

const transitionErrorBoundaryPolicy: StateDeclaration = {
  name: "with-error-boundary",
  url: "/with-error-boundary",
  policy: {
    transition: {
      errorBoundary: "error",
    },
  },
};

const transitionErrorBoundaryPolicyWithPolicy: StateDeclaration = {
  name: "with-error-boundary-policy",
  url: "/with-error-boundary-policy",
  policy: {
    transition: {
      errorBoundary: [
        "context",
        (context: StateTransitionErrorPolicyContext) => {
          context.operation;
          context.error;
          context.state;

          return {
            state: "error",
            params: { message: "from policy" },
          };
        },
      ],
    },
  },
};

const transitionErrorAliasPolicy: StateDeclaration = {
  name: "with-error-alias",
  url: "/with-error-alias",
  policy: {
    transition: {
      error: "error",
    },
  },
};

const transitionLoadingPolicy: StateDeclaration = {
  name: "with-loading-policy",
  url: "/with-loading-policy",
  policy: {
    transition: {
      loading: [
        "context",
        (context: StateTransitionLoadingPolicyContext) => {
          context.operation;
          context.state;

          return true;
        },
      ],
    },
  },
};

const invalidErrorBoundaryPolicy: StateDeclaration = {
  name: "invalid.error-boundary",
  url: "/invalid-error-boundary",
  policy: {
    transition: {
      errorBoundary: [
        "context",
        // @ts-expect-error errorBoundary supports only route targets or boundary policy
        (context: StateTransitionErrorPolicyContext) => {
          context.state;

          return false;
        },
      ],
    },
  },
};

const invalidErrorAliasPolicy: StateDeclaration = {
  name: "invalid.error-alias",
  url: "/invalid-error-alias",
  policy: {
    transition: {
      error: [
        "context",
        // @ts-expect-error error supports only route targets or boundary policy
        (context: StateTransitionErrorPolicyContext) => {
          context.state;

          return false;
        },
      ],
    },
  },
};

const invalidLoadingPolicy: StateDeclaration = {
  name: "invalid.loading",
  url: "/invalid-loading",
  policy: {
    transition: {
      loading: [
        "context",
        // @ts-expect-error loading supports only boolean, string, or policy callable
        (context: StateTransitionLoadingPolicyContext) => {
          context.from;

          return { invalid: true } as const;
        },
      ],
    },
  },
};

const typedRetryPolicy: StateRetryPolicy = (context) => {
  context.attempt;

  return 1;
};

const invalidRetentionMode: StateDeclaration = {
  name: "invalid.mode",
  policy: {
    retention: {
      // @ts-expect-error retention mode must be an explicit lifecycle mode
      mode: "sticky",
    },
  },
};

const invalidRetentionPause: StateDeclaration = {
  name: "invalid.pause",
  policy: {
    retention: {
      mode: "keep-alive",
      // @ts-expect-error pause mode must be one of the supported inactive work modes
      pause: "sleep",
    },
  },
};

const invalidRetentionEviction: StateDeclaration = {
  name: "invalid.eviction",
  policy: {
    retention: {
      mode: "keep-alive",
      // @ts-expect-error eviction must be a known strategy or injectable policy
      evict: "random",
    },
  },
};

declare const internalDeclaration: InternalStateDeclaration;
declare const builtState: BuiltStateDeclaration;
declare const registry: StateRegistryRuntime;

internalDeclaration._state();
builtState._state();

const allDeclarations: StateDeclaration[] = registry.getAll();
const deregisteredDeclarations: StateDeclaration[] =
  registry.deregister("home");

// @ts-expect-error public state declarations do not expose built-state internals
declaration._state;

// @ts-expect-error registry getAll returns declarations, not built states
const builtFromGetAll: BuiltStateDeclaration[] = registry.getAll();

// @ts-expect-error registry deregister returns declarations, not built states
const builtFromDeregister: BuiltStateDeclaration[] =
  registry.deregister("home");

void allDeclarations;
void deregisteredDeclarations;
void builtFromGetAll;
void builtFromDeregister;
void retainedDeclaration;
void retainedRouterTree;
void invalidRetentionMode;
void invalidRetentionPause;
void invalidRetentionEviction;
void transitionPolicyDeclaration;
void dirtyTransitionPolicyDeclaration;
void invalidTransitionPolicy;
void invalidDirtyPolicy;
void retryTransitionPolicy;
void retryPolicyAsBool;
void invalidRetryPolicy;
void transitionFallbackPolicy;
void transitionFallbackPolicyWithParams;
void invalidFallbackPolicy;
void typedRetryPolicy;
