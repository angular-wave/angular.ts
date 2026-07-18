# Security Service

This module owns the cross-cutting `$security` policy used to gate HTTP
requests and router transitions before sensitive side effects begin.

## Responsibilities

- Provide one stable injectable `SecurityPolicy` service per runtime.
- Apply typed `NgModule.config({ $security: ... })` configuration.
- Evaluate request credential branches in declared order.
- Attach JWT, basic-auth, or browser-managed cookie credentials only after an
  allow decision.
- Evaluate navigation rules before router resolves, controllers, and views.

## Public Surface

- `SecurityPolicy` is the injectable `$security` contract.
- `SecurityPolicyConfig` is the typed module configuration contract.
- `SecurityPolicyDecision` describes allow, deny, and redirect results.
- Request, navigation, credential, and rule types document their corresponding
  policy inputs and outputs.

Runtime configuration records and construction helpers are internal
composition details. Applications do not inject or configure a security
provider.

## Configuration

```ts
angular.module("app", []).config({
  $security: {
    defaultDecision: "deny",
    branches: ["jwt", "cookieSession"],
    credentials: {
      jwt: () => sessionStorage.getItem("token"),
      cookieSession: { withCredentials: true },
    },
    navigation: {
      rules: [
        {
          state: "admin",
          decision: "redirect",
          target: "login",
        },
      ],
    },
  },
});
```

## Runtime Model

Runtime composition creates private mutable configuration and one stable policy
object before the router is assembled. Module config blocks update that private
record. `$http`, the router, and injected `$security` all retain the same policy
object and therefore observe the configured behavior without provider access.

## Policy Contract

The default decision is `allow`. Credential branches are evaluated in their
declared order. Credentialed HTTP requests over insecure transport are denied
unless `allowInsecureTransport` is explicitly enabled. Navigation rules are
matched before the default decision and may allow, deny, or redirect.

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
