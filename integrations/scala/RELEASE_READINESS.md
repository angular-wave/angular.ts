# Scala.js Release Readiness Gate

This gate documents what the Scala.js integration can claim today and what must
remain out of a release announcement until publish-specific roadmap items close.

## Current Parity Scope

The Scala.js package currently covers:

- typed module creation and lookup;
- typed DI tokens and `inject0` through `inject6`;
- typed module registration for values, factories, services, controllers,
  directives, components, app components, persistent stores, and native
  web-component constructors;
- typed component, directive, app-component, `ScopeElement`, and
  `WebComponentContext` authoring surfaces;
- typed tokens/facades for core browser services already listed in
  `README.md`;
- core callable service facades and callback shapes already listed in
  `README.md`;
- public utility aliases and `NgModelController` facade already listed in
  `README.md`;
- ARIA, interpolation, SCE, security policy/config builders, and
  `NgModule.config(...)` bridges;
- `$eventBus`, `$sse`, `$websocket`, `$webTransport`, and `$worker` facades
  plus config builders;
- `$serviceWorker` facade plus registration/message config builders;
- `$security` facade plus security policy/config builders;
- `$state` facade, router config builders, and common state declarations;
- `NgModule.router(...)`, module route-tree declarations, and route policy,
  transition policy, and retention policy builders;
- `NgModule.lazyState(...)` lazy namespace registration with Scala
  state-declaration normalization;
- `$transitions` facade plus hook match criteria and hook registration option
  builders;
- `$rest`, REST resource declaration, backend, cache policy, cache store,
  options, and `NgModule.rest(...)` facades;
- `NgModule.model(...)`, typed app model values, lifecycle helpers, restore
  options, and `$sync` target builders;
- `$machine`, machine config, guard, transition, hook, snapshot, and
  `NgModule.machine(...)` facades;
- `$workflow`, workflow command, config, snapshot, state-engine, and
  `NgModule.workflow(...)` facades;
- workflow supervisor, persistence, recovery, worker protocol, worker
  host/client, and `NgModule.workflowSupervisor(...)` facades;
- namespace parity artifact generation and checking;
- unit tests for typed authoring builders and token names;
- browser smoke coverage for the basic Scala-authored AngularTS app.

## Known Gaps

- Remote repository credentials and push-to-registry automation are not wired.
  Local package verification is available through `make publish-local`.
- Future AngularTS public API additions must update Scala facades, tests, and
  namespace parity before the Scala package can claim compatibility with that
  AngularTS version.

## Release Gate

A Scala.js package can be considered release-ready only when:

- [x] `make check` passes from the repository root.
- [x] `make lint` passes from the repository root.
- [x] `make -C integrations/scala check` passes.
- [x] CI runs the Scala compile/test path on supported toolchain versions.
- [x] Scaladoc coverage for public package APIs is checked.
- [x] Remaining service facade gaps are either implemented or explicitly listed
      as unsupported for the release.
- [x] The release notes name the compatible AngularTS npm package version.
