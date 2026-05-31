# Machine Production Readiness Roadmap

Goal: make `$machine` safe to publish as a stable public primitive, not just an
experimental service. The plan is executable as staged checkpoints. Complete one
slice at a time, run that slice's gates, then run the final gates before marking
the feature production-ready.

## Working Rules

- [x] Keep `$machine` independent from any one scope lifetime. Scope proxies may
      observe a machine, but destroying one scope must not destroy the machine or
      stop remaining observers.
- [x] Preserve the public terminology: `current` is the current mode, `data` is
      extended reactive machine data.
- [x] Do not add rollback semantics. If transition or hook code mutates data and
      then throws, those mutations remain.
- [x] Keep transition dispatch synchronous. Promise-returning transition work is
      user code outside the v1 contract.
- [x] Every documentation example must have a matching runtime or type test.
- [x] Update namespace and integration parity whenever a public machine type or
      API changes.

## Baseline

- [x] Capture the current machine implementation and public surfaces.

  ```sh
  rg -n "Machine|\\$machine|module\\.machine|snapshot\\(|restore\\(" \
    src/services/machine src/core/di/ng-module src/index.ts src/namespace.ts \
    test/namespace-js-consumer.js integrations docs/content/docs/service/machine.md
  ```

- [x] Run the current focused and full gates before changing behavior.

  ```sh
  npx playwright test src/services/machine/machine.test.ts
  make check
  git diff --check
  ```

## Slice 1: Hook Failure Must Still Notify Observers

Problem: `send()` updates `current` before enter/transition hooks finish, but
observer scheduling currently happens after hooks. If a hook throws, a bound
template can miss the changed mode or data.

- [x] Add a failing test where an enter hook throws after a transition changes
      mode, then assert the bound DOM still updates after the error is caught.
- [x] Add the same case for the global `hooks.transition` callback.
- [x] Ensure `send()` schedules all active machine bindings from a `finally`
      block after a transition handler exists and starts running.
- [x] Preserve the existing contract: the original error is rethrown and partial
      mutations remain visible.
- [x] Verify nested transition hooks still preserve the documented ordering.

Gate:

```sh
npx playwright test src/services/machine/machine.test.ts
./node_modules/.bin/tsc --project tsconfig.test.json
```

## Slice 2: Snapshot Contract

Problem: `snapshot()` uses `structuredClone`, while the docs currently imply a
generic serializable payload. Maps, Sets, cycles, Dates, and typed arrays can be
cloned but are not plain JSON snapshots.

- [x] Document the exact v1 contract: `snapshot()` returns a structured clone of
      `{ current, data }`.
- [x] Document that JSON persistence requires JSON-compatible `data`, or a user
      encode/decode layer.
- [x] Add tests for representative cloneable data: `Date`, `Map`, `Set`, nested
      arrays, and cyclic references.
- [x] Add tests for non-cloneable data, such as functions in `data`, proving the
      native `DataCloneError` behavior is surfaced rather than swallowed.
- [x] Update the tic tac toe persistence example to stay explicitly
      JSON-compatible.

Gate:

```sh
npx playwright test src/services/machine/machine.test.ts
make check
```

## Slice 3: Type Coverage Without `ts-nocheck`

Problem: `machine.spec.ts` is runtime-heavy and currently starts with
`// @ts-nocheck`, so public TypeScript ergonomics are not fully protected.

- [x] Split untyped runtime-only setup helpers from type-sensitive examples.
- [x] Keep unavoidable dynamic runtime tests isolated from type-sensitive
      coverage.
- [x] Add a compile-only type test proving typed `MachineConfig<TData>`,
      `Machine<TData>`, `MachineSnapshot<TData>`, transition payloads, and hooks
      are usable from TypeScript.
- [x] Add or extend the JavaScript namespace consumer test for
      `ng.MachineService`, `ng.Machine`, `ng.MachineConfig`, hooks, snapshots,
      and `module.machine()`.
- [x] Confirm JSDoc users do not see `unknown` for the main namespaced machine
      types.

  Runtime-heavy browser coverage remains in `machine.spec.ts`, which is
  intentionally isolated with `// @ts-nocheck` because it exercises dynamic DOM,
  scope, and invalid JavaScript caller shapes. Public type ergonomics are covered
  separately in `machine-types.spec.ts` and `test/namespace-js-consumer.js`.

Gate:

```sh
./node_modules/.bin/tsc --noEmit --project tsconfig.json
./node_modules/.bin/tsc --project tsconfig.test.json
make test-namespace-js
```

## Slice 4: Integration Parity

Problem: some integrations still mark machine namespace types as inventory,
review, started, or deferred. The public JS/TS namespace must not outrun the
integration parity trackers.

- [x] Regenerate Closure externs and ClojureScript surfaces.
- [x] Regenerate Dart facades and update Dart parity status.
- [x] Regenerate Kotlin facades and update Kotlin parity status.
- [x] Decide whether Gleam should expose safe machine wrappers or only raw
      namespace inventory for v1, then update parity accordingly.
- [x] Decide whether Wasm integrations expose machine facades now or explicitly
      document machine as unsupported for v1.
- [x] Update Rust and Go Wasm parity files so every machine type is either
      supported with tests or intentionally unsupported with rationale.

Gate:

```sh
make -C integrations/closure closure-generate
make -C integrations/closure closure-validate
make -C integrations/dart generate
make -C integrations/dart generate-check
make -C integrations/kotlin generate
make -C integrations/kotlin generate-check
make -C integrations/gleam check
make -C integrations/wasm/rust check
make -C integrations/wasm/go check
```

## Slice 5: Typed Transition Maps

Problem: `MachineTransitionMap<TData>` is intentionally loose today. That is
acceptable for early runtime validation, but it does not yet match AngularTS's
typesafe direction.

- [x] Introduce an optional typed event map without breaking the current simple
      API. For example:

  ```ts
  type Events = {
    move: { index: number };
    reset: undefined;
  };
  ```

- [x] Make TypeScript machine definitions strict by default; use
      `MachineEventMap` only for intentionally dynamic event names.
- [x] Add tests proving typed payloads reach transition handlers and invalid
      payloads fail at compile time.
- [x] Keep `send(type, payload)` returning `true` when a handler exists and ran,
      including same-mode transitions.
- [x] Update namespace types and integration generators for any new generic
      shape.

Gate:

```sh
./node_modules/.bin/tsc --noEmit --project tsconfig.json
./node_modules/.bin/tsc --project tsconfig.test.json
npx playwright test src/services/machine/machine.test.ts
make check
```

## Final Production Gate

- [x] Run the complete repository checks.

  ```sh
  make check
  make build
  git diff --check
  ```

- [x] Run integration gates for all integrations whose generated or handwritten
      surfaces changed.
- [x] Confirm every user-facing `$machine` documentation example is verified by
      a test.
- [x] Confirm generated namespace declarations contain no `unknown` placeholder
      for public machine names where a precise type is expected.
- [x] Confirm public docs state the v1 non-goals: no async batching, no rollback,
      no resource cleanup lifecycle, and no implicit persistence.

Production-ready means all final gates pass and every unchecked item above is
either completed or explicitly moved to a post-v1 roadmap with a rationale.
