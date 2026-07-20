---
title: $security
description: >
  Cross-cutting security policy gate for navigation and request-sensitive
  operations.
---

`$security` centralizes framework security policy decisions so apps can keep
cross-cutting concerns out of every service call. The runtime-composed service
allows by default and applies typed configuration from
`app.config({ $security: ... })`.

Services consume this policy before sensitive side effects:

- `$http` calls `check()` once and applies credentials from its allow decision.
- `$log` synchronously gates Beacon delivery before serializing an entry.
- Router transitions call `check()` before state changes proceed.

When no fallback is configured, the fallback decision is `allow`.

Exact policy signatures live in TypeDoc:

- [`SecurityPolicy`](../../../typedoc/interfaces/SecurityPolicy.html)
- [`SecurityConfig`](../../../typedoc/interfaces/SecurityConfig.html)
- [`Policy`](../../../typedoc/types/Policy.html)
- [`PolicyDecision`](../../../typedoc/interfaces/PolicyDecision.html)

## Configure

Use `app.config({ $security: ... })` to set your app policy:

```javascript
angular.module('app', []).config({
  $security: {
    fallback: 'deny',
    allowInsecureOrigins: ['http://localhost:3000'],
    isAuthenticated: function isAuthenticated() {
      return sessionStore.currentUser != null;
    },
    credentials: {
      bearer: function getToken() {
        return sessionStorage.getItem('token');
      },
      cookie: true,
      order: ['bearer', 'cookie'],
    },
    permissions: async function permissions(permission, context) {
      return permissionStore.allows(permission, context.to.name);
    },
  },
});
```

`fallback` controls unspecified behavior (`"allow" | "deny"`). Redirects are
declared on route policies where a target is required.

Configuring a credential enables its request transport scheme. It does not
declare that the current user is authenticated. `isAuthenticated` supplies that
application state as a boolean or contextual async function. The optional
`credentials.order` changes the default bearer, basic, then cookie precedence
without requiring a second list of enabled schemes.

`allowInsecureOrigins` is an explicit allowlist for HTTP origins that may carry
sensitive credentials. All other insecure origins remain blocked.
Malformed origin strings are ignored, preserving fail-closed credential
transport. Invalid policy enums and configuration shapes fail during setup.

`credentials.bearer` attaches a bearer token to allowed `$http` requests.
Caller-provided `Authorization` headers are recognized automatically.

`credentials.basic` accepts `username` and `password` value sources and encodes
the resulting credentials for the `Authorization` header.

`credentials.cookie` tells request services to use browser-managed cookies by
enabling credentialed requests instead of manually writing a `Cookie` header.

Request policy contexts identify their framework transport. HTTP, Beacon,
Worker, and Service Worker creation all pass through the same security gate.
Beacon participates automatically, but its Web Platform API cannot apply custom
headers. Bearer and Basic policies therefore deny Beacon delivery, while an
enabled cookie session permits it. Security evaluation remains synchronous
inside the Beacon transport so lifecycle delivery is never delayed by a Promise.

`permissions` receives each required permission and the current navigation
context. It may return a boolean or a Promise. A static permission array is a
shorthand for applications that do not need contextual authorization.

## Route Policy

States can declare inherited navigation policy. The router merges policy from
the target state path and passes the effective policy to `$security` before
resolves, controllers, or views run.

```javascript
angular
  .module('admin', [])
  .router({
    name: 'admin',
    url: '/admin',
    abstract: true,
    template: '<admin-layout ng-view></admin-layout>',
    policy: {
      navigation: {
        authenticated: true,
        permissions: ['admin:read'],
        redirectTo: 'login',
      },
    },
  })
  .router({
    name: 'admin.users',
    url: '/users',
    component: 'adminUsers',
  });
```

`authenticated: true` is satisfied only when the configured `isAuthenticated`
evaluator resolves true. Credential transport and authentication state remain
separate.

Required permissions are resolved by the configured `permissions` evaluator. If
a required permission is missing, navigation is denied or redirected to the
route policy's `redirectTo` target.

Non-security route policies (`loading`, `error`, `fallbackTo`, `retry`) run in
the same transition pipeline but do not replace authentication/authorization.
They are complementary: `$security` decides whether navigation is allowed for
the current principal, and route policies decide how the transition is rendered
or recovered when that navigation remains allowed.

Use `public: true` on a child state to explicitly clear inherited navigation
requirements. A public declaration cannot also specify `authenticated`,
`permissions`, `redirectTo`, or `reason` because those fields would be
contradictory or ignored.

Security policy has no public provider. Use `app.config({ $security: ... })`;
route matching remains exclusively in the router state tree.

Executable config sample: [`security.html`](/examples/config/security.html)

Executable route policy sample:
[`policy.html`](/examples/routing-policy/policy.html)
[`retry-fallback.html`](/examples/routing-policy/retry-fallback.html)
