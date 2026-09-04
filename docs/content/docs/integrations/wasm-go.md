---
title: 'Go WebAssembly'
weight: 140
description:
  'Connect Go domain logic to an AngularTS scope with a js/wasm guest.'
---

AngularTS owns the page while Go handles domain logic in a Wasm module.

## Add the binding

The binding is distributed as source. Point `go.mod` at
`integrations/wasm/go`, generate the application's AngularTS metadata, compile
for `js/wasm`, and place Go's `wasm_exec.js` beside the output.

```bash
go generate ./...
GOOS=js GOARCH=wasm go build -o main.wasm .
cp "$(go env GOROOT)/misc/wasm/wasm_exec.js" .
```

Load the generated AngularTS bootstrap module from the page.

## Guidance

- Keep callback wrappers reachable while AngularTS owns them.
- Release watches when their scope is destroyed.
- Batch related scope updates.
- Keep durable shared state in AngularTS models.

## Complete example

Use `integrations/wasm/go/examples/basic_app`, or browse all [integration
examples](../examples/).
