---
title: Public feature coverage
description:
  Understand how runtime modules map to learning guides and API reference.
weight: 25
---

Every shipped directive module, service module, filter module, public injection
token, and built-in configuration key must map to documentation.

A mapping is either:

- **Dedicated:** the page documents that feature directly.
- **Canonical:** a broader page owns the feature as part of one workflow.

The mapping is stored in `docs/public-feature-docs.json`. CI discovers the
source surface and fails when a module or public token changes without updated
documentation ownership.

Utility, worker, WebAssembly, and transport helpers are documented at their
user-facing boundary rather than by internal source file. Generated TypeScript
API pages remain the authoritative signature reference; guides explain when and
why to use those signatures.
