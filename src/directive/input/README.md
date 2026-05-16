# Input Directive Internals

This directory owns modern AngularTS input and textarea integration for
`ngModel`-backed controls. The runtime is built around native
`HTMLInputElement` value APIs and the browser Constraint Validation API.

AngularJS-era compatibility behavior has been removed. The input directive no
longer emulates parsing, validation, trimming, dynamic value aliases, or legacy
cross-browser event fallbacks.

## Responsibilities

- Connect native input and textarea elements to an existing `NgModelController`.
- Read and write view values through native DOM properties such as `value`,
  `checked`, and `files`.
- Expose native `ValidityState` and `validationMessage` without copying native
  failures into `$error`.
- Route composed custom validator messages through one native
  `customError` channel via `setCustomValidity()`.
- Preserve AngularTS model behavior that native controls do not provide:
  model updates, parser/formatter extension points, async validators,
  dirty/pristine state, touched/untouched state, and lifecycle cleanup.
- Keep model values aligned with the browser's native control values.

## Public Surface

- `inputDirective()`: builds the core input/textarea directive and
  connects native values and validity to `ngModel`.

## Native Value Contract

Input values are described by native value source rather than by framework
conversion type:

```ts
interface NativeInputValueByKind {
  value: string;
  checked: boolean;
  files: FileList | null;
  none: undefined;
}
```

`InputValueKind` is the key of that map: `value`, `checked`, `files`, or
`none`. `NativeInputValue` is the union of those mapped values. These are
internal implementation concepts, not public adapter APIs; library authors can
work directly with `HTMLInputElement.value`, `checked`, `files`, and
`validity`.

Model writes intentionally accept unknown runtime values because
`NgModelController.$viewValue` can be produced by application formatters. The
directive stringifies only when it writes to the browser `value` property.

## Core Model

The directive configures an existing `NgModelController`; it does not own model
state. At link time it creates:

- internal value-source selection for reads, writes, emptiness, and update
  event selection;
- live browser validity accessors on the `NgModelController`;
- binding functions that connect DOM events to `$setViewValue()` and model
  renders back to the element.

Default value behavior:

- `checkbox`: `checked` kind, boolean value, update on `change`.
- `radio`: `value` kind, string value, checked state rendered from model,
  update on `change`.
- `number` and `range`: `value` kind, string value, update on `input`.
- `file`: `files` kind, `FileList | null` value, update on `change`.
- `text`, `search`, `tel`, `url`, `email`, `password`, `color`,
  `datetime-local`, `month`, `time`, `week`, `date`, textarea, and unknown
  text-like inputs: `value` kind, string value, update on `input`.
- `hidden`: `value` kind, string value, no automatic update event.
- `button`, `submit`, `reset`, and `image`: `none` kind, no model value
  binding.

The default API is browser-native first. AngularTS reads the same primary
property an application would normally read from the element: `value` for
text-like controls, `checked` for checkboxes, and `files` for file inputs.
The directive does not provide a typed conversion attribute. Inputs such as
`number`, `range`, `date`, and `datetime-local` use their native string
`value`; application code can convert those strings where domain semantics are
known.

## Native Validity

The directive exposes browser validity through live controller properties:

- `$validity`: the element's current `ValidityState`.
- `$validationMessage`: the element's current `validationMessage`.

Native validity is propagated to `$valid` and `$invalid`, but native failures
are not copied into `$error`. `$error` is reserved for framework/custom
validators while the broader controller modernization continues.

Native validity does not produce `ng-valid-native` or `ng-invalid-native`
classes. Read native details from `$validity`; use `$valid` / `$invalid` for
aggregate state.

Custom validators compose to one native custom-validity message. Validator
helpers decide message priority, then call
`NgModelController.$setCustomValidity(message)`. Passing an empty string clears
`ValidityState.customError`.

The browser remains the source of truth. AngularTS does not reimplement email,
URL, number, date, min, max, step, or pattern validation.

## Scheduling And Events

- Text-like controls use `input`.
- Checkbox, radio, and file controls use `change`.
- Hidden and button-like controls do not install value update listeners.
- IME composition is buffered for `input`-driven controls.
- `ngModelOptions` still owns debounce and `updateOn` commit behavior.

Event scheduling is represented internally as `"input" | "change" | null`;
unknown text-like input types default to `input`.

Removed event behavior:

- No `paste`, `drop`, or `cut` listeners.
- No date-like partial-validation event probes.
- No synthetic fallback events.

## Integration Points

- `NgModelController`: receives `$render`, `$isEmpty`, live native validity
  getters, native validity propagation, custom validity message updates, and
  DOM cleanup callbacks.
- `ng.Attributes`: provides compile-time normalized attributes, with direct DOM
  reads as a fallback for `data-*` forms.
- Browser constraint validation: provides `validity`, `validationMessage`,
  `checkValidity()`, `reportValidity()`, and `setCustomValidity()`.

## Testing Notes

- `input.spec.ts` covers native validity exposure, custom validity messages,
  directive model updates, every current HTML input type, checkbox/radio
  behavior, and native numeric validity.
- `input-attributes.spec.ts` covers normalized attribute reads for native
  behavior and verifies that `ng-model-type` and `ng-trim` compatibility are
  not implemented.
- Browser-dependent behavior should be tested through Playwright-backed
  Jasmine pages rather than pure DOM mocks.
