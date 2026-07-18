import { PublicInjectionTokens } from "../../interface.ts";
import type { InjectorService } from "./internal-injector.ts";

function typecheckTokenAwareGet(injector: InjectorService): void {
  const $http: ng.HttpService = injector.get("$http");
  const $machine: ng.MachineService = injector.get(
    PublicInjectionTokens.$machine,
  );
  const $injector: ng.InjectorService = injector.get("$injector");
  const $element: ng.ElementService = injector.get("$element");
  const $rootElement: ng.RootElementService = injector.get("$rootElement");
  const $document: ng.DocumentService = injector.get("$document");
  const $window: ng.WindowService = injector.get("$window");
  const $scope: ng.ScopeService = injector.get("$scope");
  const $rootScope: ng.RootScopeService = injector.get("$rootScope");
  const $stateRegistry: ng.StateRegistryService =
    injector.get("$stateRegistry");
  const $templateCache: ng.TemplateCacheService =
    injector.get("$templateCache");
  const custom = injector.get<{ enabled: boolean }>("featureFlags");
  const untyped: unknown = injector.get("untypedService");

  // @ts-expect-error built-in tokens must infer their registered service type.
  const wrong: ng.LogService = injector.get("$http");

  void $http;
  void $machine;
  void $injector;
  void $element;
  void $rootElement;
  void $document;
  void $window;
  void $scope;
  void $rootScope;
  void $stateRegistry;
  void $templateCache;
  void custom;
  void untyped;
  void wrong;
}

interface CustomServices {
  auth: { authenticated: boolean };
}

function typecheckCustomRegistry(
  injector: InjectorService<CustomServices>,
): void {
  const auth: { authenticated: boolean } = injector.get("auth");
  const $http: ng.HttpService = injector.get("$http");
  const invoked: number = injector.invoke(() => 42);

  class Session {
    authenticated = true;
  }

  const session: Session = injector.instantiate(Session);

  void auth;
  void $http;
  void invoked;
  void session;
}

void typecheckTokenAwareGet;
void typecheckCustomRegistry;
