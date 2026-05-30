---
title: $machine
description: "Reactive mode machines with declarative transitions"
---

# `$machine`

`$machine` creates a small reactive mode machine for UI and application flows.
It is more than a regular service or factory because the returned machine is
designed to be wrapped by AngularTS scope proxies: `current` and `data` update
templates naturally, and `send()` batches transition work when a scope proxy is
observing the machine.

Use ordinary services for IO, persistence, and shared domain logic. Use
`$machine` when the important part is the allowed flow between modes.

## Create a Machine

Inject `$machine` and assign the created machine to a controller or scope
property:

```js
app.controller('SessionCtrl', function ($machine) {
  this.session = $machine({
    initial: 'setup',
    data: {
      roomId: '',
      error: '',
    },
    transitions: {
      setup: {
        join(data, message) {
          data.roomId = message.roomId;
          return 'waiting';
        },
      },
      waiting: {
        matched(data, message) {
          data.roomId = message.roomId;
          return 'playing';
        },
        unavailable(data, reason) {
          data.error = reason;
          return 'setup';
        },
      },
    },
  });
});
```

Docs call `current` a **mode**. Transition handlers return a mode string to move
to another mode.

## Register a Named Machine

Use `module.machine(name, config)` when a machine should be injectable by name:

```js
app.machine('sessionMachine', {
  initial: 'setup',
  data: {
    roomId: '',
  },
  transitions: {
    setup: {
      join(data, message) {
        data.roomId = message.roomId;
        return 'waiting';
      },
    },
  },
});

app.controller('SessionCtrl', function (sessionMachine) {
  this.session = sessionMachine;
});
```

Named machines are regular DI services. The injector creates one machine
instance and reuses it for that injectable name.

## Template API

The machine exposes a small template-friendly API:

```html
<button ng-disabled="!$ctrl.session.matches('setup')">Random</button>

<div ng-show="$ctrl.session.matches('waiting')">
  Waiting for opponent...
</div>

<span>{{ $ctrl.session.data.roomId }}</span>
```

## Runtime API

```js
session.current;          // current mode string
session.data;             // reactive data object
session.matches('setup'); // true when current mode is setup
session.can('join');      // true when current mode has a join transition
session.send('join', payload);
```

`send(type, payload)` returns `true` when a transition handler exists for the
current mode and runs. Missing transitions return `false` and do not throw.

Transition return values:

- return a mode string to change `current`
- return `false`, `undefined`, or no value to stay in the current mode

`can(type)` only checks the transition table for the current mode. It does not
run transition logic.

## Scope Ownership

`$machine(config)` does not tie the machine to the lifetime of any one scope.
The machine stores durable mode and data internally. When an AngularTS scope
proxy wraps the machine, the machine registers with that proxy and uses its
scheduler for reactive template updates and batched `send()` calls.

That means a machine can be created once, assigned to a component, survive that
component being destroyed, and later be assigned to another scope.

An explicit `$machine($scope, config)` call is also supported when a caller wants
to bind the machine to a scope immediately, but assigning the machine to a
controller or scope property is usually enough. Named machines registered with
`module.machine()` follow the same rule: they bind when a scope proxy observes
them.

## TypeScript

```ts
type SessionData = {
  roomId: string;
  error: string;
};

const session: ng.Machine<SessionData> = $machine({
  initial: 'setup',
  data: {
    roomId: '',
    error: '',
  },
  transitions: {
    setup: {
      join(data, message: { roomId: string }) {
        data.roomId = message.roomId;
        return 'waiting';
      },
    },
  },
});
```
