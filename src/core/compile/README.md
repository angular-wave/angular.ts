# Compile Internals

This directory owns AngularTS template compilation, directive and component
registration, directive matching, linking, controller wiring, bindings,
template replacement, template URLs, interpolation directives, and
transclusion. The implementation in `compile.ts` is centered on a two-phase
pipeline: compile-time planning builds node/link executors, and link-time
execution binds those plans to a concrete scope and DOM node list.

## Responsibilities

- Register directives and components through `CompileProvider`.
- Normalize directive definitions into internal directive records.
- Match element and attribute directives by normalized names and restrictions.
- Sort and apply directives by priority, name, and registration index.
- Build public link functions that attach scopes, controllers, bindings, and
  transclusion functions to cloned or existing DOM.
- Compile text interpolation, attribute interpolation, `ng-prop-*`,
  `ng-on-*`, `ng-window-*`, and `ng-observe-*` synthetic directives.
- Handle inline templates, `templateUrl`, template replacement, namespace-aware
  template parsing, and delayed linking.
- Manage `Attributes` objects, `$observe` callbacks, class updates, boolean
  attributes, and normalized attribute names.

## Public Surface

- `CompileProvider`: provider behind `$compileProvider`; registers directives,
  components, strict binding mode, and property security contexts.
- `Attributes`: link-time attribute wrapper passed as `$attrs`.
- `DirectiveSuffix`: suffix used for directive factory providers.
- `CompileFn`: public `$compile` entry point type.
- `PublicLinkFn`: link function returned by `$compile`.
- `TranscludeFn`, `BoundTranscludeFn`, and `SlotTranscludeFn`: public and
  internal transclusion function shapes.
- `getDirectiveRequire()`: normalizes `require` declarations.
- `getDirectiveRestrict()`: validates and defaults directive restrictions.
- `detectNamespaceForChildElements()`, `wrapTemplate()`, `replaceWith()`,
  `buildStableNodeList()`, `buildInterpolationWatchExpression()`,
  `applyTextInterpolationValue()`, and `byPriority()`: exported helpers used by
  tests and compiler support code.

Public methods exposed through `Attributes` include `$normalize`, `$addClass`,
`$removeClass`, `$updateClass`, and `$observe`. Attribute writes are routed
through the element-based `$attributes.set(...)` service; compile internals use
the private `Attributes._setValue(...)` bridge while the remaining `$attrs`
surface is reduced.

## Core Model

The compiler separates template planning from link execution. `$compile(...)`
turns a string, node, or node list into a stable template node list and returns
a `PublicLinkFn`. That public link function clones nodes when needed, attaches
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

## Lifecycle

Directive factories are registered on `CompileProvider.directive()` and are
instantiated lazily through `${name}Directive` providers. Component definitions
are converted into element directives with isolated bindings, controller
aliases, optional templates, and optional transclusion.

During compilation, each node receives an `Attributes` object and a directive
list. Directive `compile` functions run once for the template. Returned
pre/post link functions are stored as `LinkFnRecord` entries. During linking,
the compiler creates scopes, binds controller instances, resolves required
controllers, initializes isolate or controller bindings, and executes link
functions in Angular-style order.

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
- `DirectiveBindingChangeState` and `OnChangesQueueState`: batch and deliver
  `$onChanges` records.
- `Attributes.$attr`: maps normalized attribute names back to DOM attribute
  names.
- `Attributes._observers`: stores `$observe` listeners by normalized attribute
  key.

## Integration Points

- `$injector` and `$provide`: instantiate directive factories and publish
  `${name}Directive` providers.
- `$interpolate`: creates text and attribute interpolation functions.
- `$parse`: evaluates binding expressions, event expressions, property
  bindings, and parent-scope assignments.
- `$controller`: creates directive controller instances and supports
  controller injection locals.
- `$templateRequest` or `fetch`: loads async templates.
- `$exceptionHandler`: receives directive factory, link, observer, and lifecycle
  errors.
- `AttributesService`: normalized attribute reads/writes and class mutation
  when available.
- Security adapter and SCE contexts: sanitize trusted attribute and property
  bindings.
- Scope internals: attach scopes to DOM, create inherited/isolate/transcluded
  scopes, and watch binding expressions.

## Edge Cases

- Directive names may use `data-`, `x-`, `ng-attr-`, dash, colon, and
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

`Attributes` clone construction intentionally skips observer lists. Each
link-time attribute instance owns its own `$observe` registrations, and
deregister functions remove observer callbacks from that instance.

## Types And Interfaces

`CompileFn`
: Public `$compile` service shape. Accepts markup or DOM nodes and returns a
`PublicLinkFn`.

`PublicLinkFn`
: Runtime link function that binds a compiled template to a scope.

`CompileProvider`
: Provider that owns directive/component registration and creates the `$compile`
service.

`Attributes`
: `$attrs` implementation for normalized attributes, DOM writes, class updates,
and observers.

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
- Changes to `Attributes` should test normalized names, DOM writes, boolean
  attributes, class updates, and observer deregistration.
