# AngularTS Dart Coverage

This integration is intentionally strict, but it is not yet complete. The first
implementation establishes package structure, typed DI tokens, fixed-arity
injection helpers, and a small AngularTS authoring path. First-class Dart
support requires covering the broader AngularTS runtime surface.

Feature parity is defined against every type exported through the public
AngularTS `ng` namespace. See [NG_NAMESPACE_PARITY.md](NG_NAMESPACE_PARITY.md)
for the type-by-type checklist.

## Current Status

| Area | Status | Notes |
| --- | --- | --- |
| Dart package skeleton | Started | `pubspec.yaml`, analyzer config, public library entrypoint. |
| Strict typed DI tokens | Started | `Token<T>`, public injection-token constants, `Injector.get<T>`, `inject0` through `inject8`. |
| Basic runtime APIs | Started | Global runtime wrapper covers module, bootstrap, injector, init, scope/injector/controller lookup, emit, and call. |
| Module registration API | Started | Dart wrappers exist for the AngularTS `NgModule` registration methods. Runtime behavior still needs integration tests. |
| Components | Started | Template, templateUrl, controller, bindings, require, and transclusion shapes. Needs lifecycle export helpers and runtime tests. |
| Controllers | Started | Typed factories supported. JS-visible view models require explicit `injectJs*` helpers. |
| Services/factories/values | Started | Token-backed registration exists. |
| Directives | Started | Restrict, compile, link/pre/post, controller, bindToController, priority, terminal, replace, require, scope, template, templateUrl, namespace, transclusion, and count shapes. Needs runtime tests. |
| Web components | Minimal | Basic inputs/template/connected. Needs full context, teardown, attribute hooks, typed events, shadow options. |
| Public data/config types | Started | HTTP, REST, router, animation, connection, realtime, cookie, storage, WebSocket, and WebTransport value shapes. Needs method-level runtime adapters. |
| Tests | Minimal | Analyzer and one Chrome unit test. Needs browser integration tests. |
| Demo | Started | Dart-authored todo demo page and Make target. |

## Started AngularTS Module API

These `NgModule` methods now have Dart facade coverage and still need deeper
runtime tests:

- `constant`
- `config`
- `run`
- `provider`
- `decorator`
- `animation`
- `filter`
- `state`
- `wasm`
- `worker`
- `store`
- `sse`
- `websocket`
- `webTransport`
- `topic`

## Started Runtime API

These runtime APIs now have Dart facade coverage and still need browser
integration tests:

- `angular.injector(...)`.
- `angular.init(...)`.
- `angular.getScope(...)`, `getInjector(...)`, `getController(...)`.
- `angular.emit(...)` and `angular.call(...)`.

## Missing Runtime API

- `AngularRuntime.createAngularBare` / custom runtime creation.
- `createAngularCustom` and custom `ng` module configuration.
- Runtime options such as `attachToWindow`, `registerBuiltins`, and `subapp`.

## Missing Typed Built-In Services

The Dart package has started exposing typed tokens and thin facades for built-in
services and providers. These facades still need method-level coverage:

- `$compile`
- `$controller`
- `$rootScope`
- `$scope`
- `$http`
- `$templateCache`
- `$templateRequest`
- `$parse`
- `$interpolate`
- `$filter`
- `$log`
- `$exceptionHandler`
- `$eventBus`
- `$location`
- `$anchorScroll`
- `$animate`
- `$sce`
- Router services such as `$state`, `$stateParams`, `$transitions`, and
  `$stateRegistry`.

## Missing Directive/Component Precision

- Component lifecycle export helpers: `$onInit`, `$onChanges`, `$doCheck`,
  `$onDestroy`, `$postLink`.
- Runtime validation for optional inputs and expression outputs.
- Runtime validation for typed `require` relationships.
- Runtime validation for typed transclusion.
- Runtime validation for directive compile/pre/post-link shapes.
- Full attribute helper methods on `Attributes`.
- Template URL and template request behavior.

## Missing Integration Quality

- Browser-rendered smoke test for the Dart todo demo.
- CI target for `make -C integrations/dart check`.
- CI target for `make -C integrations/dart example-build`.
- Documentation page in the AngularTS docs site.
- Version compatibility policy between the npm and pub packages.
- Generated API comparison against AngularTS `.d.ts` so Dart coverage does not
  silently drift.
- Generated parity comparison against `@types/namespace.d.ts` so every public
  `ng` type has a Dart status.

## Priority Order

1. Expand `NgModule` to cover the full module registration API.
2. Add custom runtime and injector APIs.
3. Add typed built-in service tokens for the core runtime.
4. Deepen component/directive typing.
5. Add browser integration tests for the Dart-authored demo.
6. Add generated coverage checks against TypeScript declarations.
