# AngularTS Scala Integration Plan

## Goal

Make AngularTS a first-class Scala web authoring target with feature parity to
the Dart integration. Scala developers should be able to write AngularTS
applications from Scala using idiomatic Scala.js APIs, while AngularTS remains
the JavaScript runtime that owns templates, dependency injection, scopes,
directives, components, services, and web components.

The Scala integration is an official package maintained in this repository and
published separately for Scala.js consumers.

First-class support requires feature parity with every type made public through
the AngularTS `ng` namespace. The parity source of truth is:

```text
@types/namespace.d.ts
```

## Dart Parity Target

Scala is considered feature-parity complete when it can cover the same authoring
surface as the Dart package:

- typed modules, DI tokens, providers, services, factories, controllers,
  components, directives, scopes, and web components;
- strict public APIs by default, with unsafe JavaScript interop isolated behind
  clearly named escape hatches;
- typed wrappers for the AngularTS runtime services represented in the Dart
  parity file;
- analyzer/compiler coverage that proves normal Scala authoring does not rely on
  raw JavaScript dictionaries or stringly typed injection arrays;
- browser tests that render at least one AngularTS app authored in Scala against
  the built `dist` runtime artifact;
- a Scala namespace parity checklist equivalent to
  `integrations/dart/NG_NAMESPACE_PARITY.md`.

## Type Safety Principle

The Scala integration should be as precise and strict as the AngularTS runtime
contract allows. Public Scala APIs should prefer opaque/newtype-style tokens,
case classes, sealed traits, typed callbacks, and generic return values over
`js.Dynamic`, untyped dictionaries, or raw JavaScript objects.

`js.Dynamic` is allowed only as an explicit escape hatch for legacy
AngularJS-compatible behavior, unknown third-party services, or intentionally
untyped interop. Escape hatches must be named clearly and kept out of the
default authoring path.

## Package Shape

```text
integrations/
  scala/
    build.sbt
    project/
    src/main/scala/angular/ts/
      AngularTS.scala
      Bootstrap.scala
      Component.scala
      Directive.scala
      Injectable.scala
      Injector.scala
      Module.scala
      Runtime.scala
      Scope.scala
      Token.scala
      WebComponent.scala
      unsafe/
    src/test/scala/
    examples/
      basic-app/
      web-components/
    tool/
```

The npm package remains the source of the AngularTS runtime. The Scala package
wraps the runtime through Scala.js facade types and ships through Scala tooling.

## Scala Technology Choices

- Use Scala.js for JavaScript output.
- Model AngularTS config objects with typed facade builders and exported JS
  objects only at the boundary.
- Use `js.annotation` and `js.|` only in low-level interop modules when needed.
- Keep public authoring APIs in idiomatic Scala types rather than raw
  `js.Object` or `js.Dictionary`.
- Use sealed traits and case classes for closed option sets.
- Use opaque or value-class token wrappers for typed DI.
- Keep template strings as AngularTS templates.
- Use ScalaTest or MUnit for unit tests and Playwright for browser smoke tests.

## Target Scala Authoring API

```scala
import angular.ts as ng
import org.scalajs.dom.document

final class TodoStore:
  private var items = Vector("Learn AngularTS")
  def all: Vector[String] = items
  def add(title: String): Unit =
    if title.trim.nonEmpty then items = items :+ title.trim

final class TodoList(store: TodoStore):
  def todos: Vector[String] = store.all
  def add(title: String): Unit = store.add(title)

@main def main(): Unit =
  val app = ng.module("demo")
  val todoStore = ng.token[TodoStore]("todoStore")

  app.service(todoStore, ng.inject0(TodoStore()))

  app.component(
    "todoList",
    ng.Component(
      template =
        """<section>
          |  <button ng-click="$ctrl.add(newTodo)">Add</button>
          |  <p ng-repeat="todo in $ctrl.todos">{{ todo }}</p>
          |</section>""".stripMargin,
      controller = ng.inject1(todoStore)(TodoList(_))
    )
  )

  ng.bootstrap(document.body, Seq(app.name))
```

The exact syntax can change, but normal applications should not hand-write
AngularTS JavaScript registration glue.

## Public Scala Surface

Initial package API:

- `ng.module(name: String, requires: Seq[String] = Seq.empty): NgModule`
- `ng.bootstrap(root: Element, modules: Seq[String], config: BootstrapConfig)`
- `ng.token[A](name: String): Token[A]`
- `NgModule.component[A](name: String, options: Component[A])`
- `NgModule.directive[A](name: String, options: Directive[A])`
- `NgModule.controller[A](name: String, controller: InjectableFactory[A])`
- `NgModule.service[A](token: Token[A], service: InjectableFactory[A])`
- `NgModule.factory[A](token: Token[A], factory: InjectableFactory[A])`
- `NgModule.value[A](token: Token[A], value: A)`
- `NgModule.webComponent[A](name: String, options: WebComponent[A])`
- `Injector.get[A](token: Token[A]): A`
- `Scope[A]` wrappers for watch/listen/destroy operations.
- Explicit unsafe APIs such as `Injector.getUnsafe(name: String)` and
  `Scope.unsafe`.

Typed injection helpers should cover common arities without exposing string
arrays in normal application code:

- `ng.inject0(factory)`
- `ng.inject1(tokenA)(factory)`
- `ng.inject2(tokenA, tokenB)(factory)`
- Continue through the practical arities used by AngularTS services and
  controllers.
- `ng.injectUnsafe(tokens, jsFunction)` is the explicit higher-arity or legacy
  escape hatch.

## Interop Design

The Scala package should convert Scala declarations into JavaScript runtime
shapes at the boundary:

- Scala `Component` becomes the JavaScript component config object.
- Scala `Directive` becomes the JavaScript directive definition object or
  factory.
- Scala callbacks are converted to JS-callable functions.
- Controller and service instances are exported as JS-visible view models only
  when template access requires it.
- Injection metadata is always explicit and token-backed.
- Public Scala APIs should not accept untyped `js.Dictionary[Any]` config maps
  when a typed config object can describe the shape.
- Config builders should validate and preserve the relationship between
  controller, scope, bindings, and lifecycle hook types.
- JavaScript object/property escape hatches are available for migration and
  advanced scenarios, but they are not the default API path.

## Phases

### Phase 1: Package Skeleton

- Add `build.sbt`.
- Add `src/main/scala/angular/ts/AngularTS.scala`.
- Add minimal Scala.js facade bindings for the AngularTS runtime.
- Add strict compiler settings for warnings and unused unsafe interop.
- Add internal unsafe interop helpers that are not exported from the main
  authoring API.

### Phase 2: Runtime API

- Implement `module`, `bootstrap`, and `injector` wrappers.
- Implement `NgModule` wrapper methods for values, services, factories,
  controllers, components, directives, and web components.
- Add token-backed explicit injection annotation support.
- Add typed Scala-to-JS config object builders.
- Add unsafe fallbacks in a separate package.

### Phase 3: Component Authoring

- Implement typed `Component` and controller wrappers.
- Support lifecycle hooks that map to AngularTS component hooks.
- Add examples for controller classes and function controllers.
- Add tests for template rendering and DI.
- Add compile-time examples that demonstrate typed DI failures are caught by
  the Scala compiler.

### Phase 4: Directive And Scope Support

- Implement typed `Directive` wrappers.
- Add `Scope` helper APIs for watch/listen/destroy operations.
- Add dynamic property escape hatches under explicitly unsafe APIs.
- Add tests for directive linking and teardown.

### Phase 5: Services And Runtime Facades

- Add typed facades for built-in AngularTS services covered by Dart.
- Add HTTP, REST, filters, animation, router, realtime, storage, worker, and
  cookie facades.
- Preserve unsupported or structurally dynamic mappings in the Scala namespace
  parity checklist with reasons.

### Phase 6: Web Components

- Implement Scala `WebComponent` config wrappers.
- Support inputs, shadow DOM, connected/disconnected hooks, and DOM event
  dispatch.
- Add typed web component event payload helpers.
- Add an example that publishes multiple web components from one AngularTS
  runtime.

### Phase 7: Tooling And CI

- Add Scala unit tests.
- Add a Scala.js example build check.
- Add browser smoke tests that compile Scala to JavaScript, load AngularTS, and
  verify a rendered app against the built `dist` runtime artifact.
- Add compiler-based type tests for DI tokens, component controllers,
  directives, and web component payloads.
- Preserve upstream TypeScript documentation as Scaladoc on equivalent public
  Scala types, callbacks, configuration objects, and methods.

### Phase 8: Namespace Parity And Publishing

- Add `integrations/scala/NG_NAMESPACE_PARITY.md`.
- Add a parity checker against `@types/namespace.d.ts`.
- Give every public `ng` namespace type an explicit Scala decision.
- Publish the package for Scala.js consumers.
- Document version compatibility with `@angular-wave/angular.ts`.
- Add official docs under the AngularTS docs site.

## Open Questions

- Whether runtime facade bindings should be generated from `.d.ts` or
  hand-curated for a Scala-friendly API.
- Whether the Scala package should publish only JVM build metadata plus JS
  artifacts, or also ship npm-side helpers for examples.
- How far typed injection helpers should go before requiring a list-based
  advanced API.
- How to represent structurally broad AngularTS config types without forcing
  normal users into `js.Dynamic`.
- Whether built-in service tokens should be generated from TypeScript
  declarations.

## Definition Of First-Class Support

The Scala integration is first class when:

- It is maintained in this repository.
- It is published as an official Scala.js package.
- It has official documentation and examples.
- CI verifies Scala compilation, tests, and at least one browser-rendered
  AngularTS app authored in Scala.
- Public Scala APIs are strict by default and use explicit unsafe escape hatches
  for dynamic AngularTS patterns.
- Every public `ng` namespace type has a Scala equivalent or documented parity
  decision.
- Equivalent public Scala types and methods preserve the upstream API
  documentation in Scaladoc form.
- AngularTS public API changes include Scala integration updates when needed.

## Implementation Status

- Package skeleton: planned.
- Typed DI tokens: planned.
- Typed module/component/directive/service/web component facade: planned.
- Browser example: planned.
- Namespace parity file: planned.
