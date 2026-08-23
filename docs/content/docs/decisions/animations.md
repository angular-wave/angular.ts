---
title: CSS or JavaScript animations
description:
  Choose the simplest animation mechanism that meets sequencing and control
  needs.
weight: 40
---

## Default

Use CSS transitions or keyframes for visual state changes. They are easy to
cancel and keep view logic small.

Use JavaScript animation hooks when sequencing depends on application state,
measurements, asynchronous work, or coordinated entry and removal.

Always respect reduced-motion preferences. Animation should explain change or
preserve spatial context; it must not block input or carry required information
by itself.
