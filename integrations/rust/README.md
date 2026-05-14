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

This package is an early implementation. The current crates compile and
establish the workspace, public facade shape, strict metadata-generating macros,
generated-bootstrap command, and parity check. The full `wasm-bindgen`
controller bridge is not implemented yet.

## Local Checks

```sh
make check
make test
```

Run only the namespace parity check:

```sh
make parity
```

Generate the placeholder bootstrap file:

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

Generated JavaScript will eventually import AngularTS, initialize the
`wasm-bindgen` package, register the Rust-authored module, and call
`angular.bootstrap(...)`. That JavaScript is a build artifact, not application
source.
