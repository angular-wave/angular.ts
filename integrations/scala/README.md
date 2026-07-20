# AngularTS Scala.js Integration

This package is the Scala.js facade for authoring AngularTS applications.

The integration is intentionally strict by default:

- dependency injection uses typed `Token[A]` values;
- normal module authoring goes through typed wrappers;
- raw JavaScript interop is isolated under `angular.ts.unsafe`;
- namespace parity is checked against `@types/namespace.d.ts`.

The current slice is the package foundation plus typed coverage for core
authoring, app models, routing, REST/cache policy, service workers, security,
realtime transports, persistent stores, machine/workflow orchestration, and
generated namespace parity.

## Prerequisites

- Node.js matching the repository root toolchain.
- Root npm dependencies installed with `npm ci`.
- JDK 11 or newer.
- `sbt` for Scala.js compilation.

## Local Checks

```sh
make check
```

Useful focused checks:

```sh
make compile
make parity
make generate-check
```

## Authoring Shape

```scala
import angular.ts.*
import org.scalajs.dom.document
import scala.scalajs.js

val app = AngularTS.module("demo")
val userToken = AngularTS.token[String]("userName")

final class HelloController(val user: String) extends js.Object
final class AppScope(val title: String) extends js.Object

app
  .value(userToken, "Ada")
  .component(
    "helloUser",
    Component(
      template = "<p>Hello {{$ctrl.user}}</p>",
      controller = AngularTS.inject1(userToken) { user =>
        new HelloController(user)
      },
    ),
  )
  .appComponent(
    "demo-shell",
    AppComponentOptions[AppScope](
      template = "<main>{{title}}<hello-user></hello-user></main>",
      scope = new AppScope("Scala.js AngularTS app"),
      isolate = true,
    ),
  )

AngularTS.bootstrap(document.body, Seq(app.name))
```

`AngularTS.module("demo")` creates a module with no dependencies. Use
`AngularTS.existingModule("demo")` only when intentionally looking up a module
registered elsewhere.

## Unsafe Interop

Use `angular.ts.unsafe` only when AngularTS exposes a deliberately dynamic
shape or when wrapping third-party JavaScript. Unsafe helpers are explicit so
typed application code does not silently drift into raw `js.Dynamic`.

## WASM Scope And App Models

Scala facades for `WasmScope` are view-scope facades. They should represent
DOM/root-scoped controller or component state, not shared app model state.
Shared or durable state should be declared with `app.model(...)` and
synchronized with external runtimes through host-side AngularTS services or
typed `model.sync(...)`/`model.$sync(...)` targets.

## Current Scope

Implemented:

- package/build scaffold
- typed `Token[A]`
- `inject0` through `inject6`
- `NgModule` wrappers for values, factories, services, controllers,
  components, directives, app components, persistent stores, and native
  web-component constructors
- `NgModule.model(...)` for app-owned reactive model services
- `NgModule.router(...)` for module-owned route trees and forests
- `NgModule.router(...)` for module-owned route trees
- `NgModule.lazyState(...)` for lazy router state namespaces
- component/directive/app-component config builders
- typed `ScopeElement` and `WebComponentContext` facades
- service facades and tokens for `$anchorScroll`, `$aria`, `$compile`,
  `$controller`, `$cookie`, `$eventBus`, `$exceptionHandler`, `$filter`,
  `$http`, `$httpParamSerializer`, `$interpolate`, `$location`, `$log`,
  `$parse`, `$rest`, `$sce`, `$sceDelegate`, `$security`, `$serviceWorker`,
  `$sse`, `$state`, `$transitions`, `$templateCache`, `$templateRequest`,
  `$websocket`, `$webTransport`, `$worker`, and DOM/root services
- core compile/scope callback shapes including `LinkFn`, `TranscludeFn`,
  `ScopeEvent`, and `Validator`
- public utility aliases including `Expression`, `ClassMap`, `ClassValue`,
  `Injectable`, and `ListenerFn`, plus a typed `NgModelController` facade
- router config, transition option, state declaration, route-tree, lazy-state,
  route-policy, and transition hook builders
- REST service, factory, backend, cache policy, cache store, resource
  declaration, and options facades
- app model value, lifecycle, restore option, and sync-target builders
- persistent store config builders and `StorageType` enum
- ARIA, interpolation, SCE, security policy/config builders, and
  `NgModule.config(...)` bridges
- service-worker registration/message option builders and module helper
- machine config, guard, transition, hook, snapshot, service, and
  `NgModule.machine(...)` facades
- workflow command, config, snapshot, state-engine, service, and
  `NgModule.workflow(...)` facades
- workflow supervisor, persistence, recovery, worker protocol, worker
  host/client, and `NgModule.workflowSupervisor(...)` facades
- `Injector.get[A](...)`
- namespace parity artifact/checker
- unsafe surface decision notes
- maintenance ownership and review cadence
- release-readiness gate with parity scope and known gaps
- browser smoke example wired through Playwright

## Executable Examples

The current browser smoke example lives at:

```text
integrations/scala/examples/basic_app/index.html
```

It loads the built AngularTS UMD runtime from `dist/angular-ts.umd.min.js`,
loads the Scala.js fast-link output, and verifies:

- Scala-authored AngularTS component rendering;
- typed bound component attributes;
- Scala-authored directive linking;
- app-component rendering;
- native `ScopeElement` subclassing from Scala.js.

Run it with:

```sh
make runtime-test
```

This target rebuilds the root AngularTS runtime, builds the Scala.js example
with `sbt basicApp/fastLinkJS`, and runs Playwright against the example page.

## Release Readiness Notes

The Scala.js package is an active official integration with public namespace
parity closed for the current AngularTS `ng` namespace. It is not release ready
until the remaining publish gates are closed:

- final package coordinates;
- release notes naming the compatible AngularTS npm package version;
- release automation.

Package lifecycle rule:

- AngularTS runtime compatibility is pinned to the repository version that
  generated and validated the Scala facades.
- Public Scala APIs must stay typed by default; raw JavaScript interop belongs
  under `angular.ts.unsafe`.
- Any new public Scala facade must have a unit test, parity entry, and, when it
  affects runtime behavior, an executable browser example or smoke assertion.

## Package And Publish Workflow

The package version must track the AngularTS runtime version used to generate
and validate the facades. Before a publish candidate:

```sh
make check
make release-check
make publish-local
```

For local consumer validation:

```sh
make publish-local
```

Do not publish a Scala.js package from a dirty generated surface. Run
`make release-check` and commit regenerated namespace parity artifacts with the
facade changes that required them. Remote repository credentials are not wired
by default; add them only for an explicit release operation.

## Version Compatibility

- Patch releases may add facade methods for already-public AngularTS members.
- Minor releases may add typed builders, service facades, tokens, and examples.
- Major releases are required when an AngularTS public contract changes in a way
  that breaks existing Scala source compatibility.
- A Scala package release is compatible only with the AngularTS npm package
  version named in the same release notes.

## Migration Notes

- Provider-era customization must migrate to typed `NgModule.config(...)`
  objects or service-specific config builders.
- Raw string injection should migrate to `Token[A]` plus `inject0` through
  `inject6`.
- Raw `js.Dynamic.literal(...)` config should migrate to the nearest Scala case
  class builder. Keep `angular.ts.unsafe.UnsafeInterop.literal(...)` only for
  third-party JavaScript interop or explicitly unsupported AngularTS surfaces.
- DOM scope state should stay in `Scope` or component/app-component scopes.
  Shared app state should use typed AngularTS app models.

## App Model Guidance

Use `app.model(...)` for shared reactive state that must outlive a DOM root or
synchronize with another runtime.

```scala
final class Player(var x: Double, var y: Double) extends js.Object

val playerToken = AngularTS.token[Model[Player]]("player")

app.model(playerToken, () => new Player(0.0, 0.0))

val socketSync = ModelSyncTarget[Player](
  write = (snapshot: Player, change: ModelChange) =>
    js.Dynamic.global.playerSocket.send(
      js.JSON.stringify(
        js.Dynamic.literal(
          x = snapshot.x,
          y = snapshot.y,
          keys = change.keys,
        ),
      ),
    ),
)
```

Injected model values are still scope-backed, but shared synchronization should
use `$snapshot`, `$restore`, or the typed `sync(...)` extension instead of DOM
watchers.

## Native ScopeElement Guidance

Use `ScopeElement[T]` when a Scala.js custom element needs the native custom
element lifecycle while AngularTS still owns the child scope and template
compilation.

Attach static AngularTS options to the generated JavaScript constructor before
registration:

```scala
final class CardScope(var status: String) extends js.Object

final class CardElement extends ScopeElement[CardScope]:
  override def connected(): js.UndefOr[js.Function0[Unit]] =
    scope.status = "ready"
    js.undefined

val cardClass = js.constructorOf[CardElement].asInstanceOf[js.Dynamic]
cardClass.updateDynamic("template")("<p>{{status}}</p>")
cardClass.updateDynamic("scope")(new CardScope("connecting"))

app.webComponent(
  "scala-card",
  js.constructorOf[CardElement].asInstanceOf[ScopeElementConstructor[CardScope]],
)
```

Prefer `appComponent(...)` for declarative host elements that do not need a
native class. Use `webComponent(...)` and `ScopeElement` when the element needs
custom lifecycle methods, DOM APIs, or class inheritance.

The browser UMD runtime exposes the custom-element base class as
`angular.ScopeElement`. The root ESM entrypoint remains narrow; Scala.js uses the
global runtime value because native JavaScript subclassing needs a runtime
constructor, not a type-only facade.

Deferred:

- Scaladoc coverage checks
