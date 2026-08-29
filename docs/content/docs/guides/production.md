---
title: Production and deployment
description:
  Produce, verify, deploy, observe, and roll back an AngularTS artifact without
  relying on development behavior.
weight: 80
---

## Produce one immutable artifact

Install from the lockfile, typecheck source and tests, validate generated
bindings, run browser tests, and build once. Promote the same artifact through
environments. Rebuilding after approval changes the release.

Fingerprint immutable assets. Revalidate HTML and route manifests so they
reference current fingerprints. Version service-worker caches and remove
obsolete entries only after the new worker can serve a complete application.

## Verify production behavior

Smoke-test generated output with development fallbacks disabled. Cover direct
route entry, refresh on nested URLs, CSP, API credentials, loading and failure
states, offline behavior, and service-worker upgrade from the previous release.

## Design rollback before deployment

Retain the previous artifact. Determine whether storage migrations, server
contracts, or service-worker caches make rollback incompatible. Prefer
additive data changes.

Attach a release identifier to errors and operations. After deployment, verify
asset integrity, critical routes, request latency, error rate, and one synthetic
workflow. Stop promotion or roll back from explicit thresholds.

Follow the [upgrade procedure](/docs/migration/upgrading/) for framework
changes.
