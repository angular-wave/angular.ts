---
title: $workflow
description: 'Inspectable command workflows built on reactive mode machines'
---

# `$workflow`

`$workflow` adds command boundaries, diagnostics, history, snapshots, restore,
retry, and repeat on top of `$machine`.

Use `$machine` when you only need legal modes and transitions. Use `$workflow`
when external work needs to be run, inspected, repaired, repeated, or handed to
another process as JSON.

## Create a Workflow

Inject `$workflow` and assign the workflow to a controller or scope property:

```js
app.controller('DocsCtrl', function ($workflow) {
  this.build = $workflow({
    id: 'docs-build',
    initial: 'idle',
    data: {
      status: 'idle',
      output: '',
    },
    transitions: {
      idle: {
        start(data) {
          data.status = 'running';
          return 'running';
        },
      },
      running: {
        complete(data, output) {
          data.status = 'complete';
          data.output = output;
          return 'complete';
        },
        fail(data, reason) {
          data.status = reason;
          return 'failed';
        },
      },
    },
    commands: {
      build({ workflow, data, input }) {
        workflow.send('start');
        data.output = String(input);
        workflow.send('complete', data.output);

        return {
          ok: true,
          output: {
            file: data.output,
          },
        };
      },
    },
  });
});
```

`workflow.current` is the current mode. `workflow.data` is reactive data for
templates. `workflow.run(name, input)` is the explicit boundary for work that
can succeed, fail, or be retried.

Commands may be synchronous or async. `run()`, `retry()`, and `repeat()` always
return a promise that resolves to a normalized `WorkflowCommandResult`.

## Register a Named Workflow

Use `module.workflow(name, config)` when a workflow should be injectable by
name:

```js
app.workflow('docsWorkflow', {
  id: 'docs',
  initial: 'idle',
  data: {
    runs: 0,
  },
  transitions: {
    idle: {
      start(data) {
        data.runs += 1;
        return 'running';
      },
    },
  },
});

app.controller('DocsCtrl', function (docsWorkflow) {
  this.workflow = docsWorkflow;
});
```

Named workflows are DI singletons for an injector. Observing scopes can be
destroyed without destroying the workflow instance.

## Command Diagnostics

Commands return a `WorkflowCommandResult`, or they can throw. Thrown values are
converted to structured diagnostics and partial data mutations are preserved:

```js
const result = await workflow.run('publish', 'index.html');

if (!result.ok) {
  for (const diagnostic of result.diagnostics) {
    console.warn(diagnostic.code, diagnostic.message);
  }
}
```

Diagnostics are safe to serialize:

```js
const diagnosticsJson = JSON.stringify(workflow.diagnostics);
```

## Snapshot And Restore

Snapshots are the JSON handoff format:

```js
const snapshot = workflow.snapshot();

localStorage.setItem('docsWorkflow', JSON.stringify(snapshot));

const restored = JSON.parse(localStorage.getItem('docsWorkflow'));

workflow.restore(restored);
```

A snapshot contains:

```js
{
  version: 1,
  id: 'docs-build',
  current: 'failed',
  data: {},
  diagnostics: [],
  history: []
}
```

`restore(snapshot)` requires version `1` and a matching workflow `id`. Restored
diagnostics and history entries are normalized into the same JSON-safe shape
that live commands produce. Restored history IDs are normalized to unique
positive integers. Command inputs and outputs in `workflow.history` and
snapshots are stored as JSON-safe projections. Live workflows still retry or
repeat with the original input value; after `restore(snapshot)`, retry and
repeat use the serialized input from the snapshot.

Use `migrateSnapshot(snapshot)` to restore older persisted shapes:

```js
const workflow = $workflow({
  id: 'docs-build',
  initial: 'idle',
  data: {
    title: '',
  },
  transitions: {},
  migrateSnapshot(snapshot) {
    return {
      version: 1,
      id: 'docs-build',
      current: snapshot.state,
      data: {
        title: snapshot.title,
      },
      diagnostics: [],
      history: [],
    };
  },
});
```

## Retry, Repeat, And Repair

`retry(commandName?)` reruns the latest failed command with its original input:

```js
const retryResult = await workflow.retry('publish');
```

`repeat(commandName?)` reruns the latest completed command with its original
input:

```js
const repeatResult = await workflow.repeat('publish');
```

Repair is intentionally configured as a normal command instead of a magic
built-in policy:

```js
app.controller('DocsCtrl', function ($workflow) {
  this.workflow = $workflow({
    id: 'repairable-docs',
    initial: 'idle',
    data: {
      title: '',
    },
    transitions: {
      idle: {
        validate(data) {
          return data.title ? 'complete' : 'failed';
        },
      },
      failed: {
        complete() {
          return 'complete';
        },
      },
    },
    commands: {
      validate({ workflow }) {
        workflow.send('validate');

        return workflow.matches('complete')
          ? { ok: true }
          : {
              ok: false,
              diagnostics: [
                {
                  code: 'docs.missingTitle',
                  message: 'Missing title.',
                  recoverable: true,
                },
              ],
            };
      },
      repair({ workflow, data, input }) {
        data.title = String(input);
        workflow.send('complete');

        return {
          ok: true,
        };
      },
    },
  });
});
```

```js
await workflow.run('validate');
await workflow.run('repair', 'Guide');
```

Diagnostics and history are append-only in v1. Repair, retry, and repeat add
evidence; they do not erase the commands that made recovery or replay necessary.

## Production Policies

Concurrent command calls are allowed by default. Set `concurrency` to reject or
queue overlapping runs for the same command:

```js
const workflow = $workflow({
  id: 'publish',
  concurrency: 'queue',
  initial: 'idle',
  data: {},
  transitions: {},
  commands: {
    publish() {
      return { ok: true };
    },
  },
});
```

Per-run options can override the workflow default:

```js
await workflow.run('publish', payload, { concurrency: 'reject' });
```

Use `commandTimeout` or per-run `timeout` to fail commands that exceed a time
budget. Timeout and cancellation resolve the command result with diagnostics;
commands receive an `AbortSignal` so async work can stop early:

```js
const workflow = $workflow({
  id: 'publish',
  commandTimeout: 5000,
  initial: 'idle',
  data: {},
  transitions: {},
  commands: {
    async publish({ cleanup, signal }) {
      const controller = new AbortController();

      cleanup(() => controller.abort());
      signal.addEventListener('abort', () => controller.abort(), {
        once: true,
      });

      await fetch('/publish', { signal: controller.signal });

      return { ok: true };
    },
  },
});

workflow.cancel('publish');
```

`cleanup(callback)` runs after the command resolves, fails, times out, or is
cancelled. Use it for timers, event listeners, observers, and request
controllers created by the command.

`restore(snapshot)` is a hard recovery boundary. It cancels running commands,
prevents queued commands from starting, and ignores late writes from cancelled
command continuations. Command code should still observe `signal.aborted` so it
can release external resources promptly.

Diagnostics and history are bounded to 1000 entries by default. Use
`diagnosticLimit` and `historyLimit` to choose different bounds:

```js
const workflow = $workflow({
  id: 'bounded',
  diagnosticLimit: 100,
  historyLimit: 100,
  initial: 'idle',
  data: {},
  transitions: {},
});
```

## Runtime API

```js
workflow.current;
workflow.data;
workflow.diagnostics;
workflow.history;
workflow.matches('idle');
workflow.can('start');
workflow.send('start');
workflow.run('publish', payload, { timeout: 5000 });
workflow.retry('publish', { concurrency: 'reject' });
workflow.repeat('publish');
workflow.cancel('publish');
workflow.snapshot();
workflow.restore(snapshot);
```

TypeScript callers can specify the expected command output type at the command
boundary:

```ts
const result = await workflow.run<{ file: string }>('publish', payload);

if (result.ok) {
  result.output?.file;
}
```

Workflow definitions are strict by default in TypeScript. If no event or command
map is provided, `send()`, `run()`, `retry()`, and `repeat()` have no valid
names. Use `defineWorkflow<Data, Events, Commands>()` and `defineCommand()` for
checked event names, command names, inputs, and outputs:

```ts
import { defineCommand, defineWorkflow } from '@angular-wave/angular.ts';

type DocsData = {
  output: string;
};

type DocsEvents = {
  complete: { output: string };
};

type DocsCommands = {
  publish: ng.WorkflowCommand<DocsData, string, { file: string }, DocsEvents>;
};

const config = defineWorkflow<DocsData, DocsEvents, DocsCommands>({
  id: 'docs',
  initial: 'idle',
  data: {
    output: '',
  } satisfies DocsData,
  transitions: {
    idle: {
      complete(data, payload) {
        data.output = payload.output;
        return 'complete';
      },
    },
  },
  commands: {
    publish: defineCommand<DocsData, string, { file: string }, DocsEvents>(
      ({ workflow, input }) => {
        workflow.send('complete', { output: input });

        return {
          ok: true,
          output: {
            file: input,
          },
        };
      },
    ),
  },
});

const workflow = $workflow(config);
const result = await workflow.run('publish', 'index.html');
```

When a command map is provided, `commands` is required and every declared
command key must be present and callable. This keeps `workflow.run('name')`
aligned with the runtime command table.

When a command calls another command, pass the full command map to
`defineCommand()` so `context.workflow.run()` is checked too:

```ts
type DocsCommands = {
  build: ng.WorkflowCommand<
    DocsData,
    string,
    { file: string },
    DocsEvents,
    DocsCommands
  >;
  publish: ng.WorkflowCommand<
    DocsData,
    { file: string },
    { url: string },
    DocsEvents,
    DocsCommands
  >;
};

const build = defineCommand<
  DocsData,
  string,
  { file: string },
  DocsEvents,
  DocsCommands
>(({ workflow, input }) => {
  workflow.run('publish', { file: input });

  return {
    ok: true,
    output: {
      file: input,
    },
  };
});
```

Use `ng.WorkflowCommandMap` only when you intentionally need dynamic command
names. Dynamic command inputs are typed as `unknown`; narrow the value inside
the command before using it.
