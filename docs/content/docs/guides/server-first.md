---
title: Keep the application on the server
weight: 1
description:
  Render HTML and keep domain logic on the server until the browser must own a
  genuinely complex application model.
---

## Start with HTML from the server

Do not start by building an SPA. Render the useful page on the server and use
normal links and forms. Keep domain models, validation, authorization,
transactions, URLs, and HTML generation together for as long as possible.

This is the simplest way to keep the model consistent. The server reads current
data, applies the rules, and renders the result in one place. The browser
receives HTML it can display immediately. There is no second model to
synchronize, no client startup request for content the server already had, and
no duplicated loading, routing, validation, and error behavior.

HTML and server rendering are the default application architecture. AngularTS is
there to add behavior where the browser can improve an already useful page.

## Add behavior without taking over the page

Put `ng-app` around the smallest region that needs local interaction. Use scope,
events, effects, HTTP directives, and DOM references for immediate browser
behavior while the server continues to own the page and its durable model.

Keep these on the server:

- Initial and durable application state
- Validation and authorization
- Data loading and mutations
- Primary URLs and navigation
- HTML for complete pages and reusable fragments
- Error, empty, permission, and maintenance responses

Do not fetch JSON after startup merely to rebuild HTML that the server could
have sent in the first response.

## Keep router content server-rendered

Using the AngularTS router does not require moving rendering or the model into
the browser. Let the router coordinate transitions and component lifetimes, but
keep route content as server-rendered HTML fragments while that remains
practical.

This preserves one server model while still allowing faster transitions,
long-lived browser resources, and local interaction state. A router is not a
reason to duplicate server templates as client templates.

## Move the model only as a last resort

Move model ownership into the browser only when the feature genuinely needs it.
Examples include substantial offline work, high-frequency local editing, complex
cross-screen state, or an application-like workspace whose model must remain
alive independently of server navigation.

Before making that move, confirm that server-rendered fragments, focused
interactive regions, or a small client model cannot solve the problem. Most
pages should never cross this line.

## Move compilation with the model

Once the browser owns the model, it also owns model consistency and view
compilation. Do not keep a complex client model on one side and loosely typed
HTML template bindings on the other.

Make [typed programmatic views]({{< relref "/docs/views/typed" >}}) the primary
view style for client-owned application screens. They keep model access, DOM
properties, events, and generated structure in the same checked TypeScript code.
Use HTML templates for server-owned pages, server-rendered fragments, and small
enhancements where the server model remains authoritative.

## Move the data boundary with the model

Before the browser owns the model, prefer simple HTTP: normal navigation, form
submissions, and server-rendered HTML fragments. The server already has the
authoritative data and can return the final representation directly.

Once the browser owns a complex application model, REST services become the
primary server boundary. At that point the frontend also needs an explicit cache
strategy and security policy:

- Define stable request, response, validation, pagination, and error contracts.
- Decide which model owns each cached record and how writes invalidate it.
- Handle stale data, concurrent writes, retries, and offline state deliberately.
- Define credential handling, authorization failures, CSRF or token policy,
  cross-origin access, content security, and secret storage for the browser app.

Do not introduce this REST, cache, and security machinery for a page that can
submit a form or request a server-rendered fragment. It becomes primary only
when the browser has genuinely taken ownership of the model.

## Let modules use different architectures

The ownership decision is not application-wide. AngularTS applications are
multimodular, and each module or `ng-app` root can stop at a different point in
the progression.

For example:

| Area                         | Appropriate architecture                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| Sign-in and account recovery | Server-rendered HTML forms and normal HTTP                                           |
| Public content and checkout  | Server pages with focused AngularTS enhancements                                     |
| Dashboard workspace          | Client router, browser-owned model, REST, cache policy, and typed programmatic views |
| Reports and downloads        | Server-generated files and normal browser navigation                                 |

The login form does not need to become part of the dashboard SPA. The dashboard
can start as its own `ng-app` after authentication and own only the screens
whose complexity justifies it. Both modules can share the same server session
and authorization rules without sharing a frontend architecture.

This keeps complexity contained. A client-owned dashboard does not force public,
authentication, settings, or support pages to adopt its router, model cache, or
rendering strategy.

## Use this order

| Start here                      | Escalate only when needed                             |
| ------------------------------- | ----------------------------------------------------- |
| Server-rendered page            | Small AngularTS-enhanced region                       |
| Normal links and forms          | Server-rendered router fragment                       |
| Server-owned model              | Small browser interaction model                       |
| Simple HTTP pages and fragments | REST, cache, and browser security policy              |
| Server HTML templates           | Typed programmatic view after browser model ownership |
| One server-rendered module      | One client-owned module where justified               |

At every step, stop when the current approach solves the user problem. The last
row is not a target architecture. It is the option for the minority of features
that truly need the browser to own the application model.

## Verify the decision

For each client-owned model, write down why a server-rendered page, server
fragment, or focused enhancement is insufficient. Test direct navigation,
JavaScript failure, authorization, validation, refresh, Back and Forward, stale
data, deployment rollback, and recovery after a failed request.
