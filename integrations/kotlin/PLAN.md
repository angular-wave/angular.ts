# AngularTS Kotlin Integration Plan

## Goal

Make AngularTS a first-class Kotlin web authoring target with feature parity to
the Dart integration. Kotlin developers should be able to write AngularTS
applications from Kotlin using idiomatic Kotlin/JS APIs, while AngularTS remains
the JavaScript runtime that owns templates, dependency injection, scopes,
directives, components, services, and web components.

The Kotlin integration is an official package maintained in this repository and
published separately for Kotlin/JS consumers.

First-class support requires feature parity with every type made public through
the AngularTS `ng` namespace. The parity source of truth is:

```text
@types/namespace.d.ts
```

## Dart Parity Target

Kotlin is considered feature-parity complete when it can cover the same
authoring surface as the Dart package:

- typed modules, DI tokens, providers, services, factories, controllers,
  components, directives, scopes, and web components;
- strict public APIs by default, with unsafe JavaScript interop isolated behind
  clearly named escape hatches;
- typed wrappers for the AngularTS runtime services represented in the Dart
  parity file;
- compiler coverage that proves normal Kotlin authoring does not rely on raw
  dynamic objects or stringly typed injection arrays;
- browser tests that render at least one AngularTS app authored in Kotlin
  against the built `dist` runtime artifact;
- a Kotlin namespace parity checklist equivalent to
  `integrations/dart/NG_NAMESPACE_PARITY.md`.

## Type Safety Principle

The Kotlin integration should be as precise and strict as the AngularTS runtime
contract allows. Public Kotlin APIs should prefer value classes, generic tokens,
data classes, sealed interfaces, typed callbacks, and explicit DSL builders over
`dynamic`, raw `js()` objects, or untyped external declarations.

`dynamic` is allowed only as an explicit escape hatch for legacy
AngularJS-compatible behavior, unknown third-party services, or intentionally
untyped interop. Escape hatches must be named clearly and kept out of the
default authoring path.

## Package Shape

```text
integrations/
  kotlin/
    build.gradle.kts
    settings.gradle.kts
    src/jsMain/kotlin/angular/ts/
      AngularTS.kt
      Bootstrap.kt
      Component.kt
      Directive.kt
      Injectable.kt
      Injector.kt
      Module.kt
      Runtime.kt
      Scope.kt
      Token.kt
      WebComponent.kt
      unsafe/
    src/jsTest/kotlin/
    examples/
      basic-app/
      web-components/
    tool/
```

The npm package remains the source of the AngularTS runtime. The Kotlin package
wraps the runtime through Kotlin/JS external bindings and ships through Kotlin
tooling.

## Kotlin Technology Choices

- Use Kotlin/JS IR output for browser applications.
- Use external declarations only in low-level runtime binding modules.
- Expose idiomatic Kotlin builders and typed data classes for normal authoring.
- Use value classes for DI tokens where practical.
- Use sealed interfaces and enums for closed option sets.
- Avoid raw `dynamic` and `js()` in public APIs except under explicit unsafe
  namespaces.
- Keep template strings as AngularTS templates.
- Use Kotlin test tooling for unit tests and Playwright for browser smoke tests.

## Target Kotlin Authoring API

```kotlin
import angular.ts.ng
import web.dom.document

class TodoStore {
    private val items = mutableListOf("Learn AngularTS")
    fun all(): List<String> = items
    fun add(title: String) {
        title.trim().takeIf { it.isNotEmpty() }?.let(items::add)
    }
}

class TodoList(private val store: TodoStore) {
    val todos: List<String>
        get() = store.all()

    fun add(title: String) {
        store.add(title)
    }
}

fun main() {
    val app = ng.module("demo")
    val todoStore = ng.token<TodoStore>("todoStore")

    app.service(todoStore, ng.inject0 { TodoStore() })

    app.component(
        "todoList",
        ng.component<TodoList> {
            template = """
                <section>
                  <button ng-click="${'$'}ctrl.add(newTodo)">Add</button>
                  <p ng-repeat="todo in ${'$'}ctrl.todos">{{ todo }}</p>
                </section>
            """.trimIndent()
            controller = ng.inject1(todoStore) { TodoList(it) }
        },
    )

    ng.bootstrap(document.body!!, listOf(app.name))
}
```

The exact DSL can change, but normal applications should not hand-write
AngularTS JavaScript registration glue.

## Public Kotlin Surface

Initial package API:

- `ng.module(name: String, requires: List<String> = emptyList()): NgModule`
- `ng.bootstrap(root: Element, modules: List<String>, config: BootstrapConfig)`
- `ng.token<T>(name: String): Token<T>`
- `NgModule.component<T>(name: String, options: Component<T>)`
- `NgModule.directive<T>(name: String, options: Directive<T>)`
- `NgModule.controller<T>(name: String, controller: InjectableFactory<T>)`
- `NgModule.service<T>(token: Token<T>, service: InjectableFactory<T>)`
- `NgModule.factory<T>(token: Token<T>, factory: InjectableFactory<T>)`
- `NgModule.value<T>(token: Token<T>, value: T)`
- `NgModule.webComponent<T>(name: String, options: WebComponent<T>)`
- `Injector.get<T>(token: Token<T>): T`
- `Scope<TState>` wrappers for watch/listen/destroy operations.
- Explicit unsafe APIs such as `Injector.getUnsafe(name: String)` and
  `Scope.unsafe`.

Typed injection helpers should cover common arities without exposing string
arrays in normal application code:

- `ng.inject0(factory)`
- `ng.inject1(tokenA, factory)`
- `ng.inject2(tokenA, tokenB, factory)`
- Continue through the practical arities used by AngularTS services and
  controllers.
- `ng.injectUnsafe(tokens, jsFunction)` is the explicit higher-arity or legacy
  escape hatch.

## Interop Design

The Kotlin package should convert Kotlin declarations into JavaScript runtime
shapes at the boundary:

- Kotlin `Component` becomes the JavaScript component config object.
- Kotlin `Directive` becomes the JavaScript directive definition object or
  factory.
- Kotlin callbacks are converted to JS-callable functions.
- Controller and service instances are exported as JS-visible view models only
  when template access requires it.
- Injection metadata is always explicit and token-backed.
- Public Kotlin APIs should not accept raw dynamic config objects when a typed
  config object or DSL builder can describe the shape.
- Config builders should validate and preserve the relationship between
  controller, scope, bindings, and lifecycle hook types.
- JavaScript object/property escape hatches are available for migration and
  advanced scenarios, but they are not the default API path.

## Phases

### Phase 1: Package Skeleton

- Add `build.gradle.kts` and `settings.gradle.kts`.
- Add `src/jsMain/kotlin/angular/ts/AngularTS.kt`.
- Add minimal Kotlin/JS external bindings for the AngularTS runtime.
- Add strict Kotlin compiler settings.
- Add internal unsafe interop helpers that are not exported from the main
  authoring API.

### Phase 2: Runtime API

- Implement `module`, `bootstrap`, and `injector` wrappers.
- Implement `NgModule` wrapper methods for values, services, factories,
  controllers, components, directives, and web components.
- Add token-backed explicit injection annotation support.
- Add typed Kotlin-to-JS config object builders.
- Add unsafe fallbacks in a separate package.

### Phase 3: Component Authoring

- Implement typed `Component` and controller wrappers.
- Support lifecycle hooks that map to AngularTS component hooks.
- Add examples for controller classes and function controllers.
- Add tests for template rendering and DI.
- Add compile-time examples that demonstrate typed DI failures are caught by
  the Kotlin compiler.

### Phase 4: Directive And Scope Support

- Implement typed `Directive` wrappers.
- Add `Scope` helper APIs for watch/listen/destroy operations.
- Add dynamic property escape hatches under explicitly unsafe APIs.
- Add tests for directive linking and teardown.

### Phase 5: Services And Runtime Facades

- Add typed facades for built-in AngularTS services covered by Dart.
- Add HTTP, REST, filters, animation, router, realtime, storage, worker, and
  cookie facades.
- Preserve unsupported or structurally dynamic mappings in the Kotlin namespace
  parity checklist with reasons.

### Phase 6: Web Components

- Implement Kotlin `WebComponent` config wrappers.
- Support inputs, shadow DOM, connected/disconnected hooks, and DOM event
  dispatch.
- Add typed web component event payload helpers.
- Add an example that publishes multiple web components from one AngularTS
  runtime.

### Phase 7: Tooling And CI

- Add Kotlin unit tests.
- Add a Kotlin/JS example build check.
- Add browser smoke tests that compile Kotlin to JavaScript, load AngularTS, and
  verify a rendered app against the built `dist` runtime artifact.
- Add compiler-based type tests for DI tokens, component controllers,
  directives, and web component payloads.
- Preserve upstream TypeScript documentation as KDoc on equivalent public Kotlin
  types, callbacks, configuration objects, and methods.

### Phase 8: Namespace Parity And Publishing

- Add `integrations/kotlin/NG_NAMESPACE_PARITY.md`.
- Add a parity checker against `@types/namespace.d.ts`.
- Give every public `ng` namespace type an explicit Kotlin decision.
- Publish the package for Kotlin/JS consumers.
- Document version compatibility with `@angular-wave/angular.ts`.
- Add official docs under the AngularTS docs site.

## Open Questions

- Whether runtime external declarations should be generated from `.d.ts` or
  hand-curated for a Kotlin-friendly DSL.
- Whether the integration should target only Kotlin/JS initially or reserve room
  for Kotlin/Wasm once the AngularTS browser boundary is stable.
- How far typed injection helpers should go before requiring a list-based
  advanced API.
- How to preserve strong types for lifecycle hooks while allowing legacy
  AngularJS-compatible controller shapes.
- Whether built-in service tokens should be generated from TypeScript
  declarations.

## Definition Of First-Class Support

The Kotlin integration is first class when:

- It is maintained in this repository.
- It is published as an official Kotlin/JS package.
- It has official documentation and examples.
- CI verifies Kotlin compilation, tests, and at least one browser-rendered
  AngularTS app authored in Kotlin.
- Public Kotlin APIs are strict by default and use explicit unsafe escape
  hatches for dynamic AngularTS patterns.
- Every public `ng` namespace type has a Kotlin equivalent or documented parity
  decision.
- Equivalent public Kotlin types and methods preserve the upstream API
  documentation in KDoc form.
- AngularTS public API changes include Kotlin integration updates when needed.

## Implementation Status

- Package skeleton: planned.
- Typed DI tokens: planned.
- Typed module/component/directive/service/web component facade: planned.
- Browser example: planned.
- Namespace parity file: planned.
