# Scope Internals

This directory owns AngularTS scope creation, scope inheritance, property
observation, scope events, and scope teardown. The implementation in
`scope.ts` is centered on JavaScript `Proxy` handlers: model objects remain raw
data, and scope behavior is layered around them through cached proxies.

## Responsibilities

- Create root, inherited, isolate, and transcluded scopes.
- Lazily proxy scopeable objects when they are read, without writing proxy
  helper state into user model objects.
- Track `$watch` listeners by the smallest known property keys extracted from
  parsed expressions.
- Schedule watcher callbacks asynchronously on the microtask queue.
- Propagate `$emit` and `$broadcast` events through the scope tree.
- Keep array, `Map`, `Set`, `Date`, and promise assignments observable without
  breaking their native method behavior.
- Tear down watchers, foreign listeners, child links, object listener indexes,
  and proxy references when scopes are destroyed.

## Public Surface

- `createScope(target?, context?)`: creates or reuses a scope proxy for a target
  object and `Scope` handler.
- `RootScopeProvider`: creates the root scope and injects `$parse` and
  `$exceptionHandler` into this module.
- `Scope`: the proxy handler class and public scope method implementation.
- `getArrayMutationMeta(value)`: exposes metadata about the most recent array
  mutation for directives that need efficient list updates.
- `isNonScope(target)`: tells whether a value should be excluded from scope
  proxying.

Public methods exposed through scope proxies include `$watch`, `$new`,
`$newIsolate`, `$transcluded`, `$merge`, `$on`, `$emit`, `$broadcast`,
`$destroy`, `$getById`, and `$searchByName`.

## Core Model

Every scope proxy has a `Scope` handler. The handler owns the reactive indexes
and exposes scope methods through `_propertyMap`. The raw model object is stored
as `$target`; the proxy currently being handled is stored as `$proxy`.

Nested values are proxied lazily in the `get` trap:

1. Read the raw property from the target.
2. Return public scope methods from `_propertyMap` when requested.
3. Return native collection wrappers for `Map`, `Set`, and `Date` methods.
4. Return array mutation wrappers for array mutator methods.
5. Return a cached proxy for scopeable nested objects.

Assignments go through the `set` trap:

1. Unwrap assigned proxies where the raw model should store raw values.
2. Destroy displaced child scopes when a scope-owned object is replaced.
3. Update object-owner indexes for watchers observing nested object mutation.
4. Schedule local, inherited, foreign, array-owner, and nested listeners.
5. Track array mutation metadata for repeat/list directives.
6. Resolve promise-like assignments back into the same property when settled.

## Scheduling Model

Watch notifications do not run synchronously from the proxy traps. They are
queued into the shared `ListenerSchedulerState` for the scope family and flushed
with `queueMicrotask`.

The scheduler stores `ScheduledTask` entries:

- `"listener"` tasks notify one or more watcher `Listener` records.
- `"callback"` tasks run internal callbacks, currently used for constant watch
  listeners.

The flush loop is FIFO and supports tasks appended while a flush is already
running. If new tasks remain after a flush, another microtask is scheduled.

Important timing invariants:

- Property writes should return before watcher callbacks run.
- A listener scheduled during a flush must not be dropped.
- A destroyed scope must not keep long-lived references to targets, parents, or
  children after deferred cleanup completes.
- Listener callbacks must route exceptions through `$exceptionHandler`.

## Watcher Indexes

The implementation avoids a digest-style full scan. `$watch` parses the
expression once, extracts candidate watch keys from the AST, and registers a
`Listener` under those keys.

Main indexes:

- `_watchers`: local listeners keyed by property name.
- `_watcherIndexes`: listener-id to array-position lookup for O(1) removal
  when the fast path is valid.
- `_watchersByHash`: local listeners further partitioned by original target
  hash when a hash key exists.
- `_foreignListeners`: listeners registered on another scope because the
  watched value is inherited or lives behind a foreign proxy.
- `_foreignListenerIndexes`: removal index for `_foreignListeners`.
- `_foreignListenersByHash`: target-hash partitioning for foreign listeners.
- `_objectListeners`: maps raw object/collection targets to owner keys whose
  watchers should fire when the object mutates internally.

Watch-key extraction intentionally uses broad keys for complex expressions.
For example, object and array literals can register several keys, while nested
member expressions may register the leaf property plus a parent-expression
filter to avoid firing on unrelated owners.

## Scope Hierarchy

`$new()` creates a child object that inherits from the current `$target`.
`$newIsolate()` creates a child that does not inherit watchable properties.
`$transcluded()` creates an inherited child with an explicit parent instance for
transclusion ownership.

Child scopes are tracked in:

- `_children`: ordered child proxy list used for event broadcast and search.
- `_childIndices`: proxy-to-index lookup for O(1) child removal.
- `_childTargets`: raw child target to proxy lookup used when assigned child
  scope values are displaced.

Foreign listener registration bridges inherited-property watches back to the
scope that owns the value. This is why a child `$watch("parentValue", ...)` can
react when the parent writes `parentValue`.

## Events

`$on(name, listener)` stores event listeners on the current scope only.
`$emit` walks upward through `$parent`; `$broadcast` walks downward through
`_children`.

The shared `ScopeEvent` object is created at the first scope that handles the
event and is reused through propagation. `currentScope` is set for each scope
while its listeners run, then reset to `null` before propagation continues.
`stopPropagation()` stops later propagation; `preventDefault()` only marks the
event.

Events are separate from `$watch` scheduling. Event listeners run synchronously
inside `$emit`/`$broadcast`, while watch listeners run from the microtask
scheduler.

## Arrays

Arrays are scopeable, but mutator methods need extra tracking because methods
like `push`, `splice`, `sort`, and `reverse` mutate without direct user-visible
property assignment.

Array support includes:

- `arrayMutationMethods`: mutator methods wrapped by the `get` trap.
- `arrayIdentityMethods`: lookup methods that unwrap proxied arguments.
- `ArrayMutationMeta`: describes splice/reorder/swap changes for list
  directives.
- `arrayMutationMeta`: stores mutation metadata keyed by raw array target.
- `arraySwapCandidates`: recognizes two direct index assignments that form a
  swap.

Array wrappers unwrap proxy arguments before applying the native method, destroy
removed child scope values when they are no longer present, update mutation
metadata, and schedule owner-key/length listeners.

## Native Collections

`Map`, `Set`, and `Date` are treated as native scoped targets. They are proxied
so reads can be watched, but methods are invoked with the raw target as `this`
to preserve native behavior.

Method wrapper responsibilities:

- `Map#set`, `delete`, `clear`, and upsert methods schedule value,
  membership, and `size` watchers when observable state changes.
- `Set#add`, `delete`, and `clear` schedule membership and `size` watchers.
- `Date` setter methods schedule watchers for all getter-like date value keys
  when the timestamp changes.
- Object-owner listeners are also scheduled so a watcher on the owning property
  can react to internal collection mutation.

## Promise Assignments

When a promise-like value is assigned to a scope property, the promise is stored
first and normal property listeners are scheduled for that assignment. When the
promise settles, `_applyPromiseSettlement` writes the settled value back through
the same `set` path only if the property still contains that same promise.

This prevents stale promise settlements from overwriting newer user writes.

## Destruction

`$destroy()` broadcasts `$destroy` when needed, deregisters owned local and
foreign watchers, removes the scope from the parent child list, clears listener
indexes, and marks the scope destroyed.

Final reference cleanup is deferred with `queueDestroyedScopeCleanup()` so
destroy listeners can still observe enough scope state during `$destroy`
delivery. `_cleanupDestroyedScope()` then clears child lists, target/proxy
references, parent/root references for non-root scopes, and reduces
`_propertyMap` to the small destroyed-scope surface.

## Types And Interfaces

`ListenerFn`
: Public watcher callback shape. It receives the resolved watched value and the
original target object used when the watcher was registered.

`NonScope`
: Marker value for objects or properties excluded from proxying. `true` marks
the whole object non-scope; a string array marks individual properties.

`NonScopeMarked`
: Structural type for raw objects/classes that may carry `$nonscope` metadata.
`isNonScope()` reads this shape before deciding whether to proxy.

`Listener`
: Internal watcher registration. It stores the original target, parsed watch
function, listener callback, listener id, owning scope id, registered keys,
and optional metadata for nested/member-expression rechecks.

`ForeignListenerRef`
: Back-reference stored on the scope that owns a watcher when that watcher is
registered on another scope handler. Used to deregister foreign listeners
during normal unwatch and `$destroy`.

`ForeignListenerHashIndex`
: Nested map from watched key to original-target hash to listener list. It lets
foreign listener delivery narrow repeat/hash-key watchers to the relevant
target.

`ListenerIndex`
: Map from watched key to listener id to listener array index. Used by local
and foreign deregistration fast paths.

`ListenerStats`
: Shared counters for listener categories that affect scheduling cost. Today it
tracks how many listeners may require nested object collection scans.

`WatcherRef`
: Owned local watcher reference. Stored so `$destroy()` can deregister all
watchers created by the scope.

`ListenerScheduleFilter`
: Optional filter applied right before a scheduled listener task is delivered.
Used when scheduling broad key listeners that must be narrowed by parent
expression or expected target.

`ScheduledListenerTask`
: A scheduler queue entry that delivers one listener list against a captured
target with an optional filter.

`ScheduledCallbackTask`
: A scheduler queue entry that invokes an internal callback.

`ScheduledTask`
: Union of listener and callback scheduler entries.

`ListenerSchedulerState`
: Shared microtask scheduler state for a scope family. It owns the task queue,
current flush index, queued/flushing flags, and stable flush callback.

`ArrayMutationMeta`
: Public internal metadata describing the most recent array mutation. It
records mutation kind, affected range, previous/current lengths, head/tail
deletion flags, and swap indices.

`ArraySwapCandidate`
: Internal temporary record used to detect two direct array index assignments
that together represent a swap.

`ScopeEvent`
: Event object passed to `$emit`/`$broadcast` listeners. It tracks target scope,
current scope, name, propagation/default flags, and control methods.

`ScopeProxied<T>`
: Helper type for values known to be scope proxies. It adds `$handler` and
`$target` to the target object shape.

`ScopeProxy`
: Alias for `ng.Scope`, used where the code is dealing with a proxy rather than
the handler.

`ScopeTarget`
: Raw proxied target shape. It is a record that may also include `$nonscope`
metadata.

`ScopeEventListener`
: Internal event listener callback shape for `$on`.

`ArrayMutationWrapper`
: Cached wrapper type for array mutator methods exposed through the proxy `get`
trap.

`ArrayMutationWrapperCache`
: Per-array cache of mutator wrappers keyed by method name.

`CollectionMethodWrapper`
: Cached wrapper type for native `Map`, `Set`, and `Date` methods.

`NonScopeConstructor`
: Constructor type used by `isNonScope()` for the built-in class exclusion
list.

`AssignedScopeValue`
: Normalized assignment payload. It contains the raw unwrapped value, the value
that should be stored on the target, and whether the assigned value was a
proxy.

## Important Helpers

- `getCachedScopeProxy()`: returns a stable proxy for a raw object and handler,
  or the original value when it is not scopeable.
- `unwrapScopeValue()`: converts a scope proxy back to its raw target.
- `getAssignedScopeValue()`: decides whether assignment should store the raw
  value or preserve a non-scope proxy identity.
- `getObjectListenerTarget()`: returns the raw object that can be used as an
  `_objectListeners` key.
- `collectWatchKeys()` and related AST helpers: extract watch keys from parsed
  expressions.
- `registerListenerKeys()` / `deregisterListenerKeys()`: bulk register or
  remove a listener across several keys.
- `_scheduleListener()` / `_flushScheduledTasks()`: enqueue and deliver watcher
  notifications.
- `_registerKey()` / `_deregisterKey()`: maintain local watcher indexes.
- `_registerForeignKey()` / `_deregisterForeignKey()`: maintain inherited or
  foreign proxy watcher indexes.
- `_destroyDisplacedValue()`: destroys child scopes when their owning value is
  removed or replaced.

## Invariants

- Raw model objects should not receive proxy helper fields.
- A scopeable object should get one cached proxy per `Scope` handler.
- Non-scope objects must never be proxied.
- Public scope members are exposed through `_propertyMap`, not by writing them
  onto user targets.
- Watch listeners are asynchronous and delivered through the shared scheduler.
- Scheduler flushes must preserve FIFO ordering and reschedule when new tasks
  remain.
- Watcher deregistration must update both the listener array and its index map.
- Hash indexes must stay consistent with their primary listener lists.
- Foreign listeners must be owned by the watcher scope so `$destroy()` can clean
  them up.
- Array mutation metadata must be cleared or replaced whenever an array mutation
  path runs.
- Native collection wrappers must invoke native methods against the raw target.
- Promise settlement must not overwrite a property that changed after the
  promise was assigned.
- Destroyed non-root scopes should release parent/root/target/proxy references
  after deferred cleanup.

## Test Matrix

Use focused tests first, then broaden to the full suite when behavior changes
cross subsystem boundaries.

- Scope proxying, inheritance, watchers, scheduling, destruction, arrays,
  native collections, promises, and events:
  `npx playwright test src/core/scope/scope.test.ts`
- Type-level coverage for scope changes:
  `./node_modules/.bin/tsc --project tsconfig.test.json`
- Compile/directive behavior that depends on scope watchers:
  `npx playwright test src/core/compile/compile.test.ts`
- Repeat/options/select behavior that depends on array mutation metadata and
  owner-key watchers:
  `npx playwright test src/directive/repeat/repeat.test.ts src/directive/options/options.test.ts src/directive/select/select.test.ts`
- Full browser validation:
  `npx playwright test`

Run `make lint` after documentation or source edits.
