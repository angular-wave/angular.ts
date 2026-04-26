---
title: "$eventBusProvider"
description: "Configure the application-wide $eventBus service."
---

`$eventBusProvider` creates the injectable `$eventBus` singleton and exposes the
same instance through the global Angular service for integrations outside
dependency injection.

Exact signatures live in TypeDoc:

- [`PubSubProvider`](../../../typedoc/classes/PubSubProvider.html)
- [`PubSub`](../../../typedoc/classes/PubSub.html)

## Replace The Bus

```js
angular.module("demo", []).config(($eventBusProvider) => {
  $eventBusProvider.eventBus = new MyCustomPubSub();
});
```

Most applications should use the default `PubSub` instance. Replace it only when
you need custom dispatch, instrumentation, or compatibility with another event
system.

For service usage, see [$eventBus]({{< relref "/docs/service/eventBus" >}}).
