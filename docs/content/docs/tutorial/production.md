---
title: Prepare production
description:
  Apply the minimum production, security, and operability checks to the task
  board.
weight: 70
---

Before deployment:

- Build with production optimization and an intentional source-map policy.
- Serve hashed assets with long-lived caching and HTML with revalidation.
- Keep API URLs and secrets out of the browser bundle.
- Enforce HTTPS and an explicit Content Security Policy.
- Exercise loading, empty, error, offline, and slow-network states.
- Test keyboard navigation and visible focus.
- Record the AngularTS version in the lockfile.
- Run type checking, unit tests, browser tests, and integration checks in CI.

## Expected result

The application can be deployed repeatedly, reports failures without exposing
secrets, and remains usable when requests fail.

Continue with [Production and deployment](/docs/guides/production/) and
[Best practices](/docs/cookbook/best-practices/).
