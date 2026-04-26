---
title: "Routing transitions and lifecycle hooks"
weight: 360
description: "Understand the AngularTS transition lifecycle and use hooks like onBefore, onStart, onSuccess, and onError for auth guards, analytics, and redirects."
---
Every navigation in AngularTS is a `Transition`—a structured object that describes moving from one state (or set of states) to another. Transitions carry the from-state, the to-state, all parameter values, the tree of entering/exiting/retained states, and the resolve context. You hook into their lifecycle to implement auth guards, loading indicators, analytics, scroll resets, and more.
## What is a transition

When you call `$state.go('contacts.detail', { contactId: 42 })`, the router creates a `Transition` instance. Internally it computes a `TreeChanges` object with five paths:

| Path       | Description                                                                              |
| ---------- | ---------------------------------------------------------------------------------------- |
| `from`     | All currently active nodes, from root to the current leaf state                          |
| `to`       | All nodes that will be active after the transition                                       |
| `exiting`  | Nodes that are active now but will not be active after (in reverse order, deepest first) |
| `retained` | Nodes that are active both before and after (unchanged)                                  |
| `entering` | Nodes that are not active now but will be active after (parent first)                    |

The `Transition` exposes these paths through `trans.exiting()`, `trans.retained()`, and `trans.entering()`, each returning an array of `StateDeclaration` objects. Use `trans.treeChanges(pathname)` for the raw `PathNode[]` arrays.

Each transition has a numeric `$id` and a `promise` that resolves to the `StateDeclaration` for the to-state on success, or rejects with a `Rejection` on failure.
## Transition lifecycle

The router runs hooks in a fixed sequence of phases:

### onCreate (synchronous)

Fires during transition construction before the transition is returned. Used internally for view config setup and global state updates. Not available for application hooks.

### onBefore (synchronous)

Fires before any state is exited or entered. This is the right place for synchronous guards that should prevent the transition from even starting.

### onStart (async)

Fires as the transition starts running—after `onBefore` is settled but before any states are exited. Eager resolves are fetched here.

### onExit (async, deepest first)

Fires for each state being exited, starting with the deepest and moving toward the root.

### onRetain (async)

Fires for each state that is being retained (neither entered nor exited).

### onEnter (async, shallowest first)

Fires for each state being entered, starting with the parent and moving toward the leaf. Lazy resolves for entering states are fetched before each state's `onEnter`.

### onFinish (async)

Fires after all `onEnter` hooks are done. This is the last chance to cancel or redirect before the transition is committed.

### onSuccess / onError (synchronous, after commit)

Fires after the transition is fully committed. `onSuccess` hooks run when the promise resolves; `onError` hooks run when it rejects. Return values are ignored at this stage.
## Registering hooks

All hook registration methods are on the `$transitions` service (injected as `$transitions` or `ng.TransitionService`). Each method returns a deregistration function.

```typescript
$transitions.onBefore(
  matchCriteria: HookMatchCriteria,
  callback: (transition: Transition) => HookResult,
  options?: HookRegOptions
): () => void  // deregister function
```
### Hook match criteria

`HookMatchCriteria` is an object with optional keys `to`, `from`, `exiting`, `retained`, and `entering`. Each value is:

* A **state name string** or **glob** (`'contacts.**'`)
* A **function** `(state, transition) => boolean`
* `true` to match any state (the default when the key is omitted)

```javascript
$transitions.onStart({}, callback);

// Matches transitions going to any child of 'admin'
$transitions.onBefore({ to: 'admin.**' }, callback);

// Matches transitions where a specific state is being exited
$transitions.onExit({ exiting: 'contacts.detail' }, callback);

// Matches using a function predicate
$transitions.onStart({
  to: function (state) {
    return state.data != null && state.data.requiresAuth === true;
  }
}, callback);
```
### Hook registration options

```javascript
  priority: 10,       // higher priority runs first (default: 0)
  bind: myObject,     // `this` inside callback
  invokeLimit: 1      // auto-deregister after N invocations
});
```
## Hook return values (HookResult)

The return value of a hook controls the transition:

| Return value                | Effect                                                              |
| --------------------------- | ------------------------------------------------------------------- |
| `undefined` / anything else | Transition continues normally                                       |
| `false`                     | Transition is cancelled (aborted)                                   |
| `TargetState`               | Transition is redirected to the new target                          |
| `Promise<false>`            | Transition waits for the promise; cancels if it resolves to `false` |
| `Promise<TargetState>`      | Transition waits for the promise; redirects when it resolves        |
| Rejected `Promise`          | Transition fails with the rejection reason                          |

> **Note:** `onSuccess` and `onError` hooks run after the transition is committed. Their return values are ignored—you cannot cancel or redirect from these hooks.
## Redirecting from a hook

Return a `TargetState` created with `$state.target()`:

```javascript
  // Always redirect 'home' to 'home.dashboard' as a default substate
  return $state.target('home.dashboard');
});
```

The router internally creates a new transition to the redirect target and chains the promises. If the original transition was triggered by a URL change, the redirect uses `location: 'replace'` so the original URL is removed from history.
## Cancelling a transition

Return `false` from any hook that runs before `onSuccess`:

```javascript
  if (appIsLocked) {
    return false; // abort
  }
});
```

A cancelled transition is rejected with a `Rejection` of type `ABORTED`. The browser URL is reset to the previous location by the built-in `updateUrl` hook.
## Common hook patterns
### Authentication guard

This pattern intercepts any transition to a state with `data.requiresAuth` and redirects unauthenticated users to the login page.

```javascript
  .run(function ($transitions, $state, AuthService) {

    $transitions.onBefore(
      {
        to: function (state) {
          return state.data && state.data.requiresAuth;
        }
      },
      function (transition) {
        if (!AuthService.isAuthenticated()) {
          // Redirect to login, passing the intended destination
          return $state.target('login', {
            redirectTo: transition.to().name
          });
        }
      }
    );

  });
```

Mark states that require authentication:

```javascript
  name: 'admin.users',
  url: '/users',
  component: 'AdminUsers',
  data: { requiresAuth: true }
});
```
### Loading indicator

Show a spinner while any transition is in progress:

```javascript
  .run(function ($transitions, $rootScope) {

    $transitions.onStart({}, function () {
      $rootScope.isLoading = true;
    });

    $transitions.onSuccess({}, function () {
      $rootScope.isLoading = false;
    });

    $transitions.onError({}, function () {
      $rootScope.isLoading = false;
    });

  });
```
### Analytics tracking

Fire a page-view event after every successful navigation:

```javascript
  .run(function ($transitions, AnalyticsService) {

    $transitions.onSuccess({}, function (transition) {
      var toState = transition.to();
      AnalyticsService.pageView({
        page: toState.name,
        url: window.location.pathname,
        params: transition.params()
      });
    });

  });
```
### Scroll reset

Scroll to the top of the page on each navigation:

```javascript
  .run(function ($transitions) {

    $transitions.onSuccess({}, function () {
      window.scrollTo(0, 0);
    });

  });
```
### Async guard with redirect on failure

Allow users to authenticate mid-transition:

```javascript
  var AuthService = transition.injector().get('AuthService');

  if (!AuthService.isAuthenticated()) {
    // Return a promise; transition waits for it to settle
    return AuthService.authenticate().catch(function () {
      return $state.target('guest');
    });
  }
});
```
## Transition results

A transition can finish in one of four states:

| Result         | Description                                                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Success**    | All hooks passed, the to-state is now active. `transition.success === true`.                                                                        |
| **Error**      | A hook threw, returned a rejected promise, or a resolve failed. `transition.success === false`, `transition.error()` contains the reason.           |
| **Ignored**    | The transition targets the same state with the same parameters that are currently active. Treated as success from the `transitionTo()` perspective. |
| **Superseded** | A newer transition started before this one finished. The older transition is abandoned; the newer one continues.                                    |

Redirected transitions are not an error from the caller's perspective: `$state.go()` transparently chains to the redirect target's promise.
## Accessing the transition object

The active transition is stored on `$router.transition`. Inside any hook, the `Transition` instance is passed as the first argument.

```javascript
  console.log('Transitioned to:', transition.to().name);
  console.log('From:', transition.from().name);
  console.log('Params:', transition.params());
  console.log('Entering:', transition.entering().map(s => s.name));
  console.log('Exiting:', transition.exiting().map(s => s.name));
  console.log('ID:', transition.$id);
});
```

`transition.redirectedFrom()` returns the previous transition in a redirect chain. `transition.originalTransition()` walks the entire chain back to the first transition.
## Per-transition hooks

Hooks can also be registered on a specific `Transition` instance rather than globally on `$transitions`. These hooks only affect that single transition:

```javascript

trans.onSuccess({}, function () {
  console.log('This specific transition succeeded.');
});
```

> **Warning:** Per-transition hooks must be registered before the transition has finished running. Register them synchronously in the same call stack as the navigation, or in an `onStart` global hook.
## Dynamic resolvables in hooks

An `onBefore` hook can add additional resolve data to the current transition using `transition.addResolvable()`. The added resolvable is available to hooks and views that run after it:

```javascript
  transition.addResolvable({
    token: 'requestId',
    resolveFn: function () { return generateRequestId(); }
  });
});
```
## Transition hook ordering: priority and phase

Within a phase (e.g., all `onStart` hooks), hooks are invoked in descending priority order. The default priority is `0`. Built-in hooks like URL update and view activation use priorities in the range `9000–10000`, so application hooks with the default priority run before them.

For `onExit`, hooks are invoked deepest-first (children before parents). For `onEnter`, hooks are invoked shallowest-first (parents before children). This ordering is fixed regardless of priority.
