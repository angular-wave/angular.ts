# Config API Design

This document accepts the global service config shape for AngularTS.

It unblocks service-owned config work while keeping runtime implementation
gated by type tests, provider applicators, docs, and samples.

## Progress Checklist

- [x] Remove the public keyed config overload shape.
- [x] Accept the object-only config shape.
- [x] Define merge and ordering rules.
- [x] Define security-sensitive config rules.
- [x] Reserve `AngularConfigMap` for framework-owned config.
- [x] Define third-party extension through AngularTS modules.
- [x] Add exported `AngularConfigMap` and related helper types.
- [x] Add `NgModule.config(...)`.
- [x] Add type tests for valid object config.
- [x] Add type tests rejecting unknown keys and fields.
- [x] Add runtime provider applicators for each implemented config key.
- [x] Add docs and executable samples for each implemented config key.

Implemented config keys:

- [x] `$log`: `docs/content/docs/service/log.md`,
      `docs/static/examples/config/log-cookie.js`
- [x] `$cookie`: `docs/content/docs/service/cookie.md`,
      `docs/static/examples/config/log-cookie.js`
- [x] `$exceptionHandler`: `docs/content/docs/service/exceptionHandler.md`,
      `docs/static/examples/config/exception-handler.js`
- [x] `$location`: `docs/content/docs/service/location.md`,
      `docs/static/examples/config/location.js`
- [x] `$sce`: `docs/content/docs/service/sce.md`,
      `docs/static/examples/config/sce.js`
- [x] `$sceDelegate`: `docs/content/docs/service/sce.md`,
      `docs/static/examples/config/sce.js`
- [x] `$http`: `docs/content/docs/service/http.md`,
      `docs/static/examples/config/http.js`
- [x] `$rest`: `docs/content/docs/services/rest.md`,
      `docs/static/examples/config/rest.js`
- [x] `$anchorScroll`: `docs/content/docs/service/anchorScroll.md`,
      `docs/static/examples/config/anchor-scroll.js`
- [x] `$templateCache`: `docs/content/docs/service/templateCache.md`,
      `docs/static/examples/config/template-cache.js`
- [x] `$templateRequest`: `docs/content/docs/service/templateRequest.md`,
      `docs/static/examples/config/template-request.js`
- [x] `$security`: `docs/content/docs/service/security.md`,
      `docs/static/examples/config/security.js`
- [x] `$sse`, `$websocket`, `$webTransport`:
      `docs/content/docs/services/realtime.md`,
      `docs/static/examples/config/realtime.js`
- [x] `$aria`: `docs/content/docs/directive/aria.md`,
      `docs/static/examples/config/aria.js`
- [x] `$interpolate`: `docs/content/docs/concepts/templates-interpolation.md`,
      `docs/static/examples/config/interpolate.js`
- [x] `$compile`: `docs/content/docs/service/compile.md`,
      `docs/static/examples/config/compile.html`,
      `docs/static/examples/config/compile.js`

## Accepted User Shape

AngularTS supports one public config shape: an object keyed by injectable
service token.

```ts
app.config({
  $log: {
    debug: false,
  },
  $cookie: {
    defaults: {
      sameSite: "lax",
      secure: true,
    },
  },
  $location: {
    html5Mode: true,
    hashPrefix: "!",
  },
});
```

This is a config-phase declaration. It is not a runtime service mutation API.
Runtime service calls continue to receive per-call `options` objects.

## Accepted Type Shape

The implementation should expose a strict built-in config map:

```ts
export interface AngularConfigMap {
  $compile?: CompileConfig;
  $anchorScroll?: AnchorScrollConfig;
  $aria?: Partial<AriaConfig>;
  $cookie?: CookieConfig;
  $exceptionHandler?: ExceptionHandlerConfig;
  $http?: HttpConfig;
  $interpolate?: InterpolateConfig;
  $location?: LocationConfig;
  $log?: LogConfig;
  $rest?: RestConfig;
  $security?: SecurityConfig;
  $sce?: SceConfig;
  $sceDelegate?: SceDelegateConfig;
  $sse?: { defaults?: SseConfig };
  $templateCache?: TemplateCacheConfig;
  $templateRequest?: TemplateRequestConfig;
  $webTransport?: { defaults?: WebTransportConfig };
  $websocket?: { defaults?: WebSocketConfig };
}

export type AngularConfigKey = keyof AngularConfigMap;

export type AngularConfigFor<TKey extends AngularConfigKey> = NonNullable<
  AngularConfigMap[TKey]
>;
```

Security policy is now part of the runtime config map and routed through the
`$security` provider.

The runtime method shape is:

```ts
config(config: AngularConfigMap): this;
```

Object literal excess-property checks are part of the public contract. Unknown
config keys and unknown config fields must fail type checks in TypeScript. In
plain JavaScript, unknown keys must throw during config application.

## Merge Rules

Config is declarative and ordered.

- Module dependency config applies before the depending module config.
- Within one module, `config(...)` calls apply in declaration order.
- Later config for the same key merges into earlier config.
- Merge behavior is service-defined and documented per config key.
- Object defaults usually shallow-merge.
- Arrays replace unless the service config explicitly documents append
  behavior.
- Functions replace.
- `undefined` means "field omitted" and should not clear an existing value.
- `null` may clear only when the specific service config type documents that
  behavior.

These rules prevent one hidden global merge algorithm from becoming another
framework primitive users must learn.

## Provider Application Rules

Each config key requires a provider applicator before it can be implemented:

```ts
type AngularConfigApplicator<TKey extends AngularConfigKey> = (
  provider: unknown,
  config: AngularConfigFor<TKey>,
) => void;
```

Applicators are internal. Users should not import provider objects to configure
normal apps.

An implementation slice for any key must document:

- provider token used during config phase
- fields applied to provider state
- merge behavior
- runtime mutability, if any existing service already supports it
- type tests for valid and invalid config
- source tests proving provider state changes
- docs and executable sample path

## Security Rules

Security-sensitive config must stay explicit and reviewable.

- `sce` and `sceDelegate` config must not be hidden behind broad presets.
- Trust lists must remain literal and auditable where practical.
- Config that disables security must use a direct field name such as
  `enabled: false`; it must not be implied by another option.
- Generated docs and samples must show risky security policy as intentional
  user code.

## Third-Party Boundary

Third-party modules should not extend `AngularConfigMap` by default.

The default extension path is the AngularTS module system:

```ts
angular.module("firebase", []);
angular.module("app", ["firebase"]);
```

Built-in-style config keys are reserved for framework-owned services unless a
third-party module is intentionally promoted into a framework-owned registry
extension. That decision must be made as a framework API slice, not by
declaration merging.

## Initial Implementation Order

Implement config through small, testable pilots:

1. `log`: smallest policy provider; proves object config.
2. `cookie`: simple defaults object; proves merge semantics.
3. `location`: browser policy; proves object-or-boolean normalization.
4. `sce`/`sceDelegate`: security-sensitive config; proves explicit policy.
5. `http`: broad defaults/interceptor surface; implement after small pilots.
6. Realtime config: done for `$sse`, `$websocket`, and `$webTransport` after
   lifecycle policy hardening.
7. `security`: done.
8. `aria`: done.
9. `interpolate`: done.
10. Worker config: implement after worker lifecycle policy hardening.

## Runtime Stoppages

1. Do not add `NgModule.config(...)` without type tests for object config,
   unknown keys, and unknown fields.
2. Do not add a config key without a provider applicator and docs/sample owner.
3. Do not implement broad HTTP config before `log` or `cookie` proves the
   overload and merge model.
4. Do not allow third-party modules to write framework config keys unless the
   module is explicitly promoted into a framework-owned registry extension.
5. Do not remove provider docs until the matching config key has docs, samples,
   source tests, and migration notes.

6. Do not introduce a dedicated auth service before the cross-cutting policy
   abstraction is defined. Security must be modeled as a policy implementation
   so every primitive can consume it consistently.
