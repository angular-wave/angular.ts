---
title: Replace a region with trusted server HTML
description: Keep rendering on the server without compiling untrusted markup
weight: 46
---

## Problem

The server already renders a useful partial and returning JSON would duplicate
the same presentation rules in a client template.

## Before you start

Choose a stable target element. Treat every returned fragment as executable UI:
escape untrusted values on the server and allow only application-owned markup.

## Swap the fragment into a named region

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts, src/directive/http/get.spec.ts -->

```html
<section>
  <button
    type="button"
    ng-get="/account/summary"
    data-target="#account-summary"
    swap="innerHTML"
  >
    Refresh summary
  </button>
  <div id="account-summary" aria-live="polite">
    <p>Summary not loaded.</p>
  </div>
</section>
```

AngularTS wires directives and bindings in the returned application-owned
fragment. That makes server escaping and content ownership security requirements,
not optional cleanup.

## Server contract

Return `text/html` containing valid fragment markup. Keep scripts, inline event
handlers, user-authored templates, and unsanitized rich text out of the response.

## Failure path

Keep the old region on failure and show an error beside the refresh control.
Never swap an authentication page or generic proxy error into the target.

## Apply it now

Choose one JSON endpoint whose client template simply recreates existing server
HTML. Return the existing partial directly and remove the duplicate renderer.

## Verify

Test names containing `<`, `>`, quotes, and markup-like text. Confirm they render
as text, the fragment has balanced tags, and its controls work after replacement.
