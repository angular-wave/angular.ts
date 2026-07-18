# Compile Internals

This directory owns AngularTS template compilation, directive and component
registration, directive matching, linking, controller wiring, bindings,
template replacement, template URLs, interpolation directives, and
transclusion. The implementation in `compile.ts` is centered on a two-phase
pipeline: compile-time planning builds node/link executors, and link-time
execution binds those plans to a concrete scope and DOM node list.

Incremental DOM compilation is implemented through private, root-owned compiled
fragment records. The records let structural directives, router views,
realtime swaps, streamed content, and workflow UI replace bounded DOM without
re-bootstrap or leaked fragment state.

The current public API decision is intentionally conservative: AngularTS does
not expose a public fragment handle or `$compile.fragment(...)` API yet.
Framework services and directives consume the internal fragment contract while
users continue to work through declarative streams, workflows, routes,
directives, and `$compile(...)` where already supported.

## Responsibilities

- Register directives and components through the runtime-owned compile
  registry used by `NgModule.directive()` and `NgModule.component()`.
- Normalize directive definitions into internal directive records.
- Match element and attribute directives by normalized names and restrictions.
- Sort and apply directives by priority, name, and registration index.
- Build public link functions that attach scopes, controllers, bindings, and
  transclusion functions to cloned or existing DOM.
- Compile text interpolation, attribute interpolation, `ng-prop-*`,
  `ng-on-*`, `ng-window-*`, and `ng-observe-*` synthetic directives.
- Handle inline templates, `templateUrl`, template replacement, namespace-aware
  template parsing, and delayed linking.
- Manage compiler-only attribute metadata, element attribute observers, boolean
  attributes, normalized attribute names, and class mutations through animation
  helpers.

## Public Surface

- `NgModule.directive()` and `NgModule.component()`: public registration paths
  for directives and components.
- `NgModule.config({ $compile: ... })`: public path for strict binding mode and
  property security contexts.
- `CompileAttributeState`: compiler-only normalized attribute metadata used for
  interpolation writes and template bookkeeping. It is not passed to directive
  `compile` or link callbacks.
- `CompileFn`: public `$compile` entry point type.
- `LinkFn`: link function returned by `$compile`.
- `TranscludeFn`: public transclusion function shape passed to directive link
  functions.
- `BoundTranscludeFn` and `SlotTranscludeFn`: internal transclusion function
  shapes used by the compile/link runtime.
- `getDirectiveRequire()`: normalizes `require` declarations.
- `getDirectiveRestrict()`: validates and defaults directive restrictions.
- `detectNamespaceForChildElements()`, `wrapTemplate()`, `replaceWith()`,
  `buildStableNodeList()`, `buildInterpolationWatchExpression()`,
  `applyTextInterpolationValue()`, and `byPriority()`: exported helpers used by
  tests and compiler support code.

`CompileAttributeState` keeps the compiler's normalized attribute-name map and
template replacement metadata. Attribute observation is owned by element-based
helpers; directive authors should read static attributes from DOM helpers.

## Core Model

The compiler separates template planning from link execution. `$compile(...)`
turns a string, node, or node list into a stable template node list and returns
a `LinkFn`. That public link function clones nodes when needed, attaches
scope metadata, and runs a `TemplateLinkExecutor`.

The main flow is:

1. Convert the compile input into a stable node list.
2. Walk nodes and collect matching directives.
3. Sort directives and apply compile-time effects such as templates,
   transclusion, controllers, isolate-scope requirements, and interpolation
   directives.
4. Build node and child link executors.
5. At link time, create inherited or isolate scopes as needed.
6. Instantiate controllers, initialize bindings, run pre-link functions, link
   children, and run post-link functions.
7. Run deferred `$onChanges`, `$onInit`, `$postLink`, and destruction cleanup
   hooks through the controller and binding machinery.

Important invariants:

- Directive ordering must be deterministic: higher priority first, then name,
  then registration index.
- Terminal directives stop lower-priority compilation but still allow same
  priority directives.
- Only one isolate-scope directive and one incompatible transclusion/template
  owner may exist on a single element.
- Async `templateUrl` compilation must preserve queued link operations and
  resume in original order.
- Attribute and text interpolation must update through scope watches and route
  errors through `$exceptionHandler`.
- Destroyed scopes or controllers must not receive delayed binding or
  transclusion updates.

## Incremental Fragments

`incremental-fragment.ts` defines the private lifecycle boundary beneath the
public `$compile(...)` API. Every linked fragment records its owning app root,
parent scope, linked nodes, child fragments, optional child scopes, cleanup
callbacks, pending async work, and lifecycle diagnostics.

The contract is internal. Applications continue to use templates, directives,
components, routes, streams, workflows, and `$compile(...)`; no public fragment
handle is exposed.

Fragment ownership follows these rules:

- Existing nodes passed to `$compile(node)` are borrowed and remain in the DOM
  when their root is destroyed.
- Nodes created from markup or transclusion clones are owned and removed when
  their fragment is explicitly disposed by a view or DOM integration.
- Nested public links attach to the nearest owning parent fragment.
- Root destruction disposes every live fragment in reverse creation order while
  preserving the last rendered DOM snapshot.
- Fragment disposal recursively releases child fragments, async work,
  disposers, child scopes, node ownership, and retained references.
- Delayed templates, route loads, animation completions, view transitions, and
  realtime swaps must check lifecycle ownership before committing DOM work.
- Disposing a DOM fragment never destroys app-owned models, machines,
  workflows, or service runtimes.

The compiler keeps compact records on the common public-link path. Optional
child fragment, disposer, child scope, and async-work collections are allocated
only when used. Single-node links avoid iterable materialization.

## Lifecycle

Directive factories are queued by `NgModule.directive()` and registered with
the owning runtime's `CompileRegistry` when the module loads. The registry
instantiates definitions lazily when the compiler first matches their name.
Component definitions are converted into element directives with isolated
bindings, controller aliases, optional templates, and optional transclusion.

During compilation, each node may receive an internal normalized attribute state
object plus a directive list. Directive `compile` functions run once for the
template and receive only the template element and optional transclusion
function. Returned pre/post link functions are stored as `LinkFnRecord` entries.
During linking, the compiler creates scopes, binds controller instances,
resolves required controllers, initializes isolate or controller bindings, and
executes link functions in Angular-style order without passing an attributes
object.

For `templateUrl`, the element is emptied immediately, the template request is
started, and link operations are queued until the template arrives. The delayed
template state then recompiles replacement content and drains queued link
requests.

## Scheduling And Ordering

- Compile functions run synchronously while building the template plan.
- Public link functions run synchronously unless they hit a pending
  `templateUrl` plan.
- `$onChanges` hooks are queued and flushed with `queueMicrotask`.
- `templateUrl` linking resumes when `$templateRequest` or `fetch` resolves.
- Transclusion callbacks run when a directive calls `$transclude`.
- Text, attribute, and property interpolation update from scope watchers.
- Pre-link functions run parent-first; post-link functions run child-first and
  reverse priority order.

## Data Structures

- `directiveFactoryRegistry`: maps directive names to registered factories.
- `directiveDefinitionCache`: caches instantiated and normalized directive
  definitions.
- `normalizedDirectiveNameCache`: caches normalized directive names.
- `bindingCache`: caches parsed isolate/controller binding definitions.
- `TemplateLinkPlan`: node-list compile plan containing node link plans and a
  child link executor.
- `NodeLinkPlan`: per-node link plan with node executor, transclusion metadata,
  template flags, and scope flags.
- `LinkFnRecord`: stored pre/post link function plus `require`, directive name,
  isolate-scope flag, and contextual link state.
- `DelayedTemplateLinkState`: stores queued link operations for `templateUrl`.
- `CompiledFragmentRecord`: private root-owned record for linked node lifecycle,
  nested ownership, async cancellation, and deterministic disposal.
- `DirectiveBindingChangeState` and `OnChangesQueueState`: batch and deliver
  `$onChanges` records.
- `CompileAttributeState`: compiler-only state that records normalized names back
  to their DOM attribute names. Access should stay behind helper functions.

## Integration Points

- `$injector` and the internal provider registry: instantiate directive factories and publish
  `${name}Directive` providers.
- `$interpolate`: creates text and attribute interpolation functions.
- `$parse`: evaluates binding expressions, event expressions, property
  bindings, and parent-scope assignments.
- `$controller`: creates directive controller instances and supports
  controller injection locals.
- `$templateRequest` or `fetch`: loads async templates.
- `$exceptionHandler`: receives directive factory, link, observer, and lifecycle
  errors.
- Internal attribute helpers: normalized attribute observation, interpolation
  metadata, and observer scope ownership.
- Animation helpers: class mutations route through `$animate` when available.
- Security adapter and SCE contexts: sanitize trusted attribute and property
  bindings.
- Scope internals: attach scopes to DOM, create inherited/isolate/transcluded
  scopes, and watch binding expressions.

## Edge Cases

- Directive names may use `data-`, `ng-attr-`, dash, colon, and
  underscore forms; all are normalized before matching.
- `hasOwnProperty` is rejected as a directive or control-like name to avoid
  prototype pollution hazards.
- SVG and MathML templates require namespace-aware wrapping before parsing.
- Boolean attributes update both DOM attributes and element properties.
- Attribute observers fire immediately when a defined value already exists.
- Missing optional bindings resolve to `undefined`; missing required bindings
  throw only when strict component binding mode is enabled.
- `template` and `templateUrl` directives are mutually exclusive on the same
  element.
- Element transclusion replaces the original element with a comment-like anchor
  while preserving controller lookup data.

## Destruction And Cleanup

Link-time watches returned by binding initialization are stored and removed when
the owning scope is destroyed. Controller-bound transclusion state clears
controller maps, bound transclude references, element references, and child
scope references when released. DOM cache data for moved or cloned transclusion
content is removed so stale controllers and scopes are not retained.

Attribute observation is element-owned. Clone construction copies only recorded
attribute-name metadata; observer callbacks are registered against the linked
element and removed through their disposer functions.

Root destruction actively disposes all registered fragments. Structural
transclusion snapshots concrete clone nodes so multi-root and delayed nested
content are removed together. Router teardown invalidates unresolved view
loads. Realtime teardown cancels active animations, removes temporary anchors,
disposes uncommitted payloads, and rejects late view-transition callbacks.

## Types And Interfaces

`CompileFn`
: Public `$compile` service shape. Accepts markup or DOM nodes and returns a
`LinkFn`.

`LinkFn`
: Runtime link function that binds a compiled template to a scope.

`CompileRegistry`
: Internal runtime-owned directive/component registry and `$compile` service
factory. Applications use module declarations rather than this type directly.

`CompileAttributeState`
: Internal normalized attribute metadata for interpolation writes, DOM writes
owned by the compiler, class helper delegation, and template bookkeeping.

`InternalDirective`
: Normalized directive definition used by the compiler after factory
instantiation.

`TemplateLinkPlan`
: Compile-time plan for a node list.

`NodeLinkPlan`
: Compile-time plan for one node and its directive effects.

`BoundTranscludeFn`
: Internal transclusion function with parent scope and slot context already
bound.

`DirectiveBindingChangeState`
: Tracks pending `$onChanges` delivery for one controller or isolate scope
target.

`DelayedTemplateLinkState`
: Holds async template URL state and queued link requests until the template is
available.

## Testing Notes

- `compile.spec.ts` covers directive registration, matching, priority,
  terminal behavior, attributes, linking, scopes, bindings, controllers,
  templates, `templateUrl`, transclusion, and helper functions.
- Changes to directive ordering should test priority, name ordering,
  registration ordering, and terminal directives together.
- Changes to templates or transclusion should test async `templateUrl`, queued
  linking, controller lookup, and cleanup.
- Changes to `CompileAttributeState` should test normalized names, DOM writes,
  boolean attributes, class helper delegation, and template replacement merges.
- `incremental-fragment.spec.ts` covers ownership, borrowed nodes, nested
  fragments, deterministic root teardown, async cancellation, retention-aware
  scheduling, replacement, and late callback rejection.
- Incremental lifecycle changes must run structural directive, router view,
  realtime swap, and workflow UI suites together.
- `make benchmark-compile` and `make benchmark-link` update the committed
  compiler baselines, including multi-root, stream chunk, and workflow UI
  fragment cases.
