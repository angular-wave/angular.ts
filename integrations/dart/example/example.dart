import 'dart:js_interop';

import 'package:angular_ts/angular_ts.dart' as ng;
import 'package:web/web.dart';

@JSExport()

/// Controller exposed to the AngularTS template.
final class CounterController {
  /// Creates a counter starting at zero.
  CounterController();

  /// Current counter value.
  int count = 0;

  /// Increments [count].
  void increment() {
    count += 1;
  }
}

/// Registers and starts a small AngularTS application.
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
