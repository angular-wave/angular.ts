---
title: HTTP, SSE, WebSocket, or WebTransport
description:
  Select a network transport from the communication pattern and fallback
  requirements.
weight: 30
---

## Default

Use HTTP for request-response work.

- Use SSE for server-to-client events with straightforward reconnect behavior.
- Use WebSocket for broadly supported bidirectional messages.
- Use WebTransport when independent streams or datagrams are required and the
  support contract permits it.

Decide from direction, ordering, reliability, backpressure, authentication,
proxy support, observability, and fallback behavior. Hide transport details
behind an application service.
