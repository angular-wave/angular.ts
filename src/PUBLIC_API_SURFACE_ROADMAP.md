# Public API Surface Roadmap

This roadmap shrinks the curated public AngularTS API without removing
capability. The goal is to stop exporting implementation details, provider
plumbing, and duplicated type aliases as first-class user concepts.

The global execution sequence is defined in
`src/GLOBAL_LEVEL_9_ROADMAP.md`. This public API roadmap should be executed
inside that sequence: global decisions first, vertical module slices second,
provider redesign after patterns are proven.

AngularTS can remain broad while making the public surface smaller. Users
should see app declarations, runtime services, config objects, and intentional
extension points. Internal DI recipes and config-free providers should stay
inside the framework.

Provider-specific migration work is tracked in
`src/core/di/PROVIDER_SURFACE_ROADMAP.md`. Service-by-service config and
reactivity backfill is tracked in
`src/services/SERVICE_POLICY_REAPPLICATION_ROADMAP.md`.

Documentation completeness for public API work is defined in
`src/DOCUMENTATION_REQUIREMENT.md`. Every slice that changes exposed types,
generated docs, service config, provider visibility, or user-facing behavior
must update guidance and testable samples as part of the same change.

## Goal

Reduce the public namespace and documentation surface by moving users from
provider objects and implementation-only types to:

- `NgModule` declaration methods
- service-owned config types
- `app.configure(...)` for built-in service config
- `app.use(plugin, config)` for third-party modules
- runtime service types users actually inject or hold
- extension-point types users intentionally implement

Capability must remain available through better entry points before old public
types are hidden or removed.

## Non-Goals

- Do not remove internal provider mechanics.
- Do not treat documentation as a CI-only concern; it is part of the public API
  contract.
- Do not remove a type only because it is inconvenient to document.
- Do not hide an extension point that users must implement.
- Do not break the namespace accidentally; public shrinkage must be intentional
  and migration-backed.
- Do not make generated integration parity track unpublished/internal types.
- Do not replace every explicit config type with an untyped object map.

## Public Type Rule

A type may be public only when users directly need it to do at least one of the
following:

- author an app declaration
- inject or hold a runtime service/object
- configure framework behavior
- implement a callback, handler, backend, adapter, or extension point
- consume stable diagnostics, snapshots, events, or results

If a type exists only because the injector, generated code, or implementation
needs it, it is internal.

## Target Public Type Categories

Keep public:

- app authoring types: `NgModule`, `Component`, `Directive`, `Injectable`
- runtime services: `HttpService`, `LocationService`, `MachineService`
- runtime objects: `Machine`, `Workflow`, `RestService`
- service config types: `HttpConfig`, `LocationConfig`, `CookieConfig`
- user-implemented callbacks: `MachineTransition`, `WorkflowCommand`
- extension points: `RestBackend`, `RestCacheStore`, storage backends
- stable evidence types: snapshots, diagnostics, history entries, command
  results

Move internal or legacy:

- config-free provider types
- registry provider types when `NgModule` methods cover the behavior
- provider aliases that duplicate runtime services
- implementation-only provider tokens
- internal helper records not authored by users
- generated bridge-only types not needed by JS/TS users

## Implementation Stoppages

These are intentional stoppages. When a slice reaches one of these points,
implementation must pause long enough to record the design decision in the
roadmap, inventory, docs, or migration notes before changing public behavior.

### Stoppage 1: Public Inventory Does Not Exist

Stop when:

- a slice wants to hide, rename, remove, or newly expose any public type before
  `src/PUBLIC_API_SURFACE_INVENTORY.md` exists.

Decide:

- which exports are curated public API
- which exports are legacy compatibility API
- which exports are internal implementation details
- which generated surfaces should track each category

Unlock:

- every changed public type has an inventory row, category, user need,
  replacement path, docs page, sample path, and removal/deprecation milestone.

### Stoppage 2: Provider Inventory Does Not Exist

Stop when:

- a slice wants to hide provider docs, remove provider namespace exports, add
  `app.configure(...)`, or claim a provider is config-free before
  `src/core/di/PROVIDER_SURFACE_INVENTORY.md` exists.

Decide:

- provider category: internal recipe, registry, policy, config-free, or
  legacy-public
- preferred user path for each provider method
- whether mixed registry/policy providers must be split before migration

Unlock:

- provider inventory agrees with the public type inventory and identifies
  every replacement path.

### Stoppage 3: Service Contract Inventory Does Not Exist

Stop when:

- a slice wants to add service config, reactive state, diagnostics, recovery,
  persistence, or native adapter APIs before
  `src/services/SERVICE_POLICY_INVENTORY.md` exists.

Decide:

- which `SERVICE_CONTRACTS.md` sections apply to each service
- which services own browser lifecycle mechanics
- which services should remain small utilities
- which runtime state should become reactive

Unlock:

- each service has explicit applies/not-applicable decisions and missing docs
  or tests are listed.

### Stoppage 4: `app.configure(...)` Shape Is Still Candidate

Stop when:

- a slice wants to implement service-owned config or migrate provider policy
  docs to `app.configure(...)`.

Decide:

- overload shape: keyed config, object config, or both
- config merge semantics and ordering
- whether config is module-local, app-global, or inherited
- how security-sensitive config stays explicit
- how unknown config keys and unknown fields fail type checks

Unlock:

- accepted `AngularConfigMap` shape, type tests, runtime application rules, and
  at least one docs sample for a built-in service config.

### Stoppage 5: `app.use(plugin, config)` Shape Is Still Candidate

Stop when:

- a slice wants to document third-party extension authoring or remove provider
  objects from plugin examples.

Decide:

- plugin object shape
- no-config plugin ergonomics
- required-config plugin typing
- install ordering and idempotency semantics
- whether plugins can contribute named config keys or must configure only
  through their own `install()` call

Unlock:

- accepted `AngularPlugin<TConfig>` shape, type tests for valid/invalid
  plugin config, and one fixture plugin sample.

### Stoppage 6: Public Docs Still Teach Provider Plumbing

Stop when:

- a slice wants to mark a provider legacy/internal while docs still present it
  as the normal user path.

Decide:

- where the user-facing guide lives under `docs/content`
- whether the replacement is `NgModule`, `app.configure(...)`, `app.use(...)`,
  direct service injection, or an advanced extension page
- what migration note is required

Unlock:

- docs teach the replacement path first, provider docs are marked
  legacy/internal/advanced, and examples use the replacement path.

### Stoppage 7: Generated Surface Ownership Is Ambiguous

Stop when:

- a slice changes `ng` namespace exports, generated externs, generated
  integration bindings, or TypeDoc visibility without a documented surface
  ownership decision.

Decide:

- whether generated integrations track curated public API, compatibility API,
  or internal implementation exports
- which unpublished integrations are intentionally excluded
- whether TypeDoc should show a symbol as public, legacy, advanced, or hidden

Unlock:

- generated surface rules are documented and generated output changes are
  intentional.

### Stoppage 8: Documentation Requirement Is Not Satisfied

Stop when:

- a public API slice has code or type changes without matching generated docs,
  user guidance, samples, and migration notes.

Decide:

- the docs page for the intended user path
- the generated docs impact
- the sample path under `docs/content` or `docs/static/examples`
- the source tests that prove behavior beyond documentation snippets

Unlock:

- `src/DOCUMENTATION_REQUIREMENT.md` is satisfied for the changed API.

### Stoppage 9: Compatibility Window Is Undefined

Stop when:

- a slice wants to deprecate, hide, or remove a public provider/type without a
  compatibility window.

Decide:

- whether the old API remains runtime-compatible
- where deprecation is documented
- removal milestone or major version
- replacement tests that must exist before deprecation

Unlock:

- migration notes and replacement tests exist before removal or hard hiding.

### Stoppage 10: Internal Provider Recipe Refactor Leaks Publicly

Stop when:

- a slice changes provider construction internals and namespace, TypeDoc, or
  docs output changes unexpectedly.

Decide:

- whether the change is internal-only or public API
- whether provider recipes need a compatibility adapter
- whether `$get` compatibility remains visible only inside DI

Unlock:

- injector tests pass, namespace output is unchanged unless intentionally
  changed, and no internal recipe type is taught as public API.

## Slice 1: Public Type Inventory

Create an inventory of every type exported through `ng` and package entry
points.

Candidate location:

```text
src/PUBLIC_API_SURFACE_INVENTORY.md
```

Inventory columns:

- type name
- source file
- current public entry point
- category: authoring, runtime, config, callback, extension, evidence,
  provider, internal, legacy
- user need: author/inject/configure/implement/consume/none
- replacement path, if removed
- docs page
- tests covering public use
- keep public: yes/no/defer
- removal version or milestone

Acceptance:

- Every `export type` in `src/namespace.ts` is listed.
- Every top-level package type export is listed.
- Every provider type is categorized.
- Every `keep public: no` entry has a replacement path or explicit rationale.
- No runtime code changes.

Verification:

```bash
rg -n "export type|export interface|export class" src/namespace.ts src/index.ts
rg -n "\\| .* \\|" src/PUBLIC_API_SURFACE_INVENTORY.md
```

## Slice 2: Provider Type Classification

Use `src/core/di/PROVIDER_SURFACE_ROADMAP.md` to classify provider types.

Rules:

- Config-free providers should become internal or legacy-public.
- Registry providers should become advanced/internal once `NgModule`
  replacements exist.
- Policy providers stay public until service-owned config types and
  `app.configure(...)` cover their documented behavior.
- Mixed registry/policy providers must be split conceptually before removal.

Acceptance:

- Provider type inventory references provider category.
- Provider roadmap and public type inventory agree.
- Config-free providers have no recommended direct user path.

Verification:

```bash
rg -n "config-free|registry|policy|legacy-public" \
  src/core/di/PROVIDER_SURFACE_ROADMAP.md \
  src/PUBLIC_API_SURFACE_INVENTORY.md
```

## Slice 3: Service-Owned Config Types

Move configuration concepts beside the service they configure.

Rules:

- Prefer `HttpConfig`, `LocationConfig`, `LogConfig`, `CookieConfig`, etc.
- Config docs belong on service pages, not provider pages.
- Provider defaults may remain implementation details until migration.
- Config types must be strict and type-safe.

Acceptance:

- Draft config types for all policy providers.
- Each config type maps to current provider behavior.
- Service docs include config sections.
- Provider docs point to service config docs or are marked legacy/internal.

Verification:

```bash
rg -n "interface .*Config|type .*Config" src/services src/core
rg -n "## Configure|app.configure" docs/content/docs/service docs/content/docs/services
```

## Slice 4: Typed Configure API Design

Design the type-safe built-in config API.

Candidate shape:

```ts
export interface AngularConfigMap {
  http: HttpConfig;
  location: LocationConfig;
  log: LogConfig;
}

app.configure("http", {
  defaults: { withCredentials: true },
});

app.configure({
  location: { html5Mode: true },
  log: { debug: false },
});
```

Rules:

- Built-in config keys are typed.
- Invalid keys and invalid fields fail type checks.
- Config application happens during module configuration.
- Security-sensitive config stays explicit.
- Third-party modules should prefer `app.use(plugin, config)` unless a
  registry extension is intentionally provided.

Acceptance:

- Add type tests for key-specific config.
- Add type tests for object config.
- Add type tests rejecting unknown config keys and fields.
- No provider removal in this slice.

Verification:

```bash
./node_modules/.bin/tsc --project tsconfig.test.json
```

## Slice 5: Typed Plugin API Design

Design a type-safe extension API for third-party modules.

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

Rules:

- Plugin objects carry their config type.
- Users should not need to augment global maps for ordinary plugins.
- Plugins can internally register constants, factories, services, directives,
  config blocks, or policies.
- Plugin public API should hide provider internals.

Acceptance:

- Add `NgModule.use()` type tests.
- Add a fixture plugin with required config.
- Add a fixture plugin with no config.
- Add tests rejecting invalid plugin config.

Verification:

```bash
./node_modules/.bin/tsc --project tsconfig.test.json
npx playwright test src/core/di/ng-module/ng-module.test.ts
```

## Slice 6: Documentation Surface Reduction

Move docs from provider pages to service pages where users think about the
feature.

Rules:

- Service pages own runtime API and config docs.
- Provider pages are legacy/internal/advanced unless still required.
- Tutorials should not inject providers for normal app authoring.
- Examples should use `NgModule`, `configure`, or `use`.

Acceptance:

- `$httpProvider` config docs move under `$http`.
- `$locationProvider` config docs move under `$location`.
- `$logProvider` config docs move under `$log`.
- Registry provider docs point to `NgModule` methods.
- Config-free provider docs are hidden or marked internal.

Verification:

```bash
rg -n "\\$.*Provider" docs/content/docs/get-started docs/content/docs/service docs/content/docs/services
make docs-examples-check
```

## Slice 7: Curated Namespace Split

Separate curated public namespace from internal/legacy implementation exports.

Rules:

- `ng` should contain user-authoring, runtime, config, callback, extension, and
  evidence types.
- Internal provider recipe types should not be in the curated namespace.
- Legacy provider types can remain under a clearly marked compatibility surface
  until the next major cleanup.
- Generated parity should target the curated public surface, not every internal
  exported implementation type.

Acceptance:

- Define curated namespace inclusion rules in code comments or docs.
- Namespace tests distinguish public, legacy, and internal surfaces.
- TypeDoc public nav follows the curated surface.
- Generated externs/bindings are updated to the intended public surface.

Verification:

```bash
make test-namespace-js
make generated-check
```

## Slice 8: Compatibility Window

Keep old provider paths working while new public paths are adopted.

Rules:

- Runtime behavior remains compatible during the window.
- Provider docs warn users toward replacements.
- New examples use replacement APIs only.
- Deprecation notes identify removal milestone.

Acceptance:

- Migration notes exist for every legacy public type.
- Existing provider-based tests still pass.
- Replacement tests are added before deprecation.

Verification:

```bash
make check
```

## Slice 9: Major Public Surface Cleanup

Remove or hide legacy public types after replacements are stable.

Candidate removals:

- config-free provider types from `ng`
- internal registry provider types from normal docs
- provider aliases duplicating runtime services
- implementation-only tokens from public docs

Rules:

- This is a major-version operation.
- Namespace snapshot changes must be intentional.
- Migration guide maps every removed public symbol to replacement or rationale.
- Internal DI behavior remains intact.

Acceptance:

- Public type count decreases.
- Provider docs count decreases.
- Generated public surfaces decrease.
- All common app examples still work without provider objects.

Verification:

```bash
make check
make generated-check
make docs-examples-check
```

## Metrics

Track before and after:

- number of public `ng` namespace types
- number of public provider types
- number of provider docs pages
- number of docs examples that inject `*Provider`
- number of generated extern/binding provider entries
- number of common app flows requiring provider knowledge

The target is not a tiny framework. The target is a smaller curated public
surface with the same or greater application capability.

## Final Readiness Gate

Public API surface cleanup is ready when:

- the level-9 documentation requirement in `src/DOCUMENTATION_REQUIREMENT.md`
  is satisfied for every changed public API
- users can build normal apps without seeing provider objects
- config is documented beside runtime services
- public types map to actual user authoring needs
- provider internals remain available to the injector
- generated parity tracks the curated public surface
- migration notes exist for every intentional break
- public type count shrinks without removing app capability
