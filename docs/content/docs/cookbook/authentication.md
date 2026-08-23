---
title: Authenticate requests
description: Configure cookie or bearer credentials once for framework services
weight: 15
---

## Problem

Requests need authentication, but controllers should not copy tokens or
credential flags into every call.

## Before you start

The server must authenticate and authorize every request. Choose cookie or
bearer transport, define session expiry, and register any router states used
after login.

## Recipe

Prefer a server-managed, HttpOnly cookie when the application and API can share
a cookie session:

<!-- tested-by: src/router/transition/security-policy.spec.ts, src/services/http/http.spec.ts -->

```js
const session = { currentUser: null };

angular
  .module('app', [])
  .value('session', session)
  .config({
    $security: {
      fallback: 'deny',
      isAuthenticated: () => session.currentUser !== null,
      credentials: { cookie: true },
    },
  })
  .controller('LoginController', [
    'session',
    function LoginController(session) {
      this.credentials = {};
      this.signedIn = (user) => {
        session.currentUser = user;
      };
    },
  ]);
```

`$http` and `$rest` consult `$security` before a request and enable browser
credentials when policy allows it. Login remains a normal server request:

<!-- tested-by: src/router/transition/security-policy.spec.ts, src/services/http/http.spec.ts -->

```html
<form
  name="loginForm"
  ng-controller="LoginController as auth"
  ng-post="/api/login"
  on-success="auth.signedIn($res.user)"
  on-error="auth.error = $res.message"
>
  <input name="email" type="email" ng-model="auth.credentials.email" required />
  <input
    name="password"
    type="password"
    ng-model="auth.credentials.password"
    required
  />
  <button type="submit" ng-disabled="loginForm.invalid">Log in</button>
  <p ng-if="auth.error" ng-bind="auth.error"></p>
</form>
```

For an API that requires bearer tokens, configure the token source once:

<!-- tested-by: src/router/transition/security-policy.spec.ts, src/services/http/http.spec.ts -->

```js
credentials: {
  bearer: () => sessionStorage.getItem('accessToken'),
  order: ['bearer'],
}
```

Credential transport and login state are separate. `credentials` controls what
may be sent; `isAuthenticated` reports whether the application currently has a
signed-in user. The server remains responsible for authentication and
authorization.

## Failure path

Client authentication state is not authorization. Clear local session state
after expiry, avoid token leakage, and let the server reject forbidden
operations.

## Apply it now

Write down four facts for your login flow: where credentials are submitted,
which cookie or token proves later requests, how the client learns that login
succeeded, and which router state opens next. Then test invalid credentials, an
expired session, and a direct visit to a protected URL rather than testing only
the successful form.

## Verify

Test login, logout, expiry, direct private navigation, and a forbidden action.
Confirm credentials use the intended transport and server authorization remains
decisive.
