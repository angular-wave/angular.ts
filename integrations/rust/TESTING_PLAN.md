# AngularTS Rust Bridge Testing Plan

## Goal

Test the Rust/Wasm-to-AngularTS boundary for every AngularTS feature the Rust
integration claims to support.

The bridge test suite should prove that Rust-authored modules, services,
controllers, components, and generated JavaScript glue interact correctly with
the AngularTS runtime. It should not duplicate the full AngularTS core test
suite.

## Testing Boundary

### Bridge Tests Must Cover

- Rust macro metadata generation.
- Generated bootstrap output.
- Wasm package exports expected by the bootstrap manifest.
- AngularTS DI registration from generated glue.
- Rust service/factory/value exposure.
- Rust component controller construction.
- Controller dependency injection.
- Controller state synchronization into JS-owned AngularTS-visible properties.
- Template interaction through supported AngularTS directives.
- Rust errors crossing into AngularTS error handling.
- Controller/service teardown once lifecycle support exists.

### Bridge Tests Should Not Duplicate

- AngularTS parser correctness.
- AngularTS injector internals.
- Full `ngRepeat` implementation behavior.
- Full `ngModel` validation behavior.
- Router internals.
- HTTP implementation internals.
- Animation engine internals.
- Directive compiler internals.

Those are AngularTS runtime responsibilities. Rust bridge tests should only
verify that the Rust integration can use those surfaces correctly.

## Required Browser-First Policy

Every supported Rust bridge feature must have a browser test with Playwright.
Rust unit tests, macro compile tests, and bootstrap snapshot tests are useful,
but they do not prove that the bridge works inside AngularTS. They are
supporting checks only.

The minimum acceptance test for a bridge feature is:

1. Build the Rust example to Wasm.
2. Generate the AngularTS bootstrap file.
3. Load the example in a real browser with Playwright.
4. Assert DOM behavior.
5. Fail on page errors or unexpected console errors.

## Test Layers

### 1. Rust Unit Tests

Location:

```text
integrations/rust/crates/*/src
integrations/rust/examples/*/src
```

Coverage:

- Pure Rust domain logic.
- Facade metadata structs.
- `NgModule` registration metadata.
- Token names and export names.
- Manifest-independent behavior.

Current example:

- `TodoStore` initial state.
- Add todo.
- Ignore empty todo.
- Mark todo done.
- Archive completed todos.

### 2. Macro Compile Tests

Location:

```text
integrations/rust/crates/angular-ts-macros/tests/
  compile_pass/
  compile_fail/
```

Use `trybuild` once macro behavior becomes strict enough to justify the
dependency.

Pass cases:

- `#[service]` on public structs.
- `#[component]` with inline template.
- `#[component]` with template URL.
- `#[component]` with named `#[inject(token = "...")]` fields.
- `#[angular_module(name = "...")]` on public module functions.

Fail cases:

- Private `#[service]`.
- Private `#[component]`.
- Component with both `template` and `template_url`.
- Component with neither `template` nor `template_url`.
- Unknown macro arguments.
- `#[inject]` on tuple fields.
- Registering unannotated service/component types.
- Unsupported Rust field types at the JS boundary once type checks exist.

### 3. Manifest And Bootstrap Tests

Location:

```text
integrations/rust/crates/angular-ts-build/src
integrations/rust/crates/angular-ts-build/tests
```

Coverage:

- Manifest parsing.
- `templatePath` resolution.
- Rejection of conflicting `template`, `templateUrl`, and `templatePath`.
- Generated `angular.module(name, requires)`.
- Generated `module.factory(...)` for Rust services.
- Generated `module.component(...)` for Rust components.
- Generated controller wrapper with `$inject`.
- Generated state synchronization wrapper.
- Correct escaping for template strings, token names, export names, and module
  names.

### 4. Wasm Build Tests

Location:

```text
integrations/rust/examples/*/
```

Coverage:

- `cargo check --target wasm32-unknown-unknown`.
- `cargo build --target wasm32-unknown-unknown`.
- `wasm-bindgen --target web`.
- Presence of expected JS exports:
  - service exports such as `__ng_service_TodoStore`;
  - component controller exports such as `__ng_component_TodoList`.
- Generated package files are loadable as browser ESM.

Make targets:

```sh
make wasm-check
make example-build
```

### 5. Browser Bridge Tests

Location:

```text
integrations/rust/tests/
```

Use Playwright from the repository toolchain. This is the authoritative test
layer for bridge behavior.

Each test should load a small Rust-authored example app and assert one bridge
contract. Keep each app minimal and focused.

Initial required browser tests:

- `todo_basic.spec.ts`
  - initial Rust todos render;
  - `ng-submit` calls Rust controller method;
  - added todo appears in `ngRepeat`;
  - checkbox `ng-change` calls Rust controller method;
  - archive removes completed todos.

- `component_state.spec.ts`
  - scalar controller property sync;
  - array property sync preserves JS array identity;
  - method calls refresh synced properties.

- `di.spec.ts`
  - Rust service factory registers through AngularTS DI;
  - component receives injected Rust service;
  - missing export fails with a clear bootstrap error.

- `template.spec.ts`
  - inline templates work;
  - `templatePath` becomes inline template at build time;
  - `templateUrl` remains a runtime AngularTS template URL.

Later browser tests:

- `model.spec.ts`
  - `ng-model` reads/writes Rust-visible JS properties.

- `lifecycle.spec.ts`
  - `$onInit` maps to Rust hook;
  - `$onDestroy` maps to Rust hook;
  - Wasm resources are released on component teardown.

- `errors.spec.ts`
  - Rust panic or returned error is surfaced through AngularTS
    `$exceptionHandler`.

- `async.spec.ts`
  - async Rust/Wasm methods update generated JS state;
  - AngularTS refresh happens at the right boundary.

## Feature Matrix

| AngularTS surface | Rust bridge status | Required bridge tests |
| --- | --- | --- |
| Module registration | started | Unit + bootstrap + browser |
| Service/factory DI | started | Unit + bootstrap + browser |
| Component registration | started | Unit + bootstrap + browser |
| Controller constructor injection | started | Browser |
| Controller method calls | started | Browser |
| JS-visible controller state | started | Browser |
| `ng-repeat` over Rust data | started | Browser |
| `ng-submit` | started | Browser |
| `ng-click` | started | Browser |
| `ng-change` | started | Browser |
| `ng-model` | started | Browser |
| Inline template | started | Bootstrap + browser |
| `templatePath` build-time inline | started | Bootstrap + browser |
| `templateUrl` runtime loading | planned | Bootstrap + browser |
| Lifecycle hooks | planned | Macro + browser |
| Component bindings | planned | Macro + browser |
| Directives | deferred | Macro + browser |
| Router | deferred | Browser only for bridge contract |
| HTTP facade | deferred | Rust facade + browser |
| Error handling | planned | Browser |
| Teardown/free | planned | Browser |

## Required Commands

The Rust integration should eventually provide one command for all local checks:

```sh
make check
```

Short term:

```sh
make parity
cargo fmt --check
cargo test --workspace
make wasm-check
make example-build
make browser-test
```

Future:

```sh
make check
```

`make check` should eventually include:

- namespace parity;
- formatting;
- Rust unit tests;
- macro compile tests;
- wasm target check;
- example build;
- browser bridge tests.

Until browser tests are included in `make check`, Rust bridge changes must run
`make browser-test` explicitly.

## Browser Test Principles

- Test one bridge contract per test.
- Prefer tiny Rust examples over one large omnibus app.
- Use the todo app only as an end-to-end smoke test.
- Assert DOM behavior and absence of page errors.
- Capture console errors during every Playwright test.
- Avoid testing AngularTS internals directly.
- When a failure could be either AngularTS core or bridge behavior, first add a
  minimal TypeScript AngularTS reproduction. If TypeScript passes and Rust
  fails, the bridge owns the bug.

## CI Plan

Phase 1:

- Run `make -C integrations/rust check`.
- Run `make -C integrations/rust example-build`.
- Run `make -C integrations/rust browser-test`.

Phase 2:

- Include browser tests in Rust integration CI.

Phase 3:

- Add macro compile-fail tests.
- Add browser examples for lifecycle, model, template URL, and errors.

Phase 4:

- Require every non-deferred Rust parity item in `NG_NAMESPACE_PARITY.md` to map
  to at least one Rust unit, macro, bootstrap, wasm, or browser bridge test.

## Open Questions

- Should bridge browser tests live under `integrations/rust/tests` or the root
  Playwright suite?
- Should every browser bridge fixture be a separate Rust crate, or should one
  fixture crate expose multiple modules?
- Should generated manifest files be authored by hand for now, or generated
  from Rust macro metadata before browser tests expand?
- Should test builds use debug Wasm for iteration and release Wasm in CI?
- How should Rust panics be normalized before forwarding to AngularTS
  `$exceptionHandler`?
