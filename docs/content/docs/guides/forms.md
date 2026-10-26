---
title: Build and validate a form
weight: 20
description:
  Model AngularTS form submission, validation visibility, duplicate prevention,
  and accessible recovery as one workflow.
---

## Separate validity from validation visibility

A field can be invalid before the user has interacted with it. Show field
feedback after blur or a failed submit, but always prevent invalid submission.

```html
<form name="taskForm" ng-submit="submit(taskForm)" novalidate>
  <label for="task-title">Task title</label>
  <input
    id="task-title"
    name="title"
    ng-model="draft.title"
    required
    aria-describedby="task-title-error"
  />
  <p
    id="task-title-error"
    role="alert"
    ng-show="submitted && taskForm.title.$invalid"
  >
    Enter a task title.
  </p>
  <button ng-disabled="saving">Add task</button>
</form>
```

The controller owns `submitted`, `saving`, and the editable draft. The
repository owns the write.

```js
$scope.submit = async (form) => {
  $scope.submitted = true;
  if (form.$invalid || $scope.saving) return;

  $scope.saving = true;
  try {
    await taskRepository.add($scope.draft);
    $scope.draft = { title: '' };
    $scope.submitted = false;
  } finally {
    $scope.saving = false;
  }
};
```

Do not clear the draft before the server confirms success. Disable or reject
repeated submission while a non-idempotent write is pending. Return focus to the
first invalid field after a failed submit and announce server failures
separately from field validation.

Use browser constraints for semantics, AngularTS form state for view
coordination, and server validation as the authority. A disabled button does not
enforce a business rule.

## Type custom controls and validators

A custom control can declare its model and view domains with
[`ng.NgModelController<TModel, TView>`](../../../typedoc/classes/NgModelController.html). For example, a numeric model displayed as
text uses [`ng.NgModelController<number, string>`](../../../typedoc/classes/NgModelController.html):

```ts
function configureAmount(control: ng.NgModelController<number, string>) {
  control.parsers.push((text) => text === '' ? undefined : Number(text));
  control.formatters.push((amount) => amount?.toFixed(2) ?? '');
  control.validators.positive = (amount) => (amount ?? 0) > 0;
  control.setViewValue('12.50');
}
```

The model and view values can be `undefined`; returning `undefined` from a
parser indicates a parse failure. Read values after the control has initialized
its model binding. The controller retains the existing `NaN` initialization
sentinel before that first synchronization. Omitting the type arguments keeps
the existing `unknown` API. HTML attributes and binding syntax stay the same.
Parsers still run in registration order and formatters in reverse order. For a
conversion with several different intermediate types, compose those steps into
one typed parser or formatter rather than treating every intermediate value as
the final model or view domain.

## Cancel obsolete asynchronous validation

An asynchronous validator receives a third argument containing a native
`AbortSignal`. Pass it to `$http` or Fetch so a new validation run can cancel
obsolete network work:

```ts
function configureAvailability(control: ng.NgModelController<string>) {
  control.asyncValidators.available = async (value, _view, { signal }) => {
    const response = await fetch(`/availability?name=${encodeURIComponent(value ?? '')}`, { signal });
    if (!response.ok) throw new Error('Availability check failed');
    const result = await response.json();
    if (!result.available) throw new Error('Name is already taken');
  };
}
```

All asynchronous validators in a run share its signal. A newer validation run,
including one that fails synchronous validation, aborts the previous run.
Destroying the linked control's scope also aborts it. Debounce and `updateOn`
continue to determine when a new validation run starts. Existing two-argument
validators remain supported. Validators must return a promise or thenable;
resolution passes validation and rejection fails it. Results from obsolete runs
cannot update validity, even when a validator ignores its signal.
