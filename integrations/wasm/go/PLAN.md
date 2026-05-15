# AngularTS Go Wasm Plan

## Goal

Support Go-authored AngularTS applications through the shared Wasm scope ABI.

The target is standard Go Wasm. Go may require `wasm_exec.js` and `syscall/js`
runtime glue for startup, but scope access must still go through the
language-neutral `WasmScope` ABI rather than a Go-specific scope protocol.

Standard Go Wasm can import raw host ABI functions, but the browser runtime does
not expose arbitrary guest exports in the same way as Rust/wasm-bindgen. The Go
browser proof therefore uses `GoWasmScopeAbi`, a small `syscall/js` adapter over
host `WasmScope` objects for lifecycle callbacks and UI-originated updates. The
low-level pointer/length facade remains build-tested for the shared ABI shape.

## Contract

Go targets the shared ABI documented in:

```text
integrations/wasm/ABI.md
```

The Go facade must not introduce a separate scope protocol. The low-level ABI
package should call the same `angular_ts` imports:

```text
scope_resolve
scope_get
scope_get_named
scope_set
scope_set_named
scope_delete
scope_delete_named
scope_flush
scope_flush_named
scope_watch
scope_watch_named
scope_unwatch
scope_unbind
scope_unbind_named
buffer_ptr
buffer_len
buffer_free
```

The raw ABI shape includes these guest callbacks:

```text
ng_abi_alloc
ng_abi_free
ng_scope_on_bind
ng_scope_on_unbind
ng_scope_on_update
```

Standard Go browser Wasm does not currently expose arbitrary guest exports as
the primary browser integration path. In browser examples, `GoWasmScopeAbi`
therefore adapts Go `syscall/js` callbacks to the same host `WasmScope`
boundary. This is an adapter for standard Go runtime constraints, not a second
scope model.

## Facade Shape

The Go package exposes a small typed wrapper for the raw ABI path:

```go
type Scope struct {
    Handle uint32
}

func (s Scope) Get(path string, out any) error
func (s Scope) Set(path string, value any) error
func (s Scope) Delete(path string) bool
func (s Scope) Flush() bool
func (s Scope) Watch(path string, fn func(Update)) Watch
func (s Scope) Unbind() bool
```

The facade can start with JSON-compatible values and use Go's JSON package for
encoding and decoding.

The standard browser path exposes equivalent semantics through `BrowserScope`
and `GoWasmScopeAbi`:

```go
scope := angularwasm.BrowserNamed("todoList:main")
scope.Set("items", items)
scope.Watch("newTodo", func(update angularwasm.Update) {
    // Decode update.JSON and update Go-owned state.
})
scope.Flush()
```

## Rust Feature Parity Target

Go should reach feature parity with the completed Rust/Wasm integration before
it is considered first-class. Parity means equivalent AngularTS authoring
capability, not identical implementation techniques.

Rust uses procedural macros and wasm-bindgen-generated glue. Standard Go should
use Go-native declarations, `go generate`, and generated JavaScript bootstrap
where needed. Application authors should write Go code, templates, and small
configuration files; they should not hand-write AngularTS registration glue for
ordinary apps.

Go is feature complete when:

- the Go todo app is implemented through Go-owned state and the shared
  `WasmScope` boundary;
- the todo app does not require handwritten AngularTS module, controller,
  component, method, or state bridge wiring in application source;
- generated or maintained bootstrap owns `wasm_exec.js` loading,
  `GoWasmScopeAbi`, AngularTS module registration, and scope binding;
- Go-authored modules, services, factories, values, components, controllers,
  typed DI, template files, and lifecycle hooks are declared in Go metadata and
  generated into AngularTS registration code;
- template-visible fields and methods are derived from Go metadata or generated
  reflection output, not manifest string lists;
- UI-originated scope updates route back into Go-owned state through
  `WasmScope` watches;
- Go facade APIs cover the same required public namespace surface completed by
  Rust: `WasmScope` boundary types, restricted `Scope`, `$rootScope`, authoring
  metadata, `$http`, diagnostics/events, template request/cache, storage, and
  cookies;
- unsupported boundary types fail during `go generate`, `go vet`, or build-time
  validation rather than at runtime where practical;
- generated bootstrap snapshot tests and Playwright browser tests cover the Go
  todo workflow end to end;
- a Go namespace parity checklist exists and every published AngularTS `ng`
  namespace type has an explicit Go decision.

## Required Namespace Porting Surface

The Go parity checklist should mirror the Rust checklist and start with the
same required surface:

- Wasm scope boundary: `WasmScope`, `WasmScopeAbiImports`, `WasmAbiExports`,
  `WasmScopeUpdate`, `WasmScopeWatchOptions`, `WasmScopeBindingOptions`, and
  `WasmScopeReference`.
- Restricted scope/lifecycle facade: `Scope` and `RootScopeService`.
- Go authoring metadata: `Component`, `Controller`, `ControllerConstructor`,
  `NgModule`, `Injectable`, and `InjectionTokens`.
- HTTP facade: `HttpService`, `RequestConfig`, `RequestShortcutConfig`,
  `HttpMethod`, `HttpResponse`, and `HttpResponseStatus`.
- Diagnostics and events: `LogService`, `ExceptionHandlerService`,
  `PubSubService`, `TopicService`, `ListenerFn`, `ScopeEvent`, and
  `InvocationDetail`.
- Template-file support: `TemplateRequestService` and `TemplateCacheService`.
- Persistence: `StorageBackend`, `StorageType`, `CookieService`,
  `CookieOptions`, and `CookieStoreOptions`.

Deferred Go parity follows the Rust deferred list: providers, compile/link
directive internals, transclusion, browser object escape hatches, animation,
workers, web components, parse/interpolate/filter/SCE/location, router/state,
forms, realtime, and REST unless a Go reference example needs them.

## Code Generation Direction

Go should avoid runtime reflection-heavy bridge code in browser hot paths. The
preferred path is:

- Go annotations through struct tags, marker interfaces, or explicit
  registration functions;
- `go generate` emits AngularTS registration metadata and bootstrap helpers;
- generated code validates exported fields, methods, injected services, and
  template references;
- `GoWasmScopeAbi` remains the standard-Go browser adapter over host
  `WasmScope`;
- the raw pointer/length ABI package remains build-tested for portability and
  future toolchains that expose guest callbacks directly.

Target authoring shape:

```go
type TodoList struct {
    Scope angularwasm.BrowserScope `ng:"$scope"`
    Items []Todo                  `ng:"state"`
    Title string                  `ng:"model:newTodo"`
}

func (c *TodoList) Add(title string) {}
func (c *TodoList) Toggle(index int) {}
func (c *TodoList) Archive() {}
```

The exact annotation syntax is open, but the end state should be one Go method
or field declaration generating the AngularTS-visible wrapper, registration
metadata, scope refresh, and scope watch routing.

## Phases

### Phase A - ABI Package

- [x] Create a Go Wasm-compatible `angular.ts/wasm` package.
- [x] Declare/import the `angular_ts` host ABI functions.
- [x] Export `ng_abi_alloc` and `ng_abi_free`.
- [x] Add string and JSON pointer/length helpers.
- [x] Add `Scope`, `NamedScope`, `Watch`, and `Update` wrappers.

### Phase B - Todo Proof

- [x] Create a Go Wasm todo example under `integrations/wasm/go`.
- [x] Use the Go scope facade to update real AngularTS scope state.
- [x] Use the Go scope facade to receive UI-originated scope updates.
- [x] Add `GoWasmScopeAbi` and a minimal bootstrap that binds `WasmScope`.

### Phase C - Browser Validation

- [x] Add Playwright coverage for the Go Wasm todo example.
- [x] Verify add, toggle, archive, input clearing, and UI-to-Wasm propagation.
- [x] Verify result buffers are freed in low-level facade tests.

### Phase D - Go Authoring Metadata

- [x] Define Go module, component, controller, service, factory, and value
      declaration shapes.
- [x] Define typed DI token and injection metadata conventions.
- [x] Add a `go generate` command that emits AngularTS registration metadata.
- [x] Generate bootstrap code that owns `wasm_exec.js`, `GoWasmScopeAbi`, and
      AngularTS module registration.
- [x] Add snapshot tests for generated bootstrap and registration metadata.

### Phase E - Go Scope and Template Ergonomics

- [ ] Generate template-visible field and method bridges from Go metadata.
  - [x] Generate template-visible controller methods from Go metadata.
  - [x] Generate template-visible fields from Go metadata.
- [ ] Generate scope refresh after method calls, lifecycle hooks, async
      completions, and watched UI updates.
  - [x] Generate refresh after controller bind lifecycle.
  - [x] Generate refresh after template method calls.
  - [x] Generate refresh after watched UI updates.
  - [ ] Generate refresh after async completions.
- [x] Generate a state sync helper for Go-owned scope fields.
- [x] Generate UI-to-Go watch routing through `GoWasmScopeAbi`.
- [x] Remove manual scope set/flush calls from the Go todo app.
- [x] Add acceptance checks proving the Go todo app source has no handwritten
      bridge glue.

### Phase F - Go Service Facades

- [ ] Add typed `$http` request/response helpers matching Rust coverage.
- [ ] Add `$log`, `$exceptionHandler`, `$rootScope`, `$scope`, and `$eventBus`
      facades.
- [ ] Add `TopicService`, `ListenerFn`, `ScopeEvent`, and `InvocationDetail`
      coverage.
- [ ] Add `$templateRequest` and `$templateCache` facades.
- [ ] Add storage and cookie facades.

### Phase G - Go Namespace Parity

- [ ] Add `integrations/wasm/go/NG_NAMESPACE_PARITY.md`.
- [ ] Add a parity checker against `@types/namespace.d.ts`.
- [ ] Give every public `ng` namespace type an explicit Go decision.
- [ ] Promote required namespace entries to covered with tests.

### Phase H - Go Feature Completion

- [ ] Replace the proof todo app with the generated authoring model.
- [ ] Add Playwright coverage for generated Go registration and lifecycle
      behavior.
- [ ] Add browser coverage for UI-to-Go and Go-to-DOM state propagation.
- [ ] Run `make check` and `make browser-test` as the local completion gate.
- [ ] Document remaining deferred parity with reasons.

## Non-Goals

- Reimplement AngularTS in Go.
- Introduce Go-specific scope sync.
- Depend on event bus for Wasm scope mutation.
