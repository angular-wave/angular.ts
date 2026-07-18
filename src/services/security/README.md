# Security Service

This module owns the cross-cutting `$security` policy used to gate HTTP
requests and router transitions before sensitive side effects begin.

## Responsibilities

- Provide one stable injectable `SecurityPolicy` service per runtime.
- Apply typed `NgModule.config({ $security: ... })` configuration.
- Evaluate configured request credentials once in deterministic order.
- Return credentials with the allow decision that authorizes their transport.
- Resolve router-owned navigation requirements before resolves, controllers,
  and views.

## Public Surface

- `SecurityPolicy` is the injectable `$security` contract.
- `SecurityConfig` is the typed module configuration contract.
- `SecurityPolicyDecision` describes allow, deny, and redirect results.
- Request, navigation, and credential types document their corresponding
  policy inputs and outputs.

Runtime configuration records and construction helpers are internal
composition details. Applications do not inject or configure a security
provider.

## Configuration

```ts
angular.module("app", []).config({
  $security: {
    fallback: "deny",
    credentials: {
      bearer: () => sessionStorage.getItem("token"),
      cookie: true,
      order: ["bearer", "cookie"],
    },
    permissions: async (permission, context) =>
      permissionStore.allows(permission, context.to.name),
  },
});
```

## Runtime Model

Runtime composition creates private mutable configuration and one stable policy
object before the router is assembled. Module config blocks update that private
record. `$http`, the router, and injected `$security` all retain the same policy
object and therefore observe the configured behavior without provider access.

## Policy Contract

The default fallback is `allow`. Configured credentials enable their schemes;
`credentials.order` only changes their default bearer, basic, then cookie
precedence. Credentialed HTTP requests over insecure transport are denied
unless its origin is explicitly listed in `allowInsecureOrigins`.

Navigation protection belongs to inherited router `policy.navigation`
declarations. `$security` resolves their authentication and permission
requirements. Public routes and routes whose requirements pass produce an
explicit allow decision instead of falling through to the global fallback.

Authentication state, token storage, permission discovery, and custom identity
protocols remain application-owned. AngularTS coordinates their decisions
across framework consumers.

## Lifecycle

The service owns no browser listeners, timers, connections, or durable state.
It is created once with its runtime and becomes unreachable when that runtime is
destroyed.

## Testing Notes

- `security.spec.ts` verifies policy ordering, transport gates, credentials,
  and navigation decisions.
- HTTP and router specs verify that both consumers use the same service
  contract.
- NgModule specs verify typed runtime configuration dispatch.
