# Animation Service

`$animate` coordinates DOM mutation, JavaScript animation presets, CSS custom
property animations, native Web Animations, and document view transitions.

## Public Surface

- `AnimateService`: injected runtime animation operations.
- `AnimationHandle`: cancellable, pausable, promise-like animation result.
- `AnimationPreset`: reusable phase handlers or keyframes.
- `AnimationOptions`: per-operation keyframes, timing, classes, and lifecycle
  callbacks.
- `NgModule.animation(...)`: declarative named preset registration.

```ts
const app = angular.module("app", ["ng"]);

app.animation("fade-fast", () => ({
  enter: [{ opacity: 0 }, { opacity: 1 }],
  leave: [{ opacity: 1 }, { opacity: 0 }],
  options: { duration: 120 },
}));
```

## Core Model

Animation declarations are stored in one runtime-owned registry. `$animate` is
constructed lazily and resolves injectable preset factories only when an
element requests the named animation. Runtime calls can also define presets
through `$animate.define(...)`.

Each operation returns an `AnimationHandle`. Starting another animation for the
same element cancels the active handle before running the replacement.

## Lifecycle Contract

- Runtime composition owns and clears the animation registry.
- Element animation handles own native animation cancellation and completion.
- Leave operations remove the element only after successful completion.
- Temporary classes, CSS animation overrides, and runtime measurement
  properties are restored on completion or cancellation.

## Reactivity Contract

The service performs DOM work requested by directives and application code; it
does not own model state or watchers. Reactive directives decide when to invoke
animation operations, and each operation applies its DOM mutation before or
after animation according to the phase contract.

## Policy Contract

AngularTS does not add a global animation-policy object. The browser's
`prefers-reduced-motion` setting is always respected. Timing, keyframes,
temporary classes, and lifecycle callbacks belong to `AnimationOptions` or a
named preset.

## Composition Contract

`NgModule.animation(...)` writes directly to the runtime's internal
`AnimationRegistry`; there is no injectable animation provider. The full
runtime registers `$animate` as a lazy factory over that registry and the
application injector.

## Test Harness

- `animate.spec.ts` covers the registry, service phases, presets, native
  handles, reduced motion, lifecycle callbacks, and class mutation.
- `animate.test.ts` runs the browser suite through Playwright.
