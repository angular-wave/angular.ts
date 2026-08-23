---
title: 'Animation Directives and CSS Hooks'
linkTitle: 'Animation directives'
weight: 250
description:
  'Use CSS class hooks and JavaScript animation factories with structural
  directives such as ng-if, ng-repeat, and ng-show.'
---

AngularTS integrates animations into the same lifecycle that drives structural
directives. Add the `animate` attribute to an element and the `$animate` service
applies entry, exit, and class-change hooks at the appropriate DOM update.

## How `$animate` integrates with directives

Structural directives such as `ng-if`, `ng-repeat`, `ng-show`, `ng-hide`,
`ng-switch`, and `ng-include` check for animation data before manipulating the
DOM. When `animate` is present, they delegate DOM operations to `$animate`:

| Operation      | Without `$animate`           | With `$animate`                           |
| -------------- | ---------------------------- | ----------------------------------------- |
| Insert element | `element.after(clone)`       | `$animate.enter(clone, parent, after)`    |
| Remove element | `element.remove()`           | `$animate.leave(element)`                 |
| Toggle class   | `element.classList.add(cls)` | `$animate.addClass(element, cls)`         |
| Swap classes   | `el.add(a); el.remove(b)`    | `$animate.setClass(element, add, remove)` |

This means you can add CSS transitions to any structural operation simply by
adding the `animate` attribute and writing the corresponding CSS rules.

---

## CSS animation hook classes

When `$animate` performs an operation it applies a sequence of CSS classes in
two frames to give the browser time to set up the transition:

### Element enter

```text
ng-enter  →  ng-enter + ng-enter-active  →  (classes removed)
```

### Element leave

```text
ng-leave  →  ng-leave + ng-leave-active  →  element removed
```

### Element move (ng-repeat reorder)

```text
ng-move  →  ng-move + ng-move-active  →  (classes removed)
```

### Class add/remove

```text
ng-CLASS-add  →  ng-CLASS-add + ng-CLASS-add-active  →  CLASS applied
ng-CLASS-remove  →  ng-CLASS-remove + ng-CLASS-remove-active  →  CLASS removed
```

```css
.card.ng-enter {
  opacity: 0;
  transform: translateY(-8px);
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
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

---

## Animating ng-repeat lists

`ng-repeat` triggers `ng-enter` and `ng-leave` animations for items added to or
removed from the collection. Add the `animate` attribute on the repeated element
to opt in.

```html
<ul>
  <li class="task-item" ng-repeat="task in tasks" animate>
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

```js
  .controller('TaskCtrl', ['$scope', function($scope) {
    $scope.tasks = [
      { id: 1, title: 'Design wireframes' },
      { id: 2, title: 'Write tests' },
      { id: 3, title: 'Deploy to staging' }
    ];

    $scope.removeTask = function(task) {
      const idx = $scope.tasks.indexOf(task);
      if (idx !== -1) $scope.tasks.splice(idx, 1);
    };
  }]);
```

---

## Animating ng-show / ng-hide

`ng-show` and `ng-hide` both apply a temporary `ng-hide-animate` class alongside
`ng-hide` when the `$animate` service is active. This class serves as the
transition anchor:

```html
<div animate>{{ message }}</div>
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

---

## JavaScript animations

Register JavaScript animation hooks with the module's `animation()` method:

```js
angular.module('app').animation('.flip-card', function () {
  return {
    enter: function (element, done) {
      // Use Web Animations API or any library
      element.animate(
        [{ transform: 'rotateY(90deg)' }, { transform: 'rotateY(0deg)' }],
        { duration: 300, easing: 'ease-out' },
      ).onfinish = done;

      return function (cancelled) {
        if (cancelled) element.style.transform = '';
      };
    },
    leave: function (element, done) {
      element.animate(
        [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-90deg)' }],
        { duration: 250, easing: 'ease-in' },
      ).onfinish = done;
    },
  };
});
```

```html
<div ng-repeat="card in cards" animate>{{ card.content }}</div>
```

> **Tip:** JavaScript animations and CSS animations can coexist on the same
> element. The `$animate` service runs CSS animations and JavaScript animation
> hooks in parallel, calling `done` only after both complete.

---

## Animation and the HTTP directives

The HTTP directives (`ng-get`, `ng-post`, etc.) also support the `animate`
attribute. When present, swapped content uses `$animate.enter` and
`$animate.leave` instead of direct DOM manipulation:

```html
<div
  ng-get="/api/posts"
  trigger="load"
  swap="innerHTML"
  animate
  class="post-content"
></div>
```

```css
  opacity: 0;
  transition: opacity 0.4s ease;
}
.post-content.ng-enter-active {
  opacity: 1;
}
```
