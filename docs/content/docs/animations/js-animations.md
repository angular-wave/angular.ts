---
title: 'JavaScript-based animations with the AngularTS JS driver'
linkTitle: 'JS animations'
weight: 20
description:
  'Register JavaScript animation handlers with module.animation(), implement
  enter/leave/move hooks with done callbacks, and use the Web Animations API.'
---

The JavaScript animation driver lets you write fully imperative animations in
code. Instead of defining CSS classes, you register a factory function against a
CSS class selector. When an element carrying that class goes through a
structural or class-based animation event, the driver looks up and invokes the
matching handler. This makes the JS driver the right choice when you need
precise timing control, want to integrate an animation library such as the Web
Animations API, or need to coordinate multiple elements that CSS transitions
cannot express.

## How the JS driver works

During each animation request, `$animate` checks registered JavaScript animation
factories before falling back to CSS/custom-property animation handling. It
inspects the element's class list against factories registered through
`module.animation()`. If a matching factory is found, it retrieves the singleton
handler object from the injector and packages the appropriate lifecycle hook as
a runnable operation.

JavaScript animation handlers can define two phases for most events:

- **`before*`** — e.g., `beforeAddClass`, `beforeRemoveClass`. Runs
  synchronously before the DOM change.
- **`after*`** (or the event name itself for `enter`, `move`) — runs after the
  DOM change.

For `leave`, the hooks are `leave` (before removal) and `afterLeave` (after
removal). For `enter` and `move`, only the after-phase hook is called (named
`enter` / `move` respectively), because the before-phase does not make sense for
elements being inserted.

> **Note:** The JS driver and CSS driver are not mutually exclusive per element,
> but the animation queue calls `invokeFirstDriver()` which returns on the first
> driver that produces a handler. If a JS animation is registered for an
> element, the CSS driver is skipped for that animation event.

## Registering a JS animation

Use `module.animation()` to associate a factory with a CSS class selector. The
selector must begin with `.`. The factory is an injectable function that returns
an object containing lifecycle hook methods.

```js
angular.createModule('app', []).animation('.fade', function () {
  return {
    enter: function (element, done) {
      // animate element in, then call done()
      element.style.opacity = '0';
      requestAnimationFrame(function () {
        element.style.transition = 'opacity 0.3s ease';
        element.style.opacity = '1';
        element.addEventListener('transitionend', function onEnd() {
          element.removeEventListener('transitionend', onEnd);
          done();
        });
      });
    },

    leave: function (element, done) {
      element.style.transition = 'opacity 0.3s ease';
      element.style.opacity = '0';
      element.addEventListener('transitionend', function onEnd() {
        element.removeEventListener('transitionend', onEnd);
        done();
      });
    },
  };
});
```

The same method can be chained with other module declarations:

```js
angular.createModule('app', []).animation('.slide', function () {
  return {
    enter: function (element, done) {
      /* ... */ done();
    },
    leave: function (element, done) {
      /* ... */ done();
    },
  };
});
```

## Animation lifecycle hooks

The object returned by your factory can implement any combination of these
hooks. Unimplemented hooks are simply skipped.

| Hook                | Signature                                       | When it fires                             |
| ------------------- | ----------------------------------------------- | ----------------------------------------- |
| `enter`             | `(element, done)`                               | After element is inserted into the DOM.   |
| `leave`             | `(element, done)`                               | Before element is removed from the DOM.   |
| `afterLeave`        | `(element, done)`                               | After element is removed from the DOM.    |
| `move`              | `(element, done)`                               | After element is moved to a new position. |
| `beforeAddClass`    | `(element, className, done)`                    | Before the class is added to the element. |
| `addClass`          | `(element, className, done)`                    | After the class has been added.           |
| `beforeRemoveClass` | `(element, className, done)`                    | Before the class is removed.              |
| `removeClass`       | `(element, className, done)`                    | After the class has been removed.         |
| `beforeSetClass`    | `(element, addedClasses, removedClasses, done)` | Before the atomic add/remove.             |
| `setClass`          | `(element, addedClasses, removedClasses, done)` | After the atomic add/remove.              |
| `animate`           | `(element, from, to, done)`                     | For `$animate.animate()` calls.           |

### The `done` callback

Every hook receives a `done` function as its last argument. You **must** call
`done()` when the animation finishes — whether that is after a `transitionend`
event, a `setTimeout`, a Web Animations API `finish` event, or any other
mechanism. If `done()` is never called, the `AnimateRunner` associated with this
animation will never resolve, blocking any chained work.

```js
  // If you return early (e.g., no animation needed), still call done()
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    done();
    return;
  }
  // Otherwise call done() when the animation actually finishes
  runMyAnimation(element).then(done);
}
```

You may also return a cleanup function from the hook. This function is invoked
if the animation is cancelled before it completes:

```js
  const animation = element.animate(
    [{ opacity: 0 }, { opacity: 1 }],
    { duration: 300, easing: 'ease' }
  );

  animation.onfinish = done;

  // Return a cancel handler
  return function (wasCancelled) {
    if (wasCancelled) {
      animation.cancel();
    }
  };
}
```

## Example: Web Animations API

The Web Animations API provides a clean way to drive animations imperatively. It
returns a promise-like `Animation` object with `onfinish` and `oncancel`
callbacks.

```js
angular.getModule('app').animation('.pop-in', function () {
  const play = (element, frames, duration, done) => {
    const animation = element.animate(frames, {
      duration,
      easing: 'ease-out',
      fill: 'forwards',
    });
    animation.onfinish = done;
    return (cancelled) => cancelled && animation.cancel();
  };

  return {
    enter(element, done) {
      return play(element, [{ opacity: 0 }, { opacity: 1 }], 350, done);
    },
    leave(element, done) {
      return play(element, [{ opacity: 1 }, { opacity: 0 }], 250, done);
    },
  };
});
```

Apply the animation by adding the `.pop-in` class to any element managed by a
structural directive:

```html
<div class="panel" ng-if="panelOpen">
  <p>This panel animates in and out with the Web Animations API.</p>
</div>
```

## Example: class-based JS animation

The `addClass` and `removeClass` hooks fire when `$animate.addClass()` or
`$animate.removeClass()` is called — including internally by `ng-show` and
`ng-hide`. The `className` argument is the space-separated string of classes
being added or removed.

```js
angular.getModule('app').animation('.highlight', function () {
  const animate = (element, from, to, done) => {
    const animation = element.animate(
      [{ backgroundColor: from }, { backgroundColor: to }],
      { duration: 300, fill: 'forwards' },
    );
    animation.onfinish = done;
  };

  return {
    addClass(element, className, done) {
      className === 'active'
        ? animate(element, 'transparent', '#fffbcc', done)
        : done();
    },
    removeClass(element, className, done) {
      className === 'active'
        ? animate(element, '#fffbcc', 'transparent', done)
        : done();
    },
  };
});
```

## Example: coordinating multiple elements

When you need to animate related elements in sequence — for example, a leaving
element that exits while an entering element waits — you can share state via
closure:

```js
angular.getModule('app').animation('.swap', function () {
  let leaving = Promise.resolve();
  return {
    leave(element, done) {
      let resolve;
      leaving = new Promise((complete) => (resolve = complete));
      const anim = element.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 250,
      });
      anim.onfinish = () => {
        resolve();
        done();
      };
    },
    enter(element, done) {
      const start = () => {
        element.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 300,
        }).onfinish = done;
      };
      leaving.then(start);
    },
  };
});
```

## Injecting services into animation factories

Animation factory functions participate in dependency injection. List
dependencies in the array notation or use `$inject`:

```js
  return {
    enter: function (element, done) {
      $log.debug('enter animation started');
      // e.g., fetch data to drive animation parameters
      $http.get('/api/animation-config').then(function (response) {
        const duration = response.data.duration || 300;
        element.animate(
          [{ opacity: 0 }, { opacity: 1 }],
          { duration, fill: 'forwards' }
        ).onfinish = done;
      });
    },
  };
}]);
```

> **Warning:** Long-running asynchronous work inside animation hooks (such as
> HTTP requests) can make your UI feel sluggish. Prefer pre-fetching animation
> configuration and caching it rather than fetching it inside a hook on every
> animation.

## Combining JS and CSS animations

If you want the JS driver to apply classes and then let CSS transitions handle
the visual animation, you can manipulate classes directly in the hook and detect
completion via a `transitionend` listener. This approach gives you the control
of JS hooks with the performance of CSS compositing:

```js
  return {
    enter: function (element, done) {
      element.classList.add('is-entering');

      requestAnimationFrame(function () {
        element.classList.add('is-entering-active');
        element.addEventListener('transitionend', function onEnd(e) {
          if (e.target !== element) return;
          element.removeEventListener('transitionend', onEnd);
          element.classList.remove('is-entering', 'is-entering-active');
          done();
        });
      });
    },
  };
});
```

```css
  transition: opacity 0.3s ease, transform 0.3s ease;
  opacity: 0;
  transform: scale(0.95);
}

.hybrid.is-entering-active {
  opacity: 1;
  transform: scale(1);
}
```

> **Tip:** When coordinating JS and CSS this way, always use `transform` and
> `opacity` for the animated properties so the browser can run the transition on
> the compositor thread without layout recalculation.
