# Language-Neutral ABI for WasmScope

## Scope

Define the shared ABI boundary for host <-> runtime scope interaction that is reused by
all Wasm-backed language targets (currently Rust).

`WasmScope` will be the runtime boundary type. It is the API through which AngularTS
scope lifecycles, protocol frames, and host callbacks are connected.

## Contract goals

1. Keep the contract explicit and stable:
   - Stable scope binding identifier.
   - Structured scope command/event payloads.
   - Deterministic lifecycle: `bind` -> active usage -> `unbind`.

2. Keep memory handling deterministic:
   - Clear allocation and release path for any host-owned payload buffers.
   - No shared mutable global state outside explicit handle ownership.

3. Keep semantics simple:
   - Scope operations are message-driven and do not require full scope rehydration.
   - Scope operations execute on explicit lifecycle and are isolated by binding.
   - Command calls are correlated with request IDs and explicit success/error outcomes.

4. Keep runtime adaptation flexible:
   - The ABI stays in `integrations/wasm`.
   - Scope synchronization remains transport-generic.
   - Runtime glue maps protocol messages to this ABI and keeps AngularTS ownership in scope
     services.

## Implementation phases

### Phase A — Type and lifecycle
- Introduce `WasmScope` as the boundary type and handle shape.
- Add handle lifecycle (`bind`, `unbind`, active state inspection).
- Add strict typing for command/event payload acceptance and scope identity.

### Phase B — Host bridge mapping
- Add a host-side shim that maps `src/services/scope-sync` envelopes into ABI calls.
- Keep protocol typing and validation in one place in scope sync and avoid embedding
  transport-specific concerns there.

### Phase C — Allocation policy
- Add deterministic allocation hooks with explicit cleanup expectations.
- Add host-side tests for allocation/freeing behavior.

### Phase D — Validation
- Add end-to-end smoke test from browser host to Rust target and back.
- Add regression checks for teardown leaks and command error propagation.
- Add diagnostics for missing/unexpected host callbacks.

## Done criteria

- `WasmScope` exists as the runtime boundary type.
- Scope lifecycle operations are explicit and test-covered.
- Rust demo can call into and receive updates from AngularTS through the boundary.
- Scope sync service remains transport-focused and does not mention language-specific ABI details.
