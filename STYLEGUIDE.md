# AngularTS Internal style guide

## Internal API visibility

TypeScript implementation methods use three distinct visibility layers:

- Class-local methods use `private _name()` and carry `@internal` JSDoc.
- Framework-shared implementation methods use `_name()` and carry `@internal`
  JSDoc, without `private` when another class must call them.
- Public methods use an unprefixed name and must have user-facing documentation.

The TypeScript `private` modifier enforces source-level access. The underscore
marks properties for release-build mangling. The `@internal` annotation removes
implementation declarations from generated types and TypeDoc.

Do not use `@ignore`, `@private`, or `@protected` in TypeScript. These legacy
TypeDoc annotations can hide documentation without removing the corresponding
published declaration. Static injection metadata such as `$inject` and
`$nonscope` remains visible as framework metadata and must not be disguised with
visibility comments.

Language integrations may use their language toolchain's visibility annotations.
For example, Closure JavaScript `@private` is enforced by the Closure compiler
and is not a TypeScript or TypeDoc annotation.

## 🔒 Framework Assertions

Assertions enforce **framework correctness**, not application behavior or
public API contracts. An assertion failure means AngularTS reached a state its
own implementation says is impossible. It should therefore be actionable as a
framework defect, not as an application configuration error.

Production assertions use the explicit `assertInvariant` and
`assertInvariantDefined` helpers. No other production function or method may
use an `assert*` name. The distinction is semantic:

- `assertInvariant*` detects corrupted framework-owned state and throws
  immediately.
- `validate*` checks configuration, snapshots, payloads, and other supplied
  data.
- `require*` checks required arguments or platform capabilities.
- `ensure*` guards lifecycle and operation preconditions.

Public validation and guards must throw the service's documented error type or
an actionable AngularTS error. They are not assertions, even when the invalid
value was supplied by an application developer rather than an end user.

#### ✅ When to Use Asserts

Use assertions **only** when the error indicates a framework invariant
violation such that continuing would make framework state unreliable.

Asserts SHOULD be used when:

- An internal invariant is violated.
- A framework-owned value should never be invalid after an earlier branch or
  normalization step established it.
- Internal registries, AST nodes, or lifecycle records contradict their own
  state.
- The input originates entirely from the framework, not from applications,
  end users, persisted state, browser APIs, or remote systems.
- The failure should be reported as an AngularTS defect.

#### ❌ When _Not_ to Use Asserts

Do **not** use asserts for anything that may fail due to **external
conditions**, **user-controlled input** or performance-critical code.

Asserts SHOULD NOT be used for:

- Public API arguments or application configuration.
- End-user data.
- JSON data, restored snapshots, environment config, or network responses.
- Browser capability or lifecycle checks.
- WebAssembly memory, messages, or other runtime-boundary data.
- Errors that are part of expected runtime behavior.
- Validation of business rules.

Asserts SHOULD NOT be used in "hot code paths" or any place where
its use can degrade the performance of the application over a period of time.
This includes frequently repeated paths such as digest watchers, parser
evaluation, directive link/update loops, DOM reconciliation, or event dispatch,
unless the invariant cannot be checked earlier.

Validate synchronous public inputs at the API boundary and throw an actionable
error directly. Route asynchronous application exceptions through the
appropriate framework error sink, such as `$exceptionHandler`.

Internal invariant failures should throw immediately. Do not route them through
`$exceptionHandler` as a recoverable outcome. A broad framework callback
boundary may still encounter an invariant failure; the fail-fast exception
handler contract must rethrow it.

###### Non-assertion Examples

- User-provided data fails validation.
- Server returns malformed JSON.
- Missing runtime config.
- Event payloads have unexpected types.
- Anything that can be corrected by the application or its users.

## Errors And Exceptions

AngularTS uses one ownership question: **can the initiating caller still receive
this failure?** Deliver the failure to exactly one boundary.

- If the caller is synchronous, throw directly from the called API.
- If the caller is awaiting an operation, reject the returned promise.
- If no caller remains because the work is detached, report the escaped
  exception through `$exceptionHandler`.
- If the state should be impossible inside the framework, use
  `assertInvariant*` and throw immediately.
- Expected cancellation and control-flow outcomes stay in their domain
  protocol and are not reported as unexpected exceptions.

`validate*`, `require*`, and `ensure*` describe where a local check occurs; they
do not define separate error channels. Shared public-input helpers belong in
`shared/validate.ts`, throw standard JavaScript errors, and must not report to
`$exceptionHandler`.

### Error Construction

Use the narrowest error contract that helps the caller:

- Use an existing service error class or namespaced AngularTS error only when
  the caller can inspect a documented stable category, code, or operation
  metadata. Do not introduce a domain error solely to customize its message.
- Use `TypeError` for a plain JavaScript type or shape mismatch and `RangeError`
  for an invalid numeric range or memory bound.
- Use `Error` for lifecycle violations and invalid values that have no public
  domain error contract.
- Preserve browser and remote failures as `cause` when wrapping them in a
  domain error. Do not replace an unknown thrown value solely to make it an
  `Error` before forwarding it to `$exceptionHandler`.

Error messages must identify the failing API or operation and the violated
condition. Publicly observable validation and lifecycle failures must document
their `@throws` contract.

### Exception Boundaries

`$exceptionHandler` owns exceptions that escape work whose original caller can
no longer receive them, including DOM and transport event callbacks, scheduled
tasks, subscriptions, and detached lifecycle callbacks. It is not a substitute
for argument validation, a promise rejection, or an operation's typed error
channel.

The default handler rethrows the received value unchanged. The public handler
type returns `never`; configured handlers must report and rethrow. Framework
code may perform required cleanup in `finally`, but it must not depend on code
after `$exceptionHandler` running.

At a catch boundary:

- Forward the caught value unchanged and exactly once.
- Do not both reject or throw and call `$exceptionHandler` for the same failure.
- Do not log the same unexpected exception as a second terminal sink.
- If the catch only restores framework state, rethrow the original value.
- If failure is an expected operational outcome, use the operation's result,
  rejection, diagnostic, or domain error path instead.
- A deliberately ignored capability probe or best-effort cleanup must omit the
  catch binding and make its fallback behavior evident in the code.
