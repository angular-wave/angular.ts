---
title: $eventBus
description: >
  Pubsub messaging service
---

### Description

A messaging service, backed by an instance of
[PubSub](../../../typedoc/classes/PubSub.html). This implementation is based on
the original
[Google Closure PubSub](https://google.github.io/closure-library/api/goog.pubsub.PubSub.html)
but uses
[`queueMicrotask`](https://developer.mozilla.org/en-US/docs/Web/API/Window/queueMicrotask)
instead of
[`Window.setTimeout()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout)
for its async implementation.

`$eventBus` allows communication between an
Angular application instance and the outside context, which can be a different
module, a non-Angular application, a third-party party library, or even a WASM
application. Additionally, `$eventBus` can be used to communicate directly with
a template, using [`ng-channel`](../../../docs/directive/channel) directive.

`$eventBus` should not be used for communicating between Angular's own
primitives.

- **For sharing application state**: use custom Services and Factories that
  encapsulate your business logic and manage your model.
- **For intercomponent communication**: use `$scope.$on()`, `$scope.$emit()`,
  and `$scope.$broadcast()` methods.

The example below demonstrates communication between the global `window` context
and a controller. **Note**: Ensure topic clean-up after the `$scope` is
destroyed

#### Example

{{< showhtml src="examples/eventbus/eventbus.html" >}}

{{< showjs src="examples/eventbus/eventbus.js" >}}

---

#### Demo

{{< showraw src="examples/eventbus/eventbus.html" >}}

<script>
{{< showraw src="examples/eventbus/eventbus.js" >}}
</script>

---

For detailed method description, see
[PubSub](../../../typedoc/classes/PubSub.html)

---
