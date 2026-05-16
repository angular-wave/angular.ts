# Computed Member Assignment Plan

## Goal

Support assignable expressions such as `models[field.model]` everywhere `$parse`
assignment is used, including `ng-model`.

## Executable Steps

- [x] Confirm the parser AST already represents computed member expressions.
- [x] Add `$parse` coverage for dynamic computed member assignment.
- [x] Add nested computed assignment coverage so receiver creation still works.
- [x] Add `ngModel` coverage for `ng-model="models[field.model]"`.
- [x] Determine whether an interpreter patch is required.
- [x] Run focused parse and model tests.

## Execution Result

No interpreter patch was needed. `ASTInterpreter` already compiles computed
member expressions into assignable references, and `NgModelController` already
uses `$parse(expression)._assign` for writes.

Verified with:

```sh
npx playwright test src/core/parse/parse.test.ts src/directive/model/model.test.ts --reporter=line
```

## Proposed API

```html
<input ng-model="models[field.model]" />
```

```js
scope.models = {};
scope.field = { model: "email" };
```

When the input changes, the model controller writes the new value to
`scope.models.email`.

## Implementation Notes

The feature belongs in `src/core/parse` because `NgModelController` delegates
all model writes to `$parse(expression)._assign`. The directive should not
special-case computed paths.
