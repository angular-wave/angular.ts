---
title: $eventBusProvider
description: >
  Configuration provider for `$eventBus` service.
---

### Description

Instance of [PubSubProvider](../../../typedoc/classes/PubSubProvider.html) for
configuring the `$eventBus` service. The default implementation returns the
global [angular.EventBus](../../../typedoc/classes/Angular.html#eventbus) instance, which is an async instance of
[PubSub](../../../typedoc/classes/PubSub.html) class.

### Properties

---

#### $eventBusProvider.eventBus

Customize event bus instance.

- **Type:** [PubSub](../../../typedoc/classes/PubSub.html)
- **Default:** `angular.EventBus`

- **Example:**

  ```js
  angular.module('demo', [])
    .config([
      "$eventBusProvider",
      /** @param {ng.PubSubProvider} $eventBusProvider */
      ($eventBusProvider) => {
        eventBusProvider.eventBus = new MyCustomPubsub();
      }
    ]);
  ```

---

For service description, see [$eventBus](../../../docs/service/eventbus).
