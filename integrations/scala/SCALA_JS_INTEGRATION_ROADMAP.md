# Scala.js Integration Roadmap

AngularTS has a Scala integration plan (`integrations/scala/PLAN.md`) but no
tracked roadmap execution file yet. This document makes the work checkable and
ties it to Level-9 compatibility gates.

## Purpose

- make Scala.js a first-class official integration,
- maintain feature parity with public AngularTS authoring surface (`@types/namespace.d.ts`),
- keep the Scala API typed-first with explicit unsafe escape hatches,
- add executable docs/tests and publishable package checks.

## Progress Checklist

- [x] Phase 1: Package & build foundation
  - [x] Add/refresh `build.sbt`, Scala.js compiler settings, and package layout.
  - [x] Add minimal typed runtime facades and build tooling baseline.
  - [x] Add CI validation for Scala compile on supported toolchain versions.
  - [x] Publish a developer quickstart note for `sbt` bootstrap and local build.
- [x] Phase 2: Core AngularTS wrappers
  - [x] Implement typed wrappers for `module`, `bootstrap`, and injection helpers.
  - [x] Implement typed `NgModule` authoring API for service/component/directive
    registration in the idiomatic Scala path.
  - [x] Define and test explicit unsafe interop points separate from default API.
- [x] Phase 3: Authoring surface parity
  - [x] Add/verify typed `Component`, `Directive`, `Scope`, and `AppComponent`
    APIs.
  - [x] Add public authoring aliases for annotated factories, directive
    factories, controller constructors, transclusion, and public link functions.
  - [x] Add public namespace aliases for `AngularService` and
    `EventBusService`.
  - [x] Add typed `ScopeElement`/native `WebComponent` facade coverage.
  - [x] Add typed `$webComponent` service, `ElementScopeOptions`, and
    web-component input map coverage.
  - [x] Add typed Angular element option/definition metadata coverage for
    standalone custom-element runtime helpers.
  - [x] Add Scala-authored `ScopeElement` subclassing example and guidance.
  - [x] Implement typed controller injection helpers (`inject0`..`injectN`) and
    DI token API.
  - [x] Add examples that exercise common authoring flows without raw JS objects.
- [x] Phase 4: Runtime facade parity
  - [x] Add typed facades for built-in services (core + browser + router + storage
    + worker + cookie + http/rest + security + realtime/service workers where
    relevant).
  - [x] Add initial typed service facades and tokens for `$log`, `$location`, and
    `$cookie`.
  - [x] Add typed `$animate` facade, animation options/presets/handles, token,
    and `NgModule.animation(...)` helper coverage.
  - [x] Add typed core/browser service facades and tokens for `$anchorScroll`,
    `$exceptionHandler`, `$filter`, `$http`, `$interpolate`, `$templateCache`,
    `$templateRequest`, and DOM/root services.
  - [x] Add filter option aliases for collection, date, number, currency, and
    relative-time filter contracts.
  - [x] Add typed `$aria`, `$sce`, and `$sceDelegate` facades, tokens, and
    config builders, plus `NgModule.config(...)` bridges for `$aria`,
    `$interpolate`, `$sce`, and `$sceDelegate`.
  - [x] Add typed core callable service facades and tokens for `$compile`,
    `$controller`, `$parse`, `$httpParamSerializer`, plus `ScopeEvent`,
    `Validator`, transclusion, and public-link callback shapes.
  - [x] Add public utility aliases for `Expression`, `ClassMap`, `ClassValue`,
    `Injectable`, and `ListenerFn`, plus a typed `NgModelController` facade.
  - [x] Add typed `$eventBus` facade, token, and event-delivery policy config
    builder coverage.
  - [x] Add typed `$sse`, `$websocket`, and `$worker` facades, tokens, and config
    builder coverage.
  - [x] Add typed `$stream` facade, token, and stream read-option builder
    coverage.
  - [x] Add typed realtime protocol message/detail aliases and swap-mode
    coverage for SSE, websocket, and realtime directives.
  - [x] Add typed `$webTransport` facade, token, reconnect/transport config
    builder coverage, and close-info helper.
  - [x] Add typed `WebTransportOptions` and `NativeWebTransport` facades for
    native session visibility.
  - [x] Add typed `NgModule.store(...)`, `PersistentStoreConfig`, `StorageLike`,
    and `StorageType` coverage for AngularTS persistent stores.
  - [x] Add typed `StorageBackend`, `CookieStoreOptions`,
    `ErrorHandlingConfig`, and `$htmlCanvas` config builder coverage.
  - [x] Add typed `$serviceWorker` facade, token, registration/message config
    builders, and `NgModule.serviceWorker(...)` helper coverage.
  - [x] Add typed service-worker request/response/client/error facades for
    request-correlated messaging over `$serviceWorker`.
  - [x] Add typed `$wasm` facade, token, scope ABI/scope lifecycle facades,
    and `NgModule.wasm(...)` helper coverage.
  - [x] Add typed `$security` facade, token, security policy/config builders,
    and `NgModule.config(...)` security bridge coverage.
  - [x] Add typed `$state` facade, token, router config builders,
    `NgModule.state(...)`, and common `StateDeclaration` coverage.
  - [x] Add typed `NgModule.router(...)`, `RouterModuleDeclaration`, route-tree
    policy, transition-policy, and retention-policy builder coverage.
  - [x] Add typed `$view` facade and token coverage for advanced router view
    registry hooks.
  - [x] Add typed `NgModule.lazyState(...)` and lazy-loader normalization
    coverage for Scala state declarations and promised declarations.
  - [x] Add typed route-map aliases, typed state/transition aliases, and state
    resolve object/array builder coverage.
  - [x] Add typed `$transitions` facade, token, hook match criteria, hook
    registration options, and transition hook registration coverage.
  - [x] Add typed `$rest`, REST resource declaration, backend, cache policy,
    cache store, options, and `NgModule.rest(...)` coverage.
  - [x] Add typed `NgModule.model(...)`, `AppModelValue`, lifecycle,
    restore-option, and `$sync` target builder coverage for app-owned models.
  - [x] Add typed `$machine` facade, machine contract builders,
    `defineMachine(...)`, and `NgModule.machine(...)` coverage.
  - [x] Add typed `$workflow` facade, workflow command/config/snapshot
    builders, `defineWorkflow(...)`, `defineCommand(...)`, and
    `NgModule.workflow(...)` coverage.
  - [x] Add typed workflow supervisor, persistence, and worker-host/client
    protocol facades, plus `NgModule.workflowSupervisor(...)` coverage.
  - [x] Define decision notes for features that remain unsafe/explicitly untyped.
  - [x] Add namespace parity checker against `@types/namespace.d.ts`.
  - [x] Add Scala namespace parity artifact comparable to other language integrations.
- [x] Phase 5: Tooling, docs, and smoke validation
  - [x] Add Scala examples for components, directives, services, and web components.
  - [x] Add browser smoke test that builds Scala examples and executes against a
    built AngularTS `dist` artifact.
  - [x] Add test coverage for DI token injection and typed authoring config
    builders.
  - [x] Add test coverage for directive lifecycle and component event/model
    interactions.
  - [x] Add Scaladoc coverage checks for public API paths.
- [x] Phase 6: Release and maintenance
  - [x] Create/refresh `README` with publish instructions, versioned compatibility,
    and migration notes.
  - [x] Define ownership and review cadence for generated façade updates.
  - [x] Add final release readiness gate documenting parity scope and known gaps.

## Open Decisions

- Scala namespace parity is closed for the current public `ng` namespace:
  `NG_NAMESPACE_PARITY.md` has no `planned` entries.
- Scala release metadata now names package coordinates and compatible AngularTS
  runtime version. Remote publish credentials/automation remain deliberately
  unwired until an explicit release operation.
- Advanced or provider-era DI plumbing remains outside the default Scala API
  unless it is promoted through `UNSAFE_SURFACE_DECISIONS.md`.
