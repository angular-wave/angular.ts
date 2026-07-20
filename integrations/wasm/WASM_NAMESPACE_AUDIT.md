# Wasm Namespace Audit

## Goal

Keep ordinary AngularTS app documentation focused on the app-facing `$wasm`
surface while preserving the low-level Wasm scope ABI required by Rust, Go,
AssemblyScript, C#, Zig, C++, C, Kotlin, Scala.js, Dart, Closure, and future
language bindings.

The current audit result is that the Wasm ABI is public, but it should not live
as ordinary ambient `ng.Wasm*` user API. Binding authors need a stable ABI
surface; application authors need the stable resource, binding, structured
error, and target contracts. They do not need raw handles or result buffers.

## Current Public Surfaces

| Surface | Audience | Decision |
| --- | --- | --- |
| `$wasm` / `ng.WasmService` | AngularTS application authors | Keep in ambient `ng`; this is the injectable service users encounter. |
| `ng.WasmLoadOptions`, `ng.WasmSource` | AngularTS application authors | Keep in ambient `ng`; users pass these to `load` and module registration. |
| `ng.WasmResource`, `ng.WasmResourceStatus` | AngularTS application authors | Keep in ambient `ng`; every load and module registration exposes this stable lifecycle object. |
| `ng.WasmBinding`, `ng.WasmBindingOptions`, `ng.WasmTarget` | AngularTS application authors | Keep in ambient `ng`; users encounter these when connecting models or scopes to guests. The binding preserves its concrete target type and does not expose the ABI's numeric scope handle. |
| `ng.WasmError`, `ng.WasmErrorCode` | AngularTS application authors | Keep in ambient `ng`; load and binding failures expose these contracts. |
| `WasmAbi` runtime namespace object from `@angular-wave/angular.ts/services/wasm` | Language and runtime binding authors | Keep as the single target ABI factory. |
| `WasmAbiError`, `WasmAbiErrorCode`, `WasmAbiExports`, `WasmScope`, `WasmScopeAbi`, `WasmScopeAbiImportObject`, `WasmScopeAbiImports`, `WasmScopeBindingOptions`, `WasmScopeOptions`, `WasmScopeReference`, `WasmScopeTransaction`, `WasmScopeUpdate`, `WasmScopeWatchOptions`, `WasmScopeWriteOptions` from `@angular-wave/angular.ts/services/wasm` | Language and runtime binding authors | Keep as direct service-subpath ABI contracts; do not expose through ambient `ng`. |

## Dependency Audit

- [x] `@angular-wave/angular.ts/services/wasm` is already a package export.
- [x] C, C++, C#, AssemblyScript, Zig, Go bootstrap code, and Rust generated
      bootstrap code now import `WasmAbi` from
      `@angular-wave/angular.ts/services/wasm`.
- [x] Kotlin wraps Wasm service and ABI values manually and no longer imports
      generated raw `ng.Wasm*` facades from app-facing wrapper code.
- [x] Dart wraps Wasm service and ABI values manually and no longer depends on
      generated raw `ng.Wasm*` facades from app-facing wrapper code.
- [x] Gleam keeps app-facing Wasm markers in the generated namespace and exposes
      binding-author ABI markers through `angular_ts/wasm`.
- [x] Scala.js manually exposes the Wasm ABI shapes as public facades.
- [x] Closure externs and ClojureScript generated wrappers no longer emit
      `ng.Wasm*` names for the low-level ABI aliases.
- [x] Rust and Go namespace parity documents no longer treat low-level Wasm ABI
      contracts as ambient `ng` parity entries.
- [x] TypeDoc/public-doc gates no longer require low-level Wasm ABI aliases as
      ordinary `ng.*` documentation pages.

## Implemented Split

- [x] Add `WasmAbi` runtime namespace object on the existing
      `@angular-wave/angular.ts/services/wasm` subpath.
- [x] Expose `WasmAbi.create()` as the only runtime ABI factory; create scopes
      through `abi.createScope(...)`.
- [x] Keep low-level ABI type contracts as direct exports from the same subpath:
      `WasmAbiExports`, `WasmScope`, `WasmScopeAbi`, `WasmScopeAbiImports`,
      `WasmScopeAbiImportObject`, `WasmScopeBindingOptions`, `WasmScopeOptions`,
      `WasmScopeReference`, `WasmScopeUpdate`, and
      `WasmScopeWatchOptions`.
- [x] Keep `WasmScope` and `WasmScopeAbi` as interfaces returned by the factory
      so private host constructors do not become part of the binding-author
      contract.
- [x] Add runtime coverage proving `WasmAbi.create()` returns an ABI while
      `WasmScope` and `WasmScopeAbi` remain type-only contracts.
- [x] Route the package service subpath through a narrow public entry point so
      runtime composition helpers are not JavaScript exports available to
      binding authors.

## Migration Roadmap

- [x] Update ABI docs to show new binding-author imports:

```ts
import { WasmAbi } from "@angular-wave/angular.ts/services/wasm";

const abi = WasmAbi.create();
```

- [x] Update Rust generated bootstrap snapshots to use `WasmAbi.create()`.
- [x] Update Go bootstrap generator and snapshots to the chosen ABI namespace
      import shape.
- [x] Update C, C++, C#, AssemblyScript, and Zig bootstrap examples to the
      chosen ABI namespace import shape.
- [x] Add Kotlin raw facade support for the service subpath ABI namespace so
      `WorkerWasm.kt` no longer depends on generated `ng.WasmScopeAbi`.
- [x] Add Dart raw facade support for the service subpath ABI namespace so
      generated Wasm wrappers no longer depend on `ng.Wasm*` ABI aliases.
- [x] Add Gleam, Closure, ClojureScript, and Scala.js notes or wrappers for the
      service subpath ABI namespace.
- [x] Remove the low-level ABI aliases from `src/namespace.ts`:
      `WasmAbiExports`, `WasmScopeAbi`, `WasmScopeAbiImportObject`,
      `WasmScopeAbiImports`, `WasmScopeBindingOptions`, `WasmScopeReference`,
      `WasmScopeUpdate`, and `WasmScopeWatchOptions`.
- [x] Remove `ng.WasmScope` and `ng.WasmScopeOptions`; the public
      `WasmResource.bind(WasmTarget)` operation covers both models and scopes.
- [x] Regenerate Closure, ClojureScript, Dart, Gleam, Kotlin, Scala.js, Rust,
      and Go namespace parity after the ambient `ng` shrink.
- [x] Run `make lint`, then `make check`.
- [x] Run `make format`, `make build`, and `make docs-requirement` after the
      final namespace removal slice.

## Stoppages

- [x] Do not remove `ng.WasmScopeAbi` until Closure and ClojureScript no
      longer require generated raw ambient facades for it.
- [x] Do not remove `ng.WasmScopeUpdate`, `ng.WasmScopeWatchOptions`, or
      `ng.WasmScopeBindingOptions` until the language wrappers that type
      `WasmScope.watch(...)` and `WasmScope.bind(...)` have a non-ambient
      ABI source.
- [x] Remove `ng.WasmAbiExports` after binding-author docs moved to the direct
      service subpath.
- [x] Hide `WasmScope`; `WasmResource.bind(...)` is the app-facing bridge for
      both app-owned models and root/view-owned scopes.
- [x] Remove the raw numeric scope handle from `ng.WasmBinding` and preserve the
      concrete model or scope type through `WasmResource.bind(...)`.
