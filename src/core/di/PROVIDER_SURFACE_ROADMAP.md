# Provider Surface Roadmap

AngularTS has diverged far enough from AngularJS that provider compatibility
should no longer decide the public authoring model. The historical provider
surface exists because early framework behavior was bolted to `$provide` and
provider objects during bootstrap. That implementation detail leaked into the
public namespace.

This roadmap separates internal DI construction from user-facing app
declaration and declarative configuration.

The global execution sequence is defined in
`src/GLOBAL_LEVEL_9_ROADMAP.md`. Provider redesign should not lead the work; it
should follow global decisions and proven vertical module slices.

The broader public API cleanup is tracked in
`src/PUBLIC_API_SURFACE_ROADMAP.md`. This document owns the provider-specific
classification and migration work.

Provider implementation must obey the implementation stoppages in
`src/PUBLIC_API_SURFACE_ROADMAP.md`, especially the public inventory, provider
inventory, configure API, documentation, generated surface, compatibility, and
internal recipe stoppages.

## Historical Injectable Model

The original AngularJS injectable model made `$provide` the registration
primitive:

- `provider(name, provider)`: registers an explicit provider object or
  constructor with `$get`.
- `constant(name, obj)`: registers a value available to providers and runtime
  services.
- `value(name, obj)`: registers a value available to runtime services only.
- `factory(name, fn)`: wraps a factory function in a provider whose `$get` is
  the factory.
- `service(name, Fn)`: wraps a constructor in a provider whose `$get`
  instantiates it.
- `decorator(name, decorFn)`: modifies or replaces another service.

That model remains valid internally: the injector resolves providers and calls
`$get` to create singleton services. The design problem is that helper-created,
config-free providers are implementation details. They should not automatically
become user-facing framework concepts.

AngularTS should preserve the useful internal distinction between provider,
factory, service, value, constant, and decorator while avoiding provider objects
as the default client authoring API.

## Goal

Move AngularTS toward this model:

- `NgModule`: the user-facing declaration surface.
- Internal provider recipes: how AngularTS builds services.
- Declarative config: how users configure framework behavior.

Providers may still exist internally. They should be public only when users
need meaningful config-time policy or registry behavior that is not better
expressed through `NgModule`.

## Non-Goals

- Do not preserve AngularJS provider compatibility as a primary design goal.
- Do not remove the internal DI provider mechanism.
- Do not do a flag-day removal of provider tokens without migration notes.
- Do not make users inject provider objects for common authoring workflows.
- Do not keep config-free providers public just because the injector uses them.
- Do not replace every provider with one generic `configure()` object before
  proving the shape works for existing policy services.

## Definitions

`Internal recipe provider`
: Provider shape needed only so the injector can construct a service.

`Registry provider`
: Provider that collects app declarations before runtime, such as directives,
components, filters, states, or animations.

`Policy provider`
: Provider that exposes meaningful framework policy, such as HTTP defaults,
location mode, SCE rules, logging, template request policy, or ARIA defaults.

`Config-free provider`
: Provider with no meaningful user-facing configuration. It should usually be
internal or documented as implementation detail.

`Legacy-public provider`
: Provider currently exported in the namespace or docs for historical reasons,
but not part of the intended long-term authoring path.

## Target Authoring Model

Users should normally declare structure and services through `NgModule`:

```js
app.component(name, options);
app.directive(name, factory);
app.controller(name, ctor);
app.filter(name, factory);
app.state(declaration);
app.machine(name, config);
app.workflow(name, config);
app.rest(name, url, Entity, options);
app.websocket(name, url, config);
app.worker(name, scriptUrl, config);
```

Users should configure framework behavior through a declarative config API
rather than direct provider mutation where practical:

```js
app.configure({
  http: {
    xsrfTrustedOrigins: ["https://api.example.test"],
    defaults: {
      withCredentials: true,
    },
  },
  location: {
    html5Mode: true,
    hashPrefix: "!",
  },
  log: {
    debug: false,
  },
});
```

The exact `configure()` shape is not committed by this roadmap. It must be
designed from provider inventory and tested against real provider behavior.

## Initial Classification

This classification is a starting point. Slice 1 must verify it against code,
docs, and tests.

### Internal Registry Providers

These should stay as injector/config-time machinery, while user-facing
registration moves through `NgModule` methods:

- `$compileProvider`
- `$controllerProvider`
- `$filterProvider`
- `$animateProvider`
- `$stateProvider`
- `$stateRegistryProvider`
- `$templateFactoryProvider`
- `$viewProvider`
- `$transitionsProvider`
- `$restProvider`

Notes:

- Registry providers may stay injectable for internal module processing.
- Public docs should prefer `app.directive()`, `app.component()`,
  `app.controller()`, `app.filter()`, `app.animation()`, `app.state()`,
  `app.rest()`, and router-level module APIs.
- If a registry provider has true policy methods, split those from declaration
  registration before hiding it.

### Policy Providers

These need a cleaner declarative config shape before provider docs can be
retired:

- `$httpProvider`
- `$httpParamSerializerProvider`
- `$locationProvider`
- `$logProvider`
- `$sceProvider`
- `$sceDelegateProvider`
- `$anchorScrollProvider`
- `$templateRequestProvider`
- `$templateCacheProvider`
- `$rootScopeProvider`
- `$ariaProvider`
- `$cookieProvider`
- `$interpolateProvider`
- `$exceptionHandlerProvider`
- `$animateProvider` policy methods such as filters

Notes:

- Some providers are both registry and policy. Split or document the dual role.
- Security-sensitive policy, especially SCE and URL trust lists, must remain
  explicit and auditable.

### Config-Free Providers

These should become internal or legacy-public unless a real policy surface is
added:

- `$machineProvider`
- `$workflowProvider`
- `$workerProvider`
- `$wasmProvider`
- `$streamProvider`
- `$sseProvider`
- `$websocketProvider`
- `$webTransportProvider`
- `$webComponentProvider`
- `$eventBusProvider`
- `$parseProvider`
- `$compileLifecycleProvider`
- `$angularProvider`

Notes:

- Runtime services remain public.
- Provider tokens may remain for compatibility until a major cleanup.
- Provider type exports should eventually disappear from the normal public
  namespace docs.

## Slice 1: Provider Inventory

Create a full provider inventory.

Candidate location:

```text
src/core/di/PROVIDER_SURFACE_INVENTORY.md
```

Inventory columns:

- provider token
- service token
- current public namespace type
- current docs page
- category: internal recipe, registry, policy, config-free, legacy-public
- existing `NgModule` replacement
- required new `NgModule` replacement
- required declarative config replacement
- can hide from docs now: yes/no
- can remove from namespace in next major: yes/no
- test files covering behavior

Acceptance:

- Every `*Provider` exported from `src/namespace.ts` is classified.
- Every provider token from `src/injection-tokens.ts` is classified.
- Mixed registry/policy providers are explicitly marked.
- No runtime code changes.

Verification:

```bash
rg -n "Provider`|\\$.*Provider|internal|registry|policy|config-free" \
  src/core/di/PROVIDER_SURFACE_INVENTORY.md
```

## Slice 2: User Path Audit

For every public provider method, identify the preferred user-facing path.

Rules:

- If `NgModule` already exposes the behavior, docs should prefer `NgModule`.
- If only provider injection exposes the behavior, decide whether to add an
  `NgModule` method or declarative config.
- If a provider method is only internal, mark it internal/legacy.

Examples:

- `$compileProvider.directive()` -> `app.directive()`
- `$compileProvider.component()` -> `app.component()`
- `$controllerProvider.register()` -> `app.controller()`
- `$filterProvider.register()` -> `app.filter()`
- `$animateProvider.register()` -> `app.animation()`
- `$stateProvider.state()` -> `app.state()`
- `$restProvider.rest()` -> `app.rest()`
- `$machineProvider` -> no user path needed; inject `$machine`
- `$workflowProvider` -> no user path needed; inject `$workflow`

Acceptance:

- Inventory includes a replacement path for every provider method.
- Missing `NgModule` methods are tracked as explicit work items.
- Config-free providers have no recommended direct user path.

## Slice 3: Declarative Config API Design

Design the replacement for true policy providers as service-owned config.

Candidate shape:

```ts
app.configure({
  http: { ... },
  location: { ... },
  log: { ... },
  sce: { ... },
  templateRequest: { ... },
  rootScope: { ... },
  aria: { ... },
  cookie: { ... },
  interpolate: { ... },
});
```

Design rules:

- Config must be declarative and serializable where practical.
- Security policy must stay explicit and readable in code review.
- Function hooks are allowed only where existing policy truly requires them.
- Policy application must happen during config phase.
- Runtime service mutation remains available only where already public and
  useful.

Acceptance:

- Draft TypeScript interfaces for service config.
- Map each policy field to the current provider behavior.
- Identify policies that should remain provider-only temporarily.
- Add type tests for the draft config shape before runtime implementation.

## Slice 4: Internal Provider Recipe Shape

Simplify internal provider construction without changing public behavior.

Candidate internal shape:

```ts
interface ProviderRecipe<T = unknown> {
  get(injector: ng.InjectorService): T;
}
```

Rules:

- This is internal plumbing, not a public user API.
- Existing `$get` provider classes can be adapted gradually.
- Do not rewrite every provider in one pass.
- Start with config-free providers where the behavior is trivial.

Acceptance:

- One config-free provider is converted or adapted as a proof of concept.
- Injector tests prove existing service injection still works.
- Namespace output remains unchanged in this slice.

Verification:

```bash
npx playwright test src/core/di/injector.test.ts
./node_modules/.bin/tsc --project tsconfig.test.json
```

## Slice 5: Documentation Shift

Stop teaching provider injection as the normal authoring path.

Rules:

- Provider docs for internal registry providers should point to `NgModule`
  methods.
- Policy provider docs should point to the new service config API once it
  exists.
- Config-free provider docs should be removed, hidden, or marked legacy/internal.
- Advanced docs may mention provider internals only when needed for framework
  extension.

Acceptance:

- Provider docs index separates `legacy/internal`, `policy`, and `advanced`.
- Core tutorials use `NgModule` methods, not `$compileProvider`,
  `$controllerProvider`, `$filterProvider`, `$stateProvider`, or
  `$restProvider`.
- No example teaches direct access to a config-free provider.

Verification:

```bash
rg -n "\\$compileProvider|\\$controllerProvider|\\$filterProvider|\\$stateProvider|\\$restProvider|\\$machineProvider|\\$workflowProvider" \
  docs/content
make docs-examples-check
```

## Slice 6: Namespace Soft Deprecation

Mark provider namespace types according to inventory.

Rules:

- Config-free provider types become legacy/internal in docs first.
- Registry provider types become advanced/internal when `NgModule` replacement
  exists.
- Policy provider types stay public until declarative config reaches parity.
- Generated integration surfaces must track the namespace until removal.

Acceptance:

- TypeDoc/JSDoc distinguishes runtime services from provider internals.
- Public namespace checks still pass.
- Generated externs and type surfaces remain fresh.

Verification:

```bash
make generated-check
make test-namespace-js
```

## Slice 7: Runtime Migration

Move provider usage out of user-facing paths.

Rules:

- Keep injector/provider mechanics internally.
- Add missing `NgModule` methods before retiring provider docs.
- Add service config application before retiring policy provider docs.
- Preserve existing provider injection until a major version cleanup.

Acceptance:

- All common app authoring flows avoid direct provider injection.
- Existing tests for provider-based paths still pass during compatibility
  window.
- New tests cover declarative replacements.

Verification:

```bash
npx playwright test src/core/di/ng-module/ng-module.test.ts
./node_modules/.bin/tsc --project tsconfig.test.json
```

## Slice 8: Major Version Cleanup

Remove or hide legacy public provider surface only after replacements are
documented and tested.

Candidate removals or hiding:

- config-free provider exports from `ng` namespace
- provider docs for internal registry providers
- direct provider examples in user guides
- provider aliases that duplicate runtime services

Rules:

- Publish migration notes.
- Keep internal provider tokens where injector needs them.
- Do not remove policy provider compatibility until declarative config covers
  every documented policy.
- Update generated surfaces in the same change.

Acceptance:

- Migration guide maps every removed public provider path to replacement.
- Public namespace snapshot intentionally changes.
- Generated Closure/Dart/Gleam/Kotlin/etc. surfaces are updated or intentionally
  skipped if unpublished.
- Full check suite passes.

Verification:

```bash
make check
make generated-check
make docs-examples-check
```

## Final Readiness Gate

Provider surface cleanup is ready when:

- users can author normal apps without touching provider objects
- all registry behavior has `NgModule` equivalents
- all policy behavior has declarative config or an explicit reason to remain
  provider-based
- config-free providers are not taught as public API
- provider internals remain available to the injector
- migration notes exist for every public break
- docs match the AngularTS doctrine: users declare app structure and policy;
  AngularTS orchestrates the machinery
