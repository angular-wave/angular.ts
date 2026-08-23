---
title: 'AngularTS animations: CSS and JavaScript drivers overview'
linkTitle: 'Animations'
weight: 30
description:
  'Overview of the AngularTS animation system — the $animate service, CSS and JS
  drivers, structural directive hooks, and class-based transitions.'
---

AngularTS ships a first-class animation system built into the core framework.
When you use structural directives such as `ng-if`, `ng-repeat`, `ng-show`,
`ng-hide`, `ng-include`, or `ng-view`, the framework automatically coordinates
with the `$animate` service to apply CSS class hooks and invoke registered
JavaScript animation handlers at the exact moment DOM changes occur — before and
after insertion, removal, or class toggling.

## How animations are triggered

Animations in AngularTS are not triggered by calling an animation API directly.
Instead, they are a side-effect of normal directive activity. When `ng-if`
removes an element, it calls `$animate.leave()` internally. When `ng-repeat`
inserts a new item, it calls `$animate.enter()`. This means you never need to
change your directive usage — you only need to provide CSS rules or a registered
JavaScript animation for the matching class names.

The `$animate` service sits between directives and the animation drivers. It
queues animation work, deduplicates competing animations on the same element,
and dispatches to whichever driver is configured. All animation requests are
deferred until after the current digest cycle completes, so DOM changes and
class mutations are always applied in a stable, predictable order.

## The two animation drivers

AngularTS provides two built-in drivers that are consulted in sequence. The JS
driver is checked first; if it returns a handler, the CSS driver is skipped for
that element. If no JS handler matches, the CSS driver reads the element's
computed styles to detect transitions or keyframe animations.

#### [CSS driver]({{< relref "/docs/animations/css-animations" >}})

Reads `transitionDuration`, `animationDuration`, and related computed style
properties after applying preparation classes. Handles staggering, delays, and
both CSS transitions and `@keyframes` animations with no JavaScript required.

#### [JS driver]({{< relref "/docs/animations/js-animations" >}})

Invokes factory functions registered via `module.animation()`. Each factory
returns an object with lifecycle hooks (`enter`, `leave`, `move`, `addClass`,
`removeClass`, `setClass`, `animate`) that receive a `done` callback. Suitable
for Web Animations API, GSAP, or any imperative animation library.

## CSS class hooks

The CSS driver applies a pair of classes for every animation event. The first
class (the preparation class) is added immediately; the second class (the active
class) is added one `requestAnimationFrame` later so the browser can compute a
transition between the two states. Both classes are removed when the animation
completes.

| Event             | Preparation class | Active class         |
| ----------------- | ----------------- | -------------------- |
| `enter`           | `.ng-enter`       | `.ng-enter-active`   |
| `leave`           | `.ng-leave`       | `.ng-leave-active`   |
| `move`            | `.ng-move`        | `.ng-move-active`    |
| `addClass foo`    | `.foo-add`        | `.foo-add-active`    |
| `removeClass foo` | `.foo-remove`     | `.foo-remove-active` |

During structural animations (`enter`, `leave`, `move`), the element also
receives `.ng-animate` for the full duration of the animation.

For staggered animations — such as list items entering one after another —
define a stagger delay class:

```css
.my-list-item.ng-enter-stagger {
  transition-delay: 0.1s;
  transition-duration: 0s;
}
```

The CSS driver detects `.ng-enter-stagger` automatically when more than one
element is being animated simultaneously under the same parent.

## The `$animate` service API

The `$animate` service is injectable and provides the full animation API. Every
method returns an `AnimateRunner` that you can use to react to completion or
cancel the animation early.

```ts
$animate.enter(panel, container);
$animate.leave(panel);
$animate.addClass(panel, 'highlighted');
$animate.setClass(panel, 'active', 'inactive');
$animate.animate(panel, { opacity: 0 }, { opacity: 1 }, 'fade');
```

### Full method signatures

| Method                                             | Description                                                 |
| -------------------------------------------------- | ----------------------------------------------------------- |
| `enter(element, parent?, after?, options?)`        | Insert element into the DOM and trigger an enter animation. |
| `leave(element, options?)`                         | Trigger a leave animation, then remove the element.         |
| `move(element, parent, after?, options?)`          | Move element within the DOM and trigger a move animation.   |
| `addClass(element, className, options?)`           | Add one or more CSS classes with an animation.              |
| `removeClass(element, className, options?)`        | Remove one or more CSS classes with an animation.           |
| `setClass(element, add, remove, options?)`         | Add and remove classes as a single atomic animation.        |
| `animate(element, from, to, className?, options?)` | Animate from one set of inline styles to another.           |
| `cancel(runner)`                                   | Cancel a running animation; the end state is still applied. |

### Observing animation completion

Every `$animate` method returns an animation handle. Use `done()` when code
needs to run after an animation settles, or pass `onStart`, `onDone`, and
`onCancel` callbacks in native animation options when the callback belongs to
one request.

```ts
const handle = $animate.enter(panelEl, hostEl);

handle.done((completed) => {
  console.log('Enter animation settled', completed);
});
```

## Registering JavaScript animations

To register a JavaScript animation, call the module-level `.animation()` method.
The name must be a CSS class selector starting with `.`:

```ts
angular.module('app', []).animation('.fade-animation', () => {
  return {
    enter(element, done) {
      element
        .animate([{ opacity: 0 }, { opacity: 1 }], 200)
        .finished.then(done);
    },
    leave(element, done) {
      element
        .animate([{ opacity: 1 }, { opacity: 0 }], 200)
        .finished.then(done);
    },
  };
});
```

The registered animation is matched against the element's class list. If the
element has `.fade-animation` when an `enter` event fires, the `enter` hook is
invoked.
