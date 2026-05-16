# Model Directive Internals

This directory owns AngularTS `ngModel` control state, model/view pipelines,
validation, form integration, and model option handling. The implementation in
`model.ts` is centered on `NgModelController`, which coordinates model reads and
writes, DOM control state, parser/formatter pipelines, validators, CSS classes,
and parent form propagation.

## Responsibilities

- Bind an assignable `ng-model` expression to a DOM control controller.
- Convert view values to model values through `$parsers`, and model values to
  view values through `$formatters`.
- Run synchronous and asynchronous validators and maintain `$error`,
  `$pending`, `_validationStates`, `$valid`, and `$invalid`.
- Track pristine/dirty and touched/untouched control state and corresponding
  CSS classes.
- Integrate controls with parent forms, `ngModelOptions`, `ngChange`, and
  interpolated control names.
- Tear down watches, event listeners, form registration, and DOM references
  when the owning scope is destroyed.

## Public Surface

- `NgModelController`: controller class exposed to input, select, custom form
  controls, validators, and forms.
- `ngModelDirective()`: builds the `ngModel` attribute directive and wires the
  controller into compile/link lifecycle.
- `ngModelError`: error factory for `ngModel`-specific runtime errors.
- `NgModelOptions`: public option shape for update events, debounce,
  `allowInvalid`, getter/setter mode, and date/time behavior.
- `ModelValidators`, `AsyncModelValidators`, `ModelParser`, `ModelFormatter`,
  and `ModelViewChangeListener`: public pipeline and callback shapes.

Public controller methods include `$setViewValue`, `$commitViewValue`,
`$rollbackViewValue`, `$processModelValue`, `$validate`, `$setValidity`,
`$setPristine`, `$setDirty`, `$setUntouched`, `$setTouched`,
`$overrideModelOptions`, `$render`, and `$isEmpty`.

## Core Model

`NgModelController` owns both sides of the control binding. `$modelValue` is the
current model value visible to the scope expression, `_rawModelValue` is the
latest parsed value regardless of validity, `$viewValue` is the value owned by
the control, and `_lastCommittedViewValue` is the last view value that entered
the parser/validator pipeline.

The main view-to-model flow is:

1. A control calls `$setViewValue(value, trigger)`.
2. The controller stages `_pendingViewValue` and either debounces or commits it.
3. `$commitViewValue()` updates empty classes, marks the control dirty, and
   calls `_parseAndValidate()`.
4. Parsers transform the view value into `_rawModelValue`.
5. Validators update validity buckets and, when allowed, write `$modelValue`
   back to the scope expression.
6. `$viewChangeListeners`, including `ngChange`, run after a model write.

The main model-to-view flow is:

1. Scope watchers read the parsed `ng-model` expression.
2. `_setModelValue()` stores the external model value.
3. `$processModelValue()` runs `$formatters` in reverse order.
4. If the view value changed, `$render()` updates the control and validators
   run against the formatted value.

Important invariants:

- Non-assignable `ng-model` expressions are rejected unless getter/setter mode
  is active.
- Stale asynchronous validator results must not update current validity state.
- A destroyed controller must not mutate detached elements or parent forms.
- Validity propagation to parent forms is skipped when the combined state and
  parent validity version have not changed.

## Lifecycle

The directive compile step adds initial `ng-pristine`, `ng-untouched`, and
`ng-valid` classes and returns pre/post link hooks.

Pre-link attaches model options, initializes getter/setter behavior, registers
the control with its parent form, observes name changes, and watches the model
expression for external updates. Post-link installs configured `updateOn`
events, adds the blur listener that marks the control touched, and registers
the `ngChange` view-change listener when present.

On scope destruction the controller clears pending debounce timers, removes all
DOM event listeners, clears view-change listeners, deregisters model watchers,
removes itself from the parent form, drops the parent form back to
`nullFormCtrl`, and releases the element reference.

## Scheduling And Ordering

- `$setViewValue()` stages values and only commits immediately when
  `updateOnDefault` allows it.
- `_debounceViewValueCommit()` uses `setTimeout` for numeric debounce values
  and clears older pending timers before scheduling a new one.
- Custom `updateOn` DOM events call `_updateEventHandler()`, which commits the
  latest staged view value.
- Synchronous validators run before asynchronous validators.
- Async validators set their key to pending and only the latest validation run
  may apply results.
- Listener errors from `$viewChangeListeners` are routed through
  `$exceptionHandler`.

## Data Structures

- `$parsers`: ordered view-to-model conversion pipeline.
- `$formatters`: reverse-order model-to-view conversion pipeline.
- `$validators`: synchronous named validators.
- `$asyncValidators`: promise-returning named validators.
- `$error` and `$pending`: public transitional validity buckets keyed by
  validator name.
- `_validationStates`: internal map of explicit validator states.
- `_classCache`: tracks CSS class state to avoid redundant toggles.
- `_eventRemovers` and `_updateEventRemovers`: cleanup callbacks for control
  and model-option event listeners.
- `_lastValidityParentVersions`: per-validation-key cache used to avoid
  redundant parent form propagation.

## Integration Points

- `$parse`: compiles the `ng-model` expression, optional getter/setter calls,
  and `ngChange`.
- `$interpolate`: resolves interpolated control names.
- `$attributes`: reads normalized attributes such as `data-ng-model` and
  `data-name`.
- `ngModelOptions`: supplies inherited update, debounce, validation, and
  getter/setter settings.
- Parent form controllers: receive control registration, renames, dirty state,
  validity changes, and removal.
- Animation service: toggles control state classes when animations are enabled.

## Edge Cases

- Undefined external model values are ignored while the controller is still in
  its initial `NaN` sentinel state.
- Parser failures set the active parser validity key and skip normal validators
  until parsing succeeds again.
- `allowInvalid` writes parsed model values even while validators are failing.
- Getter/setter mode calls the model expression as a function when the parsed
  value is callable.
- `$rollbackViewValue()` cancels pending debounce work and restores the last
  committed view value.
- Name interpolation renames the control in its parent form without replacing
  the controller instance.

## Destruction And Cleanup

Destruction is scope-driven. The directive marks the controller destroyed,
clears pending debounce work, removes input and update-event listeners, clears
view-change listeners, deregisters model watches, removes the control from its
parent form, resets the parent to `nullFormCtrl`, deregisters the name observer,
and clears `_element` so later controller calls become guarded no-ops.

## Types And Interfaces

`NgModelOptions`
: Public options shape consumed by `ngModelOptions` and
`$overrideModelOptions()`.

`ModelValidators`
: Map of synchronous validator names to functions that receive model and view
values.

`AsyncModelValidators`
: Map of asynchronous validator names to promise-returning functions.

`ModelParser`
: Function shape for converting view values before validation and model writes.

`ModelFormatter`
: Function shape for converting model values before rendering.

`ModelViewChangeListener`
: Callback shape for listeners run after view-originated model writes.

## Testing Notes

- `model.spec.ts` covers controller initialization, validity transitions,
  control state classes, normalized attribute reads, parent form integration,
  parser/formatter behavior, model option events, debounce, and teardown.
- Changes to async validation should test stale promise handling and pending
  state transitions.
- Changes to form propagation should test both direct parent forms and nested
  validity parent version changes.
