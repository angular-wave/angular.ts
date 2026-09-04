---
title: Structure an application
weight: 10
description:
  Separate AngularTS registration, UI state, domain operations, and external
  resources without adding speculative layers.
---

## Start with server rendering

Follow the [server-first guideline]({{< relref "/docs/guides/server-first" >}}).
Keep domain models, validation, authorization, navigation, and HTML rendering
together on the server. Render the useful document and initial state before
AngularTS starts.

Place an AngularTS root around the smallest region that needs browser behavior.
Do not create a browser copy of the domain model merely to make the page
interactive. Local selection, disclosure, pending state, and DOM behavior can
remain small browser concerns while durable state stays on the server.

Do not choose an SPA as a default project shape. If client routing is justified,
continue loading server-rendered route fragments while the server can own the
model. Move the model into the browser only when complex offline, editing,
cross-screen, or long-lived workspace behavior requires independent client
ownership.

When that move happens, the browser becomes responsible for model consistency
and view compilation. If compile-time checks between that model and its DOM are
valuable, the module can use optional typed programmatic views. HTML templates
remain supported.

The same threshold changes server communication. Server-owned pages should use
normal HTTP navigation, forms, and rendered fragments. A browser-owned model
needs REST contracts, explicit cache ownership and invalidation, and a complete
browser security policy. Introduce those systems together with frontend model
ownership, not before it.

## Mix architectures by module

Do not force one rendering architecture across the product. Use separate modules
or `ng-app` roots for areas with different ownership needs.

A sign-in module can remain a server-rendered HTML form. After authentication, a
dashboard module can bootstrap a client router, keep a complex model in the
browser, and use REST and caching. It can independently choose HTML or typed
programmatic views. Public pages, reports, and account recovery can continue
using server rendering and normal navigation.

Keep shared concerns on the server: session identity, authorization, domain
rules, and durable state. Share frontend services only when two client-owned
modules genuinely need the same browser resource or model.

## Start from ownership, not file types

A component owns DOM-facing state and its view lifetime. A model owns shared
reactive domain state. A service owns an operation or external resource. A
module records how those pieces are assembled.

Use one feature directory until a capability is independently reusable:

```text
tasks/
  task-module.ts
  task-list.ts
  task-repository.ts
  task-list.test.ts
```

Avoid global `controllers/`, `services/`, and `views/` directories once features
evolve independently; they scatter one change across the repository.

## Register one feature module

```ts
import { angular } from '@angular-wave/angular.ts';

export class TaskRepository {
  async list() {
    const response = await fetch('/api/tasks');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
}

export const tasks = angular
  .createModule('tasks', [])
  .service('taskRepository', TaskRepository);
```

Keep registration free of request execution and DOM access. Registration
describes recipes; runtime methods perform work.

## Keep view state local

A task-list controller may own `loading`, `error`, selection, and filter text.
Move task data to a named model only when multiple component roots need reactive
access to the same records. Move loading into a repository only when the
repository intentionally deduplicates or caches requests.

Do not introduce “manager” or “facade” layers without a lifetime or policy they
own. A forwarding class adds indirection but no boundary.

## Verify the structure

A feature passes the ownership test when its component can be destroyed without
leaking resources, its domain logic can be tested without a DOM, and its
repository can be replaced in a test without changing view code.
