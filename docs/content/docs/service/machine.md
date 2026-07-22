---
title: $machine
description: 'Reactive state machines with declarative transitions'
---

# `$machine`

`$machine` creates a small reactive state machine for UI and application flows.
It is more than a regular service or factory because the returned machine is
designed to be wrapped by AngularTS scope proxies: `state` and `data` update
templates naturally, and `send()` batches transition work when a scope proxy is
observing the machine.

Use ordinary services for IO, persistence, and shared domain logic. Use
`$machine` when the important part is the allowed flow between states.

Use [`$workflow`]({{< relref "/docs/service/workflow" >}}) when the flow also
needs command boundaries, diagnostics, snapshots, restore, retry, or repeat.

Machine naming, inference, and public-type placement follow the
[shared API ergonomics contract](../../../../src/DESIGN_PHILOSOPHY.md#api-ergonomics-contract).

## Create a Machine

The smallest complete game needs only a state tree and a score. Assign the
machine to a controller property and let the template call `send()` directly:

```js
app.controller('TapGameCtrl', ["$machine", function ($machine) {
  this.game = $machine({
    initial: 'ready',
    data: {
      score: 0,
    },
    states: {
      ready: {
        on: {
          start: {
            to: 'playing',
            update({ data }) {
              data.score = 0;
            },
          },
        },
      },
      playing: {
        on: {
          tap: {
            to: ({ data, from }) =>
              data.score + 1 === 3 ? 'won' : from,
            update({ data }) {
              data.score += 1;
            },
          },
        },
      },
      won: {
        on: {
          restart: {
            to: 'playing',
            update({ data }) {
              data.score = 0;
            },
          },
        },
      },
    },
  });
}]);
```

```html
<section ng-controller="TapGameCtrl as $ctrl">
  <p>{{$ctrl.game.state}}: {{$ctrl.game.data.score}} / 3</p>
  <button
    ng-if="$ctrl.game.matches('ready')"
    ng-click="$ctrl.game.send('start')"
  >
    Start
  </button>
  <button
    ng-if="$ctrl.game.matches('playing')"
    ng-click="$ctrl.game.send('tap')"
  >
    Tap
  </button>
  <button
    ng-if="$ctrl.game.matches('won')"
    ng-click="$ctrl.game.send('restart')"
  >
    Play again
  </button>
</section>
```

`state` identifies the machine's active state. State-tree transitions move to
the explicit `to` state, while `update` mutates reactive game data. A
`to(context)` resolver handles transitions whose target depends on runtime
data.

## Ownership Patterns

Create machines with `$machine(config)` and assign the returned object to the
owner that should keep the flow alive.

Controller-owned machines are enough for local UI flow data:

```js
app.controller('SessionCtrl', ["$machine", function ($machine) {
  this.session = $machine({
    initial: 'setup',
    data: { roomId: '' },
    states: {
      setup: {
        on: {
          join: {
            to: 'waiting',
            update({ data, payload }) {
              data.roomId = payload.roomId;
            },
          },
        },
      },
      waiting: {},
    },
  });
}]);
```

AppContext models can own machines that must survive DOM root destruction:

```js
app.model('sessionRuntime', [
  '$machine',
  function ($machine) {
    return {
      session: $machine({
        initial: 'setup',
        data: { roomId: '' },
        states: {
          setup: {
            on: {
              join: {
                to: 'waiting',
                update({ data, payload }) {
                  data.roomId = payload.roomId;
                },
              },
            },
          },
          waiting: {},
        },
      }),
    };
  },
]);
```

Runtime adapters and game loops can keep the same machine outside the DOM:

```js
app.controller('GameCtrl', ["$machine", function ($machine) {
  const game = $machine({
    initial: 'playing',
    data: { frame: 0 },
    states: {
      playing: {
        on: {
          tick: {
            update({ data }) {
              data.frame += 1;
            },
          },
        },
      },
    },
  });

  this.game = game;

  requestAnimationFrame(function tick() {
    game.send('tick');
    requestAnimationFrame(tick);
  });
}]);
```

Workflows can own a machine when command execution needs a local flow gate:

```js
app.factory('sessionWorkflowMachine', ["$machine", function ($machine) {
  return $machine({
    initial: 'idle',
    data: { token: '' },
    states: {
      idle: {
        on: {
          start: {
            to: 'authenticating',
          },
        },
      },
      authenticating: {
        on: {
          authenticated: {
            to: 'ready',
            update({ data, payload }) {
              data.token = payload;
            },
          },
        },
      },
      ready: {},
    },
  });
}]);
```

## Register a Named Machine

Use `module.machine(name, config)` when a machine should be injectable by name:

```js
app.machine('sessionMachine', {
  initial: 'setup',
  data: {
    roomId: '',
  },
  states: {
    setup: {
      on: {
        join: {
          to: 'waiting',
          update({ data, payload }) {
            data.roomId = payload.roomId;
          },
        },
      },
    },
    waiting: {},
  },
});

app.controller('SessionCtrl', ["sessionMachine", function (sessionMachine) {
  this.session = sessionMachine;
}]);
```

You can also provide a resolvable config factory so it can read injectables at
registration time:

```js
function buildSessionMachine(appSettings) {
  return {
    initial: appSettings.initialMode,
    data: {
      roomId: '',
      error: '',
    },
    states: {
      setup: {
        on: {
          join: {
            to: 'waiting',
            update({ data, payload }) {
              data.roomId = payload.roomId;
            },
          },
        },
      },
      waiting: {},
    },
  };
}

buildSessionMachine.$inject = ['appSettings'];

app.machine('sessionMachine', buildSessionMachine);
```

This is useful when defaults depend on environment, user session data, or
persisted configuration.

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
session.state; // current state string
session.data; // reactive data object
session.matches('setup'); // true when current state is setup
session.can('join', payload); // true when current state can run join
session.send('join', payload); // structured transition result
session.snapshot(); // structured clone of { state, data }
session.restore(snapshot);
```

`send(type, payload)` returns a structured result with `ok`, `status`, `type`,
`from`, `to`, and an optional denial `reason`. `ok` is `true` when a transition
entry exists for the current state, its optional guard passes, and its `update`
hook runs when provided. Missing transitions and blocked guarded transitions
return `ok: false` with a specific status and do not throw. Use `$workflow` when
failures need diagnostics, retry, or recovery.

`ok` is the broad branch: successful results have status `transitioned` or
`updated`; failed results have a denial, invalid-event, or missing-transition
status. Machine results intentionally do not carry diagnostics. The status is
the decision, while workflows own durable failure evidence.

State-tree transition shape:

- `to` names the next state or resolves it from readonly transition input
- omit `to` for a same-state data update
- `update({ data, payload })` mutates reactive data
- `guard({ data, payload })` blocks the transition when it returns `false`
- `denied({ data, payload })` may record local denial state

Routing is explicit. Static `to` is the normal path. Use a synchronous,
side-effect-free `to(context)` resolver when the next state depends on runtime
data, such as a game move ending in win, draw, or continued play. AngularTS
resolves one target before guard and policy evaluation; hooks and `update()`
receive that same readonly target. Return values from `update()` are ignored.

`can(type, payload)` checks the transition table, target resolver, policy, and
any optional guard for the current state. It does not run `update` or `denied`.
Target resolvers and guards should be side-effect-free because templates may
call `can()` repeatedly.

Status values are `transitioned`, `updated`, `missing-transition`,
`guard-denied`, `policy-denied`, and `invalid-event`. When policy denies a
transition, the result includes the policy decision's optional `reason`.

Denial paths are narrow. `guard-denied` only means the transition guard returned
`false`; transition-local `denied()` runs only for that guard-denial case.
Missing transitions and invalid event names do not run `before`, `update`,
`after`, `denied`, enter hooks, exit hooks, or global transition hooks.
`policy-denied` is reserved for framework policy gates. It does not run
`denied`, mutation hooks, state hooks, global transition hooks, or legacy
transition targets.

## Transition Policy

Use `policy` when the application has a cross-cutting synchronous gate that
should apply to every transition in a machine:

```js
const session = $machine({
  id: 'session',
  initial: 'setup',
  data: { roomId: '' },
  states: {
    setup: {
      on: {
        join: {
          to: 'waiting',
          update({ data, payload }) {
            data.roomId = payload.roomId;
          },
        },
      },
    },
    waiting: {},
  },
  policy(context) {
    if (context.type === 'join' && !context.payload.roomId) {
      return { type: 'deny', reason: 'room_required' };
    }

    return 'allow';
  },
});

session.send('join', { roomId: '' }).status; // "policy-denied"
```

Policy contexts include `operation: "machine.transition"`, `machineId`, `type`,
`from`, `to`, event-narrowed `payload`, readonly `data`, an observational
`machine` view, and optional `meta`. The policy and guard machine view exposes
`state`, `data`, `can()`, `matches()`, and `snapshot()` but cannot dispatch or
restore live state. Policies must be synchronous so `can()` and `send()` stay
synchronous.
Put async authorization, retries, persistence, and recovery in `$workflow` or
another service and then project the result back through a machine event.

State-tree transitions with static `to` give policy the strongest pre-execution
context. Legacy callback transitions do not run their target just to discover a
future state, so policy sees `to` as the current state there.

## Guarded Transitions

Use `guard` when a transition has a cheap synchronous condition that templates
or controllers should be able to ask about through `can()`:

```js
const session = $machine({
  initial: 'setup',
  data: {
    roomId: '',
    inviteCode: '',
  },
  states: {
    setup: {
      on: {
        join: {
          to: 'waiting',
          guard({ data, payload }) {
            return !!data.inviteCode && payload.roomId !== '';
          },
          update({ data, payload }) {
            data.roomId = payload.roomId;
          },
          denied({ data }) {
            data.roomId = '';
          },
        },
      },
    },
    waiting: {},
  },
});

session.can('join', { roomId: 'abc' }); // evaluates guard only
session.send('join', { roomId: 'abc' }); // runs update when guard passes
```

Guards and updates are synchronous. Put async work, retries, diagnostics, and
command recovery in [`$workflow`]({{< relref "/docs/service/workflow" >}}), then
use a machine transition to project the resulting state/data into the UI.

## Example: Session Wizard

A machine is also useful for local wizard flow where the UI should only expose
legal next actions:

```js
app.controller('SessionWizardCtrl', ["$machine", function ($machine) {
  this.wizard = $machine({
    initial: 'profile',
    data: {
      name: '',
      acceptedTerms: false,
      error: '',
    },
    states: {
      profile: {
        on: {
          next: {
            to: 'terms',
            guard({ data }) {
              return data.name.trim() !== '';
            },
            denied({ data }) {
              data.error = 'name_required';
            },
          },
        },
      },
      terms: {
        on: {
          back: { to: 'profile' },
          accept: {
            update({ data }) {
              data.acceptedTerms = true;
            },
          },
          submit: {
            to: 'complete',
            guard({ data }) {
              return data.acceptedTerms;
            },
            denied({ data }) {
              data.error = 'terms_required';
            },
          },
        },
      },
      complete: {},
    },
  });
}]);
```

Static `to` keeps the flow inspectable: `next`, `back`, and `submit` declare
their route before mutation code runs. The same-state `accept` event omits `to`
because it only updates wizard data.

## Example: Tic Tac Toe

A machine is useful when user actions must follow a small set of legal states.
This example keeps a tic tac toe game in `playing` until a move produces a win
or draw. Once the machine reaches `xWon`, `oWon`, or `draw`, there is no `move`
transition for that state, so further moves return `false`.

```js
app.controller('GameCtrl', ["$machine", function ($machine) {
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
    states: {
      playing: {
        on: {
          move: {
            to({ data, payload, from }) {
              const index = payload.index;

              if (
                !Number.isInteger(index) ||
                index < 0 ||
                index >= data.board.length ||
                data.board[index] !== '-'
              ) {
                return from;
              }

              const board = [...data.board];
              board[index] = data.nextPlayer;
              const winner = winnerOf(board);

              if (winner) return winner === 'X' ? 'xWon' : 'oWon';
              return data.moveCount + 1 === board.length ? 'draw' : from;
            },
            guard({ data, payload }) {
              const index = payload.index;

              return (
                Number.isInteger(index) &&
                index >= 0 &&
                index < data.board.length &&
                data.board[index] === '-'
              );
            },
            update(context) {
              const { data, payload } = context;
              const player = data.nextPlayer;

              data.board[payload.index] = player;
              data.moveCount += 1;
              data.lastError = '';

              const winner = winnerOf(data.board);

              if (winner) {
                data.winner = winner;
                return;
              }

              if (data.moveCount === data.board.length) {
                return;
              }

              data.nextPlayer = player === 'X' ? 'O' : 'X';
            },
            denied({ data }) {
              data.lastError = 'invalid_move';
            },
          },
        },
      },
      xWon: {},
      oWon: {},
      draw: {},
    },
  });
}]);
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

The transition owns both validation and projection. Its `to` resolver predicts
the next state without mutation; a valid move then updates `data.board` and
whose turn is next. An invalid move records `lastError` in
`denied`, leaving `state` unchanged. Machine transitions do not roll back data
mutations when hooks throw.

### Persist With Transition Hooks

Transition hooks are a convenient place to persist the game after each handled
move. The hook runs after `state` has been updated, so the snapshot contains
the terminal state when the move ends the game.

```js
app.controller('GameCtrl', ["$machine", function ($machine) {
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
    states: {
      playing: {
        on: {
          move: {
            guard({ data, payload }) {
              // Same guard logic as above.
            },
            update(context) {
              // Same update logic as above.
            },
            denied({ data }) {
              data.lastError = 'invalid_move';
            },
          },
        },
      },
      xWon: {},
      oWon: {},
      draw: {},
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
}]);
```

`restore()` does not run hooks, so loading the saved game will not immediately
write another snapshot. The next successful `send()` call will persist the
updated state and data.

## Snapshots

Use `snapshot()` to capture durable state and data. A snapshot is a structured
clone of `{ state, data }`:

```js
const snapshot = session.snapshot();

localStorage.setItem('session', JSON.stringify(snapshot));
```

A snapshot contains only `state` and `data`. It has no version or machine id,
and it does not include transitions or hooks; those still come from the machine
config. Use `$workflow` or a workflow supervisor when persisted recovery needs
versioning, diagnostics, history, retry, or migration.

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
replaced with cloned snapshot values. Restore accepts persisted input as
`unknown`, validates its shape, and rejects a state that is not declared in
`states`. Restore does not run transition hooks.

The configured `initial` state and every resolved transition target must also
exist in `states`. Invalid built-in machine states fail at their boundary instead
of leaving the machine in an unreachable state.

## Hooks

Use `hooks.enter` and `hooks.exit` for state-specific effects. Use
`hooks.transition` for logging or cross-cutting work that should run after any
handled transition, including same-state transitions:

```js
const session = $machine({
  initial: 'setup',
  data: {
    status: 'idle',
  },
  states: {
    setup: {
      on: {
        join: {
          to: 'waiting',
        },
      },
    },
    waiting: {
      on: {
        matched: {
          to: 'playing',
        },
      },
    },
    playing: {},
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
`exit` runs before `state` changes, `enter` runs after `state` changes, and
`transition` runs after state-specific hooks. Missing transitions do not run
hooks.

Hooks run synchronously inside the same `send()` batch. A hook may call
`machine.send()` to run another valid transition; nested sends are batched with
the outer transition. If a transition or hook throws, the error is rethrown,
prior data/state mutations are kept, and AngularTS still schedules bound
scopes for the keys touched by the attempted transition.

## Scope Ownership

`$machine(config)` does not tie the machine to the lifetime of any one scope.
The machine stores durable state and data internally. When an AngularTS scope
proxy wraps the machine, the machine registers with that proxy and uses its
scheduler for reactive template updates and batched `send()` calls.

That means a machine can be created once, assigned to a component, survive that
component being destroyed, and later be assigned to another scope.

Prefer `$machine(config)` plus assignment to the controller, model, service,
workflow, or runtime adapter that owns the machine. Named machines registered
with `module.machine()` follow the same rule: they bind when a scope proxy
observes them.

## TypeScript

```ts
type SessionData = {
  roomId: string;
  error: string;
};

const session = $machine({
  initial: 'setup',
  data: {
    roomId: '',
    error: '',
  } satisfies SessionData,
  states: {
    setup: {
      on: {
        join: {
          to: 'waiting',
          update({ data }) {
            data.roomId = 'abc';
          },
        },
      },
    },
    waiting: {},
  },
});

session.send('join', { roomId: 'abc' });
session.send('reset');
```

Machine definitions are usable without generic parameters. Event names are
inferred from the `on` maps and state names are inferred from `states`. Payloads
remain `unknown` until an explicit event map supplies their types.

Add an event map when you want strict checked event names and payloads:

```ts
type SessionEvents = {
  join: { roomId: string };
  fail: string;
  reset: undefined;
};

const session = $machine<SessionData, SessionEvents>({
  initial: 'setup',
  data: {
    roomId: '',
    error: '',
  },
  states: {
    setup: {
      on: {
        join: {
          to: 'waiting',
          update({ data, payload }) {
            data.roomId = payload.roomId;
          },
        },
      },
    },
    waiting: {
      on: {
        reset: {
          to: 'setup',
        },
      },
    },
  },
});
```

The ordinary authoring path does not require extraction helpers. Package authors
can import `MachineDataOf`, `MachineEventsOf`, `MachineEventNamesOf`, and
`MachineStatesOf` directly from `@angular-wave/angular.ts/services/machine` when
an adapter needs to derive types from a reusable definition.
