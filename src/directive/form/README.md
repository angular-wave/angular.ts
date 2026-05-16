# Form Directive Internals

This directory owns AngularTS form and nested `ngForm` controller behavior:
control registration, aggregate validity, dirty/pristine state, submitted
state, form naming, submit interception, and form-level propagation. The
implementation in `form.ts` is centered on `FormController`, which aggregates
child `NgModelController` and nested `FormController` instances.

## Responsibilities

- Instantiate form controllers for native `<form>` elements and logical
  `ngForm` groups.
- Register, rename, list, and remove child controls.
- Aggregate child validity into `$error`, `$pending`, `_validControls`,
  `$valid`, and `$invalid`.
- Propagate dirty, pristine, submitted, commit, rollback, and validity state
  through parent/child form chains.
- Publish named forms and controls on the form controller and related scope.
- Toggle form state CSS classes with optional animation support.
- Prevent native submit for forms without `action`, commit pending model
  values, and mark forms submitted.

## Public Surface

- `FormController`: controller class used by `form` and `ngForm`.
- `formDirective`: directive factory for native `<form>` elements.
- `ngFormDirective`: directive factory for nested logical form groups.
- `nullFormCtrl`: no-op parent form used when a form or control has no parent.
- `cachedToggleClass()`: shared helper for cached validity class mutation.
- `ValidityCssHost`, `FormControlTarget`, `NamedControl`, and
  `ParentFormController`: shared type contracts used by form and model
  controllers.

Public controller methods include `$addControl`, `$getControls`,
`_renameControl`, `$removeControl`, `$setValidity`, `$setDirty`,
`$setPristine`, `$setUntouched`, `$setSubmitted`, `_setSubmitted`,
`$commitViewValue`, and `$rollbackViewValue`.

## Core Model

Each `FormController` owns an ordered `_controls` array and a set of validity
buckets. Child controls are either `NgModelController` instances or nested
`FormController` instances. A form can also have a parent form through
`_parentForm`, with `nullFormCtrl` ending the chain.

The main flow is:

1. The `form` or `ngForm` directive creates a `FormController`.
2. Pre-link registers the controller with the nearest parent form.
3. Named forms are published onto scope, and named child controls are published
   onto the form controller.
4. Child controls call `$setValidity()` as their validators change state.
5. The form updates local validity buckets, CSS classes, and aggregate boolean
   state.
6. The form propagates the combined validity state to its parent form.
7. Destruction removes the form from its parent, clears scope publication, and
   stops propagation through the destroyed controller.

Important invariants:

- Parent forms aggregate child form and model-control validity.
- Removing a control clears that control from `$pending`, `$error`, and
  `_validControls`, but does not reset form dirty or submitted state.
- `$getControls()` returns a shallow copy; callers must use registration APIs
  to mutate membership.
- Form submission commits pending child view values before marking submitted.
- Dynamic control names must update both the controller property and child
  `$name`.

## Lifecycle

`formDirective` applies only to native `<form>` elements. `ngFormDirective`
uses the same controller and compile path but can be used as an element or
attribute for nested logical groups.

During compile, the directive adds initial `ng-pristine` and `ng-valid`
classes. During pre-link, it optionally installs a submit listener, registers
with the parent form, resolves the scope setter for the form name, publishes
the controller, observes name changes, and registers destruction cleanup.

On `$destroy`, the directive removes the controller from its parent form,
unpublishes the form from scope, and extends the controller with `nullFormCtrl`
so later child destruction does not keep propagating through a destroyed form.

## Scheduling And Ordering

- Form registration and scope publication happen during pre-link.
- Submit handling runs synchronously on the native `submit` event.
- `$commitViewValue()` and `$rollbackViewValue()` iterate child controls in
  registration order.
- Validity updates propagate immediately from child to parent.
- CSS class changes run synchronously, but may delegate to `$animate` when
  animation support is present.
- Name interpolation is observed through `$attributes.observe()` and renames
  the form/controller when the observed value changes.

## Data Structures

- `_controls`: ordered child control and nested form list.
- `$error`: map from validation key to controls currently invalid for that key.
- `$pending`: map from validation key to controls with pending async
  validation for that key.
- `_validControls`: map from validation key to controls currently valid for
  that key.
- `_classCache`: cache that prevents redundant CSS class toggles.
- `_validityPropagationId`: version used by model controllers to detect parent
  validity-chain changes.
- `$target`: scope/proxy target object carrying `_parentForm` for parent
  registration.

## Integration Points

- `NgModelController`: registers with forms, propagates validity, dirty state,
  commit/rollback, and removal.
- Parent `FormController`: receives child registration, child validity, dirty
  state, submitted state, and removal.
- `$parse`: creates scope assignment functions for named forms.
- `$attributes`: reads and observes normalized `name` and `ngForm`
  attributes.
- `$interpolate`: resolves the initial form name.
- `$animate`: optionally applies form state classes.
- Native `<form>` submission: commits model values, marks submitted, and
  prevents default when there is no `action` attribute.

## Edge Cases

- `ngForm` can nest logical groups even though native nested `<form>` elements
  are invalid HTML.
- Forms with empty names still receive an assignable expression so they can be
  renamed later.
- Removing a child control clears validity buckets but leaves dirty and
  submitted state unchanged.
- Controls named `hasOwnProperty` are rejected to avoid prototype-pollution
  hazards.
- `$setSubmitted()` walks to the root form and marks the root and descendants
  submitted.
- `$setPristine()` clears submitted state on the form it is called on and
  propagates pristine state to child controls.

## Destruction And Cleanup

The directive listens for the element `$destroy` event. Cleanup removes the
form from the parent, clears scope publication, and replaces controller methods
with the no-op `nullFormCtrl` surface so later child destruction cannot mutate
ancestor forms through a destroyed controller.

`$removeControl()` also removes the child from `$pending`, `$error`, and
`_validControls`, removes it from `_controls`, and sets the child's parent form
back to `nullFormCtrl`.

## Types And Interfaces

`FormController`
: Aggregate controller for native forms and nested `ngForm` groups.

`ParentFormController`
: Shared parent-form contract consumed by forms and model controls.

`NamedControl`
: Minimal child-control shape with `$name` and `$target`.

`FormControlTarget`
: Target object that carries `_parentForm` for registration.

`ValidityCssHost`
: CSS-class mutation host shape shared by forms and model controls.

`nullFormCtrl`
: No-op parent form used as the terminal parent and destroyed-form fallback.

## Testing Notes

- `form.spec.ts` covers form registration, submit behavior, nested forms,
  submitted propagation, pristine/dirty state, validity aggregation, named form
  publication, renaming, removal, and CSS classes.
- Changes to validity propagation should test nested forms, removed controls,
  pending validators, and parent form version changes.
- Changes to submit handling should test `ngSubmit`, `ngClick` submit
  controls, action attributes, and pending `ngModelOptions` commits.
- Changes to this area should also consider the forward-looking notes in
  `modernization-plan.md`.
