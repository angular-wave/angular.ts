---
title: $machine
description: 'Reactive mode machines with declarative transitions'
---

# `$machine`

`$machine` creates a small reactive mode machine for UI and application flows.
It is more than a regular service or factory because the returned machine is
designed to be wrapped by AngularTS scope proxies: `current` and `data` update
templates naturally, and `send()` batches transition work when a scope proxy is
observing the machine.

Use ordinary services for IO, persistence, and shared domain logic. Use
`$machine` when the important part is the allowed flow between modes.

Use [`$workflow`]({{< relref "/docs/service/workflow" >}}) when the flow also
needs command boundaries, diagnostics, snapshots, restore, retry, or repeat.

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

<div ng-show="$ctrl.session.matches('waiting')">Waiting for opponent...</div>

<span>{{ $ctrl.session.data.roomId }}</span>
```

## Runtime API

```js
session.current; // current mode string
session.data; // reactive data object
session.matches('setup'); // true when current mode is setup
session.can('join'); // true when current mode has a join transition
session.send('join', payload);
session.snapshot(); // structured clone of { current, data }
session.restore(snapshot);
```

`send(type, payload)` returns `true` when a transition handler exists for the
current mode and runs. Missing transitions return `false` and do not throw.

Transition return values:

- return a mode string to change `current`
- return `false`, `undefined`, or no value to stay in the current mode

`can(type)` only checks the transition table for the current mode. It does not
run transition logic.

## Example: Tic Tac Toe

A machine is useful when user actions must follow a small set of legal modes.
This example keeps a tic tac toe game in `playing` until a move produces a win
or draw. Once the machine reaches `xWon`, `oWon`, or `draw`, there is no `move`
transition for that mode, so further moves return `false`.

```js
app.controller('GameCtrl', function ($machine) {
  const wins = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  const winnerOf = (board) => {
    for (const [a, b, c] of wins) {
      const mark = board[a];

      if (mark !== '-' && mark === board[b] && mark === board[c]) {
        return mark;
      }
    }

    return '';
  };

  this.game = $machine({
    initial: 'playing',
    data: {
      board: ['-', '-', '-', '-', '-', '-', '-', '-', '-'],
      nextPlayer: 'X',
      winner: '',
      moveCount: 0,
      lastError: '',
    },
    transitions: {
      playing: {
        move(data, { index }) {
          if (
            !Number.isInteger(index) ||
            index < 0 ||
            index >= data.board.length ||
            data.board[index] !== '-'
          ) {
            data.lastError = 'invalid_move';
            return false;
          }

          const player = data.nextPlayer;

          data.board[index] = player;
          data.moveCount += 1;
          data.lastError = '';

          const winner = winnerOf(data.board);

          if (winner) {
            data.winner = winner;
            return winner === 'X' ? 'xWon' : 'oWon';
          }

          if (data.moveCount === data.board.length) {
            return 'draw';
          }

          data.nextPlayer = player === 'X' ? 'O' : 'X';
          return 'playing';
        },
      },
    },
  });
});
```

```html
<button
  ng-repeat="cell in $ctrl.game.data.board track by $index"
  ng-disabled="!$ctrl.game.matches('playing') || cell !== '-'"
  ng-click="$ctrl.game.send('move', { index: $index })"
>
  {{ cell }}
</button>

<p ng-show="$ctrl.game.matches('playing')">
  Next: {{ $ctrl.game.data.nextPlayer }}
</p>

<p ng-show="$ctrl.game.data.winner">Winner: {{ $ctrl.game.data.winner }}</p>
```

The transition owns both validation and projection. A valid move mutates
`data.board`, updates whose turn is next, and returns the next mode. An invalid
move records `lastError` and returns `false`, leaving `current` unchanged.

### Persist With Transition Hooks

Transition hooks are a convenient place to persist the game after each handled
move. The hook runs after `current` has been updated, so the snapshot contains
the terminal mode when the move ends the game.

```js
app.controller('GameCtrl', function ($machine) {
  const storageKey = 'tic-tac-toe';

  this.game = $machine({
    initial: 'playing',
    data: {
      board: ['-', '-', '-', '-', '-', '-', '-', '-', '-'],
      nextPlayer: 'X',
      winner: '',
      moveCount: 0,
      lastError: '',
    },
    transitions: {
      playing: {
        move(data, { index }) {
          // Same move logic as above.
        },
      },
    },
    hooks: {
      transition({ machine }) {
        localStorage.setItem(storageKey, JSON.stringify(machine.snapshot()));
      },
    },
  });

  const saved = localStorage.getItem(storageKey);

  if (saved) {
    this.game.restore(JSON.parse(saved));
  }
});
```

`restore()` does not run hooks, so loading the saved game will not immediately
write another snapshot. The next successful `send()` call will persist the
updated machine state.

## Snapshots

Use `snapshot()` to capture the durable machine state. A snapshot is a
structured clone of `{ current, data }`:

```js
const snapshot = session.snapshot();

localStorage.setItem('session', JSON.stringify(snapshot));
```

A snapshot contains only `current` and `data`. It does not include transitions
or hooks; those still come from the machine config.

The clone uses the browser's `structuredClone()` behavior. Values such as
objects, arrays, Dates, Maps, Sets, typed arrays, and cycles can be cloned.
Functions, DOM nodes, and other non-cloneable values will throw the native
structured clone error.

JSON persistence is a narrower contract. Use `JSON.stringify(snapshot)` only
when `data` is JSON-compatible, or add your own encode/decode layer before
storing the snapshot.

Use `restore(snapshot)` to recover an existing machine:

```js
const snapshot = JSON.parse(localStorage.getItem('session'));

session.restore(snapshot);
```

`restore()` mutates the existing `data` object in place so scope proxies and
templates keep their identity. Keys missing from the snapshot are removed,
nested plain objects are merged in place, and non-plain values like arrays are
replaced with cloned snapshot values. Restore does not run transition hooks.

## Hooks

Use `hooks.enter` and `hooks.exit` for mode-specific effects. Use
`hooks.transition` for logging or cross-cutting work that should run after any
handled transition, including same-mode transitions:

```js
const session = $machine({
  initial: 'setup',
  data: {
    status: 'idle',
  },
  transitions: {
    setup: {
      join() {
        return 'waiting';
      },
    },
    waiting: {
      matched() {
        return 'playing';
      },
    },
  },
  hooks: {
    exit: {
      setup({ data }) {
        data.status = 'joining';
      },
    },
    enter: {
      waiting({ data }) {
        data.status = 'waiting';
      },
    },
    transition({ type, from, to }) {
      console.log(`${type}: ${from} -> ${to}`);
    },
  },
});
```

Hook context contains `type`, `from`, `to`, `payload`, `data`, and `machine`.
`exit` runs before `current` changes, `enter` runs after `current` changes, and
`transition` runs after mode-specific hooks. Missing transitions do not run
hooks.

Hooks run synchronously inside the same `send()` batch. A hook may call
`machine.send()` to run another valid transition; nested sends are batched with
the outer transition.

## Scope Ownership

`$machine(config)` does not tie the machine to the lifetime of any one scope.
The machine stores durable mode and data internally. When an AngularTS scope
proxy wraps the machine, the machine registers with that proxy and uses its
scheduler for reactive template updates and batched `send()` calls.

That means a machine can be created once, assigned to a component, survive that
component being destroyed, and later be assigned to another scope.

An explicit `$machine($scope, config)` call is also supported when a caller
wants to bind the machine to a scope immediately, but assigning the machine to a
controller or scope property is usually enough. Named machines registered with
`module.machine()` follow the same rule: they bind when a scope proxy observes
them.

## TypeScript

```ts
import { defineMachine } from '@angular-wave/angular.ts';

type SessionData = {
  roomId: string;
  error: string;
};

type SessionEvents = {
  join: { roomId: string };
  fail: string;
  reset: undefined;
};

const config = defineMachine<SessionData, SessionEvents>({
  initial: 'setup',
  data: {
    roomId: '',
    error: '',
  } satisfies SessionData,
  transitions: {
    setup: {
      join(data, message) {
        data.roomId = message.roomId;
        return 'waiting';
      },
    },
  },
});

const session = $machine(config);

session.send('join', { roomId: 'abc' });
session.send('reset');
```

Machine definitions are strict by default in TypeScript. If no event map is
provided, `send()` has no valid event names and transition maps accept no event
keys. Use `defineMachine<Data, Events>()` for checked event names and payloads,
or opt into `ng.MachineEventMap` when you intentionally need dynamic event
names.
