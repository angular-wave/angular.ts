# Namespace Surface Contract

The `ng` namespace is the documented type surface that users encounter while
authoring, configuring, extending, or consuming AngularTS applications.

## Inclusion Rule

A type belongs in `src/namespace.ts` when at least one public API exposes it to
users and its name improves authoring, generated bindings, or documentation.
A named primitive alias may remain when the name communicates domain meaning;
`Expression` is an example.

Do not export:

- provider recipes or provider-shaped aliases
- internal composition details
- protocol implementation details that users cannot encounter
- aliases that only rename another framework or Web Platform type without
  adding useful semantics

Every public injection token must map directly to a named `ng` contract in
`InjectionTokenMap`. The contract must be exported through `src/docs.ts` so it
has generated documentation.

## Generated Surfaces

Closure, ClojureScript, Dart, Gleam, Kotlin, Rust parity, declarations, and
TypeDoc must track `src/namespace.ts`. Unpublished integrations do not justify
leaking implementation types into the namespace.

Do not use the `@internal` TypeDoc tag in `src/namespace.ts`; declaration emit
strips those exports. Hide internal types by not exporting them.

## Verification

```bash
make internal-composition-check
make test-namespace-js
make generated-check
make public-type-docs-check
```
