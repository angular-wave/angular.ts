---
title: 'Go WebAssembly'
weight: 140
description:
  'Generate Go scope contracts, compile a js/wasm guest, and connect it to an
  AngularTS application through the shared ABI.'
---

The Go integration provides typed access to the shared scope ABI. Go compiles
guest logic for `js/wasm`; JavaScript loads the module and owns AngularTS views.

## Set up an application

Start from `integrations/wasm/go/examples/basic_app`. Generate contracts, run Go
tests, compile for the browser target, and execute the browser workflow.

```bash
cd integrations/wasm/go
go generate ./examples/basic_app
go test ./...
GOOS=js GOARCH=wasm go build ./...
make browser-test
```

## Best practices

- Commit generated contracts and require generation checks in CI.
- Keep callbacks reachable for exactly as long as their host registration.
- Release watches and JavaScript callback wrappers when the scope is destroyed.
- Batch related scope writes and attach an origin when synchronization needs it.
- Keep durable shared state in AngularTS models.
- Resolve
  [ProgrammaticViewTags](../../../typedoc/types/ProgrammaticViewTags.html) with
  `Tags`, use named methods for fixed HTML elements, and reserve `Tag` for names
  selected at runtime.

## Executable evidence

The maintained example or acceptance test is
\`integrations/wasm/go/examples/basic_app\`. See
[Executable integration examples](../examples/) for the aggregate validation
workflow.
