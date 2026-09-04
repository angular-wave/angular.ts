# AngularTS for Dart

Use AngularTS from Dart with typed modules, dependency injection, components,
services, and scopes.

`angular_ts` is the Dart facade. The `@angular-wave/angular.ts` package is the
browser runtime, so an application needs both packages.

## Install

Add the Dart packages:

```sh
dart pub add angular_ts web
```

Load the AngularTS runtime before the compiled Dart application. This CDN form
is enough to get started:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>AngularTS Dart app</title>
    <script src="https://cdn.jsdelivr.net/npm/@angular-wave/angular.ts/dist/angular-ts.umd.min.js"></script>
    <script defer src="main.dart.js"></script>
  </head>
  <body>
    <counter-button></counter-button>
  </body>
</html>
```

For production, install `@angular-wave/angular.ts` through npm and keep its
version equal to the `angular_ts` version.

## Create a component

Create `web/main.dart`:

```dart
import 'dart:js_interop';

import 'package:angular_ts/angular_ts.dart' as ng;
import 'package:web/web.dart';

@JSExport()
final class CounterController {
  int count = 0;

  void increment() {
    count += 1;
  }
}

void main() {
  final app = ng.createModule('counterApp');

  app.component(
    'counterButton',
    ng.Component<JSObject>(
      template: '''
        <button type="button" ng-click="counter.increment()">
          Count: {{ counter.count }}
        </button>
      ''',
      controllerAs: 'counter',
      controller: ng.inject0(
        () => createJSInteropWrapper(CounterController()),
      ),
    ),
  );

  ng.bootstrap(document.body!, [app.name]);
}
```

Compile and serve it:

```sh
dart compile js web/main.dart -o web/main.dart.js
python3 -m http.server 8080 --directory web
```

Open `http://localhost:8080`. Clicking the button updates the Dart controller
and AngularTS refreshes the rendered value.

The package's [complete example](example/example.dart) contains the same
application and is compiled by the package checks.

## Use typed dependency injection

Use tokens instead of string dependency names:

```dart
final todoStore = ng.token<TodoStore>('todoStore');

app.factory(todoStore, ng.inject0(TodoStore.new));
app.controller(
  'TodoController',
  ng.inject1(todoStore, (TodoStore store) => store),
);
```

Helpers from `inject0` through `inject8` preserve the types and order of the
registered dependencies.

## Start with HTML

AngularTS can compile HTML rendered by your server. A Dart application does not
need to own the whole page or become a single-page application. Start with the
HTML your server already returns, then add Dart controllers and services only
where the browser needs behavior.

This also lets one page contain several independent AngularTS modules. Bootstrap
each module at the element it owns instead of making one client application own
the entire document.

## Work with JavaScript safely

Controllers exposed to AngularTS templates use `@JSExport()` and
`createJSInteropWrapper()`. Keep application logic in typed Dart objects and
convert values only where they cross into the JavaScript runtime.

The facade provides typed wrappers for the public AngularTS API. Explicit
low-level interop helpers are available when direct JavaScript access is
necessary.

## More resources

- [Dart integration guide](https://angular-wave.github.io/angular.ts/docs/integrations/dart/)
- [AngularTS documentation](https://angular-wave.github.io/angular.ts/)
- [Dart API reference](https://pub.dev/documentation/angular_ts/latest/)
- [Todo application](https://github.com/angular-wave/angular.ts/tree/main/integrations/dart/example/basic_app)
- [Issue tracker](https://github.com/angular-wave/angular.ts/issues)
