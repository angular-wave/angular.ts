# Service Test Checklist

Use this checklist when adding or hardening browser-facing, long-lived, or
policy-driven services. It turns `SERVICE_CONTRACTS.md` into executable test
coverage without forcing every service into the same API shape.

Small utility services can mark items not applicable. Browser lifecycle services
should cover every applicable item before being marked stable.

## Construction

- [ ] Construction does or does not touch browser APIs intentionally.
- [ ] Unsupported browser/API behavior has a deterministic result.
- [ ] Required configuration failures throw or reject with a stable shape.
- [ ] Provider/module/default config merges before runtime use.
- [ ] No module import touches browser globals before service construction.

## Default Policy

- [ ] Default policy is tested.
- [ ] Default policy is documented.
- [ ] Defaults remove real application boilerplate without hiding risky side
      effects.
- [ ] Defaults do not start persistence, reload, activation, reconnect,
      registration, or durable retry behavior unless that is the explicit service
      contract.

## Policy Override

- [ ] Per-call config overrides app/provider defaults.
- [ ] App-level config overrides framework defaults.
- [ ] Risky policy is opt-in and tested.
- [ ] Multiple policy branches have deterministic precedence.
- [ ] Policy gates run before side effects where applicable.

## Lifecycle And Cleanup

- [ ] Explicit cleanup method releases native resources.
- [ ] Scope/root/element destruction releases owned resources.
- [ ] Repeated cleanup is safe.
- [ ] Cleanup prevents future scheduled work from mutating destroyed owners.
- [ ] Real browser tests unregister/close/terminate/remove timers, workers,
      service workers, storage entries, subscriptions, and event listeners they
      create.

## Reactivity And Scope Ownership

- [ ] Reactive state, if present, has an explicit owner.
- [ ] Destroyed observing scopes stop receiving updates.
- [ ] AppContext-owned state is not coupled to DOM root lifetime unless
      documented.
- [ ] DOM/root-owned schedulers do not leak into app-owned models or services.
- [ ] Callback-only services document why reactive state is not exposed.

## Failure Shape

- [ ] Expected runtime failures have stable status/error/result shapes.
- [ ] Native error detail is preserved where useful.
- [ ] Callback/listener failures route through `$exceptionHandler` or a documented
      failure path.
- [ ] Failed operations do not silently corrupt service state.
- [ ] Failed writes do not invalidate cache/persistence unless explicitly
      documented.

## Recovery And Persistence

- [ ] Snapshot/restore exists only when the service owns recoverable state.
- [ ] Persistence defaults are documented and tested.
- [ ] Restore boundaries cancel or ignore stale async work.
- [ ] Durable side-effect replay is explicit and opt-in.
- [ ] App-owned recovery policy is not hidden inside lower-level browser wrappers.

## Native And Adapter Boundaries

- [ ] Native/custom adapter escape hatch is tested when public.
- [ ] Native objects or adapter interfaces are documented.
- [ ] Tests use fake native containers/backends before real browser integration
      where practical.
- [ ] Protocol, serialization, security, permission, and server-side concerns
      that remain application-owned are stated.

## Examples And Docs

- [ ] Docs examples are executable or marked non-executable.
- [ ] Examples show default policy first, then overrides.
- [ ] Examples do not include app-owned boilerplate for behavior the service owns.
- [ ] Generated TypeDoc and namespace surfaces remain documented when public
      types change.
- [ ] README contract claims match implementation and tests.

## Stability Gate

Before marking a service slice stable:

- [ ] `make format` has run.
- [ ] `make lint` has run before tests.
- [ ] `make check` has run before tests.
- [ ] Targeted Playwright/Jasmine tests have run.
- [ ] `make docs-requirement` has run when docs or public generated surfaces
      changed.
- [ ] Remaining unchecked items are documented as explicit pull-request
      follow-up work, not implied stability.
