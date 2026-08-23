---
title: Observability
description:
  Correlate AngularTS navigation, requests, workflows, rendering outcomes, and
  unexpected failures without recording sensitive state.
weight: 105
---

Assign a stable operation name and correlation ID at the user-action or route
boundary. Record start, terminal outcome, duration, release, and route. Do not
log every reactive read or scope write; volume hides causality and changes
timing.

```js
performance.mark(`task-save:${id}:start`);
try {
  await repository.save(task);
  record({ operation: 'task.save', outcome: 'success', id });
} catch (error) {
  record({ operation: 'task.save', outcome: classify(error), id });
  throw error;
}
```

Expected domain and transport failures should produce classified outcomes.
Unexpected exceptions should reach `$exceptionHandler` with their cause. Redact
credentials, request bodies, user-entered text, and model snapshots.

Carry one correlation ID through route transition, request, retry, and workflow
command. Record cancellation separately from failure. For realtime connections,
record state transitions and reconnect exhaustion, not every message.

After deployment, verify release tagging, source-map policy, critical routes,
error rate, request latency, and one synthetic path. Every alert needs an owner
and actionable threshold.
