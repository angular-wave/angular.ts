# Service Policy Reapplication Roadmap

This roadmap applies `SERVICE_CONTRACTS.md` back across the existing JS/TS
service surface. It is intentionally incremental: document contracts first,
then add reactive state or policy knobs only where a service already owns
browser mechanics or long-lived state.

The goal is not to normalize every service into the same API. The goal is to
make AngularTS services consistently behave as reactive, policy-driven Web
Platform primitives that remove dependency and lifecycle boilerplate from
application code.

The global execution sequence is defined in
`src/GLOBAL_LEVEL_9_ROADMAP.md`. Service hardening should happen through
vertical module slices after the global inventory and config/plugin decisions
exist.

Provider-surface cleanup is tracked separately in
`src/core/di/PROVIDER_SURFACE_ROADMAP.md`. Service policy backfill should prefer
`NgModule` declarations and declarative service config over direct provider
injection when documenting the user-facing path. The broader public API
shrinkage plan is tracked in `src/PUBLIC_API_SURFACE_ROADMAP.md`.

Service implementation must obey the implementation stoppages in
`src/PUBLIC_API_SURFACE_ROADMAP.md`, especially the service contract inventory,
configure API, documentation requirement, generated surface, and compatibility
stoppages.

## Goal

Bring existing services to the service-contract stability gate:

- lifecycle behavior is explicit
- useful runtime state is reactive where appropriate
- default policy is documented and overrideable where appropriate
- expected failures are stable and testable
- recovery and persistence boundaries are explicit
- native interop and custom adapter boundaries are clear
- dependency replacement and composition roles are documented

## Non-Goals

- Do not add a shared service base class.
- Do not add universal `status`, `diagnostics`, `snapshot`, `restore`,
  `native`, `start`, or `stop` APIs.
- Do not add module registration sugar as part of contract backfill.
- Do not add new runtime policy knobs unless tests prove they remove real
  application boilerplate.
- Do not make `$rest`, `$workflow`, `$worker`, or realtime services depend on a
  future service worker.
- Do not mark a service stable just because it has a README; contract claims
  must match implementation and tests.

## Service Tiers

Tier 0: reference app primitives

- `$machine`
- `$workflow`
- workflow supervisor roadmap
- service worker roadmap

Tier 1: policy-heavy browser lifecycle services

- `$websocket`
- `$sse`
- `$webTransport`
- `$worker`
- connection manager
- future `$serviceWorker`

Tier 2: data, cache, persistence, and request services

- `$http`
- `$rest`
- storage
- `$cookie`
- `$templateRequest`
- `$templateCache`
- stream

Tier 3: browser document/runtime services

- `$location`
- `$anchorScroll`
- `$wasm`
- web component services

Tier 4: small utility services

- `$log`
- `$exceptionHandler`
- `$eventBus` / `$pubSub`
- `$sce`

Small utility services may document several contracts as not applicable. They
should not grow runtime state just to satisfy this roadmap.

## Slice 1: Contract Inventory

Create a service-by-service inventory that records which contract sections
apply.

Inventory columns:

- service path
- wraps browser API: yes/no
- long-lived state: yes/no
- observable/reactive state today
- policy today
- failure shape today
- recovery/snapshot today
- native/custom adapter escape hatch
- dependency replacement target
- composition role
- missing docs
- missing tests

Candidate location:

```text
src/services/SERVICE_POLICY_INVENTORY.md
```

Acceptance:

- Every directory under `src/services` is listed.
- Each service has a tier.
- Each service has explicit "applies" or "not applicable" decisions for the
  contract sections.
- No runtime code changes in this slice.

Verification:

```bash
rg -n "## .*\\$|## .*service|\\| .* \\|" src/services/SERVICE_POLICY_INVENTORY.md
```

## Slice 2: Reference Contracts

Finish the reference documentation for services that define the stack model.

Scope:

- `src/services/machine/README.md`
- `src/services/workflow/README.md`
- `src/services/workflow/SUPERVISOR_IMPLEMENTATION_ROADMAP.md`
- `src/services/service-worker/SERVICE_WORKER_IMPLEMENTATION_ROADMAP.md`

Rules:

- `$machine` remains the finite-state/game-flow primitive.
- `$workflow` remains the async command orchestration primitive over
  `$machine`.
- Supervisor remains persistence/recovery policy over workflows.
- Service worker remains browser-owned lifecycle/messaging glue and future
  adapter boundary.

Acceptance:

- Each reference doc has lifecycle, reactivity, policy, failure, recovery,
  scheduling, native interop, test harness, dependency replacement, and
  composition sections or explicit roadmap equivalents.
- Supervisor roadmap states which policies it owns and which stay
  application-owned.
- Service worker roadmap states which update/reload policies stay explicit.

Verification:

```bash
rg -n "Reactivity Contract|Policy Contract|Dependency Replacement Contract|Composition Contract" \
  src/services/machine/README.md \
  src/services/workflow/README.md
rg -n "SERVICE_CONTRACTS|policy|composition|dependency" \
  src/services/workflow/SUPERVISOR_IMPLEMENTATION_ROADMAP.md \
  src/services/service-worker/SERVICE_WORKER_IMPLEMENTATION_ROADMAP.md
```

## Slice 3: Realtime Policy Backfill

Apply contracts to realtime services before changing behavior.

Scope:

- `src/services/connection/connection-manager.ts`
- `src/services/websocket/websocket.ts`
- `src/services/sse/sse.ts`
- `src/services/webtransport/webtransport.ts`

Contract decisions:

- Default reconnect policy.
- Default heartbeat policy.
- Whether connection state should become reactive.
- Whether diagnostics are warranted.
- Which events remain callback-only.
- Native connection escape hatch, if any.

Runtime changes are allowed only after docs and tests define current behavior.

Candidate runtime improvements:

- normalized `status` for connection services only, if templates need it
- bounded connection diagnostics for reconnect exhaustion and heartbeat timeout
- explicit reconnect policy shape shared by websocket/SSE/WebTransport only if
  existing config semantics already align
- fake connection factories for deterministic tests

Non-goals:

- Do not introduce a global `ServiceStatus`.
- Do not make all services diagnostic-bearing.
- Do not make connection manager public unless it is intentionally promoted.

Acceptance:

- README exists for each public realtime service or a shared realtime README
  covers all of them.
- Reconnect and heartbeat defaults are documented.
- Tests cover default reconnect behavior and policy override behavior.
- Tests cover cleanup/close behavior.
- Browser-facing examples do not require application-owned reconnect loops.

Verification:

```bash
npx playwright test src/services/websocket/websocket.test.ts
npx playwright test src/services/sse/sse.test.ts
npx playwright test src/services/webtransport/webtransport.test.ts
```

## Slice 4: Worker And Service Worker Policy Backfill

Align worker services around lifecycle ownership without merging their APIs.

Scope:

- `$worker`
- future `$serviceWorker`

Rules:

- `$worker` owns page-created worker lifecycle.
- `$serviceWorker` owns browser registration/update/controller/message
  lifecycle.
- `$worker` and `$serviceWorker` must not share one API surface.

`$worker` contract decisions:

- auto-restart default and override.
- auto-terminate semantics.
- post-after-terminate behavior.
- error callback and exception handler behavior.
- whether worker connection state should be reactive.
- native `Worker` access policy.

`$serviceWorker` contract decisions:

- unsupported browser behavior.
- registration default and `autoRegister` policy.
- update detection policy.
- controller-change state.
- messaging behavior.
- explicit activation/reload policy.

Acceptance:

- `$worker` README documents lifecycle, failure, policy, interop, and test
  harness.
- Service worker implementation slices must satisfy `SERVICE_CONTRACTS.md`
  before stability.
- Tests cover worker restart/terminate/post failure behavior.
- Service worker tests use fake containers first and real browser registrations
  only in cleanup-safe integration tests.

Verification:

```bash
npx playwright test src/services/worker/worker.test.ts
```

## Slice 5: Data And Cache Policy Backfill

Make request, cache, and persistence policy explicit.

Scope:

- `$http`
- `$rest`
- storage
- `$cookie`
- `$templateRequest`
- `$templateCache`
- stream

Contract decisions:

- `$http`: request lifecycle, pending request reactivity, interceptor failure
  behavior, cancellation/timeout policy, native fetch/XHR boundary.
- `$rest`: backend composition, cache strategies, stale metadata, invalidation
  policy, custom backend escape hatch.
- storage: persistence timing, serialization policy, restore-on-create
  behavior, backend escape hatch.
- `$cookie`: defaults policy, browser cookie constraints, path/domain/security
  ownership.
- template request/cache: fetch/cache policy, trusted URL boundary, failure
  shape.
- stream: native `ReadableStream` boundary and decode failure behavior.

Runtime changes are allowed only where they eliminate application boilerplate
without hiding risky policy. For example, cache strategy defaults are useful;
replaying failed writes is risky and should stay explicit.

Acceptance:

- REST docs explicitly satisfy dependency replacement and composition
  contracts.
- `$http` docs state failure and cancellation behavior.
- Storage/cookie docs state persistence and security boundaries.
- Tests cover existing cache strategy defaults and invalidation policy.
- No service worker dependency is introduced.

Verification:

```bash
npx playwright test src/services/http/http.test.ts
npx playwright test src/services/rest/rest.test.ts
npx playwright test src/services/storage/storage.test.ts
npx playwright test src/services/cookie/cookie.test.ts
npx playwright test src/services/template-cache/template-cache.test.ts
npx playwright test src/services/stream/readable-stream.test.ts
```

## Slice 6: Browser Document And Runtime Policy Backfill

Document the browser APIs that shape navigation, scrolling, Wasm, and web
component behavior.

Scope:

- `$location`
- `$anchorScroll`
- `$wasm`
- web component services

Contract decisions:

- `$location`: history/hash policy, URL synchronization, popstate/hashchange
  scheduling, failure behavior.
- `$anchorScroll`: scroll target resolution, timing, browser ownership.
- `$wasm`: module loading policy, scope bridge lifecycle, native instance
  interop, cleanup.
- web components: custom element registration, attribute/property/event
  synchronization, teardown.

Acceptance:

- Each service has contract documentation or a shared runtime README.
- Tests cover browser event synchronization and cleanup paths.
- Native interop boundaries are explicit.

Verification:

```bash
npx playwright test src/services/location/location.test.ts
npx playwright test src/services/anchor-scroll/anchor-scroll.test.ts
npx playwright test src/services/wasm/wasm.test.ts
npx playwright test src/services/web-component/web-component.test.ts
```

## Slice 7: Utility Service Backfill

Keep small utilities small.

Scope:

- `$log`
- `$exceptionHandler`
- `$eventBus` / `$pubSub`
- `$sce`

Rules:

- Most contracts may be "not applicable".
- Do not add reactive state.
- Do not add policy objects unless the service already has configurable policy.
- Do document dependency replacement and composition role.

Acceptance:

- Each utility service has a concise README or is covered by a shared utility
  README.
- Failure behavior is documented where relevant.
- Tests remain focused and no new runtime state is introduced.

Verification:

```bash
npx playwright test src/services/log/log.test.ts
npx playwright test src/services/exception/exception.test.ts
npx playwright test src/services/pubsub/pubsub.test.ts
npx playwright test src/services/sce/sce.test.ts
```

## Slice 8: Contract Test Checklist

Add a lightweight checklist for tests that stabilize service contracts.

Checklist categories:

- construction does or does not touch browser APIs
- default policy applies
- policy override applies
- cleanup releases native resources
- destroyed observing scopes stop receiving updates
- expected runtime failures have stable shape
- native/custom adapter escape hatch works
- docs examples are executable or marked non-executable

Candidate location:

```text
src/services/SERVICE_TEST_CHECKLIST.md
```

Acceptance:

- Checklist exists.
- New service roadmaps reference it.
- Existing Tier 1 and Tier 2 services use it when touched.

## Slice 9: Documentation And Examples Alignment

Align user-facing docs with the contract model.

Rules:

- Docs should present services as reactive, policy-driven Web Platform
  primitives.
- Examples should show default policy first, then policy overrides.
- Examples should not show boilerplate loops that the service owns.
- Risky policy should be shown as explicit user choice.

Acceptance:

- Realtime docs show declarative reconnect/heartbeat policy.
- REST docs show cache policy and custom backend composition.
- Workflow docs show command policy, diagnostics, and supervisor boundary.
- Service worker docs, when added, show update prompt policy explicitly.

Verification:

```bash
make docs-examples-check
```

## Slice 10: Stability Gate

Before marking this backfill complete:

```bash
make check
make coverage-check
make docs-examples-check
```

The policy reapplication is complete only when:

- Tier 0 and Tier 1 services satisfy all applicable contracts.
- Tier 2 services document cache, persistence, and failure policy.
- Tier 3 services document browser synchronization and native interop.
- Tier 4 services stay intentionally small.
- No universal service base API has been introduced.
- No service gained diagnostics, snapshot/restore, or native escape hatches
  without a documented need and tests.
- User-facing docs no longer teach application-owned boilerplate for behavior
  AngularTS owns by default.
