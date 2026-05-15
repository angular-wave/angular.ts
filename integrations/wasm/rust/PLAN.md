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

## Required Namespace Porting Surface

Parity decisions alone are not enough for Rust feature completeness. Before
any additional Wasm language target becomes active implementation work, the Rust
integration must cover the public namespace types that make Wasm-authored
AngularTS applications practical. The Rust todo app remains the reference app,
but the plan must not let the todo app become the only definition of parity.

Required before the Rust feature-complete gate:

- `WasmScope`, `WasmScopeAbiImports`, `WasmAbiExports`,
  `WasmScopeUpdate`, `WasmScopeWatchOptions`, `WasmScopeBindingOptions`, and
  `WasmScopeReference`;
- a restricted `Scope` facade for app state and watched paths, with direct
  mutation through `WasmScope` rather than event bus or scope sync;
- `RootScopeService` as a lifecycle and flush facade;
- Rust authoring metadata for `Component`, `Controller`,
  `ControllerConstructor`, `NgModule`, `Injectable`, and `InjectionTokens`;
- `$http` coverage for `HttpService`, `RequestConfig`,
  `RequestShortcutConfig`, `HttpMethod`, `HttpResponse<T>`, and
  `HttpResponseStatus`;
- diagnostics and event support for `LogService`, `ExceptionHandlerService`,
  `PubSubService`, `TopicService`, `ListenerFn`, `ScopeEvent`, and
  `InvocationDetail`;
- template loading support for `TemplateRequestService` and
  `TemplateCacheService` when Rust-authored components use template files;
- persistence facades for `StorageBackend`, `StorageType`, `CookieService`,
  `CookieOptions`, and `CookieStoreOptions`.

Next after the required Rust surface, still before switching implementation
focus to another language unless explicitly reprioritized:

- realtime facades for `ConnectionConfig`, `ConnectionEvent`,
  `WebSocketService`, `WebSocketConfig`, `WebSocketConnection`, `SseService`,
  `SseConfig`, `SseConnection`, `RealtimeProtocolMessage`,
  `RealtimeProtocolEventDetail`, and `SwapModeType`;
- form and validation facades for `NgModelController` and `Validator`;
- router/state facades for `StateService`, `StateRegistryService`,
  `StateDeclaration`, `Transition`, `StateResolveArray`, and
  `StateResolveObject`;
- REST facades for `RestService`, `RestRequest`, `RestResponse`,
  `RestDefinition`, `RestOptions`, `RestBackend`, and cache/revalidation
  types, if Rust apps need a higher-level data API beyond `$http`.

Deferred from the Rust feature-complete gate:

- provider and config-time APIs such as `*Provider`, `ProvideService`, and
  `AngularServiceProvider`;
- compile/link/transclusion directive internals such as `CompileService`,
  `Directive`, `DirectiveFactory`, `AnnotatedDirectiveFactory`,
  `PublicLinkFn`, `BoundTranscludeFn`, `TranscludeFn`, and `Attributes`;
- browser object aliases such as `DocumentService`, `WindowService`, and
  `RootElementService`, except as explicit unsafe host handles;
- animation, worker, web component, parse/interpolate/filter/SCE/location
  surfaces unless a Rust reference example needs them.

This is the current stop line: do not switch active implementation to
Go, AssemblyScript, C#, Zig, C++, or C until the required Rust namespace
surface above is implemented, tested, and reflected in
`NG_NAMESPACE_PARITY.md`.

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

## Feature Complete Gate

Rust is the reference target for every later Wasm language integration. Go,
AssemblyScript, C#, Zig, C++, and C implementation work should not begin until
this gate is complete.

The primary Rust target is ergonomic authoring: application authors should write
one Rust method or field declaration, and the integration must generate the
AngularTS-visible wasm export, controller wrapper, metadata registration,
scope refresh, and scope watch plumbing. The todo example is not feature
complete while actions such as `toggle` must be represented separately as
domain methods, wasm service wrappers, controller exports, and manifest strings.

Rust feature completeness requires:

- no handwritten JavaScript in the Rust todo application source;
- no manual `wasm-bindgen` exports or getter glue in the Rust todo application
  source for AngularTS-visible controllers, services, methods, or state;
- generated bootstrap owns Wasm loading, AngularTS module registration, and
  `WasmScopeAbi` attachment;
- Rust-authored modules, services, factories, values, components, controllers,
  typed DI, template files, and lifecycle hooks are generated and tested;
- template-visible methods, template-visible properties, and watched scope
  properties are derived from Rust macro metadata, not manifest string lists;
- scope update lifecycle bindings are generated from Rust metadata, not
  conventional method names such as `bindScopeUpdates` and
  `unbindScopeUpdates`;
- Rust facade APIs cover the MVP AngularTS services: `$http`, `$log`,
  `$exceptionHandler`, `$rootScope`, `$scope`, and `$eventBus`;
- Rust facade APIs cover the required namespace porting surface listed above,
  including Wasm scope references and updates, HTTP request shortcuts,
  diagnostics/events, template loading, and persistence;
- `WasmScope` supports Rust-to-AngularTS writes and AngularTS-to-Rust watched
  updates through the shared ABI;
- unsupported Rust boundary types and invalid injection shapes produce
  compile-time diagnostics where macro input makes that possible;
- compile-fail macro tests cover invalid component metadata, invalid
  injections, and unsupported boundary types;
- generated glue snapshot tests cover the bootstrap and component bridge;
- browser Playwright tests cover the todo workflow and UI-to-Wasm propagation;
- the todo example demonstrates ergonomic Rust authoring, not only successful
  runtime bridge behavior;
- namespace parity has an explicit decision for every published AngularTS `ng`
  namespace type;
- every required namespace porting type is either `covered` with tests or
  explicitly removed from the required surface with a documented plan change;
- all MVP open questions in this plan are either resolved or moved to deferred
  scope with a documented reason.

## Current Todo Example Weak Points

The todo proof of concept now represents the current MVP Rust authoring model:
Rust owns application state and behavior, while generated glue owns AngularTS
registration, bridge exports, scope refresh, and UI-to-Rust update routing.

- The example no longer uses manual `wasm-bindgen` export attributes,
  `wasm_bridge(export = ...)`, manifest `syncProperties` / `methods`, or
  hand-written getter methods for template-visible state.
- Generated bridge refresh now syncs exported Rust fields through the AngularTS
  controller proxy after construction, template methods, watched UI updates,
  lifecycle hooks, async `WasmScope::flush()` calls, and promise-returning Rust
  template methods. Remaining todo boilerplate is the small handwritten
  `refresh()` recomputation for derived fields.
- Scope update examples no longer rely on conventional `bindScopeUpdates` and
  `unbindScopeUpdates` method names, and the exported `ng_scope_on_update`
  dispatcher now lives in the shared Rust facade. Individual watched path routes
  are declared with Rust macro metadata instead of manual `WasmScope::watch_with`
  calls.
- Rust facade service types now expose selected MVP method surfaces for
  `$http`, `$log`, `$exceptionHandler`, `$rootScope`, `$scope`, and
  `$eventBus`, but full namespace parity remains open.
- The acceptance coverage now guards against raw bridge export glue,
  hand-written template-state getters, manual `scope.set(...)`, manual
  `scope.flush(...)`, raw controller pointer capture, and manual `spawn_local`
  async wiring.

## Minimal Boilerplate Plan

The Rust implementation should minimize author code before expanding additional
AngularTS APIs. The immediate target is that the todo app reads like normal Rust
application code plus a small set of AngularTS annotations.

Concrete steps:

1. Field-first template state:
   - public controller fields are exported to AngularTS automatically;
   - Rust field names stay idiomatic snake_case;
   - generated JS properties use lower camel case for templates;
   - public field metadata is merged with method metadata during bootstrap;
   - getter methods such as `items()`, `remaining_count()`, and
     `server_status()` are removed from examples.

2. Generated scope refresh:
   - exported fields are written to `WasmScope` by generated bridge code after
     construction, template method calls, lifecycle hooks, and async completions;
   - Rust controllers stop hand-writing `scope.set(...)` for each exported
     property;
   - examples keep explicit domain state changes, but not repetitive scope
     synchronization code.

3. Generated UI-to-Rust update routing:
   - watched template paths are inferred from exported fields and explicit
     `#[scope_update(path = "...")]` methods;
   - generated glue handles watch registration and disposal;
   - Rust authors write only the update handler when custom parsing or
     validation is required.

4. Constructor and DI cleanup:
   - component/controller constructors remain the primary injection surface;
   - `#[inject]` fields stay available only for registration metadata and simple
     service slots;
   - generated metadata remains the source of truth for `$http`, `$scope`, and
     app services.

5. Acceptance tests for minimal glue:
   - the todo source must not contain raw `wasm_bindgen`, manifest
     `syncProperties`, manifest `methods`, or hand-written property getter
     methods for template state;
   - Playwright must prove field-originated Rust state updates the DOM and UI
     changes propagate back to Rust through `WasmScope`;
   - compile-fail tests must reject unsupported public field and method types.

Only after these steps are complete should Rust API coverage expand beyond the
current MVP services.

The next implementation steps are the required namespace porting surface above,
not another Wasm language target.

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
- AngularTS scope updates propagate back into Rust through the shared Wasm ABI
  watch callback.

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

- [x] Add this plan.
- [x] Add `README.md`.
- [x] Add `NG_NAMESPACE_PARITY.md`.
- [x] Add workspace `Cargo.toml` files.
- [x] Add empty facade, macro, and build crates.
- [x] Add a placeholder `basic_app` example.

### Phase 2: Generated Bootstrap

- [x] Build a minimal `angular-ts-build` command.
- [x] Generate a JS entrypoint that imports AngularTS and wasm-bindgen output.
- [x] Initialize Wasm before AngularTS bootstrap.
- [x] Register sample modules from generated metadata.
- [x] Generate and attach `WasmScopeAbi`.
- [x] Generate an ABI adapter for wasm-bindgen `angular_ts` imports.

### Phase 3: Services and DI

- [x] Add `#[service]`.
- [x] Add `Token<T>`.
- [x] Add deterministic token names.
- [x] Add compile-time diagnostics for unsupported injection shapes.
- [x] Generate AngularTS service registration glue.
- [x] Add typed service injection into component controllers.
- [x] Add generated factories and values.
- [x] Add method-level facades for MVP AngularTS services.

### Phase 4: Components

- [x] Add `#[component]`.
- [x] Generate AngularTS component config.
- [x] Generate JS-visible controller wrappers.
- [x] Support template-callable methods.
- [x] Support public field getters and setters without manual wasm-bindgen
      authoring.
- [x] Add generated `$onInit` and `$onDestroy`.
- [x] Bind component scopes through the shared `WasmScope` ABI.
- [x] Propagate UI-originated scope updates to Rust through
      `scope_watch` / `ng_scope_on_update`.

### Phase 5: Example and Browser Test

- [x] Implement `examples/basic_app`.
- [x] Add a browser smoke test.
- [x] Add repository make targets for Rust integration checks.
- [x] Document the local demo flow.
- [x] Cover Rust-to-AngularTS and AngularTS-to-Rust scope propagation in
      Playwright.

### Phase 6: Rust Feature Completion

- [x] Make ergonomic Rust authoring the first completion target: one Rust
      method or field declaration must generate the AngularTS-visible export,
      wrapper, metadata, refresh, and watch plumbing.
- [x] Export public controller fields as lower-camel AngularTS properties and
      merge them into generated bridge metadata.
- [x] Replace todo and scope-bridge getter methods with public fields.
- [x] Generate scope refresh for exported fields so examples stop calling
      `scope.set(...)` manually for each property.
- [x] Add minimal-glue acceptance checks that reject hand-written template-state
      getter methods in examples.
- [x] Collapse the todo example's duplicated bridge layers so actions such as
      `toggle` are authored once in Rust application code.
- [x] Add `#[wasm_bridge]` generation for wasm-bindgen struct and method
      exports so constructors, getters, setters, and methods are inferred from
      Rust signatures.
- [x] Extend `#[wasm_bridge]` to service/value export functions so exported
      function names no longer need direct wasm-bindgen attributes.
- [x] Generate `#[wasm_bridge]` export names from typed targets such as
      `component = "TodoList"` and `service = "TodoStore"` instead of raw
      `__ng_*` strings in application bridge annotations.
- [x] Infer manifest registration export names from registration kind and name
      so examples no longer carry raw `__ng_*` export strings in
      `angular-ts.json`.
- [x] Add shared `WasmScope` facade helpers over the language-neutral ABI.
- [x] Add selected AngularTS service facades.
- [x] Replace manual `wasm-bindgen` exports and getter glue in the todo example
      with generated AngularTS-visible bindings.
- [x] Infer component `syncProperties` and `methods` from templates when the
      manifest omits explicit bridge lists.
- [x] Infer standalone controller `syncProperties` and `methods` from an app
      template when the manifest omits explicit bridge lists.
- [x] Infer component `controllerAs` from template references when the manifest
      omits an explicit alias.
- [x] Remove default-only `requires` and `bootstrap` fields from Rust example
      manifests.
- [x] Export Rust registration metadata through generated `__ng_manifest` and
      merge it into build manifest registrations at bootstrap time.
- [x] Remove DI `inject` lists from Rust example manifests by sourcing them
      from Rust component/controller metadata.
- [x] Use Rust runtime registrations as the primary registration list, with
      build manifest entries acting only as overrides for template inlining or
      registration kind overrides.
- [x] Generate `syncProperties` and `methods` metadata from Rust macros instead
      of manifest strings.
- [x] Generate scope update bind and unbind lifecycle metadata instead of
      relying on `bindScopeUpdates` / `unbindScopeUpdates` method names.
- [x] Move `ng_scope_on_update` dispatch into the shared Rust `WasmScope`
      facade so examples do not own ABI callback exports or controller maps.
- [x] Generate watched path routing metadata so examples do not need to call
      `WasmScope::watch_with` manually for each UI-originated update.
- [x] Add an authoring ergonomics acceptance test or snapshot proving the Rust
      todo source has no bridge glue.
- [x] Add template file loading.
- [x] Add ergonomic async `$http` helpers for injected Rust/Wasm service values.
- [x] Support async Rust template methods in generated bridge wrappers so
      promise completion refreshes AngularTS state without manual
      `spawn_local`, raw controller pointers, or explicit scope flushing.
- [x] Decode AngularTS `HttpResponse<T>` into typed Rust data with
      `serde-wasm-bindgen`.
- [x] Add a Rust `RequestConfig` builder for method, URL, headers, params, and
      timeout.
- [x] Cover a real Rust/Wasm `$http` call through the Go test server in
      Playwright.
- [x] Add better diagnostics for unsupported Rust types.
- [x] Add generated API coverage checks against the published AngularTS `ng`
      namespace declarations.
- [x] Require every public `ng` namespace type to have a final Rust MVP parity
      decision.
- [x] Promote required namespace porting entries from deferred parity decisions
      to tested Rust APIs.
- [x] Add Rust `WasmScopeUpdate`, `WasmScopeWatchOptions`,
      `WasmScopeBindingOptions`, and `WasmScopeReference` facade coverage.
- [x] Add `RequestShortcutConfig` coverage and tests for `$http` shortcut
      calls.
- [x] Add typed diagnostics and event facade coverage for `TopicService`,
      `ListenerFn`, `ScopeEvent`, and `InvocationDetail`.
- [x] Add template request/cache facades used by Rust-authored template-file
      components.
- [x] Add storage and cookie facades for persisted Rust app state.
- [x] Add compile-fail macro tests.
- [x] Add generated glue snapshot tests.
- [x] Resolve or explicitly defer all MVP open questions.

### Phase 7: Post-Rust Language Targets

Do not start or expand this phase until the Rust feature complete gate is
satisfied, including the required namespace porting surface above. Existing
non-Rust files are planning/reference material until then.

- [x] Resume Go Wasm binding implementation after Rust feature completion.
- [ ] Start AssemblyScript binding implementation.
- [ ] Start C# binding implementation.
- [ ] Start Zig binding implementation.
- [ ] Start C++ binding implementation.
- [ ] Start C binding implementation.

## MVP Decisions

- Injection supports constructor injection for runtime controllers and
  components, with `#[inject]` fields retained for registration metadata and
  simple service slots. Constructor injection remains the preferred authoring
  style for behavior-bearing Rust controllers.
- Public controller fields are template-visible by default. Private fields stay
  internal. A future `#[template]` marker can be added only if the default proves
  too broad in real applications.
- Generated service tokens use explicit AngularTS token names when supplied, and
  deterministic Rust type-derived names otherwise.
- The build helper emits generated files consumed by the existing app/server
  setup. It does not own Vite configuration as part of the MVP.
- `serde_wasm_bindgen` is part of the MVP Rust facade contract for typed
  HTTP/request-response decoding, but raw `JsValue` remains the explicit escape
  hatch for dynamic interop.
- Async Rust methods exposed to templates trigger generated AngularTS state
  refresh after promise completion.
- Parity is checked against the repository-generated `@types/namespace.d.ts`.
  Release automation can add a published npm-package comparison later, but the
  local generated declaration file is the MVP source of truth.
