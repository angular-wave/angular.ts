---
title: Load a WebAssembly module
description: Expose WebAssembly exports to scope with ng-wasm
weight: 21
---

## Problem

A calculation already exists as WebAssembly and the page needs to call its
exports without writing module-loading lifecycle code.

## Before you start

Have a deployed WebAssembly module and know its exported function contract. The
server must send the correct MIME type.

## Recipe

Load the module with `ng-wasm` and name its scope resource with `as`:

<!-- tested-by: src/directive/wasm/wasm.spec.ts -->

```html
<div ng-wasm src="/wasm/shipping.wasm" as="shipping"></div>

<p ng-if="shipping.status === 'loading'">Loading shipping calculator...</p>
<p ng-if="shipping.status === 'error'">Shipping estimate is unavailable.</p>
<p ng-if="shipping.status === 'ready'">
  Shipping: {{ shipping.exports.quote(cart.weightGrams, destination.zone) }}
  cents
</p>
```

AngularTS exposes a
[`WasmResource`](../../../typedoc/interfaces/WasmResource.html) as `shipping`.
Check `status` before calling the pricing export. The cart and destination stay
in normal reactive scope state.

The server must serve the module with the correct WebAssembly MIME type. The
directive owns loading and releases its resource when the scope is destroyed.

Keep DOM work in AngularTS. Use WebAssembly for compute-heavy functions with a
small, explicit input and output contract.

## Failure path

Module loading, memory copies, and MIME failures can erase compute gains. Keep a
JavaScript or server fallback when the calculation is required.

## Apply it now

Choose WebAssembly only for an existing compute-heavy algorithm, not ordinary UI
arithmetic. Measure the JavaScript version, module startup, and data-transfer
cost with realistic inputs. Keep the module only when repeated calls recover its
loading cost and the input/output boundary stays small.

## Verify

Test loading, MIME failure, realistic calculations, repeated calls, and scope
removal. Confirm the measured gain exceeds module and transfer costs.
