---
title: Application security
description:
  Apply AngularTS trust boundaries to templates, typed properties, URLs,
  requests, storage, workers, and service workers.
weight: 100
---

External sources include URL parameters, forms, storage, server responses,
realtime messages, worker messages, and cross-window events. Sensitive sinks
include HTML, executable URLs, navigation, credentials, logs, and persisted
state.

Prefer interpolation, text children, and typed DOM properties. Use
`ng-bind-html` only for markup that passed application sanitization. A trust
override must be local and reviewable; never trust a value merely because it
came from your server.

Hidden routes, disabled buttons, and client guards improve UX but do not
authorize operations. The server must validate identity, permission, input
shape, size, and state transition.

Configure credentials and XSRF behavior for known origins. Reject unexpected
redirect and content types at the repository boundary. Store the minimum browser
data, validate versioned records on read, and never persist bearer credentials
for convenience.

Deploy HTTPS and a specific Content Security Policy. Review worker and
service-worker scope, allowed connection origins, update behavior, and rollback.
Security failures should remain visible rather than trigger broad policy
relaxation.
