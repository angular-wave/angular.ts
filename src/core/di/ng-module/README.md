# NgModule Internals

This directory owns AngularTS module registration. The implementation in
`ng-module.ts` is centered on a typed declaration object that records services,
components, directives, config objects, models, machines, workflows, router
state trees, and runtime adapters before the injector creates them.

## Responsibilities

- Register application declarations through `angular.module(...)`.
- Keep provider-era wiring internal to the injector/runtime.
- Expose typed convenience methods for common AngularTS primitives.
- Preserve dependency ordering and singleton service semantics.
- Route app-owned models through `AppContext` instead of `$rootScope`.

## Public Surface

- `NgModule`: public module builder returned by `angular.module(name, deps)`.
- `service`, `factory`, `value`, `constant`, `component`, `directive`,
  `controller`, and `filter`: standard registration methods.
- `config(configObject)`: typed service configuration object for framework
  services that expose real configuration.
- `model(name, factoryOrObject)`: register an app-owned reactive model.
- `machine(name, configOrFactory)`: register an injectable reactive mode
  machine.
- `workflow(name, configOrFactory)`: register an injectable command workflow.
- `router(tree)` and `state(name, declaration)`: register route state trees.
- Service adapter helpers such as `serviceWorker(...)`, `wasm(...)`, and worker
  registration methods.

Ordinary users should not instantiate or configure providers directly. Provider
objects remain injector implementation details.

## Core Model

`NgModule` records declarations in registration maps and arrays. The injector
later resolves those declarations into singleton services, app models, route
states, and runtime adapters.

The main flow is:

1. `angular.module(name, dependencies)` creates or retrieves a module record.
2. Module methods append typed declarations to that record.
3. Injector creation loads dependencies in order.
4. Config objects are applied to the service recipes that own configuration.
5. Runtime declarations are materialized as injectable services.

Important invariants:

- `provider(...)` is only for registering new provider recipes.
- `config(...)` is the only public service configuration path.
- Module-level machine and workflow declarations use state-tree configs.
- App models belong to `AppContext`, not to root DOM scopes.

## Lifecycle Contract

- Module registration is synchronous and does not start browser resources by
  itself.
- Injector creation materializes singleton services and app-owned declarations.
- Model factories create one app-context-owned model per injector context.
- Named machines and workflows are singleton injectables for that module graph.
- Destroying a DOM root does not destroy app-context-owned models.

## Reactivity Contract

- `model(...)` returns app-owned reactive model instances when injected.
- `machine(...)` returns reactive machines that bind to scopes when observed.
- `workflow(...)` returns reactive workflows that bind to scopes when observed.
- Router state declarations become reactive through router/view services rather
  than through module registration itself.

## Policy Contract

- Module registration should be declarative.
- Configuration belongs on typed service config objects.
- Cross-cutting runtime policy belongs to the primitive that enforces it, such
  as router navigation policy or machine transition policy.
- Provider access remains an advanced/internal extension point, not the normal
  configuration API.

## Dependency Replacement Contract

- Replaces ad hoc provider-object configuration with typed module config.
- Replaces scattered app-level state singletons with `model(...)`.
- Replaces manual injectable factories for common primitives with
  `machine(...)`, `workflow(...)`, `router(...)`, and adapter helpers.

It does not replace custom services. Application-specific IO, persistence, and
domain logic still belong in services.

## Composition Contract

- Lower level: injector recipes, `AppContext`, scope proxies, and service
  registration records.
- Higher level: application modules, extension modules, integrations, and docs
  examples.
- Module helpers should compose existing AngularTS primitives instead of adding
  parallel runtime systems.

## Failure Contract

- Invalid registration names or shapes fail during registration or injector
  creation.
- Typed configuration catches invalid service config fields at compile time.
- Runtime validation remains owned by the service that consumes the
  declaration.

## Testing Notes

- `ng-module.spec.ts` covers runtime registration behavior.
- `ng-module-types.spec.ts` covers TypeScript ergonomics for module helpers and
  config objects.
- Model docs examples cover app-context-owned model behavior through browser
  tests.
