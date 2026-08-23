---
title: Accessibility
description:
  Preserve semantics, focus, validation, announcements, and motion preferences
  across AngularTS structural and route updates.
weight: 90
---

`ng-if` removes content and destroys focused descendants. Before closing a
dialog, menu, or editor, choose the element that regains focus. `ng-show`
retains the subtree; verify hidden descendants cannot remain in keyboard order.

Use native buttons, links, labels, headings, and lists before ARIA. Attach
AngularTS events to those controls instead of rebuilding their keyboard behavior
on generic elements.

Associate errors with controls using `aria-describedby`. Show invalid state
after interaction or submission, retain the invalid value, focus the first
invalid control after failed submission, and provide a summary for long forms.
Server failures are separate from field constraints.

Use a polite live region for completion or background updates and an alert for
failures requiring immediate attention. Do not place an entire keyed list in a
live region.

Test direct route entry, route transitions, keyed reordering, loading
replacement, reduced motion, zoom, keyboard-only operation, and a screen-reader
workflow. Automated rules cannot determine whether focus movement makes sense.
