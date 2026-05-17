# Form Modernization Plan

This plan makes `src/directive/form` browser-native first after the input
modernization. Backwards compatibility is not a goal. The executable path is to
remove AngularJS-era behavior that duplicates native form behavior, keep only
the AngularTS state that native forms do not provide, and verify each step with
focused tests before moving to the next one.

## Target Shape

Native `<form>` elements should be the primary form primitive. AngularTS should
use the platform for submission, reset, `FormData`, `checkValidity()`,
`reportValidity()`, and constraint validation. `FormController` should become a
thin AngularTS state coordinator for:

- child `ngModel` registration;
- dirty/pristine, touched/untouched, and submitted state;
- convenient template access through named form and control publication;
- pending async validators;
- custom validator errors;
- parent logical-group aggregation when explicitly requested.

Native validity should not be copied into `$error`. `$error` remains for
AngularTS/custom validators. Browser validity is read from the controls and the
native form element.

## Non-Goals

- No compatibility path for legacy AngularJS form behavior.
- No wrapper abstraction around `HTMLFormElement` when the method only proxies
  native APIs.
- No native validity snapshots that duplicate `ValidityState`.
- No framework conversion of native input values.
- No support for invalid nested native `<form>` trees.

## Retained AngularTS Features

Named form and control publication is intentionally retained. It is not a
browser duplicate; it is the ergonomic AngularTS template API for controller
state.

- `name="myForm"` continues to publish the `FormController` on the related
  scope as `myForm`.
- Named controls continue to publish onto the form controller, for example
  `myForm.email`.
- Dynamic and interpolated names remain supported.
- Modernization must not remove this API while removing browser-behavior
  duplication.

## Execution Checklist

### Phase 1: Baseline Native Form Surface

- [x] Add focused tests that lock in named publication as retained behavior:
  - named form is published to scope;
  - named controls are published to the form controller;
  - dynamic/interpolated names rename without replacing the controller.
- [x] Add focused tests for the native form APIs AngularTS must preserve:
  - `HTMLFormElement.checkValidity()`;
  - `HTMLFormElement.reportValidity()`;
  - `new FormData(form)`;
  - native `reset` event and reset button behavior;
  - native submit event order with `ngSubmit`.
- [x] Extend `src/directive/form/form-demo.html` to show native form facts:
  - `demoFormElement.checkValidity()`;
  - `new FormData(demoFormElement)` entries;
  - submitted state before and after native submit.
- [x] Verification:
  - `npx playwright test src/directive/form/form.test.ts --reporter=line`
  - `npx playwright test src/directive/input/input.test.ts src/directive/input/input-attributes.test.ts --reporter=line`

Acceptance: tests describe current native behavior before refactors begin, and
do not assert browser behavior that AngularTS does not own.

### Phase 2: Remove Native Validity Duplication

- [x] Remove form-level `ng-valid-native` and `ng-invalid-native` CSS classes.
- [x] Replace `_nativeInvalidControls` as a persistent validity bucket with a
      direct aggregate query over registered native controls where possible.
- [x] Keep `$valid` / `$invalid` aggregate booleans updated from:
  - custom validator `$error`;
  - async `$pending`;
  - direct native `checkValidity()` / control native validity.
- [x] Do not add native validity keys to `$error`.
- [x] Update tests that currently inspect native validity through AngularTS
      buckets to inspect `$validity` on controls or native form APIs instead.

Files:

- `src/directive/form/form.ts`
- `src/directive/form/form.spec.ts`
- `src/directive/form/form.test.ts`
- `src/directive/form/form-demo.html`

Acceptance: native invalid controls make the form invalid, but native failure
details remain available through browser APIs, not `$error`.

### Phase 3: Split Custom Errors From Native Validity

- [x] Rename internal validity helpers so their purpose is explicit:
  - custom validator failures;
  - pending async validators;
  - native aggregate validity.
- [x] Keep `$error` and `$pending` as public transitional objects only for
      custom/framework validators.
- [x] Use `Map<string, Set<Control>>` internally for all custom validity
      buckets, then derive public `$error` / `$pending` objects from those maps.
- [x] Remove duplicated array mutation helpers once map/set buckets are the
      source of truth.

Files:

- `src/directive/form/form.ts`
- `src/directive/model/model.ts`

Acceptance: control removal, rename, async validation, and nested group
aggregation still clear all buckets without stale references.

### Phase 4: Modernize Submit And Reset

- [x] Let native submit remain native unless AngularTS has explicit work:
  - commit pending model values;
  - set submitted state;
  - run `ngSubmit`.
- [x] Keep the platform event as the source of ordering.
- [x] Remove special casing that attempts to emulate browser submit rules.
- [x] Add tests for:
  - button submit;
  - `input[type=submit]`;
  - Enter-key submit in a single text field;
  - form with `action`;
  - form without `action`;
  - `requestSubmit()` when available.
- [x] Reset should use native reset behavior first, then update AngularTS
      control state from the resulting DOM values.

Files:

- `src/directive/form/form.ts`
- `src/directive/form/form.spec.ts`
- `src/directive/form/form.test.ts`

Acceptance: AngularTS no longer documents or tests browser submit mechanics as
framework behavior, only the AngularTS state updates around native events.

### Phase 5: Re-scope Nested Forms

- [x] Stop describing `ngForm` as equivalent to native `<form>`.
- [x] Keep `ngForm` only as an explicit logical validation group if the codebase
      still needs grouped custom validator state.
- [x] Rename docs and internals from nested "forms" toward "groups" where the
      type boundary allows it.
- [x] Remove behavior that suggests logical groups can submit, reset, or produce
      `FormData`.
- [x] Add tests proving logical groups:
  - aggregate child custom validity;
  - do not emulate native form submit;
  - do not create invalid nested native form semantics.

Files:

- `src/directive/form/form.ts`
- `src/directive/form/README.md`
- `src/directive/form/form.spec.ts`

Acceptance: native forms own native form behavior; logical groups only own
AngularTS grouping behavior.

### Phase 6: Tighten Public Types

- [x] Replace broad `any` form-control types with explicit controller unions.
- [x] Make `ParentFormController` reflect required methods precisely.
- [x] Keep public types needed for named form and named control publication.
- [x] Remove public/exported helper types that are only implementation details
      and not required by the named-publication API.
- [x] Narrow validity state parameters to explicit named states or a small union
      that does not rely on `boolean | null | undefined` meaning.
- [x] Align docs with the final public API.

Files:

- `src/directive/form/form.ts`
- `src/directive/model/model.ts`
- `src/interface.ts`
- `@types/namespace.d.ts` if generated types expose changed APIs.

Acceptance: form internals compile without broad controller casts for ordinary
control registration, validity updates, and cleanup.

### Phase 7: Remove Legacy Documentation And Tests

- [x] Remove built-in validation token lists from form docs that duplicate
      browser validity keys.
- [x] Remove tests that only assert browser behavior without AngularTS state.
- [x] Keep tests for AngularTS-owned behavior:
  - registration;
  - naming;
  - named form and named control publication;
  - custom validator aggregation;
  - async pending state;
  - dirty/pristine;
  - touched/untouched;
  - submitted state;
  - destruction cleanup.
- [x] Update `src/directive/form/README.md` after the implementation matches
      the target shape.
- [x] Inspect types for simplification opportunities.
- [x] Inspect types for stricter contracts.

Acceptance: the form README explains what AngularTS owns and points developers
to native form APIs for platform behavior.

## Suggested Command Sequence

Run after every phase:

```sh
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/tsc --project tsconfig.test.json --noEmit
npx playwright test src/directive/form/form.test.ts --reporter=line
```

Run before marking the plan complete:

```sh
make lint-check
make check
npx playwright test src/directive/form/form.test.ts src/directive/input/input.test.ts src/directive/input/input-attributes.test.ts src/directive/model/model.test.ts --reporter=line
```

## Completion Criteria

- Native forms remain usable as native forms.
- Named form and named control publication remains supported.
- AngularTS no longer mirrors native validity details into `$error`.
- No proxy-only form adapter APIs are introduced.
- Logical grouping is explicitly separate from native form behavior.
- Tests cover AngularTS-owned state and avoid retesting browser primitives.
