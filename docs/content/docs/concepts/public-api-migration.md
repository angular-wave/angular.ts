---
title: 'Public API Migration'
linkTitle: 'Public API migration'
weight: 270
description:
  'Track compatibility and cleanup paths for public AngularTS symbols that are
  not ordinary app authoring APIs.'
---

This is the major-version migration guide for AngularTS public-surface cleanup.
AngularTS keeps only deliberate compatibility symbols while the public surface
is being cleaned up. A symbol should not be hidden or removed just because it
looks internal; it needs a documented replacement path, a compatibility status,
and a removal gate.

The cleanup window is open. New temporary alias APIs should not be added during
this window. If a user-facing shape changes, the framework should either expose
the final shape or keep the existing legacy path classified in the migration
tables until it can be removed in a major version.

Provider-era paths are tracked separately in the
[provider migration guide](../provider-migration/). This page covers the
remaining public-surface groups: scope compatibility, DI plumbing, internal
aliases, form compatibility, and custom runtime extension APIs.

## Compatibility Groups

| Public group                                                                                                                                                                                                                 | Preferred path                                                                                                                                                                                       | Status                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| [`ng.Scope`](../../../typedoc/classes/Scope.html) and scope listener/event types                                                                                                                                             | Use `app.model(...)` for app-owned shared reactive state; keep `$scope` for view-local template state.                                                                                               | compatible                |
| `ng.CompileLifecycleService`, `ng.TemplateFactoryService`, `ng.StateProvider`, [`ng.StateRegistryService`](../../../typedoc/interfaces/StateRegistryService.html)                                                            | Use [`NgModule`](../../../typedoc/classes/NgModule.html) declarations, router declarations, runtime router services, and internal recipes.                                                           | removed in cleanup window |
| Policy provider aliases such as `ng.HttpProvider`, `ng.LocationProvider`, `ng.LogProvider`, `ng.CookieProvider`, `ng.SceProvider`, and `ng.TemplateRequestProvider`                                                          | Use `app.config({ $token: ... })` and runtime services.                                                                                                                                              | removed in cleanup window |
| Runtime provider aliases such as `ng.CompileProvider`, `ng.RestProvider`, `ng.RootScopeProvider`, `ng.RouterProvider`, and `ng.TransitionProvider`                                                                           | Use [`NgModule`](../../../typedoc/classes/NgModule.html) declarations, runtime services, and internal imports inside AngularTS.                                                                      | removed in cleanup window |
| [`ng.CompileService`](../../../typedoc/types/CompileService.html)                                                                                                                                                            | Ordinary apps should use templates, directives, components, and framework-owned fragment compilation. Advanced directive and bridge code may inject `$compile`.                                      | advanced public           |
| `ng.ServiceProvider`, `ng.ProvideService`                                                                                                                                                                                    | Use [`NgModule`](../../../typedoc/classes/NgModule.html) declaration methods and module dependencies; the provider registry is private and non-injectable.                                           | removed in cleanup window |
| `ng.InvocationDetail`, `ng.InjectionTokens`                                                                                                                                                                                  | Use ordinary invocation APIs, injected runtime services, and internal token metadata.                                                                                                                | removed in cleanup window |
| [`ng.InjectorService`](../../../typedoc/types/InjectorService.html)                                                                                                                                                          | Ordinary apps should use injected runtime services. Advanced runtime/custom-element code may use `angular.injector(...)`, `angular.currentInjector`, lazy state loaders, and web-component contexts. | advanced public           |
| [`ng.NgModelController`](../../../typedoc/classes/NgModelController.html)                                                                                                                                                    | Use `app.model(...)` for app-owned shared state; keep [`NgModelController`](../../../typedoc/classes/NgModelController.html) for form directive integration.                                         | compatible                |
| `MachineStateConfig`, `MachineDefinition`                                                                                                                                                                                    | Use [`MachineConfig`](../../../typedoc/types/MachineConfig.html); no compatibility aliases are retained.                                                                                             | removed in cleanup window |
| [`AngularRuntime`](../../../typedoc/classes/AngularRuntime.html), `createAngular`, [`RuntimeModule`](../../../typedoc/types/RuntimeModule.html), [`AngularComposition`](../../../typedoc/interfaces/AngularComposition.html) | Compose a tree-shakable runtime from AngularTS modules; bare runtime and root-module assembly are internal.                                                                                          | advanced public           |

## Router Contract Renames

Router contracts now use direct domain names. The redundant `Typed` prefix was
removed without compatibility aliases:

| Removed name            | Current name                                                 |
| ----------------------- | ------------------------------------------------------------ |
| `TypedRouteDeclaration` | [`RouteContract`](../../../typedoc/types/RouteContract.html) |
| `TypedRouteMap`         | [`RouteMap`](../../../typedoc/types/RouteMap.html)           |
| `TypedRouteMapFromTree` | [`RoutesOf`](../../../typedoc/types/RoutesOf.html)           |
| `TypedRouteName`        | `Extract<keyof TRouteMap, string>`                           |
| `TypedRouteParams`      | [`ParamsOf`](../../../typedoc/types/ParamsOf.html)           |
| `TypedRouteResolves`    | [`ResolvesOf`](../../../typedoc/types/ResolvesOf.html)       |
| `TypedRouterModule`     | [`RouterModule`](../../../typedoc/types/RouterModule.html)   |
| `TypedStateService`     | [`StateService`](../../../typedoc/types/StateService.html)   |

[`StateService<RouteMap>`](../../../typedoc/types/StateService.html) is the
typed runtime `$state` contract. It is distinct from the provider-shaped
[`ng.StateService`](../../../typedoc/types/StateService.html) alias removed
earlier in the cleanup window; the namespace name now describes the runtime
contract directly.

## ARIA Namespace Cleanup

[`ng.AriaConfig`](../../../typedoc/interfaces/AriaConfig.html) and
[`ng.AriaService`](../../../typedoc/interfaces/AriaService.html) are the
complete public ARIA namespace. Native attribute-name and value aliases were
removed because applications author those values in HTML rather than through
AngularTS APIs. Internal diagnostic records were also removed from the
namespace; enable `diagnostics` through `app.config({ $aria: ... })` to receive
accessibility warnings.

## Injectable Contracts

Every public single-dollar injection token has a named TypeScript contract.
Aliases such as [`ng.ScopeService`](../../../typedoc/types/ScopeService.html),
[`ng.RootScopeService`](../../../typedoc/types/RootScopeService.html),
[`ng.ElementService`](../../../typedoc/types/ElementService.html),
[`ng.DocumentService`](../../../typedoc/types/DocumentService.html), and
[`ng.WindowService`](../../../typedoc/types/WindowService.html) intentionally
identify values as injectables even when their runtime shape is shared with
[`ng.Scope`](../../../typedoc/classes/Scope.html) or a Web Platform type.
Internal double-dollar tokens are not part of this contract.

## Redundant Type Aliases

Aliases that did not introduce a distinct contract have been removed without
compatibility names:

| Removed names                                                                    | Use instead                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ng.PubSubService`                                                               | [`ng.EventBusService`](../../../typedoc/types/EventBusService.html)                                                                                                                                             |
| `ng.NativeAnimationOptions`                                                      | [`ng.AnimationOptions`](../../../typedoc/interfaces/AnimationOptions.html)                                                                                                                                      |
| `ng.SseProtocolMessage`, `ng.SseProtocolEventDetail`                             | [`ng.RealtimeProtocolMessage`](../../../typedoc/interfaces/RealtimeProtocolMessage.html), [`ng.RealtimeProtocolEventDetail<T, ng.SseConnection>`](../../../typedoc/interfaces/RealtimeProtocolEventDetail.html) |
| `ng.DateFilterOptions`, `ng.NumberFilterOptions`, `ng.RelativeTimeFilterOptions` | `Intl.DateTimeFormatOptions`, `Intl.NumberFormatOptions`, `Intl.RelativeTimeFormatOptions`                                                                                                                      |

Aliases remain removed when they neither identify a public injectable nor add
domain semantics. Register mocks under the normal injection token and annotate
them with that token's contract from
[`ng.InjectionTokenMap`](../../../typedoc/interfaces/InjectionTokenMap.html).

## Error Formatting Rename

The former `errorHandlingConfig(...)` method on `angular` and
`ErrorHandlingConfig` type in the `ng` namespace were renamed to
`angular.errorFormattingConfig(...)` and
[`ng.ErrorFormattingConfig`](../../../typedoc/interfaces/ErrorFormattingConfig.html).
The API only controls how values are serialized into framework error messages;
exception ownership remains the responsibility of `$exceptionHandler`. No
compatibility alias is retained.

## Final Authoring Shapes

Use these shapes for new code:

```js
angular
  .module('app', ['firebase'])
  .model('session', {
    user: null,
    token: null,
  })
  .router({
    name: 'home',
    url: '/',
    template: '<home-page></home-page>',
  })
  .config({
    $http: {
      defaults: {
        withCredentials: true,
      },
    },
    $security: {
      credentials: {
        kind: 'bearer',
        source: 'model',
        model: 'session',
        property: 'token',
      },
    },
  });
```

Config object keys are injectable service tokens. Use `$http`, `$security`,
`$location`, `$log`, and the other documented `$...` keys. Bare aliases such as
`http` or `security` are not part of the public API.

Third-party extensions should remain AngularTS modules. A library that needs
authentication, Firebase credentials, routing declarations, or realtime defaults
should export a module plus documented `app.config({ $token: ... })` or
`app.model(...)` requirements. It should not require users to reach for provider
objects unless the extension is intentionally exposing advanced DI.

## Migration Steps

1. Replace provider registration calls with
   [`NgModule`](../../../typedoc/classes/NgModule.html) declarations.
2. Move service policy and defaults into `app.config({ $token: ... })`.
3. Move shared mutable app state into `app.model(...)`.
4. Keep injected runtime services such as `$http`, `$location`, `$machine`,
   `$workflow`, and `$eventBus` in controllers, services, directives, and
   workflows.
5. Remove imports of provider-shaped namespace aliases unless the code is an
   advanced DI extension.
6. Regenerate docs and generated bindings after every public-surface change.
7. Replace `MachineStateConfig` or `MachineDefinition` annotations with
   [`MachineConfig`](../../../typedoc/types/MachineConfig.html); runtime machine
   definitions are unchanged.

## Cleanup Rules

Public API cleanup is complete when user docs teach the replacement path,
generated surfaces match the current namespace, examples exercise the current
API, and no temporary compatibility alias remains.
