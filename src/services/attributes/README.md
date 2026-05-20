# Attributes Service Internals

This directory owns attribute mutation-observer registration and callback
delivery for directives. The implementation in `attributes.ts` is centered on
an injectable `$attributes` facade that registers normalized attribute
observers against live DOM elements, reports current values, and keeps
programmatic writes ordered with native `MutationObserver` delivery. Reads,
writes, and class helpers exist to support that observer model while preserving
AngularJS-style normalized attribute names.

## Responsibilities

- Register and deregister normalized attribute observer callbacks.
- Deliver initial, native mutation, and programmatic write notifications.
- Suppress duplicate callback delivery for writes made through
  `$attributes.set()`.
- Notify observers synchronously for `$attributes.set()` without duplicating the
  later mutation record.
- Attach observer lifetime to the owning scope when one is provided.
- Read, test, and report original DOM names for normalized attributes.
- Set attributes, including boolean attributes and aliased `ng-*` attributes.
- Add, remove, and update CSS classes through animation hooks when available.
- Track internal metadata for interpolated attributes and observer scopes.

## Public Surface

- `AttributesService`: injectable service used by compile, directives,
  validators, router directives, and form controls.
- `AttributesServiceProvider`: provider registered as `$attributes`.
- `AttributeSetValue`: accepted attribute write value shape.
- `AttributesSetOptions`: controls low-level writes through `writeAttr` and
  `attrName`.

Public service methods include `read`, `has`, `originalName`, `observe`, `set`,
`addClass`, `removeClass`, `updateClass`, `_markInterpolated`,
`_isInterpolated`, `_setObserverScope`, and `_getObserverScope`.

## Core Model

The service is stateless from the caller's point of view, but each observed
element gets an `AttributeObserverState` stored in `observerStates`. That state
owns one `MutationObserver`, callback sets keyed by normalized attribute name,
and pending values written by `$attributes.set()`. Weak maps keep this
per-element observer state out of the service object and allow DOM nodes to be
collected after observers are removed.

Every public operation first resolves the real host element with
`getDirectiveHostElement()`, which lets transclusion anchor comments behave like
the element they represent.

The main observer registration flow is:

1. Resolve the supplied `Element`, `Node`, transclusion anchor, or nullish value
   to an `Element`.
2. Normalize the requested attribute name with `directiveNormalize()`.
3. Create or reuse the element's `MutationObserver` state.
4. Register the callback under the normalized name.
5. Invoke the callback immediately when the attribute already has a value.
6. Register scope-driven deregistration when a scope is provided.

The main attribute read flow is:

1. Resolve the supplied `Element`, `Node`, transclusion anchor, or nullish value
   to an `Element`.
2. Normalize the requested name where needed with `directiveNormalize()`.
3. Read from the DOM with helpers such as `getNormalizedAttr()`,
   `hasNormalizedAttr()`, or `getNormalizedAttrName()`.
4. Return `undefined` or `false` for missing or non-element inputs.

The main write flow is:

1. Resolve the target host element and normalize the requested name.
2. Map aliased `ng-*` attributes to their runtime target when needed.
3. Detect boolean attributes and update the matching DOM property.
4. Record the pending observer value before mutating the DOM.
5. Write, remove, toggle, or specially construct the DOM attribute.
6. Notify registered observer callbacks for the normalized observer name.

Important invariants:

- Observer callbacks are registered by normalized attribute name, regardless of
  whether the DOM uses `ng-*`, `data-ng-*`, or another normalized spelling.
- Programmatic writes notify observers once even though the browser also emits a
  mutation record.
- Observer state must disappear when the last callback is removed.
- `$attributes` must not accumulate normalized attribute values as own
  properties; values are always read from the DOM.
- Transclusion anchors must read and write through their directive host element.

## Lifecycle

`AttributesServiceProvider.$get` creates one service instance per injector. The
service creates `MutationObserver` instances lazily when `observe()` is first
called for an element.

`observe(scope, element, normalizedName, callback)` registers the callback under
the normalized attribute name. If the attribute already exists, the callback is
invoked immediately with that initial value. When a scope is supplied, the
observer is automatically deregistered on `$destroy`.

The deregistration function removes the callback, removes the attribute bucket
when empty, disconnects the element's `MutationObserver` when no callbacks
remain, deletes the weak-map entry, and unregisters the `$destroy` listener.

## Scheduling And Ordering

- `read`, `has`, `originalName`, `set`, and class operations are synchronous.
- Native DOM attribute changes are delivered by `MutationObserver` in the
  browser's mutation-observer turn.
- `$attributes.set()` notifies observers synchronously after applying the write.
- Pending mutation values suppress duplicate callbacks when the matching native
  mutation record arrives later.
- Observer callback exceptions are reported through `$exceptionHandler`.

## Data Structures

- `observerStates`: `WeakMap<Element, AttributeObserverState>` storing each
  element's observer, callback sets, and pending programmatic write values.
- `AttributeObserverState.callbacks`: maps normalized attribute names to
  registered callback sets.
- `AttributeObserverState.pendingMutations`: queues values written through
  `$attributes.set()` so matching mutation records can be consumed.
- `interpolatedAttributes`: tracks normalized attributes marked as
  interpolation-owned by compile.
- `observerScopes`: records the scope that should own observer work for a
  normalized attribute on an element.

## Integration Points

- Compile: uses `$attributes` with `$attrs` to read normalized template
  attributes, observe interpolation results, and attach observer scope metadata.
- Directives: use normalized reads and writes for behavior flags such as
  `ngModel`, `ngIf`, validators, ARIA state, transclusion, and router state.
- `$animate`: class operations call animation hooks when animation is available
  for the target node.
- DOM helpers: `getNormalizedAttr()`, `getNormalizedAttrName()`,
  `hasNormalizedAttr()`, `getBooleanAttrName()`, and
  `getDirectiveHostElement()` preserve AngularTS normalization rules.
- Browser APIs: `MutationObserver`, `classList`, boolean DOM properties, and
  `setAttributeNode()` are wrapped to provide consistent directive behavior.

## Edge Cases

- Nullish values passed to `set()` remove the DOM attribute.
- Boolean attributes update the DOM property and toggle/remove the attribute
  according to the boolean value.
- Aliased attributes such as `ngMin` notify observers of the target normalized
  name, such as `min`.
- Attribute names that cannot be written through simple `setAttribute()` are
  created with a temporary holder element and `setAttributeNode()`.
- Empty class strings and missing elements are no-ops.
- Duplicate class tokens are collapsed when calculating class differences.
- Observer callbacks can remove themselves while notification is in progress.

## Destruction And Cleanup

Cleanup is observer-driven and scope-assisted. Explicit deregistration removes
the callback and disconnects the `MutationObserver` when the element has no more
observed attributes. Scope destruction calls that same deregistration path. The
weak maps keep per-element metadata out of the service object and allow DOM
state to be released after observers are disconnected and element references are
dropped elsewhere.

## Types And Interfaces

`AttributesService`
: Public service contract for normalized reads, writes, observation, class
updates, interpolation metadata, and observer-scope metadata.

`AttributesServiceProvider`
: Provider that creates the `$attributes` service and wires `$injector`,
`$exceptionHandler`, and lazy animation access.

`AttributeSetValue`
: Values accepted by `set()`. Strings write attribute values, booleans support
boolean DOM attributes, and nullish values remove attributes.

`AttributesSetOptions`
: Optional write controls. `writeAttr: false` updates observers without writing
the DOM attribute, and `attrName` forces the concrete DOM attribute name.

`AttributeObserverState`
: Internal per-element observer record containing the `MutationObserver`,
normalized callback sets, and pending programmatic mutation queues.

## Testing Notes

- `attributes.spec.ts` covers normalized reads, custom data attributes,
  transclusion anchors, observation, deregistration, scope destruction, aliased
  attributes, synchronous `set()` notifications, class updates, exception
  routing, original-name lookup, and missing attributes.
- Changes to observer ordering should test both `$attributes.set()` and native
  `element.setAttribute()` paths to protect duplicate-notification behavior.
- Changes to normalization or alias handling should include `data-*`, `ng-*`,
  boolean attributes, and transclusion anchor cases.
