# Access shared application models

Once AngularTS has initialized in a destination's ArkWeb page, page JavaScript
can retrieve registered state with `angular.getModel("session")`. The getter
lazily initializes the same reactive proxy returned by dependency injection.
Unknown names, ordinary services, and uninitialized or destroyed apps throw.

Native callbacks can send domain updates over the existing destination bridge.
The page handler applies them to the model, for example:

```js
angular.getModel("session").restore(
  { online: true },
  { mode: "merge" },
);
```

Updates automatically reach views observing that model. Use the Angular runtime
instance belonging to the destination; a proxy remains in the page's JavaScript
realm and native ArkTS exchanges serializable data with it. App model lookup
uses the existing JavaScript runtime API and adds no native protocol operation.
