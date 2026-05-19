# AngularTS Kotlin Implementation Roadmap

This roadmap makes `integrations/kotlin` a first-class Kotlin/JS integration
that develops alongside `integrations/dart` and reaches feature parity with the
public AngularTS `ng` namespace.

The roadmap is executable: each phase lists concrete files, implementation
tasks, and acceptance commands. Do not mark a phase complete until its commands
pass locally and in CI.

Execution markers:

- `[ ]` work item is not started.
- `[x]` work item is complete.
- `[gate]` command or condition that must pass before closing the phase.
- `[blocked]` work item needs an upstream decision or dependency before it can
  proceed.

## Contract

The source of truth is the generated TypeScript declaration:

```text
@types/namespace.d.ts
```

Kotlin is parity-complete when every public `ng` namespace type is either:

- represented by a generated Kotlin/JS external facade;
- represented by a handwritten ergonomic Kotlin API;
- represented by a Kotlin platform/browser type;
- explicitly listed as unsupported with a reason and an unsafe fallback.

The Dart integration is the reference implementation for process and coverage,
not for API shape. Kotlin should reuse the Dart strategy where it is useful:

- generated raw facade layer from `@types/namespace.d.ts`;
- small handwritten ergonomic authoring layer;
- checked parity inventory;
- checked generated output freshness;
- explicit unsafe interop package.

## Non-Negotiable API Rules

- Public Kotlin APIs prefer typed wrappers, value classes, sealed interfaces,
  enums, data classes, DSL builders, and typed callbacks.
- `dynamic`, raw `js()`, and untyped JavaScript objects are allowed only under
  `angular.ts.unsafe`.
- Dependency injection must use token-backed helpers in normal authoring code.
- String injection arrays are a low-level compatibility detail, not the primary
  Kotlin API.
- Templates remain AngularTS templates; Kotlin owns registration, config, DI,
  controllers, services, and typed wrapper APIs.
- Kotlin must bind against the same built `dist` runtime that Dart examples use.

## Target Layout

```text
integrations/kotlin/
  settings.gradle.kts
  build.gradle.kts
  Makefile
  README.md
  NG_NAMESPACE_PARITY.md
  KOTLIN_BINDING_GENERATION_ROADMAP.md
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
    generated/NgFacades.kt
    unsafe/Unsafe.kt
  src/jsTest/kotlin/angular/ts/
    AngularTsTest.kt
  examples/basic_app/
    build.gradle.kts
    src/jsMain/kotlin/Main.kt
    web/index.html
  tool/
    generate_kotlin_bindings.mjs
    check_generated_bindings.mjs
    check_ng_namespace_parity.mjs
    check_ng_namespace_members.mjs
    generator-overrides.json
```

## Make Targets

Add these targets in phase 1 and keep them stable:

```make
.PHONY: all deps format format-check test generate generate-check parity check runtime-build example-build runtime-test demo clean

GRADLE ?= gradle
NODE ?= node
PLAYWRIGHT ?= ../../node_modules/.bin/playwright

all: check

deps:
	$(GRADLE) kotlinNpmInstall

format:
	$(GRADLE) formatKotlin

format-check:
	$(GRADLE) checkKotlinFormat

test:
	$(GRADLE) jsBrowserTest

generate:
	$(NODE) tool/generate_kotlin_bindings.mjs
	$(GRADLE) formatKotlin

generate-check:
	$(NODE) tool/check_generated_bindings.mjs

parity:
	$(NODE) tool/check_ng_namespace_parity.mjs
	$(NODE) tool/check_ng_namespace_members.mjs

runtime-build:
	$(MAKE) -C ../.. build

example-build:
	$(GRADLE) :examples:basic_app:jsBrowserProductionWebpack

runtime-test: runtime-build example-build
	$(PLAYWRIGHT) test --config playwright.config.ts

check: generate-check format-check test parity runtime-test
```

If the repo does not adopt ktlint, replace `format` and `format-check` with the
selected Kotlin formatter before phase 1 is marked complete.

## Phase 0: Namespace Inventory

Goal: create the parity contract before implementing wrappers.

Status: `[x]`

Files:

```text
integrations/kotlin/NG_NAMESPACE_PARITY.md
integrations/kotlin/tool/check_ng_namespace_parity.mjs
integrations/kotlin/tool/check_ng_namespace_members.mjs
integrations/kotlin/tool/generator-overrides.json
```

Tasks:

- [x] Parse `@types/namespace.d.ts` with the TypeScript compiler API.
- [x] Find `export namespace ng`.
- [x] Emit a sorted inventory of every public type.
- [x] Start every type as `planned`, `alias`, `generated`, `manual`, `review`, or
  `unsupported`.
- [x] Mirror the Dart categories so comparisons stay obvious: core, providers,
  services, HTTP and REST, filters, animation, router, realtime and
  connections, wasm, web components, storage/workers/misc.
- [x] Add a member-level checker that verifies public members are generated,
  manually covered, or explicitly ignored.

Acceptance:

```sh
# [gate]
node integrations/kotlin/tool/check_ng_namespace_parity.mjs
node integrations/kotlin/tool/check_ng_namespace_members.mjs
```

Done when:

- [x] adding a new public `ng` type to `@types/namespace.d.ts` fails the Kotlin
  parity check until `NG_NAMESPACE_PARITY.md` is updated;
- [x] removing or renaming a public member fails the member checker until overrides
  or wrappers are updated.

## Phase 1: Kotlin/JS Package Skeleton

Goal: make `integrations/kotlin` build and test as an empty integration.

Status: `[x]`

Files:

```text
integrations/kotlin/settings.gradle.kts
integrations/kotlin/build.gradle.kts
integrations/kotlin/Makefile
integrations/kotlin/README.md
integrations/kotlin/src/jsMain/kotlin/angular/ts/AngularTS.kt
integrations/kotlin/src/jsMain/kotlin/angular/ts/unsafe/Unsafe.kt
integrations/kotlin/src/jsTest/kotlin/angular/ts/AngularTsTest.kt
```

Tasks:

- [x] Configure Kotlin/JS IR for browser output.
- [x] Add strict compiler options and explicit API mode if practical.
- [x] Add npm wiring so Kotlin can import the repository's built AngularTS runtime.
- [x] Add a tiny smoke test that imports the Kotlin package and asserts the test
  harness runs.
- [x] Add `Makefile` targets listed above, even if some are placeholders until
  later phases.

Acceptance:

```sh
# [gate]
make -C integrations/kotlin deps
make -C integrations/kotlin format-check
make -C integrations/kotlin test
make -C integrations/kotlin check
```

Done when:

- [x] the package has no handwritten dynamic public APIs outside
  `angular.ts.unsafe`;
- [x] `make -C integrations/kotlin check` is the canonical local gate.

## Phase 2: Generated Raw Facades

Goal: generate the low-level Kotlin/JS boundary from the same TypeScript
namespace source that Dart uses.

Status: `[x]`

Files:

```text
integrations/kotlin/tool/generate_kotlin_bindings.mjs
integrations/kotlin/tool/check_generated_bindings.mjs
integrations/kotlin/tool/generator-overrides.json
integrations/kotlin/src/jsMain/kotlin/angular/ts/generated/NgFacades.kt
integrations/kotlin/KOTLIN_BINDING_GENERATION_ROADMAP.md
```

Generator requirements:

- [x] Parse `@types/namespace.d.ts`.
- [x] Generate deterministic Kotlin source.
- [x] Emit `external interface` or `external class` declarations only in
  `angular.ts.generated`.
- [x] Avoid exposing generated raw facades from the top-level ergonomic package
  unless a facade is intentionally stable enough to be public.
- [x] Support override metadata for renames, manual members, unsupported members,
  platform type mappings, return type fixes, and reserved Kotlin identifiers.

Initial TypeScript to Kotlin mapping:

| TypeScript | Kotlin generated type |
| --- | --- |
| `string` | `String` |
| `boolean` | `Boolean` |
| `number` | `Double` |
| integer override | `Int` |
| `void` | `Unit` |
| `Promise<T>` | `Promise<JsAny?>` or `Promise<dynamic>` |
| arrays | `ReadonlyArray<JsAny?>` or `Array<dynamic>` |
| broad unions | `dynamic` in generated layer only |
| unknown/dynamic | `dynamic` in generated layer only |
| function types | generated `FunctionN` facade or `dynamic` |
| DOM types | Kotlin web types through overrides |

Acceptance:

```sh
# [gate]
make -C integrations/kotlin generate
make -C integrations/kotlin generate-check
make -C integrations/kotlin parity
make -C integrations/kotlin check
```

Done when:

- [x] generated output is deterministic;
- [x] stale generated output fails `generate-check`;
- [x] missing public namespace members fail `parity`;
- [x] generated raw dynamic does not leak into the handwritten top-level API.

## Phase 3: Ergonomic Core Authoring API

Goal: implement the small handwritten API Kotlin users should actually use.

Status: `[x]`

Files:

```text
src/jsMain/kotlin/angular/ts/Token.kt
src/jsMain/kotlin/angular/ts/Injectable.kt
src/jsMain/kotlin/angular/ts/Module.kt
src/jsMain/kotlin/angular/ts/Bootstrap.kt
src/jsMain/kotlin/angular/ts/Injector.kt
src/jsMain/kotlin/angular/ts/Runtime.kt
```

Public API target:

```kotlin
val app = ng.module("demo")
val todoStore = ng.token<TodoStore>("todoStore")

app.service(todoStore, ng.inject0 { TodoStore() })
app.factory(todoStore, ng.inject0 { TodoStore() })
app.value(todoStore, TodoStore())

ng.bootstrap(document.body ?: error("missing body"), listOf(app.name))
```

Tasks:

- [x] Implement `ng.module(name, requires)`.
- [x] Implement `ng.bootstrap(root, modules, config)`.
- [x] Implement `ng.token<T>(name)`.
- [x] Implement `NgModule.value`, `factory`, `service`, `controller`,
  `component`, `directive`, and `webComponent` as typed entry points.
  - [x] `value`
  - [x] `factory`
  - [x] `service`
  - [x] `controller`
  - [x] `component`
  - [x] `directive`
  - [x] `webComponent`
- [x] Implement `Injector.get<T>(token)`.
- [x] Implement injection helpers:
  - [x] `ng.inject0(factory)`
  - [x] `ng.inject1(tokenA, factory)`
  - [x] `ng.inject2(tokenA, tokenB, factory)`
  - [x] continue to the highest arity needed by AngularTS built-ins;
  - [x] `ng.injectUnsafe(tokens, jsFunction)` in `angular.ts.unsafe`.
- [x] Convert typed injection helpers into AngularTS-compatible `$inject` metadata.

Acceptance:

```sh
# [gate]
make -C integrations/kotlin test
make -C integrations/kotlin parity
make -C integrations/kotlin check
```

Done when:

- [x] a Kotlin service can be registered and injected without handwritten string
  token arrays;
- [x] unsafe injection requires importing `angular.ts.unsafe`.

## Phase 4: Components, Directives, Scope

Goal: cover AngularTS authoring primitives.

Status: `[x]`

Files:

```text
src/jsMain/kotlin/angular/ts/Component.kt
src/jsMain/kotlin/angular/ts/Directive.kt
src/jsMain/kotlin/angular/ts/Scope.kt
```

Tasks:

- [x] Implement `Component<TController>` config builder.
- [x] Implement controller construction helpers that expose template-visible
  properties intentionally.
- [x] Map component lifecycle hooks to typed Kotlin callbacks.
- [x] Implement `Directive<TScope>` config builder.
- [x] Implement typed link/pre-link/post-link wrappers.
- [x] Implement `Scope<TState>` helpers for `watch`, `on`, `emit`,
  `broadcast`, `merge`, child scopes, isolate child scopes, and `destroy`.
- [x] Add explicit `scope.unsafe` for dynamic property access.

Acceptance:

```sh
# [gate]
make -C integrations/kotlin test
make -C integrations/kotlin runtime-test
make -C integrations/kotlin parity
```

Done when:

- [x] a Kotlin component renders through AngularTS templates in a browser test;
- [x] a Kotlin directive links in a browser test;
- [x] dynamic scope access is isolated under `unsafe`.

## Phase 5: Built-In Service Facades

Goal: expose Kotlin equivalents for the public `ng` service/provider surface.

Status: `[x]`

Implement in this order:

1. [x] Core services and providers:
   `Angular`, `NgModule`, `InjectorService`, `ProvideService`, `Scope`,
   `RootScopeService`, `CompileService`, `ControllerService`,
   `AttributesService`, `ParseService`, `InterpolateService`,
   `ExceptionHandlerService`, `LogService`.
2. [x] Browser and storage services:
   `AnchorScrollService`, `AriaService`, `CookieService`, `LocationService`,
   `TemplateCacheService`, `TemplateRequestService`, `StorageBackend`.
3. [x] Filters:
   `FilterService`, `FilterProvider`, `FilterFn`, filter option records.
4. [x] HTTP and REST:
   `HttpService`, `HttpPromise`, `HttpResponse`, `RequestConfig`,
   `RestService`, `RestRequest`, `RestResponse`, cache options.
5. [x] Router:
   `StateService`, `StateRegistryService`, `TransitionService`, `Transition`,
   `StateDeclaration`, resolve shapes.
6. [x] Realtime:
   `SseService`, `WebSocketService`, `WebTransportService`,
   connection configs/events/messages.
7. [x] Animation:
   `AnimateService`, `AnimationHandle`, presets, phases, result/context types.
8. [x] Worker and wasm:
   `WorkerConfig`, `WorkerConnection`, `WasmService`, wasm ABI/config types.

Tasks for each group:

- [x] Prefer generated raw facade inheritance/delegation for simple members.
- [x] Add handwritten Kotlin DSLs only where they improve safety or hide dynamic JS
  config shapes.
- [x] Update `NG_NAMESPACE_PARITY.md`.
- [x] Update `generator-overrides.json` for manual or unsupported members.
- [x] Add tests for at least one representative service call in the group.

Acceptance for each group:

```sh
# [gate]
make -C integrations/kotlin generate
make -C integrations/kotlin generate-check
make -C integrations/kotlin test
make -C integrations/kotlin parity
make -C integrations/kotlin check
```

Done when:

- [x] every public `ng` type in the group is marked `generated`, `manual`, `alias`,
  or `unsupported`;
- [x] no group is considered complete with only an unsafe fallback.

## Phase 6: Web Components

Goal: support AngularTS-backed custom elements from Kotlin.

Status: `[ ]`

Files:

```text
src/jsMain/kotlin/angular/ts/WebComponent.kt
examples/web_components/
```

Tasks:

- [ ] Implement `WebComponent<TState>` builder.
- [ ] Support inputs, input aliases, shadow DOM, lifecycle hooks, and typed custom
  event dispatch.
- [ ] Implement `AngularElementOptions`, `AngularElementDefinition`, and related
  runtime wrappers.
- [ ] Add an example that publishes at least two custom elements from one runtime.

Acceptance:

```sh
# [gate]
make -C integrations/kotlin example-build
make -C integrations/kotlin runtime-test
make -C integrations/kotlin parity
```

Done when:

- [ ] browser tests instantiate Kotlin-authored custom elements and verify inputs,
  rendered DOM, and dispatched events.

## Phase 7: Examples And Runtime Tests

Goal: prove Kotlin apps work against the built AngularTS runtime artifact.

Status: `[ ]`

Files:

```text
integrations/kotlin/playwright.config.ts
integrations/kotlin/examples/basic_app/
integrations/kotlin/examples/web_components/
```

Tasks:

- [ ] Add a basic app that registers a service, component, directive, and filter.
- [ ] Add a web component example.
- [ ] Compile each example through Kotlin/JS production webpack.
- [ ] Serve examples through the repository dev server.
- [ ] Add Playwright tests that load the examples and assert visible AngularTS
  behavior.

Acceptance:

```sh
# [gate]
make -C integrations/kotlin runtime-build
make -C integrations/kotlin example-build
make -C integrations/kotlin runtime-test
make -C integrations/kotlin check
```

Done when:

- [ ] runtime tests fail if the root AngularTS `dist` artifact is stale or
  incompatible with Kotlin wrappers.

## Phase 8: CI And Release Readiness

Goal: make Kotlin maintenance part of the normal integration workflow.

Status: `[ ]`

Tasks:

- [ ] Add Kotlin `check` to the repository integration CI matrix.
- [ ] Cache Gradle and Kotlin/JS npm dependencies.
- [ ] Document prerequisites in `integrations/kotlin/README.md`.
- [ ] Add publishing metadata, but keep publishing manual until parity is green.
- [ ] Add a release checklist that includes:
  - [ ] regenerate bindings;
  - [ ] run Kotlin check;
  - [ ] run Dart check;
  - [ ] compare Kotlin and Dart parity files for newly introduced public types;
  - [ ] run root build.

Acceptance:

```sh
# [gate]
make -C integrations/kotlin check
make -C integrations/dart check
make build
```

Done when:

- [ ] Kotlin is blocked by the same namespace drift failures as Dart;
- [ ] Kotlin examples are tested against `dist`;
- [ ] release notes can list Kotlin as supported without caveats beyond explicitly
  documented unsupported namespace entries.

## Phase 9: Public Namespace Closure

Goal: close all non-unsupported entries in `NG_NAMESPACE_PARITY.md`.

Status: `[ ]`

Tasks:

- [ ] Work through the parity file by category.
- [ ] Do not close a type until member-level coverage is green.
- [ ] Convert `review` entries into `generated`, `manual`, `alias`, or
  `unsupported`.
- [ ] For every `unsupported` entry, document:
  - [ ] why Kotlin cannot model it safely yet;
  - [ ] the unsafe fallback;
  - [ ] the issue or follow-up phase that would remove the limitation.

Acceptance:

```sh
# [gate]
make -C integrations/kotlin parity
make -C integrations/kotlin check
```

Done when:

- [ ] every public `ng` namespace type has an explicit Kotlin decision;
- [ ] no public type is reachable only through undocumented `dynamic` usage;
- [ ] Kotlin and Dart parity files both fail on the same upstream namespace drift.

## Suggested Work Order

1. Phase 0 namespace inventory and parity checker.
2. Phase 1 Kotlin package skeleton and Makefile.
3. Phase 2 generated raw facade layer.
4. Phase 3 tokens, injection helpers, module registration, bootstrap.
5. Phase 4 component/directive/scope authoring.
6. Phase 7 basic browser example, early.
7. Phase 5 service groups, one category at a time.
8. Phase 6 web components.
9. Phase 8 CI.
10. Phase 9 final namespace closure.

This order gives Kotlin a running app before chasing every service facade, while
still making namespace parity measurable from the start.
