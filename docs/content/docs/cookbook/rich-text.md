---
title: Render user-authored rich text safely
description: Sanitize stored markup and keep it separate from application templates
weight: 68
---

## Problem

Users can author formatted content, but inserting their HTML as an AngularTS
fragment could compile attacker-controlled directives or executable markup.

## Before you start

Choose a maintained allowlist sanitizer and a deliberately small formatting
policy. Sanitize on the server before storage or rendering, not only in the browser.

## Keep content inside an application-owned shell

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts -->

```html
<article>
  <header><h1>{{ post.title }}</h1></header>
  <div id="post-body" class="rich-text">
    SERVER_RENDERED_SANITIZED_CONTENT
  </div>
</article>
```

The shell may use AngularTS bindings. The user-authored body is sanitized content,
not a template and not a source of directives.

## Server contract

Allow only required elements and attributes, normalize URLs, block executable
schemes, and add safe link behavior. Re-sanitize old content when policy defects
are fixed.

## Failure path

Do not trust HTML because it came from your database, Markdown renderer, staff
account, or another service. Stored content can remain dangerous for years.

## Apply it now

Trace one rich-text field from input to output and identify the exact sanitizer,
policy, version, and test suite protecting it.

## Verify

Test scripts, event attributes, SVG, malformed nesting, encoded URLs, CSS escape
paths, and ordinary formatting that must remain intact.
