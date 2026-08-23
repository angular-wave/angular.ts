---
title: Task guides
weight: 40
description:
  Implement complete AngularTS workflows with explicit state, failure,
  lifecycle, accessibility, and verification behavior.
---

These guides extend one task-board application. They explain implementation
boundaries rather than presenting isolated snippets.

## Start with server-rendered HTML

Do not start with an SPA. Keep the model, rules, URLs, and rendering together on
the server. Send useful HTML first, then add AngularTS to the smallest region
that needs browser behavior.

Even when using the router, prefer server-rendered route fragments. Move the
model into the browser only for the most complex client-owned features. When the
browser takes over model consistency and compilation, use typed programmatic
views as the primary view style. REST services, explicit caching, and a
browser-facing security policy also become primary at that same threshold. Until
then, prefer normal HTTP pages, forms, and server-rendered fragments.

Apply this decision per module. A server-rendered login and public site can live
beside a dashboard SPA in the same application. The dashboard's complexity does
not require every other module to move into the browser.

Read [Keep the application on the server](server-first/) before choosing the
application structure.

## Build the application

1. [Keep the application on the server](server-first/)
2. [Structure the application](application-structure/)
3. [Build and validate a form](forms/)
4. [Load server data](server-data/)
5. [Add routing](routing/)
6. [Handle errors](error-handling/)
7. [Test behavior](testing/)

## Make it production-ready

- [Browser support](browser-support/)
- [Accessibility](accessibility/)
- [Internationalization](internationalization/)
- [Application security](security/)
- [Observability](observability/)
- [Production and deployment](production/)
- [Troubleshooting](troubleshooting/)

Start with the [complete tutorial](/docs/tutorial/) if you have not built an
AngularTS component.
