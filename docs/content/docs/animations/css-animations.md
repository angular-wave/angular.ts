---
title: "CSS-based animations with the AngularTS CSS driver"
weight: 10
description: "Write CSS transitions and keyframe animations for AngularTS structural directives using ng-enter, ng-leave, ng-move, and stagger classes."
---
The CSS animation driver is the default mechanism for animating AngularTS structural directives. When a directive calls `$animate.enter()`, `$animate.leave()`, `$animate.move()`, `$animate.addClass()`, or `$animate.removeClass()`, the CSS driver reads the element's computed `transitionDuration` and `animationDuration` after applying the appropriate preparation classes. If it detects a non-zero duration, it manages the full lifecycle: blocking premature transitions, applying active classes after a `requestAnimationFrame`, listening for `transitionend` and `animationend` events, and cleaning up all temporary classes when the animation finishes.
## How the CSS driver works

The driver goes through a fixed sequence for every animation:

1. **Preparation classes are added.** For a structural event, this means `.ng-enter`, `.ng-leave`, or `.ng-move`. For class-based events, it means `.foo-add` or `.foo-remove`.
2. **Transitions are temporarily blocked** by applying a large negative `transitionDelay` inline style. This prevents the browser from computing a transition before the active class is applied.
3. **The driver waits for the next quiet `requestAnimationFrame`.** This forces the browser to flush style calculations, so `getComputedStyle()` returns accurate timing values.
4. **Active classes are added** (e.g., `.ng-enter-active`). The negative delay is removed at the same time, causing any defined CSS transition to start.
5. **The driver listens for `transitionend` / `animationend`.** A fallback `setTimeout` fires at `delay + 1.5 * duration` to handle browsers that may not fire the event reliably.
6. **Cleanup.** All preparation and active classes are removed, inline `transition` and `animation` style overrides are reverted, and the `AnimateRunner` is resolved.

> **Note:** The CSS driver only runs an animation if `getComputedStyle()` reports a non-zero `transitionDuration` or `animationDuration` after the preparation classes are applied. If no duration is detected, the driver skips the animation and immediately resolves the runner.
## CSS transitions

The simplest way to animate an element is to define CSS transitions on the preparation classes. The transition must be set on the preparation class (`.ng-enter`) and the final state on the active class (`.ng-enter-active`).

```css
.my-element.ng-enter {
  transition: opacity 0.3s ease, transform 0.3s ease;
  opacity: 0;
  transform: translateY(-10px);
}

/* The ending state — applied one rAF later to trigger the transition */
.my-element.ng-enter-active {
  opacity: 1;
  transform: translateY(0);
}

/* Leave animation — reverse the enter */
.my-element.ng-leave {
  transition: opacity 0.3s ease, transform 0.3s ease;
  opacity: 1;
  transform: translateY(0);
}

.my-element.ng-leave-active {
  opacity: 0;
  transform: translateY(10px);
}
```
## CSS keyframe animations

You can also use `@keyframes` animations. Define the keyframe animation on the preparation class using the `animation` shorthand property:

```css
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideOut {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(20px);
  }
}

.my-element.ng-enter {
  animation: slideIn 0.4s ease forwards;
}

.my-element.ng-leave {
  animation: slideOut 0.4s ease forwards;
}
```

With keyframe animations the active class (`.ng-enter-active`) is not required to drive the animation, but you can still use it to override or extend properties applied during the active phase.
## Class-based transitions (ng-show / ng-hide)

When `ng-show` or `ng-hide` adds or removes the `ng-hide` class, `$animate.addClass()` and `$animate.removeClass()` are called internally. The CSS driver applies `.ng-hide-add` / `.ng-hide-add-active` for the hide transition and `.ng-hide-remove` / `.ng-hide-remove-active` for the show transition.

```css
.my-panel.ng-hide-add {
  transition: opacity 0.25s ease;
  opacity: 1;
}

.my-panel.ng-hide-add-active {
  opacity: 0;
}

/* Fade in when revealed */
.my-panel.ng-hide-remove {
  transition: opacity 0.25s ease;
  opacity: 0;
}

.my-panel.ng-hide-remove-active {
  opacity: 1;
}
```

The same pattern applies to any class you add or remove via `$animate.addClass()` or `$animate.removeClass()`. If you call `$animate.addClass(el, 'highlighted')`, the driver applies `.highlighted-add` and `.highlighted-add-active`.
## Example: animating `ng-repeat` list items

`ng-repeat` calls `$animate.enter()` when a new item is added, `$animate.leave()` when one is removed, and `$animate.move()` when the list is reordered.

```html
  <li class="list-item" ng-repeat="item in items track by item.id">
    {{ item.name }}
  </li>
</ul>
```

```css
.list-item.ng-leave,
.list-item.ng-move {
  transition: all 0.3s ease;
}

.list-item.ng-enter {
  opacity: 0;
  transform: scale(0.9);
}

.list-item.ng-enter-active {
  opacity: 1;
  transform: scale(1);
}

.list-item.ng-leave {
  opacity: 1;
  transform: scale(1);
}

.list-item.ng-leave-active {
  opacity: 0;
  transform: scale(0.9);
}

.list-item.ng-move {
  opacity: 0.5;
}

.list-item.ng-move-active {
  opacity: 1;
}
```
## Example: slide transition with `ng-if`

`ng-if` removes and re-inserts the entire element, so you can animate it with `ng-enter` / `ng-leave` transitions:

```html
  <!-- drawer content -->
</div>
```

```css
  overflow: hidden;
}

.drawer.ng-enter {
  transition: max-height 0.35s ease, opacity 0.35s ease;
  max-height: 0;
  opacity: 0;
}

.drawer.ng-enter-active {
  max-height: 500px;
  opacity: 1;
}

.drawer.ng-leave {
  transition: max-height 0.35s ease, opacity 0.35s ease;
  max-height: 500px;
  opacity: 1;
}

.drawer.ng-leave-active {
  max-height: 0;
  opacity: 0;
}
```
## Staggered animations

When multiple elements animate simultaneously under the same parent — common with `ng-repeat` — the CSS driver detects a stagger class automatically. Define `.ng-enter-stagger` with `transition-delay` and zero `transition-duration`:

```css
  transition: opacity 0.3s ease, transform 0.3s ease;
  opacity: 0;
  transform: translateY(8px);
}

.list-item.ng-enter-active {
  opacity: 1;
  transform: translateY(0);
}

/* Stagger: each subsequent item is delayed by 80ms */
.list-item.ng-enter-stagger {
  transition-delay: 0.08s;
  transition-duration: 0s;
}
```

The driver reads the `transitionDelay` from `.ng-enter-stagger` and multiplies it by the item's index within the batch. The first item starts immediately; each additional item is offset by the stagger delay.

### Enter stagger

```css
.list-item.ng-enter-stagger {
  transition-delay: 0.1s;
  transition-duration: 0s;
}
```

### Leave stagger

```css
.list-item.ng-leave-stagger {
  transition-delay: 0.05s;
  transition-duration: 0s;
}
```

### Move stagger

```css
.list-item.ng-move-stagger {
  transition-delay: 0.08s;
  transition-duration: 0s;
}
```
## The `$animateCss` service

The `$animateCss` service is the low-level function that the CSS driver calls internally. You can inject it directly when you need programmatic control over CSS animations — for example, in a custom directive or animation factory. It accepts an element and an options object, and returns an `Animator` handle with `_willAnimate`, `start()`, and `end()` properties.

```typescript
  return {
    link(scope, element) {
      const animator = $animateCss(element[0], {
        event: 'enter',
        structural: true,
        duration: 0.5,
        easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        from: { opacity: 0, transform: 'scale(0.5)' },
        to:   { opacity: 1, transform: 'scale(1)' },
      });

      if (animator._willAnimate) {
        animator.start();
      }
    },
  };
}]);
```

Key options accepted by `$animateCss`:

| Option          | Type                     | Description                                                                              |
| --------------- | ------------------------ | ---------------------------------------------------------------------------------------- |
| `event`         | `string \| string[]`     | The animation event name(s) used to compute preparation class names.                     |
| `structural`    | `boolean`                | Set to `true` for `enter`, `leave`, `move` so the driver applies `ng-` prefixed classes. |
| `addClass`      | `string`                 | CSS classes to add; drives `-add` / `-add-active` classes.                               |
| `removeClass`   | `string`                 | CSS classes to remove; drives `-remove` / `-remove-active` classes.                      |
| `from`          | `Record<string, string>` | Initial inline styles applied before the animation starts.                               |
| `to`            | `Record<string, string>` | Final inline styles applied when the active class is added.                              |
| `duration`      | `number`                 | Override the `transitionDuration` (in seconds).                                          |
| `delay`         | `number \| string`       | Override the `transitionDelay` or `animationDelay`.                                      |
| `easing`        | `string`                 | Override `transitionTimingFunction` or `animationTimingFunction`.                        |
| `stagger`       | `number`                 | Explicit stagger delay in seconds (bypasses `.ng-enter-stagger` detection).              |
| `staggerIndex`  | `number`                 | Index of this element in the stagger sequence.                                           |
| `cleanupStyles` | `boolean`                | Restore original inline styles after the animation completes.                            |
## Performance tips

CSS animations can be expensive when they trigger layout or paint on every frame. Follow these guidelines to keep animations smooth:

#### Use transform and opacity

`transform` and `opacity` are the only properties that browsers can animate entirely on the GPU compositor thread without triggering layout or paint. Prefer these over `width`, `height`, `top`, `left`, `margin`, or `padding`.

#### Avoid animating box-model properties

Properties like `height`, `padding`, and `margin` force layout recalculation on every frame. Use `transform: scaleY()` or `max-height` tricks as alternatives where possible.

#### Use will-change sparingly

Adding `will-change: transform` hints to the browser that the element will be animated, creating a new compositor layer. Use it only on elements you know will animate — overuse increases memory consumption.

#### Limit simultaneous animations

Use `$animateProvider.classNameFilter()` or `$animateProvider.customFilter()` to restrict animations to specific elements. Animating large numbers of DOM nodes simultaneously causes frame drops on low-powered devices.

```css
.my-element.ng-enter {
  transition: opacity 0.3s ease, transform 0.3s ease;
  opacity: 0;
  transform: translateY(-12px);
  will-change: opacity, transform;
}

.my-element.ng-enter-active {
  opacity: 1;
  transform: translateY(0);
}
```
