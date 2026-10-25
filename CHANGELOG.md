# Changelog

## [Unreleased]

- Modernized `$location` URL normalization, deferred history writes, and listener
  cleanup. Preserved router integration in HTML5 and hash modes; fixed state-only
  updates, failed-write retries, router replacement navigation, and initial URL
  normalization without adding a history entry or losing state.

- Updated vulnerable development dependencies across the framework, docs, and
  VS Code extension. Hardened HarmonyOS bridge script serialization and audit
  parsing; pinned CI to Ubuntu 24.04 and bootstrapped missing OpenHarmony build
  tools.

- Removed obsolete commented-out test suites and restored supported cases using
  the current browser and reactive test harnesses. Fixed dynamic option labels,
  validator expression updates, and cleanup of removed select options exposed
  by the restored assertions.

- Added controller binding type checks to directive registration, including
  `bindToController` maps and `scope` bindings with `bindToController: true`.
  Inferred controllers validate binding names and callable `&` properties;
  independent scope bindings and existing binding syntax remain supported.

- Simplified `ng-options` value parsing and fixed object selections when a
  collection, grouping, or disabled expression contains `" as "`. Preserved
  value mapping, grouping, disabled options, object iteration, and multiple
  selection; documented ordinary `ng-repeat`/`ng-value` options for simple lists.

- Component registration now infers controller types to check binding names and
  callback properties. Preserved HTML binding syntax, optional bindings,
  attribute aliases, and function-valued inputs, with typed callback locals in
  controller code and programmatic views.

- **Breaking:** Removed 29 obsolete named HTML factories, including `applet`,
  `blink`, and `font`, from ESM exports and all generated language integrations.
  Use generic `tag()` for legacy element names.

- Added the opt-in `canvasModule` and `ng-canvas` directive for native canvas
  sizing, redraw scheduling, retained-view suspension, and teardown. Added
  pointer event bindings, an interactive chart example, and the Flappy Bird
  concept with a reactive session machine and persisted preferences.

- **Breaking:** Modernized `$http` around Fetch: use native `signal` cancellation,
  numeric `timeout`, and `credentials` modes. Renamed response and error
  `xhrStatus` to `transportStatus`; removed `eventHandlers` and
  `uploadEventHandlers`. Updated HTTP directives, documentation, and language
  bindings, and fixed cancellation during response-body reads.

- Updated compiler and interpolation terminology for binding policies, including
  the `bindingContext` parameter, documentation, examples, and language bindings.

## [0.37.0] - 2026-10-06

- **Breaking:** Removed `$sce`, `$sceDelegate`, and their trusted-value wrappers.
  Configure HTML, URL, resource, media, and script policies through `$compile`;
  nonempty HTML and script strings require explicit policy callbacks.
- Added `angular.getModel(name)` to lazily create and retrieve shared reactive
  models from external code. Updated language bindings and examples for the
  getter and compiler policies.
- Added the portable HarmonyOS bridge with ArkUI element contracts, navigation
  and capability adapters, versioned HAR packages, and kitchen-sink and Pulse
  samples. Added OHPM publication and consumer verification tooling.
- Improved reactive bindings and scheduling. Fixed watcher cleanup, repeat
  callback contexts, nonbubbling and cross-document events, and router paint
  scheduling.
- Updated Android dependencies and protocol fixtures, with strict lint, clean
  Maven consumer, reproducibility, and signing checks.
- Fixed browser test server crashes when the system's file-watcher limit is
  exhausted.

## [0.36.0] - 2026-09-13

- Added Angular Native Android navigation, components, platform capabilities, and optional UI artifacts.
- Added Android Maven publication, isolated staged R8 consumers, reproducibility checks, and device CI.
- Added predictive-back transitions, portable emulator coverage, and optional physical-device evidence.
- Added signed public-artifact verification, device StrictMode and memory-pressure checks, and reliable offline fallback.
- Updated Android dependencies, Maven publishing, and Java 21 test isolation for strict warning-free release checks.
- Made Android Maven archives deterministic, restored the complete CI gate, and rejected stale release preparation.

## [0.35.5] - 2026-09-06

- Fixed pre-1.0 Hex publication and made release checks verify the published tarball.

## [0.35.4] - 2026-09-06

- Fixed Dart publication validation so it does not depend on a Playwright browser already being installed.

## [0.35.3] - 2026-09-06

- Fixed Dart scope conversion across supported SDK versions and added pre-publication Dart and Gleam CI gates.
- Improved the Gleam package documentation shown on Hex.
- Removed release-version literals from integration documentation tests.

## [0.35.2] - 2026-09-06

- Fixed Dart 3.6 conversion of JavaScript-backed scope state.

## [0.35.1] - 2026-09-06

- Fixed Dart namespace parity and strengthened cross-integration release validation.

## [0.35.0] - 2026-09-05

- Replaced overloaded `angular.module()` with explicit `angular.createModule()` and `angular.getModule()` APIs.
- Replaced argument-dependent getter/setter APIs across SCE, compiler configuration, model options, DOM data, location, and router state lookup.
- Added `ng-model` support for geolocation and typed tag factories across maintained integrations, including WebAssembly.
- Fixed listener scheduling when a watcher deregisters while its notification task is flushing.
- Improved integration setup documentation and published-package examples.
- Added synchronized major, minor, and patch release preparation across package integrations.

## [0.34.0] - 2026-08-29

- Finalized type-safe Programmatic View APIs and view contexts across integrations.
- Added qualified state names and router error boundaries.
- Published Scala.js, Dart, and Gleam packages.
- Made the Java artifact directly consumable by J2CL.
- Removed compatibility aliases and stale documentation.

## [0.33.2] - 2026-08-27

- Added type-safe programmatic views for components and directives.
- Hardened scope reactivity, native collection change detection, and event propagation.
- Added independently tree-shakable machine, workflow, SSE, WebSocket, and WebTransport runtime modules.
- Improved custom runtime composition cleanup and duplicate-module handling.
- Simplified validation and exception ownership; renamed error formatting configuration.
- Expanded Java, ClojureScript, Kotlin, Scala, Dart, Gleam, Closure, and WASM integration parity.
- Added Maven Central publishing for the Java and ClojureScript distributions.
- Fixed Maven release Javadocs and added an early credential preflight.
- Reworked the beginner guides, practical cookbook, integration guides, and API navigation.

## [0.32.0] - 2026-08-15

- Improved asynchronous reactivity and nested component binding propagation.
- Improved compiler, incremental compilation, and template loading performance.
- Added router prefetching with optional Service Worker relay.
- Unified cache strategies across HTTP and REST.
- Added `$storage` and `$workflowSupervisor` services.
- Added `ng-patch` directive.
- Enforced explicit dependency injection annotations.

## [0.31.0] - 2026-07-19

- Added DOM-independent application contexts and injectable reactive models.
- Redesigned machines, workflows, supervisors, policies, and security.
- Modernized the router with typed state trees, policies, retention, and tooling.
- Added custom runtime composition and incremental DOM compilation.
- Added managed Worker, Service Worker, realtime, and HTML-in-Canvas support.
- Hardened WebAssembly and expanded typed language integrations.
- Simplified the public API and removed legacy compatibility surfaces.
- Required explicit dependency injection annotations.
