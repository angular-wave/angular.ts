---
title: "AngularTS animations: CSS and JavaScript drivers overview"
weight: 30
description: "Overview of the AngularTS animation system — the $animate service, CSS and JS drivers, structural directive hooks, and class-based transitions."
---
AngularTS ships a first-class animation system built into the core framework. When you use structural directives such as `ng-if`, `ng-repeat`, `ng-show`, `ng-hide`, `ng-include`, or `ng-view`, the framework automatically coordinates with the `$animate` service to apply CSS class hooks and invoke registered JavaScript animation handlers at the exact moment DOM changes occur — before and after insertion, removal, or class toggling.
## How animations are triggered

Animations in AngularTS are not triggered by calling an animation API directly. Instead, they are a side-effect of normal directive activity. When `ng-if` removes an element, it calls `$animate.leave()` internally. When `ng-repeat` inserts a new item, it calls `$animate.enter()`. This means you never need to change your directive usage — you only need to provide CSS rules or a registered JavaScript animation for the matching class names.

The `$animate` service sits between directives and the animation drivers. It queues animation work, deduplicates competing animations on the same element, and dispatches to whichever driver is configured. All animation requests are deferred until after the current digest cycle completes, so DOM changes and class mutations are always applied in a stable, predictable order.
## The two animation drivers

AngularTS provides two built-in drivers that are consulted in sequence. The JS driver is checked first; if it returns a handler, the CSS driver is skipped for that element. If no JS handler matches, the CSS driver reads the element's computed styles to detect transitions or keyframe animations.

#### [CSS driver]({{< relref "/docs/animations/css-animations" >}})

Reads `transitionDuration`, `animationDuration`, and related computed style properties after applying preparation classes. Handles staggering, delays, and both CSS transitions and `@keyframes` animations with no JavaScript required.

#### [JS driver]({{< relref "/docs/animations/js-animations" >}})

Invokes factory functions registered via `$animateProvider.register()`. Each factory returns an object with lifecycle hooks (`enter`, `leave`, `move`, `addClass`, `removeClass`, `setClass`, `animate`) that receive a `done` callback. Suitable for Web Animations API, GSAP, or any imperative animation library.
## CSS class hooks

The CSS driver applies a pair of classes for every animation event. The first class (the preparation class) is added immediately; the second class (the active class) is added one `requestAnimationFrame` later so the browser can compute a transition between the two states. Both classes are removed when the animation completes.

| Event             | Preparation class | Active class         |
| ----------------- | ----------------- | -------------------- |
| `enter`           | `.ng-enter`       | `.ng-enter-active`   |
| `leave`           | `.ng-leave`       | `.ng-leave-active`   |
| `move`            | `.ng-move`        | `.ng-move-active`    |
| `addClass foo`    | `.foo-add`        | `.foo-add-active`    |
| `removeClass foo` | `.foo-remove`     | `.foo-remove-active` |

During structural animations (`enter`, `leave`, `move`), the element also receives `.ng-animate` for the full duration of the animation.

For staggered animations — such as list items entering one after another — define a stagger delay class:

```css
.my-list-item.ng-enter-stagger {
  transition-delay: 0.1s;
  transition-duration: 0s;
}
```

The CSS driver detects `.ng-enter-stagger` automatically when more than one element is being animated simultaneously under the same parent.
## The `$animate` service API

The `$animate` service is injectable and provides the full animation API. Every method returns an `AnimateRunner` that you can use to react to completion or cancel the animation early.

```typescript
  static $inject = ['$animate', '$element'];

  constructor(
    private $animate: ng.AnimateService,
    private $element: HTMLElement,
  ) {}

  showPanel(panelEl: HTMLElement) {
    // Insert panelEl after this.$element; triggers ng-enter
    this.$animate.enter(panelEl, this.$element.parentElement, this.$element);
  }

  hidePanel(panelEl: HTMLElement) {
    // Remove panelEl after the leave animation completes
    this.$animate.leave(panelEl);
  }

  highlight(el: HTMLElement) {
    // Add 'highlighted' class with an animation
    this.$animate.addClass(el, 'highlighted');
  }

  updateClasses(el: HTMLElement) {
    // Add and remove classes atomically
    this.$animate.setClass(el, 'active', 'inactive');
  }

  morphStyle(el: HTMLElement) {
    // Animate from one set of inline styles to another
    this.$animate.animate(
      el,
      { opacity: 0, transform: 'scale(0.8)' },
      { opacity: 1, transform: 'scale(1)' },
      'my-morph',
    );
  }
}
```
### Full method signatures

| Method                                             | Description                                                               |
| -------------------------------------------------- | ------------------------------------------------------------------------- |
| `enter(element, parent?, after?, options?)`        | Insert element into the DOM and trigger an enter animation.               |
| `leave(element, options?)`                         | Trigger a leave animation, then remove the element.                       |
| `move(element, parent, after?, options?)`          | Move element within the DOM and trigger a move animation.                 |
| `addClass(element, className, options?)`           | Add one or more CSS classes with an animation.                            |
| `removeClass(element, className, options?)`        | Remove one or more CSS classes with an animation.                         |
| `setClass(element, add, remove, options?)`         | Add and remove classes as a single atomic animation.                      |
| `animate(element, from, to, className?, options?)` | Animate from one set of inline styles to another.                         |
| `cancel(runner)`                                   | Cancel a running animation; the end state is still applied.               |
| `enabled(element?, enabled?)`                      | Get or set whether animations are enabled globally or per element.        |
| `on(event, container, callback)`                   | Listen for animation lifecycle events on a container and its descendants. |
| `off(event, container?, callback?)`                | Remove a previously registered listener.                                  |
| `pin(element, parentElement)`                      | Associate an element outside the app root with an animation host parent.  |
### Listening to animation events

Use `$animate.on()` to observe when animations start and finish. The callback receives the element, a `phase` string (`"start"` or `"close"`), and a data object with the `addClass`, `removeClass`, `from`, and `to` values for that animation.

```typescript
  if (phase === 'close') {
    console.log('Enter animation finished on', element);
  }
});
```

> **Note:** The callback does not trigger a digest. Wrap your call in `scope.$apply()` if you need to propagate changes to the scope.
## Filtering animations

Two provider-level hooks let you restrict which elements can be animated. Both are configured during the config phase via `$animateProvider`.

**`$animateProvider.classNameFilter(regex)`** — only animate elements whose class list matches the given regular expression:

```typescript
  // Only animate elements that have an 'animate-' prefixed class
  $animateProvider.classNameFilter(/\banimate-/);
}]);
```

**`$animateProvider.customFilter(fn)`** — supply an arbitrary predicate that receives `(node, event, options)` and returns `true` to allow the animation:

```typescript
  $animateProvider.customFilter(function (node, event) {
    // Skip all animations when in reduced-motion mode
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
}]);
```

> **Tip:** Keep both filter functions as lean as possible. They are called for every DOM operation performed by animation-aware directives.
## Registering JavaScript animations

To register a JavaScript animation, call `$animateProvider.register()` during the config phase or use the module-level `.animation()` shorthand. The name must be a CSS class selector starting with `.`:

```typescript
  $animateProvider.register('.fade-animation', ['$q', function ($q) {
    return {
      enter(element, done) {
        // run enter animation, call done() when finished
        done();
      },
      leave(element, done) {
        done();
      },
    };
  }]);
}]);
```

The registered animation is matched against the element's class list. If the element has `.fade-animation` when an `enter` event fires, the `enter` hook is invoked.
## `ng-animate-swap`

The `ng-animate-swap` directive swaps between transcluded blocks as a watched expression changes. The previous element is removed with a `leave` animation and the new element is inserted with an `enter` animation, making it simple to animate between different states without manual DOM management.

```html
  <div class="panel">{{ currentView }}</div>
</div>
```

The directive runs at priority 550, after `ng-if` (600) but before most others, so it cooperates correctly with other structural directives.
## `ng-animate-children`

By default, when a parent structural animation (`enter`, `leave`, or `move`) is running, child animations on descendants are suppressed. This prevents visual chaos when an entire subtree is animated at once. The `ng-animate-children` attribute overrides this behavior for a specific container.

```html
<div ng-if="showPanel" ng-animate-children="true">
  <div ng-repeat="item in items" class="list-item">{{ item }}</div>
</div>
```

Setting `ng-animate-children` to `"on"`, `"true"`, or an empty string enables child animations. Setting it to any other value (or omitting it) defers to the default suppression behavior.
