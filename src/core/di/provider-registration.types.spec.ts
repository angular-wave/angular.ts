import type { InjectionTokenMap } from "../../interface.ts";
import { PublicInjectionTokens } from "../../interface.ts";
import {
  _http,
  _rootScope,
  _templateCache,
  _templateRequest,
} from "../../injection-tokens.ts";
import type {
  RuntimeProviderDefinitions,
  RuntimeRegistrationRecipe,
} from "../composition/runtime-composition.ts";
import type { ProviderRegistry } from "./interface.ts";

// Compile-only fixtures: make test-types checks every expected rejection.
export function checkProviderRegistrationTypes(
  registry: ProviderRegistry,
  http: ng.HttpService,
  scope: ng.ScopeService,
  request: ng.TemplateRequestService,
  HttpConstructor: new (cache: ng.TemplateCacheService) => ng.HttpService,
  ScopeConstructor: new () => ng.ScopeService,
): void {
  registry.factory(_http, () => http);
  registry.factory(_http, [
    _http,
    _templateCache,
    (injectedHttp) => injectedHttp,
  ]);
  registry.factory(_http, [
    _templateCache,
    (cache) => {
      const checked: ng.TemplateCacheService = cache;
      void checked;
      return http;
    },
  ]);
  registry.factory("customService", () => 42);
  const forwarded: [...string[], (...args: never[]) => unknown] = [
    "customDependency",
    () => 42,
  ];
  registry.factory("customForwarded", forwarded);
  registry.factory(String("dynamicService"), forwarded);
  registry.service("customForwarded", forwarded);
  registry.factory("customConsumer", [
    _http,
    "customDependency",
    (injectedHttp: ng.HttpService, dependency: { value: number }) => {
      void dependency;
      return injectedHttp;
    },
  ]);

  const wrongResult = () => scope;
  // @ts-expect-error A built-in registration cannot return an unrelated service.
  registry.factory(_http, wrongResult);

  const wrongDependency: [
    typeof _http,
    (value: ng.ScopeService) => ng.HttpService,
  ] = [_http, () => http];
  // @ts-expect-error $http cannot be injected as a scope.
  registry.factory(_http, wrongDependency);
  // @ts-expect-error Custom output tokens do not disable known dependency checks.
  registry.factory("customConsumer", wrongDependency);

  const templateFactory = (
    _cache: ng.TemplateCacheService,
    _http: ng.HttpService,
  ) => request;
  registry.factory(_templateRequest, [_templateCache, _http, templateFactory]);
  const swappedDependencies: [
    typeof _http,
    typeof _templateCache,
    typeof templateFactory,
  ] = [_http, _templateCache, templateFactory];
  // @ts-expect-error Dependency-token order must match the factory parameters.
  registry.factory(_templateRequest, swappedDependencies);

  const missingDependencies: [typeof templateFactory] = [templateFactory];
  // @ts-expect-error Required factory arguments need matching dependency tokens.
  registry.factory(_templateRequest, missingDependencies);

  registry.service(_http, [_templateCache, HttpConstructor]);
  registry.service("customService", ScopeConstructor);
  // @ts-expect-error Built-in constructors must produce the registered contract.
  registry.service(_http, ScopeConstructor);
  const wrongConstructorDependencies: [typeof _http, typeof HttpConstructor] = [
    _http,
    HttpConstructor,
  ];
  // @ts-expect-error Constructor arguments must match dependency-token contracts.
  registry.service(_http, wrongConstructorDependencies);

  const httpRecipe: RuntimeRegistrationRecipe<typeof _http> = {
    _register(providers, name) {
      const canonicalName: typeof _http = name;
      void canonicalName;
      providers.factory(name, () => http);
      // @ts-expect-error Literal recipe names retain the factory result constraint.
      return providers.factory(name, wrongResult);
    },
  };
  const definitions: RuntimeProviderDefinitions = { [_http]: httpRecipe };
  void definitions;
  const swappedRecipes = { [_rootScope]: httpRecipe };
  // @ts-expect-error A recipe cannot be mounted under another built-in token.
  const wrongDefinitions: RuntimeProviderDefinitions = swappedRecipes;
  void wrongDefinitions;

  const swappedTokenValues = { ...PublicInjectionTokens, $http: _rootScope };
  // @ts-expect-error Public token values must match their canonical keys.
  const wrongTokenValues: { [Name in keyof InjectionTokenMap]: Name } =
    swappedTokenValues;
  void wrongTokenValues;
}
