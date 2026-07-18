# Browser Runtime Services

This README covers the service-contract boundary for browser document and
runtime integrations:

- `$location`
- `$anchorScroll`
- `$wasm`
- web component services

These services intentionally wrap browser-owned state. They should make event
coordination, cleanup, and native interop predictable without pretending that
AngularTS owns browser history, scrolling, WebAssembly instances, or custom
element lifetimes.

## Location Contract

Lifecycle:

- `$location` parses the initial browser URL during service construction.
- In HTML5 mode, it requires a `<base>` tag unless configured otherwise.
- It registers root click handling for link rewriting and window
  `popstate`/`hashchange` listeners when URL listeners are initialized.
- Root-scope destruction removes the root click handler, URL listeners, and
  registered URL-change callbacks for that root element.
- Runtime destruction performs the same cleanup and invalidates queued browser
  writes even when the root scope has not yet been destroyed.

Policy:

- `app.config({ $location: ... })` owns `html5Mode`, `hashPrefix`, and
  `rewriteLinks` policy without exposing provider state.
- Internal links are rewritten only when link rewriting is enabled and the click
  is not modified, targeted, already prevented, or outside the app URL base.
- External app-base escapes fall back to `window.location.href`.

Failure:

- Missing required `<base>` in HTML5 mode throws during service construction.
- Browser `pushState`/URL update failures are caught, old `$location` state is
  restored, and the configured exception handler receives the error.
- `$locationChangeStart` can prevent a navigation before the browser URL is
  committed.

Scheduling:

- Browser `popstate` and `hashchange` updates are queued through a microtask
  before broadcasting location-change events.
- App-driven browser writes are scheduled asynchronously so listeners observe a
  stable event boundary.

Native interop:

- The native boundary is `window.location`, `window.history`, root `click`,
  `popstate`, and `hashchange`.
- `$location` does not replace the router. Router policy composes through
  transitions and `$locationChangeStart` listeners.

## Anchor Scroll Contract

Lifecycle:

- `$anchorScroll` is a stateless callable service.
- When automatic scrolling is enabled, it listens to `$locationChangeSuccess`
  through `$rootScope`; scope destruction owns listener cleanup.

Policy:

- `autoScrolling` controls whether hash changes trigger scrolling
  automatically.
- `yOffset` can be a number, function, or fixed element used to adjust scroll
  position after `scrollIntoView()`.

Failure:

- Missing hashes are no-ops except empty hash and `top`, which scroll to the
  page top.
- Invalid `yOffset` values are treated as zero.

Scheduling:

- If the document is complete, automatic hash scrolling runs in a microtask.
- If the document is still loading, scrolling waits for the browser `load`
  event.

Native interop:

- The native boundary is `document.getElementById`,
  `document.getElementsByName`, `HTMLElement.scrollIntoView`,
  `window.scrollBy`, and `window.scrollTo`.
- Browser scroll positioning remains browser-owned.

## Wasm Contract

Lifecycle:

- `$wasm.load({ source, imports? })` immediately returns a runtime-owned
  `WasmResource`; its `ready` promise represents fetch and instantiation.
- `ng-wasm` is template/root-owned and exposes the same resource on the linked
  scope.
- `resource.bind(target)` accepts either an app-owned model or a DOM-owned scope
  and returns an independently disposable binding.
- `.wasm(name, config)` registers an app-owned resource through the module
  system.
- Resource teardown releases its bindings without destroying their models or
  scopes; target teardown releases only that target's binding.

Policy:

- A resource always exposes one stable shape: `status`, `ready`, `error`,
  `instance`, `module`, `exports`, `bind`, and `dispose`.
- Binding names default to `$scopename` or `$id`. Guest facades resolve a name
  once and use its numeric handle afterward.
- The service does not persist Wasm memory, replay scope writes, or own worker
  isolation policy.

Failure:

- WebAssembly fetch/instantiate failures reject `resource.ready`, set
  `resource.status` to `error`, and expose a structured `WasmError`.
- Binding a guest without the AngularTS ABI rejects with `unsupported-abi`.
- Detached ABI callbacks that require guest exports throw a stable error.
- Scope path writes reject prototype-pollution paths and return failure codes
  to Wasm clients.
- Updates after a bridge is disposed are ignored.

Scheduling:

- `WasmScope.sync()` schedules callbacks in a microtask and drops queued work
  after disposal.
- Watches use AngularTS scope watchers and keep normal digest semantics.

Native interop:

- The native boundary is `WebAssembly.instantiate`, guest linear memory,
  exported `ng_abi_alloc`/`ng_abi_free`, and import functions under the
  AngularTS scope ABI namespace.
- AngularTS owns host handle tables and scope mutation; the Wasm module owns its
  memory, allocation functions, and exported lifecycle callbacks.

## Web Component Contract

Lifecycle:

- Web component services define custom elements backed by AngularTS child
  scopes or standalone runtimes.
- Connection is queued in a microtask so upgraded properties and attributes are
  available before template linking.
- Disconnection is delayed by one macrotask so same-turn DOM moves do not
  destroy and recreate scopes unnecessarily.
- Final disconnection runs the connected cleanup function, calls
  `disconnected`, destroys the owned scope, clears rendered content, and removes
  stored context.

Policy:

- Component options define shadow DOM ownership, isolate scope behavior,
  initial state, templates, and input coercion/reflection.
- Input definitions own attribute/property names, default values, type coercion,
  and optional attribute reflection.

Failure:

- Looking up a host not registered through `$webComponent` throws a stable
  registration error.
- Input coercion delegates to the configured type function; type errors are not
  hidden.

Scheduling:

- `connectedCallback` work is microtask queued.
- `disconnectedCallback` cleanup is macrotask delayed.
- Attribute changes synchronize immediately unless the change came from
  framework-owned reflection.

Native interop:

- The native boundary is `customElements.define`, `HTMLElement`,
  `connectedCallback`, `disconnectedCallback`, `attributeChangedCallback`,
  `ShadowRoot`, reflected attributes, and bubbling composed `CustomEvent`
  dispatch.
- AngularTS owns the child scope and compiled template for each connected
  element. The browser owns custom element upgrade timing and DOM connection
  state.

## Test Harness

- `src/services/location/location.spec.ts` covers URL parsing, link rewriting,
  history/hash behavior, and event policy.
- `src/services/anchor-scroll/anchor-scroll.spec.ts` covers target resolution,
  top scrolling, direct element scrolling, and offset behavior.
- `src/services/wasm/wasm.spec.ts` covers scope ABI operations, disposal,
  prototype-pollution guards, watches, binding lifecycle, and DOM updates from
  Wasm-driven scope mutation.
- `src/services/web-component/web-component.spec.ts` covers scoped custom
  elements, input/attribute synchronization, event dispatch, scope destruction,
  user-authored `ScopeElement` classes, nested scope ownership, and demos.
