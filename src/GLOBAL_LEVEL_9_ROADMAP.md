# Global Level-9 Roadmap

This roadmap coordinates the public API, service config, policy hardening, and
provider-surface work needed to move AngularTS toward level-9 maturity.

The goal is not to expand API for its own sake. The goal is to make AngularTS a
single declarative Web Platform primitive: users declare structure, config, and
policies; AngularTS owns browser mechanics, lifecycle, recovery, reactivity,
and dependency-replacement boundaries.

## Related Roadmaps

- `src/PUBLIC_API_SURFACE_ROADMAP.md`: curated public namespace and exposed
  type shrinkage.
- `src/core/di/PROVIDER_SURFACE_ROADMAP.md`: provider classification,
  migration, and internal recipe redesign.
- `src/services/SERVICE_POLICY_REAPPLICATION_ROADMAP.md`: service config,
  policy hardening, reactivity, failure, and recovery backfill.
- `src/DOCUMENTATION_REQUIREMENT.md`: level-9 documentation requirement for
  every changed public API.

## Execution Principle

Do not start with a broad provider redesign. Provider redesign should follow
evidence from real service slices.

Do not harden services randomly either. Service hardening must happen through
vertical module slices after the global public-surface decisions are made.

The implementation order is:

1. Make global decisions.
2. Execute vertical module slices.
3. Redesign provider internals after patterns are proven.
4. Clean up the public surface in a compatibility window.

## Phase 1: Global Decisions First

These decisions unblock every later slice. They should be documented before
runtime behavior changes.

### Public Type Inventory

Create:

```text
src/PUBLIC_API_SURFACE_INVENTORY.md
```

Decide:

- curated public API
- legacy compatibility API
- internal implementation exports
- generated surface ownership
- replacement path for every hidden or removed public type

Acceptance:

- every exported public type has category, user need, docs page, sample path,
  and removal/deprecation milestone where relevant
- no runtime code changes

### Provider Inventory

Create:

```text
src/core/di/PROVIDER_SURFACE_INVENTORY.md
```

Decide:

- internal recipe providers
- registry providers
- policy providers
- config-free providers
- legacy-public providers
- preferred user path for every public provider method

Acceptance:

- provider inventory agrees with public type inventory
- config-free providers have no recommended direct user path
- mixed registry/policy providers are explicitly marked

### Service Contract Inventory

Create:

```text
src/services/SERVICE_POLICY_INVENTORY.md
```

Decide:

- which services own browser lifecycle mechanics
- which services need reactive runtime state
- which services need config hardening
- which services need diagnostics, recovery, persistence, native interop, or
  adapter boundaries
- which services should remain small utilities

Acceptance:

- every service has applies/not-applicable decisions for `SERVICE_CONTRACTS.md`
- missing docs and missing tests are listed
- no runtime code changes

### Configure API Shape

Accept the built-in service config API before migrating provider policy docs.

Candidate shape:

```ts
app.configure("http", {
  defaults: { withCredentials: true },
});

app.configure({
  location: { html5Mode: true },
  log: { debug: false },
});
```

Decide:

- keyed config, object config, or both
- config merge semantics and ordering
- module-local, app-global, or inherited behavior
- explicit handling for security-sensitive config
- type behavior for unknown keys and fields

Acceptance:

- accepted `AngularConfigMap` shape
- type tests for valid and invalid config
- runtime application rules
- one docs sample for a built-in service config

### Plugin API Shape

Accept the third-party extension API before removing provider objects from
plugin authoring examples.

Candidate shape:

```ts
export interface AngularPlugin<TConfig = void> {
  name: string;
  install(app: ng.NgModule, config: TConfig): void;
}

app.use(firebasePlugin, {
  apiKey: "...",
  authDomain: "...",
});
```

Decide:

- plugin object shape
- no-config plugin ergonomics
- required-config plugin typing
- install ordering and idempotency
- whether plugins can contribute named built-in-style config keys

Acceptance:

- accepted `AngularPlugin<TConfig>` shape
- type tests for required, optional, and invalid plugin config
- fixture plugin docs sample

## Phase 2: Vertical Module Slices

After the global decisions exist, policy hardening and provider cleanup should
move per module. Each module slice must include docs, tests, generated surface
updates where applicable, and migration notes where public API changes.

Each module slice follows this order:

1. Document current behavior.
2. Classify public types and provider methods for the module.
3. Design service-owned config for the module.
4. Add or update `NgModule`, `app.configure(...)`, or `app.use(...)` user path.
5. Harden policy, reactivity, failure, recovery, or lifecycle behavior.
6. Add type tests and source tests.
7. Add docs guidance and executable or testable samples.
8. Regenerate declarations, TypeDoc, and generated integrations where relevant.
9. Mark provider paths legacy/internal only after the replacement path is
   documented and tested.

## Pilot Slices

Start with small, representative pilots before touching broad provider
internals.

### Pilot A: Small Policy Service

Good candidates:

- `$log`
- `$cookie`
- `$location`

Purpose:

- prove `app.configure(...)`
- prove service-owned config docs
- prove generated docs and sample requirements
- prove provider-to-config migration notes

Exit criteria:

- one policy provider has a documented service config replacement
- provider docs point to the new user path
- type tests reject invalid config
- docs sample exercises the intended path

### Pilot B: Config-Free Provider

Good candidates:

- `$machineProvider`
- `$workflowProvider`

Purpose:

- prove that config-free providers can move out of the normal public surface
  without reducing capability
- prove runtime service injection remains the user path
- prove namespace/docs handling for legacy/internal providers

Exit criteria:

- runtime service docs are complete
- provider path is classified as config-free or legacy/internal
- no user-facing guide teaches provider access
- generated surface decision is explicit

### Pilot C: Realtime Browser Lifecycle Service

Good candidates:

- `$websocket`
- `$sse`
- `$webTransport`

Purpose:

- prove policy hardening for browser mechanics users should not own manually
- prove default reconnect/heartbeat config
- prove reactive connection state only where useful
- prove deterministic fake backend tests

Exit criteria:

- default policy is documented
- policy override is typed and tested
- users do not need application-owned reconnect loops in examples
- native escape hatch and cleanup behavior are explicit

## Phase 3: Provider Redesign After Evidence

Provider redesign starts only after at least one policy provider and one
config-free provider slice have proven the replacement patterns.

Allowed work:

- simplify internal provider recipes
- adapt config-free providers first
- keep `$get` compatibility inside DI
- keep runtime behavior compatible
- remove provider docs from normal user paths

Not allowed yet:

- broad injector rewrite
- flag-day provider removal
- public namespace cleanup before replacements are documented and tested
- moving every provider to one generic config object without module evidence

Exit criteria:

- injector tests pass
- namespace changes are intentional
- TypeDoc does not promote internal recipes as public API
- public docs teach `NgModule`, `app.configure(...)`, and `app.use(...)`

## Phase 4: Compatibility And Cleanup

Only after vertical slices prove replacements should AngularTS remove or hide
legacy public provider surface.

Rules:

- old provider paths remain runtime-compatible during the window
- new examples use replacement APIs only
- migration notes identify removal milestones
- generated surfaces follow the curated public surface decision
- unpublished integrations are intentionally excluded or updated according to
  the generated surface rule

Exit criteria:

- users can build normal apps without provider objects
- config is documented beside runtime services
- public types map to actual user needs
- generated docs and samples describe the intended path
- provider internals remain available to the injector
- public type count shrinks without reducing capability

## Level-9 Definition

AngularTS reaches level 9 for the JS public surface when:

- the app authoring model is declarative
- browser lifecycle mechanics are owned by services with sensible defaults
- users configure policies instead of writing boilerplate
- scopes/reactivity keep primitives synchronized
- provider objects are internal or advanced, not the default user path
- generated docs and exposed types are documented
- every public API has guidance and an executable or testable sample
- generated integrations track the curated public surface intentionally
- migrations exist for every public break

Level 9 is not just more tests or fewer exports. It is the point where the
public API, docs, samples, generated types, and runtime behavior all describe
the same stable contract.
