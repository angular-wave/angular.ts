# AngularTS Rust/Wasm Integration Plan

## Goal

Make AngularTS a first-class Rust/Wasm authoring target. Rust developers should
be able to write AngularTS applications without handwritten JavaScript, while
AngularTS remains the JavaScript runtime that owns templates, dependency
injection, scopes, directives, components, change detection, routing, and DOM
compilation.

The Rust integration should generate or ship the JavaScript glue required to
load Wasm and register AngularTS modules. Application authors write Rust,
templates, and Cargo configuration; they should not need to write JavaScript
entrypoints or AngularTS registration code by hand.

First-class support includes strict type coverage for every type made public
through the published AngularTS `ng` namespace. The parity source of truth is
the generated TypeScript declaration surface shipped by the npm package,
starting with `@types/namespace.d.ts`.

## Type Safety Principle

The Rust integration should be strict by default. Public Rust APIs should prefer
typed tokens, typed builders, traits, enums, explicit lifecycle traits, and
compile-time macro diagnostics over stringly typed maps, raw `JsValue`, or
unchecked runtime object construction.

Dynamic interop is allowed only as an explicit escape hatch for legacy
AngularJS-compatible behavior, unknown third-party services, or advanced
JavaScript interop. Escape hatches must be named clearly and isolated from the
normal authoring path.

Examples:

```rust
injector.get_untyped("legacyService");
scope.unsafe_set("legacyValue", value);
```

These APIs should never be required for ordinary Rust-authored AngularTS
components, services, or module registration.

## Published Namespace Parity

The Rust package must track the public AngularTS `ng` namespace, not an
informal subset of the runtime. Every public namespace type should have an
explicit Rust parity decision.

Parity statuses:

- `covered`: idiomatic Rust API exists and is tested;
- `started`: Rust API exists but lacks full behavior or test coverage;
- `alias`: Rust can use an existing platform or crate type directly;
- `unsafe`: supported only through an explicit unsafe interop boundary;
- `deferred`: intentionally postponed with a documented reason;
- `not-applicable`: not meaningful for Rust/Wasm authoring.

The repository should include a Rust parity checklist equivalent to the Dart
integration's namespace parity file:

```text
integrations/wasm/rust/NG_NAMESPACE_PARITY.md
```

New public `ng` namespace types must require a Rust parity decision in the same
change. The long-term check should compare the published TypeScript
declarations against the Rust parity file so drift cannot happen silently.

## Non-Goals

- Reimplementing the AngularTS runtime in Rust.
- Making AngularTS templates Rust syntax.
- Supporting every AngularTS dynamic API in the first release.
- Making Wasm initialization appear synchronous.
- Exposing raw JavaScript objects or unchecked `JsValue` as the default Rust
  API.

## Authoring Model

Rust owns application logic and controller state. AngularTS owns the browser
runtime and template lifecycle. Generated glue connects them through
`wasm-bindgen`.

Target Rust authoring style:

```rust
use angular_ts::*;

#[service]
pub struct TodoStore {
    todos: Vec<Todo>,
}

impl TodoStore {
    pub fn add(&mut self, title: String) {
        self.todos.push(Todo { title });
    }

    pub fn all(&self) -> Vec<Todo> {
        self.todos.clone()
    }
}

#[component(
    selector = "todo-list",
    template = r#"
      <section>
        <input ng-model="$ctrl.title">
        <button ng-click="$ctrl.add()">Add</button>
        <p ng-repeat="todo in $ctrl.todos">{{ todo.title }}</p>
      </section>
    "#
)]
pub struct TodoList {
    title: String,
    todos: Vec<Todo>,

    #[inject]
    store: TodoStore,
}

impl TodoList {
    #[on_init]
    pub fn init(&mut self) {
        self.todos = self.store.all();
    }

    pub fn add(&mut self) {
        self.store.add(self.title.clone());
        self.todos = self.store.all();
        self.title.clear();
    }
}

#[angular_module(name = "demo")]
pub fn app(module: &mut NgModule) {
    module.service::<TodoStore>();
    module.component::<TodoList>();
}
```

Generated output registers equivalent AngularTS module code:

```typescript
import angular from "@angular-wave/angular.ts";
import init, * as app from "./pkg/demo.js";

await init();

angular
  .module("demo")
  .service("todoStore", app.__ng_service_TodoStore)
  .component("todoList", app.__ng_component_TodoList());

angular.bootstrap(document.body, ["demo"]);
```

The generated JavaScript is a build artifact, not application source.

## Package Shape

```text
integrations/
  rust/
    PLAN.md
    README.md
    crates/
      angular-ts/
        Cargo.toml
        src/
          lib.rs
          component.rs
          injector.rs
          module.rs
          scope.rs
          token.rs
      angular-ts-macros/
        Cargo.toml
        src/
          lib.rs
      angular-ts-build/
        Cargo.toml
        src/
          main.rs
    examples/
      basic_app/
        Cargo.toml
        index.html
        src/
          lib.rs
        templates/
          todo-list.html
```

## Core Crates

### `angular-ts`

The public Rust facade used by application authors.

Initial surface:

- `NgModule`
- `Token<T>`
- `Injector`
- `Scope<TState>`
- `Component`
- `Service`
- typed lifecycle hook traits
- typed wrappers for selected AngularTS services
- explicit unsafe interop helpers
- namespace parity markers for public `ng` types

### `angular-ts-macros`

Procedural macros that collect metadata and generate wasm-bindgen exports.

Initial macros:

- `#[angular_module(name = "...")]`
- `#[component(selector = "...", template = "...")]`
- `#[component(selector = "...", template_url = "...")]`
- `#[service]`
- `#[inject]`
- `#[on_init]`
- `#[on_destroy]`

### `angular-ts-build`

Build helper that generates the browser entrypoint and coordinates Rust/Wasm
build output.

Initial commands:

```sh
angular-ts-rs build
angular-ts-rs serve
```

The build helper should run or wrap:

```sh
wasm-pack build --target web
vite build
```

## Generated Glue

The integration must generate JavaScript glue for:

- importing the AngularTS npm runtime;
- importing the wasm-bindgen generated package;
- awaiting Wasm initialization before AngularTS bootstrap;
- registering generated services, factories, controllers, and components;
- converting Rust component metadata into AngularTS config objects;
- exposing Rust controller wrappers as JS-visible `$ctrl` instances;
- forwarding thrown Rust/Wasm errors into AngularTS error handling.

The generated bootstrap should be deterministic and readable so it can be
debugged when necessary, but users should not edit it by hand.

## Controller and State Model

AngularTS templates interact with JavaScript objects. Rust controllers therefore
need generated JS-visible wrappers.

Rust component state remains inside Rust structs. The macros generate
`wasm-bindgen` getters, setters, and methods for fields and functions that the
template needs to access.

Rules:

- public component fields are exposed to templates by default;
- private fields are not exposed unless explicitly annotated;
- injected services are not template-visible by default;
- template-callable methods must use wasm-bindgen-compatible argument and return
  types;
- complex values crossing the boundary use `serde_wasm_bindgen` only through
  explicit typed adapters.
- raw `JsValue` exposure must be opt-in and annotated as unsafe interop.

## Dependency Injection

Rust APIs should model AngularTS DI with typed tokens while preserving the
runtime string-token contract.

Example:

```rust
pub const TODO_STORE: Token<TodoStore> = token!("todoStore");
```

Default token naming should be deterministic:

- services use lower camel case type names unless a token name is provided;
- components use the `selector` value;
- generated registration names must match AngularTS runtime expectations.

Unsafe escape hatches should be explicit:

```rust
injector.get_untyped("legacyService");
scope.unsafe_set("legacyValue", value);
```

Typed APIs should reject invalid injection shapes at compile time where macros
have enough information. Runtime validation should be reserved for values that
cannot be checked statically, such as names loaded from external metadata.

## Async Wasm Bootstrap

Wasm initialization is asynchronous. The generated entrypoint must load and
initialize Wasm before calling `angular.bootstrap(...)`.

The first version should only support browser bootstrap after Wasm readiness.
Later versions may support lazy-loaded feature modules and async service
proxies.

## AngularTS Service Facades

The MVP should expose a small set of typed service facades:

- `$http`
- `$log`
- `$exceptionHandler`
- `$rootScope`
- `$scope`
- `$eventBus`

Each facade should be mapped back to the corresponding public `ng` namespace
type and recorded in `NG_NAMESPACE_PARITY.md`.

Later phases can add:

- `$state`
- `$stateParams`
- `$transitions`
- `$compile`
- `$parse`
- `$interpolate`
- `$filter`
- `$animate`
- `$sce`
- `$templateCache`
- `$templateRequest`

## MVP Scope

The first usable version should support:

- strict Rust facade APIs for the MVP surface;
- a namespace parity checklist for the published AngularTS `ng` namespace;
- one Rust-authored AngularTS module;
- browser bootstrap with no handwritten JavaScript;
- services;
- values;
- factories;
- components;
- controllers;
- typed constructor or field injection;
- `$onInit` and `$onDestroy`;
- inline templates and template files;
- one basic example app;
- browser smoke test proving the Rust-authored component renders and responds
  to user input.

## Deferred Scope

Defer these until the MVP is stable:

- directives with compile, pre-link, and post-link functions;
- transclusion;
- component `require` relationships;
- providers and config blocks;
- decorators;
- router DSL;
- animation registration;
- standalone web component publishing;
- lazy-loaded Rust feature modules;
- worker-backed Rust/Wasm services;
- server-side rendering;
- hot module replacement.

## Testing Strategy

Initial checks:

- `cargo test` for facade and macro behavior where possible;
- compile-fail macro tests for invalid component metadata;
- compile-fail macro tests for invalid injection and unsupported boundary types;
- namespace parity check against `@types/namespace.d.ts`;
- generated glue snapshot tests;
- browser smoke test for `examples/basic_app`;
- AngularTS injector smoke test proving generated registrations resolve through
  normal DI.

The example app test should verify:

- Wasm initializes before bootstrap;
- the AngularTS module is registered;
- the component renders;
- template events call Rust methods;
- Rust state updates are visible through AngularTS change detection.

## Documentation

Initial docs should explain:

- no-handwritten-JavaScript authoring model;
- strict type safety principle;
- namespace parity policy against the published AngularTS `ng` types;
- required Rust and Node tooling;
- build commands;
- how generated glue works at a high level;
- supported Rust types at the JS boundary;
- how AngularTS DI token names are derived;
- how to use unsafe interop for legacy services;
- MVP limitations.

## Phases

### Phase 1: Plan and Scaffolding

- Add this plan.
- Add `README.md`.
- Add `NG_NAMESPACE_PARITY.md`.
- Add workspace `Cargo.toml` files.
- Add empty facade, macro, and build crates.
- Add a placeholder `basic_app` example.

### Phase 2: Generated Bootstrap

- Build a minimal `angular-ts-build` command.
- Generate a JS entrypoint that imports AngularTS and wasm-bindgen output.
- Initialize Wasm before AngularTS bootstrap.
- Register a hardcoded sample module from generated metadata.

### Phase 3: Services and DI

- Add `#[service]`.
- Add `Token<T>`.
- Add deterministic token names.
- Add compile-time diagnostics for unsupported injection shapes.
- Generate AngularTS service registration glue.
- Add typed service injection into component controllers.

### Phase 4: Components

- Add `#[component]`.
- Generate AngularTS component config.
- Generate JS-visible controller wrappers.
- Support template-callable methods.
- Support public field getters and setters.
- Add `$onInit` and `$onDestroy`.

### Phase 5: Example and Browser Test

- Implement `examples/basic_app`.
- Add a browser smoke test.
- Add repository make targets for Rust integration checks.
- Document the local demo flow.

### Phase 6: API Coverage Expansion

- Add selected AngularTS service facades.
- Add template file loading.
- Add better diagnostics for unsupported Rust types.
- Add generated API coverage checks against the published AngularTS `ng`
  namespace declarations.
- Require every public `ng` namespace type to have a Rust parity status.

## Open Questions

- Should the first macro model injection through fields, constructors, or both?
- Should component fields be exposed by default, or require `#[template]`?
- Should generated service tokens use Rust type names or explicit token names by
  default?
- Should the build helper own Vite configuration or emit files consumed by a
  user-owned bundler?
- How much of `serde_wasm_bindgen` should be part of the public contract?
- Should async Rust methods exposed to templates automatically trigger AngularTS
  digest after completion?
- Should parity be checked against the local repository declarations, the
  published npm package declarations, or both?
