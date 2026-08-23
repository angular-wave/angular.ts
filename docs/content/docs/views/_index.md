---
title: View guides
weight: 50
description:
  'Choose and learn AngularTS HTML templates or type-safe component views, which
  share the same module and component lifecycle.'
---

A view is the DOM output of a component or directive. AngularTS offers two
authoring styles:

- [HTML templates]({{< relref "/docs/views/templates" >}}) keep static structure
  in markup and use directives for behavior.
- [Programmatic views]({{< relref "/docs/views/typed" >}}) construct DOM in
  TypeScript and type-check controller-to-view bindings.

Read [how to choose]({{< relref "/docs/views/choose" >}}). Both styles register
on normal modules. A server-rendered module can use HTML while a client-owned
dashboard module uses typed programmatic views in the same application.
