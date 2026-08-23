---
title: Upgrade AngularTS
description:
  Update the runtime and generated language bindings with controlled, reversible
  steps.
weight: 20
---

## Before changing the version

Record the current production version, read release and migration notes, and
make sure the existing application passes its checks. Archive generated
integration artifacts so regeneration differences are reviewable.

## Upgrade

1. Update AngularTS and its lockfile entry.
2. Regenerate TypeScript declarations and every maintained language binding.
3. Run formatting, lint, type, documentation, and generated-file checks.
4. Run core and integration tests.
5. Build production assets and exercise critical browser paths.
6. Review bundle, CSP, storage, routing, and service-worker changes.

## Keep the change reversible

Do not combine a framework upgrade with unrelated application rewrites. Deploy
an immutable artifact, retain the previous artifact, and understand whether
stored data or service-worker caches prevent a simple rollback.

## Deprecations

Remove deprecated usage while replacement and old behavior can still be
compared. Do not wait for the release that removes the API.

Generated bindings must come from the authoritative TypeScript namespace. Never
patch stale parity output manually.
