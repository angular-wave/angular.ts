---
title: Find an advanced browser recipe
description:
  Use effects, viewport events, streams, workers, WebAssembly, and specialized
  UI
weight: 89
---

## React to browser and scope changes

| Problem                         | Recipe                                                                    |
| ------------------------------- | ------------------------------------------------------------------------- |
| Run cleanup-aware reactions     | [Use effects]({{< relref "/docs/cookbook/effects" >}})                    |
| Handle browser and scope events | [Handle events]({{< relref "/docs/cookbook/event-handling" >}})           |
| React to element visibility     | [Observe the viewport]({{< relref "/docs/cookbook/advanced-viewport" >}}) |
| Stream server updates           | [Use server-sent events]({{< relref "/docs/cookbook/advanced-sse" >}})    |
| Send and receive live messages  | [Use WebSocket]({{< relref "/docs/cookbook/advanced-websocket" >}})       |

## Add specialized execution

| Problem                              | Recipe                                                                                |
| ------------------------------------ | ------------------------------------------------------------------------------------- |
| Move computation off the main thread | [Use a worker]({{< relref "/docs/cookbook/advanced-worker" >}})                       |
| Call measured native computation     | [Use WebAssembly]({{< relref "/docs/cookbook/advanced-wasm" >}})                      |
| Remove unused framework code         | [Build a smaller runtime]({{< relref "/docs/cookbook/optimized-runtime-build" >}})    |
| Cancel a large upload                | [Control an upload]({{< relref "/docs/cookbook/upload-cancel" >}})                    |
| Call an API on another origin        | [Configure cross-origin access]({{< relref "/docs/cookbook/cross-origin-request" >}}) |

## Build specialized interaction

| Problem                           | Recipe                                                                      |
| --------------------------------- | --------------------------------------------------------------------------- |
| Append results near the viewport  | [Build infinite scrolling]({{< relref "/docs/cookbook/infinite-scroll" >}}) |
| Update before the server responds | [Use optimistic updates]({{< relref "/docs/cookbook/optimistic-update" >}}) |
| Load a modal from the server      | [Open a server dialog]({{< relref "/docs/cookbook/server-dialog" >}})       |
| Render sanitized authored content | [Handle rich text]({{< relref "/docs/cookbook/rich-text" >}})               |

## Integrate another framework

| Problem                               | Recipe                                                                            |
| ------------------------------------- | --------------------------------------------------------------------------------- |
| Choose an integration boundary        | [Choose a bridge]({{< relref "/docs/cookbook/framework-integration" >}})          |
| Publish transient cross-root messages | [Use the event bus]({{< relref "/docs/cookbook/framework-event-bus" >}})          |
| Read reflected web-component state    | [Observe Fluent UI attributes]({{< relref "/docs/cookbook/framework-observe" >}}) |
| Share current reactive state          | [Use an application model]({{< relref "/docs/cookbook/framework-model" >}})       |
