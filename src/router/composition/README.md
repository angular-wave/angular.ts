# Router Runtime Composition Internals

Router runtime composition owns router-specific instances that require concrete
core runtime dependencies. It is internal framework assembly, not an
application extension API.

Router state, transitions, state registration, templates, and views form one
composition graph. The graph receives the runtime-owned `CompileLifecycle`,
compile registry, exception-handler service, and remaining router policy
dependencies directly. The stable exception-handler service lets router
instances observe typed handler configuration applied after the graph is
constructed without retaining an exception-handler provider.

Composition teardown is idempotent and releases retained views plus compile and
root lifecycle subscriptions owned by the view service.
