# Scala.js Integration Maintenance

This document defines ownership and review cadence for the AngularTS Scala.js
integration.

## Ownership

- The AngularTS core maintainers own runtime compatibility, public namespace
  changes, and release approval.
- Scala.js integration maintainers own facade shape, Scala examples, package
  build health, and Scala-specific documentation.
- Generated parity artifacts are owned by the maintainer changing the AngularTS
  public surface that caused regeneration.

## Review Cadence

- Review namespace parity after every AngularTS public API change.
- Review service facade coverage before every minor AngularTS release.
- Review unsafe-surface decisions before promoting any dynamic interop into the
  default Scala package API.
- Review `README.md`, `SCALA_JS_INTEGRATION_ROADMAP.md`, and
  `NG_NAMESPACE_PARITY.md` before publishing a Scala package candidate.

## Required Checks

Run these before merging Scala integration changes:

```sh
make check
make lint
make -C integrations/scala check
```

## Generated Facade Updates

- Regenerate namespace parity when `@types/namespace.d.ts` changes.
- Keep facade additions typed by default.
- Add token coverage for injectable services.
- Add unit tests for new config builders and typed callback shapes.
- Add browser smoke coverage when a facade controls runtime behavior.
