import 'package:angular_ts/angular_ts.dart' as ng;
import 'package:test/test.dart';

final class ApiService {
  const ApiService();
}

final class DemoController {
  const DemoController(this.api);

  final ApiService api;
}

final class LifecycleController with ng.Controller {}

void main() {
  test('typed DI helpers preserve token parameter types', () {
    final api = ng.token<ApiService>('api');
    final factory = ng.inject1(api, DemoController.new);

    expect(factory.tokens.single.name, 'api');
  });

  test('public ng namespace parity types are exported', () {
    const date = ng.DateFilterOptions(locale: 'en-US');
    const number = ng.NumberFilterOptions(locale: 'en-US');
    const currency = ng.CurrencyFilterOptions(locale: 'en-US');
    const relativeTime = ng.RelativeTimeFilterOptions(locale: 'en-US');
    const errorHandling = ng.ErrorHandlingConfig(objectMaxDepth: 3);
    const worker = ng.WorkerConfig(autoRestart: true);
    const elementModule = ng.AngularElementModuleOptions(name: 'demo');
    const model = ng.NgModelOptions(updateOn: 'blur');
    final ng.ControllerConstructor<LifecycleController> constructor =
        LifecycleController.new;

    expect(ng.DateFilterFormat.medium.value, 'medium');
    expect(date.toMap()['locale'], 'en-US');
    expect(number.toMap()['locale'], 'en-US');
    expect(currency.toMap()['locale'], 'en-US');
    expect(relativeTime.toMap()['locale'], 'en-US');
    expect(errorHandling.toMap()['objectMaxDepth'], 3);
    expect(worker.autoRestart, isTrue);
    expect(elementModule.name, 'demo');
    expect(model.updateOn, 'blur');
    expect(constructor(), isA<LifecycleController>());
  });
}
