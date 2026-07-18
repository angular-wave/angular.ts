# Policy Primitive Candidates

This registry records policy domains that qualify for future AngularTS
implementation. It is intentionally not a backlog of automatic features.

Policy earns a primitive only when the decision is runtime, cross-cutting, and
consistency-sensitive. Service-local behavior remains service config.

## Qualification Checklist

- [ ] The decision is evaluated at runtime, not only at bootstrap.
- [ ] More than one subsystem needs the same decision.
- [ ] Duplicating the rule in application code would create incoherent behavior.
- [ ] The decision can be expressed as a typed `PolicyContext` plus
      `PolicyDecision`.
- [ ] Defaults are safe and do not force normal users to learn the policy.
- [ ] The policy has deterministic precedence and focused tests.
- [ ] Docs can show one executable sample without provider access.

## Implemented Proof Points

- [x] Security policy: request and navigation gates.
- [x] REST cache policy: cache strategy decisions per request.
- [x] Event delivery policy: `$eventBus` listener delivery decisions.
- [x] Router tree navigation policy: inherited route policy composed with
      `$security`.

## Remaining Candidates

### Router Tree Navigation Policy

Scope:

- router state declarations
- `$transitions`
- `$security`
- route-level resolves, controllers, and views

Decision shape:

```ts
type RouterNavigationDecision = "allow" | "deny" | "redirect";
```

Why it qualifies:

- navigation policy affects the router, security, resolves, component entry,
  redirects, and diagnostic behavior.
- large route trees need one inherited rule at a parent or abstract state rather
  than repeated guards on every child route.
- route policy becomes incoherent if each module owns its own auth checks,
  redirects, and permission gates.

Implementation status:

- [x] Finish route-tree policy inheritance and document the resulting router
      behavior.
- [x] Define the state declaration shape for inherited navigation policy.
- [x] Decide explicit weakening semantics for public child routes.
- [x] Compose inherited state policy with `$security.navigation.rules`.
- [x] Prove lazy state registration preserves parent policy inheritance.

### Diagnostic Redaction Policy

Scope:

- `$log`
- `$exceptionHandler`
- `$http`
- `$security`
- `$workflow`
- `$eventBus`

Decision shape:

```ts
type DiagnosticPolicyDecision = "emit" | "drop" | "redact";
```

Why it qualifies:

- logs, exceptions, request diagnostics, workflow inputs, and security reasons
  can all leak sensitive data if each subsystem redacts independently.
- enterprise apps need one auditable rule for PII, tokens, credentials, request
  bodies, and workflow payloads.

Implementation stoppages:

- [ ] Define a safe diagnostic envelope shared by participating services.
- [ ] Decide whether redaction mutates payloads, returns replacements, or both.
- [ ] Define default secret patterns and the application override boundary.
- [ ] Prove `$exceptionHandler` and `$log` behavior before wiring high-volume
      services.
- [ ] Document which diagnostics remain application-owned.

### Trusted Origin And Credential Policy

Scope:

- `$http`
- `$rest`
- `$websocket`
- `$sse`
- `$webTransport`
- service worker messaging and cache adapters

Decision shape:

```ts
type TrustedOriginDecision = "allow" | "deny";
```

Why it qualifies:

- credentials, auth headers, cookies, and tokenized URLs must follow one origin
  rule across every network-capable primitive.
- route/security policy is incomplete if network services can still send
  sensitive requests to disallowed targets.

Implementation stoppages:

- [ ] Define normalized URL/origin context for HTTP, realtime, and worker
      boundaries.
- [ ] Decide whether denied WebSocket/SSE/WebTransport opens reject, no-op, or
      emit stable diagnostics.
- [ ] Compose with `$security.credentials` without duplicating auth branches.
- [ ] Keep service-local reconnect/cache config separate from origin decisions.

### Workflow Command Admission Policy

Scope:

- `$workflow`
- `$machine`
- workflow supervisor
- `$security`
- app models

Decision shape:

```ts
type CommandAdmissionDecision = "run" | "reject" | "queue";
```

Why it qualifies:

- commands can represent permissions, offline mutation, recovery flow, or user
  approval boundaries.
- large apps need one rule for whether a command may run now instead of
  scattering checks inside command handlers.

Implementation stoppages:

- [ ] Keep workflow concurrency policy distinct from command admission.
- [ ] Define the engine-neutral context so workflows can run without machines.
- [ ] Decide how rejections appear in workflow diagnostics and history.
- [ ] Prove supervisor recovery does not bypass admission decisions.

### Storage Persistence Policy

Scope:

- app models
- `$workflow` supervisor snapshots
- storage service
- REST cache
- service worker cache adapters

Decision shape:

```ts
type PersistenceDecision = "persist" | "skip" | "expire" | "encrypt-required";
```

Why it qualifies:

- durable state has retention, sensitivity, encryption, and expiry concerns that
  should not be reinvented by each persistence owner.
- app models and workflow snapshots need coherent rules when root scopes are
  destroyed and recreated.

Implementation stoppages:

- [ ] Define persistence metadata without making every model durable.
- [ ] Decide whether encryption is framework-provided or an app-owned adapter
      requirement.
- [ ] Define expiry semantics across storage backends and cache stores.
- [ ] Keep persistence policy separate from storage backend config.

### Template And Resource Trust Policy

Scope:

- `$sce`
- `$templateRequest`
- `$compile`
- `$http`
- dynamic component/template loading

Decision shape:

```ts
type ResourceTrustDecision = "trust" | "sanitize" | "deny";
```

Why it qualifies:

- template URLs, dynamic HTML, resource URLs, and compile-time DOM insertion are
  one trust boundary even when different services touch them.
- app security posture is incoherent if `$sce`, template fetching, and compile
  insertion make unrelated trust decisions.

Implementation stoppages:

- [ ] Preserve `$sce` as the explicit trusted-value boundary.
- [ ] Define which resources can be sanitized and which can only be denied.
- [ ] Prove template request and compile insertion consume the same decision
      without making normal static templates harder.
- [ ] Document native browser CSP/Trusted Types responsibilities.

## Rejection Rule

A candidate is rejected or deferred when:

- it affects only one service;
- it is static configuration rather than runtime decision-making;
- it cannot be tested deterministically;
- it hides a risky application-owned choice;
- it would force small apps to learn enterprise policy concepts.
