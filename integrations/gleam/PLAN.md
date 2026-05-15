# AngularTS Gleam Integration Plan

## Goal

Make AngularTS a first-class Gleam web authoring target with feature parity to
the Dart integration. Gleam developers should be able to write AngularTS
applications from Gleam using idiomatic typed APIs, while AngularTS remains the
JavaScript runtime that owns templates, dependency injection, scopes,
directives, components, services, and web components.

The Gleam integration is an official package maintained in this repository and
published separately for Gleam consumers.

First-class support requires feature parity with every type made public through
the AngularTS `ng` namespace. The parity source of truth is:

```text
@types/namespace.d.ts
```

## Dart Parity Target

Gleam is considered feature-parity complete when it can cover the same authoring
surface as the Dart package:

- typed modules, DI tokens, providers, services, factories, controllers,
  components, directives, scopes, and web components;
- strict public APIs by default, with unsafe JavaScript interop isolated behind
  clearly named escape hatches;
- typed wrappers for the AngularTS runtime services represented in the Dart
  parity file;
- compiler coverage that proves normal Gleam authoring does not rely on raw
  JavaScript objects or stringly typed injection arrays;
- browser tests that render at least one AngularTS app authored in Gleam against
  the built `dist` runtime artifact;
- a Gleam namespace parity checklist equivalent to
  `integrations/dart/NG_NAMESPACE_PARITY.md`.

## Type Safety Principle

The Gleam integration should be as precise and strict as the AngularTS runtime
contract allows. Public Gleam APIs should prefer opaque types, custom types,
typed records, result-returning decoders, and explicit builder functions over
raw JavaScript values.

Raw JavaScript interop is allowed only as an explicit escape hatch for legacy
AngularJS-compatible behavior, unknown third-party services, or intentionally
untyped interop. Escape hatches must be named clearly and kept out of the
default authoring path.

## Package Shape

```text
integrations/
  gleam/
    gleam.toml
    src/angular_ts.gleam
    src/angular_ts/
      bootstrap.gleam
      component.gleam
      directive.gleam
      injectable.gleam
      injector.gleam
      module.gleam
      runtime.gleam
      scope.gleam
      token.gleam
      web_component.gleam
      unsafe.gleam
    test/
    examples/
      basic_app/
      web_components/
    priv/
    tool/
```

The npm package remains the source of the AngularTS runtime. The Gleam package
wraps the runtime through the JavaScript target and ships through Gleam tooling.

## Gleam Technology Choices

- Use Gleam's JavaScript target for browser output.
- Use `@external(javascript, ...)` only in low-level binding modules.
- Use opaque public types for AngularTS runtime handles.
- Use `Result`-returning decoders for dynamic service payloads.
- Use builder functions for config objects rather than exposing raw JavaScript
  object construction.
- Use custom types for closed option sets.
- Keep template strings as AngularTS templates.
- Use Gleam tests for pure builder behavior and Playwright for browser smoke
  tests.

## Target Gleam Authoring API

```gleam
import angular_ts as ng
import angular_ts/component
import angular_ts/injectable
import angular_ts/token
import gleam/list

pub type Todo {
  Todo(title: String)
}

pub opaque type TodoStore {
  TodoStore(items: List(Todo))
}

pub fn new_store() {
  TodoStore([Todo("Learn AngularTS")])
}

pub fn main() {
  let app = ng.module("demo")
  let todo_store = token.new("todoStore")

  app
  |> ng.service(todo_store, injectable.inject0(new_store))
  |> ng.component(
    "todo-list",
    component.new(
      template: "
        <section>
          <button ng-click=\"$ctrl.add(newTodo)\">Add</button>
          <p ng-repeat=\"todo in $ctrl.todos\">{{ todo.title }}</p>
        </section>
      ",
      controller: injectable.inject1(todo_store, todo_list_controller),
    ),
  )
  |> ng.bootstrap_body
}
```

The exact API can change, but normal applications should not hand-write
AngularTS JavaScript registration glue.

## Public Gleam Surface

Initial package API:

- `module(name: String) -> NgModule`
- `module_with_requires(name: String, requires: List(String)) -> NgModule`
- `bootstrap(root: Element, modules: List(String), config: BootstrapConfig)`
- `token.new(name: String) -> Token(a)`
- `component.new(...) -> Component(controller)`
- `directive.new(...) -> Directive(scope)`
- `NgModule` builder functions for values, services, factories, controllers,
  components, directives, and web components.
- `injector.get(injector: Injector, token: Token(a)) -> Result(a, Error)`
- `Scope(state)` wrappers for watch/listen/destroy operations.
- Explicit unsafe APIs in `angular_ts/unsafe`.

Typed injection helpers should cover common arities without exposing string
arrays in normal application code:

- `injectable.inject0(factory)`
- `injectable.inject1(token_a, factory)`
- `injectable.inject2(token_a, token_b, factory)`
- Continue through the practical arities used by AngularTS services and
  controllers.
- `unsafe.inject(tokens, js_function)` is the explicit higher-arity or legacy
  escape hatch.

## Interop Design

The Gleam package should convert Gleam declarations into JavaScript runtime
shapes at the boundary:

- Gleam `Component` becomes the JavaScript component config object.
- Gleam `Directive` becomes the JavaScript directive definition object or
  factory.
- Gleam callbacks are converted to JS-callable functions.
- Controller and service values are exported as JS-visible view models only when
  template access requires it.
- Injection metadata is always explicit and token-backed.
- Public Gleam APIs should not accept raw JavaScript config objects when a typed
  builder can describe the shape.
- Config builders should preserve the relationship between controller, scope,
  bindings, and lifecycle hook types.
- JavaScript object/property escape hatches are available for migration and
  advanced scenarios, but they are not the default API path.

## Gleam-Specific Design Constraints

Gleam does not model JavaScript classes as the default application authoring
shape. The integration should therefore use explicit controller values and
builder functions rather than class-oriented APIs.

Gleam records and custom types are not automatically AngularTS template models.
The integration must provide one of these template visibility paths:

- explicit field/method export builders;
- generated JavaScript view-model wrappers;
- a small metadata file consumed by a Gleam build helper.

The chosen path must preserve type checking in Gleam source and avoid manual
AngularTS registration glue in normal applications.

## Phases

### Phase 1: Package Skeleton

- Add `gleam.toml`.
- Add `src/angular_ts.gleam`.
- Add minimal JavaScript target bindings for the AngularTS runtime.
- Add internal unsafe interop helpers that are not exported from the main
  authoring API.
- Add pure tests for token and config builders.

### Phase 2: Runtime API

- Implement `module`, `bootstrap`, and `injector` wrappers.
- Implement `NgModule` builder functions for values, services, factories,
  controllers, components, directives, and web components.
- Add token-backed explicit injection annotation support.
- Add typed Gleam-to-JS config object builders.
- Add unsafe fallbacks in `angular_ts/unsafe`.

### Phase 3: Component Authoring

- Implement typed `Component` and controller wrappers.
- Define the template-visible view-model export strategy.
- Support lifecycle hooks that map to AngularTS component hooks.
- Add examples for record-backed and function-backed controllers.
- Add tests for template rendering and DI.
- Add compile-time examples that demonstrate typed DI failures are caught by
  the Gleam compiler.

### Phase 4: Directive And Scope Support

- Implement typed `Directive` wrappers.
- Add `Scope` helper APIs for watch/listen/destroy operations.
- Add dynamic property escape hatches under explicitly unsafe APIs.
- Add tests for directive linking and teardown.

### Phase 5: Services And Runtime Facades

- Add typed facades for built-in AngularTS services covered by Dart.
- Add HTTP, REST, filters, animation, router, realtime, storage, worker, and
  cookie facades.
- Use `Result` and typed decoders for dynamic response payloads.
- Preserve unsupported or structurally dynamic mappings in the Gleam namespace
  parity checklist with reasons.

### Phase 6: Web Components

- Implement Gleam `WebComponent` config wrappers.
- Support inputs, shadow DOM, connected/disconnected hooks, and DOM event
  dispatch.
- Add typed web component event payload helpers.
- Add an example that publishes multiple web components from one AngularTS
  runtime.

### Phase 7: Tooling And CI

- Add Gleam unit tests.
- Add a Gleam example build check.
- Add browser smoke tests that compile Gleam to JavaScript, load AngularTS, and
  verify a rendered app against the built `dist` runtime artifact.
- Add compiler-based type tests for DI tokens, component controllers,
  directives, and web component payloads.
- Preserve upstream TypeScript documentation as Gleam doc comments on
  equivalent public Gleam types, callbacks, configuration objects, and methods.

### Phase 8: Namespace Parity And Publishing

- Add `integrations/gleam/NG_NAMESPACE_PARITY.md`.
- Add a parity checker against `@types/namespace.d.ts`.
- Give every public `ng` namespace type an explicit Gleam decision.
- Publish the package for Gleam consumers.
- Document version compatibility with `@angular-wave/angular.ts`.
- Add official docs under the AngularTS docs site.

## Open Questions

- Whether runtime bindings should be generated from `.d.ts` or hand-curated for
  a Gleam-friendly API.
- Whether template-visible exports should be generated or described through
  explicit builder functions.
- How to map AngularTS APIs that naturally return arbitrary JavaScript objects
  into Gleam `Result` and decoder patterns.
- How far typed injection helpers should go before requiring a list-based
  advanced API.
- Whether built-in service tokens should be generated from TypeScript
  declarations.

## Definition Of First-Class Support

The Gleam integration is first class when:

- It is maintained in this repository.
- It is published as an official Gleam package.
- It has official documentation and examples.
- CI verifies Gleam compilation, tests, and at least one browser-rendered
  AngularTS app authored in Gleam.
- Public Gleam APIs are strict by default and use explicit unsafe escape hatches
  for dynamic AngularTS patterns.
- Every public `ng` namespace type has a Gleam equivalent or documented parity
  decision.
- Equivalent public Gleam types and functions preserve the upstream API
  documentation in Gleam doc comment form.
- AngularTS public API changes include Gleam integration updates when needed.

## Implementation Status

- Package skeleton: planned.
- Typed DI tokens: planned.
- Typed module/component/directive/service/web component facade: planned.
- Browser example: planned.
- Namespace parity file: planned.
