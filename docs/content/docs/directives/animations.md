---
title: "Animation Directives: ng-animate-swap and CSS Hooks"
weight: 250
description: "Use ng-animate-swap, ng-animate-children, and CSS class hooks to animate structural directives like ng-if, ng-repeat, and ng-show with the $animate service."
---
AngularTS integrates animations into the same lifecycle that drives structural directives. Rather than managing `setTimeout` calls or CSS transitions manually, you add the `animate` attribute to an element and AngularTS's `$animate` service handles entry, exit, and class-change transitions — applying and removing CSS hook classes at the right moment in the digest cycle.
## How `$animate` integrates with directives

Structural directives — `ng-if`, `ng-repeat`, `ng-show`, `ng-hide`, `ng-switch`, `ng-include`, and `ng-animate-swap` — all check whether an element carries animation data before manipulating the DOM. When the `animate` attribute is present on an element (detected via `hasAnimate(element)`), they delegate DOM operations to `$animate` instead of performing them directly:

| Operation      | Without `$animate`           | With `$animate`                           |
| -------------- | ---------------------------- | ----------------------------------------- |
| Insert element | `element.after(clone)`       | `$animate.enter(clone, parent, after)`    |
| Remove element | `element.remove()`           | `$animate.leave(element)`                 |
| Toggle class   | `element.classList.add(cls)` | `$animate.addClass(element, cls)`         |
| Swap classes   | `el.add(a); el.remove(b)`    | `$animate.setClass(element, add, remove)` |

This means you can add CSS transitions to any structural operation simply by adding the `animate` attribute and writing the corresponding CSS rules.

***
## CSS animation hook classes

When `$animate` performs an operation it applies a sequence of CSS classes in two frames to give the browser time to set up the transition:
### Element enter

```
ng-enter  →  ng-enter + ng-enter-active  →  (classes removed)
```
### Element leave

```
ng-leave  →  ng-leave + ng-leave-active  →  element removed
```
### Element move (ng-repeat reorder)

```
ng-move  →  ng-move + ng-move-active  →  (classes removed)
```
### Class add/remove

```
ng-CLASS-add  →  ng-CLASS-add + ng-CLASS-add-active  →  CLASS applied
ng-CLASS-remove  →  ng-CLASS-remove + ng-CLASS-remove-active  →  CLASS removed
```

```css
.card.ng-enter {
  opacity: 0;
  transform: translateY(-8px);
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.card.ng-enter-active {
  opacity: 1;
  transform: translateY(0);
}

/* Fade out when the element is removed */
.card.ng-leave {
  opacity: 1;
  transition: opacity 0.2s ease;
}
.card.ng-leave-active {
  opacity: 0;
}
```

***
## ng-animate-swap

`ng-animate-swap` swaps between transcluded content blocks using enter/leave animations as a watched expression changes. It runs at priority 550 — after `ng-if` (600) but before most attribute directives.

```html
<div ng-animate-swap="currentAlert">
  <div ng-if="currentAlert === 'success'" class="banner banner-success">
    {{ message }}
  </div>
  <div ng-if="currentAlert === 'error'" class="banner banner-error">
    {{ message }}
  </div>
</div>
```

Each time the watched expression changes, the old element is removed via `$animate.leave` and the new transcluded clone is inserted via `$animate.enter`. The previous scope is destroyed before the new clone is linked.

A more common pattern is using `ng-animate-swap` to animate between stateful view components:

```html
<div class="tab-content" ng-animate-swap="activeTab">
  <div class="tab-panel" ng-include="activeTab + '.html'"></div>
</div>
```

```css
  opacity: 0;
  transform: translateX(20px);
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.tab-panel.ng-enter-active {
  opacity: 1;
  transform: translateX(0);
}
.tab-panel.ng-leave {
  opacity: 1;
  transition: opacity 0.2s ease;
}
.tab-panel.ng-leave-active {
  opacity: 0;
}
```
#### `ng-animate-swap`

- **Type:** `expression`

The watched expression. Any time its value changes, the current transcluded block is removed with a leave animation and a new clone is entered. Use the `for` attribute alias interchangeably.

***
## ng-animate-children

`ng-animate-children` propagates an animation-children flag to the element's cache so that the `$animate` queue knows whether child elements should also be animated during parent transitions.

```html
<div ng-if="showPanel" ng-animate-children="true">
  <div class="panel-header">Header</div>
  <div class="panel-body" ng-repeat="item in items">{{ item }}</div>
</div>
```

When `ng-animate-children` is set to `"on"` or `"true"` (or is present as an empty attribute), child animations run in parallel with the parent. Without it, the animation queue suppresses child animations while the parent is entering or leaving.

```html
<ul ng-repeat="group in groups" ng-animate-children>
  <li ng-repeat="item in group.items" class="list-item">{{ item }}</li>
</ul>
```
#### `ng-animate-children`

- **Type:** `string | none`

Accepts `"on"`, `"true"`, or an empty attribute to enable child animations. Any other value (or an interpolated expression evaluating to a falsy string) disables child animations.

***
## Animating ng-repeat lists

`ng-repeat` triggers `ng-enter` and `ng-leave` animations for items added to or removed from the collection. Add the `animate` attribute on the repeated element to opt in.

```html
  <li class="task-item"
      ng-repeat="task in tasks track by task.id"
      animate>
    <span ng-bind="task.title"></span>
    <button ng-click="removeTask(task)">Remove</button>
  </li>
</ul>
```

```css
  animation: slideIn 0.25s ease forwards;
}

.task-item.ng-leave {
  animation: slideOut 0.2s ease forwards;
}

.task-item.ng-move {
  transition: all 0.3s ease;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(-16px); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes slideOut {
  from { opacity: 1; transform: translateX(0); }
  to   { opacity: 0; transform: translateX(16px); }
}
```

```javascript
  .controller('TaskCtrl', function($scope) {
    $scope.tasks = [
      { id: 1, title: 'Design wireframes' },
      { id: 2, title: 'Write tests' },
      { id: 3, title: 'Deploy to staging' }
    ];

    $scope.removeTask = function(task) {
      const idx = $scope.tasks.indexOf(task);
      if (idx !== -1) $scope.tasks.splice(idx, 1);
    };
  });
```

***
## Animating ng-show / ng-hide

`ng-show` and `ng-hide` both apply a temporary `ng-hide-animate` class alongside `ng-hide` when the `$animate` service is active. This class serves as the transition anchor:

```html
  {{ message }}
</div>
```

```css
  transition: opacity 0.3s ease, max-height 0.3s ease;
  overflow: hidden;
}

/* State when hidden */
.notification.ng-hide {
  opacity: 0;
  max-height: 0;
}

/* Applied during the animation frame to enable the transition */
.notification.ng-hide-animate {
  display: block !important;
}
```

***
## JavaScript animations via `$animate`

The `$animateJs` service allows you to register JavaScript-based animation hooks alongside CSS animations:

```javascript
  .animation('.flip-card', function() {
    return {
      enter: function(element, done) {
        // Use Web Animations API or any library
        element.animate(
          [{ transform: 'rotateY(90deg)' }, { transform: 'rotateY(0deg)' }],
          { duration: 300, easing: 'ease-out' }
        ).onfinish = done;

        return function(cancelled) {
          if (cancelled) element.style.transform = '';
        };
      },
      leave: function(element, done) {
        element.animate(
          [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-90deg)' }],
          { duration: 250, easing: 'ease-in' }
        ).onfinish = done;
      }
    };
  });
```

```html
  {{ card.content }}
</div>
```

> **Tip:** JavaScript animations and CSS animations can coexist on the same element. The `$animate` service runs CSS animations and JavaScript animation hooks in parallel, calling `done` only after both complete.

***
## Animation and the HTTP directives

The HTTP directives (`ng-get`, `ng-post`, etc.) also support the `animate` attribute. When present, swapped content uses `$animate.enter` and `$animate.leave` instead of direct DOM manipulation:

```html
     trigger="load"
     swap="innerHTML"
     animate
     class="post-content">
</div>
```

```css
  opacity: 0;
  transition: opacity 0.4s ease;
}
.post-content.ng-enter-active {
  opacity: 1;
}
```
