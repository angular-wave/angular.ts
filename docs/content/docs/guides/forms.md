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
