# Form Controller Modernization Plan

This plan describes how to move `FormController` toward a modern,
native-friendly form architecture while keeping only the framework form
features that native `HTMLFormElement` does not provide.

## Goals

- Keep AngularTS form state explicit and testable.
- Use native form APIs where they fit: submit, reset, `FormData`,
  `checkValidity()`, and `reportValidity()`.
- Preserve useful framework behavior: logical control groups, async pending
  state, dirty/pristine state, submitted state, and aggregate commit/rollback.
- Remove AngularJS-compatible legacy behavior instead of preserving it through
  shims.

## Non-Goals

- Do not reduce `FormController` to a thin `HTMLFormElement` wrapper.
- Do not remove `NgModelController` value pipelines as part of the form
  refactor.
- Do not require all controls to be native form-associated elements.
- Do not preserve backwards compatibility with AngularJS-style form APIs.
- Do not model nested logical groups as nested native `<form>` elements.

## Legacy Surface To Remove

### Dynamic Controller Properties

Current behavior publishes named controls directly on the form controller, for
example `form.email`.

Modern direction:

- Store controls internally in `Map<string, ControlController>`.
- Expose explicit APIs such as `getControl(name)`, `hasControl(name)`, and
  `getControls()`.
- Remove dynamic control properties from the controller surface.

### Scope Publication By Name

Current behavior assigns named forms onto scope objects, for example
`scope.myForm = controller`.

Modern direction:

- Prefer explicit controller references, dependency injection, or directive
  bindings.
- Remove implicit scope mutation from form setup.
- Make form exposure explicit at the directive or application boundary.

### Controller-Owned CSS Class Mutation

Current behavior lets `FormController` directly add and remove classes such as
`ng-valid`, `ng-invalid`, `ng-pristine`, `ng-dirty`, and `ng-submitted`.

Modern direction:

- Move state-to-DOM class rendering into a form state renderer.
- Keep controller state independent from how it is displayed.
- Reuse the renderer for both form and model controls.

### Object-Hash Validity Buckets

Current behavior stores invalid and pending validity as object hashes such as
`$error` and `$pending`; earlier valid-state tracking used `_success`.

Modern direction:

- Store internal validity in `Map<string, Set<ControlController>>`.
- Replace `$error`, `$pending`, and valid-state buckets with explicit
  map/set-backed validity state.
- Centralize bucket updates so forms and model controls do not duplicate
  validity transition logic.

### Boolean/Null/Undefined Validity Protocol

Current behavior represents validity transitions with
`true | false | undefined | null`.

Modern direction:

- Use explicit internal states: `"valid"`, `"invalid"`, `"pending"`, and
  `"skipped"`.
- Replace `$setValidity(key, state)` with an explicit validity-state API.
- Avoid overloading `undefined` and `null` with behavioral meaning.

### Prevent-Submit-By-Default

Current behavior prevents native form submission unless an `action` attribute is
present.

Modern direction:

- Make native submit preservation the default for native-first forms.
- Prevent default only when `ng-submit`, `ng-click` on submit controls, or
  model commit behavior explicitly requires client-side handling.
- Remove the current prevent-submit default.

## Native Forms And Logical Groups

Nested validation is still a useful feature, but it should be modeled as
logical control groups rather than nested forms. Native nested `<form>` elements
are invalid HTML and should not be part of the modern form model.

Modern direction:

- `FormController` should represent a real native `<form>` host.
- `ControlGroup` or `FieldGroup` should represent a nested logical validation
  group.
- Parent validity should aggregate child control and child group validity.
- Nested logical groups should not own native submit behavior.
- Errors should be addressable by explicit group/control lookup or path-based
  APIs instead of dynamic properties.

## Proposed Abstractions

### `ControlController`

Shared base contract for forms, nested groups, and value controls.

```ts
type ValidationKey = string;
type ValidationState = "valid" | "invalid" | "pending" | "skipped";
type ControlState = "valid" | "invalid" | "pending";
type InteractionState = "pristine" | "dirty";
type TouchState = "untouched" | "touched";
type LifecycleState = "mounted" | "destroyed";
type ControlPath = string | readonly string[];

type ValidationResult =
  | { state: "valid" }
  | { state: "invalid"; message?: string; data?: unknown }
  | { state: "pending"; promise?: Promise<unknown> }
  | { state: "skipped"; reason?: string };

interface ControlValiditySnapshot {
  state: ControlState;
  invalid: ReadonlySet<ValidationKey>;
  pending: ReadonlySet<ValidationKey>;
  skipped: ReadonlySet<ValidationKey>;
}

interface ControlController {
  readonly name: string;
  readonly state: ControlState;
  readonly interactionState: InteractionState;
  readonly touchState: TouchState;
  readonly lifecycleState: LifecycleState;
  readonly disabled: boolean;
  readonly validity: ControlValiditySnapshot;
  readonly parent: ControlContainer | null;
  readonly element: Element | null;

  setValidationResult(key: ValidationKey, result: ValidationResult): void;
  setDirty(): void;
  setPristine(): void;
  setTouched(): void;
  setUntouched(): void;
  setDisabled(disabled: boolean): void;
  destroy(): void;
}
```

### `ControlContainer`

Shared contract for `FormController` and nested logical groups such as
`ControlGroup` or `FieldGroup`.

```ts
interface AggregateValiditySnapshot extends ControlValiditySnapshot {
  invalidControls: ReadonlyMap<ValidationKey, ReadonlySet<ControlController>>;
  pendingControls: ReadonlyMap<ValidationKey, ReadonlySet<ControlController>>;
}

interface ControlContainer extends ControlController {
  readonly aggregateValidity: AggregateValiditySnapshot;

  addControl(control: ControlController): void;
  removeControl(control: ControlController): void;
  renameControl(control: ControlController, nextName: string): void;
  getControl(path: ControlPath): ControlController | undefined;
  getControls(): ReadonlyArray<ControlController>;
  getError(path: ControlPath, key?: ValidationKey): unknown;
}
```

### `ValueControl`

Shared contract for `NgModelController` and custom controls.

```ts
interface ValueControl extends ControlController {
  readonly viewValue: unknown;
  readonly modelValue: unknown;

  setViewValue(value: unknown, trigger?: string): void;
  commitViewValue(): void;
  rollbackViewValue(): void;
  validate(): void;
}
```

### `NativeFormAdapter`

Optional adapter for real `HTMLFormElement` behavior.

```ts
interface NativeFormAdapter {
  readonly form: HTMLFormElement;

  checkValidity(): boolean;
  reportValidity(): boolean;
  reset(): void;
  toFormData(): FormData;
}
```

The adapter should not own AngularTS validity state. It should only expose
native browser behavior to the logical form controller.

### `ControlStateRenderer`

Optional renderer that projects controller state onto DOM classes, attributes,
and accessibility links.

```ts
interface ControlSnapshot {
  state: ControlState;
  interactionState: InteractionState;
  touchState: TouchState;
  disabled: boolean;
  validity: ControlValiditySnapshot;
}

interface ControlStateRenderer {
  render(control: ControlController, previous?: ControlSnapshot): void;
  destroy(control: ControlController): void;
}
```

Controllers should own state transitions. Renderers should own DOM projection.

## State Domains

The modern controller should keep separate state domains instead of folding
everything into validity booleans.

- Validation state: `valid`, `invalid`, `pending`, and skipped validator keys.
- Interaction state: `pristine` and `dirty`.
- Touch state: `untouched` and `touched`.
- Lifecycle state: `mounted` and `destroyed`.
- Availability state: enabled or disabled.
- Submission state: submitted, only meaningful for native form roots and
  logical submit owners.

Separating these domains keeps validation changes from implicitly changing
interaction or lifecycle state.

## Disabled Controls

Disabled semantics should follow native form behavior where possible.

- Disabled controls should not participate in aggregate validity.
- Disabled controls should not contribute values to `FormData`.
- Disabling a control should clear or suspend its active validation errors from
  parent aggregates.
- Re-enabling a control should re-run validation before contributing to parent
  state.
- Disabled controls may retain their own last-known interaction state, but they
  should not become dirty or touched while disabled.
- Disabling a group should disable its descendants for aggregate validation and
  submission purposes.

## Validation Results

Validation should move from state-only mutation to the structured
`ValidationResult` type defined in the proposed abstractions.

The optional `message` and `data` fields allow validators to carry error
messages, native validity metadata, server responses, and interpolation data
without overloading the validity bucket shape.

## Native Constraint Validation Bridge

Native `ValidityState` should be a bridge into AngularTS validation state, not
the source of truth for the full form tree.

Suggested mapping:

- `valueMissing` -> `required`
- `typeMismatch` -> input-specific keys such as `email` or `url`
- `rangeUnderflow` -> `min`
- `rangeOverflow` -> `max`
- `stepMismatch` -> `step`
- `tooShort` -> `minlength`
- `tooLong` -> `maxlength`
- `patternMismatch` -> `pattern`
- `badInput` -> input-specific parser keys such as `number`, `date`, or
  `parse`
- `customError` -> `native`

Open decision:

- Decide whether AngularTS only reads native validity state, or whether it also
  writes `setCustomValidity()` for framework validation errors.
- If AngularTS writes `setCustomValidity()`, define ownership rules so native
  messages do not conflict with custom validator messages.

## Submission Pipeline

Native-first form submission still needs an explicit framework pipeline.

1. Commit pending view values.
2. Run synchronous validators.
3. Start or await async validators according to the submit policy.
4. Stop submission if the form is invalid or pending and policy requires
   blocking.
5. Create `FormData` from the native form adapter when available.
6. Invoke framework submit handlers.
7. Allow native submission or prevent default according to explicit directive
   configuration.

Submit policy should be explicit. At minimum, decide whether pending async
validators block submit, cancel submit, or allow submit with pending state.

## Path-Based Lookup

Nested logical groups need explicit path APIs.

Paths should support nested group traversal without dynamic object properties.
String paths can use dot/bracket syntax if the parser is well-defined; array
paths avoid escaping issues and should be the internal representation.

## Async Validation Cancellation

Async validators must not let stale results mutate current state.

Modern direction:

- Use a monotonic validation run id, `AbortSignal`, or both.
- Ignore async results that do not belong to the current validation run.
- Abort validators when a control is destroyed, disabled, or receives a newer
  value.
- Clear pending state when an async validator is superseded.
- Keep cancellation behavior consistent for value controls and aggregate
  groups.

## Staged Refactor

### Stage 1: Extract Shared Validity State

- Introduce an internal validity-state helper backed by maps and sets.
- Use the helper from both `FormController` and `NgModelController`.
- Replace boolean/null/undefined validity state transitions with explicit
  validity state names.
- Replace public `$error`, `$pending`, and internal valid-state maps with
  explicit validity accessors.
- Introduce structured `ValidationResult` handling.

### Stage 2: Extract State Rendering

- Move class toggling into a renderer shared by form and model controls.
- Keep existing AngularTS class names.
- Make renderer calls explicit from state transitions.
- Define renderer responsibilities for CSS classes, ARIA attributes, and
  teardown.

### Stage 3: Introduce Explicit Control Containers

- Add internal `ControlContainer` APIs around registration, removal, lookup,
  and rename.
- Replace `$addControl`, `$removeControl`, `_renameControl`, and `$getControls`
  with the new container APIs.
- Remove dynamic form properties.
- Add path-based lookup for nested logical groups.

### Stage 4: Add Native Form Adapter

- Add optional `NativeFormAdapter` for real `<form>` elements.
- Route submit/reset/FormData/checkValidity/reportValidity through the adapter
  where useful.
- Replace `ngForm` semantics with `ControlGroup` / `FieldGroup` logical
  containers that do not have native submit behavior.
- Add native `ValidityState` mapping into structured validation results.
- Define disabled-control behavior for validation aggregation and `FormData`.

### Stage 5: Define Submission And Async Policies

- Define the submit pipeline and pending-async-validator policy.
- Add cancellation for stale async validators using run ids or `AbortSignal`.
- Ensure destroyed, disabled, and superseded controls cannot apply stale async
  validation results.

### Stage 6: Remove Legacy Boundaries

- Remove AngularJS-style scope publication.
- Remove dynamic controller property access.
- Document the new explicit form/control lookup APIs.

## Testing Strategy

- Update existing `form.spec.ts`, `model.spec.ts`, and `input.spec.ts`
  behavior where it asserts removed legacy APIs.
- Add focused tests for map/set-backed validity state.
- Add tests for explicit control lookup and renamed controls.
- Add native form adapter tests for submit prevention, reset behavior,
  `FormData`, `checkValidity()`, and `reportValidity()`.
- Add logical group tests to ensure nested groups aggregate validity without
  requiring nested native form elements.
- Add disabled-control tests for validation aggregation, interaction state, and
  `FormData`.
- Add native `ValidityState` mapping tests.
- Add submit pipeline tests for sync invalid, async pending, async invalid, and
  native-submit-allowed paths.
- Add stale async validator tests for newer values, disabled controls, and
  destroyed controls.
