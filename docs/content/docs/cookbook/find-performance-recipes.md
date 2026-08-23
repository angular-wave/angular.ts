---
title: Find a performance recipe
description:
  Reduce requests, rendering, transfer, and main-thread work after measuring
weight: 85
---

## Reduce network work

| Problem                             | Recipe                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------ |
| Avoid repeated unchanged reads      | [Cache reference data]({{< relref "/docs/cookbook/cached-reference-data" >}})        |
| Use HTTP validators                 | [Revalidate with ETag]({{< relref "/docs/cookbook/conditional-cache" >}})            |
| Delay, throttle, or cancel requests | [Control repeated requests]({{< relref "/docs/cookbook/control-repeat-requests" >}}) |
| Prefetch before a click             | [Prefetch a result]({{< relref "/docs/cookbook/server-data" >}})                     |

## Reduce rendering work

| Problem                     | Recipe                                                                        |
| --------------------------- | ----------------------------------------------------------------------------- |
| Page a large collection     | [Paginate on the server]({{< relref "/docs/cookbook/server-pagination" >}})   |
| Load more near the viewport | [Build infinite scrolling]({{< relref "/docs/cookbook/infinite-scroll" >}})   |
| React to visibility         | [Use viewport observation]({{< relref "/docs/cookbook/advanced-viewport" >}}) |
| Keep simple reference data  | [Use caching]({{< relref "/docs/cookbook/caching" >}})                        |

## Move specialized work

| Problem                                | Recipe                                                                 |
| -------------------------------------- | ---------------------------------------------------------------------- |
| Receive incremental server changes     | [Use server-sent events]({{< relref "/docs/cookbook/advanced-sse" >}}) |
| Move CPU work off the main thread      | [Use a worker]({{< relref "/docs/cookbook/advanced-worker" >}})        |
| Run measured native computation        | [Use WebAssembly]({{< relref "/docs/cookbook/advanced-wasm" >}})       |
| Move slow server work out of a request | [Run a background job]({{< relref "/docs/cookbook/background-job" >}}) |

## Reduce shipped JavaScript

| Problem                                       | Recipe                                                                                        |
| --------------------------------------------- | --------------------------------------------------------------------------------------------- |
| The measured runtime contains unused features | [Build a smaller production runtime]({{< relref "/docs/cookbook/optimized-runtime-build" >}}) |
