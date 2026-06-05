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
- changed plugin APIs
- changed runtime service behavior
- provider-to-config migrations

Internal-only changes may skip this documentation requirement only when they do
not affect generated types, docs, examples, or user-visible behavior.

## Required Documentation For Every Public Change

1. Public type inventory

   - Add or update the entry in `src/PUBLIC_API_SURFACE_INVENTORY.md`.
   - Classify the symbol as authoring, runtime, config, callback, extension,
     evidence, provider, internal, or legacy.
   - Record the user need: author, inject, configure, implement, consume, or
     none.
   - Record the docs page and sample path.

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

For docs-only changes that include examples:

```bash
make docs-examples-check
make doc
```

## Future Documentation Tooling

The current repository already has `make generated-check`,
`make docs-examples-check`, and `make doc`. The refactor should add stricter
documentation tooling in small slices:

1. Add a docs requirement target

   Candidate target:

   ```bash
   make docs-requirement
   ```

   It should give maintainers one command for generated surface checks, docs
   example checks, and TypeDoc generation. It is a convenience target, not a
   statement that CI must require it.

2. Add a public-type documentation check

   The check should report when a curated public type has no matching TypeDoc
   page or no inventory entry.

3. Add sample coverage metadata

   Public inventory entries should include a docs sample path. Tooling should
   report public user-facing types that lack at least one sample.

4. Promote runnable examples

   Complex examples under `docs/static/examples` should become Playwright or
   TypeScript fixtures instead of passive snippets.

5. Add migration-note checks

   Deprecated provider paths and removed public types should require migration
   notes before namespace changes land.

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
