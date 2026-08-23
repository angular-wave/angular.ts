---
title: Integrate AngularTS with another framework
description:
  Choose DOM ownership, messages, observed attributes, or shared reactive state
weight: 94
---

## Problem

An AngularTS module must coexist with a web component or another UI framework
without both runtimes fighting over the same DOM and state.

## Before you start

Give each framework its own root element. One framework owns rendering and
cleanup inside that root. Integrate at the root boundary instead of compiling
the same subtree twice.

## Choose the smallest bridge

| What crosses the boundary                     | Use                                                                  |
| --------------------------------------------- | -------------------------------------------------------------------- |
| A transient message that something happened   | [The event bus]({{< relref "/docs/cookbook/framework-event-bus" >}}) |
| State reflected by a custom element attribute | [`ng-observe`]({{< relref "/docs/cookbook/framework-observe" >}})    |
| Current domain state needed by both sides     | [A shared model]({{< relref "/docs/cookbook/framework-model" >}})    |

Use browser custom events directly when one element and its immediate owner are
the only participants. Use the event bus when producers and consumers should not
know each other. Use a model when consumers need the current value, not only a
notification that it changed.

## Failure path

Do not use the event bus as a state store, poll DOM attributes that can be
observed, or let two frameworks render the same children. Every subscription,
observer, and external framework root needs one clear lifecycle owner.

## Apply it now

Choose one existing cross-framework callback and classify what crosses the
boundary: DOM state, a transient event, or durable current state. Replace the
custom glue with the matching bridge.

## Verify

Mount and unmount both roots repeatedly. Confirm messages are delivered once,
attribute state remains current, models update both consumers, and no listener
or observer survives its owner.
