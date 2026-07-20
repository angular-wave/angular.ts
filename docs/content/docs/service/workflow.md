---
title: Workflow
description: Declarative asynchronous operation lifecycles with reactive state, cancellation, diagnostics, snapshots, and recovery.
---

# Workflow

`$workflow` runs asynchronous operations through declarative lifecycles. A
definition states where a command may run and what state and data changes occur
while it is pending, after success, and after failure. Application code only
requests the operation.

Use `$machine` for synchronous event-driven state. Use `$workflow` when an
operation can wait, fail, time out, be cancelled, or require recovery.

## Create A Workflow

```js
app.workflow('checkout', {
  initial: 'ready',

  data: {
    receipt: null,
    failure: '',
  },

  commands: {
    submit: {
      from: 'ready',
      pending: 'processing',

      execute: ({ input, signal }) =>
        checkoutApi.submit(input, { signal }),

      success: {
        to: 'completed',
        update({ data, output }) {
          data.receipt = output;
          data.failure = '';
        },
      },

      failure: {
        to: 'failed',
        update({ data, diagnostic }) {
          data.failure = diagnostic.message;
        },
      },
    },
  },
});
```

Inject the named workflow and request the command:

```js
app.controller('CheckoutCtrl', function (checkout) {
  this.checkout = checkout;

  this.submit = async (order) => {
    const result = await checkout.run('submit', order);

    if (!result.ok) {
      console.error(result.diagnostics);
    }
  };
});
```

Templates observe workflow state and data directly:

```html
<button
  ng-click="$ctrl.submit($ctrl.order)"
  ng-disabled="!$ctrl.checkout.can('submit')"
>
  Submit
</button>

<p ng-if="$ctrl.checkout.state === 'processing'">Processing</p>
<p ng-if="$ctrl.checkout.state === 'failed'">
  {{ $ctrl.checkout.data.failure }}
</p>
```

## Command Lifecycle

Every command declares:

- `from`: state or states from which the command may run.
- `pending`: state entered before execution starts.
- `execute`: optional synchronous or asynchronous operation.
- `success`: state entered when execution returns.
- `failure`: state entered when execution throws or rejects.

`pending`, `success`, and `failure` accept either a state name or an object with
`to` and `update`:

```js
success: {
  to: 'completed',
  update({ data, input, output, command }) {
    data.receipt = output;
  },
}
```

Lifecycle updates are the writable boundary for workflow data. The data passed
to `execute` is readonly, including nested plain objects, arrays, maps, and
sets. This prevents a failed command from leaving untracked imperative changes.

## Immediate Commands

An operation that only changes workflow state can omit `execute`:

```js
commands: {
  reset: {
    from: ['completed', 'failed'],
    pending: 'resetting',
    success: {
      to: 'ready',
      update({ data }) {
        data.receipt = null;
        data.failure = '';
      },
    },
    failure: 'failed',
  },
}
```

```js
await checkout.run('reset');
```

External approvals, WebSocket messages, user actions, and repair requests enter
a workflow as commands. Workflows do not expose a separate event or `send()`
API.

## Results

`run()` always resolves to a `WorkflowResult`:

```js
const result = await checkout.run('submit', order);

if (result.ok) {
  console.log(result.output);
} else if (result.status === 'timeout') {
  console.warn('The operation timed out.');
} else {
  console.warn(result.diagnostics);
}
```

Successful results have status `completed`. Failed results use `failed`,
`cancelled`, `timeout`, or `rejected`.

`rejected` means execution did not fail unexpectedly. The command was unknown,
was not allowed from the current state, violated its concurrency declaration,
or called `reject()` with a controlled diagnostic.

## Controlled Rejection

Use `reject()` for an expected business decision:

```js
execute({ input, reject }) {
  if (!input.acceptedTerms) {
    return reject({
      code: 'checkout.termsRequired',
      message: 'Terms must be accepted.',
      recoverable: true,
    });
  }

  return checkoutApi.submit(input);
}
```

The framework records the diagnostic and applies the declared failure
lifecycle.

## Cancellation And Timeout

Commands receive an `AbortSignal` and may register cleanup callbacks:

```js
execute({ input, signal, cleanup }) {
  const request = checkoutApi.submit(input, { signal });

  cleanup(() => request.releaseResources());

  return request;
}
```

Cancel one command or every running command:

```js
checkout.cancel('submit');
checkout.cancel();
```

Declare timeout duration and outcome with the command:

```js
submit: {
  from: 'ready',
  pending: 'processing',
  commandTimeout: 5000,
  execute: submitOrder,
  success: 'completed',
  failure: 'failed',
  cancelled: 'cancelled',
  timeout: 'timed-out',
}
```

When `cancelled` or `timeout` is omitted, the command uses its `failure`
lifecycle.

## Concurrency And Retry

Concurrency belongs to the declaration:

```js
submit: {
  from: ['ready', 'processing'],
  pending: 'processing',
  concurrency: 'reject',
  retry: 2,
  execute: submitOrder,
  success: 'completed',
  failure: 'failed',
}
```

- `reject` is the default and rejects another run of the same command.
- `queue` executes runs of the same command in request order.
- `parallel` allows overlapping execution when the declared source states also
  permit it.
- `retry` is the number of automatic retries after unexpected execution
  failure.

Callers cannot override these properties through `run()`. Operational behavior
therefore remains part of the workflow definition.

## Diagnostics And History

`workflow.diagnostics` contains normalized, serializable evidence from failed
operations. `workflow.history` records command start, completion, and final
failure.

```js
workflow.diagnostics;
workflow.history;
```

Use `diagnosticLimit` and `historyLimit` to bound retained entries:

```js
app.workflow('checkout', {
  initial: 'ready',
  data: {},
  diagnosticLimit: 100,
  historyLimit: 500,
  commands: checkoutCommands,
});
```

## Snapshot And Restore

Snapshots contain the workflow id, state, data, diagnostics, and history:

```js
const snapshot = checkout.snapshot();

localStorage.setItem('checkout', JSON.stringify(snapshot));
checkout.restore(JSON.parse(localStorage.getItem('checkout')));
```

Use `migrateSnapshot` when persisted data predates the current snapshot shape:

```js
migrateSnapshot(snapshot) {
  if (snapshot.version === 0) {
    return {
      version: 1,
      id: 'checkout',
      state: snapshot.stage,
      data: snapshot.data,
      diagnostics: [],
      history: [],
    };
  }

  return snapshot;
}
```

## Supervisor

A workflow supervisor owns persistence and recovery for a named group:

```js
app.workflowSupervisor('checkoutProcesses', {
  workflows: {
    checkout: checkoutDefinition,
    fulfillment: fulfillmentDefinition,
  },
  persistence: 'indexeddb',
  autoPersist: true,
  autoRecover: true,
});
```

```js
app.controller('AdminCtrl', function (checkoutProcesses) {
  this.checkout = checkoutProcesses.workflow('checkout');
});
```

Supervisors can also use a persistence adapter:

```js
const persistence = {
  async load(id) {
    return database.load(id);
  },
  async save(id, snapshot) {
    await database.save(id, snapshot);
  },
};
```

`autoPersist` saves after every settled command. `autoRecover` restores the
latest snapshot and reruns the latest recoverable failed command for each
workflow.

## Worker Runtime

The optional workflow worker runtime transports `run`, `snapshot`, and
`restore`. It does not define another orchestration protocol:

```js
const host = createWorkflowWorkerHost({
  workflows: { checkout },
});

const client = createWorkflowWorkerClient(workerConnection);
const result = await client.run('checkout', 'submit', order);
```

## Runtime API

```js
workflow.id;
workflow.state;
workflow.data;
workflow.diagnostics;
workflow.history;
workflow.can('submit');
workflow.run('submit', order);
workflow.cancel('submit');
workflow.snapshot();
workflow.restore(snapshot);
```

The runtime intentionally has no `send()`, manual lifecycle transition, or
per-run orchestration options.
