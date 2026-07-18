# Web Component Service

`$webComponent` defines native custom elements backed by AngularTS scopes and
compiled templates. `NgModule.appComponent(...)` and
`NgModule.webComponent(...)` are the normal declaration APIs.

## Configuration

Configure defaults before bootstrap with the typed module configuration API:

```ts
app.config({
  $webComponent: {
    defaults: {
      shadow: true,
      isolate: true,
    },
  },
});
```

Declaration options override these defaults.

## Runtime Ownership

The owning runtime tracks custom-element scopes, disconnect timers, compiled
content, callbacks, and constructor metadata. Runtime teardown releases those
resources and rejects later service operations.

The Custom Elements API cannot unregister a tag name. Registered constructors
therefore remain in the browser registry after teardown, but AngularTS removes
their injector/compiler metadata so they no longer retain the destroyed
runtime or reconnect scopes.

For custom runtimes, include `webComponentModule` from
`@angular-wave/angular.ts/runtime/web-component`. `defineAngularElement(...)`
includes that registrar automatically.

## Tests

`web-component.spec.ts` covers scope inheritance, inputs, events, native
`ScopeElement` classes, typed defaults, disconnect behavior, and runtime
teardown. Browser tests cover standalone, React-hosted, and microapp examples.
