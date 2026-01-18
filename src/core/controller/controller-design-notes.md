# ControllerProvider — Design Notes

## Purpose

`ControllerProvider` implements AngularTS’s `$controller` mechanism. It is responsible for:

- registering controller definitions during configuration
- resolving controller expressions at runtime
- instantiating controllers with DI support
- supporting `ctrl as` syntax and explicit identifiers
- optionally deferring instantiation (`later` mode)

The design closely mirrors AngularJS semantics while tightening types and removing legacy behaviors (e.g. global/window lookup).

---

## Core Concepts

### Controller Definition

A **controller definition** is normalized at registration time into an:

```
Injectable<ControllerConstructor>
```

Supported forms:
- constructor function
- ES class
- DI-annotated array (`['dep1', ..., ControllerFn]`)

Unsupported:
- plain objects
- non-callables

This invariant is enforced by `normalizeControllerDef()` and relied on everywhere else.

---

## Internal State

### `controllers: Map<string, InjectableController>`

- Keys are **literal controller names**
- Values are **normalized injectables**
- No fallback to `window` or dotted-path resolution
- Dotted names (`"a.b.Ctrl"`) are treated as plain keys

---

## Registration Phase

### `register(name, constructor)`

Supports:
- single controller registration
- bulk registration

Behavior:
- controller names are validated
- definitions are normalized eagerly
- invalid definitions throw `ctrlreg`

---

## Runtime: `$controller` Service

### Signature (conceptual)

```
$controller(expression, locals?, later?, ident?)
  → instance | () => instance
```

### Expression Resolution

If `expression` is a **string**:
- must match `CNTRL_REG`
- extracts controller name and optional `as` identifier
- resolves only from the internal registry
- throws `ctrlfmt` or `ctrlreg` on failure

If `expression` is **not a string**:
- treated as a controller injectable directly

---

## Controller Unwrapping

### `unwrapController(injectable)`

Central helper that:
- extracts the underlying constructor function
- asserts callability
- exposes:
  - `func`
  - `prototype`
  - `name`

This removes duplicated logic and provides a single point of truth.

---

## Instantiation Modes

### Normal Mode

- controller instantiated immediately via `$injector.instantiate`
- object/function return values replace the instance
- primitive return values are ignored
- identifier export happens after instantiation

### Deferred Mode (`later === true`)

- instance shell created via `Object.create(prototype)`
- identifier export happens before invocation
- returned function invokes the controller and may replace the instance
- identifier is rebound if replacement occurs

---

## Identifier (`ctrl as`) Handling

Sources of identifier (priority order):
1. explicit `ident` argument
2. `as` syntax in controller string

Rules:
- identifier requires `locals.$scope`
- exports instance to scope and sets `$controllerIdentifier`
- missing `$scope` throws `noscp`

---

## Locals Handling

- `locals` is a DI locals map
- `$scope` is optional unless exporting
- locals override injectable dependencies
- no implicit scope creation

---

## `$scopename` Propagation

If a controller defines `$scopename`, it is propagated to `locals.$scope`
in both normal and deferred modes when a scope is present.

---

## Error Semantics

| Code     | Condition |
|----------|-----------|
| ctrlfmt  | malformed controller string |
| ctrlreg  | unknown controller or invalid definition |
| noscp    | identifier export without `$scope` |
| badname  | illegal controller registration name |

---

## Design Invariants

- controllers are always normalized
- no global/window lookup
- deferred mode preserves prototype semantics
- identifier export is explicit and scoped

---

## Non-Goals

- no object-literal controllers
- no dotted-path resolution
- no implicit scope creation
- no silent fallbacks

---

## Summary

`ControllerProvider` favors explicitness and predictability:
- strict registration
- centralized normalization
- well-defined error cases
- compatibility where it matters, simplicity everywhere else