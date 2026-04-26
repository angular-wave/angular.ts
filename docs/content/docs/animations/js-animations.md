---
title: "JavaScript-based animations with the AngularTS JS driver"
weight: 20
description: "Register JavaScript animation handlers with $animateProvider, implement enter/leave/move hooks with done callbacks, and use the Web Animations API."
---
The JavaScript animation driver lets you write fully imperative animations in code. Instead of defining CSS classes, you register a factory function against a CSS class selector. When an element carrying that class goes through a structural or class-based animation event, the driver looks up and invokes the matching handler. This makes the JS driver the right choice when you need precise timing control, want to integrate an animation library such as the Web Animations API, or need to coordinate multiple elements that CSS transitions cannot express.
## How the JS driver works

At startup, `AnimateJsDriverProvider` registers itself with `$$animationProvider._drivers`. During each animation request, the animation queue calls drivers in reverse registration order — the JS driver is checked before the CSS driver. The driver calls `$$animateJs(element, event, classes, options)` which inspects the element's class list against all factories registered via `$animateProvider.register()`. If a matching factory is found, it retrieves the singleton handler object from the injector and packages the appropriate lifecycle hook as a runnable operation.

The internal `$$animateJs` service (`AnimateJsFn`) handles two phases for most events:

* **`before*`** — e.g., `beforeAddClass`, `beforeRemoveClass`. Runs synchronously before the DOM change.
* **`after*`** (or the event name itself for `enter`, `move`) — runs after the DOM change.

For `leave`, the hooks are `leave` (before removal) and `afterLeave` (after removal). For `enter` and `move`, only the after-phase hook is called (named `enter` / `move` respectively), because the before-phase does not make sense for elements being inserted.

> **Note:** The JS driver and CSS driver are not mutually exclusive per element, but the animation queue calls `invokeFirstDriver()` which returns on the first driver that produces a handler. If a JS animation is registered for an element, the CSS driver is skipped for that animation event.
## Registering a JS animation

Use `$animateProvider.register()` during the config phase to associate a factory with a CSS class selector. The selector must begin with `.`. The factory is an injectable function that returns an object containing lifecycle hook methods.

```javascript
  $animateProvider.register('.fade', function () {
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
}]);
```

Or use the module-level `.animation()` shorthand, which calls `$animateProvider.register()` internally:

```javascript
  return {
    enter: function (element, done) { /* ... */ done(); },
    leave: function (element, done) { /* ... */ done(); },
  };
});
```
## Animation lifecycle hooks

The object returned by your factory can implement any combination of these hooks. Unimplemented hooks are simply skipped.

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

Every hook receives a `done` function as its last argument. You **must** call `done()` when the animation finishes — whether that is after a `transitionend` event, a `setTimeout`, a Web Animations API `finish` event, or any other mechanism. If `done()` is never called, the `AnimateRunner` associated with this animation will never resolve, blocking any chained work.

```javascript
  // If you return early (e.g., no animation needed), still call done()
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    done();
    return;
  }
  // Otherwise call done() when the animation actually finishes
  runMyAnimation(element).then(done);
}
```

You may also return a cleanup function from the hook. This function is invoked if the animation is cancelled before it completes:

```javascript
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

The Web Animations API provides a clean way to drive animations imperatively. It returns a promise-like `Animation` object with `onfinish` and `oncancel` callbacks.

```javascript
  return {
    enter: function (element, done) {
      const anim = element.animate(
        [
          { opacity: 0, transform: 'scale(0.6) translateY(-8px)' },
          { opacity: 1, transform: 'scale(1) translateY(0)' },
        ],
        {
          duration: 350,
          easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
          fill: 'forwards',
        }
      );

      anim.onfinish = done;

      return function (wasCancelled) {
        if (wasCancelled) anim.cancel();
      };
    },

    leave: function (element, done) {
      const anim = element.animate(
        [
          { opacity: 1, transform: 'scale(1) translateY(0)' },
          { opacity: 0, transform: 'scale(0.6) translateY(8px)' },
        ],
        {
          duration: 250,
          easing: 'ease-in',
          fill: 'forwards',
        }
      );

      anim.onfinish = done;

      return function (wasCancelled) {
        if (wasCancelled) anim.cancel();
      };
    },
  };
});
```

Apply the animation by adding the `.pop-in` class to any element managed by a structural directive:

```html
  <p>This panel animates in and out with the Web Animations API.</p>
</div>
```
## Example: class-based JS animation

The `addClass` and `removeClass` hooks fire when `$animate.addClass()` or `$animate.removeClass()` is called — including internally by `ng-show` and `ng-hide`. The `className` argument is the space-separated string of classes being added or removed.

```javascript
  return {
    addClass: function (element, className, done) {
      if (className === 'active') {
        const anim = element.animate(
          [
            { backgroundColor: 'transparent' },
            { backgroundColor: '#fffbcc' },
          ],
          { duration: 400, fill: 'forwards' }
        );
        anim.onfinish = done;
      } else {
        done();
      }
    },

    removeClass: function (element, className, done) {
      if (className === 'active') {
        const anim = element.animate(
          [
            { backgroundColor: '#fffbcc' },
            { backgroundColor: 'transparent' },
          ],
          { duration: 200, fill: 'forwards' }
        );
        anim.onfinish = done;
      } else {
        done();
      }
    },
  };
});
```
## Example: coordinating multiple elements

When you need to animate related elements in sequence — for example, a leaving element that exits while an entering element waits — you can share state via closure:

```javascript
  let leaveDeferred = null;

  return {
    leave: function (element, done) {
      leaveDeferred = $q.defer();

      const anim = element.animate(
        [{ opacity: 1, transform: 'translateX(0)' },
         { opacity: 0, transform: 'translateX(-30px)' }],
        { duration: 250, easing: 'ease-in', fill: 'forwards' }
      );

      anim.onfinish = function () {
        leaveDeferred.resolve();
        done();
      };

      return function (wasCancelled) {
        if (wasCancelled) {
          anim.cancel();
          leaveDeferred.resolve();
        }
      };
    },

    enter: function (element, done) {
      const startEnter = function () {
        const anim = element.animate(
          [{ opacity: 0, transform: 'translateX(30px)' },
           { opacity: 1, transform: 'translateX(0)' }],
          { duration: 300, easing: 'ease-out', fill: 'forwards' }
        );
        anim.onfinish = done;
      };

      if (leaveDeferred) {
        leaveDeferred.promise.then(startEnter);
      } else {
        startEnter();
      }
    },
  };
}]);
```
## The `$$animateJs` service

`$$animateJs` is the internal function that the JS driver uses to look up and package JS animation handlers. It is available as an injectable service if you need to call it directly — for example, when writing a custom driver or testing animation behavior.

Its signature is:

```typescript
  element: HTMLElement,
  event: string,
  classes?: string | null,
  options?: AnimationOptions,
): Animator | undefined
```

It returns an `Animator` object (`{ _willAnimate: true, start(), end() }`) if at least one registered handler matches the element's class list, or `undefined` if no handler is found. The returned `Animator.start()` runs the before-phase and after-phase operations, and calls `runner.complete(status)` when both are done.
## Injecting services into animation factories

Animation factory functions participate in dependency injection. List dependencies in the array notation or use `$inject`:

```javascript
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

> **Warning:** Long-running asynchronous work inside animation hooks (such as HTTP requests) can make your UI feel sluggish. Prefer pre-fetching animation configuration and caching it rather than fetching it inside a hook on every animation.
## Combining JS and CSS animations

If you want the JS driver to apply classes and then let CSS transitions handle the visual animation, you can manipulate classes directly in the hook and detect completion via a `transitionend` listener. This approach gives you the control of JS hooks with the performance of CSS compositing:

```javascript
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

> **Tip:** When coordinating JS and CSS this way, always use `transform` and `opacity` for the animated properties so the browser can run the transition on the compositor thread without layout recalculation.
