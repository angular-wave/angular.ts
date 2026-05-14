# AngularTS Dart Integration Plan

## Goal

Make AngularTS a first-class Dart Web authoring target. Dart developers should
be able to write AngularTS applications from Dart using idiomatic Dart APIs,
while AngularTS remains the JavaScript runtime that owns templates, dependency
injection, scopes, directives, components, and web components.

The Dart integration is an official package maintained in this repository and
published separately to pub.dev.

First-class support includes feature parity with every type made public through
the AngularTS `ng` namespace. The parity source of truth is
`@types/namespace.d.ts`.

## Type Safety Principle

The Dart integration should be as precise and strict as the AngularTS runtime
contract allows. Public Dart APIs should prefer typed objects, typed callbacks,
generic return values, and closed option types over `dynamic`, stringly typed
maps, or raw JavaScript objects.

`dynamic` is allowed only as an explicit escape hatch for legacy
AngularJS-compatible behavior, unknown third-party services, or intentionally
untyped interop. Escape hatches must be named clearly and isolated from the
default authoring path.

## Package Shape

```text
integrations/
  dart/
    pubspec.yaml
    lib/
      angular_ts.dart
      src/
        bootstrap.dart
        component.dart
        directive.dart
        injector.dart
        module.dart
        runtime.dart
        scope.dart
        web_component.dart
    example/
      basic_app/
      web_components/
    test/
```

The npm package remains the source of the AngularTS runtime. The Dart package
wraps the runtime through Dart web interop and ships through Dart tooling.

## Core Runtime Requirements

AngularTS core must expose stable contracts for the Dart package:

- Stable ESM runtime exports for `module`, `bootstrap`, `injector`, and custom
  runtime creation.
- Stable public config object keys for components, directives, providers, and
  web components.
- Generated `.d.ts` declarations that describe the public JavaScript API.
- Closure externs for public runtime and config shapes, useful for advanced
  compilation ecosystems and as another API contract.
- A multi-element standalone web component API, for example
  `defineAngularElements({ webComponents: ... })`, so one runtime can publish
  many custom elements.
- A generated or checked inventory of the public `ng` namespace so Dart parity
  cannot drift silently.

## Dart Technology Choices

- Use `dart:js_interop` for JavaScript bindings.
- Use `package:web` for DOM types and browser APIs.
- Avoid `dart:html` in public APIs.
- Avoid exposing raw JavaScript objects in normal Dart usage.
- Avoid `dynamic` in public APIs unless the API is explicitly marked as an
  unsafe or legacy escape hatch.
- Use sealed classes, enums, generic wrappers, and typed builders where they
  make invalid AngularTS config impossible to express in Dart.
- Enable strict analyzer settings for the Dart package, including strong casts,
  strict inference, and strict raw type checks.

## Target Dart Authoring API

```dart
import 'package:angular_ts/angular_ts.dart' as ng;
import 'package:web/web.dart';

void main() {
  final app = ng.module('demo');

  final todoStore = ng.token<TodoStore>('todoStore');

  app.service(todoStore, TodoStore.new);

  app.component('todoList', ng.Component(
    template: '''
      <section>
        <button ng-click="\$ctrl.add()">Add</button>
        <p ng-repeat="todo in \$ctrl.todos">{{ todo.title }}</p>
      </section>
    ''',
    controller: ng.inject1(todoStore, TodoListController.new),
  ));

  ng.bootstrap(document.body!, [app.name]);
}
```

## Public Dart Surface

Initial package API:

- `ng.module(String name, [List<String> requires])`
- `ng.bootstrap(Element root, List<String> modules, {BootstrapConfig? config})`
- `Token<T> ng.token<T>(String name)`
- `NgModule.component<TController>(String name, Component<TController> options)`
- `NgModule.directive<TScope>(String name, Directive<TScope> options)`
- `NgModule.controller<TController>(String name,
  InjectableFactory<TController> controller)`
- `NgModule.service<TService>(Token<TService> token,
  InjectableFactory<TService> service)`
- `NgModule.factory<TValue>(Token<TValue> token,
  InjectableFactory<TValue> factory)`
- `NgModule.value<TValue>(Token<TValue> token, TValue value)`
- `NgModule.webComponent<TScope>(String name, WebComponent<TScope> options)`
- `Injector.get<T>(Token<T> token)`
- `Scope<TState>` wrappers for common scope operations.
- Explicit unsafe APIs such as `Injector.getUnsafe(String token)` and
  `Scope.unsafe` for migration cases.

Typed injection helpers should cover common arities without exposing string
arrays in normal application code:

- `ng.inject0(factory)`
- `ng.inject1(tokenA, factory)`
- `ng.inject2(tokenA, tokenB, factory)`
- Continue through the practical arities used by AngularTS services and
  controllers.
- `ng.injectUnsafe(tokens, jsFunction)` is the explicit higher-arity or legacy
  escape hatch and intentionally exposes a JavaScript function boundary.

## Interop Design

The Dart package should convert Dart declarations into JavaScript runtime shapes
at the boundary:

- Dart `Component` becomes the JavaScript component config object.
- Dart `Directive` becomes the JavaScript directive definition object or factory.
- Dart callbacks are converted to JS-callable functions.
- Component and controller factory results are exported as JS-visible view
  models for AngularTS templates through explicit JS-returning helpers such as
  `injectJs0` and `injectJs1`. Dart service/factory results remain typed Dart
  objects unless explicitly exported.
- Injection metadata is always explicit and token-backed. Dart function names
  must not be used for dependency injection.
- Public Dart APIs should not accept plain `Map<String, Object?>` for configs
  when a typed config object can describe the shape.
- Config builders should validate and preserve the relationship between
  controller, scope, bindings, and lifecycle hook types.
- Templates remain AngularTS template strings.
- JS object/property escape hatches are available for migration and advanced
  scenarios, but they are not the default API path.

## Strict Typing Targets

The first-class Dart package should provide precise types for:

- DI tokens and injector return values.
- Component controller factories and lifecycle hooks.
- Directive scope state, attributes, link functions, and teardown callbacks.
- Web component scope state, typed inputs, and event payloads.
- Bootstrap config and runtime options.
- Common AngularTS services exposed through typed tokens.

Where AngularTS behavior is inherently dynamic, the Dart package should model
that explicitly. For example, a typed `Scope<TState>` can expose known state
through `TState`, while unknown property access requires `scope.unsafe`.

## Web Component Authoring

Dart users should also be able to publish AngularTS-backed custom elements:

```dart
final app = ng.module('widgets');

app.webComponent('billing-summary', ng.WebComponent(
  shadow: true,
  inputs: {
    'accountId': ng.inputString(),
  },
  template: '<button ng-click="refresh()">{{ accountId }} / {{ status }}</button>',
  connected: (context) {
    context.scope.state.status = 'ready';
    context.scope.state.refresh = () {
      context.dispatch(BillingRefresh(status: context.scope.state.status));
    };
  },
));
```

## Phases

### Phase 1: Package Skeleton

- Add `pubspec.yaml`.
- Add `lib/angular_ts.dart`.
- Add minimal `dart:js_interop` runtime bindings.
- Add `package:web` dependency.
- Add strict analyzer configuration.
- Add internal unsafe interop helpers that are not exported from the main
  authoring API.

### Phase 2: Runtime API

- Implement `module`, `bootstrap`, and `injector` wrappers.
- Implement `NgModule` wrapper methods for values, services, factories,
  controllers, components, directives, and web components.
- Add token-backed explicit injection annotation support.
- Add typed Dart-to-JS config object builders.
- Add unsafe fallbacks in a separate namespace or library.

### Phase 3: Component Authoring

- Implement typed `Component` and controller wrappers.
- Support lifecycle hooks that map to AngularTS component hooks.
- Add examples for controller classes and function controllers.
- Add tests for template rendering and DI.
- Add compile-time examples that demonstrate typed DI failures are caught by the
  Dart analyzer.

### Phase 4: Directive And Scope Support

- Implement typed `Directive` wrappers.
- Add `Scope` helper APIs for watch/listen/destroy operations.
- Add dynamic property escape hatches under explicitly unsafe APIs.
- Add tests for directive linking and teardown.

### Phase 5: Web Components

- Implement Dart `WebComponent` config wrappers.
- Support inputs, shadow DOM, connected/disconnected hooks, and DOM event
  dispatch.
- Add typed web component event payload helpers.
- Add an example that publishes multiple web components from one AngularTS
  runtime.

### Phase 6: Tooling And CI

- Add `dart analyze`.
- Add Dart unit tests.
- Add browser smoke tests that compile Dart to JavaScript, load AngularTS, and
  verify a rendered app against the built `dist` runtime artifact.
- Add analyzer-based type tests for DI tokens, component controllers,
  directives, and web component payloads.
- Preserve upstream TypeScript documentation as Dartdoc on equivalent public
  Dart types, callbacks, configuration objects, and methods.
- Add an example build check for `integrations/dart/example/basic_app`.

### Phase 7: Publishing

- Publish as `angular_ts` on pub.dev.
- Document version compatibility with `@angular-wave/angular.ts`.
- Add release checklist steps for Dart package publishing.
- Add official docs under the AngularTS docs site.

## Open Questions

- Whether the Dart package should load AngularTS as an npm dependency through
  the host app or provide a prebuilt runtime asset for examples.
- Whether direct AngularTS runtime bindings should be generated from `.d.ts` or
  hand-curated for a Dart-friendly API.
- How to represent AngularTS scopes with maximal type precision while preserving
  required dynamic migration paths.
- Whether Dart users should be able to configure custom AngularTS runtimes from
  Dart in the first release, or whether that should follow after basic app
  authoring works.
- How far typed injection helpers should go before requiring a list-based
  advanced API.
- Whether to generate typed service tokens for built-in AngularTS services from
  TypeScript declarations.

## Definition Of First-Class Support

The Dart integration is first class when:

- It is maintained in this repository.
- It is published as an official Dart package.
- It has official documentation and examples.
- CI verifies Dart analysis, tests, and at least one browser-rendered AngularTS
  app authored in Dart.
- Public Dart APIs are strict by default and use explicit unsafe escape hatches
  for dynamic AngularTS patterns.
- Every public `ng` namespace type has a Dart equivalent or documented parity
  decision.
- Equivalent public Dart types and methods preserve the upstream API
  documentation in Dartdoc form.
- AngularTS public API changes include Dart integration updates when needed.

## Implementation Status

- Package skeleton: started.
- Strict analyzer configuration: started.
- Typed DI tokens: started.
- `inject0` through `inject8`: started.
- Typed module/component/directive/service/web component facade: started.
- Browser example: started.
- Dart validation: pending a local Dart SDK in this workspace.
