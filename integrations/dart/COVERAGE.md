# AngularTS Dart Coverage

This integration is intentionally strict, but it is not yet complete. The
package now has generated raw coverage for the public AngularTS `ng` namespace
and a growing handwritten Dart layer for typed authoring APIs. First-class Dart
support still requires deeper ergonomic wrappers and browser integration tests.

Feature parity is defined against every type exported through the public
AngularTS `ng` namespace. See [NG_NAMESPACE_PARITY.md](NG_NAMESPACE_PARITY.md)
for the type-by-type checklist.

## Coverage Layers

Generated raw coverage:

- Source of truth: `@types/namespace.d.ts`.
- Output: `lib/src/generated/ng_facades.dart`.
- Purpose: keep low-level JavaScript member access complete and deterministic.
- Contract: `make generate-check` fails when generated output is stale.

Handwritten ergonomic coverage:

- Source files: `lib/src/*.dart` outside `lib/src/generated/`.
- Purpose: expose Dart-native value objects, typed tokens, typed factories,
  curated service facades, and conversion helpers.
- Contract: handwritten wrappers may extend generated facades when the
  generated member shape is compatible. Members with stronger Dart signatures
  remain handwritten and are listed in `tool/generator-overrides.json`.
  Platform type mappings, such as DOM and stream objects from `package:web`,
  and narrow parameter mappings, such as generated `Scope<Object?>` arguments,
  also live in `tool/generator-overrides.json`.
  `tool/check_generated_base_usage.mjs` fails when a handwritten facade bypasses
  an available generated base, and `tool/check_manual_overrides.mjs` fails when
  an explicit manual member override has no handwritten Dart member. Current
  member parity is fully generated, with no manual or unsupported overrides.

Parity checks:

- Type parity: `tool/check_ng_namespace_parity.dart`.
- Member parity: `tool/check_ng_namespace_members.mjs`.
- Manual override integrity: `tool/check_manual_overrides.mjs`.
- Manual and unsupported member overrides must be explicit member names; broad
  `Type.*` entries are rejected by member parity.
- Override metadata integrity: unknown, incorrectly shaped, malformed,
  unsorted, invalid rename, and empty sections fail member parity.
- Type override integrity: stale `types` and `parameterTypes` entries fail
  member parity.
- Generated-base inheritance: `tool/check_generated_base_usage.mjs`.
- Full contract: `make check`.

## Current Status

| Area | Status | Notes |
| --- | --- | --- |
| Dart package skeleton | Started | `pubspec.yaml`, analyzer config, public library entrypoint. |
| Generated raw facades | Started | `ng` namespace raw facades are generated from TypeScript declarations and checked for freshness. |
| Strict typed DI tokens | Started | `Token<T>`, public injection-token constants, `Injector.get<T>`, `inject0` through `inject8`. |
| Basic runtime APIs | Started | Global runtime wrapper covers module, bootstrap, injector, init, scope/injector/controller lookup, emit, and call. |
| Module registration API | Started | Dart wrappers exist for the AngularTS `NgModule` registration methods. Runtime behavior still needs integration tests. |
| Components | Started | Template, templateUrl, controller, bindings, require, and transclusion shapes. Needs lifecycle export helpers and runtime tests. |
| Controllers | Started | Typed factories supported. JS-visible view models require explicit `injectJs*` helpers. |
| Services/factories/values | Started | Token-backed registration exists. |
| Directives | Started | Restrict, compile, link/pre/post, controller, bindToController, priority, terminal, replace, require, scope, template, templateUrl, namespace, transclusion, and count shapes. Needs runtime tests. |
| Web components | Minimal | Basic inputs/template/connected. Needs full context, teardown, attribute hooks, typed events, shadow options. |
| Public data/config types | Started | HTTP, REST, router, animation, connection, realtime, cookie, storage, WebSocket, and WebTransport value shapes. Needs method-level runtime adapters. |
| Tests | Started | Analyzer, Chrome unit tests, namespace parity checks, generated freshness checks, generated-base and manual-override guards, and runtime demo smoke test. Needs broader browser integration tests. |
| Demo | Started | Dart-authored todo demo page, compile target, and Playwright smoke test against `dist`. |

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

## Built-In Service Coverage

The Dart package has started exposing typed tokens and thin facades for built-in
services and providers. Generated raw facades cover the public member surface;
handwritten ergonomic coverage is still incomplete for several services:

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
- Template URL and template request behavior.

## Missing Integration Quality

- Documentation page in the AngularTS docs site.
- Version compatibility policy between the npm and pub packages.
- Broader browser integration tests beyond the todo demo smoke test.
- Published CI workflow wiring for `make -C integrations/dart check`, if this
  package is checked separately from the root repository pipeline.

## Priority Order

1. Expand `NgModule` to cover the full module registration API.
2. Add custom runtime and injector APIs.
3. Add typed built-in service tokens for the core runtime.
4. Deepen component/directive typing.
5. Add browser integration tests beyond the Dart-authored demo smoke test.
6. Maintain generated facade inheritance and manual override guards as the
   public `ng` namespace evolves.
