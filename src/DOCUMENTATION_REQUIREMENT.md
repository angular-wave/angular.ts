# Documentation Requirement

Any refactor that changes the public AngularTS surface must document the public
API, generated docs impact, user guidance, examples, and test coverage as one
unit.

This is a documentation requirement, not a CI requirement. Automation can help
verify the requirement, but the architectural rule is that public API changes
are not considered complete until users can discover, understand, and exercise
the intended path from the docs.

This requirement is part of the AngularTS level-9 maturity bar. A framework API
is not mature merely because it exists and passes tests. It becomes level-9
when the exposed types, generated references, user guidance, migration notes,
and executable or testable examples all describe the same stable contract.

This requirement applies to:

- new public types
- removed or hidden public types
- renamed public types
- changed service config
- changed `NgModule` authoring methods
- changed module extension APIs
- changed runtime service behavior
- provider-to-config migrations

Internal-only changes may skip this documentation requirement only when they do
not affect generated types, docs, examples, or user-visible behavior.

## Required Documentation For Every Public Change

1. Public contract
   - Export a named type through `src/namespace.ts` when users encounter it.
   - Export the same contract through `src/docs.ts` for generated docs.
   - Do not expose provider recipes or implementation-only protocol types.
   - Add the relevant user guide and sample path in the owning module docs.

2. Generated type surface
   - Regenerate declaration files when public TypeScript surface changes.
   - Regenerate integration surfaces when generated bindings track the public
     namespace.
   - Do not expose internal or unpublished implementation types through
     generated parity by accident.

3. Generated docs
   - Public symbols must have enough JSDoc or TypeDoc context to be useful in
     `docs/static/typedoc`.
   - Generated docs must be refreshed whenever exported public types change.
   - Hidden/internal symbols must not appear as recommended user-facing API.

4. User guidance
   - Add or update the relevant page under `docs/content`.
   - Explain the stable user path, not the internal provider path.
   - Put config beside the runtime service it configures.
   - Include migration notes when replacing provider usage or removing a public
     type.

5. Executable or testable samples
   - Every new public API needs at least one sample in `docs/content` or
     `docs/static/examples`.
   - Snippets must be validated by `make docs-examples-check`.
   - Multi-step flows should live in `docs/static/examples` so they can be
     promoted to runnable checks.
   - Behavioral APIs need source tests in addition to docs samples.
   - New modules must target 100% test coverage before they are considered
     level-9 complete.
   - Any temporary coverage gap for a new module must be documented in its
     pull request with a reason, owner, and closing condition.

6. Migration coverage
   - Every deprecated public path needs a replacement path or explicit removal
     rationale.
   - Provider-to-config migrations must show the old path and new path.
   - Major-version removals must update the migration guide before removal.

## Verification Commands

Use the narrowest relevant test first, then these verification commands where
they apply:

```bash
make generated-check
make docs-examples-check
make doc
```

For broad public-surface changes, this is the preferred verification set:

```bash
make check
make doc
```

For new modules, add coverage verification for the module and document the
result in the pull request. The target is 100% coverage for the new module's
owned files.

For docs-only changes that include examples:

```bash
make docs-examples-check
make doc
```

For a complete level-9 documentation refresh:

```bash
make docs-requirement
```

This target runs generated surface checks, docs example checks, and TypeDoc
generation. It is a maintainer convenience target for the documentation
requirement, not a CI mandate.

## Documentation Tooling

- `make docs-requirement` refreshes generated surfaces, validates examples,
  generates TypeDoc, and checks public type documentation.
- `make public-type-docs-check` derives the current public surface from
  `src/namespace.ts` and requires a generated TypeDoc page for every export.
- `make docs-examples-check` validates API references used by documentation
  examples.
- Complex examples under `docs/static/examples` should become Playwright or
  TypeScript fixtures instead of passive snippets.

## Level-9 Documentation Completeness

A public API refactor slice is not documented until:

- generated declarations are current
- generated integration surfaces are current or intentionally excluded
- TypeDoc output is current
- docs explain the intended user path
- docs do not teach internal provider plumbing as the default path
- examples compile or are checked by existing docs tooling
- behavioral changes have source tests
- migration guidance exists for every intentional public break

The level-9 rule is simple: if users can see or import a public API, they
should be able to find what it is for, how to configure it, how to migrate to
it, and a sample that exercises the intended path.
