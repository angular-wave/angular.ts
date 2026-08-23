---
title: Controller state, models, or services
description: Put state at the narrowest lifetime that satisfies its consumers.
weight: 20
---

## Default

Keep transient view state on the component controller.

Use a named model when state is reactive, shared by multiple roots or
components, and benefits from snapshot, restore, or synchronization behavior.

Use a service when the primary responsibility is an operation or external
resource rather than mutable view data.

Ask who owns the state, who may mutate it, how long it lives, and how it resets.
Global state is an application-level lifetime commitment, not a shortcut for
passing data.
