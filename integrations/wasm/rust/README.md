# AngularTS Rust/Wasm Integration

This directory contains the initial Rust/Wasm authoring target for AngularTS.
The direction is Rust-authored AngularTS applications with no handwritten
JavaScript: Rust code declares modules, services, and components, while
generated glue initializes Wasm and registers the AngularTS runtime objects.

The integration is strict by default:

- AngularTS dependency names are represented as typed Rust tokens where
  possible.
- Rust facade APIs should reject unsupported component, injection, and boundary
  shapes at compile time once the procedural macros are implemented.
- Raw JavaScript interop is isolated behind explicit unsafe APIs.
- Public API coverage is tracked against the published AngularTS `ng`
  namespace in [NG_NAMESPACE_PARITY.md](NG_NAMESPACE_PARITY.md).
- The guest exports `ng_abi_version` so incompatible host and facade builds
  fail before scope binding.

This package is an active implementation. The current crates compile and
establish the workspace, public facade shape, strict metadata-generating macros,
generated-bootstrap command, parity check, `wasm-bindgen` bridge generation, and
browser-tested example apps. The covered Rust facade set now includes core
module/component/service authoring, scope and Wasm ABI types, `$http`,
template/cache, storage/cookie, diagnostics/event bus, router/state, realtime
WebSocket/SSE, core `$rest` resource APIs, and `$machine` state-machine
facades. `$worker` exposes managed `WorkerHandle` lifecycle, correlated JSON
requests, model synchronization channels, typed restart configuration, and
native message/error subscriptions for browser Wasm applications.

## Scope ABI And App Models

Rust `WasmScope` is for component/controller/view-scope work. It should remain
the boundary for Rust-authored AngularTS components that read and write
template-visible scope state.

Generated contracts carry Rust value types with their paths. Normal
application code does not pass path strings or `JsValue` through the scope API:

```rust
mod player {
    include!("../../contracts/generated/player_contract.rs");
}

let health = scope.get(player::HEALTH)?;
scope.set(player::NAME, "Ada".to_string())?;
scope
    .update()
    .set(player::POSITION_X, 12.5)?
    .set(player::POSITION_Y, 8.0)?
    .origin("physics")
    .commit()?;
```

Resolve named scopes with `WasmScope::resolve(...)`. Resolution fails
immediately with `WasmError` instead of creating a wrapper around handle `0`.

`get`, `set`, `delete`, binary operations, transactions, and watch
registration return `Result` rather than dropping ABI errors. Observers decode
host values against the generated field type and retain transaction metadata:

```rust
let health_watch = scope.observe_with(
    player::HEALTH,
    angular_ts::WatchOptions::new().with_initial(true),
    |update| match update {
        Ok(update) => log_health(update.value(), update.origin()),
        Err(error) => report_contract_error(error),
    },
)?;
```

Keep the returned `Watch` alive while updates are needed. It unregisters its
host watch and Rust callback when dropped, and multiple observers may watch the
same scope path independently. For component-prefixed scopes, `ScopeUpdate`
reports the local generated path (`health`) rather than the host-qualified path
(`ctrl.health`).

App-owned state now belongs to AngularTS models. When Rust or another Wasm
runtime needs durable or shared app state, keep the model boundary in host-side
AngularTS JavaScript:

```js
app.model("session", () => ({ count: 0 }));

app.controller("SessionCtrl", class {
  static $inject = ["session", "rustRuntimeSync", "$scope"];

  constructor(session, rustRuntimeSync, $scope) {
    this.session = session;
    const stopSync = session.$sync(rustRuntimeSync);

    $scope.$on("$destroy", stopSync);
  }
});
```

The Rust facade should not add model handles or model watch imports to the raw
Wasm ABI yet. Use `WasmScope` for view scopes; use `app.model(...)` plus
`$sync()` targets for app state that must survive root destruction, coordinate
multiple roots, or synchronize with storage, workers, engines, machines,
workflows, or network services.

The bridge still requires Rust-side `#[wasm_bridge]` annotations for
Wasm-visible controllers, service wrappers, values, and boundary types. The
current target is eliminating raw `#[wasm_bindgen]` application authoring,
manifest export strings, handwritten JavaScript entrypoints, and repetitive
scope synchronization code, while keeping explicit Rust annotations at the
Wasm boundary.

## Local Checks

```sh
make check
make test
```

Run only the namespace parity check:

```sh
make parity
```

Generate the bootstrap file:

```sh
make build-tool
```

Build the Rust todo demo, including the Wasm package and bootstrap file:

```sh
make example-build
```

## Intended Authoring Model

```rust
use angular_ts::{angular_module, component, service, NgModule};

#[service]
pub struct TodoStore;

#[component(selector = "todo-list", template_url = "templates/todo-list.html")]
pub struct TodoList;

#[angular_module(name = "demo")]
pub fn app(module: &mut NgModule) {
    module.service::<TodoStore>();
    module.component::<TodoList>();
}
```

`#[service]` generates a typed service token name, `#[component]` generates
component metadata, and `#[angular_module]` generates a typed module collector
for future build metadata. Registering unannotated services or components is a
compile-time error.

Component fields can declare AngularTS injection metadata:

```rust
#[component(selector = "todo-list", template_url = "templates/todo-list.html")]
pub struct TodoList {
    #[inject(token = "todoStore")]
    store: Option<TodoStore>,
}
```

The component macro records the field name, AngularTS token, and Rust field type
in `ComponentController::METADATA`.

## Bootstrap Manifest

The build helper can generate a concrete AngularTS bootstrap file from a JSON
manifest:

```json
{
  "module": "rustDemo",
  "package": "./pkg/angular_ts_rust_basic_app.js",
  "requires": [],
  "bootstrap": true,
  "registrations": [
    {
      "kind": "factory",
      "name": "todoStore",
      "export": "__ng_service_TodoStore"
    },
    {
      "kind": "component",
      "name": "todo-list",
      "export": "__ng_component_TodoList",
      "templateUrl": "templates/todo-list.html",
      "controllerAs": "$ctrl",
      "inject": ["todoStore"]
    }
  ]
}
```

Rust services currently register through AngularTS `factory(...)` semantics in
generated bootstrap code. That matches the expected Wasm export shape: a
function that returns a JS-visible Rust service wrapper.

Component registrations generate the AngularTS component config object in the
bootstrap file. The Rust export is treated as the controller constructor, and
manifest `inject` entries are assigned to `controller.$inject` before
registration.

Run:

```sh
angular-ts-rs build --manifest examples/basic_app/angular-ts.json
```

Generated JavaScript imports AngularTS, initializes the `wasm-bindgen` package,
registers the Rust-authored module, and calls `angular.bootstrap(...)` when the
manifest enables bootstrap. That JavaScript is a build artifact, not
application source.
