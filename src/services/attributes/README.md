# Internal Attribute Helpers

This directory owns normalized attribute observation, programmatic attribute
writes, and compiler metadata for interpolated attributes. It is not an
injectable service surface; framework code works directly with elements through
the helper functions in `attributes.ts` and static DOM helpers in
`src/shared/dom.ts`.

## Responsibilities

- Register and deregister normalized attribute observer callbacks.
- Deliver initial, native mutation, and programmatic write notifications.
- Suppress duplicate callback delivery for writes made through
  `setInternalAttribute()`.
- Attach observer lifetime to the owning scope when one is provided.
- Coordinate internal attribute writes, including boolean attributes and aliased
  `ng-*` attributes.
- Track metadata for interpolated attributes and observer scopes.

## Internal Surface

- `observeInternalAttribute()`: observes one normalized attribute on an element.
- `setInternalAttribute()`: writes an attribute and notifies observers.
- `markInternalAttributeInterpolated()` and
  `isInternalAttributeInterpolated()`: track interpolation-owned attributes.
- `setInternalAttributeObserverScope()` and
  `getInternalAttributeObserverScope()`: associate interpolation observers with
  the scope that should own the watcher.

## Core Model

Each observed element gets an `AttributeObserverState` stored in a weak map.
That state owns one `MutationObserver`, callback sets keyed by normalized
attribute name, and pending programmatic write values. Weak maps keep
per-element observer state out of injectable objects and allow DOM nodes to be
collected after observers are removed.

Every helper first resolves the real host element with
`getDirectiveHostElement()`, which lets transclusion anchor comments behave like
the element they represent.

Important invariants:

- Observer callbacks are registered by normalized attribute name, regardless of
  whether the DOM uses `ng-*`, `data-ng-*`, or another normalized spelling.
- Programmatic writes notify observers once even though the browser also emits a
  mutation record.
- Observer state disappears when the last callback is removed.
- Attribute values are always read from the DOM; no attributes object caches
  normalized values.
- Transclusion anchors read and write through their directive host element.

## Integration Points

- Compile: marks interpolation-owned attributes, writes interpolation results,
  and attaches observer scope metadata.
- Directives: use shared DOM helpers for normalized reads and writes; observer
  flows use `observeInternalAttribute()` directly.
- DOM helpers: `getNormalizedAttr()`, `getNormalizedAttrName()`,
  `hasNormalizedAttr()`, `getBooleanAttrName()`, and
  `getDirectiveHostElement()` preserve AngularTS normalization rules.
- Browser APIs: `MutationObserver`, boolean DOM properties, and
  `setAttributeNode()` are wrapped to provide consistent directive behavior.

## Testing Notes

- `attributes.spec.ts` covers normalized reads, custom data attributes,
  transclusion anchors, observation, deregistration, scope destruction, aliased
  attributes, synchronous `setInternalAttribute()` notifications, original-name
  lookup, and missing attributes.
- Changes to observer ordering should test both `setInternalAttribute()` and
  native `element.setAttribute()` paths to protect duplicate-notification
  behavior.
- Changes to normalization or alias handling should include `data-*`, `ng-*`,
  boolean attributes, and transclusion anchor cases.
