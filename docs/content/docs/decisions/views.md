---
title: Templates or typed views
description:
  Choose between declarative HTML templates and type-safe DOM construction.
weight: 10
---

## Default

Use typed views for new TypeScript components when model-to-view type safety
matters. Use templates when designers own substantial HTML or server-delivered
markup is required.

## Choose a typed view when

- Refactors must check property and event bindings.
- The view is highly dynamic.
- You want real DOM construction without parsing HTML.
- A component and its view evolve together.

## Choose a template when

- Markup is mostly static and visually authored.
- Existing template tooling is central to the team.
- Progressive enhancement starts from server HTML.

Both use normal module registration, dependency injection, lifecycle, and change
detection.
