---
title: Component, directive, or web component
description: Choose the correct ownership and interoperability boundary.
weight: 50
---

## Default

Use a component for an application-owned UI region with a controller and view.

Use a directive to add behavior to existing DOM when the host and surrounding
content remain owned by another view.

Use a web component when the element must cross framework or document boundaries
through browser-standard custom-element APIs.

Avoid directives that secretly own large subtrees and components that mutate
unrelated DOM. Clear ownership makes cleanup, testing, and change detection
predictable.
