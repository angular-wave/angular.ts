---
title: 'Route maps'
weight: 365
description:
  'Use route maps to make $state navigation, route params, resolves, and
  ng-state examples auditable by TypeScript.'
---

Route maps are optional TypeScript contracts for applications that want
route names, params, and resolves checked at author time. They do not change the
runtime router; they describe the route contract that the runtime already
enforces.

Use `StateService<TRoutes>` at injection boundaries where code calls
`$state.go(...)` or `$state.href(...)`.

```ts
type AdminRoutes = {
  'admin.users': {
    params: {
      page?: number;
      query?: string;
    };
    resolves: {
      users: { id: string }[];
      total: number;
    };
  };
  'admin.profile': {
    params: {
      userId: string;
    };
  };
};

declare const $state: ng.StateService<AdminRoutes>;

const usersParams: ng.ParamsOf<AdminRoutes, 'admin.users'> = {
  page: 1,
  query: 'active',
};

const usersResolves: ng.ResolvesOf<AdminRoutes, 'admin.users'> = {
  users: [{ id: '1' }],
  total: 1,
};

$state.go('admin.users', usersParams);
$state.go('admin.users');
$state.href('admin.profile', { userId: '42' });
```

With a route map enabled, TypeScript rejects unknown route names, missing
required params, omitted required params, extra params, and invalid resolve
maps.

```ts
// @ts-expect-error unknown route
$state.go('admin.missing', {});

// @ts-expect-error userId is required
$state.href('admin.profile', {});

// @ts-expect-error profile params cannot be omitted
$state.go('admin.profile');

// @ts-expect-error page is not a profile param
$state.go('admin.profile', { page: 1 });
```

### Derive a route map from `router(...)`

For module-owned route trees, keep the tree literal as the source of truth and
derive the public route map from it.

```ts
const adminTree = {
  name: 'admin',
  children: [
    {
      name: 'users',
      url: '/users/{page:int}?{active:bool}',
      params: {
        page: { type: 'int' },
      },
      resolve: {
        users: () => [{ id: '1' }],
        total: () => Promise.resolve(1),
      },
    },
    {
      name: 'admin.profile',
      params: {
        userId: { type: 'string' },
      },
      resolve: {
        profile: () => ({ id: '42' }),
      },
    },
  ],
} as const;

angular.module('admin', []).router(adminTree);

type AdminRoutes = ng.RoutesOf<typeof adminTree>;
declare const $state: ng.StateService<AdminRoutes>;

$state.go('admin.users', { page: 1 });
$state.go('admin.users', { page: 1, active: true });
$state.href('admin.profile', { userId: '42' });
```

`RoutesOf` infers dot-composed child names, absolute child names, explicit
`params` keys, built-in literal URL parameter value types, custom
`$router.paramTypes` value types, and object-style `resolve` return values.

Pass the same custom param type map used by `$router.paramTypes` as the second
generic argument. `decode` return types are used first; if a type has no
`decode`, an `is(value): value is T` predicate is used as the value type.

Large modules can pin the route contract directly on the module. This keeps
subsequent route trees and lazy namespaces route-name aware without exposing
provider APIs.

```ts
type AdminRoutes = ng.RoutesOf<typeof adminTree>;

angular
  .module<AdminRoutes>('admin', [])
  .router(adminTree)
  .lazyState('admin.**', () => import('./admin.routes'));
```

When the tree is declared inline, `router(...)` infers a
`ng.RouterModule<ng.RoutesOf<typeof tree>>` return type automatically.
Typed router modules check the `router(...)` tree itself, keep route names
checked across chained `router(...)` calls and `lazyState(...)` prefixes, and
narrow object-style `params` and `resolve` declarations to the route contract.
Array-style resolves remain available when a route needs explicit resolve
metadata such as `token`, `deps`, or `eager`.

If a route map is supplied with `angular.module<Routes>(...)`, that explicit
module contract is preserved after `router(...)`. This lets a feature module
declare one route tree while the route map also includes lazy boundaries or
states registered later in the same module.

Typed lazy prefixes accept known route names, parent route prefixes, and the
explicit `".**"` lazy namespace form. Unknown lazy namespaces are rejected when
the module has a route map.

Typed router trees accept known route names and parent prefixes. This lets a
module declare an abstract or shell parent such as `admin` while still rejecting
unknown concrete children such as `admin.audit` when they are not in the module
route map.

```ts
type Uuid = string & { readonly __uuid: unique symbol };

const paramTypes = {
  uuid: {
    pattern: /[0-9a-f-]{36}/i,
    encode(value: Uuid) {
      return value;
    },
    decode(value: string): Uuid {
      return value as Uuid;
    },
  },
};

const appTree = {
  name: 'item',
  url: '/item/{id:uuid}',
} as const;

angular.module('items', []).config({ $router: { paramTypes } }).router(appTree);

type ItemRoutes = ng.RoutesOf<typeof appTree, typeof paramTypes>;
declare const $state: ng.StateService<ItemRoutes>;

$state.go('item', { id: 'b4f6eb70-3d2b-42df-8f14-4c7e8e88c208' as Uuid });
```

Use `ng.Transition<TRoutes, { to: ToName; from: FromName }>` when code receives an injected
`$transition$`. `params()` and `params('to')` read the destination route params;
`params('from')` can be narrowed when the source route is known.

```ts
declare const $transition$: ng.Transition<
  AdminRoutes,
  { to: 'admin.profile'; from: 'admin.users' }
>;

const toParams = $transition$.params();
const fromParams = $transition$.params('from');

toParams.userId.toUpperCase();
fromParams.page?.toFixed();
```

The same route map should be the source of truth for resolves and routed
component inputs. At runtime, routed components already receive resolve values
by matching binding names. The route map makes that contract visible
to TypeScript without asking application code to touch internal view records.

```ts
type AdminUsersRoute = AdminRoutes['admin.users'];
type AdminUsersResolves = ng.ResolvesOf<AdminRoutes, 'admin.users'>;

const usersComponent = {
  bindings: {
    users: '<',
    total: '<',
  },
};

const usersRouteContract: AdminUsersResolves = {
  users: [{ id: '1' }],
  total: 1,
};

const checkedUsersRouteContract =
  usersRouteContract satisfies AdminUsersRoute['resolves'];

void usersComponent;
void checkedUsersRouteContract;
```

### Component contracts at the route boundary

Route maps should be mirrored by app-owned component contracts when you
want typed, non-internal binding assertions.

```ts
type AdminUsersResolves = ng.ResolvesOf<AdminRoutes, 'admin.users'>;

type AdminUsersBindings = {
  users: AdminUsersResolves['users'];
  total: AdminUsersResolves['total'];
};

function buildUsersViewModel(
  routeResolves: AdminUsersResolves,
): AdminUsersBindings {
  return {
    users: routeResolves.users,
    total: routeResolves.total,
  };
}
```

The example keeps route resolves and component inputs in one named contract so
`admin.users` consumers can evolve in lockstep. This stays explicit and does not
require internal router records.

### Lazy route map composition

Lazy route declarations are composed at module boundaries rather than
centralized in one monolithic map.

```ts
type AppCoreRoutes = {
  'app.home': {
    params: {};
  };
};

type LazyAdminRoutes = {
  'admin.users': {
    params: { filter?: string };
    resolves: {
      users: { id: string }[];
    };
  };
};

type AppRoutes = AppCoreRoutes & LazyAdminRoutes;
declare const $state: ng.StateService<AppRoutes>;

const adminHref = $state.href('admin.users', { filter: 'active' });
void adminHref;
```

This pattern keeps typed navigation available at call sites without forcing a
root module to own every lazy route declaration.

### Generated docs and namespace shape

The generated public surface exposes route maps as helper contracts:

- `ng.RouteContract`
- `ng.RouteMap`
- `ng.RoutesOf<typeof tree>`
- `ng.ParamsOf<TRoutes, TName>`
- `ng.ResolvesOf<TRoutes, TName>`
- `ng.RouterModule<TRoutes>`
- `ng.StateService<TRoutes>`
- `ng.Transition<TRoutes, { to: ToName; from: FromName }>`

These types are public authoring helpers only. They are not aliases for built
state records, transition internals, retained-view cache entries, or view
service records. If a route map needs to cross a lazy module boundary, compose
the public route-map types at the TypeScript boundary rather than importing
router internals.

For templates, `ng-state` remains HTML-first. Use quoted literal route names
when the target route is static; this keeps examples and editor tooling aligned
with the same route-map contract.

```html
<a ng-state="'admin.profile'" ng-state-params="{ userId: user.id }">
  Profile
</a>
```

When a template route is static, mirror that literal route name in the component
or docs-example TypeScript boundary. This gives TypeScript the same route-map
contract without adding a template compiler.

```ts
type StaticNgStateLiteral<
  TRoutes extends ng.RouteMap,
  TName extends Extract<keyof TRoutes, string>,
> = {
  state: TName;
  params: ng.ParamsOf<TRoutes, TName>;
};

const profileLink: StaticNgStateLiteral<AdminRoutes, 'admin.profile'> = {
  state: 'admin.profile',
  params: { userId: '42' },
};
```

Use expression-based `ng-state` only when the route name is genuinely dynamic.
The AngularTS VS Code tooling checks simple TypeScript literal unions such as
`$ctrl.route: 'admin.profile' | 'admin.users'`. A broad `string` cannot prove a
finite target set, so use `StateService<TRoutes>` in the code that computes
that value when it needs author-time validation.

Current boundary:

- `$state.go(...)`, `$state.href(...)`, params, and
  resolve maps have executable public type coverage.
- `ng.Transition<TRoutes, { to: ToName; from: FromName }>` gives injected `$transition$` code
  typed `params()`, `params('to')`, and `params('from')`.
- `ng.RouterModule<TRoutes>` lets `angular.module<TRoutes>(...)` and
  `router(...)` carry route-name checking into module declarations.
- `ng.RoutesOf<typeof tree>` derives a route map from a literal `router(...)`
  tree without exposing internal state, transition, or view records.
- Built-in literal URL parameter types and custom `$router.paramTypes` value
  types are inferred from route URL patterns.
- Editor tooling completes and validates literal `ng-state` route names and
  `ng-state-params` keys in inline templates and `templateUrl` files. It also
  validates simple dynamic route-name unions when TypeScript can prove them.

Executable checks:

- `src/router/state/state-declaration-types.spec.ts` verifies typed route
  params, resolve maps, `$state.go(...)`, `$state.href(...)`, and
  `$transition$.params(...)`.
- [`state-links.html`](/examples/routing/state-links.html) demonstrates the
  quoted literal `ng-state` template shape.
