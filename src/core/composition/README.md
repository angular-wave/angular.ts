# Runtime Composition Internals

Runtime composition owns framework instances without exposing a second
application extension mechanism. Applications continue to use AngularTS
modules and public single-dollar injectables.

`createCoreRuntime(...)` establishes the runtime ownership boundary for the
host window, host document, host console, `AppContext`, `CompileLifecycle`,
controller, filter, and animation registries, and lifecycle disposers. It also owns the
`CompileRegistry` used by every loaded module in that runtime. A top-level
runtime owns its `AppContext`; sub-applications borrow the host runtime context
and therefore cannot destroy shared app models by disposing their own
composition. Each runtime still receives isolated compile, controller, and
filter declaration state because those declarations are runtime-local.
Interpolation delimiter configuration is also runtime-owned and is applied
before the injector lazily constructs the `$interpolate` service shared by the
compiler and application code.
Logging configuration is runtime-owned as well; lazy `$log` construction uses
the explicit host console dependency or an application-configured logger.

`registerRuntimeProviders(...)` is the ordered bridge used while provider
recipes remain. A recipe may expose an internal `_compose(...)` hook when it
needs an already-created framework object such as `CompileRegistry`. Router
configuration and declarations are dispatched to the composed router runtime,
so optional provider groups do not need private injector tokens to receive
composition-owned dependencies.

Composition teardown is idempotent. Disposers run once in reverse registration
order, and direct `AppContext` teardown also closes every composition attached
to that context. Framework services migrate into this owner incrementally; the
composition API remains internal and is not an injectable or public primitive.
